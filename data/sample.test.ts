import { describe, expect, it } from "vitest";
import { pipelineFlags } from "@/lib/flags";
import { dataGaps } from "@/lib/gaps";
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
      if (t.channelMix) expect(t.channelMix.dineIn + t.channelMix.delivery + t.channelMix.takeaway, t.name).toBe(100);
      if (t.aggregatorSplit) expect(t.aggregatorSplit.uber + t.aggregatorSplit.deliveroo + t.aggregatorSplit.justEat, t.name).toBe(100);
      if (t.siteRatingMin !== undefined && t.siteRatingMax !== undefined) expect(t.siteRatingMin).toBeLessThanOrEqual(t.siteRatingMax);
    }
  });

  it("has exactly 3 targets with realistic missing fields", () => {
    const withGaps = sampleTargets.filter((t) => dataGaps(t).length > 0);
    expect(withGaps.map((t) => t.name).sort()).toEqual(["Northern Fry Co", "Olive & Thyme", "Tandoor Lane"]);
    expect(dataGaps(withGaps.find((t) => t.name === "Tandoor Lane")!)).toEqual(["food cost", "labour cost"]);
    expect(dataGaps(withGaps.find((t) => t.name === "Olive & Thyme")!)).toEqual(["lease length", "overhead cost"]);
    expect(dataGaps(withGaps.find((t) => t.name === "Northern Fry Co")!)).toEqual(["aggregator split", "site rating range"]);
  });

  it("has at least 2 same-cuisine clusters of 2-3 targets outside the acquirer's cuisines", () => {
    const counts = new Map<string, number>();
    for (const t of sampleTargets) counts.set(t.cuisine, (counts.get(t.cuisine) ?? 0) + 1);
    const clusters = [...counts.entries()].filter(([c, n]) => !sampleAcquirer.cuisines.includes(c) && n >= 2 && n <= 3);
    expect(clusters.length).toBeGreaterThanOrEqual(2);
    expect(Object.fromEntries(clusters)).toEqual({ pizza: 3, japanese: 2 });
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
