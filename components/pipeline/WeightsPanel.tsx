"use client";

import { Button, Card } from "@/components/ui/inputs";
import { ACQUISITION_COMPONENTS, acquisitionLens, normaliseWeights, type Weights } from "@/lib/engine";
import { pipelineStore } from "@/lib/pipelineStore";

export function WeightsPanel({ weights }: { weights?: Partial<Weights> }) {
  const w = normaliseWeights(acquisitionLens, weights);
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  const isDefault = ACQUISITION_COMPONENTS.every((c) => w[c.id] === c.defaultWeight);

  return (
    <Card
      label="Acquisition lens"
      title={acquisitionLens.question}
      actions={
        <>
          <span className="text-xs text-muted">
            Weights sum to <span className="num text-foreground">{total}</span>; each counts as its share
          </span>
          <Button variant="ghost" onClick={() => pipelineStore.resetWeights()} disabled={isDefault}>Reset weights</Button>
        </>
      }
    >
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACQUISITION_COMPONENTS.map((c) => {
          const share = total > 0 ? Math.round((w[c.id] / total) * 100) : 0;
          return (
            <label key={c.id} className="block">
              <span className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">
                  {c.label}
                  {c.judgement && <span className="ml-1.5 rounded-full bg-fill px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">judgement input</span>}
                </span>
                <span className="num text-muted">
                  {w[c.id]} <span className="text-[11px]">({share}%)</span>
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={w[c.id]}
                aria-label={`${c.label} weight`}
                onChange={(e) => pipelineStore.setWeights({ ...w, [c.id]: Number(e.target.value) })}
                className="mt-1.5 w-full accent-accent"
              />
              <span className="block text-[11px] leading-snug text-muted">{c.description}</span>
            </label>
          );
        })}
      </div>
    </Card>
  );
}
