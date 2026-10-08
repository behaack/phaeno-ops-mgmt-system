# KIT-04 input recovery continuation — September 15, 2026

**Superseding checkpoint:** The Product Owner subsequently approved extending simulated software acceptance. KIT-04 is now **Pass (simulated)** within the [KIT-02–06 completion](2026-09-15-kit-batch-software-acceptance.md); the ledger is 51/81 closed with 30 remaining. The original real-world prerequisites below remain open. The following disposition records the earlier, pre-approval checkpoint.

## Disposition

KIT-04 remains **Blocked under its original acceptance criteria**. This continuation completes additional simulated software checks; it does not expand the earlier seven-case approval. The controlling total remains **46/81 software cases closed, 35 remaining**.

The saved `TEST-ONLY-SYS05-UI-20260915` screen fixture explicitly has no actual purchase, shipment or scientific inputs. It was inspected as context and was not repurposed or modified. Original KIT-01 purchase `67e3c24d-5915-4934-b774-db8e4cf64ca7` was not placed or shipped again.

## Completed evidence

Three new PostgreSQL checks execute through the included-case controllers in uniquely named disposable databases. Purchase, shipment, input bytes and scan verdicts are explicitly simulated. They cover:

| KIT-04 step | Additional software evidence |
| --- | --- |
| 1 | Preparation replay returns the same request. Client-supplied extra outputs cannot replace included scope. Later catalog changes cannot replace the purchased metadata, file limits or output profile. Existing component checks retain the disabled profile selector and exact case preparation link. |
| 2 | Two uploaded files retain their identities and exact checksums. Required metadata and prohibited-data confirmation gate submission. No downstream identity is introduced. |
| 3 | A controlled interruption after storing the second file removes only its uncommitted bytes. The first file survives. Retrying the same key stores one second file. A new component check confirms that the screen retains the saved-request recovery link, retries only the remaining selection with its original key, and submits both saved files once. |
| 4 | Unsupported extension, per-file overflow, aggregate overflow, missing metadata, missing confirmation, invalid manifest, Pending/Scanning/Rejected/Failed/Unavailable scan states and an expired case reject submission or editing. Fresh database reads show no accepted revision or processing run after each denial. |
| 5 | Valid submission and exact-key replay retain one revision, two attached files and the original Kit unit. Post-submission upload/removal is denied. No second commercial document or premature processing run is created. |

The remaining six existing Kit controller checks also pass after the shared fixture was extended for upload adapters. Their coverage includes split-shipment billing/deadlines, replacement history, payment versus operational holds, expiry and replay authorization. These test results alone do not close KIT-02/03/05/06.

## Verification

- Backend: **9 passed, 0 failed, 0 skipped**. Artifact: `tmp/kit-input-results/kit-input-final.trx`; includes the three additions and six existing Kit controller checks.
- Components: **5 selected included-Kit checks passed**; five unrelated tests were excluded by the name filter. One of the five selected checks is new.
- Scoped ESLint and frontend TypeScript check passed.
- Initial backend run: two passed; the third reached successful submission but compared raw JSON whitespace. The assertion now compares parsed JSON content, preserving all manifest values. The final run passes it.
- Final independent database inspection found no remaining `pseq_kit_test_*` databases. Tests migrated only their newly created disposable databases; the known loopback UAT source was used to create them, not migrated or populated by this fixture.

Only tests and test documentation changed in this continuation. No production application, running service, authentication, message sender, Git publication or deployment changed.

## Still required for original KIT-04 acceptance

Use an actually shipped intended case and approved input files with the real storage/scanner path, then perform the signed-in upload, interruption, validation and submission sequence. The earlier SYS-05 screen evidence proves interface behavior on a labeled fixture; the new controller/component evidence proves simulated software behavior. Neither supplies the missing physical/approved-input prerequisite.

Alternatively, explicit approval may extend simulated software acceptance to additional named cases while retaining their real-world gates. That scope decision is pending; no new waiver or whole-case pass is recorded here.
