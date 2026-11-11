import { describe, expect, it } from "vitest";
import { pipelineFlags } from "@/lib/flags";
import { sampleAcquirer, sampleTargets } from "./sample";

describe("sample data", () => {
  it("matches the brief for the acquirer", () => {
    expect(sampleAcquirer.name).toBe("Northside Burger Co");
    expect(sampleAcquirer.sites).toBe(12);
    expect(sampleAcquirer.zones).toEqual(["Manchester", "Liverpool"]);
    expect(sampleAcquirer.revenue).toBe(18_000_000);
    expect(sampleAcquirer.capital).toBe(5_000_000);
    expect(sampleAcquirer.targetRevenue).toBe(30_000_000);
    expect(sampleAcquirer.integrationCapacityPerYear).toBe(2);
    expect(sampleAcquirer.strategy).toBe("expand");
  });

  it("has 20 targets with unique ids and consistent mixes", () => {
    expect(sampleTargets).toHaveLength(20);
    expect(new Set(sampleTargets.map((t) => t.id)).size).toBe(20);
    for (const t of sampleTargets) {
      const c = t.channelMix!;
      expect(c.dineIn + c.delivery + c.takeaway, t.name).toBe(100);
      const a = t.aggregatorSplit!;
      expect(a.uber + a.deliveroo + a.justEat, t.name).toBe(100);
      expect(t.siteRatingMin!).toBeLessThanOrEqual(t.siteRatingMax!);
    }
  });

  it("includes the deliberate overlaps and risk cases", () => {
    const burgersInAcquirerZones = sampleTargets.filter(
      (t) => t.cuisine === "burgers" && t.zones.some((z) => sampleAcquirer.zones.includes(z)),
    );
    expect(burgersInAcquirerZones.map((t) => t.name)).toEqual(["Smashed MCR"]);

    const shortLease = sampleTargets.filter((t) => pipelineFlags(t).some((f) => f.code === "short_lease"));
    const highRent = sampleTargets.filter((t) => pipelineFlags(t).some((f) => f.code === "high_rent"));
    expect(shortLease.length).toBeGreaterThanOrEqual(2);
    expect(highRent.length).toBeGreaterThanOrEqual(2);

    const ratings = sampleTargets.map((t) => t.rating!);
    expect(Math.min(...ratings)).toBeLessThan(4.2);
    expect(Math.max(...ratings)).toBeGreaterThanOrEqual(4.6);
  });
});
