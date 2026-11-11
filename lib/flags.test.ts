import { describe, expect, it } from "vitest";
import { blankTarget } from "./types";
import { pipelineFlags } from "./flags";

describe("pipelineFlags", () => {
  it("flags rent above 12% and lease under 2 years", () => {
    const t = { ...blankTarget("x"), rentPctRevenue: 12.5, leaseYearsRemaining: 1.5 };
    expect(pipelineFlags(t).map((f) => f.code)).toEqual(["high_rent", "short_lease"]);
    expect(pipelineFlags(t)[0].label).toBe("Rent 12.5%");
    expect(pipelineFlags(t)[1].label).toBe("Lease 1.5 yrs");
  });

  it("does not flag at the thresholds or when data is missing", () => {
    expect(pipelineFlags({ ...blankTarget("x"), rentPctRevenue: 12, leaseYearsRemaining: 2 })).toEqual([]);
    expect(pipelineFlags(blankTarget("x"))).toEqual([]);
  });
});
