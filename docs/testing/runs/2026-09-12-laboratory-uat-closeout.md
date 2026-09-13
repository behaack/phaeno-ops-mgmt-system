# Laboratory UAT closeout

Status: **Not closed — acceptance prerequisites and unperformed variants remain.**

## Saved pause — owner requested commit, push and API/UI redeployment

The owner paused acceptance here and authorized committing/pushing the accumulated application fixes and evidence, followed by production API and Portal UI redeployment. This release authorization does not close UAT or activate disabled workflows. Deployment evidence is recorded separately in [the UAT fixes release](../../plans/PORTAL-UAT-FIXES-RELEASE-2026-09-12.md).

Resume with the existing Independent Reviewer sign-in at https://localhost:3016. The last observed account was Bill Haack; reviewer sign-in has not been confirmed. Open the failed checksum package and clean ingestion package below to finish review visibility/eligibility checks, preserving their current versions and all prior approvals. Then work through the explicit closure gates; do not repeat completed fixture setup or treat a clean file as evidence of specimen execution.

The retained LAB-06 runtime uses UI 3016/API 7116 and the isolated `phaeno_ops_lab06_uat` database on loopback port 5436. Its launcher is the ignored local `tmp/finance-scanner-uat/start-scanned-api.ps1`; it uses the tested Finance upload API build and real local scanner. LAB-14 UI 3014/API 7114 and original UI 3000/API 44399 remain separate. Keep their fixtures and settings intact. Local helpers, test credentials, file bytes and generated search-index state are excluded from the release.

This ledger consolidates the existing software-only laboratory run and its result-package continuation. It does not expand the run to all 81 cases, turn supporting automated tests into signed-in acceptance, or authorize production activation. The chronological [LAB-14/LAB-06 evidence](2026-09-12-lab-14-preparation.md) and separate [release/Finance evidence](2026-09-12-lab-production-verification.md) remain authoritative for exact actions and fixture identities. September 12 is the local run date; later UTC timestamps fall on September 13.

## Verified work

| Area | Evidence and current disposition |
| --- | --- |
| Preparation setup and execution | Signed-in tray configuration, independent protocol/workflow approval, mixed partial tray, scoped captures/QC, resource use/rejection, correction/repeat, terminal failure and reserve exhaustion recorded. Saved batches remain complete. |
| Preparation identity and custody | Output identity and quantities, QC reuse, sequencing membership and duplicate rejection, draft cancellation/reservation reuse, format retirement and frozen-layout preservation recorded. Sequencing stays Draft; no provider dispatch. |
| Preparation concurrency | Signed-in two-view stale output rejection and preserved entries; PostgreSQL competing reservations and resource replay. New forced simultaneous creation/name-collision test passes, including two distinct creates and stable retries. |
| Scientific guards | Signed-in missing/incomplete/unclean package, contributor, exception, execution and specimen-outcome checks recorded. Synthetic independent approval pins one package without releasing it. This is bounded evidence, not a complete connected lineage journey. |
| Real local file handling | Retained exact 158-byte file stored/read/hashed; actual ClamAV clean verdict; normal callback reaches ReadyForReview; duplicate callback rejected. External transfer was not exercised. |
| Multi-file rejection | Unknown/duplicate artifact references leave database state unchanged; clean malware verdict cannot override a checksum mismatch; package fails with one Clean/one Rejected file; repeated callback preserves failure. |
| Known result defects | UAT-20260912-01 concurrent registration and UAT-20260912-02 minimum-width overflow fixed/retested locally. Other role/navigation/layout/Finance defects and their local dispositions are in the separate release/Finance run. No production retest implied. |
| Help/recovery | Phaeno search, correct guide, query restoration, no-match state, keyboard topic navigation and 390px rail checks pass. Local stale corpus recovered by reloading only the owned UAT API. |
| Customer access closeout | Existing Customer Chrome session on separate local 3014 tab cannot open the Lab index or known preparation record. Cross-audience Phaeno guide is unavailable. Direct preparation loading defect UAT-20260912-07 fixed and retested; four focused cache/access regressions pass. Original Customer Job tab untouched. |

## Closure gates

| Gate | Status | Owner and concrete next action |
| --- | --- | --- |
| Remaining signed-in role checks | Blocked | Product Owner provides the existing Independent Reviewer session at local UI 3016. Requested during this closeout; current observed session is Bill Haack. Codex then verifies failed/clean-package review visibility without altering prior approvals. No new role assignment requested or performed. |
| Full positive scientific lineage | Blocked | Lab acceptance owner and Codex need a separate designated test journey advanced through supported receipt/specimen/execution/provider-custody steps. The retained ingestion work is AwaitingSpecimens with zero specimens. Its Clean file cannot supply those missing facts. Preserve completed preparation fixtures; do not force their milestones or fabricate provider events. |
| Actual object-storage/pipeline handoff | Blocked | Integration owner supplies the approved non-production transfer/pipeline endpoint and its test configuration through the normal environment setup. Current transfer URLs point to intentionally unused loopback port 1. Exercise upload, final immutable file identity and actual callback provenance before claiming this boundary. |
| Customer publication/download acceptance | Blocked | Requires the preceding complete package/independent approval plus an authorized release-manager session and scoped external test member. Test exact bytes and individual/ZIP completion, interrupted response and access denial. Neither retained metadata-only approval nor clean-but-unexecuted ingestion package is eligible as a shortcut. |
| Remaining LAB-14 manual variants | Not run in full | Codex and acceptance testers must finish the variants without recorded live evidence, including a signed-in lost-response retry, remaining held/closed Job/Trial commands and unauthorized Customer write attempts, and the full representative keyboard/theme/reduced-motion matrix. Customer index/direct-record read denial now has live evidence. Existing intercepted-browser/PostgreSQL checks remain supporting evidence. |
| Final acceptance decision | Blocked | Product Owner/Scientific/Operations testers review exact case evidence and disposition outstanding gates. No acceptance signature or waiver is inferred from the instruction to continue. |

Physical bench, printer/scanner hardware, actual provider receipt, production deployment and recovery-drill signoff remain separate acceptance scopes. They are not asserted by this software-only run. The downstream Finance completion/invoice gap described in the separate Finance run also remains open; this ledger does not certify FIN-01 or change its business rules.

## Final engineering checkpoint in this pass

Added `backend/test/LabPreparationCreationConcurrencyPostgresTests.cs`. Two independent PostgreSQL connections are deliberately held at the global creation-allocation advisory lock. Existing base names are seeded only for a bounded test-specific timestamp window; the test proves both requests were waiting, then releases the lock and verifies collision resolution, distinct IDs/names, retained notes, stable retry IDs/names, exactly two command records and zero members. No application/machine clock changes. All generated records are scoped to the new workflow and removed in finally.

Commands used `PSEQ_OPERATIONS_REFERENCE_CONNECTION` for the owned 127.0.0.1:5436/phaeno_ops_lab06_uat cluster and `--artifacts-path tmp/uat-closeout-build`:

- Focused creation-concurrency test: Passed 1, Failed 0, Skipped 0; API/test build completed without warnings.
- Connected preparation required-final and optional-final/existing-output journeys plus scientific-review-gate regression: Passed 3, Failed 0, Skipped 0, using the already-built test assembly.
- Independent cleanup readback found zero TEST ONLY creation race workflows. Documentation whitespace verification passed.

These four backend tests close the forced-creation regression gap and revalidate connected server rules. They do not close the manual/provider gates above. No full frontend/backend suite, new dependency, model change, migration, Git operation or deployment was performed.

## UAT-20260912-07 — Customer preparation link never leaves loading

Severity: Medium. Status: **Fixed and retested locally**. Opened a separate Chrome tab at local 3014 using the existing external session, which visibly identifies Johns Hopkins University / General and the Portal shell. The Lab index displays assigned-role denial. Direct navigation to the preserved preparation record instead remained Loading preparation batch with Reload after the request window had settled. The page's query was disabled for the Customer, but its empty-data branch incorrectly treated disabled access as pending loading.

PreparationBatchPage now shows Preparation unavailable and the assigned-Phaeno-laboratory-role explanation, with Back to dashboard. It withholds cached batch details while access is absent or the session is unresolved and disables supporting resource/tube queries in those states. No backend authorization change. Four focused tests pass for denied access, cached staff data, unresolved session and genuine authorized loading. User guides were reviewed: their existing role boundary remains accurate; no new workflow or guide text is needed.

Live Customer retest shows the explicit permission explanation and no record details/operations. Enter on Back to dashboard returns to the Portal dashboard. A direct Phaeno scientific-approval guide route is also unavailable with Customer-only navigation. This verifies UI audience/read boundaries, not attempted authenticated write denial. Original Chrome Job tab 106832132 was never navigated or modified; the additional test tab is closed after verification.

Final frontend verification: all four access tests passed; pnpm run typecheck and scoped ESLint on the changed component/test passed. Whitespace/link-path checks passed. The existing Edge package tab remains preserved for the requested Independent Reviewer handoff; no response to that session request has been received in this pass. UAT remains open for the explicit gates above, not for an unreported test failure.

## Preserve for continuation

| Fixture | Current saved state |
| --- | --- |
| Resource preparation 6218afc4-d4c2-4437-a6ce-7e1bd46313c2 | Completed in LAB-14; preserve its 18-entry history and assigned library. Not used by this pass's temporary tests. |
| Ingestion package 3c42f211-a219-421d-a7bc-dd07c6dba5e7 | ReadyForReview/entity version 3; original clean 158-byte artifact; no approval/release. |
| Independent metadata-only package 9af5b43e-60bf-4700-af20-374dc5d6e140 | ReadyForRelease/entity version 2; original approval; no release. Do not publish. |
| Checksum-negative package d14354fb-36ef-4801-8184-adf6cde706e2 | Failed/entity version 3; retained Clean/Rejected pair; no release. Do not repair in place. |

The last three states were independently reread after the closeout regressions. Existing UAT services/storage and the browser handoff remain available. Further acceptance must resume from these saved facts instead of repeating setup or prior mutations.
