import type { Target } from "./types";

/** Fields the acquisition lens wants for every target; missing ones are "data gaps". */
export const GAP_FIELDS: readonly { key: string; label: string; has: (t: Target) => boolean }[] = [
  { key: "growthPct", label: "growth", has: (t) => t.growthPct !== undefined },
  { key: "lflGrowthPct", label: "like-for-like growth", has: (t) => t.lflGrowthPct !== undefined },
  { key: "ebitdaMarginPct", label: "EBITDA margin", has: (t) => t.ebitdaMarginPct !== undefined },
  { key: "foodCostPct", label: "food cost", has: (t) => t.foodCostPct !== undefined },
  { key: "labourCostPct", label: "labour cost", has: (t) => t.labourCostPct !== undefined },
  { key: "rentPctRevenue", label: "rent % of revenue", has: (t) => t.rentPctRevenue !== undefined },
  { key: "leaseYearsRemaining", label: "lease years", has: (t) => t.leaseYearsRemaining !== undefined },
  { key: "channelMix", label: "channel mix", has: (t) => t.channelMix !== undefined },
  { key: "aggregatorSplit", label: "aggregator split", has: (t) => t.aggregatorSplit !== undefined },
  { key: "rating", label: "rating", has: (t) => t.rating !== undefined },
  { key: "siteRating", label: "site rating range", has: (t) => t.siteRatingMin !== undefined && t.siteRatingMax !== undefined },
  { key: "locationType", label: "location type", has: (t) => t.locationType !== undefined },
  { key: "overheadCost", label: "overhead cost", has: (t) => t.overheadCost !== undefined },
  { key: "askingPrice", label: "asking price", has: (t) => t.askingPrice > 0 },
  { key: "revenue", label: "revenue", has: (t) => t.revenue > 0 },
  { key: "brandScore", label: "brand score", has: (t) => t.brandScore !== undefined },
];

/** Plain-English labels of the fields this target is missing. Pure function. */
export function dataGaps(target: Target): string[] {
  return GAP_FIELDS.filter((f) => !f.has(target)).map((f) => f.label);
}

export function hasDataGaps(target: Target): boolean {
  return GAP_FIELDS.some((f) => !f.has(target));
}
