# Laboratory material and equipment UAT — September 14, 2026

## Result

**LAB-03 Pass for isolated software acceptance.** All five required steps and their negative variants are complete. A real insufficient-stock error was found, fixed and retested. Overall closure advances from 14 to **15 of 81 cases (18.5%)**: 23 primarily remote cases and 43 named-gate cases remain. Six cases have now closed toward the owner's requested next ten, including the earlier CRM/shipping/Website and laboratory-versioning closures. The original seven unfinished order/shipping cases remain unfinished.

This is software acceptance using clearly identified test lots, QC decisions, equipment and a legacy non-specimen work fixture. No scientific measurement, calibration, specimen receipt, provider event, Customer purchase, production deployment or final release signoff is claimed.

## Defect and correction

**UAT-20260914-LAB03-01 — fixed locally.** In an active execution, submitting 999 mL against a 5 mL lot returned HTTP 500. `ConsumeMaterial` called the domain quantity guard without translating its exception through the API error infrastructure. The controller now returns HTTP 409 / `material_quantity_unavailable` with the existing clear quantity message. Stock and consumption history remain unchanged for zero, negative and excessive requests.

The signed-in dialog now shows **The requested quantity is not available**, retains the entered 999, and permits correction to 1 mL. The corrected save records one consumption and leaves 4 mL. A failed request is not treated as a successful stock movement.

Regression added to `AuthorizedOrderCompletesTheDatabaseBackedLabOperatorJourney`: zero, negative and over-stock requests must return the expected structured conflict, preserve saved lot quantity/version and add no consumption. The full disposable-database operator journey failed before the correction with the raw exception, then passed after correction (one test, zero skipped). Its normal material-use and subsequent laboratory journey remain covered. No broad unrelated suite was run. The execution guide now explains unavailable-quantity recovery; documentation generation/check passes.

## LAB-03 complete step crosswalk

| Step | Connected evidence |
| --- | --- |
| 1 Supplier lot and QC | Operator creates lot A through the actual form with controlled material, supplier and storage selections; required validation is visible and the saved lot starts Pending. Separate B and failure fixtures also start Pending. Operator QC is denied with 403. Supervisor Fail without a reason returns 400 and leaves the lot unchanged; the actual Fail dialog requires a reason before saving the explicit synthetic failure. A and B receive recorded Supervisor Pass decisions. |
| 2 Prepared reagent and atomic component deductions | Actual form creates one 5 mL reagent from 2 mL of A and 3 mL of B. Source stocks become 8 and 17 mL; the prepared lot retains both component IDs and quantities and starts Pending before Supervisor QC. Separate insufficient-second-component, wrong-unit, failed-QC and expired-component requests reject the whole preparation. Full lot collections match before/after each rejection, including the valid first component. |
| 3 Consumption eligibility and quantities | Active test execution rejects zero, negative, excessive, incompatible-unit, failed-lot and expired-lot requests. The actual dialog's excessive request shows the corrected recoverable message and retains its value. Correcting to 1 mL succeeds once. Fresh API and independent read-only PostgreSQL checks show one consumption, its Operator/time/lot/execution linkage and exactly 4 mL remaining. |
| 4 Equipment identity and dates | Future last-calibration and due-before-last requests return 400 without creating equipment. The actual create dialog also exposes the due-before-last error. Corrected submission creates one active pipette with assigned immutable asset code and recorded calibration dates. All calibration facts are software test data. |
| 5 Qualified and unavailable equipment use | Actual job dialog records one use of the eligible pipette with a TEST ONLY reference. Supervisor retires it through the supported endpoint with a reason; asset code and original use remain. Attempts to use this retired equipment or a known overdue fixture return 409. Execution/equipment readbacks remain identical after each rejection. The execution page displays both material and equipment traceability. |

Desktop and 390px reduced-motion execution screenshots were captured; the narrow screenshot was visually inspected and has no document overflow. This bounded check is not complete SYS-05 accessibility acceptance.

## Saved fixture and readback

| Record | Identity / final result |
| --- | --- |
| Test work | `b1ea8098-aaac-4850-8733-525d4eeba9a1`; explicit legacy non-specimen software fixture, no physical receipt. |
| Execution | `64ed9c44-bc32-458e-8508-38705473b409`; created and started through the actual API, then Abandoned with a test-completion reason. No scientific steps were completed. |
| Supplier A | `50686582-1245-4522-857a-33bc867d2485`; 10 → 8 mL. |
| Supplier B | `d740d6fa-aafe-4071-a15d-07bbe027c2a2`; 20 → 17 mL. |
| Failed supplier lot | `50524350-969e-4626-8a49-393e4efe7c7f`; Failed with reason, remains 10 mL. |
| Prepared reagent | `8c08159d-6a8e-4b79-9956-488c410b2e3c`; 5 → 4 mL after exactly one consumption. |
| Equipment | `05af7e6e-6024-470c-a62f-c536af03a9a6`; `PH-EQP-20260915-LZA2LN4E`, one use, now Retired with reason. |

The 27 pre-existing work orders, six pre-existing lots, equipment, role assignments, material/supplier/storage definitions and batches are unchanged. Existing protocol definitions, approval records, workflow stages and job pins are unchanged. Supported execution assignment/start intentionally advance concurrency counters: protocol `0167462e-b39d-4c62-8c53-3b945fd539a7` 40 → 42 and workflow `fab61845-c3f4-4a5a-9b8d-f196943241b2` 24 → 26. All other fields match; these are the existing retirement-race guards, not protocol edits or changed approvals. No counters were reset to make the comparison pass.

Cleanup preserves resource/QC history and quantities, retires the new equipment and abandons only this test execution. Its synthetic parent remains Processing; it was not completed, invoiced or projected as scientifically finished. No existing lot was consumed and no existing equipment-use record was added. Failed and expired baseline fixtures were used only for denied requests.

## Runtime and evidence

UI `https://localhost:3016`; owned API `https://localhost:7116`; isolated database `127.0.0.1:5436 / phaeno_ops_lab06_uat`. Actual existing P-LAB and P-SUP Clerk accounts were used, with no role changes. Outbound providers and background-processing restrictions retain the prior isolated settings.

Only the owned 7116 API was replaced after the passing regression. Current binary: `tmp/uat-resources-verified-build/bin/PSeq.Operations.Api/debug/PSeq.Operations.Api.dll`, SHA-256 `661E7D94E8BE15E6891054940CB9A38D9ABE4CD7816E4E60242F4D7B4E53F626`. Health returned 200; live corrected requests establish runtime behavior. Documentation corpus: `7effd90505fa0ade77b8a50db839fda07554a77a4946d16068492b54f472b78a`. No migration, production deployment or Git mutation was performed.

Retained ignored evidence:

- `tmp/uat-closure/lab-resources-connected.json`: journaled requests/responses, UI validation/recovery, original/final snapshots, quantities, resource history and cleanup; complete with no remaining failure, page error or unexpected blocked write.
- `lab-resources-fixture.json` and its pending identity journal: explicit legacy fixture boundary; the failed initial helper setup saved no work before its required service version was corrected.
- `lab-resources-db-readback.json` and `.sql`: independent read-only PostgreSQL lot, QC actor/time, consumption and equipment-use checks.
- `material-before.trx`, `material-after.trx`, their test logs, and `resources-api-baseline.json`: failing/passing regression and exact retained runtime.
- `lab-resources-traceability.png`, `lab-resources-narrow.png`, `material-docs.log`, `material-docs-check.log`: rendered traceability and documentation checks.

Harness locator/route corrections and a local-versus-UTC date adjustment were resolved without repeating successful writes. They are distinct from the reproduced and corrected product defect above. Continue from another case's missing steps; do not repeat these stock deductions or equipment usage.
