/** Format a GBP amount with no decimals, e.g. 18000000 -> "£18,000,000". */
export function formatGbp(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Compact GBP, e.g. 18000000 -> "£18m", 52300000 -> "£52.3m", 900000 -> "£900k", 450 -> "£450". */
export function formatGbpCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${sign}£${Number.isInteger(Math.round(m * 10) / 10) ? Math.round(m) : m.toFixed(1)}m`;
  }
  if (abs >= 1_000) return `${sign}£${Math.round(abs / 1_000)}k`;
  return `${sign}£${Math.round(abs)}`;
}

/** Split a comma- or semicolon-separated list into trimmed, non-empty items. */
export function parseList(text: string): string[] {
  return text
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
