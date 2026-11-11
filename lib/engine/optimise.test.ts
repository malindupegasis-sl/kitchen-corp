import { describe, expect, it } from "vitest";
import { sampleAcquirer, sampleTargets } from "@/data/sample";
import { acquisitionLens, scoreTargets } from "./index";
import { evaluateBasket, optimise, scheduleByYear } from "./optimise";
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
