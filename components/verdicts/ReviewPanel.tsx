"use client";

import { useState } from "react";
import { StatusCutlery } from "@/components/brand/StatusCutlery";
import { Field, Segmented, TextInput } from "@/components/ui/inputs";
import { pipelineStore } from "@/lib/pipelineStore";
import type { ReviewStatus, SpecialistReview } from "@/lib/storage";

const STATUS_LABEL: Record<ReviewStatus, string> = { draft: "Draft", reviewed: "Reviewed", recommended: "Recommended" };

function Textarea({ value, onCommit, placeholder, id }: { value: string; onCommit: (v: string) => void; placeholder: string; id: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <textarea
      id={id}
      className="min-h-20 w-full rounded-lg border border-transparent bg-fill p-3 text-sm outline-none focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20"
      placeholder={placeholder}
      value={draft ?? value}
      onFocus={() => setDraft(value)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null && draft !== value) onCommit(draft);
        setDraft(null);
      }}
    />
  );
}

export function ReviewPanel({ targetId, review }: { targetId: string; review?: SpecialistReview }) {
  const status = review?.status ?? "draft";
  const set = (patch: Partial<Omit<SpecialistReview, "targetId" | "updatedAt">>) => pipelineStore.setReview(targetId, patch);

  return (
    <div className="rounded-xl bg-background/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StatusCutlery status={status === "draft" ? "in_progress" : "complete"} />
          <span className="text-sm font-medium">Specialist review</span>
          <span className="rounded-full bg-fill px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">{STATUS_LABEL[status]}</span>
        </div>
        <Segmented
          aria-label="Review status"
          value={status}
          onChange={(s) => set({ status: s })}
          options={[
            { value: "draft", label: "Draft", hint: "Work in progress" },
            { value: "reviewed", label: "Reviewed", hint: "A specialist has reviewed the call" },
            { value: "recommended", label: "Recommended", hint: "Signed off for the brief" },
          ]}
        />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_2fr_2fr]">
        <Field label="Reviewer" htmlFor={`rev-${targetId}`}>
          <TextInput id={`rev-${targetId}`} value={review?.reviewer ?? ""} placeholder="Name" onCommit={(reviewer) => set({ reviewer })} />
        </Field>
        <Field label="Notes" htmlFor={`notes-${targetId}`}>
          <Textarea id={`notes-${targetId}`} value={review?.notes ?? ""} placeholder="What the specialist saw, heard or checked" onCommit={(notes) => set({ notes })} />
        </Field>
        <Field label="Concerns not in the data" htmlFor={`conc-${targetId}`}>
          <Textarea id={`conc-${targetId}`} value={review?.concerns ?? ""} placeholder="Founder dependence, local competition, landlord mood…" onCommit={(concerns) => set({ concerns })} />
        </Field>
      </div>
      {review?.updatedAt && <div className="mt-2 text-[11px] text-muted">Last updated {new Date(review.updatedAt).toLocaleString("en-GB")}</div>}
    </div>
  );
}
