# Seven remaining cases — approved simulated software acceptance

## Outcome and approved scope

**All seven are complete as simulated software tests:** DAT-03, DAT-04, DAT-05, DAT-06, ACC-04, SYS-03 and WEB-03. Together with DAT-01, DAT-02 and SYS-02, this completes the requested ten-case batch under the agreed scope.

The Product Owner explicitly answered **Yes** to completing these seven with clearly labeled simulated test evidence while keeping real scientific releases, external attestation and reCAPTCHA acceptance open. This is an explicit scope decision for these seven cases only. It does not waive requirements in unrelated cases or establish production readiness. The original scripts remain unchanged.

The ledger now records **39 previously closed cases plus 7 simulated software passes = 46/81 software cases closed; 35 remain**. `Pass (simulated)` is distinct from the existing `Pass` status. Actual scientific, laboratory, storage-provider, recipient and Google reCAPTCHA acceptance for these seven remains open as listed below.

## Evidence

- Final focused backend run: **107 passed, 0 failed, 0 skipped**, followed by **one additional passing monitoring-disabled test**: 108 distinct checks. Results: `tmp/seven-software-results/seven-software-final.trx` and `seven-software-monitoring.trx`. This includes actual PostgreSQL persistence, independent connections, transaction commit boundaries and MVC response execution against simulated released content/providers.
- Actual React components: **14 passed** across release receipt, organization retention policy and retention notice tests. After correcting an inconsistent receipt fixture, the four affected receipt tests passed again; this is not counted as four additional unique tests.
- Actual Portal receipt route with an explicitly simulated API response: desktop at 1440 pixels and mobile at 390 pixels, light/dark presentation, member history privacy, full checksum/manifest text and print-to-PDF passed. Screenshots and PDFs visibly identify `SIMULATED SOFTWARE TEST ONLY`.
- Earlier connected evidence remains valid: source quarantine/clearance/withdrawal, real curated bytes, denied writes/readback, reviewed purchase-role separation, Department switching and idempotency replay, Website administration and processing controls. See the [original batch report](2026-09-15-files-access-ten-case-batch.md).

Test doubles represent storage bytes/deletion acknowledgments, external attestation content, CAPTCHA verification and message-provider acceptance. No real scientific output, received external statement, provider delivery or physical deletion is asserted by those doubles. Retention deadlines are arranged only inside isolated fixtures; the workstation clock is unchanged.

## Case crosswalk

| Case and steps | Software evidence | Result |
| --- | --- | --- |
| DAT-03, 1–4 | Retained connected source quarantine, purpose-required investigation, unchanged-safe clearance with revoked-grant preservation, unsafe withdrawal, affected organizations, reminders and recoverable notices. | Pass |
| DAT-03, 5 | `GovernanceFollowUpsPersistAfterReloadWithReminderAndRecordedAttestation` exercises a simulated statement through the controller, reloads persistence and checks contact, source, RecordedByPhaeno provenance, three follow-ups and one reminder. Unconfigured sender regression plus retained no-recipient evidence verifies failure without false delivery or restored data access. | Pass (simulated statement) |
| DAT-04, 1 | New `SimulatedReleasedFileAndArchiveBytesMatchEveryManifestEntry` checks Lab and Assembly file bytes, sizes and SHA-256. New Trial download test checks its two files plus the extra `TRIAL-MANIFEST.json` entry, comparing JSON content without depending on PostgreSQL JSON formatting. | Pass (simulated releases/storage) |
| DAT-04, 2–3 | Shared completion-result tests reject partial, cancelled and failed responses. Managed Lab/Assembly and Trial ZIP failures credit no files from the failed attempt while retaining previous success; subsequent complete archives credit the included files. | Pass (simulated interruptions) |
| DAT-04, 4–5 | New tests download ZIPs as a second Department member in all three families. Receipt tests enforce member/admin history privacy. Trial staff download is denied without opening storage or creating completion credit. Wrong tenant/Department, withdrawn content and payment-held Assembly states deny new access before storage. These are arranged release/payment states, not proof of Kit fulfillment or scientific production. | Pass (software scope) |
| DAT-05, 1 | Frozen organization-policy capture, effective dates and domain validation; retained connected invalid-policy requests preserve the entire revision history. | Pass |
| DAT-05, 2–3 | Managed and governed checkpoint tests compare complete/incomplete packages, suppress duplicate/stale warnings, close complete packages at standard deadline and preserve whole-package grace despite later completion. Trial checkpoint coverage uses its retained full-release snapshot. | Pass (isolated deadline fixtures) |
| DAT-05, 4–5 | Actual commit-timing and concurrent-connection tests cover late completion, unavailable timing, late admission denied before storage, cutoff independent of worker cleanup, lease limits and active revocation. | Pass (software timing) |
| DAT-05, 6 | Historical undated release has no manufactured retention schedule. Notice recovery uses current eligible administrators, preserves deadlines, retries failed providers and keeps one recovery item. | Pass (simulated recipients/provider) |
| DAT-06, 1–2 | Lifecycle tests preserve deadlines under holds, hide internal reasons from external receipts, block cleanup during preservation and revoke active ZIPs during quarantine. Disabled enforcement prevents quarantine activation. | Pass (simulated release) |
| DAT-06, 3–4 | Cleanup waits for leases/holds/shared references, retains partial failure and retries the same objects. Simulated successful deletion retains manifest, receipt, checksums and timing. React receipt tests and the actual Portal receipt screen/print checks display the retained metadata and distinguish closed access from deleted files. | Pass (simulated deletion acknowledgment) |
| DAT-06, 5 | Same-workflow/sample reissue candidates, wrong-sample and duplicate-link denial, new objects, original immutable deadlines, retained deleted receipt and Trial reissue/closure lineage all pass. | Pass (simulated approval/reissue) |
| ACC-04, 1–3 | New file/ZIP checks exercise authorized ordinary members and denied foreign tenant requests; existing PostgreSQL scope tests cover wrong Department before storage, with retained actual Job/list and curated-file denials. | Pass (operational releases simulated) |
| ACC-04, 4–5 | Reuse connected C-DEPT/K-DEPT draft preparation and placement denials, C-ADMIN/K-ADMIN reviewed purchases, Prospect admin/member separation and independent denied-edit readback. No purchase was duplicated. | Pass |
| SYS-03, 1–3 | New `SimulatedMembershipAndDepartmentRevocationStopStreamsAndCannotReviveOldAttempts` uses separate serving/control connections for Lab and Assembly, removes membership/assignment during file/ZIP transfer, observes Revoked with no completion, restores access, rejects completion of old attempts and admits a fresh transfer. Existing tests cover release withdrawal, governed user revocation and quarantine. | Pass (simulated streams) |
| SYS-03, 4–5 | Retained connected exact-operation replay returns 404 in the wrong Department, member replay returns 403, restored-scope replay does not duplicate the purchase; saved Research draft disappears in Operations and returns unchanged. | Pass |
| WEB-03, 1–3 | Retained actual protected administration, tabs, cancelled/confirmed unsubscribe and demo completion, actor/time history, permission denials and processing controls. | Pass |
| WEB-03, 4–5 | `PublicSignupPersistsRequestedMessagesAndDuplicateCannotTriggerResend`, pause/intake/resume, durable retry, missing/expired work and provider-failure tests execute against PostgreSQL with simulated CAPTCHA and mail adapters. Pausing consumes no attempts; resume processes queued work; failures retain recoverable history. | Pass (simulated CAPTCHA/provider) |

## Changes and test recovery

Added four focused PostgreSQL tests for manifest bytes across release families, membership/Department revocation with non-revival and quarantine rejection without monitoring. Existing Lab/Assembly and Trial file fixtures now use SHA-256 values matching their synthetic bytes. The shared receipt fixture now consistently reports its one completed file in both the manifest and download summary.

Two existing commit/concurrency tests initially rejected the known isolated UAT database before execution. Their allowlist now matches the managed-retention tests: loopback host and either `phaeno_ops` or `phaeno_ops_lab06_uat`. They still create uniquely named disposable databases and drop only their validated test target. The 107-check final run includes both recovered tests and the first three additions; the fourth addition passed in its own focused run. No database check was skipped.

Other initial failures were test assumptions corrected before the final pass: Trial archives include a manifest in addition to the two files; JSONB can reorder/format JSON; each foreign test organization requires a unique name. No production application behavior was changed for this completion.

## Cleanup and remaining real acceptance

Final independent database inspection found no remaining `pseq_retention_test_*` or `pseq_trial_preparation_test_*` databases. Rollback fixtures left the original UAT database with zero Lab, Trial and Assembly releases and zero retention snapshots. Existing UAT scientific/commercial records were not promoted, deleted or replaced. No shared migration, authentication change, real message, commit, push or deployment occurred.

The seven are closed for the approved software scope. These external gates remain open:

1. Scientifically approved Lab, Trial and included Assembly packages, actual provider objects and eligible billing/Kit lineage; real interrupted/completed external transfers, deletion and approved regeneration evidence.
2. A controlled organization withdrawal attestation actually received by Phaeno, plus actual recipient/provider delivery evidence where required.
3. Public Website intake with configured Google reCAPTCHA and controlled delivery acceptance.

Retained local artifacts: `seven-software-final.trx`, `seven-software-monitoring.trx`, `seven-simulated-receipt-ui.json`, `seven-simulated-receipt-C-ADMIN.png/.pdf` and `seven-simulated-receipt-C-MEMBER.png/.pdf`. TypeScript and whitespace checks pass. Synthetic statements and outputs remain labeled; these artifacts do not claim the external gates are satisfied.
