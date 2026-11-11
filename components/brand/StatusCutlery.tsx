import { STROKE, forkPath, knifePath } from "./cutlery";

export type CutleryStatus = "in_progress" | "complete";

export const STATUS_LABELS: Record<CutleryStatus, { label: string; tooltip: string }> = {
  in_progress: {
    label: "In progress",
    tooltip: "In progress / awaiting review. Crossed fork and knife: the diner is pausing, not finished.",
  },
  complete: {
    label: "Complete",
    tooltip: "Complete / signed off. Fork and knife side by side at an angle: the diner has finished.",
  },
};

/**
 * Status icon from dining etiquette (not the logo). Crossed = in progress or
 * awaiting review; side by side at an angle = complete or signed off.
 * Always carries a tooltip and an accessible label.
 */
export function StatusCutlery({
  status,
  size = 20,
  showLabel = false,
  className = "",
}: {
  status: CutleryStatus;
  size?: number;
  showLabel?: boolean;
  className?: string;
}) {
  const { label, tooltip } = STATUS_LABELS[status];
  return (
    <span className={`group relative inline-flex items-center gap-1.5 ${className}`} tabIndex={0} aria-label={tooltip}>
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...STROKE}>
        {status === "in_progress" ? (
          <>
            <g transform="rotate(-45 12 12)">
              <path d={forkPath(12)} />
            </g>
            <g transform="rotate(45 12 12)">
              <path d={knifePath(12)} />
            </g>
          </>
        ) : (
          <g transform="rotate(45 12 12)">
            <path d={forkPath(9.5)} />
            <path d={knifePath(14.5)} />
          </g>
        )}
      </svg>
      {showLabel && <span className="text-sm">{label}</span>}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 w-56 -translate-x-1/2 rounded-lg bg-foreground px-2.5 py-1.5 text-[11px] leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {tooltip}
      </span>
    </span>
  );
}
