/**
 * Picks the subset of targets that maximises standalone value plus
 * combination effects, subject to capital and integration capacity.
 * Exhaustive depth-first search with pruning when the candidate list is
 * small (<= 20); greedy pick plus swap local search otherwise. Pure.
 */
import { benchmarks as B } from "@/data/benchmarks";
import type { AcquirerProfile, Target } from "@/lib/types";
import { basketEffectTotal, combinationEffects, ebitdaEstimate, type CombinationEffect } from "./combination";
import type { TargetScore } from "./types";

export const EXHAUSTIVE_MAX_CANDIDATES = 20;

export interface OptimiseInput {
  targets: Target[];
  acquirer: AcquirerProfile;
  scores: TargetScore[];
  /** Targets scoring below this are not candidates (they are PASS). */
  passBelow: number;
  /** Ids that must be in the basket (used for "what would change" analysis). */
  forceInclude?: string[];
  /** Ids that may not be in the basket. */
  exclude?: string[];
}

export interface OptimiseResult {
  selected: string[];
  /** Objective: standalone value plus combination effects, annual £. */
  value: number;
  standaloneValue: number;
  effectTotal: number;
  capitalUsed: number;
  totalLoad: number;
  /** Buying schedule: deal ids by the year their integration starts. */
  schedule: string[][];
  /** Integration load landing in each year; never above the annual capacity. */
  yearLoads: number[];
  /** How each selected deal's load is spread across years. */
  loadAllocations: LoadAllocation[];
  effects: Record<string, CombinationEffect>;
  /** Ids eligible for selection. */
  candidates: string[];
  method: "exhaustive" | "greedy";
  evaluated: number;
  /** False when even the forced set does not fit the constraints. */
  feasible: boolean;
}

/** Standalone value: EBITDA weighted by the standalone score (a 70 scores 70% of its EBITDA). */
export function standaloneValue(t: Target, score: TargetScore | undefined, b: typeof B = B): number {
  if (!score || score.score === null) return 0;
  return (ebitdaEstimate(t, b).value * score.score) / 100;
}

/** One slice of a deal's integration load landing in one year (0-based). */
export interface LoadAllocation {
  id: string;
  year: number;
  load: number;
}

export interface LoadPlan {
  /** Deal ids by the year their integration starts. */
  byStartYear: string[][];
  /** How each deal's load is spread across years. */
  allocations: LoadAllocation[];
  /** Total integration load landing in each year. */
  yearLoads: number[];
}

const EPS = 1e-9;

/** Total load per year from a set of allocations. */
export function yearLoadsOf(allocations: readonly LoadAllocation[], years: number): number[] {
  const loads = Array.from({ length: years }, () => 0);
  for (const a of allocations) {
    if (a.year < 0 || a.year >= years) return Array.from({ length: years }, () => Infinity);
    loads[a.year] += a.load;
  }
  return loads;
}

/** True when no single year takes more than the annual capacity. */
export function isWithinAnnualCapacity(allocations: readonly LoadAllocation[], capacityPerYear: number, years: number): boolean {
  return yearLoadsOf(allocations, years).every((l) => l <= capacityPerYear + EPS);
}

/**
 * Spreads integration load across years so that no single year exceeds the
 * annual capacity. Deals are taken in the order given; each fills the rest of
 * the current year and carries over into the next, so a load-3 deal with a
 * capacity of 2 takes 2 units in its first year and 1 in the next. Returns
 * null when the deals cannot be absorbed within the horizon.
 */
export function planIntegrationLoad(items: readonly { id: string; load: number }[], capacityPerYear: number, years: number): LoadPlan | null {
  const byStartYear: string[][] = Array.from({ length: years }, () => []);
  const allocations: LoadAllocation[] = [];
  const remaining = Array.from({ length: years }, () => Math.max(0, capacityPerYear));
  let year = 0;
  for (const it of items) {
    let left = it.load;
    while (year < years && remaining[year] <= EPS) year++;
    if (left <= EPS) {
      byStartYear[Math.min(year, years - 1)].push(it.id);
      continue;
    }
    if (year >= years) return null;
    byStartYear[year].push(it.id);
    while (left > EPS) {
      if (year >= years) return null;
      const take = Math.min(left, remaining[year]);
      if (take > EPS) {
        allocations.push({ id: it.id, year, load: take });
        remaining[year] -= take;
        left -= take;
      }
      if (remaining[year] <= EPS) year++;
    }
  }
  const yearLoads = yearLoadsOf(allocations, years);
  if (!isWithinAnnualCapacity(allocations, capacityPerYear, years)) return null;
  return { byStartYear, allocations, yearLoads };
}

/** Deal ids by start year, or null if the load cannot be absorbed within the horizon. */
export function scheduleByYear(items: readonly { id: string; load: number }[], capacityPerYear: number, years: number): string[][] | null {
  return planIntegrationLoad(items, capacityPerYear, years)?.byStartYear ?? null;
}

interface Evaluated {
  value: number;
  standalone: number;
  effectTotal: number;
  effects: Map<string, CombinationEffect>;
}

export function evaluateBasket(basket: readonly Target[], acquirer: AcquirerProfile, scoreById: Map<string, TargetScore>, b: typeof B = B): Evaluated {
  const effects = combinationEffects(basket, acquirer, b);
  const standalone = basket.reduce((s, t) => s + standaloneValue(t, scoreById.get(t.id), b), 0);
  const effectTotal = basketEffectTotal(effects);
  return { value: standalone + effectTotal, standalone, effectTotal, effects };
}

export function optimise(input: OptimiseInput, b: typeof B = B): OptimiseResult {
  const { targets, acquirer, scores, passBelow } = input;
  const years = b.combination.horizonYears;
  const scoreById = new Map(scores.map((s) => [s.targetId, s]));
  const force = new Set(input.forceInclude ?? []);
  const exclude = new Set(input.exclude ?? []);

  const candidates = targets.filter((t) => {
    if (exclude.has(t.id)) return false;
    if (force.has(t.id)) return true;
    const s = scoreById.get(t.id);
    return !!s && s.score !== null && s.score >= passBelow && t.askingPrice > 0;
  });

  const forced = candidates.filter((t) => force.has(t.id));
  const free = candidates.filter((t) => !force.has(t.id)).sort((x, y) => y.askingPrice - x.askingPrice);
  const capital = acquirer.capital;
  const loadCap = acquirer.integrationCapacityPerYear * years;

  /** Order for scheduling: biggest standalone value first (Phase 4 refines this). */
  const scheduleOrder = (basket: Target[]) =>
    [...basket]
      .sort((x, y) => standaloneValue(y, scoreById.get(y.id), b) - standaloneValue(x, scoreById.get(x.id), b))
      .map((t) => ({ id: t.id, load: t.integrationLoad }));
  /** Within budget, and the load can be spread so no single year exceeds the annual capacity. */
  const fits = (basket: Target[]): boolean => {
    const price = basket.reduce((s, t) => s + t.askingPrice, 0);
    if (price > capital + 1e-9) return false;
    return planIntegrationLoad(scheduleOrder(basket), acquirer.integrationCapacityPerYear, years) !== null;
  };

  let best: Target[] = forced;
  let bestEval: Evaluated | null = fits(forced) ? evaluateBasket(forced, acquirer, scoreById, b) : null;
  const feasible = bestEval !== null;
  let evaluated = 0;
  let method: OptimiseResult["method"] = "exhaustive";

  const better = (cand: Target[], ev: Evaluated): boolean => {
    if (!bestEval) return true;
    if (ev.value > bestEval.value + 1e-6) return true;
    if (Math.abs(ev.value - bestEval.value) <= 1e-6) {
      const candPrice = cand.reduce((s, t) => s + t.askingPrice, 0);
      const bestPrice = best.reduce((s, t) => s + t.askingPrice, 0);
      return candPrice < bestPrice - 1e-6;
    }
    return false;
  };

  if (feasible && free.length <= EXHAUSTIVE_MAX_CANDIDATES) {
    const forcedPrice = forced.reduce((s, t) => s + t.askingPrice, 0);
    const forcedLoad = forced.reduce((s, t) => s + t.integrationLoad, 0);
    const chosen: Target[] = [];
    const dfs = (i: number, price: number, load: number) => {
      if (i === free.length) {
        if (chosen.length === 0) return; // the forced-only basket is already evaluated
        const basket = [...forced, ...chosen];
        if (planIntegrationLoad(scheduleOrder(basket), acquirer.integrationCapacityPerYear, years) === null) return;
        evaluated++;
        const ev = evaluateBasket(basket, acquirer, scoreById, b);
        if (better(basket, ev)) {
          best = basket;
          bestEval = ev;
        }
        return;
      }
      const t = free[i];
      // include
      if (price + t.askingPrice <= capital + 1e-9 && load + t.integrationLoad <= loadCap + 1e-9) {
        chosen.push(t);
        dfs(i + 1, price + t.askingPrice, load + t.integrationLoad);
        chosen.pop();
      }
      // exclude
      dfs(i + 1, price, load);
    };
    dfs(0, forcedPrice, forcedLoad);
  } else if (feasible) {
    method = "greedy";
    // Greedy by marginal value per £, then swap / add / remove local search.
    let basket = [...forced];
    let ev = evaluateBasket(basket, acquirer, scoreById, b);
    let improved = true;
    while (improved) {
      improved = false;
      let bestMove: { basket: Target[]; ev: Evaluated } | null = null;
      const consider = (cand: Target[]) => {
        if (!fits(cand)) return;
        evaluated++;
        const e = evaluateBasket(cand, acquirer, scoreById, b);
        if (e.value > ev.value + 1e-6 && (!bestMove || e.value > bestMove.ev.value)) bestMove = { basket: cand, ev: e };
      };
      const inIds = new Set(basket.map((t) => t.id));
      for (const t of free) if (!inIds.has(t.id)) consider([...basket, t]);
      for (const t of basket) if (!force.has(t.id)) consider(basket.filter((u) => u.id !== t.id));
      for (const out of basket) {
        if (force.has(out.id)) continue;
        for (const t of free) if (!inIds.has(t.id)) consider([...basket.filter((u) => u.id !== out.id), t]);
      }
      if (bestMove) {
        basket = (bestMove as { basket: Target[]; ev: Evaluated }).basket;
        ev = (bestMove as { basket: Target[]; ev: Evaluated }).ev;
        improved = true;
      }
    }
    best = basket;
    bestEval = ev;
  }

  const finalEval: Evaluated = bestEval ?? { value: 0, standalone: 0, effectTotal: 0, effects: new Map() };
  const selected = best.map((t) => t.id);
  const plan = planIntegrationLoad(scheduleOrder(best), acquirer.integrationCapacityPerYear, years);
  const schedule = plan?.byStartYear ?? Array.from({ length: years }, () => []);
  return {
    selected,
    value: finalEval.value,
    standaloneValue: finalEval.standalone,
    effectTotal: finalEval.effectTotal,
    capitalUsed: best.reduce((s, t) => s + t.askingPrice, 0),
    totalLoad: best.reduce((s, t) => s + t.integrationLoad, 0),
    schedule,
    yearLoads: plan?.yearLoads ?? Array.from({ length: years }, () => 0),
    loadAllocations: plan?.allocations ?? [],
    effects: Object.fromEntries(finalEval.effects),
    candidates: candidates.map((t) => t.id),
    method,
    evaluated,
    feasible,
  };
}

/** Convenience: targets by id for a result's selection. */
export function selectedTargets(result: OptimiseResult, targets: Target[]): Target[] {
  const byId = new Map(targets.map((t) => [t.id, t]));
  return result.selected.map((id) => byId.get(id)!).filter(Boolean);
}
