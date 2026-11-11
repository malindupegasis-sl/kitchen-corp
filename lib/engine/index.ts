import { benchmarks } from "@/data/benchmarks";
import type { AcquirerProfile, Target } from "@/lib/types";
import { acquisitionLens } from "./lenses/acquisition";
import type { Lens, TargetScore, Weights } from "./types";

export * from "./types";
export { acquisitionLens, ACQUISITION_COMPONENTS, ACQUISITION_DEFAULT_WEIGHTS, ACQUISITION_FIELDS } from "./lenses/acquisition";

/** Registry of lenses. Only the acquisition lens exists in v1. */
export const lenses: Record<string, Lens> = {
  acquisition: acquisitionLens,
};

/** Clamp weights to non-negative numbers, filling gaps from the lens defaults. */
export function normaliseWeights(lens: Lens, weights?: Partial<Weights> | null): Weights {
  const out = { ...lens.defaultWeights };
  if (weights) {
    for (const k of Object.keys(out) as (keyof Weights)[]) {
      const v = weights[k];
      if (typeof v === "number" && Number.isFinite(v)) out[k] = Math.max(0, v);
    }
  }
  return out;
}

/** Score every target with a lens. Pure: same inputs, same outputs. */
export function scoreTargets(lens: Lens, targets: Target[], acquirer: AcquirerProfile, weights?: Partial<Weights> | null): TargetScore[] {
  const ctx = { acquirer, weights: normaliseWeights(lens, weights), benchmarks };
  return targets.map((t) => lens.scoreTarget(t, ctx));
}

export function scoreMap(scores: TargetScore[]): Map<string, TargetScore> {
  return new Map(scores.map((s) => [s.targetId, s]));
}
