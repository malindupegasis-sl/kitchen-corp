"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui/inputs";
import { downloadText } from "@/lib/download";
import { pipelineStore, type ImportMode } from "@/lib/pipelineStore";
import { csvTemplate, parseTargetsCsv, targetsToCsv, type CsvImportResult } from "@/lib/targetCsv";
import type { Target } from "@/lib/types";

export function downloadTemplate() {
  downloadText("kitchen-corp-targets-template.csv", csvTemplate());
}

export function exportTargets(targets: Target[]) {
  downloadText("kitchen-corp-targets.csv", targetsToCsv(targets));
}

function rowsWithErrors(result: CsvImportResult): number {
  return new Set(result.errors.map((e) => e.row)).size;
}

export function CsvImportPanel({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [mode, setMode] = useState<ImportMode>("append");
  const [done, setDone] = useState<string | null>(null);

  const check = (csv: string) => {
    setText(csv);
    setDone(null);
    setResult(csv.trim() ? parseTargetsCsv(csv) : null);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    check(await file.text());
  };

  const doImport = () => {
    if (!result || result.targets.length === 0) return;
    pipelineStore.importTargets(result.targets, mode);
    const skipped = rowsWithErrors(result);
    setDone(
      `Imported ${result.targets.length} target${result.targets.length === 1 ? "" : "s"}` +
        (skipped ? `; ${skipped} row${skipped === 1 ? "" : "s"} skipped.` : "."),
    );
    setResult(null);
    setText("");
    setFileName(null);
  };

  return (
    <Card
      label="Import"
      title={
        done
          ? done
          : result
            ? `${result.targets.length} of ${result.rowCount} row${result.rowCount === 1 ? " is" : "s are"} ready to import`
            : "Check a CSV before it touches the pipeline"
      }
      actions={
        <>
          <Button variant="ghost" onClick={downloadTemplate}>Download template</Button>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <label className="block text-xs font-medium text-muted">
            Choose a .csv file
            <input
              type="file"
              accept=".csv,text/csv"
              className="mt-1.5 block w-full text-sm text-muted file:mr-3 file:rounded-full file:border file:border-line file:bg-surface file:px-3.5 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-fill"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          <div className="text-xs text-muted">or paste CSV text</div>
          <textarea
            className="h-32 w-full rounded-lg border border-transparent bg-fill p-3 font-mono text-xs outline-none focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20"
            placeholder={"name,type,cuisine,sites,zones,revenue,askingPrice\nExample Pizza Co,restaurant_group,pizza,3,Leeds; York,3100000,3400000"}
            value={text}
            onChange={(e) => {
              setFileName(null);
              check(e.target.value);
            }}
          />
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-xs font-medium text-muted">On import</span>
            <label className="inline-flex items-center gap-1.5">
              <input type="radio" name="import-mode" className="accent-foreground" checked={mode === "append"} onChange={() => setMode("append")} />
              Add to pipeline
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input type="radio" name="import-mode" className="accent-foreground" checked={mode === "replace"} onChange={() => setMode("replace")} />
              Replace pipeline
            </label>
          </div>
          <p className="text-[11px] leading-snug text-muted">
            Required columns: name, type, cuisine, sites, zones, revenue, askingPrice. Separate zones with semicolons.
            Rows with an existing id update that target; rows with errors are skipped.
          </p>
        </div>

        <div className="space-y-3">
          {done && (
            <div className="rounded-xl bg-fill px-4 py-3 text-sm" role="status">
              {done} The table below is up to date.
            </div>
          )}
          {!result && !done && (
            <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
              Choose or paste a CSV to check it before importing.
            </div>
          )}
          {result && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  {fileName && <span className="font-medium">{fileName}: </span>}
                  <span className="num">{result.rowCount}</span> row{result.rowCount === 1 ? "" : "s"},{" "}
                  <span className="num">{result.targets.length}</span> valid,{" "}
                  <span className="num font-semibold">{rowsWithErrors(result)}</span> with problems
                </div>
                <Button variant="primary" onClick={doImport} disabled={result.targets.length === 0}>
                  Import {result.targets.length} valid row{result.targets.length === 1 ? "" : "s"}
                </Button>
              </div>
              {result.errors.length > 0 && (
                <div className="max-h-64 overflow-auto rounded-xl border border-line">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-background text-left text-muted">
                      <tr>
                        <th className="px-2 py-1.5 font-medium">Row</th>
                        <th className="px-2 py-1.5 font-medium">Column</th>
                        <th className="px-2 py-1.5 font-medium">Problem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((e, i) => (
                        <tr key={i} className="border-t border-line">
                          <td className="num px-2 py-1.5 align-top">{e.row === 0 ? "—" : e.row}</td>
                          <td className="px-2 py-1.5 align-top font-mono">{e.column ?? "—"}</td>
                          <td className="px-2 py-1.5 align-top font-medium">{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
