import type { benchmarks as B } from "@/data/benchmarks";
import type { Target } from "@/lib/types";
import type { SignalScore } from "../types";
import { missing } from "./financial";
import { pct, round1, scale } from "./scale";

export function leaseYearsSignal(t: Target, b: typeof B): SignalScore {
  const v = t.leaseYearsRemaining;
  if (v === undefined) return missing("leaseYears", "Lease length", ["leaseYearsRemaining"], "lease length");
  const score = scale(v, b.leaseYears);
  const yrs = `${round1(v)} ${v === 1 ? "year" : "years"}`;
  const text =
    v <= 0
      ? "Lease has expired or is holding over: no security of tenure"
      : v < b.leaseFlagYears
        ? `Only ${yrs} left on the lease`
        : v >= b.leaseYears.good
          ? `${yrs} left on the lease: long security of tenure`
          : `${yrs} left on the lease`;
  return { id: "leaseYears", label: "Lease length", score, text, fields: ["leaseYearsRemaining"], missing: [] };
}

export function rentSignal(t: Target, b: typeof B): SignalScore {
  const v = t.rentPctRevenue;
  if (v === undefined) return missing("rent", "Rent", ["rentPctRevenue"], "rent");
  const score = scale(v, b.rentPctRevenue);
  const text =
    v > b.rentFlagPctRevenue
      ? `Rent is ${pct(v)} of revenue, well above the ${b.healthyRentPctRevenue}% healthy level`
      : v > b.healthyRentPctRevenue
        ? `Rent is ${pct(v)} of revenue, a little above the ${b.healthyRentPctRevenue}% healthy level`
        : `Rent is ${pct(v)} of revenue, within the ${b.healthyRentPctRevenue}% healthy level`;
  return { id: "rent", label: "Rent", score, text, fields: ["rentPctRevenue"], missing: [] };
}

/** Lease risk in one number: years and rent averaged, less a penalty for a landlord break clause. */
export function leaseRisk(t: Target, b: typeof B): { score: number | null; breakNote?: string } {
  const years = leaseYearsSignal(t, b).score;
  const rent = rentSignal(t, b).score;
  const present = [years, rent].filter((s): s is number => s !== null);
  if (present.length === 0) return { score: null };
  let score = present.reduce((a, c) => a + c, 0) / present.length;
  let breakNote: string | undefined;
  if (t.hasBreakClause) {
    score = Math.max(0, score - b.breakClausePenalty);
    breakNote = `Break clause in the lease: ${b.breakClausePenalty} points taken off lease security`;
  }
  return { score: Math.round(score), breakNote };
}
