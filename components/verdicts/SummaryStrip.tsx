import type { VerdictsResult } from "@/lib/engine/verdicts";
import { formatGbpCompact } from "@/lib/format";
import type { SpecialistReview } from "@/lib/storage";
import type { AcquirerProfile } from "@/lib/types";

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-surface p-5">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{label}</div>
      <div className="num mt-2 text-2xl font-medium leading-none">{value}</div>
      {sub && <div className="mt-2 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function SummaryStrip({ vr, acquirer, reviews }: { vr: VerdictsResult; acquirer: AcquirerProfile; reviews: Record<string, SpecialistReview> }) {
  const combined = acquirer.revenue + vr.revenueAdded;
  const gap = acquirer.targetRevenue - combined;
  const pursue = vr.verdicts.filter((v) => v.verdict === "PURSUE");
  const reviewed = pursue.filter((v) => reviews[v.targetId]?.status === "reviewed" || reviews[v.targetId]?.status === "recommended").length;
  const recommended = pursue.filter((v) => reviews[v.targetId]?.status === "recommended").length;
  const pct = acquirer.capital > 0 ? Math.round((vr.capitalUsed / acquirer.capital) * 100) : 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile label="Capital used" value={`${formatGbpCompact(vr.capitalUsed)} of ${formatGbpCompact(acquirer.capital)}`} sub={`${pct}% deployed across ${vr.result.selected.length} deal${vr.result.selected.length === 1 ? "" : "s"}`} />
      <Tile label="Verdicts" value={`${vr.counts.PURSUE} · ${vr.counts.HOLD} · ${vr.counts.PASS}`} sub="PURSUE · HOLD · PASS" />
      <Tile
        label="Revenue vs target"
        value={`${formatGbpCompact(combined)} vs ${formatGbpCompact(acquirer.targetRevenue)}`}
        sub={gap > 0 ? `${formatGbpCompact(gap)} short of the year-3 target before growth` : `${formatGbpCompact(-gap)} above the year-3 target before growth`}
      />
      <Tile label="Review progress" value={`${reviewed} of ${pursue.length}`} sub={`${recommended} recommended by a specialist`} />
    </div>
  );
}
