import { describe, expect, it } from "vitest";
import { sampleAcquirer, sampleTargets } from "@/data/sample";
import { acquirerHeadline, pipelineHeadline, pipelineSubtitle, targetFit, targetsExhibitTitle } from "./headline";
import { blankTarget } from "./types";

describe("targetFit", () => {
  const smashed = sampleTargets.find((t) => t.id === "t_smashed")!; // Manchester, £4.0m
  const siam = sampleTargets.find((t) => t.id === "t_siam")!; // Birmingham, £5.2m

  it("checks price against capital and zones against strategy", () => {
    expect(targetFit(sampleAcquirer, smashed)).toEqual({ withinCapital: true, zoneFit: false, fits: false });
    expect(targetFit({ ...sampleAcquirer, strategy: "densify" }, smashed)).toEqual({ withinCapital: true, zoneFit: true, fits: true });
    expect(targetFit(sampleAcquirer, siam)).toEqual({ withinCapital: false, zoneFit: true, fits: false });
  });

  it("treats a zero asking price as not priced", () => {
    expect(targetFit(sampleAcquirer, blankTarget("x")).withinCapital).toBe(false);
  });
});

describe("headlines", () => {
  it("states the pipeline conclusion from the data", () => {
    expect(pipelineHeadline(sampleAcquirer, sampleTargets)).toBe("15 of 20 targets fit your £5m and new zones");
    expect(pipelineHeadline({ ...sampleAcquirer, strategy: "densify" }, sampleTargets)).toBe("8 of 20 targets fit your £5m and your zones");
    expect(pipelineHeadline(sampleAcquirer, [])).toBe("Add targets to start building a pipeline");
    expect(pipelineHeadline({ ...sampleAcquirer, capital: 0 }, sampleTargets)).toBe("16 of 20 targets fit new zones; add capital to check price");
  });

  it("describes flags in the subtitle", () => {
    expect(pipelineSubtitle(sampleTargets)).toBe("7 carry a rent or lease flag. Click any cell to edit; edits save to this browser.");
    expect(pipelineSubtitle([blankTarget("x")])).toMatch(/^None carries/);
  });

  it("summarises the acquirer", () => {
    expect(acquirerHeadline(sampleAcquirer)).toBe("Northside Burger Co: 12 sites, £18m annual revenue, £5m to deploy");
    expect(acquirerHeadline({ ...sampleAcquirer, mode: "pe" })).toBe("Northside Burger Co: 12 sites, £18m annual revenue, £5m equity over 5 years");
    expect(acquirerHeadline({ ...sampleAcquirer, name: " " })).toMatch(/^Your business:/);
  });

  it("writes the targets exhibit takeaway", () => {
    expect(targetsExhibitTitle(sampleAcquirer, sampleTargets)).toBe("7 of 20 targets carry a rent or lease flag; 19 are priced within your £5m");
    expect(targetsExhibitTitle(sampleAcquirer, [])).toBe("No targets in the pipeline yet");
    expect(targetsExhibitTitle(sampleAcquirer, [{ ...blankTarget("x"), askingPrice: 1 }])).toBe("No target carries a rent or lease flag; 1 is priced within your £5m");
  });
});
