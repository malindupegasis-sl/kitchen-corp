import type { VerdictKind } from "@/lib/engine/verdicts";

/** The one place green / amber / red are used for verdicts. */
export function VerdictPill({ verdict, size = "md" }: { verdict: VerdictKind; size?: "sm" | "md" }) {
  const styles: Record<VerdictKind, string> = {
    PURSUE: "bg-green-100 text-green-900",
    HOLD: "bg-amber-100 text-amber-900",
    PASS: "bg-red-100 text-red-900",
  };
  return (
    <span className={`inline-flex items-center rounded-full font-semibold tracking-wide ${styles[verdict]} ${size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"}`}>
      {verdict}
    </span>
  );
}
