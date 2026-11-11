import { parseCsv, toCsv } from "./csv";
import { newId } from "./ids";
import { parseList } from "./format";
import {
  LOCATION_TYPES,
  TARGET_TYPES,
  defaultIntegrationLoad,
  type LocationType,
  type Target,
  type TargetType,
} from "./types";

/* ------------------------------------------------------------------ */
/* Column schema: the single source of truth for CSV headers,          */
/* parsing, validation, the template and export.                       */
/* ------------------------------------------------------------------ */

type Flat = Record<string, unknown>;

interface ColumnSpec {
  key: string;
  /** Human description used in the template guidance and error messages. */
  describe: string;
  required?: boolean;
  /** Parse a trimmed non-empty cell. Throw a string message on failure. */
  parse: (raw: string) => unknown;
  /** Read the value back out of a Target for export. */
  read: (t: Target) => string;
  /** Example value for the template row. */
  example: string;
}

class CellError extends Error {}

function fail(msg: string): never {
  throw new CellError(msg);
}

const num =
  (opts: { min?: number; max?: number; integer?: boolean } = {}) =>
  (raw: string): number => {
    const cleaned = raw.replace(/[£,%\s]/g, "");
    const n = Number(cleaned);
    if (cleaned === "" || !Number.isFinite(n)) fail(`must be a number (got "${raw}")`);
    if (opts.integer && !Number.isInteger(n)) fail(`must be a whole number (got "${raw}")`);
    if (opts.min !== undefined && n < opts.min) fail(`must be at least ${opts.min} (got ${n})`);
    if (opts.max !== undefined && n > opts.max) fail(`must be at most ${opts.max} (got ${n})`);
    return n;
  };

const bool = (raw: string): boolean => {
  const v = raw.trim().toLowerCase();
  if (["yes", "y", "true", "1"].includes(v)) return true;
  if (["no", "n", "false", "0"].includes(v)) return false;
  fail(`must be yes or no (got "${raw}")`);
};

const enumOf =
  <T extends string>(options: readonly T[]) =>
  (raw: string): T => {
    const norm = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
    const hit = options.find((o) => o === norm);
    if (!hit) fail(`must be one of ${options.join(", ")} (got "${raw}")`);
    return hit;
  };

const list = (raw: string): string[] => {
  const items = parseList(raw);
  if (items.length === 0) fail("must list at least one item");
  return items;
};

const str = (raw: string): string => raw.trim();

const fmt = (v: number | undefined): string => (v === undefined ? "" : String(v));

export const TARGET_CSV_COLUMNS: readonly ColumnSpec[] = [
  { key: "id", describe: "optional id; leave blank to generate", parse: str, read: (t) => t.id, example: "" },
  { key: "name", describe: "target name", required: true, parse: str, read: (t) => t.name, example: "Example Pizza Co" },
  { key: "type", describe: "restaurant_group, single_site or franchise", required: true, parse: enumOf(TARGET_TYPES), read: (t) => t.type, example: "restaurant_group" },
  { key: "cuisine", describe: "main cuisine", required: true, parse: str, read: (t) => t.cuisine, example: "pizza" },
  { key: "sites", describe: "number of sites", required: true, parse: num({ min: 1, integer: true }), read: (t) => fmt(t.sites), example: "3" },
  { key: "zones", describe: "zones separated by ; (e.g. Leeds; York)", required: true, parse: list, read: (t) => t.zones.join("; "), example: "Leeds; York" },
  { key: "revenue", describe: "annual revenue in £", required: true, parse: num({ min: 0 }), read: (t) => fmt(t.revenue), example: "3100000" },
  { key: "growthPct", describe: "year-on-year revenue growth %", parse: num({ min: -100, max: 1000 }), read: (t) => fmt(t.growthPct), example: "18" },
  { key: "lflGrowthPct", describe: "like-for-like growth %", parse: num({ min: -100, max: 1000 }), read: (t) => fmt(t.lflGrowthPct), example: "8" },
  { key: "ebitdaMarginPct", describe: "EBITDA margin %", parse: num({ min: -100, max: 100 }), read: (t) => fmt(t.ebitdaMarginPct), example: "14" },
  { key: "foodCostPct", describe: "food cost % of revenue", parse: num({ min: 0, max: 100 }), read: (t) => fmt(t.foodCostPct), example: "27" },
  { key: "labourCostPct", describe: "labour cost % of revenue", parse: num({ min: 0, max: 100 }), read: (t) => fmt(t.labourCostPct), example: "29" },
  { key: "rentPctRevenue", describe: "rent % of revenue", parse: num({ min: 0, max: 100 }), read: (t) => fmt(t.rentPctRevenue), example: "9" },
  { key: "leaseYearsRemaining", describe: "years left on lease", parse: num({ min: 0, max: 99 }), read: (t) => fmt(t.leaseYearsRemaining), example: "9" },
  { key: "hasBreakClause", describe: "yes or no", parse: bool, read: (t) => (t.hasBreakClause ? "yes" : "no"), example: "no" },
  { key: "dineInPct", describe: "dine-in share of revenue %", parse: num({ min: 0, max: 100 }), read: (t) => fmt(t.channelMix?.dineIn), example: "60" },
  { key: "deliveryPct", describe: "delivery share of revenue %", parse: num({ min: 0, max: 100 }), read: (t) => fmt(t.channelMix?.delivery), example: "30" },
  { key: "takeawayPct", describe: "takeaway share of revenue %", parse: num({ min: 0, max: 100 }), read: (t) => fmt(t.channelMix?.takeaway), example: "10" },
  { key: "uberPct", describe: "Uber Eats share of delivery %", parse: num({ min: 0, max: 100 }), read: (t) => fmt(t.aggregatorSplit?.uber), example: "40" },
  { key: "deliverooPct", describe: "Deliveroo share of delivery %", parse: num({ min: 0, max: 100 }), read: (t) => fmt(t.aggregatorSplit?.deliveroo), example: "40" },
  { key: "justEatPct", describe: "Just Eat share of delivery %", parse: num({ min: 0, max: 100 }), read: (t) => fmt(t.aggregatorSplit?.justEat), example: "20" },
  { key: "rating", describe: "average rating 0-5", parse: num({ min: 0, max: 5 }), read: (t) => fmt(t.rating), example: "4.5" },
  { key: "siteRatingMin", describe: "lowest site rating 0-5", parse: num({ min: 0, max: 5 }), read: (t) => fmt(t.siteRatingMin), example: "4.3" },
  { key: "siteRatingMax", describe: "highest site rating 0-5", parse: num({ min: 0, max: 5 }), read: (t) => fmt(t.siteRatingMax), example: "4.7" },
  { key: "covers", describe: "covers per site", parse: num({ min: 0, integer: true }), read: (t) => fmt(t.covers), example: "70" },
  { key: "locationType", describe: "high_street, retail_park, transport_hub or shopping_centre", parse: enumOf(LOCATION_TYPES), read: (t) => t.locationType ?? "", example: "high_street" },
  { key: "overheadCost", describe: "annual central overhead in £", parse: num({ min: 0 }), read: (t) => fmt(t.overheadCost), example: "180000" },
  { key: "integrationLoad", describe: "integration load; blank = default by type", parse: num({ min: 0, max: 10 }), read: (t) => fmt(t.integrationLoad), example: "3" },
  { key: "askingPrice", describe: "asking price in £", required: true, parse: num({ min: 0 }), read: (t) => fmt(t.askingPrice), example: "3400000" },
  { key: "brandScore", describe: "brand score 1-5 (judgement input)", parse: num({ min: 1, max: 5, integer: true }), read: (t) => fmt(t.brandScore), example: "4" },
  { key: "notes", describe: "free text", parse: str, read: (t) => t.notes, example: "Founder-led; strong local following" },
];

export const TARGET_CSV_HEADERS = TARGET_CSV_COLUMNS.map((c) => c.key);

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

export function targetsToCsv(targets: Target[]): string {
  const rows = targets.map((t) => TARGET_CSV_COLUMNS.map((c) => c.read(t)));
  return toCsv([[...TARGET_CSV_HEADERS], ...rows]);
}

/** Headers plus one example row. */
export function csvTemplate(): string {
  return toCsv([[...TARGET_CSV_HEADERS], TARGET_CSV_COLUMNS.map((c) => c.example)]);
}

/* ------------------------------------------------------------------ */
/* Import                                                              */
/* ------------------------------------------------------------------ */

export interface CsvRowError {
  /** 1-based line number in the file (header is row 1). 0 for file-level errors. */
  row: number;
  column?: string;
  message: string;
}

export interface CsvImportResult {
  targets: Target[];
  errors: CsvRowError[];
  /** Number of data rows found (excluding the header). */
  rowCount: number;
}

export function parseTargetsCsv(text: string): CsvImportResult {
  const rows = parseCsv(text);
  const errors: CsvRowError[] = [];

  if (rows.length === 0) {
    return { targets: [], errors: [{ row: 0, message: "The file is empty." }], rowCount: 0 };
  }

  const headers = rows[0].map((h) => h.trim());
  const headerIndex = new Map<string, number>();
  const lower = new Map(TARGET_CSV_COLUMNS.map((c) => [c.key.toLowerCase(), c.key]));
  headers.forEach((h, i) => {
    const key = lower.get(h.toLowerCase());
    if (key) headerIndex.set(key, i);
  });

  const missingRequired = TARGET_CSV_COLUMNS.filter(
    (c) => c.required && !headerIndex.has(c.key),
  ).map((c) => c.key);
  if (missingRequired.length > 0) {
    errors.push({
      row: 1,
      message: `Missing required column${missingRequired.length > 1 ? "s" : ""}: ${missingRequired.join(", ")}. Download the template for the expected headers.`,
    });
    return { targets: [], errors, rowCount: rows.length - 1 };
  }

  const targets: Target[] = [];
  for (let r = 1; r < rows.length; r++) {
    const rowNumber = r + 1;
    const cells = rows[r];
    const flat: Flat = {};
    let rowOk = true;

    for (const col of TARGET_CSV_COLUMNS) {
      const idx = headerIndex.get(col.key);
      const raw = idx === undefined ? "" : (cells[idx] ?? "").trim();
      if (raw === "") {
        if (col.required) {
          errors.push({ row: rowNumber, column: col.key, message: `${col.key} is required (${col.describe}).` });
          rowOk = false;
        }
        continue;
      }
      try {
        flat[col.key] = col.parse(raw);
      } catch (e) {
        rowOk = false;
        errors.push({
          row: rowNumber,
          column: col.key,
          message: `${col.key} ${e instanceof CellError ? e.message : "is invalid"}.`,
        });
      }
    }

    if (!rowOk) continue;

    const rowErrors = crossFieldErrors(flat);
    if (rowErrors.length > 0) {
      for (const message of rowErrors) errors.push({ row: rowNumber, message });
      continue;
    }

    targets.push(assembleTarget(flat));
  }

  return { targets, errors, rowCount: rows.length - 1 };
}

const CHANNEL_KEYS = ["dineInPct", "deliveryPct", "takeawayPct"] as const;
const AGG_KEYS = ["uberPct", "deliverooPct", "justEatPct"] as const;

function crossFieldErrors(flat: Flat): string[] {
  const errs: string[] = [];

  const channel = CHANNEL_KEYS.map((k) => flat[k] as number | undefined);
  const channelGiven = channel.filter((v) => v !== undefined).length;
  if (channelGiven > 0 && channelGiven < 3) {
    errs.push("dineInPct, deliveryPct and takeawayPct must all be given or all be blank.");
  } else if (channelGiven === 3) {
    const sum = channel.reduce<number>((a, b) => a + (b ?? 0), 0);
    if (Math.abs(sum - 100) > 1) errs.push(`Channel mix must sum to 100% (dine-in + delivery + takeaway = ${round1(sum)}%).`);
  }

  const agg = AGG_KEYS.map((k) => flat[k] as number | undefined);
  const aggGiven = agg.filter((v) => v !== undefined).length;
  if (aggGiven > 0 && aggGiven < 3) {
    errs.push("uberPct, deliverooPct and justEatPct must all be given or all be blank.");
  } else if (aggGiven === 3) {
    const sum = agg.reduce<number>((a, b) => a + (b ?? 0), 0);
    if (sum !== 0 && Math.abs(sum - 100) > 1) errs.push(`Aggregator split must sum to 100% or be all zero (= ${round1(sum)}%).`);
  }

  const min = flat.siteRatingMin as number | undefined;
  const max = flat.siteRatingMax as number | undefined;
  if (min !== undefined && max !== undefined && min > max) {
    errs.push(`siteRatingMin (${min}) cannot be higher than siteRatingMax (${max}).`);
  }

  return errs;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function assembleTarget(flat: Flat): Target {
  const type = flat.type as TargetType;
  const n = (k: string) => flat[k] as number | undefined;

  const target: Target = {
    id: (flat.id as string) || newId(),
    name: flat.name as string,
    type,
    cuisine: flat.cuisine as string,
    sites: flat.sites as number,
    zones: flat.zones as string[],
    revenue: flat.revenue as number,
    growthPct: n("growthPct"),
    lflGrowthPct: n("lflGrowthPct"),
    ebitdaMarginPct: n("ebitdaMarginPct"),
    foodCostPct: n("foodCostPct"),
    labourCostPct: n("labourCostPct"),
    rentPctRevenue: n("rentPctRevenue"),
    leaseYearsRemaining: n("leaseYearsRemaining"),
    hasBreakClause: (flat.hasBreakClause as boolean | undefined) ?? false,
    rating: n("rating"),
    siteRatingMin: n("siteRatingMin"),
    siteRatingMax: n("siteRatingMax"),
    covers: n("covers"),
    locationType: flat.locationType as LocationType | undefined,
    overheadCost: n("overheadCost"),
    integrationLoad: n("integrationLoad") ?? defaultIntegrationLoad(type),
    askingPrice: flat.askingPrice as number,
    brandScore: n("brandScore"),
    notes: (flat.notes as string | undefined) ?? "",
  };

  if (n("dineInPct") !== undefined) {
    target.channelMix = {
      dineIn: n("dineInPct")!,
      delivery: n("deliveryPct")!,
      takeaway: n("takeawayPct")!,
    };
  }
  if (n("uberPct") !== undefined) {
    target.aggregatorSplit = {
      uber: n("uberPct")!,
      deliveroo: n("deliverooPct")!,
      justEat: n("justEatPct")!,
    };
  }

  // Drop undefined keys so round-trips compare cleanly
  for (const k of Object.keys(target) as (keyof Target)[]) {
    if (target[k] === undefined) delete target[k];
  }
  return target;
}
