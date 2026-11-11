import { describe, expect, it } from "vitest";
import { sampleTargets } from "@/data/sample";
import { dataGaps, hasDataGaps } from "./gaps";
import { blankTarget } from "./types";

describe("dataGaps", () => {
  it("finds no gaps in the sample data", () => {
    for (const t of sampleTargets) expect(dataGaps(t), t.name).toEqual([]);
  });

  it("lists every missing field for a blank target", () => {
    const gaps = dataGaps(blankTarget("x"));
    expect(gaps).toContain("growth");
    expect(gaps).toContain("asking price");
    expect(gaps).toContain("revenue");
    expect(gaps).toHaveLength(16);
    expect(hasDataGaps(blankTarget("x"))).toBe(true);
  });

  it("treats a partially filled target as having gaps", () => {
    const t = { ...sampleTargets[0], rating: undefined, channelMix: undefined };
    expect(dataGaps(t)).toEqual(["channel mix", "rating"]);
  });
});
