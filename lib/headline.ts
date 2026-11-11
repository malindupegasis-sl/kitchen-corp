/**
 * Action titles: headings that state the conclusion, generated from the data.
 * Pure functions so the wording is testable and consistent across screens.
 */
import { pipelineFlags } from "./flags";
import { formatGbpCompact } from "./format";
import type { AcquirerProfile, Target } from "./types";

export interface TargetFit {
  /** Asking price is known and within the acquirer's capital. */
  withinCapital: boolean;
  /** Zones suit the strategy: new zones when expanding, shared zones when densifying. */
  zoneFit: boolean;
  fits: boolean;
}

const norm = (z: string) => z.trim().toLowerCase();

export function targetFit(acquirer: AcquirerProfile, target: Target): TargetFit {
  const withinCapital = target.askingPrice > 0 && target.askingPrice <= acquirer.capital;
  const acquirerZones = new Set(acquirer.zones.map(norm));
  const shared = target.zones.some((z) => acquirerZones.has(norm(z)));
  const opensNew = target.zones.some((z) => !acquirerZones.has(norm(z)));
  const zoneFit = acquirer.strategy === "densify" ? shared : opensNew;
  return { withinCapital, zoneFit, fits: withinCapital && zoneFit };
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** Page title for the Pipeline screen. */
export function pipelineHeadline(acquirer: AcquirerProfile, targets: Target[]): string {
  if (targets.length === 0) return "Add targets to start building a pipeline";
  const total = targets.length;
  const zonesWord = acquirer.strategy === "densify" ? "your zones" : "new zones";
  if (acquirer.capital <= 0) {
    const n = targets.filter((t) => targetFit(acquirer, t).zoneFit).length;
    return `${n} of ${plural(total, "target")} fit ${zonesWord}; add capital to check price`;
  }
  const n = targets.filter((t) => targetFit(acquirer, t).fits).length;
  return `${n} of ${plural(total, "target")} fit your ${formatGbpCompact(acquirer.capital)} and ${zonesWord}`;
}

/** One-line description under the Pipeline title. */
export function pipelineSubtitle(targets: Target[]): string {
  if (targets.length === 0) return "Add a target, import a CSV, or reset to the sample data. Edits save to this browser.";
  const flagged = targets.filter((t) => pipelineFlags(t).length > 0).length;
  const flagText =
    flagged === 0
      ? "None carries a rent or lease flag."
      : `${flagged} ${flagged === 1 ? "carries" : "carry"} a rent or lease flag.`;
  return `${flagText} Click any cell to edit; edits save to this browser.`;
}

/** Section title for the acquirer profile card. */
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

/** Takeaway title for the targets exhibit. */
export function targetsExhibitTitle(acquirer: AcquirerProfile, targets: Target[]): string {
  if (targets.length === 0) return "No targets in the pipeline yet";
  const total = targets.length;
  const flagged = targets.filter((t) => pipelineFlags(t).length > 0).length;
  const within = targets.filter((t) => targetFit(acquirer, t).withinCapital).length;
  const cap = formatGbpCompact(acquirer.capital);
  const priced = acquirer.capital > 0 ? `${within} ${within === 1 ? "is" : "are"} priced within your ${cap}` : "set capital to check prices";
  if (flagged === 0) return `No target carries a rent or lease flag; ${priced}`;
  return `${flagged} of ${plural(total, "target")} carry a rent or lease flag; ${priced}`;
}
