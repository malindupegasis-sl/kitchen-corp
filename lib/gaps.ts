import { ACQUISITION_FIELDS } from "./engine/lenses/acquisition";
import type { Target } from "./types";

/** Plain-English labels of the acquisition-lens fields this target is missing. Pure function. */
export function dataGaps(target: Target): string[] {
  return ACQUISITION_FIELDS.filter((f) => !f.has(target)).map((f) => f.label);
}

export function hasDataGaps(target: Target): boolean {
  return ACQUISITION_FIELDS.some((f) => !f.has(target));
}
