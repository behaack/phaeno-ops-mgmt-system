# Graphical workflow progress review — October 5, 2026

Scope: shared graphical sequencing send-out and Customer/Partner shipping
progress, phase sample completion counts, single-phase Progress header Actions,
smaller semibold sample fractions and smaller circles/icons. No operational
records were created or changed for this presentation review.

## Completed checks

- Full frontend TypeScript check passed.
- Scoped ESLint passed for the shared tracker and touched sequencing/order
  components, stage calculation and authored count regression.
- Help generation and freshness check passed: 56 guides, corpus `1fcbe16fb9a6`.
- `git diff --check` passed. Existing Windows line-ending notices remain.
- Read-only local sequencing records showed six recorded completed stages on the
  six-library send-out; a historical closed record retained three recorded stages
  and unrecorded event/outcome evidence without inferred success.
- An isolated preview rendered the actual Customer shipping and Progress
  components with synthetic fixtures. Its API adapter blocked all application
  requests. It was not an authenticated Customer acceptance run.
- Mixed cohort: seven sequencing and three ready for preparation produced
  completed counts `10, 7, 0, 0, 0, 0`, with only Received checked and seven samples
  explicitly in sequencing. Eight awaiting release/two delivered retained five
  checks and `2 of 10` Results available; ten delivered produced all six checks.
- Partial kit receipt retained the Receive task, its partial status and receipt
  command, without completing preparation or dispatch. The request modal opened
  and was closed without submission.
- Desktop layout at 1200 CSS pixels displayed four/six horizontal stages. Phone
  layout at 320 CSS pixels displayed vertical stages without horizontal overflow.
  Light and isolated dark theme presentations were inspected without changing
  the user's appearance preference.
- The actual single-phase LabPhasesPanel preview showed one eligible Actions
  control at the trailing Progress header, no timing-row duplicate, and aligned
  header/button top coordinates at desktop and phone widths.
- Keyboard Enter opened the cancellation menu; Escape returned to Actions. The
  retained cancellation reason form opened and Cancel returned to the surviving
  header Actions control. Menu labeling resolves to that trigger; one chevron
  remains visible.
- Computed sample fractions are 12px / weight 600; circles are 40px and stage
  icons 16px. Connectors remain aligned in both orientations.

## Evidence and boundaries

Saved desktop preview: `customer-progress-refined.jpg`. Saved phone/dark preview:
`customer-progress-refined-mobile.jpg`. Both are in the task's local visualization
directory `C:/Users/bhaac/.codex/visualizations/2026/10/05/01a10a62-1fae-7602-993d-1cef04d1c4e6/`.
These screenshots use synthetic display data, not physical or scientific evidence.

Automated test suites were not run under the repository's request-only rule.
The count regression is authored. Source review covers empty/unknown/cancelled
cohorts and the existing scientific-release boundaries; it does not constitute
connected Customer, vendor, physical laboratory or final business acceptance.

The temporary preview tab/server, three preview files and isolated cache were
removed after review; the temporary browser viewport override was reset. The
existing Portal/API development sessions and saved histories were preserved.
No Git mutations, deployment, dependencies, API contract or persisted model change.
