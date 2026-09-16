# Ten scientific, Trial and workflow cases — September 15, 2026

## Outcome

**Ten cases exercised; seven close as Pass (simulated), and three remain open with two concrete product gaps.** This continues the approved simulated software approach. It does not declare real scientific validity, physical custody, provider delivery, or final release acceptance.

| Case | Result | Main finding |
| --- | --- | --- |
| CRM-05 | Pass (simulated) | Same-Company access approval, legacy repair, explicit reuse, incompatible-scope denial, separate service entitlement and retained end history. |
| TRI-05 | Pass (simulated) | Partial/member archive, replacement completeness, complete release, exact bytes/manifest and frozen retention. |
| TRI-06 | Pass (simulated) | Incomplete closure, held/once-only simulated material disposition, safe CRM replay, actual relationship conversion and access-close guards. |
| ORD-06 | Fail | Custom work, sales-assisted handoff and acceptance-based timing pass; partially worked Lab cancellation lacks the required Commercial completion path. |
| ORD-07 | Pass (simulated) | Three-sample/multiple-library aggregation, publication boundaries, scope isolation and Customer/Partner responsive progress screens. |
| LAB-05 | Pass (simulated) | Command-driven library/QC/batch/custody journey; duplicate and failed-QC denial; shipping is distinct from sequencing. |
| LAB-06 | Pass (simulated) | Governed exact-package approval with independent reviewer, contributor denial, separate publication and unpaid download. |
| LAB-09 | Pass (simulated) | The remaining independent-approval dependency now passes; retained policy, source/fallback, concurrency and historical evidence remains applicable. |
| WEB-05 | Fail | Actual queued notices recover without repeating business work, but result/Trial email bodies omit their owning-workspace links. |
| SYS-04 | Fail | Hold, cancellation rollback and paid-but-held output checks pass; the same partial Lab cancellation gap prevents the complete cross-screen journey. |

The controlling software ledger becomes **73/81 closed (90.1%): 39 ordinary passes and 34 simulated passes; eight remain**. Remaining cases are ACC-06, ORD-03, ORD-06, FIN-01, FIN-03, WEB-05, SYS-04 and SYS-06. Three have the failures above; the other five retain their earlier named gates.

## Current evidence and environment

- Checkout: `7df0ccbef62252732ceae877abb4fe7bb9a721dc` plus the existing working changes and the test-only additions in this batch. No Git mutation or deployment was performed by this task.
- Database tests use newly created, randomly named loopback databases. The schema-only runner reads the existing isolated `127.0.0.1:5436/phaeno_ops_lab06_uat` schema and migration history, then creates and removes `pseq_next_acceptance_<guid>`. Command journeys that need independent commits create/remove their own guarded `pseq_handoff_test_<guid>`, `pseq_trial_preparation_test_<guid>` or Kit fixture database. No source business rows are copied or changed by this batch; no source migration is applied.
- The existing isolated PostgreSQL server has commit tracking enabled. The first run against the default development server correctly refused a governed download because that server lacks commit tracking. The test moved to the already configured isolated server; the gate was not bypassed and server settings were not changed.
- Browser checks use the existing local UI at `https://localhost:3016`, actual React pages/components and explicitly intercepted synthetic API responses. They are not a new Clerk sign-in, connected provider journey, or production browser check. No browser business writes reach the API.
- Provider statuses, clean output/scanner state, material disposition and storage bytes are explicitly **SIMULATED**. The primary Lab journey executes the owning commands for protocol approval, preparation, resources, library, batch, custody, scientific approval and release. The supplemental mixed-stage variants arrange database facts inside rollback transactions; they do not claim additional scientific approvals or completed laboratory work.
- Original Jobs **HS5Y7DB7** and **69SJN4PA**, and the saved LAB-09 between-stage checkpoint, are not targets of any mutation.

### Verification artifacts

**31 distinct backend checks pass, zero failures/skips in their final runs:** `scientific-ten-final.trx` contains the 30-check aggregate; `paid-held-output.trx` contains the independently isolated Kit check. The further all-samples/hold/rejection/withdrawal assertions pass in `scientific-ten.trx` (a rerun of the same Lab journey, not a 32nd distinct test). All are under ignored `tmp/scientific-ten-results/`, alongside `components.json`, `browser-final/`, `database-run.json` and `database-cleanup.txt`. The initial aggregate is retained as `first-aggregate.trx`; its fixture failures are not product acceptance failures or additional passing tests.

Current browser verification: **16/16 pass**, including two new Customer/Partner mixed-stage journeys; current component verification: **56/56 pass**, zero skips. Browser checks cover 320/375/1440 CSS-pixel layouts, both themes, 200% CSS scaling, numerical sample ordering, Enter/Space disclosures, accessibility scan, safe QC and visible partial output. Scaling is not a claim about native browser zoom on every device. TypeScript and scoped lint also pass using the installed local entry points.

## Required-step crosswalk

### CRM-05

1–2. `RequestAcceptanceCreatesSameCompanyScopeAndRetainsSeparateServiceEntitlementHistory` creates the actual CRM handoff, checks PendingReview/no scope/no members/no entitlement, denies the Commercial-only caller, then approves as the fixture platform administrator. The original Company links to one new Partner scope.

3. `RequestAcceptanceRepairsLegacyAccessAndExplicitlyReusesCompatibleScopeWithoutDuplicatingPeople` stages only the documented approved-without-scope prerequisite, executes Complete Portal access, explicitly reuses a matching Customer scope and preserves its membership. An incompatible Partner scope is rejected without linking the Company. Both negative and compatible fixtures are newly created within rollback isolation.

4–6. The first check rejects an access-only source for a service, creates/approves a separate service request, adds/updates Ready entitlement, rejects overlap, applies the owning service request and ends its entitlement with retained source/history. Invitation acceptance and consumed-link/member persistence carry forward from the [ACC-01/02 run](2026-09-15-invitation-software-acceptance.md); this batch does not send another invitation. CRM request/relationship/workspace components provide the approval/completion presentation checks. No completion action creates missing service work.

### TRI-05

1. Current `ReleaseRequiresCurrentLaboratoryReadiness` and scientific gate tests deny changed work readiness, missing/unclean output, contributor approval and unresolved blocking exceptions. Existing [release/retention evidence](2026-09-15-seven-case-software-acceptance.md) supplies the frozen deliverable and transfer boundary variants.

2–3. The strengthened `SimulatedTrialDownloadsVerifyBytesFailedZipMemberCreditAndStaffDenial` now first publishes a Partial package and streams its archive through the actual MVC response as a separate Prospect member. File bytes and the exact manifest match, and no complete-package retention snapshot exists. `TrialAcceptanceReplacementCompletenessAndConversionPreserveFrozenReleaseAndMembership` rejects Complete with another sample missing, authorizes/submits its Phaeno-caused replacement, and rejects Complete again while that replacement is missing.

4–5. Complete succeeds with both required approved packages and freezes retention once, without an invoice or payment. The former Partial archive becomes unavailable; complete individual/ZIP bytes and manifest match. A failed ZIP member earns no retention credit; successful external completion does; staff download is denied. Actual Trial result components/browser checks preserve superseded/closed history and refresh availability after download failure. Upstream Trial packages use an explicitly staged release fixture, not new physical/scientific observations.

### TRI-06

1–2. `TrialAcceptanceClosureRequestsCancellationAndMaterialActionsKeepSafeCrmHistory` closes an incomplete Trial through its workflow, cancels its unstarted Lab work, blocks new submission, retains the closure-plus-30-day material deadline and records no automatic disposal. Premature destruction and held disposition fail. An explicitly simulated operator-reported Exhausted disposition succeeds once; a duplicate fails.

3. Follow-up retains owner/date. Actual Trial events publish to CRM once using their original event identities and a safe Trial link; replay publishes zero new activities. The sample identifier is excluded. The [earlier connected failure/recovery run](2026-09-15-files-access-ten-case-batch.md) supplies the deliberate database publication failure and unchanged authoritative Trial evidence. Current actual Trial notices also undergo sender failure/retry without changing retention.

4. Actual Relationship Management approve/apply converts the same Prospect organization to Customer. Membership IDs, completed Trial, three sample/replacement records, release and persisted retention deadline remain unchanged; no Lab Service order is created. The existing Partner-conversion variant remains covered by the retained Trial test.

5. `CloseoutRequiresFinalEvaluationAndNoOtherRelationship` rejects access closure before final evaluation and with an open Opportunity; after the legitimate closed outcome it deactivates the same scope/Company and retains the reason. Existing grant/other-Trial/hold guards remain as recorded in the Trial plan and earlier acceptance pack.

### ORD-06 and SYS-04 — partial pass, whole cases fail

Custom-work controller checks retain one immutable Opportunity/Department/original-order reference on replay, deny foreign scopes and Department-only administrators, preserve Partner purchased-order origin, and create no accepted order. CRM handoff checks create one order, apply its request atomically, reject reuse and remain silent until quote issuance.

The enhanced command-driven Lab journey proves receipt alone does not start turnaround; scientific intake acceptance does. Later timing queues one safe delay notice; an earlier change queues none; the original target and private-note boundary survive. Turnaround terms are explicit synthetic quoted prerequisites on this legacy order fixture.

Cancellation checks prove a request alone preserves work, full cancellation waits for Lab acceptance, and started work vetoes approval without a partial Commercial decision or extra provider receipt. The provider independently returns PartiallyAccepted for mixed received/unreceived specimens, preserving received material. **That partial result has no completed Commercial path; see defect SC-02 below.** These successful guards cannot substitute for that missing outcome.

Current Trial preparation checks block held/closed/stale-scope actions; the command journey blocks held evidence and contributor approval; scientific gate tests cover blocking exceptions. `PaidIncludedOutputWaitsForOperationalHoldAndCancellationDecision` independently confirms payment does not release held/pending-cancellation Kit output. Retained Company/Trial, shipment/Job and execution parent links plus current browser/56-component evidence cover navigation segments. A complete partial-cancellation recommendation/decision/return trail remains unverified because its outcome cannot be completed.

### ORD-07

1–3. Retained Customer Received/list evidence, [tube-intake acceptance](2026-09-14-tube-intake-uat.md) and the [shipping batch](2026-09-15-shipping-ten-software-acceptance.md) provide container-first receipt, outstanding samples, split 9+9 tubes, exact-once accession and preserved owner records. Current component tests distinguish missing progress from zero samples and preserve pre-order states; both Customer and Partner browser fixtures render the same progress boundary.

4–7. The enhanced Lab journey checks each preparation/sendout stage through the actual controller and projection. A rollback database variant adds two other samples and a second library: received/awaiting samples keep the Job at Received; shipping or provider arrival for only the additional library does not advance the original specimen to Sequencing. Both libraries sequencing does. Uploading produces Data Assembly; review produces Quality Review; neither exposes output. Independent approval leaves Quality Review and no downloadable release.

8–10. The separate release command unlocks exactly its package and bytes. Reintroducing the two earlier-stage samples gives one Results Available among three without advancing the whole Job. Explicit synthetic legacy-release facts then test all three Results Available, hold/rejection precedence and withdrawal returning the affected sample to its earlier stage. Those extra release facts are aggregation fixtures only. Unit/component checks retain Job-wide versus sample counts and hold/cancellation/Completed lifecycle precedence.

11–12. Current database projection tests enforce organization isolation; retained [Department/session checks](2026-09-15-session-role-acceptance.md), shipping access and list-filter/return checks supply member/Department/peer-record boundaries. Current Customer/Partner browser screens use three numerically sorted sample names, partial output and approved QC; Enter/Space, focus, themes, 320/375/1440 widths and 200% scaling pass without page overflow or browser errors. No storage location or private provider detail enters the progress projection. These composed simulated checks do not claim one fully connected three-sample production journey.

### LAB-05, LAB-06 and LAB-09

LAB-05 / 1–5: `AuthorizedOrderCompletesTheDatabaseBackedLabOperatorJourney` records source/execution/container lineage and named QC units, rejects failed QC and duplicate membership without adding a member, resolves a non-library barcode without a library ID, restores passed QC, starts the batch, freezes sendout membership, records custody and advances Shipped → ReceivedByProvider → Sequencing → Complete before completing the batch. The scanner component checks supply refocus/non-library failure presentation. Every physical/provider assertion is simulated.

LAB-05 / 6: current organization-scoped projection tests and staged multiple-library aggregation verify safe own-work facts and no provider/storage details. External views receive progress, not internal batch membership; retained Department/organization denial checks remain applicable. No actual shared-provider batch is asserted.

LAB-06: the strengthened journey runs governed results **and dual control enabled**. The contributing operator receives `scientific_approval_contributor_conflict` with no approval row. A separately assigned reviewer approves the exact clean package linked to the command-executed preparation/library/provider chain. ReadyForRelease retains a null publication time and no released files. A separately authorized release manager publishes; stale replay creates no second release, retention schedule or notice. The Customer downloads exact known bytes while unpaid. Missing/unclean packages and blocking exceptions are covered by the focused gate test; projection replay/monotonicity by the focused provider test; no-charge Trial release by TRI-05. Notice link acceptance remains WEB-05's separate failure.

LAB-09: this closes only the remaining positive independent approval dependency identified in the [policy/history closeout](2026-09-15-policy-history-and-shipping-access-uat.md). The [attempt continuation](2026-09-15-lab-attempt-continuation.md) and preceding intake/fallback evidence retain all policy, one-/three-tube, source immutability, concurrent selection/start, failed-attempt/reserve/exhaustion, held-repeat, retirement-gap, historical Completed/Started and keyboard/draft variants. The saved in-process attempt is unchanged.

### WEB-05 — failure retained

Actual quote/timing/result notices produced by the Lab command journey and actual Trial notices are exercised through `OrderNotificationDispatcher` with a deliberately failing then successful sender. The same notice is retried, sent once, and cannot be resent by replaying a completed delivery. Release identity/count and retention deadline remain unchanged. Current recipient-removal/routing/foreign-scope tests pass; invitation notice and verified-account/consumed-link evidence carry forward from ACC-01/02. CRM projection excludes the private sample identifier, and timing excludes its private note.

**Required owning-workspace links are absent in Trial/result email bodies.** Therefore correct-account, signed-out and wrong-account navigation cannot be accepted from those emails. General route-scope denials are not a substitute. Real inbox delivery also remains outside the simulated sender evidence.

## Product defects and next actions

### SC-01 — Trial/result workflow emails omit actionable links (WEB-05)

`PSeqResultReleaseController.Release` queues only “A scientifically approved PSeq result package is available for download.” It contains neither the Job identifier nor a link. `TrialWorkflowService.Notice` adds “Open Trial … in the Portal” with the Trial number, but no URL. `MailgunOrderNotificationSender` forwards the body as plain text without adding a workspace link. Thus the scripts' authenticated owning-workspace navigation cannot be performed from either email.

Next implementation: add safe record context and configured Portal links for these notice families, preserve organization/Department access checks, then verify correct/signed-out/wrong-account routes and same-event retry. Do not send fresh real messages merely to demonstrate the text change.

### SC-02 — Partial Lab cancellation lacks an end-to-end Commercial decision (ORD-06, SYS-04)

The Lab provider correctly returns PartiallyAccepted when only unreceived specimens can be cancelled. The Commercial full-approval controller requires Accepted and rolls back other outcomes. `CancellationDecisionPanel` exposes Partially approve only when reagent lines exist, so the Lab Job screen offers only Approve/Decline. Its API also treats non-Approved decisions as the false/declined branch of `ResolveCancellation`; a raw PartiallyApproved status would not implement a safe specimen-level cancellation. No such unsupported write was used to force closure.

The Order Management plan already requires partial decisions after acceptance. Next implementation must carry the reviewed specimen-level outcome through Lab and Commercial, preserve received/consumed work, reflect the safe Customer outcome, and retain the separate Finance correction boundary. Re-run ORD-06 / 4–5 and SYS-04 / 1–2, 5 after that path exists.

## Test setup corrections and cleanup

The schema-only fixtures initially lacked Trial deliverable/retention defaults and the default CRM pipeline. Tests now explicitly create only missing simulated prerequisites in rollback/disposable scope; custom-work cleanup removes its own pipeline. Test timing uses a controlled reason; timestamps are compared after PostgreSQL readback at stored precision; CRM privacy checks inspect projected fields rather than serializing cyclic entity navigation. The incompatible-scope negative fixture receives a distinct name before the separate compatible fixture is created. None of these corrections changes application behavior.

The Kit check intentionally rejects arbitrary source database names before creating its own disposable database. It was therefore run separately against the verified loopback UAT source, with its original guard intact. The frontend package-manager lint launcher could not find its shim; the already installed direct lint entry point passed. No dependency was installed.

Final read-only database inspection found no remaining acceptance, handoff, Trial-preparation or Kit disposable databases on either local server (5432/5436); `cleanup-readback.json` retains the result. The 81 ledger rows reconcile to 39 Pass, 34 Pass (simulated), three Fail and five Blocked. Report links and whitespace checks pass. The corrected Customer dark 320px screenshot was visually inspected after the complete roster and partial-output fixtures were aligned.

All new behavior changes are in tests and test fixtures. User guides require no product-behavior update in this batch. Source server settings, external senders, operational Jobs, production code, deployments and shared migrations are unchanged by this task.
