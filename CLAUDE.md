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
Direction: a blend of Apple (restraint, whitespace), McKinsey (editorial authority) and
Uber Eats (high-contrast, bold, card-based). Borrow principles only: no logos, no
proprietary fonts or brand assets. Must suit a PE associate.

- **Type**: serif display for page and section headings (Newsreader from Google Fonts, via
  `--font-display`); body in system-ui (the native system font); numbers in a tabular
  monospace (`.num`). Large, confident headline sizes; generous line height.
- **Colour**: white and near-black base, off-white page background. Primary buttons are
  black pills with white text. One deep-blue accent (`accent`) for links, focus and chart
  lines. Green / amber / red are reserved ONLY for PURSUE / HOLD / PASS and risk flags;
  never for buttons, success messages or validation errors.
- **Layout**: lots of whitespace, few borders, 12-16px rounded cards (`rounded-xl` /
  `rounded-2xl`), soft shadows only where something needs to lift. Sticky header with a
  light frosted (backdrop blur) white background. Works on a laptop without horizontal
  scroll; wide tables scroll in their own box.
- **Headings are action titles** that state the conclusion, generated from the data, with a
  small plain label above (e.g. label "Pipeline", title "7 of 20 targets carry a rent or
  lease flag; 3 have data gaps"). Title logic lives in `/lib/headline.ts` as pure functions
  with tests.
- **Action-title rule**: a title may only state what the engine has actually computed at
  that stage. Before scoring (Pipeline), use factual counts such as risk flags and data
  gaps, never "fit", "best" or anything that implies a score or verdict. Once the
  acquisition lens has run (Verdicts onwards), titles may state scores, verdicts and the
  recommended set.
- **Exhibits**: charts and key tables are framed as "Exhibit N" with a one-line takeaway
  title and a source line underneath ("Source: seller data, Kitchen Corp analysis"). Use
  the shared `Exhibit` component.
- Target rows and cards carry a small cuisine tag, Uber Eats style.
