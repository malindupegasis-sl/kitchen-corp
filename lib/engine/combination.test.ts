import { describe, expect, it } from "vitest";
import { benchmarks } from "@/data/benchmarks";
import { sampleAcquirer, sampleTargets } from "@/data/sample";
import { combinationEffects, ebitdaEstimate, sameCuisine, sharesZone } from "./combination";

const byId = (id: string) => sampleTargets.find((t) => t.id === id)!;
const kinds = (ids: string[], strategy: "expand" | "densify", targetId: string) =>
  combinationEffects(ids.map(byId), { ...sampleAcquirer, strategy }).get(targetId)!;

describe("combination effects", () => {
  it("penalises same cuisine in an overlapping zone with the acquirer, less so when densifying", () => {
    const expand = kinds(["t_smashed"], "expand", "t_smashed");
    const densify = kinds(["t_smashed"], "densify", "t_smashed");
    const cx = expand.items.find((i) => i.kind === "cannibalisation")!;
    const cd = densify.items.find((i) => i.kind === "cannibalisation")!;
    const ebitda = ebitdaEstimate(byId("t_smashed")).value;
    expect(cx.amount).toBeCloseTo(-(ebitda * benchmarks.combination.cannibalisationPct.acquirerExpand) / 100, 0);
    expect(cd.amount).toBeCloseTo(-(ebitda * benchmarks.combination.cannibalisationPct.acquirerDensify) / 100, 0);
    expect(cx.text).toMatch(/same cuisine as your burgers sites/);
  });

  it("gives zone fit for new zones when expanding and shared zones when densifying", () => {
    expect(kinds(["t_smashed"], "expand", "t_smashed").items.some((i) => i.kind === "zone_fit")).toBe(false);
    expect(kinds(["t_smashed"], "densify", "t_smashed").items.some((i) => i.kind === "zone_fit")).toBe(true);
    expect(kinds(["t_dough"], "expand", "t_dough").items.find((i) => i.kind === "zone_fit")!.text).toMatch(/opens Leeds, York/);
    expect(kinds(["t_dough"], "densify", "t_dough").items.some((i) => i.kind === "zone_fit")).toBe(false);
  });

  it("penalises two targets with the same cuisine in the same zone", () => {
    const clone = { ...byId("t_smashed"), id: "clone", name: "Clone", zones: ["Manchester"] };
    const eff = combinationEffects([byId("t_smashed"), clone], { ...sampleAcquirer, cuisines: ["wings"] });
    const c = eff.get("t_smashed")!.items.find((i) => i.kind === "cannibalisation")!;
    expect(c.amount).toBeCloseTo(-(ebitdaEstimate(byId("t_smashed")).value * benchmarks.combination.cannibalisationPct.betweenTargets) / 100, 0);
    expect(c.text).toMatch(/Clone/);
  });

  it("values a same-cuisine cluster through a central kitchen and removes the breadth bonus", () => {
    const pizza = combinationEffects([byId("t_dough"), byId("t_nonna")], sampleAcquirer);
    for (const id of ["t_dough", "t_nonna"]) {
      const items = pizza.get(id)!.items;
      expect(items.some((i) => i.kind === "central_kitchen")).toBe(true);
      expect(items.some((i) => i.kind === "cuisine_breadth")).toBe(false);
    }
    const alone = combinationEffects([byId("t_dough")], sampleAcquirer).get("t_dough")!.items;
    expect(alone.some((i) => i.kind === "central_kitchen")).toBe(false);
    expect(alone.some((i) => i.kind === "cuisine_breadth")).toBe(true);
  });

  it("procurement saving grows with basket size and uses food cost", () => {
    const one = kinds(["t_bao"], "expand", "t_bao").items.find((i) => i.kind === "procurement")!;
    const three = kinds(["t_bao", "t_dough", "t_tandoor"], "expand", "t_bao").items.find((i) => i.kind === "procurement")!;
    const food = (byId("t_bao").revenue * byId("t_bao").foodCostPct!) / 100;
    expect(one.amount).toBeCloseTo(food * 0.01, 0);
    expect(three.amount).toBeCloseTo(food * 0.02, 0);
    expect(three.text).toMatch(/2% procurement saving/);
  });

  it("shares head office and lifts low delivery share", () => {
    const fry = kinds(["t_northernfry"], "expand", "t_northernfry").items;
    expect(fry.find((i) => i.kind === "head_office")!.amount).toBeCloseTo(260_000 * 0.4, 0);
    expect(fry.some((i) => i.kind === "delivery_uplift")).toBe(true);
    expect(kinds(["t_bao"], "expand", "t_bao").items.some((i) => i.kind === "delivery_uplift")).toBe(false);
  });

  it("states assumptions when margin or food cost is missing", () => {
    const t = { ...byId("t_tandoor"), ebitdaMarginPct: undefined };
    const items = combinationEffects([t], sampleAcquirer).get(t.id)!.items;
    expect(items.find((i) => i.kind === "zone_fit")!.assumption).toMatch(/EBITDA assumed at the 12% benchmark margin/);
    expect(items.find((i) => i.kind === "procurement")!.assumption).toMatch(/food cost assumed at the 30% benchmark/);
  });

  it("helpers compare zones and cuisines case-insensitively", () => {
    expect(sharesZone(["Manchester"], ["manchester ", "Leeds"])).toBe(true);
    expect(sameCuisine("Pizza", "pizza")).toBe(true);
    expect(sameCuisine("", "")).toBe(false);
  });
});
