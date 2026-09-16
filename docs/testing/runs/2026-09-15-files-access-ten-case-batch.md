# Ten-case files, access and recovery batch — September 15, 2026

**Superseding completion checkpoint:** the Product Owner explicitly approved simulated software evidence for the seven remaining cases. All ten cases in this batch are now complete under that agreed scope: three prior passes and seven `Pass (simulated)`. Overall software closure is 46/81. Real scientific/external-service acceptance remains open. See the [seven-case completion and step crosswalk](2026-09-15-seven-case-software-acceptance.md). The earlier blocked checkpoints below are retained as history, not the current software status.

User requested completion of the next ten cases without stopping after individual fixes. This batch targets **DAT-01, DAT-02, DAT-03, DAT-04, DAT-05, DAT-06, ACC-04, SYS-02, SYS-03 and WEB-03**. Every required step and variant remains controlling. Supporting tests and partial observations do not constitute a case pass.

## Baseline and preservation

Continue the isolated UI at `https://localhost:3016`, API at `https://localhost:7116`, and PostgreSQL `127.0.0.1:5436/phaeno_ops_lab06_uat`. Preserve existing UAT Jobs, approvals, invoices, receipts, shipments and granted packages. New source data in this batch are explicitly synthetic, newly authored harmless test content with known checksums; they are not scientific results or customer-derived material. Production publication of synthetic data remains prohibited by existing policy.

No Git mutation, production deployment, shared migration or real external message is authorized by this run. User input remains requested for the approved positive scientific journey and external laboratory/delivery observations needed by dependent steps. Do not substitute synthetic lineage for those observations.

## Progress

| Case | State | Remaining work |
| --- | --- | --- |
| DAT-01 | **Pass** | Five-step crosswalk below; actual managed bytes and real scanner, with explicitly isolated pending-state fixture. |
| DAT-02 | **Pass** | Five-step crosswalk below; three external audiences, exact version and Department scope. |
| DAT-03 | **Blocked** | Quarantine, investigation, clearance, withdrawal, reminders and no-recipient failure observed. Controlled external attestation received by Phaeno remains unavailable. |
| DAT-04 | **Blocked** | No released operational package in any of the three required families. Curated file/ZIP checks cannot substitute for operational completion receipts. |
| DAT-05 | **Blocked** | No operational releases or frozen retention snapshots. Requires disposable approved A/B releases and isolated processing/deadline admission. |
| DAT-06 | **Blocked** | No operational release receipt/reissue. Actual expired-object deletion and independently approved same-sample regeneration remain unavailable. |
| ACC-04 | **Blocked** | Curated file/ZIP scope, operational record/denied-write checks and the existing purchase-role crosswalk are verified. Released operational file variants and a permitted Operations Job fixture remain unavailable. |
| SYS-02 | **Pass** | Five-step crosswalk below; authoritative Trial commit, real failed CRM projection and exactly-once recovery, actual scanner/storage faults, unavailable legacy retry. |
| SYS-03 | **Blocked** | Current-scope operation replay and saved Department draft return pass (steps 4–5). Monitored in-flight revocation and old-attempt resume still require an eligible operational transfer. |
| WEB-03 | **Blocked** | Actual intake administration and isolated processing controls verified. Public new-intake step returns 500 because reCAPTCHA is unconfigured. Engineering queue fixture does not pass that step. |

This batch closes **3 cases**, bringing the controlling total to **39/81 (48.1%); 42 remain**. Seven selected cases retain required dependencies; they are not reported as completed. No acceptance criteria were waived.

## Environment recovery

Docker startup failed on stale inference and Secrets Engine sockets. After verifying the failed startup processes and ordinary parent directories, preserved the runtime directories as `Docker/run.uat-backup-20260915`, `Docker/run.uat-backup-20260915-final` and `docker-secrets-engine.uat-backup-20260915`. Restarted Docker successfully. No factory reset, volume deletion or container recreation occurred. Started the existing `phaeno-finance-uat-scanner` on loopback port 3316; its real ClamAV smoke checks passed clean, EICAR, encrypted, oversized and health variants.

The API remains Development-only on port 7116 and the original isolated database on port 5436. Synthetic source creation first returned 400 under the default policy, then the local runtime explicitly enabled `DataProvisioning__EnableSyntheticFixtures`; the synthetic markers remain. Storage stays in the existing private UAT root. Scanner provider is ClamAv, not the trusted-development adapter. Sender and QuickBooks restrictions remain; no real messages were sent. Retention processing and byte deletion remain disabled. New builds use separate output directories to avoid modifying a running assembly. See the retained runtime launcher and final verification evidence under `tmp/uat-closure`.

## DAT-01 — complete step crosswalk

| Step | Connected observation |
| --- | --- |
| 1 | Created explicitly synthetic source shell; saved metadata in the actual form and uploaded `README.txt` (86 bytes) and `measurements.csv` (53 bytes) through managed storage and real ClamAV. Stored identity, kind, content type, size, SHA-256 and Clean verdict retained. Ownership/provenance states newly authored test content, no specimens, people or Customer source material. |
| 2 | Missing evidence and zero files blocked Ready; curating from Draft and enabling a draft package failed without a partial external version. Actual EICAR remained Rejected/Draft; actual stopped scanner produced Unavailable/Draft. The synchronous scanner cannot naturally persist Pending, so engineering prepared one named mutable synthetic draft with Pending scan state; no immutable or rejected record was rewritten. Pending readiness/curation both returned 400. |
| 3 | Ready source froze exact metadata/files; editing it returned 409. Curated draft captured its exact snapshot. The new retry control rescanned the same outage and pending file objects with real ClamAV, preserved checksums and local dirty metadata, and then permitted Ready. Stale version, Clean/Rejected verdict, foreign file, non-admin and frozen-source retries returned 409/404/403 with unchanged saved records. |
| 4 | Reviewed actual publication dialog/manifest, published immutable v1 and marked eligible. Customer Data Library and direct detail remained unavailable until a separate Research grant. |
| 5 | Created separate source v2 and dataset version 2. Original v1 snapshot and grant stayed unchanged until explicit DAT-02 upgrade. Archived source v1 without altering existing packages/grants; new curation from it returned 400. Published and retired disposable v3 with a reason; new retired-version grant returned 400. Each source record remains revision 1; this was a new source identity and package version, not an unsupported in-place source revision edit. |

Source v1: `e7e986d1-43fa-4bbc-bb1d-99e67352b7cf`; source v2: `2233c477-3602-4dd8-92c7-a9e4fd134f55`; dataset: `7e5b4e17-7f98-4e15-a695-e81c418dd8cc`; v1: `fe899252-a7a6-4a00-b2d2-1ede9882ee68`; v2: `280dc26b-fc25-4124-879f-d0aa59ca5811`. Outage source: `4e82cf9e-5636-456f-92ea-310722c07759`; pending fixture: `b7681fde-53c9-4b0d-bd52-140b6211741f`.

SHA-256: README `d63c0e86520f87f72f8772f9e5a316464887df96491761f21a70b0ad29886fca`; CSV `c8e99e69f0a342557ce944504e424cae0f123887d8d44ac731436e93601689e2`. Actual external ZIP inspection found exactly these two entries with matching bytes/hashes. PostgreSQL independently confirmed source/file identities, synthetic status, verdicts and scan-retry audit entries.

## DAT-02 — complete step crosswalk

| Step | Connected observation |
| --- | --- |
| 1 | Started version-2 assignment without an organization, followed Open Company access setup, created a disposable Company and its pending onboarding request through the UI, reviewed/approved empty access, and returned using the provided link. Version and unselected scope were retained. The new organization had zero grants before and after return. No invitation or service entitlement was created. |
| 2 | Research grant v1 enabled Customer member Data Library, exact individual files and actual ZIP. Different tenant and unassigned Operations scope denied detail/file/archive. Customer organization admin selecting Operations also received 404. Partner and Prospect Research received the same explicit version and successful exact-byte downloads. A member's administrative revocation request returned 403; saved grants were unchanged. |
| 3 | Publishing/enabling v2 left existing Customer/Partner/Prospect grants at v1. Implicit grant-as-upgrade returned 409. |
| 4 | Explicit upgrades for all three audiences produced one active v2 grant each and retained superseded v1. Replaying each operation identity returned the same grant/run, with no duplicate. Compared timestamps at PostgreSQL precision rather than treating sub-microsecond response rounding as a business difference. |
| 5 | Revoked Customer v2 with reason; subsequent detail returned 404. Deactivated/reactivated the separate Partner Company: tenant detail/archive denied while inactive, active grant resumed afterward with the same identities/history. Customer Company reactivation did not revive its revoked grant. Both Companies were restored active through supported endpoints. |

The later DAT-03 withdrawal deliberately blocks v2; it does not erase this earlier verified grant state or its history.

## SYS-02 — complete step crosswalk

| Step | Connected observation |
| --- | --- |
| 1 | Controlled Trial lookup 503 displayed an error and Retry Trial, rather than an empty record. Removing the fault and using Retry loaded the saved Trial. |
| 2 | Created a separate, unapproved, zero-sample Trial request solely for recovery. An isolated PostgreSQL trigger rejected only that Trial's new schedule CRM projection. The supported schedule command committed; forced projection returned 500. Saved schedule/event remained, with pending CRM publication and recovery visible in the actual UI. |
| 3 | Removed the exact fault trigger/function in finally, retried the original projection and repeated retry. PostgreSQL found one schedule event and exactly one CRM activity with the same ID. Trial version, schedule and zero-sample roster were unchanged by retries. Internal action detail did not appear in the safe CRM summary. No sale, scientific approval or work was recreated. |
| 4 | Actual stopped ClamAV blocked source readiness and restored successfully. Separately held a read-only exclusive Windows handle on only the named disposable pending fixture's stored file: rescan became Unavailable and Ready returned 400. Released the handle in finally, rescanned the same object Clean, and independently rehashed unchanged bytes. |
| 5 | Retained QuickBooks message `b470e3cd-d371-478e-ad86-f52df188c59f` remains NeedsAttention. Retrying returned 404 `quickbooks_deferred`; the complete saved queue was unchanged. No external document, payment or connector configuration was invented. |

Recovery Trial: `3e9f69cb-c67e-4c86-b5d5-75101d3e929e` / `TR-20260915-048D4FE2FC2B`. It has no approved scope or samples. Confirmed zero remaining `uat_sys02_projection_fault` triggers after execution.

## DAT-03 — completed work and required external evidence

Quarantined source v2 with safe external instructions and distinct internal test notes. Both published/retired derived versions were affected; three organizations each had one obligation (Partner, Prospect and a deliberately empty-recipient test organization). Tenant detail/file/ZIP requests failed without content. External incident DTOs excluded internal notes. Investigation file and ZIP requests without purpose returned 400, tenant investigation returned 403, and purpose-bearing Phaeno downloads matched the frozen checksum and created two purpose audits.

Cleared the explicitly unchanged-safe test outcome after verifying bytes. Partner/Prospect grants resumed, Customer's revoked grant stayed blocked, and the prior retired status was restored. A separate staged unsafe concern was then withdrawn. Immutable manifests and grant history remain; future access is denied. Withdrawal incident: `e61441f7-4c69-4413-a266-9c9b50e6b907`. A member cannot submit an organization attestation. The empty-recipient notices recorded Failed with retained retry times.

Reminder testing exposed the new-follow-up persistence defect. Corrected investigation notes, reminders and Phaeno-recorded attestations to explicitly insert new follow-ups. The saved reminder succeeded after the fix. The PostgreSQL regression uses unmistakably synthetic, rolled-back attestation content; it is not a received external attestation and does not close step 5.

The unconfigured curated-data logging sender also falsely reported Delivered. Corrected it to fail dispatch and preserve recovery. Earlier logging-only Delivered rows in this isolated run are simulation, not provider acceptance; history was not rewritten. Actual controlled external attestation and recipient evidence remain required. Do not populate contact/source fields with invented receipt facts.

## WEB-03 — completed work and public-intake gate

The isolated Website tables initially contained no records. Engineering supplied two explicitly historical/disposable intake fixtures, using reserved `example.invalid` addresses, to exercise actual administration. Mouse and keyboard tabs showed one active panel. All five protected collection/summary routes denied a Customer member. Unsubscribe cancellation preserved the contact and restored focus; confirmation persisted actor/time and removed only that active signup. Demo completion persisted actor/time, kept the original inquiry and removed it from the active list.

Pause cancellation preserved processing and restored focus. Confirmed pause with a reason, verified the actual paused summary, and then attempted a new public intake. It returned 500: reCAPTCHA requires project/site/service-account configuration; no contact was inserted. No bypass was introduced. A separately labeled engineering queue fixture verified pending counts while paused. Restored processing through its supported command; the worker recorded two failed attempts with no provider acceptance because email was unconfigured. The row correctly remained Pending for scheduled automatic retry, not terminal Failed. Unsubscribing that disposable contact cancelled its remaining queue. Final processing is running, all fixture attempts are retained, and no test message remains pending.

Thus steps 1–3 and the processing/recovery portions of 4–5 have real UI/API/database evidence. New accepted public intake in step 4 remains blocked; queue seeding is not public-intake proof.

## Release-dependent cases — live prerequisite audit

PostgreSQL currently has **zero Lab result releases, zero Assembly output releases, zero Trial result releases, zero retention snapshots and zero reissues**. Sixteen output packages exist: 3 Uploading, 1 Scanning, 9 ReadyForReview, 2 Failed and 1 ReadyForRelease. None is released. The lone prior approval belongs to the documented metadata-only fixture `9af5b43e-60bf-4700-af20-374dc5d6e140` with one expected artifact; it must not be promoted as an approved two-file operational acceptance package.

| Case | Next required observation / owner |
| --- | --- |
| DAT-04 | Scientific/Lab and integration owners supply approved Customer Lab, Trial and included Assembly packages with real clean objects and eligible Assembly billing. Codex then measures individual/ZIP completion, interruption, member/internal credit and scope/payment/withdrawal denial. |
| DAT-05 | Approved disposable A/B releases from DAT-04; Codex configures isolated processing/time fixtures and verifies frozen policy, warning/grace/commit timing, cutoff and bounded admitted transfer. No workstation clock or live policy was changed here. |
| DAT-06 | Approved expired test objects and regenerated same-sample successor; Codex verifies holds, real deletion/retry blockers and retained receipt/reissue lineage. No retained UAT object was deleted. |
| ACC-04 | Approved released Job file and scoped file variants, including a permitted Operations fixture. Existing configured-purchase role evidence is now cross-referenced below; operational read/edit denials were refreshed. Curated bytes do not substitute for an operational release. |
| SYS-03 | Eligible monitored operational file/ZIP; exercise membership/Department removal and withdrawal during actual stream and non-revival of old attempts. Current-scope replay and saved Department draft return now pass. Fresh-request denials do not prove an interrupted stream. |

The outstanding request for the approved scientific journey and controlled external observations remains unanswered. These prerequisites require actual evidence, not permission to relabel test data.

## Continuation — operational boundaries and policy validation

**SYS-03 steps 4–5:** Reused saved Research draft `bec5c7b9-5d52-40a4-a1ff-75bc109b5787` / `VZGYV2N4`, revision 1, and the original successful configured purchase operation for `5662ff7e-8413-48db-be25-d13abe712ff1`. Switching the signed-in Customer admin to Operations removed the Research draft from the active workspace. Direct draft/order reads and replaying the exact original placement body/key returned 404 with no record payload; the Operations list excluded both records. Returning to Research restored the complete unchanged draft. The exact original successful placement replay returned its original response/version; independent current readback retained Job revision 9 and its existing purchase. A Customer member's placement replay returned 403. No new order, quote or placement was produced. Evidence: `sys03-scope-return.json`, `sys03-wrong-department.png`, `sys03-restored-draft.png`.

**ACC-04 record boundaries and purchase roles:** C-MEMBER opened its actual Research Job. A known Customer B Job, `dedac238-1c7d-458c-89ab-e94e0af96420`, failed through the actual detail page and direct API. A direct list request selecting unassigned Operations was also denied. An attempted edit of that known Customer B Job returned 403; independent C-OTHER readback retained the entire original record. PostgreSQL confirmed its original Research ownership, InProgress state and revision 1. The attempted creation of a new Operations draft returned 409 `lab_service_ordering_not_authorized`; PostgreSQL confirmed zero matching records. Operations lacks the required Ready ordering entitlement. No entitlement was added or changed merely to obtain a positive fixture. A fully populated Operations Job/file variant therefore remains untested. Evidence: `acc04-record-boundaries.json`, `acc04-foreign-denied.png`.

The already completed `ten-orders-connected.json` proves C-DEPT created and reopened the Customer draft, C-DEPT placement was denied (403), and C-ADMIN reviewed and placed that same eligible configured purchase (200), with one accepted quote. The equivalent Partner path also passed. `kit01-connected.json` proves K-DEPT saved the incomplete Kit draft and was denied placement, followed by the reviewed K-ADMIN purchase. `ten-trial-submission.json` proves Prospect Department-admin acceptance/submission denials and Organization-admin acceptance/submission. These retained connected observations close the purchase-role evidence gap previously listed for ACC-04; no duplicate purchase or scientific approval was performed in this continuation.

**DAT-05 validation portion of step 1:** Four authenticated requests tested zero standard days, negative grace, warning equal to standard, and warning greater than standard. Each returned 400 `released_deliverable_policy_invalid`. Independent readback after every request matched the active policy and its full revision history. No policy revision, organization override, processing flag, deadline or clock was changed. This is validation evidence only; it does not pass frozen schedules, warnings, grace or cutoff without released A/B packages. Evidence: `dat05-policy-guards.json`.

Final prerequisite readback still finds zero Lab, Trial and Assembly releases and zero retention snapshots. All Customer admin sessions were returned to Research. This continuation adds no case pass: **39/81 remain complete, including 3/10 of this selected batch**. Required external evidence was requested explicitly; it was not replaced with invented receipt or scientific facts.

## Verification and retained evidence

Seven source-workspace component checks pass, including dirty-field retention, original reviewed-version conflicts and save-before-readiness protection. Mark ready cannot freeze an older saved revision while newer metadata remains unsaved or a file operation is pending. TypeScript and scoped ESLint pass. Both new PostgreSQL regressions pass without skips: reloaded governance commands retain three follow-ups, one reminder notice and Phaeno-recorded provenance; an unconfigured sender retains Failed, a retry time and no DeliveredAt. Fixtures roll back. Backend builds completed with zero warnings/errors. Generated help remains 56 guides; final runtime identity is recorded below.

Final independent storage verification rehashed all five clean source objects and confirmed six retained managed-file records. The host denied a read of the EICAR object; its Rejected verdict and original upload checksum remain the negative evidence, and no clean or published package references that rejected file. The final real governance follow-up/reminder saved successfully; its unconfigured-sender notice became Failed with a future retry and no delivery timestamp. The external attestation obligation remains AwaitingAttestation.

Final browser verification at `2026-09-15T17:55:48Z` confirmed the dirty-form readiness guard without a saved write and matching authenticated help search. Source HEAD remains `7df0ccbef62252732ceae877abb4fe7bb9a721dc` plus uncommitted changes. Running API assembly SHA-256: `D36CB4CBE2D0181D98289ECD105694F6DE704FC02E4C5D6D5F826F9A65387240`; generated and served 56-guide corpus: `0aa21bbd5b369e319e4007bb6990f08ef6d07d210549fb03c01846c55d368e5b`. API health returns 200 and the existing Docker scanner remains running/healthy. Documentation generation/check and whitespace checks pass. No commit, push or deployment occurred.

Cleanup revoked only the disposable broad grant for the empty-recipient organization. Its unsafe incident, notice history and outstanding attestation remain. Partner/Prospect scoped grant history and Customer revocation remain retained. Website processing is restored, its two failed attempts are retained under the now-Cancelled test notice, and all injected projection/file/scanner faults are removed. Final local evidence additionally includes `ten-final-verification.json` and `dat01-unsaved-readiness-guard.png`.

Resumable request journals (ignored, local evidence): `dat01-connected.json`, `dat02-connected.json`, `dat03-connected.json`, `sys02-connected.json`, `web03-connected.json` under `tmp/uat-closure`. Each successful write is journaled and reused on resume. Browser harness locator/status assumptions were corrected after saved outcomes; no committed grant, upgrade, source, reminder or intake was duplicated. Archive evidence: `dat02-v1.zip`, `dat02-zip-verification.json`, `dat03-investigation.zip`. Screenshots capture publication, scan rejection/outage/recovery, all three external audience versions, pending Company return, quarantine/withdrawal, pending CRM and paused Website queue. Private sessions/credentials are excluded from this report.
