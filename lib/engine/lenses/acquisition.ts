/**
 * The acquisition lens: "Is this restaurant business worth buying on its own
 * merits, and at this price?" Standalone score 0-100 from six components.
 *
 * Missing data is never scored as zero: a signal without data is left out, a
 * component with no scored signals is dropped, and the remaining component
 * weights are rescaled. Completeness is reported alongside the score.
 */
import { formatGbpCompact } from "@/lib/format";
import type { Target } from "@/lib/types";
import {
  brandSignal,
  deliveryShareSignal,
  ebitdaOf,
  foodCostSignal,
  growthSignal,
  kitchenSlack,
  labourCostSignal,
  leaseRisk,
  leaseYearsSignal,
  lflSignal,
  marginSignal,
  meanOrNull,
  platformConcentrationSignal,
  priceSignal,
  ratingSignal,
  ratingSpreadSignal,
  rentSignal,
  unitEconomicsConsistency,
} from "../signals";
import type {
  ComponentDef,
  ComponentId,
  ComponentScore,
  DiligenceQuestion,
  Lens,
  LensContext,
  Reason,
  SignalScore,
  TargetScore,
  Weights,
} from "../types";

export const ACQUISITION_COMPONENTS: readonly ComponentDef[] = [
  { id: "financial", label: "Financial", description: "Growth, like-for-like growth and EBITDA margin", defaultWeight: 25 },
  { id: "unitEconomics", label: "Unit economics", description: "Food and labour cost as a share of revenue, and whether the P&L adds up", defaultWeight: 20 },
  { id: "lease", label: "Lease", description: "Years remaining, rent as a share of revenue, break clause", defaultWeight: 15 },
  { id: "delivery", label: "Delivery & reviews", description: "Customer rating, consistency across sites, platform concentration, delivery upside", defaultWeight: 15 },
  { id: "price", label: "Price", description: "Asking price against EBITDA versus the benchmark multiple", defaultWeight: 20 },
  { id: "brand", label: "Brand", description: "Your 1-5 judgement of the brand; not data", defaultWeight: 5, judgement: true },
];

export const ACQUISITION_DEFAULT_WEIGHTS: Weights = Object.fromEntries(
  ACQUISITION_COMPONENTS.map((c) => [c.id, c.defaultWeight]),
) as Weights;

/** Fields the lens reads. Completeness and data gaps are measured against this list. */
export const ACQUISITION_FIELDS: Lens["requiredFields"] = [
  { key: "revenue", label: "revenue", has: (t) => t.revenue > 0 },
  { key: "askingPrice", label: "asking price", has: (t) => t.askingPrice > 0 },
  { key: "growthPct", label: "growth", has: (t) => t.growthPct !== undefined },
  { key: "lflGrowthPct", label: "like-for-like growth", has: (t) => t.lflGrowthPct !== undefined },
  { key: "ebitdaMarginPct", label: "EBITDA margin", has: (t) => t.ebitdaMarginPct !== undefined },
  { key: "foodCostPct", label: "food cost", has: (t) => t.foodCostPct !== undefined },
  { key: "labourCostPct", label: "labour cost", has: (t) => t.labourCostPct !== undefined },
  { key: "rentPctRevenue", label: "rent % of revenue", has: (t) => t.rentPctRevenue !== undefined },
  { key: "leaseYearsRemaining", label: "lease length", has: (t) => t.leaseYearsRemaining !== undefined },
  { key: "channelMix", label: "channel mix", has: (t) => t.channelMix !== undefined },
  { key: "aggregatorSplit", label: "aggregator split", has: (t) => t.aggregatorSplit !== undefined },
  { key: "rating", label: "customer rating", has: (t) => t.rating !== undefined },
  { key: "siteRating", label: "site rating range", has: (t) => t.siteRatingMin !== undefined && t.siteRatingMax !== undefined },
  { key: "locationType", label: "location type", has: (t) => t.locationType !== undefined },
  { key: "overheadCost", label: "overhead cost", has: (t) => t.overheadCost !== undefined },
  { key: "brandScore", label: "brand score", has: (t) => t.brandScore !== undefined },
];

const PASS_BELOW = 60;

function component(def: ComponentDef, weight: number, signals: SignalScore[], score: number | null, notes: string[] = []): ComponentScore {
  return { id: def.id, label: def.label, weight, score, signals, notes, judgement: def.judgement };
}

function def(id: ComponentId): ComponentDef {
  return ACQUISITION_COMPONENTS.find((c) => c.id === id)!;
}

export function scoreAcquisition(target: Target, ctx: LensContext): TargetScore {
  const b = ctx.benchmarks;
  const w = ctx.weights;

  // Financial
  const fin = [growthSignal(target, b), lflSignal(target, b), marginSignal(target, b)];
  const financial = component(def("financial"), w.financial, fin, meanOrNull(fin.map((s) => s.score)));

  // Unit economics, with a consistency check
  const ue = [foodCostSignal(target, b), labourCostSignal(target, b)];
  const consistency = unitEconomicsConsistency(target, b);
  let ueScore = meanOrNull(ue.map((s) => s.score));
  const ueNotes: string[] = [];
  if (consistency.status === "implausible") {
    ueNotes.push(consistency.note);
    if (ueScore !== null) {
      ueScore = Math.max(0, ueScore - 10);
      ueNotes.push("10 points taken off unit economics until the P&L reconciles");
    }
  }
  const unitEconomics = component(def("unitEconomics"), w.unitEconomics, ue, ueScore, ueNotes);

  // Lease
  const leaseSignals = [leaseYearsSignal(target, b), rentSignal(target, b)];
  const lr = leaseRisk(target, b);
  const lease = component(def("lease"), w.lease, leaseSignals, lr.score, lr.breakNote ? [lr.breakNote] : []);

  // Delivery & reviews
  const del = [ratingSignal(target, b), ratingSpreadSignal(target, b), platformConcentrationSignal(target, b), deliveryShareSignal(target, b)];
  const delivery = component(def("delivery"), w.delivery, del, meanOrNull(del.map((s) => s.score)));

  // Price
  const pr = [priceSignal(target, b)];
  const price = component(def("price"), w.price, pr, pr[0].score);

  // Brand (judgement)
  const br = [brandSignal(target)];
  const brand = component(def("brand"), w.brand, br, br[0].score);

  const components = [financial, unitEconomics, lease, delivery, price, brand];

  // Weighted score over available components only
  const available = components.filter((c) => c.score !== null && c.weight > 0);
  const totalWeight = available.reduce((s, c) => s + c.weight, 0);
  const score =
    totalWeight > 0
      ? Math.round(available.reduce((s, c) => s + (c.score as number) * c.weight, 0) / totalWeight)
      : null;
  const appliedWeights: Partial<Weights> = {};
  for (const c of available) appliedWeights[c.id] = Math.round((c.weight / totalWeight) * 1000) / 10;

  // Completeness
  const missingFields = ACQUISITION_FIELDS.filter((f) => !f.has(target)).map((f) => f.label);
  const completeness = Math.round(((ACQUISITION_FIELDS.length - missingFields.length) / ACQUISITION_FIELDS.length) * 100);

  const reasons = buildReasons(components, consistency.status === "implausible" ? consistency.note : null, completeness, missingFields);
  const diligence = buildDiligence(target, components, consistency.status === "implausible" ? consistency.note : null, missingFields, b);

  const ebitda = ebitdaOf(target);
  const assumptions = [
    `Benchmarks: EV/EBITDA ${b.evToEbitda}x, healthy rent under ${b.healthyRentPctRevenue}% of revenue, rating ${b.rating.strong}+ strong and under ${b.rating.weak} weak, delivery share benchmark ${b.deliveryShareBenchmark}%.`,
    `Weights applied: ${available.map((c) => `${c.label} ${appliedWeights[c.id]}%`).join(", ")}${available.length < components.length ? ` (rescaled: ${components.filter((c) => c.score === null).map((c) => c.label).join(", ")} had no data)` : ""}.`,
    "Missing fields are left out of the score, never counted as zero; they appear as diligence questions instead.",
    ebitda !== null ? `EBITDA taken as revenue x margin = ${formatGbpCompact(ebitda)}.` : "EBITDA could not be derived (revenue or margin missing).",
    "Brand is a judgement input, not data.",
    kitchenSlack(ctx.acquirer, b).text + " (context, not scored by this lens).",
  ];

  return {
    targetId: target.id,
    lensId: "acquisition",
    score,
    completeness,
    missingFields,
    components,
    appliedWeights,
    reasons,
    diligence,
    assumptions,
  };
}

/* ------------------------------------------------------------------ */
/* Reasons: top 3 by weighted distance from neutral                    */
/* ------------------------------------------------------------------ */

function buildReasons(components: ComponentScore[], consistencyNote: string | null, completeness: number, missingFields: string[]): Reason[] {
  const candidates: Reason[] = [];
  for (const c of components) {
    const scored = c.signals.filter((s) => s.score !== null);
    if (scored.length === 0) continue;
    for (const s of scored) {
      const sc = s.score as number;
      candidates.push({
        text: s.text,
        direction: sc >= 50 ? "positive" : "negative",
        componentId: c.id,
        strength: (c.weight / scored.length) * (Math.abs(sc - 50) / 50),
      });
    }
  }
  if (consistencyNote) {
    const ue = components.find((c) => c.id === "unitEconomics")!;
    candidates.push({ text: consistencyNote, direction: "negative", componentId: "unitEconomics", strength: ue.weight });
  }
  candidates.sort((a, b) => b.strength - a.strength);
  const top = candidates.slice(0, 3);
  if (top.length < 3 && missingFields.length > 0) {
    top.push({
      text: `Only ${completeness}% of the data is present (missing ${missingFields.slice(0, 3).join(", ")}${missingFields.length > 3 ? "…" : ""}); the score rests on what was provided`,
      direction: "negative",
      componentId: "financial",
      strength: 0,
    });
  }
  return top;
}

/* ------------------------------------------------------------------ */
/* Diligence: 3-5 questions from weakest signals and missing fields    */
/* ------------------------------------------------------------------ */

function questionFor(s: SignalScore, t: Target, b: LensContext["benchmarks"]): string | null {
  switch (s.id) {
    case "growth":
      return `Why is revenue ${(t.growthPct ?? 0) < 0 ? "falling" : "growing slowly"}? Split growth into new sites, price and volume.`;
    case "lfl":
      return "What is driving weak like-for-likes? Review covers, average spend and discounting site by site.";
    case "margin":
      return `Walk the EBITDA bridge: what one-offs, owner salary or rent adjustments sit behind the ${t.ebitdaMarginPct}% margin?`;
    case "foodCost":
      return `Food cost is ${t.foodCostPct}% of revenue: review supplier terms, menu engineering and waste by site.`;
    case "labourCost":
      return `Labour is ${t.labourCostPct}% of revenue: get rota data and hourly rates per site.`;
    case "leaseYears":
      return (t.leaseYearsRemaining ?? 0) <= 0
        ? "The lease has expired or is holding over: confirm the renewal position and the landlord's intentions before anything else."
        : `Only ${t.leaseYearsRemaining} years left on the lease: get the lease, renewal rights and the landlord's intentions.`;
    case "rent":
      return `Rent is ${t.rentPctRevenue}% of revenue: check rent review dates and scope to renegotiate.`;
    case "rating":
      return `Rating is ${t.rating}: pull review trends per site over the last 12 months and mystery-shop the weakest.`;
    case "ratingSpread":
      return `Site ratings range from ${t.siteRatingMin} to ${t.siteRatingMax}: visit the weakest site and understand why it lags.`;
    case "platformConcentration":
      return "Most delivery sits with one aggregator: get the commission terms, exclusivity and notice period.";
    case "deliveryShare":
      return `Delivery is ${t.channelMix?.delivery}% of revenue: check what margin is left after platform fees.`;
    case "price": {
      const e = ebitdaOf(t);
      return e !== null && e <= 0
        ? "The asking price is not supported by earnings: what is the seller's valuation basis?"
        : `Asking price is above the ${b.evToEbitda}x EBITDA benchmark: what justifies the premium?`;
    }
    case "brand":
      return `Brand judged ${t.brandScore} out of 5: test it with customer research before relying on it.`;
    default:
      return null;
  }
}

const STANDARD_QUESTIONS: DiligenceQuestion[] = [
  { text: "Reconcile the last 12 months of management accounts to the figures provided.", because: "standard check", source: "standard" },
  { text: "Confirm the asking price basis (cash-free, debt-free) and any deferred consideration.", because: "standard check", source: "standard" },
  { text: "Confirm there are no undisclosed liabilities: rent arrears, HMRC, supplier disputes.", because: "standard check", source: "standard" },
];

function buildDiligence(t: Target, components: ComponentScore[], consistencyNote: string | null, missingFields: string[], b: LensContext["benchmarks"]): DiligenceQuestion[] {
  const out: DiligenceQuestion[] = [];
  const seen = new Set<string>();
  const push = (q: DiligenceQuestion) => {
    if (out.length >= 5 || seen.has(q.text)) return;
    seen.add(q.text);
    out.push(q);
  };

  // Weakest scored signals first, weighted by component weight
  const weak = components
    .flatMap((c) => c.signals.filter((s) => s.score !== null && (s.score as number) < 50).map((s) => ({ s, c })))
    .sort((a, b2) => (a.s.score as number) * (1 / Math.max(1, a.c.weight)) - (b2.s.score as number) * (1 / Math.max(1, b2.c.weight)))
    .slice(0, 3);
  for (const { s, c } of weak) {
    const q = questionFor(s, t, b);
    if (q) push({ text: q, because: `${c.label}: ${s.text}`, source: "weak_signal" });
  }

  if (consistencyNote) {
    push({ text: "Rebuild the site P&L from source: food, labour, rent and margin do not reconcile as provided.", because: consistencyNote, source: "consistency" });
  }

  for (const f of missingFields) {
    push({ text: `Obtain ${f}: it was not provided, so it has not been scored.`, because: "missing field", source: "missing_field" });
  }

  for (const q of STANDARD_QUESTIONS) {
    if (out.length >= 3) break;
    push(q);
  }
  return out;
}

export const acquisitionLens: Lens = {
  id: "acquisition",
  name: "Acquisition lens",
  question: "Is this restaurant business worth buying on its own merits, and at this price?",
  requiredFields: ACQUISITION_FIELDS,
  components: ACQUISITION_COMPONENTS,
  defaultWeights: ACQUISITION_DEFAULT_WEIGHTS,
  scoreTarget: scoreAcquisition,
  verdictRules: { passBelow: PASS_BELOW },
};
