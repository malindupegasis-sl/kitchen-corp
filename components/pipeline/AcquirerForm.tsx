"use client";

import { Card, Field, ListInput, NumberInput, Segmented, TextInput } from "@/components/ui/inputs";
import { pipelineStore } from "@/lib/pipelineStore";
import type { AcquirerProfile } from "@/lib/types";

export function AcquirerForm({ acquirer }: { acquirer: AcquirerProfile }) {
  const set = pipelineStore.setAcquirer;
  const isPe = acquirer.mode === "pe";

  return (
    <Card
      title="Acquirer profile"
      actions={
        <>
          <Segmented
            aria-label="Mode"
            value={acquirer.mode}
            onChange={(mode) => set({ mode })}
            options={[
              { value: "group", label: "Group", hint: "A multi-site restaurant group buying to grow" },
              { value: "pe", label: "PE", hint: "A PE firm buying restaurant businesses" },
            ]}
          />
          <Segmented
            aria-label="Strategy"
            value={acquirer.strategy}
            onChange={(strategy) => set({ strategy })}
            options={[
              { value: "densify", label: "Densify", hint: "Prefer targets in zones you already operate" },
              { value: "expand", label: "Expand", hint: "Prefer targets that open new zones" },
            ]}
          />
        </>
      }
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4 lg:grid-cols-6">
        <div className="col-span-2">
          <Field label="Name" htmlFor="acq-name">
            <TextInput id="acq-name" value={acquirer.name} onCommit={(name) => set({ name })} />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Cuisines" htmlFor="acq-cuisines" hint="Comma-separated">
            <ListInput id="acq-cuisines" value={acquirer.cuisines} onCommit={(cuisines) => set({ cuisines })} />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Zones" htmlFor="acq-zones" hint="Cities or areas you operate in, comma-separated">
            <ListInput id="acq-zones" value={acquirer.zones} onCommit={(zones) => set({ zones })} />
          </Field>
        </div>

        <Field label="Sites" htmlFor="acq-sites">
          <NumberInput id="acq-sites" value={acquirer.sites} min={0} integer onCommit={(v) => set({ sites: v ?? 0 })} />
        </Field>
        <Field label="Annual revenue (£)" htmlFor="acq-revenue">
          <NumberInput id="acq-revenue" value={acquirer.revenue} min={0} thousands onCommit={(v) => set({ revenue: v ?? 0 })} />
        </Field>
        <Field label="Kitchen utilisation (%)" htmlFor="acq-util">
          <NumberInput id="acq-util" value={acquirer.kitchenUtilisation} min={0} max={100} onCommit={(v) => set({ kitchenUtilisation: v ?? 0 })} />
        </Field>
        <Field label="Capital for deals (£)" htmlFor="acq-capital">
          <NumberInput id="acq-capital" value={acquirer.capital} min={0} thousands onCommit={(v) => set({ capital: v ?? 0 })} />
        </Field>
        <Field label="Year-3 revenue target (£)" htmlFor="acq-trev">
          <NumberInput id="acq-trev" value={acquirer.targetRevenue} min={0} thousands onCommit={(v) => set({ targetRevenue: v ?? 0 })} />
        </Field>
        <Field label="Year-3 EBITDA target (£)" htmlFor="acq-tebitda">
          <NumberInput id="acq-tebitda" value={acquirer.targetEbitda} min={0} thousands onCommit={(v) => set({ targetEbitda: v ?? 0 })} />
        </Field>
        <Field label="Integration capacity / yr" htmlFor="acq-cap" hint="Sum of integration load you can absorb each year">
          <NumberInput id="acq-cap" value={acquirer.integrationCapacityPerYear} min={0} onCommit={(v) => set({ integrationCapacityPerYear: v ?? 0 })} />
        </Field>

        {isPe && (
          <>
            <Field label="Hold period (years)" htmlFor="acq-hold">
              <NumberInput id="acq-hold" value={acquirer.peHoldYears} min={1} max={15} integer onCommit={(v) => set({ peHoldYears: v ?? 5 })} />
            </Field>
            <Field label="Exit multiple (x EBITDA)" htmlFor="acq-exit">
              <NumberInput id="acq-exit" value={acquirer.peExitMultiple} min={0} max={30} onCommit={(v) => set({ peExitMultiple: v ?? 6 })} />
            </Field>
          </>
        )}
      </div>
    </Card>
  );
}
