import type { benchmarks as B } from "@/data/benchmarks";
import type { Target } from "@/lib/types";
import type { SignalScore } from "../types";
import { pct, scale } from "./scale";

/** Share of delivery revenue on the single biggest aggregator. */
export function platformConcentrationSignal(t: Target, b: typeof B): SignalScore {
  const a = t.aggregatorSplit;
  const fields = ["aggregatorSplit"];
  if (!a) return { id: "platformConcentration", label: "Platform concentration", score: null, text: "No aggregator split data", fields, missing: fields };
  const entries: [string, number][] = [["Uber Eats", a.uber], ["Deliveroo", a.deliveroo], ["Just Eat", a.justEat]];
  const [name, share] = entries.reduce((best, cur) => (cur[1] > best[1] ? cur : best));
  if (share === 0) {
    return { id: "platformConcentration", label: "Platform concentration", score: 100, text: "No aggregator dependence recorded", fields, missing: [] };
  }
  const score = scale(share, b.platformConcentration);
  const text =
    share > b.platformConcentrationRisk
      ? `${pct(share)} of delivery goes through ${name}: dependent on one platform's terms`
      : `Delivery spread across platforms (largest is ${name} at ${pct(share)})`;
  return { id: "platformConcentration", label: "Platform concentration", score, text, fields, missing: [] };
}

/** Delivery share of revenue versus benchmark. Low share is upside for an acquirer that can grow it. */
export function deliveryShareSignal(t: Target, b: typeof B): SignalScore {
  const c = t.channelMix;
  const fields = ["channelMix"];
  if (!c) return { id: "deliveryShare", label: "Delivery share", score: null, text: "No channel mix data", fields, missing: fields };
  const share = c.delivery;
  const score = scale(share, b.deliveryShareUpside);
  const text =
    share < b.deliveryLowShare
      ? `Delivery is only ${pct(share)} of revenue against a ${b.deliveryShareBenchmark}% benchmark: room to grow it`
      : share > b.deliveryShareBenchmark
        ? `Delivery already ${pct(share)} of revenue, above the ${b.deliveryShareBenchmark}% benchmark: little delivery upside left`
        : `Delivery is ${pct(share)} of revenue, close to the ${b.deliveryShareBenchmark}% benchmark`;
  return { id: "deliveryShare", label: "Delivery share", score, text, fields, missing: [] };
}
