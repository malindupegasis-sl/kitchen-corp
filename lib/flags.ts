import { benchmarks } from "@/data/benchmarks";
import type { Target } from "./types";

export type FlagCode = "high_rent" | "short_lease";

export interface PipelineFlag {
  code: FlagCode;
  /** Short label for a pill. */
  label: string;
  /** Plain-English reason. */
  reason: string;
  severity: "amber";
}

/** Risk flags shown on the Pipeline table. Pure function of the target. */
export function pipelineFlags(target: Target): PipelineFlag[] {
  const flags: PipelineFlag[] = [];

  if (
    target.rentPctRevenue !== undefined &&
    target.rentPctRevenue > benchmarks.rentFlagPctRevenue
  ) {
    flags.push({
      code: "high_rent",
      label: `Rent ${formatPct(target.rentPctRevenue)}`,
      reason: `Rent is ${formatPct(target.rentPctRevenue)} of revenue, above the ${benchmarks.rentFlagPctRevenue}% flag level.`,
      severity: "amber",
    });
  }

  if (
    target.leaseYearsRemaining !== undefined &&
    target.leaseYearsRemaining < benchmarks.leaseFlagYears
  ) {
    flags.push({
      code: "short_lease",
      label: `Lease ${formatYears(target.leaseYearsRemaining)}`,
      reason: `Only ${formatYears(target.leaseYearsRemaining)} left on the lease, under the ${benchmarks.leaseFlagYears}-year flag level.`,
      severity: "amber",
    });
  }

  return flags;
}

export function isRentFlagged(target: Target): boolean {
  return pipelineFlags(target).some((f) => f.code === "high_rent");
}

export function isLeaseFlagged(target: Target): boolean {
  return pipelineFlags(target).some((f) => f.code === "short_lease");
}

function formatPct(n: number): string {
  return `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
}

function formatYears(n: number): string {
  const v = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return `${v} ${n === 1 ? "yr" : "yrs"}`;
}
