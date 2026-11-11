/**
 * Original minimal line drawings of a fork and a knife on a 24x24 grid, drawn
 * vertically with the handle at the bottom. Round stroke caps everywhere.
 * `x` is the horizontal centre of the piece.
 */
export function forkPath(x: number): string {
  // Outer tines joined by a U, plus the middle tine running into the handle.
  return [
    `M${x - 2.5} 3v4.5a2.5 2.5 0 0 0 5 0V3`,
    `M${x} 3v18`,
  ].join(" ");
}

export function knifePath(x: number): string {
  // Straight spine with a blade curving out to the left, then the handle.
  return [
    `M${x} 3v18`,
    `M${x} 3c-3 2.6-3 7.4 0 10`,
  ].join(" ");
}

export const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
