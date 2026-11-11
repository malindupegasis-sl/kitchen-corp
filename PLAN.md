# Kitchen Corp build plan

Work one phase at a time. Paste the phase prompt into Claude Code. Do not start the next
phase until the "Done when" check works. Screenshots of the design screens (Pipeline,
Verdicts, Plan, Brief) can be pasted in with "match this layout".

---

## Phase 0: Setup
**Prompt**
```
Read CLAUDE.md and PLAN.md. Create a Next.js (App Router) + TypeScript + Tailwind project in
this folder called kitchen-corp. Set up Vitest with one passing sample test. Add a shared
layout with a dark header (logo "KC", name "Kitchen Corp", nav: Pipeline, Verdicts, Plan,
Brief, and a "Sample data" chip) and four empty pages. Commit.
```
**Done when**: `npm run dev` shows the four pages with working nav, and `npm test` passes.

---

## Phase 1: Data model and Pipeline screen
**Prompt**
```
In /lib/types.ts define:
- AcquirerProfile: mode ('group'|'pe'), name, cuisines[], zones[], sites, revenue,
  kitchenUtilisation, capital, targetRevenue, targetEbitda, integrationCapacityPerYear,
  strategy ('densify'|'expand'), peHoldYears, peExitMultiple.
- Target: id, name, type ('restaurant_group'|'single_site'|'franchise'), cuisine, sites,
  zones[], revenue, growthPct, lflGrowthPct, ebitdaMarginPct, foodCostPct, labourCostPct,
  rentPctRevenue, leaseYearsRemaining, hasBreakClause, channelMix {dineIn, delivery,
  takeaway} (%), aggregatorSplit {uber, deliveroo, justEat} (%), rating, siteRatingMin,
  siteRatingMax, covers, locationType ('high_street'|'retail_park'|'transport_hub'|
  'shopping_centre'), overheadCost, integrationLoad (default by type: restaurant_group 3,
  single_site 1, franchise 2), askingPrice, brandScore (1-5), notes.
Create /data/sample.ts: one fictional acquirer (Northside Burger Co: 12 sites, Manchester
and Liverpool, burgers and wings, £18m revenue, £5m capital, £30m year-3 target, capacity 2
deals/yr, strategy expand) and 20 fictional UK restaurant targets with deliberate cuisine
and zone overlaps, some short leases (<2 yrs), some rent >12% of revenue, a range of ratings.
Build the Pipeline page: acquirer profile form, group/PE toggle, strategy toggle, editable
targets table (add, remove, edit rows), amber flags for rent >12% and lease <2 yrs.
Add a downloadable CSV template (headers + one example row) and CSV import with row-level
validation errors. Persist to localStorage. Load sample data on first visit; add Reset.
```
**Done when**: you can edit a target, refresh, and see the change kept; a bad CSV row shows a clear error.

---

## Phase 2: Standalone scoring (acquisition lens)
**Prompt**
```
Structure scoring as pluggable lenses. A Lens has: id, name, question, requiredFields,
weights, scoreTarget(target, context) and verdict rules. Implement only the "acquisition"
lens now. Put reusable signals (unit-economics consistency, site rating spread, kitchen
utilisation, delivery vs benchmark, lease risk) in /lib/engine/signals. Put benchmark values
(e.g. benchmark EV/EBITDA 6x, healthy rent <10% of revenue) in /data/benchmarks.ts.

Acquisition lens standalone score 0-100 with components:
- financial: growth, like-for-like growth, EBITDA margin
- unitEconomics: food cost %, labour cost %
- lease: years remaining, rent % of revenue, break clause
- delivery: rating (4.6+ strong, <4.2 weak), site rating spread (>0.4 is a risk),
  platform concentration (>70% on one aggregator is a risk), delivery share (low = upside)
- price: asking price / EBITDA vs benchmark
- brand: brandScore, default weight 5%, labelled "judgement input"
Weights adjustable via sliders. Every target gets top 3 plain-English reasons and 3-5
diligence questions generated from its weakest components.
Vitest tests for edge cases: zero or negative EBITDA, missing fields, expired lease.
Show the score and reasons on the Pipeline table.
```
**Done when**: tests pass and every target shows a score with three readable reasons.

---

## Phase 3: Combination engine, optimiser and Verdicts screen
**Prompt**
```
In /lib/engine/combination.ts implement effects between targets, and between each target
and the acquirer:
- cannibalisation: same cuisine AND overlapping zone (penalty)
- zone fit: bonus for new zones if strategy='expand', for shared zones if 'densify'
- synergies: central production kitchen (food cost reduction for same-cuisine clusters),
  procurement saving (% of food cost, grows with basket size), shared head office
  (% of target overheadCost), delivery uplift for targets with delivery share <20%
- cuisine breadth: small bonus for distinct cuisines in the basket
In /lib/engine/optimise.ts pick the subset maximising standalone value + combination
effects, subject to sum(askingPrice) <= capital and sum(integrationLoad) per year <=
integrationCapacityPerYear over a 3-year horizon. Exhaustive search in a Web Worker if
n <= 20; otherwise greedy pick + swap local search.
Verdicts: PURSUE (selected), HOLD (standalone >= 60 but excluded: say whether budget,
overlap or capacity, and what would flip it), PASS (standalone < 60).
Build the Verdicts page: summary strip (capital used, counts, revenue vs target, review
progress), filter pills, ranked cards with verdict pill, standalone score, combination
effect, top 3 reasons, "what would change it", diligence questions.
Specialist review per target: notes, "concerns not in the data", status
(Draft/Reviewed/Recommended), reviewer name. Persist it.
Tests: overlap lowers selection; budget and capacity respected; densify vs expand changes
the picks.
```
**Done when**: a strong burger target overlapping the acquirer's zones comes out HOLD, and flips to PURSUE in densify mode.

---

## Phase 3b: File drop (internal tool first)
**Prompt**
```
Add a file drop zone per target (PDF, XLSX, CSV). Send files to the Claude API to extract
target fields, starting with site-level P&L fields (revenue, food cost, labour cost, rent,
EBITDA). Each extracted value stores its source (file + page/sheet) and a confidence level.
Low-confidence or missing values are flagged for manual confirmation before scoring.
Add a "Missing data" view listing gaps per target. API key comes from an env variable,
never the client bundle.
```
**Done when**: dropping one sample P&L fills that target's row, with each value showing where it came from.

---

## Phase 4: Plan screen
**Prompt**
```
Build the Plan page from the optimiser output:
- buying sequence by year, respecting integration capacity; order by value and strategic
  unlock (e.g. two deals in a new city in the same year)
- combined revenue and EBITDA, today to year 3, under bear/base/bull. Editable assumptions:
  share of target growth kept, synergy ramp per year, procurement saving, delivery uplift,
  integration cost per deal. Show every assumption next to the number it drives.
- gap to targetRevenue/targetEbitda per scenario, plus one plain-English takeaway saying
  which assumption the gap depends on most
- group mode tiles: year-3 revenue, year-3 EBITDA, payback, gap to target
- PE mode tiles: equity in, exit value (EBITDA x exit multiple at hold year), MOIC, IRR
Line chart with the selected scenario highlighted and the target as a dashed line.
```
**Done when**: changing an assumption moves the chart and tiles, and the takeaway text updates.

---

## Phase 5: Brief and ship
**Prompt**
```
Build the Brief page: a one-page recommendation (summary, the set with year/price/main
reason, year-3 outlook bear/base/bull, not recommended with reasons, key risks, specialist
notes, reviewer sign-off). Add PDF export. Polish the design for a PE audience, check it
works on a laptop without horizontal scroll, deploy to Vercel, and write DEMO.md: a
2-minute demo script (what to click, what to say).
```
**Done when**: you can send someone a live link and walk through the demo in two minutes.

---

## Future lenses (not in v1)
Same pipeline data, different question. Build only after the acquisition lens has paying
clients. Each engagement's data is stored anonymised to grow `/data/benchmarks.ts`; that
benchmark dataset is the long-term moat.

| Lens | Question | Key signals |
|---|---|---|
| Multi-brand capacity (first) | Can this operator run extra brands from its kitchens? | Kitchen utilisation, off-peak capacity, menu complexity, delivery ratings, ops discipline |
| Delivery upside (first) | How much is this business leaving on delivery? | Delivery share vs benchmark, platform coverage, ratings, commission terms |
| Franchise readiness | Can this brand be copied by other operators? | Margin and rating consistency across sites, documented processes, founder dependence, brand strength |
| Expansion whitespace | Where should this brand open next? | Current zones, cuisine gaps by area, competitor density |
| Exit readiness | What would a buyer pay, and what lowers it? | The acquisition lens run from the seller's side |

## Open decisions
- Default strategy per mode (proposed: expand for PE, densify for groups). Validate with operators.
- Pricing model (per engagement vs retainer). Validate in the first 5 conversations.
