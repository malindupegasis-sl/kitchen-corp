# Kitchen Corp

## What this is
Kitchen Corp is acquisition intelligence for buyers of restaurants: UK multi-site restaurant
groups and PE firms acquiring restaurant businesses. The tool ranks a pipeline of restaurant
targets and picks the best COMBINATION to buy (not just the best individual targets), then a
Kitchen Corp specialist reviews and signs off the recommendation.

Restaurants only. No virtual brands or dark kitchens as targets.

## Users and modes
- **Group mode**: a multi-site restaurant group buying to grow. Outputs: payback, new zones,
  new cuisines, kitchen utilisation.
- **PE mode**: a PE firm buying restaurant businesses. Outputs: equity in, exit value
  (year-N EBITDA x exit multiple), MOIC, IRR.
Same engine for both; only the outcome tiles differ.

## Screens
1. **Pipeline**: acquirer profile + editable targets table, CSV template and import.
2. **Verdicts**: PURSUE / HOLD / PASS cards, ranked, each with top 3 reasons, "what would
   change the call", diligence questions, and specialist review status.
3. **Plan**: buying sequence by year, bear/base/bull projection with editable assumptions,
   gap to target, mode-specific outcome tiles.
4. **Brief**: one-page signed recommendation, exportable to PDF.

## Engineering rules
- Next.js (App Router) + TypeScript + Tailwind. Vitest for tests.
- All logic runs client-side. No database or auth in v1; persist to localStorage with
  try/catch; CSV import/export.
- ALL scoring logic lives in `/lib/engine` as pure functions with Vitest tests. UI never
  computes scores itself.
- Scoring is structured as pluggable **lenses** (see PLAN.md). Only the "acquisition" lens
  exists in v1. Shared signals go in `/lib/engine/signals`. Benchmarks live in
  `/data/benchmarks.ts`, never hard-coded in scoring.
- Every score, verdict and projection must show plain-English reasons and the assumptions
  behind it. No black-box numbers.
- Sample data is fictional and must be labelled "Sample data" in the UI.

## Language
- Say "annual revenue" or "run-rate", never "ARR".
- Verdicts are PURSUE / HOLD / PASS, never go / no-go.
- UK spelling and GBP (£).

## Design
Serious, clean, suitable for a PE associate. Dark header, off-white background, one navy
accent, semantic green/amber/red only for verdicts and risk flags. Numbers in a monospace,
tabular font. Must work on a laptop without horizontal scroll; wide tables scroll in their
own box.
