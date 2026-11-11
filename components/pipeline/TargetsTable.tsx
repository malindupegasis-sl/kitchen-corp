"use client";

import { Fragment } from "react";
import { CuisineTag, ListInput, NumberInput, SelectInput, TextInput } from "@/components/ui/inputs";
import { isLeaseFlagged, isRentFlagged, pipelineFlags } from "@/lib/flags";
import { pipelineStore } from "@/lib/pipelineStore";
import {
  LOCATION_TYPES,
  LOCATION_TYPE_LABELS,
  TARGET_TYPES,
  TARGET_TYPE_LABELS,
  type ChannelMix,
  type AggregatorSplit,
  type Target,
} from "@/lib/types";

const GROUPS: { label: string; cols: string[] }[] = [
  { label: "Target", cols: ["Name", "Type", "Cuisine", "Sites", "Zones", "Location"] },
  { label: "Financials (£, %)", cols: ["Revenue", "Growth", "LFL", "EBITDA mgn", "Overhead"] },
  { label: "Unit economics (%)", cols: ["Food", "Labour"] },
  { label: "Lease", cols: ["Rent %", "Yrs left", "Break"] },
  { label: "Channel mix (%)", cols: ["Dine-in", "Delivery", "Takeaway"] },
  { label: "Aggregators (% of delivery)", cols: ["Uber", "Deliveroo", "Just Eat"] },
  { label: "Quality", cols: ["Rating", "Site min", "Site max", "Covers", "Brand"] },
  { label: "Deal", cols: ["Asking (£)", "Int. load", "Notes"] },
  { label: "", cols: ["Flags", ""] },
];

const th = "px-2 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted whitespace-nowrap";
const td = "px-1 py-1 align-middle";
const sep = "border-l border-line";

export function TargetsTable({ targets }: { targets: Target[] }) {
  const update = pipelineStore.updateTarget;

  const remove = (t: Target) => {
    if (t.name && !window.confirm(`Remove "${t.name}" from the pipeline?`)) return;
    pipelineStore.removeTarget(t.id);
  };

  const setMix = (t: Target, key: keyof ChannelMix, v: number | undefined) => {
    const mix: ChannelMix = t.channelMix ?? { dineIn: 0, delivery: 0, takeaway: 0 };
    update(t.id, { channelMix: { ...mix, [key]: v ?? 0 } });
  };
  const setAgg = (t: Target, key: keyof AggregatorSplit, v: number | undefined) => {
    const agg: AggregatorSplit = t.aggregatorSplit ?? { uber: 0, deliveroo: 0, justEat: 0 };
    update(t.id, { aggregatorSplit: { ...agg, [key]: v ?? 0 } });
  };

  if (targets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-muted">
        No targets yet. Add one, import a CSV, or reset to the sample data.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl">
      <table className="min-w-max border-collapse text-sm">
        <thead>
          <tr>
            {GROUPS.map((g, i) => (
              <th
                key={i}
                colSpan={g.cols.length}
                className={`${th} border-b border-line ${i > 0 ? sep : ""} ${i === 0 ? "sticky left-0 z-20 bg-surface" : ""}`}
              >
                {g.label}
              </th>
            ))}
          </tr>
          <tr>
            {GROUPS.map((g, gi) =>
              g.cols.map((c, ci) => (
                <th
                  key={`${gi}-${ci}`}
                  className={`${th} border-b border-line ${ci === 0 && gi > 0 ? sep : ""} ${gi === 0 && ci === 0 ? "sticky left-0 z-20 bg-surface" : ""}`}
                >
                  {c}
                </th>
              )),
            )}
          </tr>
        </thead>
        <tbody>
          {targets.map((t) => {
            const flags = pipelineFlags(t);
            const rentFlag = isRentFlagged(t);
            const leaseFlag = isLeaseFlagged(t);
            const amber = "bg-amber-50";
            return (
              <tr key={t.id} className="border-b border-line last:border-b-0 hover:bg-fill/60">
                {/* Target */}
                <td className={`${td} sticky left-0 z-10 bg-surface pl-2`}>
                  <div className="flex items-center gap-2">
                    <TextInput variant="cell" className="w-40 font-medium" value={t.name} placeholder="Target name" aria-label="Name" onCommit={(name) => update(t.id, { name })} />
                    <CuisineTag cuisine={t.cuisine} />
                  </div>
                </td>
                <td className={td}>
                  <SelectInput variant="cell" className="w-36" value={t.type} options={TARGET_TYPES} labels={TARGET_TYPE_LABELS} aria-label="Type" onChange={(type) => update(t.id, { type })} />
                </td>
                <td className={td}>
                  <TextInput variant="cell" className="w-28" value={t.cuisine} aria-label="Cuisine" onCommit={(cuisine) => update(t.id, { cuisine })} />
                </td>
                <td className={td}>
                  <NumberInput variant="cell" className="w-14" value={t.sites} min={1} integer aria-label="Sites" onCommit={(v) => update(t.id, { sites: v ?? 1 })} />
                </td>
                <td className={td}>
                  <ListInput variant="cell" className="w-44" value={t.zones} aria-label="Zones" onCommit={(zones) => update(t.id, { zones })} />
                </td>
                <td className={`${td} border-r border-line`}>
                  <SelectInput variant="cell" className="w-36" value={t.locationType} options={LOCATION_TYPES} labels={LOCATION_TYPE_LABELS} allowEmpty aria-label="Location type" onChange={(locationType) => update(t.id, { locationType })} />
                </td>

                {/* Financials */}
                <td className={td}>
                  <NumberInput variant="cell" className="w-28" value={t.revenue} min={0} thousands aria-label="Revenue" onCommit={(v) => update(t.id, { revenue: v ?? 0 })} />
                </td>
                <td className={td}>
                  <NumberInput variant="cell" className="w-16" value={t.growthPct} allowEmpty aria-label="Growth %" onCommit={(growthPct) => update(t.id, { growthPct })} />
                </td>
                <td className={td}>
                  <NumberInput variant="cell" className="w-16" value={t.lflGrowthPct} allowEmpty aria-label="Like-for-like growth %" onCommit={(lflGrowthPct) => update(t.id, { lflGrowthPct })} />
                </td>
                <td className={td}>
                  <NumberInput variant="cell" className="w-16" value={t.ebitdaMarginPct} allowEmpty aria-label="EBITDA margin %" onCommit={(ebitdaMarginPct) => update(t.id, { ebitdaMarginPct })} />
                </td>
                <td className={`${td} border-r border-line`}>
                  <NumberInput variant="cell" className="w-24" value={t.overheadCost} min={0} allowEmpty thousands aria-label="Overhead cost" onCommit={(overheadCost) => update(t.id, { overheadCost })} />
                </td>

                {/* Unit economics */}
                <td className={td}>
                  <NumberInput variant="cell" className="w-14" value={t.foodCostPct} min={0} max={100} allowEmpty aria-label="Food cost %" onCommit={(foodCostPct) => update(t.id, { foodCostPct })} />
                </td>
                <td className={`${td} border-r border-line`}>
                  <NumberInput variant="cell" className="w-14" value={t.labourCostPct} min={0} max={100} allowEmpty aria-label="Labour cost %" onCommit={(labourCostPct) => update(t.id, { labourCostPct })} />
                </td>

                {/* Lease */}
                <td className={`${td} ${rentFlag ? amber : ""}`} title={rentFlag ? flags.find((f) => f.code === "high_rent")?.reason : undefined}>
                  <NumberInput variant="cell" className={`w-14 ${rentFlag ? "text-amber-800 font-medium" : ""}`} value={t.rentPctRevenue} min={0} max={100} allowEmpty aria-label="Rent % of revenue" onCommit={(rentPctRevenue) => update(t.id, { rentPctRevenue })} />
                </td>
                <td className={`${td} ${leaseFlag ? amber : ""}`} title={leaseFlag ? flags.find((f) => f.code === "short_lease")?.reason : undefined}>
                  <NumberInput variant="cell" className={`w-14 ${leaseFlag ? "text-amber-800 font-medium" : ""}`} value={t.leaseYearsRemaining} min={0} allowEmpty aria-label="Lease years remaining" onCommit={(leaseYearsRemaining) => update(t.id, { leaseYearsRemaining })} />
                </td>
                <td className={`${td} border-r border-line text-center`}>
                  <input type="checkbox" className="accent-foreground" checked={t.hasBreakClause} aria-label="Has break clause" onChange={(e) => update(t.id, { hasBreakClause: e.target.checked })} />
                </td>

                {/* Channel mix */}
                {(["dineIn", "delivery", "takeaway"] as const).map((k, i) => (
                  <td key={k} className={`${td} ${i === 2 ? "border-r border-line" : ""}`}>
                    <NumberInput variant="cell" className="w-14" value={t.channelMix?.[k]} min={0} max={100} allowEmpty aria-label={`${k} %`} onCommit={(v) => setMix(t, k, v)} />
                  </td>
                ))}

                {/* Aggregators */}
                {(["uber", "deliveroo", "justEat"] as const).map((k, i) => (
                  <td key={k} className={`${td} ${i === 2 ? "border-r border-line" : ""}`}>
                    <NumberInput variant="cell" className="w-14" value={t.aggregatorSplit?.[k]} min={0} max={100} allowEmpty aria-label={`${k} %`} onCommit={(v) => setAgg(t, k, v)} />
                  </td>
                ))}

                {/* Quality */}
                <td className={td}>
                  <NumberInput variant="cell" className="w-14" value={t.rating} min={0} max={5} allowEmpty aria-label="Rating" onCommit={(rating) => update(t.id, { rating })} />
                </td>
                <td className={td}>
                  <NumberInput variant="cell" className="w-14" value={t.siteRatingMin} min={0} max={5} allowEmpty aria-label="Site rating min" onCommit={(siteRatingMin) => update(t.id, { siteRatingMin })} />
                </td>
                <td className={td}>
                  <NumberInput variant="cell" className="w-14" value={t.siteRatingMax} min={0} max={5} allowEmpty aria-label="Site rating max" onCommit={(siteRatingMax) => update(t.id, { siteRatingMax })} />
                </td>
                <td className={td}>
                  <NumberInput variant="cell" className="w-14" value={t.covers} min={0} integer allowEmpty aria-label="Covers" onCommit={(covers) => update(t.id, { covers })} />
                </td>
                <td className={`${td} border-r border-line`}>
                  <NumberInput variant="cell" className="w-12" value={t.brandScore} min={1} max={5} integer allowEmpty aria-label="Brand score (judgement input)" onCommit={(brandScore) => update(t.id, { brandScore })} />
                </td>

                {/* Deal */}
                <td className={td}>
                  <NumberInput variant="cell" className="w-28" value={t.askingPrice} min={0} thousands aria-label="Asking price" onCommit={(v) => update(t.id, { askingPrice: v ?? 0 })} />
                </td>
                <td className={td}>
                  <NumberInput variant="cell" className="w-14" value={t.integrationLoad} min={0} max={10} aria-label="Integration load" onCommit={(v) => update(t.id, { integrationLoad: v ?? t.integrationLoad })} />
                </td>
                <td className={`${td} border-r border-line`}>
                  <TextInput variant="cell" className="w-64" value={t.notes} aria-label="Notes" onCommit={(notes) => update(t.id, { notes })} />
                </td>

                {/* Flags + actions */}
                <td className={`${td} whitespace-nowrap`}>
                  {flags.length === 0 ? (
                    <span className="text-xs text-muted">—</span>
                  ) : (
                    <span className="inline-flex gap-1">
                      {flags.map((f) => (
                        <Fragment key={f.code}>
                          <span title={f.reason} className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                            {f.label}
                          </span>
                        </Fragment>
                      ))}
                    </span>
                  )}
                </td>
                <td className={`${td} pr-2`}>
                  <button type="button" onClick={() => remove(t)} className="rounded-full px-2.5 py-1 text-xs text-muted hover:bg-fill hover:text-foreground" aria-label={`Remove ${t.name || "target"}`}>
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
