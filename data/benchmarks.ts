/**
 * Benchmark values used across the engine and the UI. Scoring and flags read
 * from here; nothing is hard-coded in the scoring code itself.
 */
export const benchmarks = {
  /** Rent above this share of revenue is flagged amber on the Pipeline. */
  rentFlagPctRevenue: 12,
  /** Lease with fewer years remaining than this is flagged amber on the Pipeline. */
  leaseFlagYears: 2,
  /** Healthy rent is below this share of revenue. */
  healthyRentPctRevenue: 10,
  /** Benchmark acquisition multiple, EV / EBITDA. */
  evToEbitda: 6,
} as const;
