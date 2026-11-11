export type Mode = "group" | "pe";
export type Strategy = "densify" | "expand";
export type TargetType = "restaurant_group" | "single_site" | "franchise";
export type LocationType =
  | "high_street"
  | "retail_park"
  | "transport_hub"
  | "shopping_centre";

export const MODES: readonly Mode[] = ["group", "pe"];
export const STRATEGIES: readonly Strategy[] = ["densify", "expand"];
export const TARGET_TYPES: readonly TargetType[] = [
  "restaurant_group",
  "single_site",
  "franchise",
];
export const LOCATION_TYPES: readonly LocationType[] = [
  "high_street",
  "retail_park",
  "transport_hub",
  "shopping_centre",
];

export const TARGET_TYPE_LABELS: Record<TargetType, string> = {
  restaurant_group: "Restaurant group",
  single_site: "Single site",
  franchise: "Franchise",
};

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  high_street: "High street",
  retail_park: "Retail park",
  transport_hub: "Transport hub",
  shopping_centre: "Shopping centre",
};

/** Default integration load (how much management bandwidth a deal consumes) by target type. */
export const DEFAULT_INTEGRATION_LOAD: Record<TargetType, number> = {
  restaurant_group: 3,
  single_site: 1,
  franchise: 2,
};

export function defaultIntegrationLoad(type: TargetType): number {
  return DEFAULT_INTEGRATION_LOAD[type];
}

export interface AcquirerProfile {
  mode: Mode;
  name: string;
  cuisines: string[];
  zones: string[];
  sites: number;
  /** Annual revenue, GBP. */
  revenue: number;
  /** Kitchen utilisation, % of available capacity in use. */
  kitchenUtilisation: number;
  /** Capital available for acquisitions, GBP. */
  capital: number;
  /** Year-3 annual revenue target, GBP. */
  targetRevenue: number;
  /** Year-3 EBITDA target, GBP. */
  targetEbitda: number;
  /** Integration capacity: sum of integrationLoad the acquirer can absorb per year. */
  integrationCapacityPerYear: number;
  strategy: Strategy;
  /** PE mode only: hold period in years. */
  peHoldYears: number;
  /** PE mode only: exit EV/EBITDA multiple. */
  peExitMultiple: number;
}

/** Share of revenue by channel, in %. Should sum to 100. */
export interface ChannelMix {
  dineIn: number;
  delivery: number;
  takeaway: number;
}

/** Share of delivery revenue by aggregator, in %. Should sum to 100. */
export interface AggregatorSplit {
  uber: number;
  deliveroo: number;
  justEat: number;
}

export interface Target {
  id: string;
  name: string;
  type: TargetType;
  cuisine: string;
  sites: number;
  zones: string[];
  /** Annual revenue, GBP. */
  revenue: number;
  /** Year-on-year revenue growth, %. */
  growthPct?: number;
  /** Like-for-like growth, %. */
  lflGrowthPct?: number;
  ebitdaMarginPct?: number;
  foodCostPct?: number;
  labourCostPct?: number;
  rentPctRevenue?: number;
  leaseYearsRemaining?: number;
  hasBreakClause: boolean;
  channelMix?: ChannelMix;
  aggregatorSplit?: AggregatorSplit;
  /** Average customer rating, 0-5. */
  rating?: number;
  siteRatingMin?: number;
  siteRatingMax?: number;
  /** Covers per site (seats). */
  covers?: number;
  locationType?: LocationType;
  /** Annual head-office / central overhead, GBP. */
  overheadCost?: number;
  integrationLoad: number;
  /** Asking price, GBP. */
  askingPrice: number;
  /** Judgement input, 1-5. */
  brandScore?: number;
  notes: string;
}

export function blankTarget(id: string): Target {
  return {
    id,
    name: "",
    type: "single_site",
    cuisine: "",
    sites: 1,
    zones: [],
    revenue: 0,
    hasBreakClause: false,
    integrationLoad: defaultIntegrationLoad("single_site"),
    askingPrice: 0,
    notes: "",
  };
}
