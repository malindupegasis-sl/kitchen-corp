import type { AcquirerProfile, Target } from "@/lib/types";
import type { benchmarks as Benchmarks } from "@/data/benchmarks";

export type ComponentId = "financial" | "unitEconomics" | "lease" | "delivery" | "price" | "brand";

export type Weights = Record<ComponentId, number>;

export interface ComponentDef {
  id: ComponentId;
  label: string;
  /** What this component asks of the target. */
  description: string;
  defaultWeight: number;
  /** Marked in the UI as a judgement input rather than data. */
  judgement?: boolean;
}

export interface SignalScore {
  id: string;
  label: string;
  /** 0-100, or null when the data is missing. */
  score: number | null;
  /** Plain-English statement of what the data says. */
  text: string;
  /** Fields consulted; the missing ones are reported as data gaps. */
  fields: string[];
  missing: string[];
}

export interface ComponentScore {
  id: ComponentId;
  label: string;
  weight: number;
  /** 0-100, or null when no signal in the component had data. */
  score: number | null;
  signals: SignalScore[];
  /** Extra notes, e.g. a consistency warning or a penalty applied. */
  notes: string[];
  judgement?: boolean;
}

export interface Reason {
  text: string;
  /** Positive supports the target, negative counts against it. */
  direction: "positive" | "negative";
  componentId: ComponentId;
  /** Weighted distance from neutral; used to rank. */
  strength: number;
}

export interface DiligenceQuestion {
  text: string;
  /** Why it is asked: a weak signal, a missing field or a consistency issue. */
  because: string;
  source: "weak_signal" | "missing_field" | "consistency" | "standard";
}

export interface TargetScore {
  targetId: string;
  lensId: string;
  /** Standalone score 0-100, or null when nothing could be scored. */
  score: number | null;
  /** Share of the lens's fields present for this target, 0-100. */
  completeness: number;
  missingFields: string[];
  components: ComponentScore[];
  /** The weights actually applied, after dropping unavailable components. */
  appliedWeights: Partial<Weights>;
  reasons: Reason[];
  diligence: DiligenceQuestion[];
  /** Assumptions behind the number, in plain English. */
  assumptions: string[];
}

export interface LensContext {
  acquirer: AcquirerProfile;
  weights: Weights;
  benchmarks: typeof Benchmarks;
}

export interface Lens {
  id: string;
  name: string;
  /** The question the lens answers. */
  question: string;
  /** Field labels the lens reads; completeness is measured against these. */
  requiredFields: readonly { key: string; label: string; has: (t: Target) => boolean }[];
  components: readonly ComponentDef[];
  defaultWeights: Weights;
  scoreTarget(target: Target, context: LensContext): TargetScore;
  verdictRules: {
    /** Standalone score below this is PASS regardless of combination effects. */
    passBelow: number;
  };
}
