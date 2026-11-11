"use client";

import { useState } from "react";
import { CuisineTag } from "@/components/ui/inputs";
import type { Verdict } from "@/lib/engine/verdicts";
import { formatGbpCompact } from "@/lib/format";
import type { SpecialistReview } from "@/lib/storage";
import { TARGET_TYPE_LABELS, type Target } from "@/lib/types";
import { ReviewPanel } from "./ReviewPanel";
import { VerdictPill } from "./VerdictPill";

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div title={hint}>
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className="num mt-0.5 text-lg font-medium leading-none">{value}</div>
    </div>
  );
}

const BLOCKER_LABEL: Record<NonNullable<Verdict["blocker"]>, string> = {
  budget: "Budget",
  capacity: "Capacity",
  overlap: "Overlap",
  data: "Needs data",
};

export function VerdictCard({ verdict: v, target: t, review }: { verdict: Verdict; target: Target; review?: SpecialistReview }) {
  const [showEffects, setShowEffects] = useState(false);
  const [showDiligence, setShowDiligence] = useState(false);
  const [showReview, setShowReview] = useState(v.verdict === "PURSUE");
  const money = (n: number) => `${n < 0 ? "-" : "+"}${formatGbpCompact(Math.abs(n))}`;

  return (
    <article className="rounded-2xl bg-surface p-6" aria-label={`${t.name}: ${v.verdict}`}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="num w-8 pt-1 text-right text-sm text-muted">{v.rank}</div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="display text-xl leading-tight">{t.name}</h3>
              <CuisineTag cuisine={t.cuisine} />
            </div>
            <div className="mt-1 text-sm text-muted">
              {TARGET_TYPE_LABELS[t.type]} · {t.sites} site{t.sites === 1 ? "" : "s"} · {t.zones.join(", ") || "no zones"} · asking {formatGbpCompact(t.askingPrice)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {v.blocker && <span className="rounded-full bg-fill px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted">{BLOCKER_LABEL[v.blocker]}</span>}
          {v.year && <span className="rounded-full bg-fill px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted">Year {v.year}</span>}
          <VerdictPill verdict={v.verdict} />
        </div>
      </header>

      <p className="mt-4 text-[15px] leading-relaxed">{v.headline}.</p>

      <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
        <Metric label="Standalone" value={v.standalone === null ? "—" : String(v.standalone)} hint="Acquisition lens score, 0-100" />
        <Metric label="Data" value={`${v.completeness}%`} hint="Share of the lens's fields present" />
        <Metric label="Combination" value={money(v.combination.total)} hint={v.verdict === "PURSUE" ? "Annual effect in the recommended set" : "Annual effect if added to the recommended set"} />
        <Metric label="Standalone value" value={formatGbpCompact(v.value)} hint="EBITDA weighted by the standalone score, annual" />
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Top 3 reasons</div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {v.reasons.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${r.direction === "positive" ? "bg-foreground" : "border border-foreground"}`} aria-hidden />
                <span className={r.direction === "positive" ? "" : "text-foreground/80"}>{r.text}</span>
              </li>
            ))}
            {v.reasons.length === 0 && <li className="text-muted">No data to score</li>}
          </ul>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted">What would change the call</div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {v.whatWouldChange.map((w, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-xs">
        <button type="button" onClick={() => setShowEffects((s) => !s)} className="rounded-full border border-line px-3 py-1 hover:bg-fill" aria-expanded={showEffects}>
          Combination effects ({v.combination.items.length})
        </button>
        <button type="button" onClick={() => setShowDiligence((s) => !s)} className="rounded-full border border-line px-3 py-1 hover:bg-fill" aria-expanded={showDiligence}>
          Diligence questions ({v.diligence.length})
        </button>
        <button type="button" onClick={() => setShowReview((s) => !s)} className="rounded-full border border-line px-3 py-1 hover:bg-fill" aria-expanded={showReview}>
          Specialist review{review ? `: ${review.status}` : ""}
        </button>
      </div>

      {showEffects && (
        <div className="mt-4 rounded-xl bg-background/70 p-4 text-sm">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Combination effects {v.verdict === "PURSUE" ? "in the recommended set" : "if added to the recommended set"}
          </div>
          {v.combination.items.length === 0 ? (
            <p className="mt-2 text-muted">No interactions with the acquirer or the set.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {v.combination.items.map((i, k) => (
                <li key={k}>
                  <div>{i.text}</div>
                  <div className="text-[11px] text-muted">Assumption: {i.assumption}</div>
                </li>
              ))}
            </ul>
          )}
          <div className="num mt-3 text-sm">Total {money(v.combination.total)} a year</div>
        </div>
      )}

      {showDiligence && (
        <ol className="mt-4 list-decimal space-y-1.5 rounded-xl bg-background/70 p-4 pl-9 text-sm">
          {v.diligence.map((q, i) => (
            <li key={i}>
              {q.text}
              <span className="block text-[11px] text-muted">{q.source === "missing_field" ? "Missing field" : q.source === "consistency" ? "P&L consistency" : q.source === "standard" ? "Standard check" : q.because}</span>
            </li>
          ))}
        </ol>
      )}

      {showReview && (
        <div className="mt-4">
          <ReviewPanel targetId={t.id} review={review} />
        </div>
      )}
    </article>
  );
}
