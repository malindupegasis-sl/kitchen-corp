/**
 * Action titles: headings that state the conclusion, generated from the data.
 * Pure functions so the wording is testable and consistent across screens.
 *
 * Rule: a title may only state what the engine has actually computed at that
 * stage. Before scoring (Pipeline) that means factual counts: risk flags and
 * data gaps. Never "fit", "best" or anything that implies a score or verdict.
 */
import type { TargetScore } from "./engine/types";
import { joinNames, type VerdictsResult } from "./engine/verdicts";
import { pipelineFlags } from "./flags";
import { formatGbpCompact } from "./format";
import { hasDataGaps } from "./gaps";
import type { AcquirerProfile, Target } from "./types";

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** Page title for the Pipeline screen: risk flags and data gaps only. */
export function pipelineHeadline(targets: Target[]): string {
  if (targets.length === 0) return "No targets yet: add one or import a CSV";
  const total = targets.length;
  const flagged = targets.filter((t) => pipelineFlags(t).length > 0).length;
  const gaps = targets.filter(hasDataGaps).length;

  const flagText =
    flagged === 0
      ? `None of ${plural(total, "target")} carries a rent or lease flag`
      : `${flagged} of ${plural(total, "target")} ${flagged === 1 ? "carries" : "carry"} a rent or lease flag`;
  const gapText = gaps === 0 ? "none has data gaps" : `${gaps} ${gaps === 1 ? "has" : "have"} data gaps`;
  return `${flagText}; ${gapText}`;
}

/** One-line description under the Pipeline title. */
export function pipelineSubtitle(targets: Target[]): string {
  if (targets.length === 0) return "Add a target, import a CSV, or reset to the sample data. Edits save to this browser.";
  return "Flags and gaps are counted from the data as entered; scores and verdicts come once the acquisition lens runs. Click any cell to edit; edits save to this browser.";
}

/** Section title for the acquirer profile card: facts from the profile. */
export function acquirerHeadline(acquirer: AcquirerProfile): string {
  const name = acquirer.name.trim() || "Your business";
  const parts = [
    plural(acquirer.sites, "site"),
    `${formatGbpCompact(acquirer.revenue)} annual revenue`,
    acquirer.mode === "pe"
      ? `${formatGbpCompact(acquirer.capital)} equity over ${plural(acquirer.peHoldYears, "year")}`
      : `${formatGbpCompact(acquirer.capital)} to deploy`,
  ];
  return `${name}: ${parts.join(", ")}`;
}

/** Takeaway title for the targets exhibit: counts and sums only. */
export function targetsExhibitTitle(acquirer: AcquirerProfile, targets: Target[]): string {
  if (targets.length === 0) return "No targets in the pipeline yet";
  const zones = new Set(targets.flatMap((t) => t.zones.map((z) => z.trim().toLowerCase())).filter(Boolean)).size;
  const cuisines = new Set(targets.map((t) => t.cuisine.trim().toLowerCase()).filter(Boolean)).size;
  const asking = targets.reduce((s, t) => s + (t.askingPrice || 0), 0);
  return `${plural(targets.length, "target")} across ${plural(zones, "zone")} and ${plural(cuisines, "cuisine")}; ${formatGbpCompact(asking)} total asking against ${formatGbpCompact(acquirer.capital)} capital`;
}

/** Takeaway title for the targets exhibit once the acquisition lens has run. */
export function scoredExhibitTitle(scores: TargetScore[], passBelow: number): string {
  if (scores.length === 0) return "No targets in the pipeline yet";
  const scored = scores.filter((s) => s.score !== null);
  if (scored.length === 0) return `${plural(scores.length, "target")} but no data to score yet`;
  const above = scored.filter((s) => (s.score as number) >= passBelow).length;
  const partial = scored.filter((s) => s.completeness < 100).length;
  const unscored = scores.length - scored.length;
  const tail =
    unscored > 0
      ? `${unscored} ${unscored === 1 ? "has" : "have"} no data to score`
      : partial > 0
        ? `${partial} ${partial === 1 ? "is" : "are"} scored on partial data`
        : "all scored on complete data";
  return `${above} of ${plural(scores.length, "target")} score ${passBelow} or more on the acquisition lens; ${tail}`;
}

/** Page title for the Verdicts screen: the recommended set, as computed by the combination engine. */
export function verdictsHeadline(vr: VerdictsResult, targets: Target[], acquirer: AcquirerProfile): string {
  const byId = new Map(targets.map((t) => [t.id, t]));
  const names = vr.result.selected.map((id) => byId.get(id)?.name ?? id);
  if (targets.length === 0) return "No targets to judge yet";
  if (names.length === 0) {
    return vr.result.candidates.length === 0
      ? `No target reaches the ${vr.passBelow} line; nothing to pursue yet`
      : `No combination of the ${vr.result.candidates.length} candidates fits your ${formatGbpCompact(acquirer.capital)} and capacity`;
  }
  return `Pursue ${joinNames(names)} for ${formatGbpCompact(vr.capitalUsed)} of your ${formatGbpCompact(acquirer.capital)}`;
}

/** One line under the Verdicts title. */
export function verdictsSubtitle(vr: VerdictsResult, acquirer: AcquirerProfile): string {
  if (vr.result.selected.length === 0) return `${vr.counts.HOLD} on HOLD, ${vr.counts.PASS} PASS. Change capital, capacity or strategy to see a set.`;
  const combined = acquirer.revenue + vr.revenueAdded;
  return `Adds ${formatGbpCompact(vr.revenueAdded)} of annual revenue and ${formatGbpCompact(vr.ebitdaAdded)} of EBITDA including ${formatGbpCompact(vr.result.effectTotal)} of combination effects, taking you to ${formatGbpCompact(combined)} against a ${formatGbpCompact(acquirer.targetRevenue)} target. ${vr.counts.HOLD} on HOLD, ${vr.counts.PASS} PASS.`;
}

/** Takeaway for the ranked-cards exhibit. */
export function verdictsExhibitTitle(vr: VerdictsResult): string {
  const c = vr.result.candidates.length;
  if (c === 0) return `No target scores ${vr.passBelow} or more, so every verdict is PASS or needs data`;
  const effects = vr.result.effectTotal;
  return `${vr.counts.PURSUE} of ${c} candidates above the ${vr.passBelow} line make the set; combination effects ${effects >= 0 ? "add" : "cost"} ${formatGbpCompact(Math.abs(effects))} a year`;
}
