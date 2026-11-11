import { STROKE, forkPath, knifePath } from "./cutlery";

/** Fork and knife side by side, as a line icon. */
export function ForkKnifeIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className} {...STROKE}>
      <path d={forkPath(8)} />
      <path d={knifePath(16)} />
    </svg>
  );
}

/** Header logo: the icon plus the wordmark. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 text-foreground ${className}`}>
      <ForkKnifeIcon />
      <span className="text-[15px] font-semibold tracking-tight">Kitchen Corp</span>
    </span>
  );
}
