# Guided execution and retirement UAT — September 14, 2026

## Result

**LAB-04 and LAB-07 Pass for isolated software acceptance.** Closure advances from 17 to **19 of 81 cases (23.5%)**, leaving 19 primarily remote cases and 43 cases with named prerequisites. These two finish the broader request for ten further cases. The originally selected order/shipping batch remains 3 of 10; its seven blocked cases are not relabeled passed.

Connected testing found one product defect: adding the first stage to an empty Invalid workflow produced two blank stages. The workflow form's placeholder defaults could reappear during field-array initialization under React StrictMode. Initialize the array empty and let the saved/new-workflow loading path populate it. The regression reproduces the two-stage result before the fix and passes afterward; a second test preserves the one-stage starting point for a new workflow. The actual empty recovery was then saved, independently approved and promoted successfully.

This is software acceptance with expressly synthetic protocols, QC decisions, specimen prerequisites and provider commands. It does not establish scientific criteria, physical receipt/bench work, sequencing, scientific approval, a commercial order, invoicing or release signoff. No roles, dependencies, authentication rules, schema, production deployment or Git state were changed.

## Environment and retained evidence

Actual Clerk sessions: P-LAB (Operator), P-SUP (Supervisor), P-PROTOCOL-A/B (separate Protocol Administrators), and P-ADMIN (catalog administration and a denied lab-evidence request). Author A is `0eb87b0b-651a-4ba3-ab44-fafbdef30067`; independent reviewer B is `b94dbfd7-7b78-470f-9ff1-460c8be13356`. Operator and Supervisor role restrictions were retained. Supervisor alone cannot correct an Operator-restricted step; correction of an unrestricted earlier step was completed as Supervisor and invalidated downstream evidence. Platform administration did not bypass lab-role enforcement.

Portal `https://localhost:3016`, API `https://localhost:7116`, and isolated PostgreSQL `127.0.0.1:5436 / phaeno_ops_lab06_uat`. The initial API was the retained tube-intake build, SHA-256 `724AC7F76D0DF9F2C7C228286182D2D6F5E3BB2D4E2AE51A5885370C2D442C54`. After the help update, the owned API was rebuilt and restarted at `2026-09-15T02:43:42.5733840Z` from `tmp/uat-guided-final-build/bin/PSeq.Operations.Api/debug/PSeq.Operations.Api.dll`, SHA-256 `02FD1BA56D7310F8D99FDB6B165B5417A22E2DE987B8D13F29B0F2604B8FDAD5`. Corpus hash: `da682b03ae0544f10d0bfbf21a6a29b9c0f2ad8a604ed5c6807bc9dec17b5d9a` (56 guides). Final authenticated history/readback and health checks use this refreshed API. Existing isolated integration, storage and disabled delivery/deletion settings were retained; no other local runtime was restarted.

Authoritative ignored journal: `tmp/uat-closure/lab-evidence-retirement-connected.json`. Requests are recorded before dispatch, with payload, actor, response and phase keys. Successful writes were reused when a harness assertion or selector was corrected. Race pairs retain both requests/results. Scripts are `tmp/uat-closure-identities/lab-evidence-*.mjs`, `lab-retirement-*.mjs`, and `lab-guided-final-readback.mjs`. The fixture helpers are under `tmp/uat-resources-fixture/`; their pending/output files prevent duplicate setup. No credential or token is stored in this report.

Independent read-only database evidence: `tmp/uat-closure/guided-retirement-db-readback.sql` and `.json`. Runtime manifest: `tmp/uat-closure/guided-api-baseline.json`. Screenshots: `retirement-light.png`, `retirement-dark.png`, `recovery-light.png`, `recovery-dark.png`, and `guided-history-final.png` in the same evidence directory. The retirement and recovery phone layouts were visually inspected; keyboard/error/focus and viewport assertions accompany them.

## Fixture boundary

Twelve new `TEST ONLY UAT 0407` protocol identities and eleven dedicated catalog/workflow identities cover unreferenced, discarded-only, mixed-history, sole-stage, Draft/Approved/Production, and six race variants. No original protocol, workflow or job is repinned.

| Record | Identity / purpose |
| --- | --- |
| Main job | `6ee0eccd-166b-4214-a6f5-78e8dc9f6c10`; specimen `9ee3b1c7-d8e5-4d77-a1aa-23aee9c3443f`; source `TEST-0407-MAIN` |
| Guided execution A | `2b8c3c8f-efd4-4645-b0f4-97654948a17e`; Completed, ten immutable evidence records |
| Next-stage execution B | `0519d70f-4290-4612-aedd-fef14ab7032f`; Completed; source attempt Succeeded |
| Queued job | `5754a3a4-100b-4c38-b37c-ad5b9144e493`; original invalidated workflow pin retained; execution Planned |
| Queued, unstarted OnHold job | `183a572d-2bc4-47be-acb4-f5f3fa1dc8ea`; warned rather than classified as processing |
| Cancelled / finished history fixtures | `0f27dd61-6c9d-49a8-a93a-ac0fe609a4f1` / `94584d2a-0021-4df4-8409-d9a7645666dd` |
| Supplemental legacy job | `ad3e10be-6234-4fe3-b92f-50b8d0237146`; explicit operator assignment, optional skip, performed conditional step, held-work denial; execution Abandoned |

The two main executions and source-attempt success were completed through supported UI/API actions. Only afterward, a separately journaled **synthetic terminal-state prerequisite** placed that test job into ReadyForRelease to test retirement with completed history. `TestOnlyTerminalFixtureBoundary` explicitly records that this is not scientific approval or a commercial completion. It creates no approval, release, invoice or downstream success claim. Two additional legacy race jobs and one started/held job bring setup to nine new jobs total.

## LAB-04 crosswalk

| Step | Connected evidence and result |
| --- | --- |
| 1 — stage/operator eligibility and scope | Source selection creates the specimen's first Planned execution; later-stage assignment before completion returns 409. Supplemental legacy assignment accepts the active Operator, rejects Customer/absent assignees, a foreign workflow stage, stage/protocol mismatch, and later-stage assignment. Evidence is scoped to the main specimen's pinned attempt. Current specimen assignment leaves the optional assignee field unset; named operator assignment is a legacy job-level control, while every evidence record retains its actor. |
| 2 — typed values, confirmations, roles/resources | `typed-and-required-negatives` rejects string-as-number, bad choice/date, missing text, missing operator/resource confirmation, missing QC reason and insufficient role. Actual UI records all six supported capture types and confirms resources. File-reference help explicitly states that no file is uploaded. All values and resource declarations are software fixtures, not physical resource-use evidence. |
| 3 — allowed and forbidden skips | Main conditional skip and supplemental optional skip persist their reasons. Missing skip/condition assessments fail. Required work cannot be skipped; performed optional/conditional work cannot be changed into a skip, including by Supervisor. |
| 4 — Fail/Hold block progress | Actual UI stores QC Fail, then a reasoned Repeat to Hold. Both remain Blocked and reject the next step and completion. Operator-assessed software criteria remain in the pinned definition. |
| 5 — Repeat/Correct/history | Repeats require reasons and fresh confirmations; a nonrepeatable step rejects Repeat. Operator correction is denied. Supervisor corrects the unrestricted optional step with a reason; its original evidence remains and both later steps require fresh review. Completion rejects stale downstream evidence. Repeat/re-record resolves it without replacing history. |
| 6 — reopen, completion, held/finished locks | Leave/reopen preserves all progress. Both stages complete through UI, and the attempt becomes Succeeded. Completed evidence, held attempt, held job and finished job reject further writes. Final reopened UI/database contain the same ten A records plus one B record. |

The completed execution and successful attempt establish the software handoff prerequisite. Library creation and independent scientific output approval retain their separate LAB-05/06 gates.

## LAB-07 crosswalk

| Step | Connected evidence and result |
| --- | --- |
| 1 — unreferenced reason/cancel | U has no workflow or job impact; empty/whitespace API and UI submissions fail; no affected-workflow warning; Cancel preserves identity. |
| 2 — retire/history/filter | U is retired with reason. Fresh navigation defaults Show retired off; enabling it shows immutable approved/discarded history. Discarded-only D is absent in both filter states. Retired records have no mutation actions; old editor/new-version URLs and edit/delete/version APIs reject writes. |
| 3 — processing / completed-stage gap | A retirement is blocked during active work and after stage A completes while stage B remains unfinished. Confirmed direct requests return 409 and leave state unchanged; affected job identity is retained in the impact and UI. |
| 4 — started and unstarted holds | Started attempt OnHold remains blocking. A separately started job placed OnHold also remains in activeWork and blocks retirement. The queued, unstarted OnHold job appears in queuedWork with a warning. |
| 5 — affected workflow without jobs, Cancel | Sole C workflow warning is inspected/cancelled in both phone themes; no queued-work warning; workflow remains unchanged. |
| 6 — all source states / multiple workflows | A retirement atomically invalidates four workflows, covering two Production, one Draft and one Approved source. Each gets one Invalid recovery revision; A is removed and B order, requirement, condition and handoff metadata are retained. Historical stages/approvals remain exact. |
| 7 — queued warning, cancel, confirm | Named queued jobs and consequences appear in the warning. Cancel preserves all four workflows. Proceed anyway retires A and retains every queued pin; one warning event per affected job. |
| 8 — invalid versions cannot admit work | Queued UI displays Assigned workflow is invalid. Start, manual Processing and legacy assignment with old IDs return 409. Planned work remains Planned; receipt/history records remain accessible. |
| 9 — no-edit revalidation | Main recovery containing B is independently revalidated and promoted through UI without editing its stages. Queued old pins remain unchanged. |
| 10 — edited recovery | Queued recovery replaces B with eligible E, adds B, reorders B before E, saves and reopens. Save retains Invalid. Independent revalidation and explicit promotion succeed; the old queued execution still cannot start. |
| 11 — empty recovery | C's sole stage retirement creates an empty Invalid revision; approval fails. Actual Add stage initially produced two rows. After the narrow form fix, exactly one eligible replacement saves and independently revalidates/promotes. |
| 12 — ineligible protocols / historical immutability | Retired A and Draft D are absent from recovery choices and rejected by save APIs. Old protocol editor/new-version routes and historical workflow edits are blocked; definitions/approvals retained. |
| 13 — changed preview / stale clients | Workflow metadata changes, a new queued job after preview, and execution start after preview all invalidate the old confirmation. Started work blocks even with confirmation. Stale protocol/workflow requests cannot overwrite newer state. |
| 14 — six races / retries | Actual concurrent request pairs cover start, assignment, save, approval, promotion and internal provider authorization. Results below show one winner. Replaying the original retirement request fails without adding a revision/event. Rejected authorization leaves zero jobs and zero provider receipts. |
| 15 — permission and audit/history | Operator retirement returns 403. Protocol rows retain author A's retirement actor/time/reason. Completed and Cancelled job history, definitions, approval actors and pins remain intact. |
| 16 — keyboard/narrow/themes | 390px light/dark retirement warnings fit the viewport and support keyboard Cancel. Recovery forms show required legends, focus invalid fields, retain values on Keep editing, and discard without saved changes. Protocol options exclude retired/unapproved choices. |

### Recorded race outcomes

| Competing operation | Retirement | Other operation |
| --- | --- | --- |
| Execution start | 200 | 409; execution remains Planned |
| Execution assignment | 200 | 409; no execution admitted |
| Workflow save | 409 | 200 |
| Workflow approval | 409 | 200 |
| Workflow promotion | 409 | 200 |
| Internal new-work authorization | 200 | Rejected: approved workflow unavailable; no job or receipt persists |

## Verification and cleanup

Two focused frontend tests pass; the empty-recovery regression fails before the correction. TypeScript, scoped ESLint, documentation generation/check and API build pass. The API build reports zero warnings/errors. Existing guide text was reviewed and an empty-recovery instruction added. No unrelated application test suite was run.

Independent PostgreSQL readback confirms nine new jobs, twelve test protocols, nineteen workflow revisions, six executions, fifteen step-evidence events, two execution completions, and five distinct queued-work warning events. No duplicate warning/recovery resulted from the tested retries. The failed provider authorization has zero work rows and zero command receipts. Main evidence exactly matches the completed UI/API record.

All 33 pre-existing jobs, original protocol/workflow definitions, approvals, role assignments and resource records match their baseline. All eleven test catalog services are inactive; remaining test Production revisions were retired after recovery/race evidence was captured. Queued invalid pins and immutable test history are retained for inspection. Final health and authenticated readbacks pass after the owned API refresh. Remaining scientific/provider/physical and commercial prerequisites stay in the controlling ledger.
