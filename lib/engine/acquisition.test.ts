import { describe, expect, it } from "vitest";
import { benchmarks } from "@/data/benchmarks";
import { sampleAcquirer, sampleTargets } from "@/data/sample";
import { blankTarget, type Target } from "@/lib/types";
import { ACQUISITION_DEFAULT_WEIGHTS, acquisitionLens, normaliseWeights, scoreTargets } from "./index";

const ctx = { acquirer: sampleAcquirer, weights: ACQUISITION_DEFAULT_WEIGHTS, benchmarks };
const score = (t: Target, weights = ACQUISITION_DEFAULT_WEIGHTS) => acquisitionLens.scoreTarget(t, { ...ctx, weights });
const byId = (id: string) => sampleTargets.find((t) => t.id === id)!;

describe("acquisition lens on complete data", () => {
  it("scores every full sample target with 3 reasons and 3-5 diligence questions", () => {
    for (const t of sampleTargets) {
      const s = score(t);
      expect(s.score, t.name).not.toBeNull();
      expect(s.score!).toBeGreaterThanOrEqual(0);
      expect(s.score!).toBeLessThanOrEqual(100);
      expect(s.reasons, t.name).toHaveLength(3);
      expect(s.diligence.length, t.name).toBeGreaterThanOrEqual(3);
      expect(s.diligence.length, t.name).toBeLessThanOrEqual(5);
      for (const r of s.reasons) expect(r.text.length).toBeGreaterThan(10);
    }
  });

  it("ranks the strong burger brand above the declining franchise", () => {
    expect(score(byId("t_smashed")).score!).toBeGreaterThan(score(byId("t_grillhouse")).score!);
    expect(score(byId("t_grillhouse")).score!).toBeLessThan(acquisitionLens.verdictRules.passBelow);
  });

  it("reports full completeness and the weights it applied", () => {
    const s = score(byId("t_smashed"));
    expect(s.completeness).toBe(100);
    expect(s.missingFields).toEqual([]);
    expect(Object.values(s.appliedWeights).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 0);
    expect(s.assumptions.join(" ")).toMatch(/EV\/EBITDA 6x/);
    expect(s.components.find((c) => c.id === "brand")?.judgement).toBe(true);
  });
});

describe("missing data is never scored as zero", () => {
  const full = byId("t_smashed");

  it("drops a component with no data and rescales the other weights", () => {
    const noUe: Target = { ...full, foodCostPct: undefined, labourCostPct: undefined };
    const s = score(noUe);
    const ue = s.components.find((c) => c.id === "unitEconomics")!;
    expect(ue.score).toBeNull();
    expect(s.appliedWeights.unitEconomics).toBeUndefined();
    // Manual recomputation over the five remaining components
    const rest = s.components.filter((c) => c.score !== null);
    const manual = Math.round(rest.reduce((a, c) => a + c.score! * c.weight, 0) / rest.reduce((a, c) => a + c.weight, 0));
    expect(s.score).toBe(manual);
    expect(s.completeness).toBe(Math.round((14 / 16) * 100));
    expect(s.missingFields).toEqual(["food cost", "labour cost"]);
  });

  it("gives a higher score than if the missing fields were treated as zero", () => {
    const noUe: Target = { ...full, foodCostPct: undefined, labourCostPct: undefined };
    const worstUe: Target = { ...full, foodCostPct: 60, labourCostPct: 60 };
    expect(score(noUe).score!).toBeGreaterThan(score(worstUe).score!);
  });

  it("scores the half-present component on the data it has", () => {
    const halfUe: Target = { ...full, labourCostPct: undefined };
    const ue = score(halfUe).components.find((c) => c.id === "unitEconomics")!;
    expect(ue.score).toBe(ue.signals.find((x) => x.id === "foodCost")!.score);
  });

  it("turns missing fields into diligence questions", () => {
    const s = score({ ...full, leaseYearsRemaining: undefined });
    expect(s.diligence.some((q) => q.source === "missing_field" && q.text.includes("lease length"))).toBe(true);
    expect(s.missingFields).toEqual(["lease length"]);
  });

  it("returns no score for a blank target, but still asks questions", () => {
    const s = score(blankTarget("x"));
    expect(s.score).toBeNull();
    expect(s.completeness).toBe(0);
    expect(s.missingFields).toHaveLength(16);
    expect(s.diligence).toHaveLength(5);
    expect(s.diligence.every((q) => q.source === "missing_field")).toBe(true);
    expect(s.reasons[0].text).toMatch(/Only 0% of the data is present/);
  });

  it("the three incomplete sample targets show reduced completeness", () => {
    for (const id of ["t_tandoor", "t_olivethyme", "t_northernfry"]) {
      const s = score(byId(id));
      expect(s.completeness).toBe(Math.round((14 / 16) * 100));
      expect(s.score).not.toBeNull();
    }
  });
});

describe("edge cases", () => {
  const full = byId("t_smashed");

  it("zero EBITDA: price cannot be anchored and scores the floor", () => {
    const s = score({ ...full, ebitdaMarginPct: 0 });
    const price = s.components.find((c) => c.id === "price")!;
    expect(price.score).toBe(benchmarks.priceScoreNoEarnings);
    expect(price.signals[0].text).toMatch(/zero EBITDA/);
    expect(s.diligence.some((q) => q.text.includes("not supported by earnings"))).toBe(true);
  });

  it("negative EBITDA: still scored, flagged in reasons", () => {
    const s = score({ ...full, ebitdaMarginPct: -4 });
    expect(s.score).not.toBeNull();
    expect(s.components.find((c) => c.id === "price")!.signals[0].text).toMatch(/negative EBITDA/);
    expect(s.components.find((c) => c.id === "financial")!.signals.find((x) => x.id === "margin")!.score).toBe(0);
    expect(s.reasons.some((r) => r.direction === "negative")).toBe(true);
  });

  it("expired lease scores zero on lease length and leads diligence", () => {
    const s = score({ ...full, leaseYearsRemaining: 0 });
    const lease = s.components.find((c) => c.id === "lease")!;
    expect(lease.signals.find((x) => x.id === "leaseYears")!.score).toBe(0);
    expect(lease.signals.find((x) => x.id === "leaseYears")!.text).toMatch(/expired/);
    expect(s.diligence[0].text).toMatch(/expired or is holding over/);
  });

  it("break clause takes points off lease security", () => {
    const withBreak = score({ ...full, hasBreakClause: true }).components.find((c) => c.id === "lease")!;
    const without = score({ ...full, hasBreakClause: false }).components.find((c) => c.id === "lease")!;
    expect(withBreak.score!).toBe(without.score! - benchmarks.breakClausePenalty);
    expect(withBreak.notes[0]).toMatch(/Break clause/);
  });

  it("flags a P&L that does not add up", () => {
    const s = score({ ...full, foodCostPct: 40, labourCostPct: 40, rentPctRevenue: 15, ebitdaMarginPct: 15 });
    const ue = s.components.find((c) => c.id === "unitEconomics")!;
    expect(ue.notes[0]).toMatch(/does not add up/);
    expect(s.diligence.some((q) => q.source === "consistency")).toBe(true);
  });

  it("flags a wide site-rating spread and platform concentration", () => {
    const s = score({ ...full, siteRatingMin: 3.8, siteRatingMax: 4.6, aggregatorSplit: { uber: 85, deliveroo: 10, justEat: 5 } });
    const del = s.components.find((c) => c.id === "delivery")!;
    expect(del.signals.find((x) => x.id === "ratingSpread")!.text).toMatch(/inconsistent operations/);
    expect(del.signals.find((x) => x.id === "platformConcentration")!.text).toMatch(/85% of delivery goes through Uber Eats/);
  });
});

describe("weights", () => {
  it("raising the price weight lowers an expensive target's score", () => {
    const chop = byId("t_choproom"); // 7.9x EBITDA
    const base = score(chop).score!;
    const priceHeavy = score(chop, { ...ACQUISITION_DEFAULT_WEIGHTS, price: 60 }).score!;
    expect(priceHeavy).toBeLessThan(base);
  });

  it("a zero-weight component is ignored", () => {
    const s = score(byId("t_smashed"), { ...ACQUISITION_DEFAULT_WEIGHTS, brand: 0 });
    expect(s.appliedWeights.brand).toBeUndefined();
  });

  it("normaliseWeights fills gaps and clamps negatives", () => {
    expect(normaliseWeights(acquisitionLens, { price: -5 }).price).toBe(0);
    expect(normaliseWeights(acquisitionLens, null)).toEqual(ACQUISITION_DEFAULT_WEIGHTS);
  });

  it("scoreTargets is pure and keeps order", () => {
    const a = scoreTargets(acquisitionLens, sampleTargets, sampleAcquirer);
    const b = scoreTargets(acquisitionLens, sampleTargets, sampleAcquirer);
    expect(a).toEqual(b);
    expect(a.map((s) => s.targetId)).toEqual(sampleTargets.map((t) => t.id));
  });
});
