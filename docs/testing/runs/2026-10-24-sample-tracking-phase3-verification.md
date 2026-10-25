# Phase 3 sample-tracking verification — October 24, 2026

> Raw sample-tracking test outputs linked in this dated record were removed at the Owner's request after consolidation. The archived links now open the retained result/cleanup ledger; screenshots and raw files are no longer retained.

Owner scope: run Phase 3 regressions and browser acceptance, repair issues and report back. No deployment or DPS changes. This verifies the [local implementation](2026-10-24-sample-tracking-phase3-implementation.md) and [owning plan](../../plans/LAB-PHYSICAL-LIFECYCLE-PLAN.md).

## Final results

| Check | Result | Evidence |
| --- | --- | --- |
| Focused backend domain/PostgreSQL selection | **99 passed**, zero failed/skipped | [Archived receipt: TRX](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Focused frontend selection | **84 passed**, zero failed/skipped | [Archived receipt: JUnit](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Connected desktop/320px phone × light/dark Chromium acceptance | **Four passed**, zero failed/skipped | [Archived receipt: Browser log](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: wrapper TRX](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Static checks | TypeScript, scoped ESLint, UI source guard, generated help and whitespace checks pass | 772 guarded sources, two existing exceptions; 62 guides, `7937d7d9ea9c` |

The xUnit browser wrapper is orchestration evidence for the four scenarios, not another four domain tests. Earlier diagnostics and overlapping reruns do not increase the final counts. These are focused selections, not the complete application suites.

## Verified scope

Backend selection includes physical lifecycle and normalized scan/replay/position/occupancy/immutability/retention-query checks; step performance, protocol execution, preparation-batch, master-mix and Trial domain cases; all eight preparation PostgreSQL journeys and retained/rejected accession. Two new Trial PostgreSQL cases exercise pre-closure refusal, frozen retain-until policy, Trial holds, prohibited transfer/reuse, approved return destination/tracking, final quantities and matching aggregate material summaries. An elapsed retention clock is arranged only in rollback-isolated synthetic fixtures.

Frontend selection covers timing requirements and offsets, participant identity/roles, protocol definitions/execution, shared preparation, per-tube exception toggling, accession grouping/recovery, performance display and sample investigation. The added toggle regression retains selection, displays its explanation and removes the override when unchecked.

Each connected browser scenario:

1. Uses a separate synthetic two-sample scene. Anonymous and Customer reads are denied through real API authorization.
2. Registers an unknown box and confirms its known room/freezer/rack/shelf. Scans the selected tube, rejects a wrong scan, preserves the failed draft and saves a position. Occupied positions are rejected.
3. Moves a populated box once and reads both contents' effective location. Records Job retention and a hold, rejects held destruction, and reads the due/hold queue. Records a return only after shipment/handover tracking is provided; preceding and measured quantities remain distinct. After departure, subsequent box movements apply only to the tube still present. Records authorized destruction after retention/hold guards.
4. Opens Actions by keyboard; Escape returns focus to the surviving trigger. A dirty close opens the shared three-region discard dialog; Keep editing preserves the draft. Confirmations initially focus Cancel, and nested box confirmation returns to its invoking control.
5. Requires actual intervals and participants on a pinned procedure. Saves common evidence and an explained per-tube timing exception, verifies distinct intervals and pending attribution in PostgreSQL, and checks visible required-field feedback.
6. Records master-mix timing/participants, refuses readiness before review and rejects self-approval. A different supervisor approves through the production review form, after which readiness succeeds.
7. Independently reviews sample performance, submits a full interval amendment through the production form, independently approves it and verifies that the original evidence remains unchanged. Saves/downloads an actual investigation manifest, verifies its SHA-256 and excludes the other sample's physical barcode.

Selected axe WCAG 2/2.1/2.2 A/AA checks and horizontal overflow assertions pass on checked pages/dialogs in each viewport/theme. Final [Archived receipt: screenshots](2026-10-24-sample-tracking-browser-acceptance-ledger.json) are retained; representative phone and desktop screenshots were visually reviewed. These are run evidence, not accepted image-comparison baselines.

## Repairs

- **Physical barcode normalization:** physical actions compared raw input with normalized barcode aliases. They now use the existing tube scan normalizer; the PostgreSQL regression includes lowercase and surrounding whitespace.
- **Per-tube performance control:** the optional dynamic form value did not reliably stay selected. It now has an initialized, explicitly subscribed value and a visible required exception explanation, including personal Now entries. Browser and component regressions cover it.
- **Master-mix capture:** an earlier endpoint guard still rejected any performance payload. It now admits the approved Phase 3 timing/participant contract while retaining tray-reference, identity, procedure, inventory and independent-review guards.
- **Focus recovery:** closing the physical-action dialog from an Actions menu did not restore keyboard focus. It now names the surviving tube Actions control; nested box confirmation uses its own invoking control.
- **Fixture cleanup:** a preparation regression attempted to delete a derived container before its new movement evidence. Scoped cleanup now removes the task's dependent synthetic events first. No production preservation rule was weakened.

Fixture-only corrections supply two authorized sample positions, compare equivalent checksum casing, and mount the actual shared discard-confirmation component. A short diagnostic helper was stopped after a temporary fixture/edit failure; only its exact Phase 3 browser process tree was terminated. Final runs have no runtime page errors. Existing EF tool-version and browser color-environment advisories did not prevent verification.

## Isolation and reproduction

All test data used disposable loopback database `phase3_verification_bba22fd47b74430b8afedaa94bb4e9e7`. `PSEQ_OPERATIONS_REFERENCE_CONNECTION` and process-local default connections targeted that database only. The configured development database's 29 tubes, protocol-version bytes and protected Website intake fingerprints remain unchanged: [Archived receipt: preservation readback](2026-10-24-sample-tracking-browser-acceptance-ledger.json).

Backend: `dotnet test backend/test/PSeq.Operations.Test.csproj --no-restore --filter <Phase 3 selection> --logger trx`. Frontend: nine focused files with `pnpm exec vitest run --maxWorkers=2`. Browser: opt-in `PSEQ_PHASE3_BROWSER_VERIFICATION=1` selects `Phase3LifecycleBrowserUsesRealControllers`, which runs `pnpm exec playwright test --config playwright.sample-lifecycle-phase3.config.ts --workers=1`. Vite is confined to loopback port 3198. The test host uses real MVC controllers, domain rules, API envelopes/errors and EF/PostgreSQL, with synthetic test-only identities. Feature requests/responses are forwarded, not fabricated.

The browser fixture transaction rolls back. The disposable database was removed and absence verified: [Archived receipt: cleanup receipt](2026-10-24-sample-tracking-browser-acceptance-ledger.json). Task-owned workspace scratch output was removed after preserving receipts/screenshots. No migration, configured/hosted data, dependency, production authentication, DPS source/runtime/contract, deployment hold or Git staging/commit changed during this verification. Existing unrelated billing work remains outside this task.

This proves local synthetic connected feature behavior. Hosted Clerk sign-in, whole-Portal navigation, actual provider/storage/scanner operation, physical bench handling, scientifically qualified SOP content, Firefox/WebKit, full screen-reader acceptance and business sign-off remain separate. The Phase 2 scientific procedure review remains open as documented. Deployment and DPS remain excluded.
