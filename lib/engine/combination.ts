/**
 * Combination effects: how targets interact with each other and with the
 * acquirer when bought together. Every effect is an annual £ amount of
 * EBITDA-equivalent value, attributed to one target, with a plain-English
 * line and the assumption behind it. Pure functions.
 */
import { benchmarks as B } from "@/data/benchmarks";
import { formatGbpCompact } from "@/lib/format";
import type { AcquirerProfile, Target } from "@/lib/types";

export type EffectKind =
  | "cannibalisation"
  | "zone_fit"
  | "central_kitchen"
  | "procurement"
  | "head_office"
  | "delivery_uplift"
  | "cuisine_breadth";

export interface EffectItem {
  kind: EffectKind;
  /** Annual £; negative is a penalty. */
  amount: number;
  text: string;
  assumption: string;
}

export interface CombinationEffect {
  targetId: string;
  items: EffectItem[];
  /** Sum of items, annual £. */
  total: number;
}

const norm = (s: string) => s.trim().toLowerCase();

export function sharesZone(a: readonly string[], b: readonly string[]): boolean {
  const set = new Set(a.map(norm));
  return b.some((z) => set.has(norm(z)));
}

export function sameCuisine(a: string, b: string): boolean {
  return norm(a) !== "" && norm(a) === norm(b);
}

/** EBITDA in £, using the benchmark typical margin when the margin is missing. */
export function ebitdaEstimate(t: Target, b: typeof B = B): { value: number; assumed: boolean } {
  if (t.ebitdaMarginPct !== undefined) return { value: (t.revenue * t.ebitdaMarginPct) / 100, assumed: false };
  return { value: (t.revenue * b.ebitdaMarginPct.typical) / 100, assumed: true };
}

export function foodCostEstimate(t: Target, b: typeof B = B): { value: number; assumed: boolean } {
  if (t.foodCostPct !== undefined) return { value: (t.revenue * t.foodCostPct) / 100, assumed: false };
  return { value: (t.revenue * b.foodCostPct.typical) / 100, assumed: true };
}

function money(n: number): string {
  return `${n < 0 ? "-" : "+"}${formatGbpCompact(Math.abs(n))}`;
}

/**
 * Effects for every target in a basket. `basket` is the set being evaluated;
 * effects for a target depend on the acquirer and on the other basket members.
 */
export function combinationEffects(basket: readonly Target[], acquirer: AcquirerProfile, b: typeof B = B): Map<string, CombinationEffect> {
  const c = b.combination;
  const out = new Map<string, CombinationEffect>();
  const n = basket.length;
  const acquirerCuisines = new Set(acquirer.cuisines.map(norm));
  const procurementPct = Math.min(c.procurement.maxPct, c.procurement.basePct + c.procurement.perExtraTargetPct * Math.max(0, n - 1));

  for (const t of basket) {
    const items: EffectItem[] = [];
    const ebitda = ebitdaEstimate(t, b);
    const ebitdaNote = ebitda.assumed ? ` (EBITDA assumed at the ${b.ebitdaMarginPct.typical}% benchmark margin: margin missing)` : "";
    const others = basket.filter((u) => u.id !== t.id);

    /* Cannibalisation: same cuisine AND overlapping zone */
    const overlapsAcquirer = acquirerCuisines.has(norm(t.cuisine)) && sharesZone(acquirer.zones, t.zones);
    const overlappingTargets = others.filter((u) => sameCuisine(u.cuisine, t.cuisine) && sharesZone(u.zones, t.zones));
    if (overlapsAcquirer || overlappingTargets.length > 0) {
      const acqPct = acquirer.strategy === "densify" ? c.cannibalisationPct.acquirerDensify : c.cannibalisationPct.acquirerExpand;
      const parties = Math.min(c.cannibalisationMaxParties, (overlapsAcquirer ? 1 : 0) + overlappingTargets.length);
      const pct = (overlapsAcquirer ? acqPct : 0) + Math.min(parties - (overlapsAcquirer ? 1 : 0), overlappingTargets.length) * c.cannibalisationPct.betweenTargets;
      const amount = -(ebitda.value * pct) / 100;
      const who = [
        ...(overlapsAcquirer ? [`your ${t.cuisine} sites`] : []),
        ...overlappingTargets.map((u) => u.name),
      ].join(" and ");
      items.push({
        kind: "cannibalisation",
        amount,
        text: `${money(amount)} a year: same cuisine as ${who} in a shared zone, so some trade moves between them rather than being added`,
        assumption:
          `Cannibalisation taken as ${acqPct}% of EBITDA for overlap with your own sites under a ${acquirer.strategy} strategy and ${c.cannibalisationPct.betweenTargets}% per overlapping target, capped at ${c.cannibalisationMaxParties} parties` + ebitdaNote,
      });
    }

    /* Zone fit */
    const shared = sharesZone(acquirer.zones, t.zones);
    const opensNew = t.zones.some((z) => !acquirer.zones.map(norm).includes(norm(z)));
    const fits = acquirer.strategy === "densify" ? shared : opensNew;
    if (fits && ebitda.value > 0) {
      const amount = (ebitda.value * c.zoneFitPct) / 100;
      const newZones = t.zones.filter((z) => !acquirer.zones.map(norm).includes(norm(z)));
      items.push({
        kind: "zone_fit",
        amount,
        text:
          acquirer.strategy === "densify"
            ? `${money(amount)} a year: adds density in ${t.zones.filter((z) => acquirer.zones.map(norm).includes(norm(z))).join(", ")}, where you already operate`
            : `${money(amount)} a year: opens ${newZones.join(", ")}, new ${newZones.length === 1 ? "zone" : "zones"} for you`,
        assumption: `Zone fit valued at ${c.zoneFitPct}% of EBITDA when zones suit a ${acquirer.strategy} strategy` + ebitdaNote,
      });
    }

    /* Central production kitchen: same-cuisine cluster (with acquirer or other basket members) */
    const clusterWithAcquirer = acquirerCuisines.has(norm(t.cuisine));
    const clusterMembers = others.filter((u) => sameCuisine(u.cuisine, t.cuisine));
    if (clusterWithAcquirer || clusterMembers.length > 0) {
      const amount = (t.revenue * c.centralKitchenFoodCostPts) / 100;
      const withWhom = [...(clusterWithAcquirer ? ["your kitchens"] : []), ...clusterMembers.map((u) => u.name)].join(" and ");
      items.push({
        kind: "central_kitchen",
        amount,
        text: `${money(amount)} a year: ${t.cuisine} prep shared with ${withWhom} through a central production kitchen`,
        assumption: `Central production saves ${c.centralKitchenFoodCostPts} points of revenue on food cost for each member of a same-cuisine cluster`,
      });
    }

    /* Procurement saving: % of food cost, grows with basket size */
    const food = foodCostEstimate(t, b);
    if (food.value > 0) {
      const amount = (food.value * procurementPct) / 100;
      items.push({
        kind: "procurement",
        amount,
        text: `${money(amount)} a year: ${procurementPct}% procurement saving on food cost across a basket of ${n}`,
        assumption:
          `Procurement saving of ${c.procurement.basePct}% of food cost for one deal, +${c.procurement.perExtraTargetPct} points per extra target, capped at ${c.procurement.maxPct}%` +
          (food.assumed ? ` (food cost assumed at the ${b.foodCostPct.typical}% benchmark: food cost missing)` : ""),
      });
    }

    /* Shared head office */
    if (t.overheadCost !== undefined && t.overheadCost > 0) {
      const amount = (t.overheadCost * c.headOfficeSavingPct) / 100;
      items.push({
        kind: "head_office",
        amount,
        text: `${money(amount)} a year: ${c.headOfficeSavingPct}% of its ${formatGbpCompact(t.overheadCost)} central overhead absorbed by your head office`,
        assumption: `Shared head office removes ${c.headOfficeSavingPct}% of the target's central overhead`,
      });
    }

    /* Delivery uplift for low delivery share */
    if (t.channelMix && t.channelMix.delivery < c.deliveryUplift.thresholdShare) {
      const gapPts = c.deliveryUplift.thresholdShare - t.channelMix.delivery;
      const upliftRevenue = (t.revenue * gapPts * c.deliveryUplift.capturePct) / 10_000;
      const amount = (upliftRevenue * c.deliveryUplift.incrementalMarginPct) / 100;
      items.push({
        kind: "delivery_uplift",
        amount,
        text: `${money(amount)} a year: delivery is only ${t.channelMix.delivery}% of revenue; lifting it halfway to ${c.deliveryUplift.thresholdShare}% adds ${formatGbpCompact(upliftRevenue)} of revenue`,
        assumption: `Delivery uplift captures ${c.deliveryUplift.capturePct}% of the gap to a ${c.deliveryUplift.thresholdShare}% share at a ${c.deliveryUplift.incrementalMarginPct}% incremental margin`,
      });
    }

    /* Cuisine breadth: new to acquirer and to the rest of the basket */
    const newToAll = !acquirerCuisines.has(norm(t.cuisine)) && !others.some((u) => sameCuisine(u.cuisine, t.cuisine));
    if (newToAll && ebitda.value > 0 && norm(t.cuisine) !== "") {
      const amount = (ebitda.value * c.cuisineBreadthPct) / 100;
      items.push({
        kind: "cuisine_breadth",
        amount,
        text: `${money(amount)} a year: ${t.cuisine} is a new cuisine for the group`,
        assumption: `Cuisine breadth valued at ${c.cuisineBreadthPct}% of EBITDA for a cuisine new to the acquirer and the basket` + ebitdaNote,
      });
    }

    out.set(t.id, { targetId: t.id, items, total: items.reduce((s, i) => s + i.amount, 0) });
  }
  return out;
}

/** Total combination effect of a basket, annual £. */
export function basketEffectTotal(effects: Map<string, CombinationEffect>): number {
  let s = 0;
  for (const e of effects.values()) s += e.total;
  return s;
}
