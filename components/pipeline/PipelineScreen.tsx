"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui/inputs";
import { formatGbpCompact } from "@/lib/format";
import { pipelineStore, usePipeline } from "@/lib/pipelineStore";
import { AcquirerForm } from "./AcquirerForm";
import { CsvImportPanel, downloadTemplate, exportTargets } from "./CsvPanel";
import { TargetsTable } from "./TargetsTable";

export function PipelineScreen() {
  const { acquirer, targets, hydrated, saveStatus } = usePipeline();
  const [showImport, setShowImport] = useState(false);

  const reset = () => {
    if (!window.confirm("Replace the current acquirer and targets with the sample data? This cannot be undone.")) return;
    pipelineStore.resetToSample();
  };

  const totalAsking = targets.reduce((s, t) => s + (t.askingPrice || 0), 0);
  const totalRevenue = targets.reduce((s, t) => s + (t.revenue || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            The acquirer profile and the restaurant targets under consideration. Edits save to this browser automatically.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={downloadTemplate}>CSV template</Button>
          <Button onClick={() => exportTargets(targets)} disabled={targets.length === 0}>Export CSV</Button>
          <Button onClick={() => setShowImport((v) => !v)} variant={showImport ? "primary" : "secondary"}>Import CSV</Button>
          <Button variant="danger" onClick={reset} title="Restore the fictional sample acquirer and targets">Reset to sample</Button>
        </div>
      </div>

      {!hydrated ? (
        <div className="rounded-lg border border-border bg-white p-10 text-center text-sm text-muted" role="status">
          Loading your saved pipeline…
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded border border-border bg-white px-3 py-2 text-xs text-muted">
            <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 font-medium text-foreground">Sample data</span>
            <span>All names and figures are fictional. Edit anything, import your own CSV, or use Reset to sample to start again.</span>
          </div>

          {showImport && <CsvImportPanel onClose={() => setShowImport(false)} />}

          <AcquirerForm acquirer={acquirer} />

          <Card
            title={
              <span>
                Targets <span className="num font-normal text-muted">({targets.length})</span>
              </span>
            }
            actions={
              <>
                <span className="text-xs text-muted">
                  Combined revenue <span className="num text-foreground">{formatGbpCompact(totalRevenue)}</span>
                  <span className="mx-2">·</span>
                  Total asking <span className="num text-foreground">{formatGbpCompact(totalAsking)}</span>
                  <span className="mx-2">·</span>
                  Capital <span className="num text-foreground">{formatGbpCompact(acquirer.capital)}</span>
                </span>
                <Button variant="primary" onClick={() => pipelineStore.addTarget()}>Add target</Button>
              </>
            }
          >
            <p className="mb-3 text-xs text-muted">
              Click any cell to edit; changes save when you leave the cell. Amber marks rent above 12% of revenue or a lease with under 2 years left.
            </p>
            <TargetsTable targets={targets} />
          </Card>

          <p className="text-xs text-muted" role="status">
            {saveStatus === "error"
              ? "Could not save to this browser's storage. Changes will be lost when you leave the page."
              : "Saved to this browser."}
          </p>
        </>
      )}
    </div>
  );
}
