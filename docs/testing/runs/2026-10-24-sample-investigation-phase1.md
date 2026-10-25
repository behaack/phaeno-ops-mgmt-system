# Phase 1 sample investigation verification — October 24, 2026

> Raw sample-tracking test outputs linked in this dated record were removed at the Owner's request after consolidation. The archived links now open the retained result/cleanup ledger; screenshots and raw files are no longer retained.

Owner scope: run Phase 1 regression tests and browser acceptance, fix issues and report back. No deployment or DPS changes. This verifies the [shared-resource follow-up](../../plans/SAMPLE-TRACEABILITY-AND-INVESTIGATION-PLAN.md#shared-resource-attribution-and-investigation-coverage--october-24-2026), distinct from the original September phases.

## Result

| Check | Final result | Evidence |
| --- | --- | --- |
| Focused backend domain/PostgreSQL regressions | 23 passed, zero failed/skipped | [Archived receipt: TRX](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Final shared/tube equipment assertion added to the master-mix case | One overlapping case rerun and passed | [Archived receipt: TRX](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Component regressions | Four passed | `SampleInvestigation.test.tsx` |
| Browser connected to real local API/PostgreSQL | Four passed, zero skipped; xUnit wrapper also passed | [Archived receipt: Browser log](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: wrapper TRX](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Existing browser intercepted-response regressions | Four passed | [Archived receipt: Final status](2026-10-24-sample-tracking-browser-acceptance-ledger.json) and screenshots |
| Static checks | TypeScript, scoped ESLint, UI drift guard and documentation freshness passed | 763 guarded source files; two unchanged exceptions; 62 guides, hash `af2bd575b21f` |
| Build | Backend application/modules/test project compile without warnings/errors | Successful test invocations |

The final equipment rerun and the browser wrapper reuse cases in the backend selection; they are not additional distinct domain cases. The focused run is not the full backend/frontend suite. Test-host color-environment warnings were harmless; no browser runtime page errors occurred.

## Coverage established

- Saved member IDs, producing step record and pinned protocol determine shared/per-tube use. Excluded members, zero amounts, unknown quantities, skip/correction semantics and exact retry/master-mix identities are covered. Current tray contents do not invent historical membership.
- Actual mixed-Job preparation journeys show applicable resource evidence for both samples with one unchanged physical consumption/debit. Command-wide totals are labeled separately from recorded individual amounts; no proportional allocation is inferred.
- Prepared-reagent ancestry and master-mix ingredients support indirect lot searches. Actual PostgreSQL coverage checks zero dispensing, verified undispensed voids, and originating-organization scope. A batch instrument run is visible to covered samples; tube run references remain sample-specific, including when all use the same instrument. Another organization's samples stay out of related-sample results.
- Frozen sendout/library membership works without current batch members. All applicable vendor result versions, failure/run-not-performed outcomes and correction events are included. Other-library/member/file data and raw shared before-snapshots are excluded. Historical sample-anchored resource evidence without resolved shared coverage remains visible as legacy unknown.
- Source limits and unavailable/mismatched sources prevent complete-report generation. Newly saved reports include expanded evidence; existing saved bytes/checksums stay unchanged. The connected browser downloads the actual saved manifest and verifies its SHA-256 against the displayed checksum.
- Both History and Processing render the new evidence. Keyboard expansion, Actions Escape/focus return, desktop/320 px phone and light/dark themes pass. Selected axe WCAG 2/2.1/2.2 A/AA checks report no violations, and there is no horizontal page overflow. These automated checks do not establish full screen-reader conformance.

## Issues fixed

At 320 px, the investigation explanation was squeezed beside Reload. The header now stacks its text and Reload control on narrow screens while retaining the desktop arrangement. The connected browser asserts a useful explanation width and Reload below it; final viewport screenshots were visually reviewed. Test-only view navigation now uses shared Buttons with wrapping spacing.

Test scaffolding corrections supplied the required workflow constructor argument and unique fixture Job names. The initial duplicate-name fixture failure is retained in [Archived receipt: the earlier TRX](2026-10-24-sample-tracking-browser-acceptance-ledger.json); the corrected 23-case selection and final equipment rerun pass. No attribution defect was exposed by the executed regression selection.

## Execution and isolation

Backend selection: `LabInvestigationScopeTests`, `LabInvestigationTests`, both investigation-coverage PostgreSQL cases, `SampleShippingPostgresTests.Preparation*`, `ScientificWorkspaceScopesLibraries*`, `InvestigationHistoryScopesDelivery*` and `EvidenceGovernancePreservesReports*`. Tests were run with `dotnet test backend/test/PSeq.Operations.Test.csproj --no-restore --filter <selection> --logger trx` and the existing reference-connection setting pointed only at the disposable database.

Component command from `frontend`: `pnpm exec vitest run src/features/lab-operations/SampleInvestigation.test.tsx`.

The browser wrapper runs the main mixed-tray PostgreSQL journey with `PSEQ_PHASE1_BROWSER_VERIFICATION=1`. It starts a loopback Kestrel host with real controllers, envelope/error middleware and EF queries. Synthetic test identities replace external Clerk validation only inside the test assembly. The browser's feature requests are forwarded to this actual host; they are not fabricated feature responses. Vite runs an isolated fixture on port 3196. The real application, hosted workers, DPS and provider services are never started. Post-browser assertions compare physical lot/use bytes and verify that no assembly command was created.

Browser commands use `playwright.sample-investigation.config.ts`, one worker, with `e2e/sample-investigation.phase1-connected.spec.ts` through the wrapper and `e2e/sample-investigation.spec.ts` separately. Both run desktop Chromium and Chromium phone emulation in both themes. Final screenshots are under [Archived receipt: connected-browser](2026-10-24-sample-tracking-browser-acceptance-ledger.json) and [Archived receipt: fixture-browser](2026-10-24-sample-tracking-browser-acceptance-ledger.json); they are run evidence, not newly accepted comparison baselines. Existing September screenshots are preserved.

The disposable database `phase1_verification_a0e2e4794f534f3ba4dd3793f8d83486` was migrated using existing migrations, then removed and its absence verified. The configured development database, hosted databases, existing application sessions and PostgreSQL service were left intact. Task-owned temporary fixture files and scratch outputs were removed after preserving receipts/screenshots; see [Archived receipt: cleanup evidence](2026-10-24-sample-tracking-browser-acceptance-ledger.json).

## Boundaries

No deployment, DPS source/runtime change, persisted-model change, migration source, backfill, dependency, production-authentication change, staging or commit. Unrelated billing-plan work remains outside this task. Browser acceptance covers the real feature component and local persisted read/report path with synthetic identities/data; it does not cover hosted Clerk sign-in, full Job navigation, live provider/storage/scanner behavior, Firefox/WebKit, physical bench evidence, scientific validity or business sign-off. Ingredient-time condition snapshots and later capture phases remain deferred as planned.
