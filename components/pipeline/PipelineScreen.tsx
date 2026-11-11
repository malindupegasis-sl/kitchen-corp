"use client";

import { useState } from "react";
import { PageHeading } from "@/components/PageShell";
import { Exhibit } from "@/components/ui/Exhibit";
import { Button } from "@/components/ui/inputs";
import { formatGbpCompact } from "@/lib/format";
import { pipelineHeadline, pipelineSubtitle, targetsExhibitTitle } from "@/lib/headline";
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
    <div className="space-y-8">
      <PageHeading
        label="Pipeline"
        title={hydrated ? pipelineHeadline(targets) : "Loading your saved pipeline"}
        description={hydrated ? pipelineSubtitle(targets) : undefined}
        actions={
          <>
            <Button variant="ghost" onClick={downloadTemplate}>CSV template</Button>
            <Button variant="ghost" onClick={() => exportTargets(targets)} disabled={targets.length === 0}>Export CSV</Button>
            <Button variant={showImport ? "primary" : "secondary"} onClick={() => setShowImport((v) => !v)}>Import CSV</Button>
            <Button variant="secondary" onClick={reset} title="Restore the fictional sample acquirer and targets">Reset to sample</Button>
          </>
        }
      />

      {!hydrated ? (
        <div className="rounded-2xl bg-surface p-14 text-center text-sm text-muted" role="status">
          Loading your saved pipeline…
        </div>
      ) : (
        <>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-0.5 font-medium text-foreground">Sample data</span>
            <span>All names and figures are fictional. Edit anything, import your own CSV, or use Reset to sample to start again.</span>
          </p>

          {showImport && <CsvImportPanel onClose={() => setShowImport(false)} />}

          <AcquirerForm acquirer={acquirer} />

          <Exhibit
            number={1}
            title={targetsExhibitTitle(acquirer, targets)}
            note="Amber marks rent above 12% of revenue or a lease with under 2 years left; a grey pill lists missing fields. Click any cell to edit; it saves when you leave the cell."
            actions={
              <>
                <span className="mr-2 text-xs text-muted">
                  <span className="num">{targets.length}</span> targets
                  <span className="mx-2">·</span>
                  revenue <span className="num text-foreground">{formatGbpCompact(totalRevenue)}</span>
                  <span className="mx-2">·</span>
                  asking <span className="num text-foreground">{formatGbpCompact(totalAsking)}</span>
                  <span className="mx-2">·</span>
                  capital <span className="num text-foreground">{formatGbpCompact(acquirer.capital)}</span>
                </span>
                <Button variant="primary" onClick={() => pipelineStore.addTarget()}>Add target</Button>
              </>
            }
          >
            <TargetsTable targets={targets} />
          </Exhibit>

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
