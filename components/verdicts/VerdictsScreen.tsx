"use client";

import { useMemo, useState } from "react";
import { PageHeading } from "@/components/PageShell";
import { Exhibit } from "@/components/ui/Exhibit";
import { Segmented } from "@/components/ui/inputs";
import { acquisitionLens, scoreTargets } from "@/lib/engine";
import type { VerdictKind, VerdictsInput } from "@/lib/engine/verdicts";
import { verdictsExhibitTitle, verdictsHeadline, verdictsSubtitle } from "@/lib/headline";
import { usePipeline } from "@/lib/pipelineStore";
import { SummaryStrip } from "./SummaryStrip";
import { VerdictCard } from "./VerdictCard";
import { useVerdicts } from "./useVerdicts";

type Filter = "all" | VerdictKind | "review";

export function VerdictsScreen() {
  const { acquirer, targets, weights, reviews, hydrated } = usePipeline();
  const [filter, setFilter] = useState<Filter>("all");

  const scores = useMemo(() => scoreTargets(acquisitionLens, targets, acquirer, weights), [targets, acquirer, weights]);
  const input = useMemo<VerdictsInput | null>(
    () => (hydrated ? { targets, acquirer, scores, passBelow: acquisitionLens.verdictRules.passBelow } : null),
    [hydrated, targets, acquirer, scores],
  );
  const { result: vr, pending } = useVerdicts(input);
  const byId = useMemo(() => new Map(targets.map((t) => [t.id, t])), [targets]);
  const reviewMap = useMemo(() => reviews ?? {}, [reviews]);

  const shown = useMemo(() => {
    if (!vr) return [];
    return vr.verdicts.filter((v) => {
      if (filter === "all") return true;
      if (filter === "review") return v.verdict === "PURSUE" && reviewMap[v.targetId]?.status !== "recommended";
      return v.verdict === filter;
    });
  }, [vr, filter, reviewMap]);

  if (!hydrated || !vr) {
    return (
      <div className="space-y-8">
        <PageHeading label="Verdicts" title={hydrated ? "Searching every combination that fits your capital and capacity" : "Loading your saved pipeline"} />
        <div className="rounded-2xl bg-surface p-14 text-center text-sm text-muted" role="status">
          {hydrated ? "Running the combination engine…" : "Loading…"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeading
        label="Verdicts"
        title={verdictsHeadline(vr, targets, acquirer)}
        description={verdictsSubtitle(vr, acquirer)}
        actions={
          <span className="text-xs text-muted">
            {acquirer.strategy === "densify" ? "Densify" : "Expand"} strategy · {vr.result.method === "exhaustive" ? "every" : "greedy search over"} combination of {vr.result.candidates.length} candidates
            {pending ? " · updating…" : ""}
          </span>
        }
      />

      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-0.5 font-medium text-foreground">Sample data</span>
        <span>All names and figures are fictional. Change the acquirer, targets or weights on the Pipeline and the verdicts update.</span>
      </p>

      <SummaryStrip vr={vr} acquirer={acquirer} reviews={reviewMap} />

      <Exhibit
        number={1}
        title={verdictsExhibitTitle(vr)}
        note={`PURSUE is the set that maximises standalone value plus combination effects within ${"£"}${Math.round(acquirer.capital / 1e6)}m and an integration capacity of ${acquirer.integrationCapacityPerYear} a year over 3 years. HOLD scores ${vr.passBelow} or more but is left out: the card says whether by budget, capacity or overlap, and what would flip it. PASS scores below ${vr.passBelow}.`}
        actions={
          <Segmented
            aria-label="Filter verdicts"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: `All ${vr.verdicts.length}` },
              { value: "PURSUE", label: `Pursue ${vr.counts.PURSUE}` },
              { value: "HOLD", label: `Hold ${vr.counts.HOLD}` },
              { value: "PASS", label: `Pass ${vr.counts.PASS}` },
              { value: "review", label: "Needs review" },
            ]}
          />
        }
      >
        <div className="space-y-4">
          {shown.map((v) => {
            const t = byId.get(v.targetId);
            return t ? <VerdictCard key={v.targetId} verdict={v} target={t} review={reviewMap[v.targetId]} /> : null;
          })}
          {shown.length === 0 && <div className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-muted">Nothing matches this filter.</div>}
        </div>
      </Exhibit>
    </div>
  );
}
