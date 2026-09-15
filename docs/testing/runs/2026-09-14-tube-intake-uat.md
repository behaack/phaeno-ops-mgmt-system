# Tube intake and exception-first accession UAT — September 14, 2026

## Result

**LAB-10 and LAB-13 Pass for isolated software acceptance.** Both complete step crosswalks are below. Two UI defects were reproduced, fixed and retested. Closure advances from 15 to **17 of 81 cases (21.0%)**, leaving 21 primarily remote cases and 43 named-gate cases. Eight cases have closed toward the broader request for ten further closures. The original order/shipping selection remains three of ten; its seven prerequisite-dependent cases are still unfinished.

These are connected software checks using existing, genuinely signed-in Operator, Supervisor, platform administrator and Customer Department administrator accounts. All newly created shipments, tubes, condition notes, storage identifiers and legacy states are explicitly TEST ONLY. No bench inspection, physical storage/dispatch/receipt, scanner or printer qualification, scientific suitability, provider delivery, production deployment or final release signoff is claimed. The synthetic authorization prerequisites do not close an upstream purchasing or promotional-order workflow.

## Defects fixed

- **UAT-20260914-LAB13-01 — delayed scanner focus.** A fresh accession dialog could try to focus its disabled tube input before the job details arrived. The input later enabled without receiving focus. The dialog now completes that handoff after loading, provided the user has not already focused another control. A delayed-response regression failed before correction; both the normal handoff and deliberate-navigation variants pass afterward, including real signed-in delayed requests.
- **UAT-20260914-LAB13-02 — discarded bulk storage draft.** The bulk dialog read its form's dirty flag only inside callbacks, so it did not subscribe to changes. Cancel could silently discard entered storage. Reading that flag during render now keeps dismissal, route navigation and unload protection current. The focused regression failed before correction and passes afterward. Actual Cancel and browser Back checks retain the entered storage when discard is declined; confirmed cancellation retains the identified tube selection.

Verification: all **12** receipt/accession component tests pass, none skipped; TypeScript and scoped ESLint pass. Documentation generation/check passes. The API build succeeds with zero warnings/errors and includes the refreshed help corpus. The narrow React review found no additional dependency, authorization or contract changes necessary. No broad unrelated regression suite was substituted for case acceptance.

## LAB-13 complete crosswalk

| Step | Connected evidence |
| --- | --- |
| 1 Receipt fixture | A new nine-tube shipment is registered, assigned and issued a current insert through the actual administrator/Customer APIs. Operator records its test arrival through Receive shipments. A separate two-tube shipment remains unreceived for negative checks. |
| 2 Read-only identification | Current insert lookup and one identified tube leave the complete work record unchanged. Selection is cleared without a write. |
| 3 Destroyed expected tube | Expected row → Record exception saves tube 1 as Rejected / damaged_container after identity confirmation, with test condition notes and no location or quantity. Independent database readback confirms the registered receipt, accession time, immutable external-barcode link, Operator and history. Source selection rejects it. |
| 4 Held and missing tubes | Tube 2 cannot save On hold without storage. Its Other explanation and test box then persist. Before any acceptance, the specimen is OnHold; a rejected tube alone did not reject the specimen. Tube 3 remains Assigned with no receipt, accession or rejection. |
| 5 Accept remaining | Only identified tubes 4 and 5 appear in the bulk dialog. Rejected, held and unidentified tubes are absent. Empty storage and unchecked inspection block submission. One batch stores both tubes, records separate intake events and derives specimen acceptance without selecting a source or starting execution. |
| 6 Reopen/rescan/discard | Saved decisions and boxes survive reopening. An already decided tube produces a saved-record notice and no bulk candidate. Declined selection discard leaves the dialog intact; confirmed discard preserves saved decisions. Bulk storage discard protection is fixed and retested as described above. |
| 7 Conflicts and server validation | Two signed-in Operator contexts compete over tubes 6/7: an exception saves for 6; the stale two-tube UI batch returns 409 and retains both entries, with no receipt for 7. Stale version, voided insert, foreign shipment tube, duplicate identity, unavailable/decided tube, missing confirmation/storage and absent shipment receipt are rejected atomically. A valid first row in an invalid mixed batch is unchanged. |
| 8 Uncertain response | The first successful two-tube response is deliberately dropped after commit. Saving is disabled while in flight. The UI retains both boxes and retries the identical request identity/body; the complete work record stays identical. Database readback finds one batch receipt and one initial intake event per tube. Reusing that request identity with changed contents returns 409. |
| 9 Tube detail | Tubes has a distinct Received tubes header, statuses and storage, without routine Review tube. Barcode detail shows registered receipt, notes, location and specimen/parent/child lineage. The destroyed record says Not stored and unavailable for processing, never Available. |
| 10 Corrections/source lock | Operator correction is denied. Supervisor correction requires an explanation and, for a non-stored record, retained-material storage. Tube 8 is a separate retained-material identity exception; its correction is saved from the actual detail dialog and retains the prior event. The destroyed tube is unchanged. A started source rejects intake correction, while unused reserve 9 remains independently correctable. Later test processing is placed OnHold through the supported attempt action. |
| 11 Keyboard and responsive recovery | Keyboard insert lookup, identification and opening acceptance pass. Delayed-load focus and non-interference pass after the fix. At 390px in both themes, both long required-checkbox labels retain 16×16 checkboxes aligned with their first line and the asterisk beside the final word. Short-height dialogs scroll their content and retain visible footer actions. Screenshots were visually inspected. Exception and bulk drafts guard browser Back and dismissal. Actual Library prep navigation opens preparation batches; expanding Find a job or existing specimen record exposes history. Existing section=work links remain valid. |

## LAB-10 complete crosswalk

| Step | Connected evidence |
| --- | --- |
| 1 Acceptance/audit/target | Initial acceptance of tubes 4/5 needs no reason; Operator/time persist. The specimen becomes Accepted. Independent database evidence records first acceptance at 2026-09-15 01:33:05.881310 UTC and the fixture's two-day original target at 2026-09-17 01:33:05.881310 UTC. |
| 2 Reserves | Later held/rejected reserve decisions retain specimen acceptance and the accepted source. Rejected retained tube 9 is Rejected, never automatically Disposed; its later supervised internal hold is independently audited. |
| 3 Controlled reasons | Unknown reason and Other without explanation return 400 without saving. Actual Other plus explanation succeeds for retained internal exceptions. |
| 4 Supervised correction | Detail-page correction of unused retained tube 8 verifies required explanation/storage, reload persistence, Supervisor identity and retained original history. First acceptance and original target are unchanged after all corrections. |
| 5 Aggregation/legacy | Rejected-only intake produces Received; a held tube without an accepted tube produces OnHold. Missing tubes remain unreceived. Explicit legacy unknown/unreceived containers retain null intake; accepting another tube does not backfill them. |
| 6 Independent acceptance blocked | Old specimen-disposition write returns tube_review_required. Planned work without accepted available material cannot start. A rejected source, wrong-job source and unavailable accepted fixture are denied. |
| 7 Concurrency and locks | Two simultaneous Supervisor reviews yield one 200 and one 409, one tube version increment and one specimen aggregation increment. A concurrent hold versus Start yields a saved hold and rejected Start, with no partial processing. After supervised resolution the source starts once, then locks intake; unused reserves remain correctable. A separate historical started execution without an attempt/source link retains the specimen-wide correction lock. |
| 8 Scope/history/privacy/replay | Operator-versus-Supervisor authority, Customer read/write denial, job/container and source/specimen identity guards pass. Customer shipment output omits the INTERNAL-1013 notes. Same-tube accession replay leaves the complete work DTO unchanged. Independent registered-tube and event readback confirms identities, actors, timestamps and correction history. |
| 9 Planned execution guidance | Before acceptance, a Planned legacy specimen execution shows Tube acceptance required and disabled Start; another specimen's accepted tube does not unlock it. Keyboard Open tubes reaches this job's selected Tubes tab, before Execution. A separate Accepted-but-Disposed fixture remains blocked. Actual receipt/accession of the legacy specimen then refreshes the prerequisite without starting its execution; source selection is still explicitly required. Job-level and historical started executions do not show this intake prerequisite. |

## Retained records and final audit

| Record | Identity / final state |
| --- | --- |
| Main job / shipment | `75933cd6-fbdf-4d6b-a50b-0eb0295e38b8` / `b5300605-c66e-4ebe-ae16-00a61b110111`; SS-UAT1013-MAIN-0914. Seven of nine tubes have decisions. Tubes 3 and 7 remain outstanding. |
| Main specimen | `da267407-2cac-475b-b85a-edf16d03c96b`; Accepted, with unchanged first acceptance and original target. |
| Source execution | `483d5b6a-6bdd-4996-8a01-b0e7276938aa`; started once on tube 4. Its attempt is now OnHold with explicit software-test evidence and no bench work/release instruction. |
| Unreceived comparison job | `aff4f0c7-c555-4cc2-8b7f-af63571e1da6`; both registered tubes remain Assigned without receipt/accession. |
| Legacy refresh job | `defb6430-cd68-4b1a-933d-3bcff4428908`; new accepted test tube, original unknown intake unchanged, execution remains Planned. |
| Historical source-less fixture | `8eeff58b-61c0-4fc5-8b61-1059e55bb938`; explicit synthetic historical processing state retained for the lock check. |
| Accepted/unavailable fixture | `57a52a27-9bcd-457a-904a-ffe85128d418`; explicit synthetic Accepted/Disposed history, blocked Planned execution. No physical disposal claim. |

Database audit: seven main containers, seven accession events, twelve intake-history events including corrections, one shipment receipt, one batch acceptance and one execution start. All four intentionally outstanding registered tubes across the two shipments have null receipt/accession timestamps. The destroyed tube remains version 1, Rejected, with no location or quantity.

All **28 pre-existing work orders**, lots, equipment, role assignments, suppliers, material/storage definitions and batches match the original snapshot. Existing protocol/workflow definitions, approvals and pins are unchanged. Normal source selection/start retirement guards advance protocol identity `0167462e-b39d-4c62-8c53-3b945fd539a7` 42→44 and workflow identity `fab61845-c3f4-4a5a-9b8d-f196943241b2` 26→28; every other field matches. No role access was added and no counters were reset.

Setup/harness corrections are recorded separately from product defects: the test shipment unit was corrected from volume to the existing definition's tube count before insert issuance; a Customer administrator's different active Department correctly received 404, after which the existing Research Department administrator was used. Locator, confirmation-handler cleanup and screenshot viewport timing adjustments did not repeat successful business writes.

## Runtime and evidence

UI `https://localhost:3016`; owned API `https://localhost:7116`; isolated PostgreSQL `127.0.0.1:5436 / phaeno_ops_lab06_uat`. External providers and background processing retain their prior isolated restrictions. Only the owned API was refreshed to include the generated help corpus; health and final authenticated readbacks pass.

Final binary: `tmp/uat-tube-final-build/bin/PSeq.Operations.Api/debug/PSeq.Operations.Api.dll`, SHA-256 **724AC7F76D0DF9F2C7C228286182D2D6F5E3BB2D4E2AE51A5885370C2D442C54**. Corpus: `75848f9f5739887350a54c20a2b7e4abcc6ef5bfef8d57283dcfffc136c85889`. No migration, deployment, dependency/authentication change or Git mutation.

Retained ignored evidence: `tmp/uat-closure/tube-uat-connected.json` (complete journal, requests, concurrent outcomes, retained UI values and final snapshots); `tube-fixture.json`, `tube-unavailable-fixture.json`; `tube-first-acceptance.json`; `tube-db-readback.sql/json`; `tube-focus-before.json`, `tube-discard-before.json`, `tube-ui-after.json`; `tube-api-baseline.json`, build/runtime logs; `tube-batch-{light,dark}.png`, `tube-exception-{light,dark}.png`, `tube-exception-short-{light,dark}.png` and navigation/eligibility screenshots. Final signed-in verification reports no page errors or unexpected blocked writes. Continue with another incomplete case; do not repeat these receipts, acceptances or corrections.
