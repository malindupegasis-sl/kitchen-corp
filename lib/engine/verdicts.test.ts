import { describe, expect, it } from "vitest";
import { sampleAcquirer, sampleTargets } from "@/data/sample";
import { blankTarget, type AcquirerProfile, type Target } from "@/lib/types";
import { acquisitionLens, scoreTargets } from "./index";
import { joinNames, runVerdicts } from "./verdicts";

function run(acquirer: AcquirerProfile = sampleAcquirer, targets: Target[] = sampleTargets) {
  const scores = scoreTargets(acquisitionLens, targets, acquirer);
  return runVerdicts({ targets, acquirer, scores, passBelow: acquisitionLens.verdictRules.passBelow });
}
const find = (vr: ReturnType<typeof run>, id: string) => vr.verdicts.find((v) => v.targetId === id)!;

describe("Phase 3 done-when", () => {
  it("a strong burger target overlapping the acquirer's zones is HOLD when expanding and PURSUE when densifying", () => {
    const expand = run({ ...sampleAcquirer, strategy: "expand" });
    const smashedExpand = find(expand, "t_smashed");
    expect(smashedExpand.standalone!).toBeGreaterThanOrEqual(60);
    expect(smashedExpand.verdict).toBe("HOLD");
    expect(smashedExpand.whatWouldChange.join(" ")).toMatch(/Would be PURSUE under a densify strategy/);

    const densify = run({ ...sampleAcquirer, strategy: "densify" });
    const smashedDensify = find(densify, "t_smashed");
    expect(smashedDensify.verdict).toBe("PURSUE");
    expect(smashedDensify.year).toBe(1);
    expect(smashedDensify.whatWouldChange.join(" ")).toMatch(/Watch the overlap/);
  });
});

describe("verdict rules", () => {
  const vr = run();

  it("PURSUE is exactly the optimiser's set, PASS is below the line, HOLD is the rest", () => {
    expect(vr.verdicts.filter((v) => v.verdict === "PURSUE").map((v) => v.targetId).sort()).toEqual([...vr.result.selected].sort());
    for (const v of vr.verdicts) {
      if (v.verdict === "PASS") expect(v.standalone!).toBeLessThan(60);
      if (v.verdict === "HOLD") {
        expect(v.blocker).toBeDefined();
        expect(v.standalone === null || v.standalone >= 60).toBe(true);
      }
    }
    expect(vr.counts.PURSUE + vr.counts.HOLD + vr.counts.PASS).toBe(20);
    expect(vr.verdicts.map((v) => v.rank)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it("every verdict says why and what would change it, with diligence questions", () => {
    for (const v of vr.verdicts) {
      expect(v.headline.length).toBeGreaterThan(10);
      expect(v.whatWouldChange.length).toBeGreaterThan(0);
      expect(v.reasons).toHaveLength(3);
      expect(v.diligence.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("HOLD on budget explains who outcompeted it and what forcing it in would cost", () => {
    const smashed = find(vr, "t_smashed");
    expect(smashed.blocker).toBe("budget");
    expect(smashed.headline).toMatch(/Outcompeted for the £5m budget/);
    expect(smashed.whatWouldChange.join(" ")).toMatch(/Forcing it in would displace .* and change the set's annual value by -£/);
  });

  it("PASS explains the line and which component to lift", () => {
    const fry = find(vr, "t_northernfry"); // 57
    expect(fry.verdict).toBe("PASS");
    expect(fry.whatWouldChange[0]).toMatch(/Standalone score 57 is below the 60 line/);
    expect(fry.whatWouldChange[1]).toMatch(/weakest component is .*; at 70 the score would be about \d+/);
  });

  it("a target with no data is HOLD for data", () => {
    const v = find(run(sampleAcquirer, [...sampleTargets, blankTarget("blank")]), "blank");
    expect(v.verdict).toBe("HOLD");
    expect(v.blocker).toBe("data");
    expect(v.whatWouldChange[0]).toMatch(/^Provide /);
  });

  it("flags capacity when money is not the constraint", () => {
    const tight = run({ ...sampleAcquirer, capital: 60_000_000, integrationCapacityPerYear: 1 });
    expect(tight.result.totalLoad).toBeLessThanOrEqual(3);
    expect(tight.verdicts.some((v) => v.verdict === "HOLD" && v.blocker === "capacity")).toBe(true);
  });

  it("flags overlap when a target fits but hurts the set", () => {
    const burgerClone: Target = {
      ...sampleTargets.find((t) => t.id === "t_smashed")!,
      id: "clone",
      name: "Burger Clone",
      revenue: 200_000,
      ebitdaMarginPct: 10,
      askingPrice: 50_000,
      integrationLoad: 1,
      overheadCost: 0,
    };
    const vr2 = run({ ...sampleAcquirer, strategy: "densify" }, [...sampleTargets, burgerClone]);
    const v = find(vr2, "clone");
    expect(v.standalone!).toBeGreaterThanOrEqual(60);
    expect(v.verdict).toBe("HOLD");
    expect(v.blocker).toBe("overlap");
    expect(v.headline).toMatch(/changes the set's annual value by -£/);
  });

  it("summary figures add up", () => {
    const selected = sampleTargets.filter((t) => vr.result.selected.includes(t.id));
    expect(vr.revenueAdded).toBe(selected.reduce((s, t) => s + t.revenue, 0));
    expect(vr.capitalUsed).toBe(selected.reduce((s, t) => s + t.askingPrice, 0));
    expect(vr.ebitdaAdded).toBeGreaterThan(vr.result.effectTotal);
  });

  it("joins names in prose", () => {
    expect(joinNames([])).toBe("");
    expect(joinNames(["A"])).toBe("A");
    expect(joinNames(["A", "B"])).toBe("A and B");
    expect(joinNames(["A", "B", "C"])).toBe("A, B and C");
  });
});
