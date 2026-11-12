import { describe, expect, it } from "vitest";
import { sampleAcquirer, sampleTargets } from "@/data/sample";
import { acquisitionLens, scoreTargets } from "./index";
import { evaluateBasket, isWithinAnnualCapacity, optimise, planIntegrationLoad, scheduleByYear } from "./optimise";
import type { AcquirerProfile, Target } from "@/lib/types";

const byId = (id: string) => sampleTargets.find((t) => t.id === id)!;
function run(acquirer: AcquirerProfile = sampleAcquirer, targets: Target[] = sampleTargets, extra: Partial<Parameters<typeof optimise>[0]> = {}) {
  const scores = scoreTargets(acquisitionLens, targets, acquirer);
  return optimise({ targets, acquirer, scores, passBelow: 60, ...extra });
}

describe("scheduleByYear", () => {
  it("treats capacity as throughput over the horizon", () => {
    expect(scheduleByYear([{ id: "a", load: 3 }, { id: "b", load: 1 }], 2, 3)).toEqual([["a"], ["b"], []]);
    expect(scheduleByYear([{ id: "a", load: 3 }, { id: "b", load: 3 }, { id: "c", load: 1 }], 2, 3)).toBeNull();
    expect(scheduleByYear([{ id: "a", load: 2 }, { id: "b", load: 2 }, { id: "c", load: 2 }], 2, 3)).toEqual([["a"], ["b"], ["c"]]);
    expect(scheduleByYear([], 2, 3)).toEqual([[], [], []]);
  });
});

describe("annual integration capacity", () => {
  it("(a) rejects a plan that front-loads more than the annual capacity into Year 1", () => {
    // Two group deals both landing in Year 1: 6 units against a capacity of 2.
    const frontLoaded = [
      { id: "a", year: 0, load: 3 },
      { id: "b", year: 0, load: 3 },
    ];
    expect(isWithinAnnualCapacity(frontLoaded, 2, 3)).toBe(false);
    // Even a single deal: 3 units in Year 1 breaks a capacity of 2.
    expect(isWithinAnnualCapacity([{ id: "a", year: 0, load: 3 }], 2, 3)).toBe(false);
    // The same 6 units spread 2-2-2 is fine.
    expect(isWithinAnnualCapacity([{ id: "a", year: 0, load: 2 }, { id: "a", year: 1, load: 1 }, { id: "b", year: 1, load: 1 }, { id: "b", year: 2, load: 2 }], 2, 3)).toBe(true);
  });

  it("(b) a load-3 group deal is feasible: 2 units in Year 1, 1 in Year 2", () => {
    const plan = planIntegrationLoad([{ id: "group", load: 3 }], 2, 3)!;
    expect(plan).not.toBeNull();
    expect(plan.allocations).toEqual([
      { id: "group", year: 0, load: 2 },
      { id: "group", year: 1, load: 1 },
    ]);
    expect(plan.yearLoads).toEqual([2, 1, 0]);
    expect(plan.byStartYear).toEqual([["group"], [], []]);
  });

  it("spreads several deals without any year going over, and refuses what will not fit", () => {
    const plan = planIntegrationLoad([{ id: "a", load: 3 }, { id: "b", load: 1 }, { id: "c", load: 2 }], 2, 3)!;
    expect(plan.yearLoads).toEqual([2, 2, 2]);
    expect(plan.byStartYear).toEqual([["a"], ["b"], ["c"]]);
    expect(planIntegrationLoad([{ id: "a", load: 3 }, { id: "b", load: 3 }, { id: "c", load: 1 }], 2, 3)).toBeNull();
    expect(planIntegrationLoad([{ id: "a", load: 1 }], 0, 3)).toBeNull();
  });

  it("the optimiser never puts more than the annual capacity into any year", () => {
    for (const cap of [1, 2, 3, 4]) {
      for (const strategy of ["expand", "densify"] as const) {
        const r = run({ ...sampleAcquirer, strategy, capital: 60_000_000, integrationCapacityPerYear: cap });
        expect(r.yearLoads).toHaveLength(3);
        for (const l of r.yearLoads) expect(l).toBeLessThanOrEqual(cap + 1e-9);
        expect(isWithinAnnualCapacity(r.loadAllocations, cap, 3)).toBe(true);
        expect(r.yearLoads.reduce((a, b) => a + b, 0)).toBeCloseTo(r.totalLoad, 9);
      }
    }
  });

  it("the sample densify set spreads Smashed MCR's load-3 deal across two years", () => {
    const r = run({ ...sampleAcquirer, strategy: "densify" });
    expect(r.selected).toContain("t_smashed");
    const smashed = r.loadAllocations.filter((a) => a.id === "t_smashed");
    expect(smashed).toEqual([
      { id: "t_smashed", year: 0, load: 2 },
      { id: "t_smashed", year: 1, load: 1 },
    ]);
    expect(Math.max(...r.yearLoads)).toBeLessThanOrEqual(2);
  });
});

describe("optimise", () => {
  it("respects the budget at every capital level", () => {
    for (const capital of [500_000, 1_000_000, 3_000_000, 5_000_000, 10_000_000, 60_000_000]) {
      const r = run({ ...sampleAcquirer, capital });
      expect(r.capitalUsed).toBeLessThanOrEqual(capital);
      expect(r.feasible).toBe(true);
    }
  });

  it("respects integration capacity over the 3-year horizon", () => {
    for (const cap of [1, 2, 4]) {
      const r = run({ ...sampleAcquirer, capital: 60_000_000, integrationCapacityPerYear: cap });
      expect(r.totalLoad).toBeLessThanOrEqual(cap * 3);
      expect(r.schedule).toHaveLength(3);
      expect(r.schedule.flat().sort()).toEqual([...r.selected].sort());
    }
  });

  it("only considers targets at or above the pass line", () => {
    const r = run();
    const scores = scoreTargets(acquisitionLens, sampleTargets, sampleAcquirer);
    for (const id of r.candidates) expect(scores.find((s) => s.targetId === id)!.score!).toBeGreaterThanOrEqual(60);
    expect(r.candidates).toHaveLength(10);
  });

  it("overlap lowers a basket's value", () => {
    const acquirer = { ...sampleAcquirer, cuisines: ["wings"] }; // keep the acquirer out of it
    const scores = new Map(scoreTargets(acquisitionLens, sampleTargets, acquirer).map((s) => [s.targetId, s]));
    const a = byId("t_bunpatty"); // burgers, Leeds + Sheffield
    const overlap: Target = { ...byId("t_smashed"), id: "x", zones: ["Leeds"] };
    const apart: Target = { ...byId("t_smashed"), id: "x", zones: ["Bristol"] };
    scores.set("x", scores.get("t_smashed")!);
    expect(evaluateBasket([a, overlap], acquirer, scores).value).toBeLessThan(evaluateBasket([a, apart], acquirer, scores).value);
  });

  it("densify and expand pick different sets", () => {
    const expand = run({ ...sampleAcquirer, strategy: "expand" });
    const densify = run({ ...sampleAcquirer, strategy: "densify" });
    expect(expand.selected).not.toEqual(densify.selected);
    expect(densify.selected).toContain("t_smashed");
    expect(expand.selected).not.toContain("t_smashed");
  });

  it("honours forceInclude and exclude", () => {
    expect(run(sampleAcquirer, sampleTargets, { forceInclude: ["t_smashed"] }).selected).toContain("t_smashed");
    expect(run(sampleAcquirer, sampleTargets, { exclude: ["t_bunpatty"] }).selected).not.toContain("t_bunpatty");
    const tooBig = run(sampleAcquirer, sampleTargets, { forceInclude: ["t_siam"] }); // £5.2m > £5m
    expect(tooBig.feasible).toBe(false);
  });

  it("matches a brute-force search on a small case", () => {
    const targets = sampleTargets.slice(0, 8);
    const scores = scoreTargets(acquisitionLens, targets, sampleAcquirer);
    const r = optimise({ targets, acquirer: sampleAcquirer, scores, passBelow: 0 });
    const sm = new Map(scores.map((s) => [s.targetId, s]));
    let best = -Infinity;
    for (let mask = 1; mask < 1 << targets.length; mask++) {
      const basket = targets.filter((_, i) => mask & (1 << i));
      const price = basket.reduce((s, t) => s + t.askingPrice, 0);
      const load = basket.reduce((s, t) => s + t.integrationLoad, 0);
      if (price > sampleAcquirer.capital || load > sampleAcquirer.integrationCapacityPerYear * 3) continue;
      best = Math.max(best, evaluateBasket(basket, sampleAcquirer, sm).value);
    }
    expect(r.value).toBeCloseTo(best, 3);
    expect(r.method).toBe("exhaustive");
  });

  it("falls back to greedy local search above 20 candidates and still respects constraints", () => {
    const many: Target[] = Array.from({ length: 26 }, (_, i) => ({
      ...byId(["t_bao", "t_dough", "t_bunpatty", "t_umami"][i % 4]),
      id: `m${i}`,
      name: `M${i}`,
      zones: [`Zone ${i}`],
    }));
    const acquirer = { ...sampleAcquirer, capital: 12_000_000, integrationCapacityPerYear: 4 };
    const r = run(acquirer, many);
    expect(r.method).toBe("greedy");
    expect(r.capitalUsed).toBeLessThanOrEqual(acquirer.capital);
    expect(r.totalLoad).toBeLessThanOrEqual(12);
    expect(r.selected.length).toBeGreaterThan(1);
  });
});
