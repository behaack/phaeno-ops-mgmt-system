# Full sample-tracking browser acceptance - October 24, 2026

Owner scope: run the full browser matrix for the latest fixes, repair issues and remove artifacts. No deployment or DPS changes.

## Final results

| Connected matrix | Desktop light | Desktop dark | 320px phone light | 320px phone dark |
| --- | --- | --- | --- | --- |
| Phase 1: shared attribution and investigation | Pass | Pass | Pass | Pass |
| Phase 2: source capture and frozen provenance | Pass | Pass | Pass | Pass |
| Phase 3: physical custody, storage, timing and mix equipment | Pass | Pass | Pass | Pass |
| Phase 4: independently restored chain, recovery and integrity | Pass | Pass | Pass | Pass |

**16 passed, zero final failures/skips/flaky retries.** The [consolidated verification ledger](2026-10-24-sample-tracking-browser-acceptance-ledger.json) retains exact scenario names, projects, durations, source hashes, preservation/cleanup receipts and hashes of removed raw files. The initial Phase 1 routing failure is recorded separately; overlapping executions are not additional distinct cases.

The browser uses actual MVC/controller/domain/PostgreSQL responses through test-only loopback hosts and synthetic identities. Phase 4 also passes its native restore, cleanup-failure/independent-repair and uncertain-creation probes, plus the actual held/closed Trial custody/report API regression. Those are API/recovery evidence, not additional browser scenarios. Hosted Clerk, actual provider/scanner/storage/physical work and scientific/business acceptance remain separate.

## Findings and fixes

- **Historical location display:** the retained placement locations were already in the backend/report snapshot but missing from the specimen's History and Processing lists. Both views now show their storage-location section using the existing evidence-list pattern. The focused component regression checks both surfaces and original shelf facts.
- **Phase 1 forwarding race:** replacing request handlers during view remount could try to fulfill an already handled route. The scenario now installs one handler per page, switches its bounded fixture mode and awaits in-flight forwarding before final teardown. Errors are not ignored. All four rerun variants pass.
- **Latest-fix acceptance:** Phase 3 now checks visible conflicts for late placement/return, unchanged custody/events after refusal, departed location context after later box movement, actual visible original room/freezer/rack/shelf, frozen mix-equipment conditions after retirement and the two exactly affected samples returned by an equipment search. Existing timing/review, holds, retention, collision, draft/focus, report checksum and sample-isolation checks continue to pass.

All matrices retain keyboard/focus, reduced-motion, selected axe accessibility and overflow assertions. Representative phone/light historical storage and desktop/dark frozen-equipment screenshots were manually inspected before removal; their hashes are in the ledger. No reviewed image baseline was changed.

Build succeeds with zero warnings/errors. The four focused investigation component cases, TypeScript, scoped ESLint, UI guard and help freshness checks pass (774 guarded sources, two unchanged exceptions; 62 guides, `c6b4c67bd74a`). Complete application suites were not rerun for this UI display/test-harness follow-up.

## Isolation and artifact cleanup

Each Phase 1-3 matrix uses a separately generated, migrated local database; explicit reference/default targets point there for its entire fixture lifetime. Phase 4 owns its generated source/restored databases and private roots. All 254 configured-development table fingerprints match the prior checkpoint before/after both matrix runs, including protected Website intake. No configured-development record change remains.

Independent readback confirms that all 81 manifested local test database identities from the retained historical/current artifacts are absent, all 23 recorded private roots are absent and browser-test ports 3196-3199 have stopped. The ledger preserves the current native recovery, Trial API and cleanup evidence, previous test counters and approved-procedure review inventory.

At the Owner's request, raw sample-tracking run directories, screenshots/traces/downloads/logs and task-owned scratch output are removed after consolidation. This cleanup excludes source fixtures, plans, reports, unrelated billing/DPS artifacts and shared development outputs. Historical report links are redirected to the retained ledger with an explicit cleanup notice rather than left broken. See the ledger's final cleanup status and byte/file counts.

Reproduce with [the guarded matrix runner](../../../scripts/verification/verify-sample-tracking-browser-matrix.ps1). It defaults to all four phases; `-Phases` selects eligible reruns. It creates fresh raw output, restores process settings and verifies development preservation; raw outputs should be consolidated/removed again after review. No deployment, Git mutation, dependency, schema migration, identity configuration or DPS source/runtime/contract change is included.
