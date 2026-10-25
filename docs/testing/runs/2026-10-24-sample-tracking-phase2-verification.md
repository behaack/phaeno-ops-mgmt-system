# Phase 2 sample-tracking verification — October 24, 2026

> Raw sample-tracking test outputs linked in this dated record were removed at the Owner's request after consolidation. The archived links now open the retained result/cleanup ledger; screenshots and raw files are no longer retained.

Owner scope: run Phase 2 regressions and browser acceptance, fix issues and report back. No deployment or DPS changes. This verifies the [capture-at-source implementation](2026-10-24-sample-tracking-phase2-implementation.md) and its [owning plan](../../plans/SAMPLE-TRACEABILITY-AND-INVESTIGATION-PLAN.md#phase-2--capture-at-source-october-24-2026).

## Final results

| Check | Result | Evidence |
| --- | --- | --- |
| Focused backend domain/PostgreSQL selection | **44 passed**, zero failed/skipped | [Archived receipt: TRX](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Focused frontend components/helpers | **16 passed**, zero failed/skipped | [Archived receipt: JUnit](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Connected desktop/phone × light/dark browser acceptance | **Four passed**, zero failed/skipped | [Archived receipt: Browser log](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: wrapper TRX](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Static/build checkpoint | Backend test build zero warnings/errors; TypeScript, scoped ESLint, UI guard, help freshness and whitespace checks pass | 767 guarded sources, two unchanged existing exceptions; 62 guides, `40fd4cc1d142` |

The xUnit browser wrapper is additional orchestration evidence for the four browser scenarios, not four more domain cases. Earlier diagnostic runs and the expanded-withdrawal rerun overlap the final counts. These are focused selections, not the complete application suites. Existing EF tool-version and browser color-environment advisories did not prevent checks; no runtime page errors occurred.

## What was verified

Backend selection includes `LabVendorRunCaptureTests`, `LabVendorResultSafetyTests`, `LabInvestigationScopeTests`, `LabInvestigationTests`, master-mix/reagent domain tests, preparation journeys, both investigation-coverage PostgreSQL cases, reagent-manufacturing capture and the FASTQ delivery/correction/withdrawal journey. It checks missing/duplicate/foreign/no-run mappings, actual times/windows, purchased-allocation separation, unchanged identities versus corrected provenance, sample-specific run/index privacy, frozen conditions, overwrite refusal, void/coverage limits and existing shared inventory attribution.

The reagent-manufacturing case now captures two withdrawals of one source across a supplier/QC edit. After a later QC failure, prepared-reagent use snapshots retain both original withdrawal IDs, and sample investigation includes both distinct frozen supplier/QC snapshots. Current source condition cannot replace them.

Every connected browser scenario:

1. Creates an independent synthetic scene with two samples, two verified file sets and two actual acquisitions under one vendor job. Anonymous/customer reads are refused with 401/403.
2. Opens the production vendor receipt form and verifies visible refusal for a missing actual-run reference and an incomplete supporting-document fingerprint.
3. Saves/reloads a draft, makes it stale through a bounded test-only concurrent update, and restarts through the actual recovery endpoint. Entries, exact saved UTC timestamp precision and unchanged output identities survive the notes-only save. The restart dialog has a body between header/footer, initial cancel focus, Escape focus return and focused recovery.
4. Uses a synthetic protected package to verify provenance correction refusal. After an explicit test-only package withdrawal, the corrected instrument saves with linked correction outputs; the other sample's inputs and original vendor version remain unchanged.
5. Reads actual mix and reagent pages, expands frozen withdrawal conditions after current QC/catalog/storage changes, and preserves an explicitly unknown historical withdrawal.
6. Reads three vendor versions in sample investigation, saves/downloads the real manifest, verifies its SHA-256 and checks that another sample's run/index is absent.

The selected axe WCAG 2/2.1/2.2 A/AA checks report no violations; all checked pages stay within the viewport at desktop and 320 px. Final [Archived receipt: browser screenshots](2026-10-24-sample-tracking-browser-acceptance-ledger.json) are retained; representative desktop/phone viewports were visually reviewed. They are run evidence, not newly accepted image-comparison references.

## Fixes and test-fixture corrections

The initial component run exposed an application feedback bug: the schema refused a missing run mapping, but React Hook Form stored the array-level explanation in `errors.runCaptures.root.message`; the UI displayed only `errors.runCaptures.message`. The capture section now displays either representation. The component suite and connected missing-reference/document-fingerprint checks pass after the fix. The existing guide already requires these fields, so no help-content change was needed for the feedback repair.

Test setup was corrected to receive specimens before accessioning and supply complete catalog identities. Saved run-row order is now handled with exact registered-field selectors. Each scenario uses unique synthetic analysis/package submission identities, preserving the existing uniqueness rules. A representative earlier [Archived receipt: fixture diagnostic](2026-10-24-sample-tracking-browser-acceptance-ledger.json) records the duplicate synthetic submission; the final matrix passes. One stuck locator run was stopped by identifying only its exact Phase 2 browser helper process tree. No application capture/release rule was weakened.

## Reproduction and isolation

Backend: `dotnet test backend/test/PSeq.Operations.Test.csproj --no-restore --filter <Phase 2 selection> --logger trx`, with `PSEQ_OPERATIONS_REFERENCE_CONNECTION` and the process-local default connection set only to disposable loopback database `phase2_verification_6e4261acb22245ddb36c7aeb32b73895`.

Frontend: `pnpm exec vitest run` on `vendor-run-capture.test.ts`, `IngredientSnapshot.test.tsx`, `VendorResultsWorkspacePage.test.tsx` and `SampleInvestigation.test.tsx`, using two workers.

Browser: opt-in `PSEQ_PHASE2_BROWSER_VERIFICATION=1` selects `Phase2CaptureBrowserUsesRealControllersAndFrozenEvidence`, which launches `pnpm exec playwright test --config playwright.sample-capture-phase2.config.ts --workers=1`. Vite runs on loopback port 3197 in an isolated test mode. The bounded Kestrel host uses real MVC controllers, envelopes/error middleware, domain rules and EF/PostgreSQL queries. Feature HTTP requests are forwarded to it; feature responses are not fabricated. Synthetic identities replace Clerk validation only in the test assembly/fixture. Preverified synthetic file receipts and direct synthetic package review states are deliberate test setup; the separate FASTQ PostgreSQL regression covers synthetic file upload/byte/scanner paths.

No application Program/hosted worker or DPS provider is started. Final wrapper assertions retain the original vendor snapshot text, unchanged physical source stock and unchanged assembly-command count. All fixture writes use the disposable database and roll back. The database was removed and absence verified; [Archived receipt: cleanup receipt](2026-10-24-sample-tracking-browser-acceptance-ledger.json). Task-owned workspace scratch files were removed after retaining the receipts and screenshots.

No configured development/hosted records, migration source, dependencies, production authentication, DPS source/runtime/contract, deployment holds or Git staging/commit changed during verification. Existing unrelated billing work remains outside this task. This is local synthetic connected feature acceptance, not hosted Clerk sign-in/full Job navigation, actual provider/storage/scanner qualification, Firefox/WebKit, full screen-reader acceptance, physical bench work, scientific validity or business sign-off. The scientific SOP items in the procedure review remain open as documented.
