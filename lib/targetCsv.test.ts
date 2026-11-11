import { describe, expect, it } from "vitest";
import { sampleTargets } from "@/data/sample";
import { escapeCsvCell } from "./csv";
import {
  TARGET_CSV_HEADERS,
  csvTemplate,
  parseTargetsCsv,
  targetsToCsv,
} from "./targetCsv";

const header = TARGET_CSV_HEADERS.join(",");

function rowWith(overrides: Record<string, string>): string {
  const base: Record<string, string> = {
    name: "Test Co",
    type: "single_site",
    cuisine: "pizza",
    sites: "1",
    zones: "Leeds",
    revenue: "1000000",
    askingPrice: "800000",
  };
  const merged = { ...base, ...overrides };
  return TARGET_CSV_HEADERS.map((h) => escapeCsvCell(merged[h] ?? "")).join(",");
}

describe("csvTemplate", () => {
  it("has headers plus one example row that imports cleanly", () => {
    const text = csvTemplate();
    expect(text.split("\r\n").filter(Boolean)).toHaveLength(2);
    const result = parseTargetsCsv(text);
    expect(result.errors).toEqual([]);
    expect(result.targets).toHaveLength(1);
    expect(result.targets[0].name).toBe("Example Pizza Co");
    expect(result.targets[0].zones).toEqual(["Leeds", "York"]);
    expect(result.targets[0].id).toMatch(/^t_/);
  });
});

describe("targetsToCsv / parseTargetsCsv round trip", () => {
  it("re-imports the sample targets unchanged", () => {
    const result = parseTargetsCsv(targetsToCsv(sampleTargets));
    expect(result.errors).toEqual([]);
    expect(result.targets).toEqual(sampleTargets);
  });
});

describe("parseTargetsCsv validation", () => {
  it("reports an empty file", () => {
    expect(parseTargetsCsv("").errors[0].message).toMatch(/empty/i);
  });

  it("reports missing required columns", () => {
    const r = parseTargetsCsv("name,cuisine\nA,pizza\n");
    expect(r.targets).toHaveLength(0);
    expect(r.errors[0].row).toBe(1);
    expect(r.errors[0].message).toMatch(/Missing required columns: type, sites, zones, revenue, askingPrice/);
  });

  it("reports a missing required value with the row number", () => {
    const r = parseTargetsCsv([header, rowWith({ name: "" })].join("\n"));
    expect(r.targets).toHaveLength(0);
    expect(r.errors).toEqual([
      { row: 2, column: "name", message: "name is required (target name)." },
    ]);
  });

  it("reports bad numbers, bad enums and out-of-range values", () => {
    const r = parseTargetsCsv(
      [
        header,
        rowWith({ revenue: "lots" }),
        rowWith({ type: "chain" }),
        rowWith({ rating: "6" }),
        rowWith({ brandScore: "2.5" }),
      ].join("\n"),
    );
    expect(r.targets).toHaveLength(0);
    expect(r.errors.map((e) => [e.row, e.column, e.message])).toEqual([
      [2, "revenue", 'revenue must be a number (got "lots").'],
      [3, "type", 'type must be one of restaurant_group, single_site, franchise (got "chain").'],
      [4, "rating", "rating must be at most 5 (got 6)."],
      [5, "brandScore", 'brandScore must be a whole number (got "2.5").'],
    ]);
  });

  it("checks channel mix sums to 100", () => {
    const r = parseTargetsCsv(
      [header, rowWith({ dineInPct: "50", deliveryPct: "30", takeawayPct: "10" })].join("\n"),
    );
    expect(r.errors).toEqual([
      { row: 2, message: "Channel mix must sum to 100% (dine-in + delivery + takeaway = 90%)." },
    ]);
  });

  it("checks partial channel mix and rating order", () => {
    const r = parseTargetsCsv(
      [header, rowWith({ dineInPct: "50", siteRatingMin: "4.5", siteRatingMax: "4.0" })].join("\n"),
    );
    expect(r.errors.map((e) => e.message)).toEqual([
      "dineInPct, deliveryPct and takeawayPct must all be given or all be blank.",
      "siteRatingMin (4.5) cannot be higher than siteRatingMax (4).",
    ]);
  });

  it("imports good rows and reports bad ones in the same file", () => {
    const r = parseTargetsCsv(
      [header, rowWith({ name: "Good" }), rowWith({ name: "Bad", sites: "0" }), rowWith({ name: "Also good" })].join("\n"),
    );
    expect(r.rowCount).toBe(3);
    expect(r.targets.map((t) => t.name)).toEqual(["Good", "Also good"]);
    expect(r.errors).toEqual([{ row: 3, column: "sites", message: "sites must be at least 1 (got 0)." }]);
  });

  it("accepts friendly values: £ and commas in money, yes/no, mixed-case enums", () => {
    const r = parseTargetsCsv(
      [header, rowWith({ revenue: "£1,200,000", type: "Restaurant Group", hasBreakClause: "Yes", locationType: "High-Street" })].join("\n"),
    );
    expect(r.errors).toEqual([]);
    const t = r.targets[0];
    expect(t.revenue).toBe(1_200_000);
    expect(t.type).toBe("restaurant_group");
    expect(t.hasBreakClause).toBe(true);
    expect(t.locationType).toBe("high_street");
    expect(t.integrationLoad).toBe(3); // default by type
  });

  it("ignores unknown columns and matches headers case-insensitively", () => {
    const r = parseTargetsCsv("Name,TYPE,cuisine,sites,zones,revenue,askingPrice,extra\nA,single_site,thai,1,Leeds,1,1,ignored\n");
    expect(r.errors).toEqual([]);
    expect(r.targets[0].name).toBe("A");
  });
});
