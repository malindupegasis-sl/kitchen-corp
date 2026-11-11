import type { benchmarks as B } from "@/data/benchmarks";
import type { Target } from "@/lib/types";
import type { SignalScore } from "../types";
import { pct, scale } from "./scale";

export function growthSignal(t: Target, b: typeof B): SignalScore {
  const v = t.growthPct;
  if (v === undefined) return missing("growth", "Revenue growth", ["growthPct"], "growth");
  const score = scale(v, b.growthPct);
  const text =
    v < 0
      ? `Revenue is shrinking (${pct(v)} year on year)`
      : v >= b.growthPct.good
        ? `Revenue growing fast at ${pct(v)} a year`
        : `Revenue growing ${pct(v)} a year`;
  return { id: "growth", label: "Revenue growth", score, text, fields: ["growthPct"], missing: [] };
}

export function lflSignal(t: Target, b: typeof B): SignalScore {
  const v = t.lflGrowthPct;
  if (v === undefined) return missing("lfl", "Like-for-like growth", ["lflGrowthPct"], "like-for-like growth");
  const score = scale(v, b.lflGrowthPct);
  const text =
    v < 0
      ? `Like-for-like sales falling ${pct(Math.abs(v))}: existing sites are losing trade`
      : v >= b.lflGrowthPct.good
        ? `Like-for-like sales up ${pct(v)}: existing sites are still growing`
        : `Like-for-like sales up ${pct(v)}`;
  return { id: "lfl", label: "Like-for-like growth", score, text, fields: ["lflGrowthPct"], missing: [] };
}

export function marginSignal(t: Target, b: typeof B): SignalScore {
  const v = t.ebitdaMarginPct;
  if (v === undefined) return missing("margin", "EBITDA margin", ["ebitdaMarginPct"], "EBITDA margin");
  const score = scale(v, b.ebitdaMarginPct);
  const text =
    v <= 0
      ? `EBITDA margin of ${pct(v)}: the business is not making money`
      : v >= b.ebitdaMarginPct.typical
        ? `EBITDA margin of ${pct(v)}, at or above the ${b.ebitdaMarginPct.typical}% benchmark`
        : `EBITDA margin of ${pct(v)}, below the ${b.ebitdaMarginPct.typical}% benchmark`;
  return { id: "margin", label: "EBITDA margin", score, text, fields: ["ebitdaMarginPct"], missing: [] };
}

export function missing(id: string, label: string, fields: string[], plain: string): SignalScore {
  return { id, label, score: null, text: `No ${plain} data`, fields, missing: fields };
}
