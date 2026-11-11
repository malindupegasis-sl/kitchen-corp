import type { Target } from "@/lib/types";
import type { SignalScore } from "../types";

/** Brand score 1-5 is a judgement input, mapped linearly to 0-100. */
export function brandSignal(t: Target): SignalScore {
  const v = t.brandScore;
  const fields = ["brandScore"];
  if (v === undefined) return { id: "brand", label: "Brand (judgement)", score: null, text: "No brand score entered", fields, missing: fields };
  const score = Math.round(((Math.min(5, Math.max(1, v)) - 1) / 4) * 100);
  const text = `Brand judged ${v} out of 5 (judgement input, not data)`;
  return { id: "brand", label: "Brand (judgement)", score, text, fields, missing: [] };
}
