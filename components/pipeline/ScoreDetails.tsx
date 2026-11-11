"use client";

import type { TargetScore } from "@/lib/engine";

/** Expanded row: every component, signal, question and assumption behind a score. */
export function ScoreDetails({ score }: { score: TargetScore }) {
  return (
    <div className="grid max-w-4xl gap-8 py-4 pr-4 text-sm lg:grid-cols-[1.2fr_1fr]">
      <div>
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Components</div>
        <ul className="mt-2 space-y-3">
          {score.components.map((c) => (
            <li key={c.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">
                  {c.label}
                  {c.judgement && <span className="ml-1.5 text-[11px] font-normal text-muted">judgement input</span>}
                  <span className="ml-1.5 text-[11px] font-normal text-muted">
                    {score.appliedWeights[c.id] !== undefined ? `${score.appliedWeights[c.id]}% of score` : "no data, left out"}
                  </span>
                </span>
                <span className="num">{c.score === null ? "—" : c.score}</span>
              </div>
              <div className="mt-1 h-1 w-full rounded-full bg-fill">
                {c.score !== null && <div className="h-1 rounded-full bg-foreground" style={{ width: `${c.score}%` }} />}
              </div>
              <ul className="mt-1.5 space-y-0.5 text-[13px] text-muted">
                {c.signals.map((s) => (
                  <li key={s.id} className="flex justify-between gap-3">
                    <span>{s.text}</span>
                    <span className="num shrink-0">{s.score === null ? "—" : s.score}</span>
                  </li>
                ))}
                {c.notes.map((n, i) => (
                  <li key={i} className="text-foreground/80">{n}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-5">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Diligence questions</div>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5">
            {score.diligence.map((q, i) => (
              <li key={i}>
                {q.text}
                <span className="block text-[11px] text-muted">
                  {q.source === "missing_field" ? "Missing field" : q.source === "consistency" ? "P&L consistency" : q.source === "standard" ? "Standard check" : q.because}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Assumptions behind the number</div>
          <ul className="mt-2 space-y-1 text-[13px] text-muted">
            {score.assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
