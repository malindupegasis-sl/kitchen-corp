import { describe, expect, it } from "vitest";
import { sampleTargets } from "@/data/sample";
import { dataGaps, hasDataGaps } from "./gaps";
import { blankTarget } from "./types";

describe("dataGaps", () => {
  it("finds gaps only in the three deliberately incomplete sample targets", () => {
    const names = sampleTargets.filter((t) => dataGaps(t).length > 0).map((t) => t.name).sort();
    expect(names).toEqual(["Northern Fry Co", "Olive & Thyme", "Tandoor Lane"]);
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
    expect(dataGaps(t)).toEqual(["channel mix", "customer rating"]);
  });
});
