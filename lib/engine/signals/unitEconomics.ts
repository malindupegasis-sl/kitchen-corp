import type { benchmarks as B } from "@/data/benchmarks";
import type { Target } from "@/lib/types";
import type { SignalScore } from "../types";
import { missing } from "./financial";
import { pct, round1, scale } from "./scale";

export function foodCostSignal(t: Target, b: typeof B): SignalScore {
  const v = t.foodCostPct;
  if (v === undefined) return missing("foodCost", "Food cost", ["foodCostPct"], "food cost");
  const score = scale(v, b.foodCostPct);
  const text =
    v <= b.foodCostPct.typical
      ? `Food cost ${pct(v)} of revenue, at or better than the ${b.foodCostPct.typical}% benchmark`
      : `Food cost ${pct(v)} of revenue, above the ${b.foodCostPct.typical}% benchmark`;
  return { id: "foodCost", label: "Food cost", score, text, fields: ["foodCostPct"], missing: [] };
}

export function labourCostSignal(t: Target, b: typeof B): SignalScore {
  const v = t.labourCostPct;
  if (v === undefined) return missing("labourCost", "Labour cost", ["labourCostPct"], "labour cost");
  const score = scale(v, b.labourCostPct);
  const text =
    v <= b.labourCostPct.typical
      ? `Labour cost ${pct(v)} of revenue, at or better than the ${b.labourCostPct.typical}% benchmark`
      : `Labour cost ${pct(v)} of revenue, above the ${b.labourCostPct.typical}% benchmark`;
  return { id: "labourCost", label: "Labour cost", score, text, fields: ["labourCostPct"], missing: [] };
}

export type ConsistencyStatus = "consistent" | "implausible" | "unknown";

export interface Consistency {
  status: ConsistencyStatus;
  /** 100 - food - labour - rent - margin, when all four are known. */
  impliedOtherCostsPct?: number;
  note: string;
}

/**
 * Unit-economics consistency: food + labour + rent + EBITDA margin should leave
 * a plausible share for everything else (utilities, marketing, overhead...).
 */
export function unitEconomicsConsistency(t: Target, b: typeof B): Consistency {
  const { foodCostPct: f, labourCostPct: l, rentPctRevenue: r, ebitdaMarginPct: m } = t;
  if (f === undefined || l === undefined || r === undefined || m === undefined) {
    return { status: "unknown", note: "Cannot check that the P&L adds up: food, labour, rent or margin is missing" };
  }
  const other = round1(100 - f - l - r - m);
  const { min, max } = b.otherCostsPlausiblePct;
  if (other < min) {
    return {
      status: "implausible",
      impliedOtherCostsPct: other,
      note: `Food, labour, rent and margin leave only ${pct(other)} for all other costs; the P&L does not add up`,
    };
  }
  if (other > max) {
    return {
      status: "implausible",
      impliedOtherCostsPct: other,
      note: `Food, labour, rent and margin leave ${pct(other)} unexplained; something large is missing from the P&L`,
    };
  }
  return { status: "consistent", impliedOtherCostsPct: other, note: `Cost lines reconcile (${pct(other)} left for other costs)` };
}
