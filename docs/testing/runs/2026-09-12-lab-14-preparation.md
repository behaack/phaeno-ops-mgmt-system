# LAB-14 — Signed-in preparation UAT, September 12, 2026

Environment: local POMS at https://localhost:3000 with the configured local API. Edge signed-in session; this is a software-only acceptance run, not physical laboratory work. User authorized resuming UAT. Preserve the completed HS5Y7DB7/TEST-008 work and its draft sequencing membership.

## Current checkpoint

**LAB-14 overall: Partially verified. Mixed partial tray, sequencing handoff, reserve exhaustion, terminal failure, and signed-in correction/repeat variants passed. Wider role, concurrency, resource, and accessibility variants remain open.** Current isolated runtime is port 3014/API 7114 with database phaeno_ops_lab14_uat. Earlier entries below retain their historical checkpoint context; preparation execution is no longer Not run.

### Step 1 — Tray format

- Initial Library prep list showed no preparation batches; Tray formats showed no saved formats.
- Created an unsaved two-row/three-column format and switched to numeric labels. Preview displayed 1–6. Cancelled; the list remained empty.
- Reopened creation and attempted to save with all six positions unavailable. The application rejected it: “Unavailable positions must be unique positions in the tray; leave at least one usable position.” No format appeared in the list.
- Corrected the unavailable positions to B3 and saved **TEST ONLY — LAB-14 2 × 3 tray**. Refresh retained one Active format, Grid labels, two rows, three columns and five usable positions.
- No source tubes, job records or batch memberships were created or changed.
- Partial step-2 inspection: New preparation batch offered the saved format. Preparation workflow had only the empty Choose option and an explicit missing-approved-workflow message. Cancelled without creating a batch.

### Preparation protocol draft

Saved a separate **TEST ONLY — LAB-14 tray preparation and QC**, Draft v1, based on the built-in preparation example and explicitly adapted to synthetic software observations. Earlier approved protocols remain unchanged.

- Protocol ID: `0167462e-b39d-4c62-8c53-3b945fd539a7`.
- Version ID: `ee95d55d-f191-475b-9904-cb579bd61618`.
- Preparation batches enabled; all captures required and all steps require confirmation.
- Step 1: Operator verifies each assigned source barcode; Tube scope and selected-source match required.
- Step 2: repeatable Operator preparation evidence; output barcode per Tube, simulated temperature per Batch, and simulated duration Shared with tube exceptions. Shared QC supports tube exceptions. The example's input/output and equipment requirements are retained for designated test-resource setup.
- Step 3: Supervisor reviews individual synthetic library concentration and traceability; Tube captures/QC support downstream QC reuse. Fluorometer evidence is required by the retained example configuration.
- Arbitrary software-only step-2 values: at 20 °C, duration 20 min is Pass, 10 min is Hold, 2 min is Fail; every other combination is Hold. Step-3 synthetic concentration 12 ng/µL is Pass, 2 is Fail, every other value is Hold. These are not scientific acceptance limits or actual measurements.
- Reviewed the generated definition before saving, reopened the saved revision, and inspected its approval dialog. Approval attestation remained unchecked; no approval or promotion was submitted.

## UAT defect — approval review omitted evidence scope

The saved preparation definition contained scope and source-match rules, but the approval dialog omitted them. An approver could not distinguish Batch, Tube and Shared captures or QC. Corrected the dialog to display preparation eligibility, capture scopes, QC scopes and the source-tube constraint. Legacy versions explicitly show that preparation batches are not enabled; existing invalid-definition and attestation guards remain.

Live reinspection of the saved draft confirmed all scope labels and source-match wording, with approval still disabled before attestation. All three focused approval-dialog tests passed, including the new scope/source-match regression, legacy behavior and invalid-definition blocking. TypeScript and scoped lint passed. Checkout HEAD was `b1943a8` with local changes; this is local evidence, not a deployed revision.

Updated the Phaeno guide and frontend/E2E plans. Regenerated the 56-guide help corpus (`1af2beebea9c`). The session is left at the saved draft's approval review with attestation unchecked. No approval was submitted.

## Resume safely

1. Protocol approval is complete; do not repeat it. The proposed separate-service setup is not available through the current UI (see administrator checkpoint below). The isolated environment is now running at https://localhost:3014; use it for all further LAB-14 writes. Keep author and reviewer identities distinct.
2. Complete the designated test workflow configuration, including an optional stage, with the appropriate independent approval/promotion. Do not change the existing PSeq service workflow or older pinned work to supply fixtures.
3. Prepare/verify compatible TEST ONLY jobs, sources/reserves and test resources, then continue LAB-14 step 2. Reuse the saved tray and protocol; do not create duplicates.
4. Preserve separate physical/scanner/provider/production acceptance boundaries and the block on customer-requested hold implementation.

## Separate-account approval checkpoint — September 12, 2026

After the owner completed sign-in/MFA, the user menu confirmed William Agnew (`wsa+clerk_test@example.com`). Reopened the exact LAB-14 v1 review, checked its three steps, preparation eligibility, evidence/QC scopes, selected-source requirement and software-only criteria. Submitted approval once. The list showed **Approved v1**, **Approved Sep 12, 2026, 6:37 AM**; Refresh retained that state. This is synthetic distinct-account approval evidence, not independent human/scientific validation.

Next, inspected Workflows → New service workflow. Marketed service offered only Select, with “Every active marketed lab service already has a workflow.” The existing PSeq service remains on the earlier two-stage Production workflow; retirement/invalidation fixtures are separate historical cases. Cancelled without creating or changing a workflow. A designated LAB-14 service must be configured before the new workflow can be created. Returned to Protocols with Approved v1 visible. No job, tube, execution, resource, batch membership or release action was performed.

## Administrator setup investigation — September 12, 2026

Confirmed Bill Haack in the user menu and inspected Order configuration → Service catalog and Lab Service offerings. Opened and cancelled Add item without saving. No commercial configuration was changed.

The earlier instruction to create a separate selectable LAB-14 service was incorrect. `LabOperationsController.Dashboard` filters marketed services to the fixed `pseq-lab-service` item code. `CreateServiceWorkflow` accepts active specimen-priced catalog items more generally, but the UI discovery list does not expose them. Adding a catalog item alone therefore cannot unblock this manual journey. This discrepancy is recorded rather than bypassed through an API write.

Recommended setup: a separate local UAT database/runtime in which the PSeq workflow can be exercised without altering the preserved walkthrough. Environment creation, workflow promotion and populated execution have not been performed. Do not mark these steps passed. The existing saved tray, approved protocol and all operational records remain unchanged.

## Isolated environment and workflow checkpoint — September 12, 2026

- Restored a read-only snapshot of local `phaeno_ops` into a newly created local `phaeno_ops_lab14_uat`. No source reset, migration, schema change or record repair was performed.
- Isolated frontend: `https://localhost:3014`; isolated API: `https://localhost:7114`. API health passed. The frontend uses a temporary Vite proxy configuration targeting port 7114. Existing port 3000/44399 services remain unchanged.
- Built current API into ignored `tmp/lab14-uat/build`: zero warnings/errors. Temporary launch scripts and logs are under `tmp/lab14-uat`; they resolve local credentials at runtime without embedding them. Do not commit the database snapshot or runtime artifacts.
- The isolated process disables Mailgun credentials, points outbound email/accounting endpoints at loopback, disables accounting credentials, and disables retention processing/deletion and kit lifecycle processing. Storage is a separate temporary directory outside the repository. Authentication and role configuration were not changed.
- Signed-in browser access succeeded. Copied records include the approved LAB-14 protocol; original workflow remains Production v1. Created isolated workflow v2 `6f93c876-17f1-4bb4-935b-8dfa7a77a8eb` under canonical workflow `fab61845-c3f4-4a5a-9b8d-f196943241b2`.
- v2 has a required LAB-14 tray preparation/QC stage and an optional repeat-evidence stage using the same exact approved protocol. The optional stage explicitly exists to exercise the software skip decision; it does not define a real requirement to repeat library preparation.
- Selecting Approve submitted immediately, without the protocol-style review dialog. The local audit-only dual-control configuration accepted author approval. Withdrew that approval through the normal confirmation dialog; v2 is now Draft. This is not independent-approval evidence and must not be counted as such. No promotion occurred. The difference between immediate workflow approval and protocol review is a UAT usability finding.
- Read-only database verification confirmed original `phaeno_ops` still has only Production v1 for this workflow; isolated database has Production v1 plus Draft v2. This independently confirms the browser write reached the isolated database.
- Requested William test-reviewer sign-in at port 3014. Resume by verifying identity and reviewing the saved v2 stages, then perform separate-account approval and promotion in the isolated environment only. Preparation-batch execution remains Not run.

## Separate reviewer approval and promotion — September 12, 2026

Reopened the isolated frontend at `https://localhost:3014` and confirmed William Agnew (`wsa+clerk_test@example.com`) in the user menu. Opened v2's saved stages through Continue editing, reviewed both exact protocol pins, Required/Optional settings and software-only handoff criteria, then cancelled without saving any edit. Approved once as William; Refresh retained Approved v2. Confirmed Promote to production in the isolated environment; v2 became Production and the isolated copy's v1 became Retired.

Read-only database verification independently confirmed v2 author `9bc0a52c-7344-4482-b34e-f14ec6abfff2` differs from approver `ec4b36b6-e143-4173-8c00-2319c5078cf3`. Original `phaeno_ops` still has only Production v1; the promotion affected `phaeno_ops_lab14_uat` only. This is synthetic distinct-account software evidence, not independent human/scientific validation.

Library prep loaded successfully for William, showed no preparation batches and withheld New preparation batch. This verifies the reviewer-only account does not expose batch creation in this view; backend unauthorized mutation coverage is not claimed from this UI check. Requested administrator/operator sign-in at port 3014 to continue compatible test-job and tray setup. Do not repeat approval or promotion. Batch creation, source selection and execution remain Not run.

## Populated mixed-tray walkthrough — September 12, 2026

Confirmed administrator Bill Haack at port 3014. Created **TEST ONLY — LAB-14 mixed partial tray**, `765635e8-8273-412e-b1ad-868bd3a7d366`, using the saved 2 × 3 tray and workflow v2. Empty-tray Start preparation was disabled. B3 remained unavailable; only A1/A2/A3/B1/B2 were selectable.

### Fixture provenance

Created a synthetic commercial job **TEST ONLY — LAB-14 job A**, job number `B2WB7QV8`, and issued its synthetic $200 quote in the isolated database. It remains Quote Issued; no Customer acceptance or roster finalization was performed. Do not confuse it with the laboratory fixtures below or count its upstream journey as passed.

To keep this case focused on preparation, an ignored, guarded setup helper under `tmp/lab14-uat/fixture` used the domain constructors and audit interceptor already used by `LabPreparationPostgresTests`. It writes only to `localhost/phaeno_ops_lab14_uat`, refuses duplicate fixture barcodes, and creates synthetic received/accepted laboratory records. This is fixture provisioning, not evidence of physical receipt/accession, Customer authorization, or complete Commercial/Laboratory handoff. No original records were repinned or repaired.

- Compatible job 1: `2c6088f7-7d4d-4d56-b00c-d5208b29e6d6`; specimen `fd19df14-4a1f-4b10-9898-d7817a2bb376`; tubes `TEST-LAB14-UAT-1-1` and reserve `TEST-LAB14-UAT-1-2`.
- Compatible job 2: `3d7064e3-91b8-4a2b-a8f6-20b5ad0f8fb8`; specimen `3682a996-4435-4ac7-98b4-8abb3b632f52`; tubes `TEST-LAB14-UAT-2-1` and reserve `TEST-LAB14-UAT-2-2`.
- Incompatible job: `0ebb9baa-8197-4a95-9cc7-03f7a84ce434`; tubes `TEST-LAB14-UAT-3-1`/`3-2`, pinned to old workflow v1.
- Synthetic material lot `TEST-LAB14-UAT-LOT`, 100 mL initially, and TEST-LAB14-UAT Pipette, Thermal cycler and Fluorometer assets. All locations, quantities, calibration/QC and observations are software fixtures, not physical assertions.

### Verified through the signed-in UI

1. Eligible discovery showed only compatible jobs. Scanning incompatible tube `3-1` was rejected for workflow/policy mismatch.
2. Added job 1 primary at A1. Its reserve disappeared from discovery; scanning it into A2 was rejected as already reserved.
3. Added job 2 primary at A2. Started the partial tray; positions became fixed, empty slots remained empty and batch completion stayed disabled.
4. Source identity entry rejected job 2's barcode in A1, naming the expected source. Corrected A1 and saved both identities.
5. Created output identities `PH-L-BUYJKL4SPA-9` (container `1a330538-c282-4d4e-a7a8-977dfabbb829`) and `PH-L-Y7BS7FB8HJ-E` (container `41f59d8d-9b87-4baf-8555-3ce97b29fa3a`). No physical labeling/scanning is claimed.
6. Entered shared temperature 20 °C and duration 20 min, shared Pass, with A2 duration 10 min/Hold and a synthetic exception reason. Recorded one 2 mL material use and Pipette/Thermal cycler usage covering both tubes. The unfinished step values survived these resource dialogs. Saved evidence placed only A2 On Hold and blocked its later QC.
7. Explicitly closed A2's attempt as Failed using Analysis failed plus synthetic evidence. Later QC covered A1 only. Recorded A1 concentration 12 ng/µL/Pass and Fluorometer coverage, then confirmed its exact output barcode.
8. Completed the required stage, explicitly skipped the optional repeat stage with a reason, and completed the batch. A1 Succeeded; A2 remained Failed. Only A1 produced a QC-passed library, with QC reused from preparation.
9. Created designated sequencing batch **TEST ONLY — LAB-14 sequencing handoff**, `PH-BAT-20260912-67TYPTVD`, and assigned A1's library. UI changed to Batched, showed the named assignment, removed the add action and reported 0 eligible/1 assigned.
10. Created **TEST ONLY — LAB-14 reserve fallback tray**, `03eedc8d-8ed5-4d83-9073-6af4db756327`. Only failed specimen 2's reserve appeared eligible. Scanning successful specimen 1's reserve was rejected for a final processing outcome. Added `TEST-LAB14-UAT-2-2` and started the new tray; UI showed Attempt 2 with zero step entries.

Read-only database checks confirmed the designated material lot is 98 mL, exactly one library (`1867dcf7-b462-4b64-9070-821d138f64ba`) exists for the two fixture specimens, it is Batched with retained QC and exactly one sequencing membership. Original `phaeno_ops` contains neither new preparation batch.

### Open findings and resume

- Failed tube A2 still displays “Output scan needed” and instructs the operator to label/scan despite no confirmation action being available. This is misleading; keep the retained output record but make its failed disposition clear. Not fixed in this testing turn.
- Optional skipped execution displays Abandoned; “Qc Passed” capitalization and singular/plural counts are also visible polish issues. Do not treat these as processing failures without separate review.
- Resume at reserve tray `03eedc8d-8ed5-4d83-9073-6af4db756327`, In Progress, A1 `TEST-LAB14-UAT-2-2`, Attempt 2, before its first identity step. Do not recreate or restart it.
- Remaining coverage includes correction/repeat invalidation, missing exception reasons/coverage, stale/retry/race variants through the UI, broader roles, unavailable resources, responsive/keyboard/accessibility variants, and reserve-run completion. Existing automated evidence remains separate. LAB-14 is not wholly Passed.

## Preparation identifier code change — September 12, 2026

The approved naming change is implemented: new preparation batches receive service/UTC timestamp identifiers, collision suffixes, stable retry identity and optional creation notes. Existing named test batches remain unchanged. The isolated API at port 7114 was restarted from `tmp/lab14-naming-build` after API/test-project compilation (zero warnings/errors), TypeScript, scoped lint and help-consistency checks passed. No tests or new batch writes were performed for this naming change; its acceptance scenarios remain Not run. The original IIS API was not restarted. Resume the saved reserve Attempt 2 rather than creating replacement fixtures.

## Naming acceptance and exhausted reserve — September 12, 2026

At port 3014, New preparation batch displayed only Tray format, Preparation workflow and optional Notes; no name field. Two intentionally separate creates with identical choices/notes produced `PSeq-20260912-145003` and `PSeq-20260912-145026`. Reopened the first from the list: its identifier and notes persisted. These are empty designated naming-test drafts; do not add operational tubes. Both older named preparation trays retained their names.

Ran only the two focused PostgreSQL preparation regressions against the isolated local reference connection: `PreparationMixedTrayEnforcesReservationsEvidenceFailureAndQcHandoff` and `PreparationOptionalFinalStageAndExistingOutputPreserveQcHandoff`; both passed (0 skipped). These include server-owned naming, retained notes, stable create replay, legacy supplied-name disregard and distinct creates. Same-second collision suffix and concurrent name allocation have not been separately forced in the browser.

Resumed existing reserve batch `03eedc8d-8ed5-4d83-9073-6af4db756327`, Attempt 2. Closed its synthetic reserve as Failed with Material unusable and explicit test evidence, then completed the all-failed tray. No library or sequencing membership was created from this attempt.

Opened specimen `3682a996-4435-4ac7-98b4-8abb3b632f52`. It initially showed On Hold, both attempts Failed, 2/2 tubes received and 0 selectable, with the next action to review remaining material/expected receipts. Confirm material exhausted required a reason and explicit attestation. After confirmation, the specimen showed Failed, “Material exhausted. Specimen processing failed.” and no further source action. Intake remained Accepted, preserving the distinction from processing outcome.

The earlier reserve-start resume instruction is superseded: both preparation trays are now Complete and specimen 2 is terminal Failed. Preserve these records. Further correction/repeat, role, concurrency, resource, and responsive variants require a separate designated fixture. Existing failed-output scanning prompts remain an open UI finding; “Before processing” on the terminal failure page is also misleading wording. Overall LAB-14 remains partial, not fully Passed.

## Failed-state wording and evidence regressions — September 12, 2026

Fixed the failed-output prompt: failed members no longer show Output scan needed or request labeling/scanning. Their output identifier/link remains visible with explicit traceability-only, no-sequencing wording. Terminal specimen blockers use Processing outcome rather than Before processing. Live signed-in inspection of the saved mixed tray and exhausted specimen confirmed both changes without changing their records.

Extended the failed-tube browser regression with an unconfirmed retained output; it checks the retained link, failure wording and absence of scan prompts, while preserving the successful-tube prompt assertion. Passed on desktop Chromium and mobile Chrome (2 tests). Added a held-evidence repeat regression: missing reason rejected, passing repeat clears the blocker and retains the earlier Hold. All 11 preparation-domain tests passed, including correction invalidating later review and retained shared evidence identity. These are fresh synthetic test objects, not new signed-in operational fixtures.

The two misleading prompts are resolved. Manual correction/repeat and wider role/concurrency/resource/accessibility variants remain open; the existing completed batches and exhausted specimen remain preserved. Do not mark all of LAB-14 Passed from this focused verification.

## Signed-in correction/repeat and confirmation dialog — September 12, 2026

Created a separate synthetic setup fixture only in the isolated database: source TEST-LAB14-CORR-1-1, work 78a26f5d-49b6-4f06-9254-f34ac03f734e, specimen bf85ab0b-bfa1-48fb-8df8-5263e5026dd5. This is not upstream receipt or Commercial acceptance evidence. Signed-in Bill then created PSeq-20260912-155647 (97ca7583-252c-4c3f-ab64-4ae6a52e43cb), added A1, started, and recorded identity and synthetic resource coverage through the UI.

Shared 20 C / 10 min Hold blocked the later QC step. Repeat with 20/20 Pass but no reason was rejected with Reason is required, focus on the reason, and entered values retained. Justified repeat succeeded and cleared Hold. Original Hold and passing repeat, timestamps, values, and reasons remained visible. After recording later concentration 12/Pass, corrected earlier preparation evidence with a clarified reason. Later QC explicitly required fresh evidence and batch completion remained disabled. Fresh QC correction/review restored readiness. Output PH-L-K4WMA4RVEA-6 was confirmed, required stage completed, optional stage explicitly skipped with reason, and batch closed Complete. One eligible library, zero sequencing assignments. Preserve this completed batch.

User reported a confirmation with no contents. Traced Complete stage to an empty form body and unconditional Required legend. Added affected batch/stage and consequence text to the body; required legend now appears only with required controls. Desktop Chromium and mobile Chrome regression passed (2), including visible context and cancellation producing no command. Scoped lint, TypeScript, generated-help consistency and whitespace checks passed. No new backend tests needed for this presentation-only correction. The completed old trays remain unchanged. Full LAB-14 remains partial.

## Draft changes and resource rejection — September 12, 2026

Fresh isolated setup: source TEST-LAB14-RESOURCE-1-1 (3a06e41f-b6e1-4e8e-8937-428605331350), work 0f4c4ef3-f8c1-49e3-bdea-2dbc10fbbc62, specimen 578c75e7-30b6-4001-b4cd-5057e7e464ff. Setup includes TEST-LAB14-RESOURCE-LOT expired September 11 and RESOURCE equipment with calibration due September 11. Setup used the isolated database only and is not upstream receipt proof.

Signed-in batch 6218afc4-d4c2-4437-a6ce-7e1bd46313c2: added A1, moved to B1, attempted removal without reason (rejected), removed with reason, and successfully re-added the same source to A1. Started preparation and recorded source identity. Movement/removal/re-addition history remained; no later preparation or QC performed.

Attempted 1 mL from expired RESOURCE lot: server rejected with within-date/released requirement. Attempted overdue RESOURCE Pipette: server rejected with active/within-calibration requirement. Both forms retained values. Batch history stayed at seven entries. Independent read-only database check confirmed lot still 100 mL, zero material consumptions for that lot and zero equipment uses for this work.

UI finding fixed: preparation selectors previously offered known-expired lots and overdue equipment. They now use the same inclusive UTC date boundary as server eligibility; resources without a date remain eligible subject to existing QC/status rules. Live reopened selectors excluded all designated invalid resources, while current resources remained. Desktop and mobile regression passed (2), including due-today eligibility and retired-equipment exclusion. This UI filter does not replace server checks.

Resume this active resource-test batch if another unfinished fixture is needed; do not recreate it or repeat its source entry. Completed mixed, reserve and correction batches remain preserved. No permission-role switching was performed in this continuation: code review of role gates is not new signed-in role evidence. Staff-role combinations, concurrency, remaining resource variants and broader accessibility remain open. LAB-14 remains partially verified.

Resource UI verification checkpoint: TypeScript, scoped lint, generated-help consistency and whitespace checks passed. No backend implementation or schema changes.

## Role visibility and keyboard/prerequisite checks — September 12, 2026

Added deterministic browser cases for Operator and ScientificReviewer roles viewing a Supervisor-only step. Both show Requires Supervisor and withhold Record/Correct; non-operating ScientificReviewer also has no operational Actions or batch-completion control. Passed on desktop Chromium and mobile Chrome (4). Existing backend TypedEvidenceRequiresTheStepRoleConfirmationAndValidValues passed (1), confirming domain role enforcement alongside confirmation/value checks. These are automated fixtures, not separately signed-in staff-account acceptance.

Keyboard regression passed on both desktop/mobile (2): Enter opens the step, Tab follows both coverage checkboxes into the shared capture, Escape closes, focus returns to Record step, and no command is sent. The first test draft incorrectly skipped the second coverage checkbox in its expected tab order; corrected the test expectation, with no application change.

Live signed-in check on preserved active PSeq-20260912-160957 (6218afc4-d4c2-4437-a6ce-7e1bd46313c2): keyboard Enter opened the shared step, initial focus was its coverage checkbox, Tab reached temperature, and Escape returned focus to Record step. No entered/saved evidence. Opened Complete stage via keyboard and confirmed its new batch/stage/consequence body and absence of a Required legend. Attempted completion while preparation/QC missing: rejected with both missing steps named; history remained seven entries. Cancelled dialog. No resource use, output or further evidence was created.

Active resource fixture is unchanged and remains the next resumable work. Full role/account matrix, concurrent signed-in variants, remaining resource cases and broader accessibility/physical checks remain open. LAB-14 overall remains partial.

Role/keyboard verification checkpoint: TypeScript, scoped lint and whitespace checks passed. No application or database change in this continuation.

## Concurrency and retry regressions — September 12, 2026

Added a deterministic stale-save browser case. A rejected output save leaves no output, preserves quantity/unit/location, displays the conflict, and permits a reviewed retry with a fresh request ID and refreshed version. Both desktop and mobile passed. Re-ran the paired uncertain-response case because the shared fixture handler changed: it retains the original request ID/version/payload and applies once (two more passes). These are simulated response conditions, not network fault injection into the signed-in runtime.

Extended both PostgreSQL preparation journeys to attempt stale material use after starting. Assert exact concurrency_conflict, unchanged preparation-history count, unchanged 100 mL stock and zero consumption before the valid request. Both focused journeys passed against phaeno_ops_lab14_uat (2, zero skipped); they also exercise actual competing reservations (one winner), repeated start, and material replay (one consumption). Fresh generated test fixtures are cleaned by the test scope; saved signed-in batches are not used or changed.

No application behavior change was needed. Separate signed-in multi-session conflict/fault injection and the remaining staff-account matrix remain open; automated evidence does not replace those manual gates. Resume active resource batch 6218afc4-d4c2-4437-a6ce-7e1bd46313c2 at the previously recorded checkpoint. LAB-14 overall remains partial.

Concurrency checkpoint: TypeScript, scoped lint and whitespace checks passed. Only regression tests and test plans changed.

## Signed-in two-tab output conflict — September 12, 2026

Used existing active resource batch PSeq-20260912-160957 (6218afc4-d4c2-4437-a6ce-7e1bd46313c2) in two Edge tabs, both signed in as the existing Bill account. This proves two independently loaded browser views, not different-user authorization.

Tab A (276178420) opened Create library output with quantity 10 uL and location TEST ONLY tab A pending output; left unsaved at seven history entries. Tab B (276179182) independently opened the same batch and saved 20 uL at TEST ONLY tab B saved output. It created PH-L-ZC3W65F9DT-9 (7a0e6d94-5609-4462-97ce-79262d673a08).

Saving Tab A returned This record changed. Refresh and try again; the refreshed workspace showed eight history entries and retained all Tab A form values. Attempting the save again returned This tube already has a prepared output. Open its existing output. History remained eight entries. Cancelled Tab A and verified its existing output link matches Tab B.

Independent read-only isolated database inspection found exactly one Library container for this test work, with the Tab B barcode, quantity 20 uL and saved Tab B location. No overwritten quantity/location, duplicate output, material consumption or equipment usage. Expired resource lot remains 100 mL. No further preparation or QC evidence was recorded; output identity is not yet confirmed and no sequencing library exists.

Resume this batch using its existing output; do not create it again. Original and completed UAT batches remain preserved. Signed-in stale-view and duplicate-output protection now passed. Lost-response fault injection and different-staff-account variants remain separate open gates. No code changes or automated test runs were needed for this signed-in checkpoint.

## Signed-in identity, quantity and exception validation — September 12, 2026

Reused active PSeq-20260912-160957 at eight history entries. Wrong output barcode TEST-LAB14-WRONG-OUTPUT was rejected; existing PH-L-ZC3W65F9DT-9 remains unconfirmed. Cancelled without accepting a different identity.

Selected current TEST-LAB14-CORR-LOT (99 mL) and entered 100 mL. Missing coverage confirmation was first rejected with focus on the control. After confirming coverage, the server rejected unavailable quantity; selected lot and entered quantity remained. Cancelled. Independent read-only inspection confirmed CORR lot still 99 mL; no equipment usage for this work and original output still 20 uL at the Tab B location.

Opened shared preparation step: temperature 20, shared duration 20/Pass, individual duration 10/Hold, existing output barcode. With required confirmations selected but exception reason blank, save was blocked with Tube exception or QC reason is required and focus on that textbox. Opened equipment entry from this unfinished step and cancelled: shared temperature/duration 20/20 and individual duration 10 were preserved. Cancelled the step; no evidence or resource use saved. Batch history remains eight entries and later preparation/QC remain incomplete.

These signed-in variants passed. No application change or automated regression run was needed. Preserve the active fixture/output for subsequent checks. LAB-14 remains partial; different-staff-account testing, lost-response fault injection and other unverified variants remain open.

September 12 stage Actions placement: moved from below the step list to the top-right of the stage card. Live desktop geometry confirmed title and button both at y=313, button inset 17 px from card edge; menu opened with all three expected actions. No records changed.

## Signed-in draft cancellation and reservation release — September 12, 2026

Fresh isolated setup only: source TEST-LAB14-CANCEL-1-1 (b4226d4b-1690-423a-aee2-dcfc374b827e), work 41396105-cd89-40d6-85e9-96940f32e578, specimen 8cbcf6de-2a1c-45f6-9847-51684bb5201e. No resource setup or physical processing.

Created PSeq-20260912-163357 (6a9fe327-d669-44e0-969b-fa449eab585b), scanned source into A1, and tried Cancel draft batch without a reason. Required-reason validation blocked it. Added explicit test cancellation/release reason, then cancelled. Batch showed Cancelled, no active tubes or operational actions, and three retained history entries.

Created separate PSeq-20260912-163438 (0e7a8741-bf17-4aad-ba56-30ef0c092ebe) and scanned the same source into A1 successfully. It remains Draft/Planned with two history entries. This verifies release and reuse after draft cancellation without starting processing. Preserve both records; do not repeat setup or source scan. Existing active resource batch and completed batches remain unchanged.

Asked Product Owner which Operator-only test account to use for remaining signed-in staff-role UAT. Current Bill administrator session cannot establish Operator-only restrictions. No account permissions or authentication settings were changed. Await account selection before that dependent test. Other remaining variants retain their recorded status; LAB-14 is partial.

September 12 William Operator dashboard: replaced generic Laboratory work row fallback with Commercial number/submitted reference/unique work ID. Live five rows now show CANCEL, RESOURCE, CORR and UAT job references; selected CANCEL detail heading matches. Open Lab operations appears once in the card header, 16 px from right edge. API build and frontend type checking/scoped lint passed. Isolated API restarted from tmp/lab14-label-build; original runtime and records unchanged. William remains signed in; returned to Dashboard.

## Signed-in Operator preparation and Supervisor handoff — September 12, 2026

William Agnew, configured by the owner as Lab Operator only, resumed PSeq-20260912-160957 (6218afc4-d4c2-4437-a6ce-7e1bd46313c2). Routine shared preparation was available; correction controls were absent and individual library QC explicitly showed Requires Supervisor.

Saved 1 mL from TEST-LAB14-CORR-LOT with A1 coverage, then Pipette and Thermal cycler use with confirmed coverage and TEST ONLY William Operator acceptance references. Nested resource entry preserved the preparation form. Saved shared temperature 20 C, duration 20 min, Pass, existing library barcode PH-L-ZC3W65F9DT-9, required confirmations and an explicit synthetic Operator acceptance reason. No physical procedure was performed.

The workspace now offers Repeat step, still withholds corrections, and still requires Supervisor for individual QC. History contains exactly 12 entries, including one 1 mL material entry, two equipment entries and the shared preparation record with 20/20 values and the reason. Attempted Complete stage was rejected with the missing individual QC step named; history stayed at 12. Cancelled the dialog. Batch remains In Progress, completion disabled, zero eligible libraries, and existing output identity remains unconfirmed. Do not repeat resource usage, preparation evidence or output creation.

Evidence here is signed-in UI and displayed history. Independent database readback was not completed: local helper builds encountered filesystem access errors. A no-build fallback resolved to a different fixture helper in the shared artifact directory and stopped at its existing-fixture guard; no setup was repeated. Do not count this as inventory balance or database actor verification. No application changes or automated regression tests in this checkpoint.

Operator routine work and visible Supervisor handoff passed. This does not prove every staff-role combination or a direct API authorization bypass attempt. Next dependent acceptance is a separately signed-in Supervisor reviewing this same batch. Keep William's role unchanged and preserve all existing fixtures. LAB-14 remains partial; physical validation, wider variants and production acceptance remain open.

## Signed-in Supervisor role and completed resource batch — September 12, 2026

Owner reported signing in as Supervisor. User menu still identifies William Agnew (wsa+clerk_test@example.com); the batch now exposes Supervisor QC and shows Requires Operator for both Operator steps. This is the same person after an owner-managed role change, not independent second-person review. No account or role settings were changed by Codex.

Resumed existing PSeq-20260912-160957 at 12 history entries. Confirmed synthetic output PH-L-ZC3W65F9DT-9 with its exact barcode; retained 20 uL output, no new container. Reviewed effective source identity and Operator preparation evidence (20/20 Pass with individual output barcode). Recorded TEST-LAB14-CORR-Fluorometer use for A1 with confirmed coverage and explicit test reference. Nested equipment save retained the unfinished QC form. Saved individual synthetic concentration 12 ng/uL, Pass, required confirmations and reason identifying William's Supervisor-role test and absence of physical measurement. Supervisor QC then offered Correct step, while Operator steps remained restricted. Effective evidence showed the saved individual QC alongside unchanged earlier preparation.

Completed the required stage successfully, explicitly skipped the optional repeat stage with a reason, and confirmed all tube outcomes to close the batch. Final state: Complete, A1 Succeeded, output identity confirmed, Library Qc Passed with QC reused from preparation, one eligible library and zero sequencing assignments. History has 18 entries (output identity, fluorometer, QC, stage completion, optional skip, batch completion added to the prior 12). Navigated to the preparation list and reopened the same batch; Complete, Succeeded, eligibility and 18 history entries persisted.

Preserve this completed batch; it supersedes the previous instruction to resume it for unfinished preparation. No repeat preparation, new output, sequencing assignment, provider action or physical test was performed. Signed-in Supervisor-role workflow passed. Independent-person review, the remaining role matrix, physical validation and production acceptance remain separate gates; overall LAB-14 is partial. No code changes or automated regression runs were needed.

## Signed-in sequencing handoff and duplicate feedback — September 12, 2026

As William with Supervisor controls, added completed resource output PH-L-ZC3W65F9DT-9 through Add to sequencing batch to TEST ONLY — LAB-14 sequencing handoff (PH-BAT-20260912-67TYPTVD). Preparation record now shows Batched, QC reused, the named sequencing assignment and 0 eligible / 1 already assigned; its preparation history remains 18 entries. The sequencing list shows the designated batch still Draft with two libraries (original mixed-tray library plus resource library). TEST-008 remains Draft with its original one library.

Scanning the resource barcode again rejected it and retained two memberships, but the frontend incorrectly reported a QC requirement because Batched was treated as any non-QcPassed status. Added a specific already-assigned message directing the operator to the preparation record. Server enforcement unchanged. Repeated the signed-in duplicate scan after the fix: correct assignment-conflict message, barcode retained and focused, two libraries unchanged. This is UI scan rejection, not new proof of a direct API bypass or competing-write test.

LabBarcodeScanner.test.tsx now covers successful QC-passed entry, non-library rejection, already-batched rejection and QC-failed rejection, including no add call, retained input and focus for rejected entries. All four tests and scoped lint passed. Updated the sequencing guide and generated 56-guide help corpus. Keep the designated sequencing batch Draft: no Start, sendout, provider contact or result release was performed. Preserve completed preparation and both sequencing memberships. Overall LAB-14 remains partial.

## Signed-in tray format edit, retirement and snapshot preservation — September 12, 2026

As William with Supervisor controls, opened Lab configurations / Tray formats and edited the existing TEST ONLY — LAB-14 2 × 3 tray. Baseline: Grid labels, B3 unavailable, five usable positions, Active. Temporarily changed unavailable positions to B2, B3 and cleared Available for new batches. Saved list showed four usable positions and Retired.

Opened New preparation batch: no active formats message and no selectable tray format, with a link back to Lab configurations. Cancelled without creating a batch. Opened existing draft PSeq-20260912-163438 (0e7a8741-bf17-4aad-ba56-30ef0c092ebe): original six-position layout retained, B2 still offered Add, B3 remained Unavailable, A1 retained TEST-LAB14-CANCEL-1-1 / Planned, and history remained two entries. This confirms layout snapshot preservation for a previously created draft even when the source format changes and is retired.

Reopened the format, verified B2, B3 and inactive state persisted, then restored B3 only and Available for new batches. Saved list confirms Active, two rows by three columns and five usable positions. Configuration updates are retained; no batch membership, execution, preparation evidence or sequencing status changed. LAB-14 step 6 signed-in case passed. No application change or automated tests needed. Overall LAB-14 remains partial; independent-person review, remaining role/Trial/fault variants and physical/production gates remain open.

## Signed-in completed specimen and execution boundaries — September 12, 2026

From completed resource preparation, followed TEST-LAB14-RESOURCE-SPEC-1 to its specimen page. It shows Succeeded, no available source selection, retained cancelled Attempt 1 and successful Attempt 2, optional-stage skip reason, and Open preparation batch. No individual processing action was offered.

Opened completed execution 5b3255a8-0e49-4946-af80-a81a3b0327e0 from Attempt 2. It explicitly states execution/evidence are locked, links shared work back to the preparation batch, and offers no Record, Correct, Repeat or transition actions. Retained named authors are Bill Haack for source identity and William Agnew for preparation and Supervisor QC. Values remain source barcode, output barcode, 20 C / 20 min and 12 ng/uL. Resource history displays one 1 mL lot use and Pipette, Thermal cycler and Fluorometer entries. This is visible persisted execution evidence, not a fresh independent database inventory balance check.

Fixed one misleading resource-section instruction: tray-owned executions now explain that material/equipment use is recorded in the preparation batch and retained here for review; individual executions retain their existing job-based instruction. Signed-in view confirmed corrected wording and unchanged resource history. Scoped lint passed. Existing lab-protocol-execution guide already documents batch-owned execution routing and remains accurate; no help change needed. No new automated tests for this text-only correction. No operational records changed in this checkpoint; wider authorization/bypass and remaining acceptance gates remain open.

## Signed-in numeric tray validation and cancellation — September 12, 2026

William opened New tray format with an unsaved TEST ONLY validation name, two rows, three columns and numeric labels. Preview correctly showed 1 through 6. Attempted Save with all six positions unavailable: blocked with the unique/in-bounds/at-least-one-usable-position alert, entered values retained and focus on unavailable positions. Repeated with duplicate positions 6, 6 and out-of-range position 7; both rejected with values retained. No format was created.

Changed unavailable positions to 6, then cancelled instead of saving. Refreshed the configuration page: only the original Active TEST ONLY — LAB-14 2 × 3 tray remained, with five usable positions. This passes the numeric preview, all-unavailable, duplicate/out-of-range and cancellation variants. No application changes, automated tests or operational records changed. Remaining LAB-14 gates are unchanged; overall acceptance remains partial.

## Signed-in preparation versus scientific approval boundary — September 12, 2026

Opened Results & review as William with Supervisor controls and selected TEST-LAB14-RESOURCE-JOB-1. Despite completed preparation and sequencing membership, the job remains Processing; Review says No scientific approval recorded and explains that Ready for release does not publish or attach files. Work-order Actions offers Change milestone, New container and Manage specimen attempts, with no scientific approval or customer release action. Libraries shows the single PH-L-ZC3W65F9DT-9 record as Batched and offers no second QC action for it.

This passes the visible separation between library preparation/QC and scientific approval for the Supervisor session. It does not prove direct API denial, missing-result validation under a Scientific Reviewer role, or customer visibility. No action was saved, milestone changed, approval recorded or release attempted. A Scientific Reviewer session is needed for the next dependent signed-in review check. Preserve the Draft sequencing batch and existing records. Overall LAB-14 remains partial.

## Scientific Reviewer session and draft read-only wording — September 12, 2026

Owner reported logging in as Scientific Reviewer; user menu remains William Agnew. Resource job remains Processing with no approval action or operational Actions menu. Source inspection confirms approval visibility first requires ScientificReview (or the governed ReadyForRelease package case), and the API enforces that milestone before result-package validation. Therefore missing-result validation was not exercised; the current fixture needs the appropriate workflow milestone before that case can run. No milestone was changed to bypass the workflow. Same-person role switching also does not establish independent-person review.

Opened preserved draft PSeq-20260912-163438 as this session: no Add, Start, Cancel or other operating controls; A1 remains Planned and history remains two entries. Found presentation incorrectly saying Preparation is closed because read-only Draft fell through to terminal-state wording. Corrected Draft messaging to explain read-only access and that positions lock at start. Signed-in verification confirms accurate draft wording and unchanged controls/history; scoped lint passed. Existing guide describes the same draft/start workflow and needs no behavior update. No new automated tests for this bounded copy correction. No operational records changed. Scientific-review prerequisite and remaining LAB-14 gates stay open.

## Scientific-review setup audit and role-policy checkpoint — September 12, 2026

Inspected the isolated API launcher: PSeqOrderToCash__GovernedPSeqResults is explicitly false. The scientific-approval API checks missing/complete/clean output packages only when this feature is enabled. The current LAB-14 preparation fixture is therefore unsuitable for claiming governed missing-package validation, independently of its Processing milestone. Contributor conflict enforcement also depends on dual-control rollout settings; code inspection alone is not proof that a live contributor save was denied.

Ran existing LabOperationsAuthorizationTests in a separate artifact directory: all 11 passed, zero skipped. This verifies role capability projection and related authorization-policy cases, not controller package validation or independent signed-in approval. No database fixture, runtime flag, role assignment, scientific approval or operational record changed.

Next LAB-06 acceptance setup: a separate designated review-ready synthetic fixture; governed result-package validation enabled in its isolated runtime; confirmed dual-control enforcement; an independent Scientific Reviewer who has not contributed to the work; variants for missing/incomplete/unclean package and blocking exception/unfinished execution. Preserve the completed LAB-14 trays and Draft two-library sequencing batch. Do not relabel them as review-ready to satisfy setup or fabricate provider events. Governed scientific review and publication remain untested in this run. Overall LAB-14 remains partial; remaining physical, account, fault and Trial gates remain as recorded.

## Owner-authorized independent test login — September 12, 2026

Owner explicitly requested a new login and delegated its name/email choice. Created Independent Reviewer (independent.reviewer+clerk_test@example.com) in the confirmed Clerk development instance, subject user_3JEvE28zo70KoufttJ01KtxlQ2C. Provisioned only in localhost/phaeno_ops_lab14_uat using the domain User, OrganizationMembership and LabRoleAssignment models with audit interception. Internal ID a1b30a3a-9939-4b92-82fc-6ecc5390f50d; same Phaeno organization as William (9ff77b04-f127-41fe-84b3-44f9331850f9); Active, non-admin, only ScientificReviewer. Readback found zero LabWorkEvent contributions. Initial organization lookup stopped before writes because multiple synthetic Phaeno organizations exist; corrected lookup to William's existing membership before the successful transaction.

Password supplied privately in the conversation, not stored in repository documentation or helper source. No invitation email sent, no other user's roles changed, no original/shared/production database provisioned, and no operational evidence changed. This is test-account setup, not invitation acceptance proof or a real independent human review. Sign-in and review-ready/package setup remain to be exercised.

Account setup correction: first sign-in showed Department unavailable. Readback confirmed zero department memberships; the direct test provisioning helper had omitted that required relationship. Added only a non-admin membership to the organization's active default General department (786c1d1b-b17c-4532-884d-77742441e9dd), retaining the sole ScientificReviewer role and zero work contributions. Opened a fresh Edge tab (276179350) at localhost:3014: dashboard loaded successfully and user menu confirmed Independent Reviewer / independent.reviewer+clerk_test@example.com. No authorization policy was weakened. This corrects the test setup, not the invitation workflow. Use this fresh signed-in tab for further acceptance; the earlier tab may still display its cached error.

## Governed scientific-approval rejection regression — September 12, 2026

Added LabScientificReviewGatePostgresTests with a separate synthetic organization, reviewer and legacy-compatible work order inside a rollback transaction. GovernedPSeqResults and DualControlEnforced are enabled only in the controller's test context; running UAT configuration remains unchanged. It exercises the real approval controller/database, not mocked rejection responses. One journey passed, zero skipped, covering four exact errors: scientific_review_not_ready, result_output_package_required, scientific_approval_contributor_conflict and blocking_exception_open. After every rejection, status, version and event count are unchanged and no scientific approval exists. Rollback verified by absence of test work/user.

These are automated server-level negative tests, not signed-in approval or full specimen/package readiness proof. The fixture intentionally omits tube policy to isolate these guards; it is not claimed as an end-to-end library lineage fixture. Current Independent Reviewer login and all saved LAB-14 operational records remain intact. User closed the extra access-check tab; active POMS tab is again 276178420 with Independent Reviewer confirmed. Signed-in governed review, incomplete/unclean package variants, independent positive approval and publication remain pending appropriate setup; no release attempted.

## Incomplete and unclean package guard extension — September 12, 2026

Extended the same rollback-only PostgreSQL journey with synthetic Commercial order/sample/package relationships. Scientific approval rejects packages in Uploading, Scanning and Failed with result_output_package_not_ready. Package state/version remains unchanged, scientific approval ID and release timestamp stay null, and earlier work/version/history/no-approval assertions still hold. Direct package transition checks reject missing artifacts, checksum mismatch and unclean scan flags without leaving Scanning. No file bytes, scanner execution or provider events were fabricated.

Focused journey passed (one test, seven controller rejection cases plus three domain transition rejections, zero skipped). Initial compilation required the existing LabServiceOrder/LabSample namespace import; corrected test import and reran successfully. Rollback verifies work, reviewer and package absent afterward. This extends server/domain evidence; signed-in package/scanner acceptance remains untested. No product code, saved operational records, account roles or runtime flags changed.

## Independent approval without release — September 12, 2026

Extended LabScientificReviewGatePostgresTests with a second synthetic, non-admin Scientific Reviewer who has no work contributions, plus a separate package and artifact set marked ready through domain methods. Resolved the synthetic blocking exception and called the actual scientific-approval controller. Work and package reached ReadyForRelease; the package references the saved approval and independent reviewer; exactly one ScientificApprovalRecorded event exists. Release timestamp and release user remain null, and the earlier failed package remains Failed.

Focused PostgreSQL journey passed: one test, zero failures, zero skipped, retaining seven controller rejection cases and three domain transition checks. Transaction rollback verifies the work, both synthetic reviewers and both packages are absent afterward. Current signed-in Independent Reviewer and all saved operational fixtures remain unchanged.

This is server-level approval evidence using synthetic package readiness and a legacy-compatible work order without tube policy. No actual scanner, file transfer, provider processing, customer visibility or signed-in approval was tested. Governed validation and dual control were enabled only in the test context; running UAT configuration is unchanged. Overall UAT remains partial, with the separately configured signed-in governed review journey still pending.

## Independent reviewer evidence navigation — September 12, 2026

Signed-in Edge localhost:3014 session confirmed Independent Reviewer / independent.reviewer+clerk_test@example.com. Followed resource job Execution to completed execution 5b3255a8-0e49-4946-af80-a81a3b0327e0, then its preparation batch and sequencing handoff. Completed execution displays its locked state, source/attempt identity, Bill's source verification, William's preparation and QC evidence, one 1 mL material use and three equipment uses. No Record, Correct or Repeat controls were present. Initial execution-list labels briefly showed generic placeholders before named protocol/specimen/attempt/source labels loaded; navigation used the settled labels.

Preparation 6218afc4-d4c2-4437-a6ce-7e1bd46313c2 remains Complete, A1 Succeeded, B3 unavailable, 18 history entries, zero eligible and one assigned library. Reviewer sees no operating controls. Sequencing list retains PH-BAT-20260912-67TYPTVD as Draft with two libraries and TEST-008 as Draft with one; no New batch or Start controls are present for this reviewer.

Results & review shows eight jobs, all Processing or Received; none is ready for scientific approval. Left the session on that queue. No operational writes, account changes or publication occurred. These checks pass signed-in evidence navigation and UI role boundaries only; they do not prove backend denial of crafted requests. The remaining signed-in governed approval case requires the separately configured review-ready synthetic fixture described in LAB-06; current runtime disables governed packages. Do not repeat these completed read-only checks as a substitute for that setup.

## Signed-in governed review fixture — September 12, 2026

Created a separate loopback PostgreSQL 18 cluster at 127.0.0.1:5436 with track_commit_timestamp=on and restored a copy of phaeno_ops_lab14_uat into phaeno_ops_lab06_uat. Existing PostgreSQL configuration and the original 3000/44399 and LAB-14 3014/7114 runtimes were not changed or restarted. The first 7116 startup against the existing server correctly refused governed results because commit tracking was off; no guard was bypassed. Isolated API https://localhost:7116 now runs with GovernedPSeqResults and DualControlEnforced true; UI https://localhost:3016 proxies it. Email/provider destinations remain disabled or loopback, retention processing/deletion disabled. Local launchers, fixture helper and cluster are under ignored tmp/lab06-review; temporary frontend config is node_modules/.cache/lab06-vite.config.ts. Leave these available for remaining local review cases; stop only this owned cluster when testing is finished.

Created two explicitly synthetic, legacy-compatible work orders in the new copy only. They intentionally have no tube policy or laboratory specimen/execution lineage, so this is bounded review-form/approval acceptance, not a completed scientific pipeline. Fixture setup used existing domain models and audit stamping. Compilation first corrected OpaqueSubmitterReference; domain transition and unique job-name checks stopped two setup attempts, both rolled back. Successful fixtures:

- Missing package: TEST-LAB06-REVIEW-MISSING, work 661422b7-bb43-4716-af3f-28399bee1510.
- Ready package: TEST-LAB06-REVIEW-READY, work 56730a01-a592-4fe8-bb99-47170ae87b67; package 9af5b43e-60bf-4700-af20-374dc5d6e140. Artifact metadata TEST-ONLY-synthetic-review.txt and synthetic checksum B repeated 64 times were marked ready through domain methods. No file bytes, real checksum calculation, malware scan or provider processing is claimed.

Edge tab 276179355 used the existing Independent Reviewer session at localhost:3016. Missing-package Approval form displayed the required full-width package selector, no complete/checksummed/clean package message, Required legend and disabled Save. Cancel returned without approval. Ready-package form displayed selected sample/version/file count, filename and manifest checksum. Saved once. UI moved to Ready For Release, displayed Approval v1 and removed the approval action.

Independent database readback confirmed one approval (4508b34c-4b69-489e-b369-df4f50004498) linked to the ready package and reviewer a1b30a3a-9939-4b92-82fc-6ecc5390f50d. Package state is ReadyForRelease; released_at_utc and released_by_user_id remain null. Only ScientificApprovalRecorded and ReadyForRelease work events belong to this reviewer on the synthetic job; no prior operational contributions. Missing case has no approval. No publish action was invoked. Original LAB-14 source records remain untouched; these writes exist only in the new cloned database.

Result: signed-in missing-package prevention and synthetic independent approval-to-ready path passed. Full specimen-lineage gates, actual ingestion/checksum/scanner, contributor HTTP rejection, release-manager handoff and customer visibility remain separate acceptance gates. Overall LAB-06/LAB-14 remain partial.

## Release access boundary checkpoint — September 12, 2026

The prior 3016 test tab was closed; opened Edge tab 276179361 directly at the known synthetic package route /order-operations/result-packages/9af5b43e-60bf-4700-af20-374dc5d6e140. Existing Independent Reviewer session settled on Result package unavailable with instructions to use result-release or file-management access. No package contents or publication controls were rendered. This is signed-in UI denial, not an HTTP authorization probe. Database readback still shows ReadyForRelease and null release timestamp/user.

Read-only role inventory in phaeno_ops_lab06_uat found no ResultReleaseManager assignments. Requested owner approval to assign William Agnew that role in this cloned test database only, preserving the original account environments and Independent Reviewer. No role was changed while approval is pending. Authorized release-manager queue/detail/confirmation inspection remains pending; no publication is planned in this checkpoint.

## Approved release-manager test access — September 12, 2026

Owner approved assigning William Agnew ResultReleaseManager in the isolated LAB-06 copy. Used existing BusinessRoleAssignment domain model and AuditSaveChangesInterceptor with request ID owner-approved-LAB06-William-release-role-20260912. Guarded connection is fixed to 127.0.0.1:5436/phaeno_ops_lab06_uat; checked exact active user ec4b36b6-e143-4173-8c00-2319c5078cf3 / wsa+clerk_test@example.com and expected active Phaeno membership. Idempotent helper under ignored tmp/lab06-release-role added the one missing role and read it back as active. No existing lab roles were removed or changed. Independent Reviewer's release-role count remains zero. Original databases and Clerk identity configuration were not changed.

Positive signed-in release-manager handoff awaits William's login at https://localhost:3016. This checkpoint authorizes inspecting queue/detail/confirmation and cancelling before publication. Package 9af5b43e-60bf-4700-af20-374dc5d6e140 remains the saved candidate; do not recreate approval or publish synthetic metadata.

## Signed-in release-manager handoff and cancellation — September 12, 2026

Confirmed William Agnew / wsa+clerk_test@example.com in the browser menu. His new role initially had no release navigation because the isolated launcher enabled DualControlEnforced but omitted BusinessRoles. Enabled BusinessRoles in the LAB-06 launcher only and restarted only that API after matching its parent launcher process. Queue then appeared but correctly returned incomplete governed-delivery configuration. Added test-only provider key, runtime-generated secret and unused HTTPS loopback transfer destination (127.0.0.1:1) to this launcher; no external provider connected or production configuration changed. Both are test setup corrections; the flag-combination navigation mismatch was observed, not fixed in product code.

At localhost:3016, Result release defaults to Scientifically Approved, which does not show the newly approved ReadyForRelease candidate. Selecting Ready For Release displayed the single synthetic package, its order/sample/version, organization and Independent Reviewer. This default-filter discoverability issue remains a UI follow-up; no change was made during this test.

Opened package 9af5b43e-60bf-4700-af20-374dc5d6e140. Detail retained Independent Reviewer, approval date, release definition, file metadata, and links to commercial order and scientific review. Released was Not recorded and retention Begins when released. Release to Customer opened a populated confirmation naming the package/organization and explaining Customer publication; Cancel had initial focus. Cancelled without Confirm, then used Result packages to return with ReadyForRelease filter preserved. Database readback still shows ReadyForRelease and null release timestamp/user.

Passed bounded LAB-06 step 4 handoff and confirmation cancellation as William with ResultReleaseManager. No publication, withdrawal, real file transfer, scanner validation or Customer visibility test occurred. Synthetic metadata/legacy-compatible fixture limitations remain. Active browser tab 276179372 is the filtered queue; original LAB-14 runtime/database remain unchanged. No new automated tests needed for these manual acceptance steps.

## Release queue default fixed — September 12, 2026

Owner requested fixing the default-filter issue. ResultReleasePanel now defaults to ReadyForRelease for missing/invalid query state and lists that option first. Valid explicit states remain unchanged. In signed-in William session at 3016, no-filter entry immediately selected Ready For Release and displayed the approved synthetic candidate. Released selection survived reload and displayed its empty state. Restored ReadyForRelease; tab 276179556 (Edge browser 4) marked for continued UAT. Scoped ESLint passed; Phaeno guide and generated 56-guide corpus updated (0dfb380f0c57). No new automated test for this bounded default change. No backend, role, database or publication change. This closes the default-filter follow-up; rollout-flag mismatch is separate.

## Signed-in contributor approval rejection — September 12, 2026

Created separate TEST-LAB06-REVIEW-CONTRIBUTOR work df5ff720-ee1a-4cd5-bdd3-0413fb548d13 in 127.0.0.1:5436/phaeno_ops_lab06_uat only. Audited domain-model helper under ignored tmp/lab06-contributor is idempotent by unique test reference. Fixture is legacy-compatible with synthetic ready package metadata, no tube policy, and one explicit TEST_ONLY_SYNTHETIC_CONTRIBUTION event attributed to William (event JSON states no laboratory activity was performed). This tests contributor detection; it does not claim actual receipt, processing, scanning or scientific evidence.

Verified William retains active ScientificReviewer and owner-approved ResultReleaseManager. In signed-in 3016 session, refreshed Results & review, opened the new work and Approval dialog. Ready package/file/checksum displayed. Entered a clearly marked synthetic QC summary and clicked Save once. Actual API response displayed the rule that scientific approval requires a reviewer who did not perform receipt/accession/execution/QC/library/batch/sendout work. Selected package and entered summary remained in the form. No role bypass occurred from holding ResultReleaseManager as well.

Before/after database comparison: work ScientificReview/version 1; package ReadyForReview/version 1; zero approvals; exactly the original one contribution event; approval ID and release timestamp null. Cancelled the dialog. Kept the same test tab available at the unapproved contributor case. This closes the bounded signed-in contributor rejection and input-preservation check. Existing independent positive approval is a separate fixture; full specimen pipeline and Customer publication remain untested. No application code change or additional automated test was needed.
