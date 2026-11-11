import { describe, expect, it } from "vitest";
import { sampleAcquirer, sampleTargets } from "@/data/sample";
import { acquisitionLens, scoreTargets } from "./engine";
import { acquirerHeadline, pipelineHeadline, pipelineSubtitle, scoredExhibitTitle, targetsExhibitTitle } from "./headline";
import { blankTarget } from "./types";

describe("pipelineHeadline", () => {
  it("counts risk flags and data gaps, nothing else", () => {
    expect(pipelineHeadline(sampleTargets)).toBe("7 of 20 targets carry a rent or lease flag; 3 have data gaps");
    expect(pipelineHeadline([])).toBe("No targets yet: add one or import a CSV");
    expect(pipelineHeadline([blankTarget("x")])).toBe("None of 1 target carries a rent or lease flag; 1 has data gaps");
    expect(pipelineHeadline([...sampleTargets, blankTarget("x"), blankTarget("y")])).toBe("7 of 22 targets carry a rent or lease flag; 5 have data gaps");
    expect(pipelineHeadline([sampleTargets.find((t) => t.id === "t_siam")!])).toBe("1 of 1 target carries a rent or lease flag; none has data gaps");
  });

  it("never claims fit or scores before the engine has run", () => {
    const titles = [pipelineHeadline(sampleTargets), targetsExhibitTitle(sampleAcquirer, sampleTargets), acquirerHeadline(sampleAcquirer)];
    for (const t of titles) expect(t).not.toMatch(/\b(fit|fits|best|score|verdict|pursue|hold|pass)\b/i);
  });
});

describe("other titles", () => {
  it("writes the subtitle", () => {
    expect(pipelineSubtitle([])).toMatch(/^Add a target/);
    expect(pipelineSubtitle(sampleTargets)).toMatch(/^Flags and gaps are counted/);
  });

  it("summarises the acquirer from its profile", () => {
    expect(acquirerHeadline(sampleAcquirer)).toBe("Northside Burger Co: 12 sites, £18m annual revenue, £5m to deploy");
    expect(acquirerHeadline({ ...sampleAcquirer, mode: "pe" })).toBe("Northside Burger Co: 12 sites, £18m annual revenue, £5m equity over 5 years");
    expect(acquirerHeadline({ ...sampleAcquirer, name: " " })).toMatch(/^Your business:/);
  });

  it("writes the targets exhibit takeaway from counts and sums", () => {
    expect(targetsExhibitTitle(sampleAcquirer, sampleTargets)).toBe("20 targets across 17 zones and 15 cuisines; £48m total asking against £5m capital");
    expect(targetsExhibitTitle(sampleAcquirer, [])).toBe("No targets in the pipeline yet");
  });
});

describe("scoredExhibitTitle", () => {
  it("states what the lens computed", () => {
    const scores = scoreTargets(acquisitionLens, sampleTargets, sampleAcquirer);
    const above = scores.filter((s) => (s.score ?? 0) >= 60).length;
    expect(scoredExhibitTitle(scores, 60)).toBe(`${above} of 20 targets score 60 or more on the acquisition lens; 3 are scored on partial data`);
    expect(scoredExhibitTitle([], 60)).toBe("No targets in the pipeline yet");
    const blank = scoreTargets(acquisitionLens, [blankTarget("x")], sampleAcquirer);
    expect(scoredExhibitTitle(blank, 60)).toBe("1 target but no data to score yet");
    expect(scoredExhibitTitle([...scores, ...blank], 60)).toMatch(/; 1 has no data to score$/);
  });
});
