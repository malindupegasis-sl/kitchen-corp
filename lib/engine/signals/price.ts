import type { benchmarks as B } from "@/data/benchmarks";
import { formatGbpCompact } from "@/lib/format";
import type { Target } from "@/lib/types";
import type { SignalScore } from "../types";
import { round1, scale } from "./scale";

/** EBITDA in GBP from revenue and margin, or null if either is missing. */
export function ebitdaOf(t: Target): number | null {
  if (t.ebitdaMarginPct === undefined || !(t.revenue > 0)) return null;
  return (t.revenue * t.ebitdaMarginPct) / 100;
}

export function priceSignal(t: Target, b: typeof B): SignalScore {
  const fields = ["askingPrice", "revenue", "ebitdaMarginPct"];
  const missing = fields.filter((f) => (f === "askingPrice" ? !(t.askingPrice > 0) : f === "revenue" ? !(t.revenue > 0) : t.ebitdaMarginPct === undefined));
  if (missing.length > 0) {
    return { id: "price", label: "Price vs earnings", score: null, text: "Cannot value the asking price without price, revenue and margin", fields, missing };
  }
  const ebitda = ebitdaOf(t)!;
  if (ebitda <= 0) {
    return {
      id: "price",
      label: "Price vs earnings",
      score: b.priceScoreNoEarnings,
      text: `Asking ${formatGbpCompact(t.askingPrice)} for a business with ${ebitda === 0 ? "zero" : "negative"} EBITDA: the price cannot be anchored to earnings`,
      fields,
      missing: [],
    };
  }
  const multiple = round1(t.askingPrice / ebitda);
  const score = scale(multiple, b.priceMultiple);
  const text =
    multiple > b.evToEbitda
      ? `Asking ${formatGbpCompact(t.askingPrice)} is ${multiple}x EBITDA, above the ${b.evToEbitda}x benchmark`
      : `Asking ${formatGbpCompact(t.askingPrice)} is ${multiple}x EBITDA, at or below the ${b.evToEbitda}x benchmark`;
  return { id: "price", label: "Price vs earnings", score, text, fields, missing: [] };
}
