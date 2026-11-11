import type { benchmarks as B } from "@/data/benchmarks";
import type { AcquirerProfile } from "@/lib/types";
import { pct, scale } from "./scale";

/**
 * Kitchen utilisation of the acquirer: how much slack its kitchens have to
 * absorb more volume (central production, delivery brands). Shared signal;
 * the acquisition lens reports it as context, future lenses score on it.
 */
export function kitchenSlack(acquirer: AcquirerProfile, b: typeof B): { score: number; text: string } {
  const u = acquirer.kitchenUtilisation;
  const score = scale(u, { bad: b.kitchenUtilisation.lowSlack, good: b.kitchenUtilisation.highSlack });
  const text =
    u >= b.kitchenUtilisation.lowSlack
      ? `Your kitchens run at ${pct(u)} utilisation: little slack to absorb more volume`
      : u <= b.kitchenUtilisation.highSlack
        ? `Your kitchens run at ${pct(u)} utilisation: plenty of slack for central production or extra volume`
        : `Your kitchens run at ${pct(u)} utilisation: some slack to absorb more volume`;
  return { score, text };
}
