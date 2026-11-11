/**
 * Verdicts: PURSUE (selected by the optimiser), HOLD (standalone at or above
 * the pass line but excluded: budget, capacity, overlap, or missing data) and
 * PASS (standalone below the pass line). Each verdict carries why, what would
 * change it, and the diligence questions. Pure.
 */
import { benchmarks as B } from "@/data/benchmarks";
import { formatGbpCompact } from "@/lib/format";
import type { AcquirerProfile, Strategy, Target } from "@/lib/types";
import { combinationEffects, ebitdaEstimate, type CombinationEffect } from "./combination";
import { evaluateBasket, optimise, standaloneValue, type OptimiseInput, type OptimiseResult } from "./optimise";
import type { ComponentScore, DiligenceQuestion, Reason, TargetScore } from "./types";

export type VerdictKind = "PURSUE" | "HOLD" | "PASS";
export type Blocker = "budget" | "capacity" | "overlap" | "data";

export interface Verdict {
  targetId: string;
  verdict: VerdictKind;
  blocker?: Blocker;
  rank: number;
  standalone: number | null;
  completeness: number;
  /** Standalone value, annual £ (EBITDA x score). */
  value: number;
  /** Effects in the recommended set (PURSUE) or as if added to it (HOLD / PASS). */
  combination: CombinationEffect;
  /** Plain-English headline for the verdict. */
  headline: string;
  reasons: Reason[];
  whatWouldChange: string[];
  diligence: DiligenceQuestion[];
  /** Year in the buying schedule, 1-based, PURSUE only. */
  year?: number;
}

export interface VerdictsResult {
  verdicts: Verdict[];
  result: OptimiseResult;
  counts: Record<VerdictKind, number>;
  capitalUsed: number;
  revenueAdded: number;
  /** EBITDA of the set plus combination effects, annual £. */
  ebitdaAdded: number;
  strategy: Strategy;
  passBelow: number;
}

export interface VerdictsInput {
  targets: Target[];
  acquirer: AcquirerProfile;
  scores: TargetScore[];
  passBelow: number;
}

const other = (s: Strategy): Strategy => (s === "densify" ? "expand" : "densify");
const withArticle = (s: Strategy): string => (s === "expand" ? "an expand" : "a densify");

/** "A", "A and B", "A, B and C". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function money(n: number): string {
  return `${n < 0 ? "-" : "+"}${formatGbpCompact(Math.abs(n))}`;
}

/** Score if one component were lifted to `to`, keeping the applied weights. */
function scoreIfComponent(score: TargetScore, componentId: string, to: number): number | null {
  const avail = score.components.filter((c) => c.score !== null && c.weight > 0);
  const total = avail.reduce((s, c) => s + c.weight, 0);
  if (total === 0) return null;
  return Math.round(avail.reduce((s, c) => s + (c.id === componentId ? to : (c.score as number)) * c.weight, 0) / total);
}

function weakestComponent(score: TargetScore): ComponentScore | undefined {
  return score.components.filter((c) => c.score !== null && c.weight > 0).sort((a, b2) => (a.score as number) * 1 - (b2.score as number) * 1)[0];
}

export function runVerdicts(input: VerdictsInput, b: typeof B = B): VerdictsResult {
  const { targets, acquirer, scores, passBelow } = input;
  const scoreById = new Map(scores.map((s) => [s.targetId, s]));
  const byId = new Map(targets.map((t) => [t.id, t]));
  const years = b.combination.horizonYears;

  const base: OptimiseInput = { targets, acquirer, scores, passBelow };
  const result = optimise(base, b);
  const selectedSet = new Set(result.selected);
  const selected = result.selected.map((id) => byId.get(id)!);
  const flipped = optimise({ ...base, acquirer: { ...acquirer, strategy: other(acquirer.strategy) } }, b);
  const flippedSet = new Set(flipped.selected);

  const yearOf = new Map<string, number>();
  result.schedule.forEach((ids, i) => ids.forEach((id) => yearOf.set(id, i + 1)));

  const verdicts: Verdict[] = targets.map((t) => {
    const sc = scoreById.get(t.id);
    const standalone = sc?.score ?? null;
    const value = standaloneValue(t, sc, b);
    const reasons = sc?.reasons ?? [];
    const diligence = sc?.diligence ?? [];
    const completeness = sc?.completeness ?? 0;

    /* PURSUE */
    if (selectedSet.has(t.id)) {
      const combination = result.effects[t.id];
      const year = yearOf.get(t.id);
      const whatWouldChange: string[] = [];
      const neg = [...combination.items].filter((i) => i.amount < 0).sort((a, c) => a.amount - c.amount)[0];
      if (neg) whatWouldChange.push(`Watch the overlap: ${neg.text}.`);
      if (!flippedSet.has(t.id)) whatWouldChange.push(`Drops out of the set under ${withArticle(other(acquirer.strategy))} strategy.`);
      const without = optimise({ ...base, exclude: [t.id] }, b);
      const delta = result.value - without.value;
      whatWouldChange.push(`Leaving it out would cut the set's annual value by ${formatGbpCompact(Math.max(0, delta))}.`);
      return {
        targetId: t.id,
        verdict: "PURSUE",
        rank: 0,
        standalone,
        completeness,
        value,
        combination,
        headline: `In the recommended set, year ${year}: ${formatGbpCompact(t.askingPrice)} for ${formatGbpCompact(ebitdaEstimate(t, b).value)} EBITDA, combination effect ${money(combination.total)} a year`,
        reasons,
        whatWouldChange,
        diligence,
        year,
      };
    }

    /* Effects as if added to the recommended set */
    const withT = [...selected, t];
    const addedEffects = combinationEffects(withT, acquirer, b).get(t.id)!;

    /* HOLD: no data */
    if (standalone === null) {
      const missing = sc?.missingFields ?? [];
      return {
        targetId: t.id,
        verdict: "HOLD",
        blocker: "data",
        rank: 0,
        standalone,
        completeness,
        value,
        combination: addedEffects,
        headline: "Cannot be scored yet: no usable data",
        reasons,
        whatWouldChange: [`Provide ${missing.slice(0, 4).join(", ")}${missing.length > 4 ? ` and ${missing.length - 4} more fields` : ""} to score it.`],
        diligence,
      };
    }

    /* PASS */
    if (standalone < passBelow) {
      const whatWouldChange: string[] = [`Standalone score ${standalone} is below the ${passBelow} line; it was not considered for the set.`];
      if (sc) {
        const weakest = weakestComponent(sc);
        if (weakest) {
          const lifted = scoreIfComponent(sc, weakest.id, 70);
          if (lifted !== null) {
            whatWouldChange.push(
              `Its weakest component is ${weakest.label.toLowerCase()} (${weakest.score}); at 70 the score would be about ${lifted}${lifted >= passBelow ? ", enough to be considered" : ", still short"}.`,
            );
          }
        }
      }
      return {
        targetId: t.id,
        verdict: "PASS",
        rank: 0,
        standalone,
        completeness,
        value,
        combination: addedEffects,
        headline: `Standalone ${standalone}, below the ${passBelow} line`,
        reasons,
        whatWouldChange,
        diligence,
      };
    }

    /* HOLD: excluded by the optimiser */
    const price = t.askingPrice;
    const budgetOk = result.capitalUsed + price <= acquirer.capital + 1e-9;
    const loadOk = result.totalLoad + t.integrationLoad <= acquirer.integrationCapacityPerYear * years + 1e-9;
    const whatWouldChange: string[] = [];
    let blocker: Blocker;
    let headline: string;

    // What happens if we insist on it
    let forcedNote: string | null = null;
    let displaced: string[] = [];
    if (price <= acquirer.capital) {
      const forced = optimise({ ...base, forceInclude: [t.id] }, b);
      if (forced.feasible) {
        displaced = result.selected.filter((id) => !forced.selected.includes(id)).map((id) => byId.get(id)!.name);
        const delta = forced.value - result.value;
        forcedNote = `Forcing it in would ${displaced.length ? `displace ${joinNames(displaced)} and ` : ""}change the set's annual value by ${money(delta)}.`;
      }
    }

    if (budgetOk && loadOk) {
      blocker = "overlap";
      const withEv = evaluateBasket(withT, acquirer, scoreById, b);
      const marginal = withEv.value - result.value;
      const neg = [...addedEffects.items].filter((i) => i.amount < 0).sort((a, c) => a.amount - c.amount)[0];
      headline = `Fits the budget and capacity, but adding it changes the set's annual value by ${money(marginal)}`;
      if (neg) whatWouldChange.push(`${neg.text}.`);
      whatWouldChange.push(`Combination effect as part of this set: ${money(addedEffects.total)} a year against ${formatGbpCompact(value)} of standalone value.`);
    } else if (!budgetOk) {
      blocker = "budget";
      const shortfall = result.capitalUsed + price - acquirer.capital;
      if (price > acquirer.capital) {
        headline = `Asking ${formatGbpCompact(price)} is more than your whole ${formatGbpCompact(acquirer.capital)} budget`;
      } else if (displaced.length > 0) {
        headline = `Outcompeted for the ${formatGbpCompact(acquirer.capital)} budget: ${joinNames(displaced)} ${displaced.length === 1 ? "delivers" : "deliver"} more value for the money`;
      } else {
        headline = `Does not fit the remaining budget: ${formatGbpCompact(acquirer.capital - result.capitalUsed)} left after the recommended set`;
      }
      whatWouldChange.push(`Needs about ${formatGbpCompact(shortfall)} more capital to add it on top of the recommended set.`);
    } else {
      blocker = "capacity";
      const needed = Math.ceil((result.totalLoad + t.integrationLoad) / years);
      headline = `Fits the budget but not your integration capacity of ${acquirer.integrationCapacityPerYear} a year over ${years} years`;
      whatWouldChange.push(`Needs integration capacity of about ${needed} a year (you have ${acquirer.integrationCapacityPerYear}).`);
    }
    if (forcedNote) whatWouldChange.push(forcedNote);
    if (flippedSet.has(t.id)) whatWouldChange.push(`Would be PURSUE under ${withArticle(other(acquirer.strategy))} strategy.`);

    return {
      targetId: t.id,
      verdict: "HOLD",
      blocker,
      rank: 0,
      standalone,
      completeness,
      value,
      combination: addedEffects,
      headline,
      reasons,
      whatWouldChange,
      diligence,
    };
  });

  /* Rank: PURSUE by value, HOLD by standalone, PASS by standalone (null last) */
  const order: Record<VerdictKind, number> = { PURSUE: 0, HOLD: 1, PASS: 2 };
  verdicts.sort((a, c) => {
    if (order[a.verdict] !== order[c.verdict]) return order[a.verdict] - order[c.verdict];
    if (a.verdict === "PURSUE") return c.value + c.combination.total - (a.value + a.combination.total);
    return (c.standalone ?? -1) - (a.standalone ?? -1);
  });
  verdicts.forEach((v, i) => (v.rank = i + 1));

  const counts: Record<VerdictKind, number> = { PURSUE: 0, HOLD: 0, PASS: 0 };
  for (const v of verdicts) counts[v.verdict]++;
  const revenueAdded = selected.reduce((s, t) => s + t.revenue, 0);
  const ebitdaAdded = selected.reduce((s, t) => s + ebitdaEstimate(t, b).value, 0) + result.effectTotal;

  return { verdicts, result, counts, capitalUsed: result.capitalUsed, revenueAdded, ebitdaAdded, strategy: acquirer.strategy, passBelow };
}
