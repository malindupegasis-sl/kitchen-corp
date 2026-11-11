/**
 * Benchmark values used across the engine and the UI. Scoring, flags and
 * reasons read from here; nothing is hard-coded in the scoring code itself.
 * Anchors are {bad, good}: a value at or beyond "bad" scores 0, at or beyond
 * "good" scores 100, linear in between.
 */
export const benchmarks = {
  /* Pipeline flags */
  rentFlagPctRevenue: 12,
  leaseFlagYears: 2,

  /* Financial */
  growthPct: { bad: -5, good: 20 },
  lflGrowthPct: { bad: -5, good: 10 },
  ebitdaMarginPct: { bad: 0, good: 18, typical: 12 },

  /* Unit economics (% of revenue) */
  foodCostPct: { bad: 38, good: 26, typical: 30 },
  labourCostPct: { bad: 38, good: 26, typical: 30 },
  /** Implied "other costs" (100 - food - labour - rent - margin) outside this range looks implausible. */
  otherCostsPlausiblePct: { min: 8, max: 40 },

  /* Lease */
  healthyRentPctRevenue: 10,
  rentPctRevenue: { bad: 15, good: 8 },
  leaseYears: { bad: 0, good: 10 },
  breakClausePenalty: 10,

  /* Delivery and reviews */
  rating: { weak: 4.2, strong: 4.6, bad: 4.0, good: 4.6 },
  ratingSpreadRisk: 0.4,
  ratingSpread: { bad: 0.6, good: 0.2 },
  platformConcentrationRisk: 70,
  platformConcentration: { bad: 85, good: 50 },
  deliveryShareBenchmark: 30,
  deliveryLowShare: 20,
  /** Low delivery share is upside: score is high when share is low. */
  deliveryShareUpside: { bad: 40, good: 15 },

  /* Price */
  evToEbitda: 6,
  priceMultiple: { bad: 10, good: 4 },
  /** Score given to a positive asking price on zero or negative EBITDA. */
  priceScoreNoEarnings: 10,

  /* Acquirer */
  kitchenUtilisation: { lowSlack: 85, highSlack: 55 },
} as const;
