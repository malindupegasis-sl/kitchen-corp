import type { benchmarks as B } from "@/data/benchmarks";
import type { Target } from "@/lib/types";
import type { SignalScore } from "../types";
import { missing } from "./financial";
import { round1, scale } from "./scale";

export function ratingSignal(t: Target, b: typeof B): SignalScore {
  const v = t.rating;
  if (v === undefined) return missing("rating", "Customer rating", ["rating"], "customer rating");
  const score = scale(v, b.rating);
  const text =
    v >= b.rating.strong
      ? `Strong ${v.toFixed(1)} customer rating`
      : v < b.rating.weak
        ? `Weak ${v.toFixed(1)} customer rating, below the ${b.rating.weak} level`
        : `Customer rating ${v.toFixed(1)}, between the ${b.rating.weak} weak and ${b.rating.strong} strong levels`;
  return { id: "rating", label: "Customer rating", score, text, fields: ["rating"], missing: [] };
}

/** Spread between best and worst site: a wide spread means inconsistent operations. */
export function ratingSpreadSignal(t: Target, b: typeof B): SignalScore {
  const { siteRatingMin: lo, siteRatingMax: hi } = t;
  const fields = ["siteRatingMin", "siteRatingMax"];
  if (lo === undefined || hi === undefined) {
    return { id: "ratingSpread", label: "Site rating spread", score: null, text: "No site-level rating data", fields, missing: fields.filter((f) => t[f as keyof Target] === undefined) };
  }
  const spread = round1(hi - lo);
  const score = scale(spread, b.ratingSpread);
  const text =
    spread > b.ratingSpreadRisk
      ? `Site ratings range from ${lo.toFixed(1)} to ${hi.toFixed(1)}: a ${spread.toFixed(1)} spread signals inconsistent operations`
      : `Site ratings are consistent (${lo.toFixed(1)} to ${hi.toFixed(1)})`;
  return { id: "ratingSpread", label: "Site rating spread", score, text, fields, missing: [] };
}
