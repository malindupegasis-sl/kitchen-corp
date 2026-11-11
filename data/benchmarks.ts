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

  /* Combination effects (all expressed as annual £ of EBITDA-equivalent value) */
  combination: {
    /** Horizon over which integration capacity applies. */
    horizonYears: 3,
    /** Cannibalisation: % of the target's EBITDA lost per party with the same cuisine in an overlapping zone. */
    cannibalisationPct: { acquirerExpand: 25, acquirerDensify: 8, betweenTargets: 10 },
    cannibalisationMaxParties: 3,
    /** Zone fit: % of the target's EBITDA added when its zones suit the strategy. */
    zoneFitPct: 15,
    /** Central production kitchen: points of revenue saved on food cost for each member of a same-cuisine cluster. */
    centralKitchenFoodCostPts: 1.5,
    /** Procurement saving as % of food cost: base for one deal, growing with basket size. */
    procurement: { basePct: 1, perExtraTargetPct: 0.5, maxPct: 3 },
    /** Shared head office: % of the target's central overhead removed. */
    headOfficeSavingPct: 40,
    /** Delivery uplift for targets under the threshold share: capture % of the gap, at an incremental margin. */
    deliveryUplift: { thresholdShare: 20, capturePct: 50, incrementalMarginPct: 15 },
    /** Cuisine breadth: % of the target's EBITDA for a cuisine new to both the acquirer and the rest of the basket. */
    cuisineBreadthPct: 2,
  },
} as const;
