# Sample-tracking review corrections — October 24, 2026

> Raw sample-tracking test outputs linked in this dated record were removed at the Owner's request after consolidation. The archived links now open the retained result/cleanup ledger; screenshots and raw files are no longer retained.

Owner scope: fix all three review findings. No deployment or DPS changes. This follows the [Phase 4 verification](2026-10-24-sample-tracking-phase4-regression-and-browser-verification.md) and the [review-correction scope](../../plans/SAMPLE-TRACKING-PHASE4-VALIDATION-PLAN.md#review-corrections).

## Results

| Check | Final result | Evidence |
| --- | --- | --- |
| Focused backend selection | **41 passed**, zero failed/skipped | [Archived receipt: TRX](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: log](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Real HTTP Trial custody and late-entry history | Closed-Trial return/destruction, held storage moves, retained guards and four late/out-of-order history cases pass | [Archived receipt: HTTP receipt](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: Trial database removal](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Cleanup fault qualification | Seven unit cases plus actual disposable-database capture/cleanup failure and independent repair pass | [Archived receipt: Intentional failed cleanup](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: failed-run receipt](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: successful repair/absence](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Connected browser matrix | **Four passed**, zero failed/skipped; wrapper also passes | [Archived receipt: Browser log](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: structured results](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: wrapper TRX](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Native restore and preservation | 254 tables/940 fixture rows/three stored objects match; original storage offline; original report/stock/use unchanged | [Archived receipt: Restore](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: browser preservation](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Build and static checks | Final backend build has zero warnings/errors; scoped browser ESLint, help freshness and whitespace checks pass | 62 guides, hash `ef31eed68163` |
| Isolation and cleanup | All configured-development table fingerprints remain unchanged, including protected Website intake; owned fixtures removed | [Archived receipt: Combined preservation](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: final cleanup](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |

The 41-case selection comprises the prior 33 cases, seven cleanup unit cases and one real-HTTP regression containing both Trial dispositions and four history projections. Subcases, the browser wrapper and overlapping runs are not additional distinct backend cases. The full application suites were not run. Frontend application code did not change; the previous 15 frontend cases remain dated prior evidence. Sixteen final browser screenshots are retained. Hosted, actual provider/physical/scientific acceptance remains open in the [crosswalk](../../plans/SAMPLE-TRACKING-PHASE4-ACCEPTANCE.md).

The [Archived receipt: source manifest](2026-10-24-sample-tracking-browser-acceptance-ledger.json) records the reviewed file hashes and final browser test assembly. A final independent [Archived receipt: native readback](2026-10-24-sample-tracking-browser-acceptance-ledger.json) confirms none of the 15 manifested database identities or seven private roots remains and the temporary acceptance host has stopped. This readback is read-only; failed-run fixtures were already removed by guarded cleanup or the negative probe's separate repair.

## Fixes

1. **Trial custody through MVC.** `TrialWorkGuard` recognizes only `LabOperationsController.RecordPhysicalContainer` and `MoveContainer` as physical custody operations by actual controller/action metadata. They remain authorized by the controller and retain frozen Trial terms, closure/retention, holds and active-work checks. Other actions remain under the existing Trial work restriction. The HTTP regression proves return/destruction succeed after closure, storage/preservation remains recordable while held, Customer denial stays enforced, and a non-custody write is rejected and rolled back. Missing tracking and wrong destinations still fail.
2. **Actual-time storage history.** Box-movement applicability resolves occupancy using `OccurredAtUtc`, with recording time/identity as deterministic tie-breakers. Late return/destruction cannot attach moves after departure; late placement includes intervening applicable moves; entry order cannot replace actual handling order. Original recording timestamps/order remain audit evidence, and unrelated box movements remain excluded. Existing saved manifests are not rewritten; a new report captures the corrected live projection.
3. **Failure-safe recovery cleanup.** Ownership/intended identities are written before setup and updated as resources are created. Each known database cleanup opens its own connection; a failure cannot skip another database, private files or preservation readback. Process targets are restored before independently attempted receipts. Original operation and cleanup failures are retained together. Cleanup receipts list unfinished resources and typed errors. Existing/unowned private roots are not deleted.

The live negative qualification deliberately fails capture and the first database cleanup. The nested receipts must report **failed**; the second database/private files are nevertheless removed, configured development stays unchanged, all target variables are restored, and the original capture error remains present. A separate guarded repair then removes the deliberately retained fixture and confirms absence. Its `repair.json` must pass before the enclosing regression passes. Failed negative receipts are expected evidence, not unresolved cleanup.

## Verification corrections

The first expanded selection had 40 passes and one test-expectation failure: missing return tracking correctly returns validation status 400, while the fixture initially expected conflict status 409. The assertion was corrected without changing application validation. Its owned fixtures were removed. An attempted rebuild overlapped the running test host; after that run completed, the final build passed cleanly.

The first browser recheck passed its first scenario but exposed a route-teardown race when a forwarded request outlived the page. `afterEach` now awaits `unrouteAll({ behavior: 'wait' })` before context closure, without ignoring errors. The complete rerun passes all four desktop/320px phone × light/dark scenarios, with selected axe checks, keyboard/focus, expanded result reflow, integrity/retry/report limits and no runtime page errors. Color-environment advisories were harmless. No reviewed screenshot baseline changed.

## Boundaries

No persisted model, migration, data reset/backfill, dependency, production identity configuration, Git mutation, deployment or DPS source/runtime/contract change. Phaeno Lab help and generated documentation explain held/closed Trial custody, actual-time movement attribution and frozen saved reports. Existing Phase 1–4 and unrelated work is preserved.

Reproduce with the [guarded runbook](../SAMPLE-TRACKING-PHASE4-RUNBOOK.md): the default runner executes the 41-case selection; `-Browser` executes the connected recovery/browser matrix. Each invocation uses new evidence and disposable local fixtures. Production/hosted recovery, scheduled operations and the laboratory-owner scientific walkthrough remain separately authorized qualification gates.
