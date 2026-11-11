/**
 * Linear score between two anchors. At or beyond `bad` scores 0, at or beyond
 * `good` scores 100. Works whichever direction is better (bad > good or
 * bad < good).
 */
export function scale(value: number, anchors: { bad: number; good: number }): number {
  const { bad, good } = anchors;
  if (bad === good) return value >= good ? 100 : 0;
  const t = (value - bad) / (good - bad);
  return Math.round(Math.max(0, Math.min(1, t)) * 100);
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function pct(n: number): string {
  return `${round1(n)}%`;
}

/** Mean of the non-null numbers, or null if none. */
export function meanOrNull(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  return Math.round(present.reduce((a, b) => a + b, 0) / present.length);
}
