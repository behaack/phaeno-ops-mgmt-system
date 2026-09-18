# Library preparation batches and connected workflow

## Reusable Lab steps and configuration preview - September 17, 2026

Implemented locally: reusable scoped step versions, independent approval/retirement, exact-version protocol occurrences with explicit adoption and preserved legacy snapshots, plus disposable previews using Library prep capture/resource/output forms. See [implementation and acceptance status](LAB-STEPS-AND-CONFIGURATION-PREVIEW-PLAN.md#local-implementation-checkpoint). The additive local migration is applied. Production rollout remains separate.


Planned authoring work: [Lab steps and configuration preview](LAB-STEPS-AND-CONFIGURATION-PREVIEW-PLAN.md). Requirements are agreed; implementation is pending.

## Shared library output creation (2026-09-17)

Owner approved a Create library outputs modal from shared resource actions. Show all covered continuing tubes, shared unit and storage-location defaults, required individual actual quantities, optional per-tube default overrides, and generated individual barcodes after save. Existing outputs and held tubes are read-only; failed/closed attempts cannot receive new outputs. Retain the single-tube action in individual contexts. Preserve the underlying step draft when opening/closing this modal. One versioned outputs command creates all requested outputs atomically using existing lineage validation, operator/supervisor permissions, job guards and idempotency. Save generated output IDs/barcodes per member in the command history. Keep physical barcode confirmation separate. Extend the Lab API with optional outputs input and bulkOutputs capability, with no database migration or dependencies. Compile/lint and author regressions; do not run tests or mutate walkthrough data. Verification: Release solution build (including regression compilation), frontend typecheck, scoped lint, UTF-8 text checks and documentation generation passed. Tests were not executed and no operational outputs were created. Restart the running local API and refresh to activate bulkOutputs; signed-in acceptance remains pending.

## Resources within shared evidence (2026-09-17)

Move the step resource summary and its Actions control into Shared evidence beneath the fields and optional report. Show Shared evidence for resource-only steps too. Preserve the single contextual Actions control, selected-tube coverage, sample-specific fields and existing resource confirmations. Layout-only change; no new tests or operational writes.

## Optional preparation report (2026-09-17)

Owner approved replacing the manual preparation-record-reference text capture in non-QC batch/shared evidence with one optional PDF preparation report or worksheet, up to 10 MiB. Place the control in Shared evidence. Preserve required preparation mode, output barcode, material/equipment records and confirmations. Keep approved definitions and prior references intact; recognize only the established capture key/type/scope and advertise optionalPreparationReports before hiding it. Reuse scanned private uploads, idempotent step commands, automatic provenance and protected downloads. The pinned step chooses preparationReport versus qcReport; the client cannot choose metadata purpose. Add a generic report route while retaining QC routes. Include preparation reports in backup reference discovery; no schema migration, dependency or authentication change. Resource-card Actions now sit in the first row at the right beside inputs/equipment/outputs. Regression coverage is authored without running tests; connected upload/download acceptance remains pending. Release solution build, frontend typecheck, scoped lint and documentation generation passed. The running API was not restarted; restart it and refresh the page to activate the new capability.

## Protocol completion wording (2026-09-17)

Use Complete protocol for the Next step action, protocol card Actions item, confirmation title and confirmation submit button. Completion guidance refers to protocols consistently. Internal advance commands and stage identifiers remain unchanged. No workflow, permission or evidence behavior changes.

## Automatic no-match conditional review skip (2026-09-17)

Owner authorizes automatic skip when no active sample meets the prior-input-QC-hold condition. Scope is the existing exact test-protocol condition: target step 3, prior QC step 2, required review-rationale text, optional step and no new QC gate. Evaluate every continuing tube's complete pinned execution history; require resolved prerequisites and latest passing QC, no prior Hold/Fail, no existing target evidence, and at least one continuing tube. Unknown prose conditions remain operator assessed. Do not infer conditions from arbitrary text or change approved definitions. Preserve existing step roles, locks, concurrency, idempotency, and normal skip validation. Add an audited automatic step record with covered members and reason, never claim performed work. Re-evaluate after preparation commands and offer a versioned automatic reconciliation when an authorized user opens an existing eligible batch. Reads remain read-only. API adds a readiness flag and one reconciliation action; no schema/dependencies/authentication changes. Earlier corrections retain the existing downstream review requirements.

Verification: Release solution build (including regression-test compilation) passed with zero warnings/errors; frontend typecheck, scoped lint, documentation generation and whitespace checks passed. Reviewed the touched preparation page against the single Actions-menu rule; the reconciliation state exposes only one Retry action on failure. Automated tests were authored, not executed. The running local API was not restarted and no operational skip was saved for verification. Restart the API and refresh/close an open step modal to allow the eligible existing batch to reconcile; connected acceptance remains pending.
## Single-entry review rationale (2026-09-17)

For an initial performed conditional review with the required text capture review-rationale in batch/shared scope and no QC gate, use that shared text for the command's condition-assessment reason. Hide the duplicate generic reason field only in that case. Skips, repeats, corrections, other conditional steps and QC explanations retain their existing separate reason requirements. No approved definition or backend validation changes. The same text remains saved in both evidence fields for compatibility.

## Next step numbering (2026-09-17)

The next protocol-evidence action title displays Protocol N · Step M followed by the step name. Use the pinned stage sequence and the step's one-based position within that protocol; numbering restarts for each protocol and does not depend on tube count or completed outcomes. No workflow or evidence changes.

## Collapsed step sample cards (2026-09-17)

All sample cards start collapsed when the step modal opens, including failed tubes and cards with required captures. Keep position/barcode, failure badge and available actions in the header. Users expand a card to view its identity, evidence or inputs. Preserve the existing disclosure control and saved form values.

## QC report placement (2026-09-17)

Move the optional QC report control into Shared evidence, after the shared QC outcome. For tube-scoped QC, retain a Shared evidence group for the single attachment covering the selected tubes. Keep upload timing, validation, coverage and downloads unchanged. This is a layout-only change; no new tests or operational writes.

## Optional QC report attachments (2026-09-17)

Owner approved replacing the arbitrary synthetic QC reference requirement with an optional uploaded report. Scope: preparation QC step entry, one optional PDF report per evidence submission, protected download from its saved evidence/history, automatic storage reference, uploader/time/checksum and exact step/tube coverage. Save the report and evidence through the same versioned/idempotent preparation command; cancelling before Save uploads nothing. Reuse existing private operational storage and malware scanning, with a 10 MiB limit and clean-scan requirement. Keep old saved references/history readable. Recognize only the two established synthetic QC reference capture keys as obsolete optional references; other governed protocol requirements remain enforced. Advertise API support before changing older-client form behavior. No dependencies, authentication changes, database schema migration, instrument integration, public sharing or operational fixture writes. Add regressions without running them unless requested; build/type/lint at the checkpoint. This is the bounded Lab API contract extension for the authorized feature.

Implemented upload in the step modal, protected downloads in batch history and tube evidence, capability-gated compatibility, and backup-reference discovery. Private bytes that might belong to an uncertain database commit are retained for reconciliation; no automatic orphan deletion is introduced. Release solution build (including test compilation), frontend typecheck, scoped lint, documentation generation and whitespace checks passed. Regression tests were authored but not executed. Connected upload/download and backup restore acceptance remain pending. The API running in Visual Studio was not restarted and no operational evidence or reports were saved; restart it and refresh the batch to enable the capability.

## Workflow-based preparation progress (2026-09-17)

Owner approved replacing the Prepare libraries tube-outcome counter with X of Y steps completed and A of B protocols completed. Count each configured step and protocol stage once across the entire pinned workflow, including future stages, without multiplying by tube count. A step is resolved when every continuing tube has valid latest recorded evidence or a permitted skip; QC hold/fail and stale downstream evidence after earlier corrections remain incomplete. Protocol completion requires the saved Completed execution state for every continuing tube, or an explicitly permitted stage skip. Failed/cancelled tubes do not block continuing work; all-failed batches retain only progress supported by actual evidence, never automatic full completion. Tube outcomes still belong to Complete batch. No execution, schema, or operational data changes.

Display the step and protocol totals on separate rows, per owner follow-up. Browser readback confirmed 1 of 6 steps completed and 0 of 2 protocols completed in a separate verification tab, preserving the open QC form. Screenshot capture timed out; row separation is defined by distinct paragraph blocks. Final typecheck, scoped lint, documentation generation and whitespace checks passed; automated regressions authored, not executed.

## Workflow-based preparation progress (2026-09-17)

Owner approved replacing the Prepare libraries tube-outcome counter with X of Y steps completed and A of B protocols completed. Count each configured step and protocol stage once across the entire pinned workflow, including future stages, without multiplying by tube count. A step is resolved when every continuing tube has valid latest recorded evidence or a permitted skip; QC hold/fail and stale downstream evidence after earlier corrections remain incomplete. Protocol completion requires the saved Completed execution state for every continuing tube, or an explicitly permitted stage skip. Failed/cancelled tubes do not block continuing work; all-failed batches retain only progress supported by actual evidence, never automatic full completion. Tube outcomes still belong to Complete batch. No execution, schema, or operational data changes.

## Retain failed tubes in the preparation workspace (2026-09-17)

Owner clarified that closing an attempt is a status change, not physical removal. Keep failed members in their original positions and the step modal, including on reopening and optional-step skipping. Show Failed status, specimen identity, reason/evidence and any recorded step evidence as read-only. Draft tube captures retained within the current form are explicitly unsaved reference values and never submitted for the failed tube. Coverage lists keep failed tubes visibly excluded and unselectable; active and failed counts distinguish physical occupancy from processing eligibility. Keep shared observations and surviving drafts intact, require renewed coverage confirmation after an acknowledged failure, and prevent further evidence or successful library output from the failed attempt. Existing backend membership, failure guards and history remain unchanged. This supersedes the prior modal omission of failed members.

Verification: browser inspection confirmed existing failed B2 with saved reason Contaminated in the reopened modal, disabled coverage, no editable tube inputs, and its occupied tray position with 4 active / 1 failed. No operational writes. Typecheck, scoped lint, documentation generation and whitespace checks passed. Regression coverage includes immediate failure, reopening, skipping, all-failed batches, submission exclusion, and retained tray occupancy; tests authored but not executed per scope.

## Retain failed tubes in the preparation workspace (2026-09-17)

Owner clarified that closing an attempt is a status change, not physical removal. Keep failed members in their original positions and the step modal, including on reopening and optional-step skipping. Show Failed status, specimen identity, reason/evidence and any recorded step evidence as read-only. Draft tube captures retained within the current form are explicitly unsaved reference values and never submitted for the failed tube. Coverage lists keep failed tubes visibly excluded and unselectable; active and failed counts distinguish physical occupancy from processing eligibility. Keep shared observations and surviving drafts intact, require renewed coverage confirmation after an acknowledged failure, and prevent further evidence or successful library output from the failed attempt. Existing backend membership, failure guards and history remain unchanged. This supersedes the prior modal omission of failed members.

Verification: browser inspection confirmed existing failed B2 with saved reason Contaminated in the reopened modal, disabled coverage, no editable tube inputs, and its occupied tray position with 4 active / 1 failed. No operational writes. Regression coverage includes immediate failure, reopening, skipping, all-failed batches, submission exclusion, and retained tray occupancy; tests authored but not executed per scope.

## Step sample cards and identity explanations (2026-09-17)

Owner approved moving Values and exceptions to one heading before the sample cards, with each Close attempt as failed action at the trailing end of the card header. Keep disclosure and failure as separate keyboard controls. Hide the redundant tube exception field for the automatic-accession identity check when there are no editable shared exceptions or per-tube QC decisions; retain explanations and existing required validation for other steps, shared exceptions and QC holds. Omit hidden reasons from submission. Update affected form regressions without running tests; update operator help.

Browser inspection confirmed one list heading, top-row failure actions, absent redundant identity reasons, and keyboard collapse/expand. No operational records changed during verification. Typecheck and scoped lint passed; regression tests updated but not executed.

## Fail a tube from step entry (2026-09-17)

Owner approved surfacing Close attempt as failed next to each tube in the step modal. Use a confirmation view within the same dialog, requiring the existing failure reason and evidence, and submit the existing versioned/idempotent fail command. Preserve the step draft on cancellation, rejection and success. On acknowledged failure exclude the tube from further coverage, clear coverage attestation for review, and announce the outcome. Retain other tube values and the shared date; never save step evidence implicitly. Respect operator permissions, pending state, duplicate-submit protection and focus return. Avoid nested dialogs. No backend, schema or operational fixture changes. Add regression coverage without executing tests unless requested.

Implemented with the existing failure command and shared reason options. Verification: frontend typecheck, scoped lint, documentation generation and whitespace checks passed. Browser inspection confirmed the per-tube action and named same-dialog confirmation with required reason/evidence; no failure or step evidence was saved. Regression tests authored but not executed. Successful operational failure and subsequent evidence submission remain disposable-fixture acceptance checks.

## One identity check date per entry (2026-09-17)

Remove per-tube overrides for the existing shared identity-checked-on date capture in preparation forms. Keep one required shared date, explain its coverage, and retain normal server propagation into each covered execution. Omit any stale per-tube date value from validation and submission. Preserve genuinely tube-scoped dates and other shared exceptions. Clarify the existing explicit Close attempt as failed path; exception prose alone has no failure effect. No backend or saved-record changes. Verification: live browser readback shows exactly one shared identity date and all five source-barcode controls, with no per-tube date overrides. Scoped lint, typecheck and documentation generation passed. Automated tests not run; no step evidence saved.

## Automatic specimen references in preparation evidence (2026-09-17)

Owner approved replacing manual accession entry with read-only customer sample ID, specimen type and linked accession while retaining source barcode entry. Preparation treats the existing text capture key specimen-reference as the canonical accession binding, irrespective of its legacy shared scope; no label heuristics or approved-definition edits. Resolve it from the member's server-side specimen for recorded/repeated/corrected evidence, ignoring client substitutions; skipped steps contain no performed evidence. Ordinary shared captures retain exception rules. Add customerSampleId to member reads from the current authorized specimen declaration and an automaticSpecimenReferences capability flag so older APIs keep the existing form until upgraded. No schema change, migration or operational fixture mutation. Preserve tube coverage and attestation behavior. Add focused regression coverage, but do not execute tests without request. Verification: Release solution build (including test compilation) passed with zero warnings/errors; frontend typecheck, scoped lint, documentation generation and diff checks passed. Automated tests not executed. Browser readback still advertises the previous shared-reference behavior from the running API; restart the local API and refresh for connected acceptance. No step evidence or fixture data saved.

## Tray barcode in the persistent header (2026-09-17)

Show a compact QR code for the assigned physical tray beside the Tray heading, including when collapsed. Encode the exact saved tray barcode using the existing QR renderer, preserve a white quiet zone and accessible image name, and retain the readable identifier and printing action. This presentation change adds no scan or workflow mutation. Update operator help; no new tests needed for this visual-only change.

## Tray collapse after preparation starts (2026-09-17)

Collapse Tray automatically when preparation starts and on loading an already-started batch. Keep drafts expanded. A keyboard-accessible chevron heading shows the tube count and allows inspection; retain the physical tray identity and printing in the header. Preserve selected details when toggling and intentional expansion through routine refreshes. Review library outputs opens the tray before navigation. No saved workflow state changes. Verification: frontend typecheck, scoped lint and documentation generation passed. Browser readback of the already-started batch confirmed the collapsed default, visible identity/printing, pointer expansion and Enter collapse with a visible focus ring. No operational commands sent; automated tests not run.

## Direct start within library preparation — September 17, 2026

Verification: frontend typecheck, scoped lint, generated help and diff checks passed. Browser readback shows four information steps, Prepare libraries current, the direct Start preparation action and its visible consequences. The confirmed draft remains unchanged with nine history entries; no Start command was sent. Regression tests were updated/typechecked but not run. Direct-command success/failure acceptance remains pending on an authorized disposable fixture.

Owner approved removing Start preparation as a progress step and its redundant modal. The four steps are Prepare tray, Prepare libraries, Complete batch and Sequencing handoff. A confirmed draft and active laboratory work both belong to Prepare libraries; the confirmed draft offers a direct Start preparation command with visible start-time and permanent-edit-lock consequences. Preserve the backend start event, saved confirmation prerequisite, version/idempotency handling, role guards and focus after success. Guard duplicate clicks immediately, show Starting while pending, and expose command failures next to the workflow with retry through the same action. No backend, schema or operational record changes.

## Specimen declarations in tray details — September 17, 2026
Owner refinement: display the two declarations in one row of two equal columns from the small-screen breakpoint upward, stacking on narrow screens. Long values wrap within their column. An absent response field displays Not available; an explicit missing/blank declaration displays Not recorded.

Verification: Release solution build passed with zero warnings/errors; frontend typecheck and scoped lint passed. Browser inspection confirmed the two-column details and retained execution evidence. The running local API has not yet supplied the new fields; rebuild/restart it in Visual Studio, then refresh before verifying populated declarations. Tests were updated and compiled/typechecked but not executed. No operational records were changed.

Selected tube details now show Specimen type (declared biological source, such as Human liver) and Declared safety information above execution evidence. Read both from the owning job's current immutable authorization snapshot, including replacementAuthorization amendments, matched by job and submitted specimen identity. Batch the authorization read; expose only the two relevant nullable strings on preparation members. Preserve multiline declarations, show Not recorded for missing/blank values, and never infer hazards or absence of hazards. This is an additive internal preparation read response; no Commercial/Laboratory contract change, persisted model, migration or operational write. Update operator help and mapping/rendering coverage.

## Tray confirmation checkbox — September 17, 2026

Verification: scoped lint, frontend typecheck and diff checks passed; help regenerated. The live batch was already confirmed with nine history entries when inspected, so it was not reopened to exercise the changed dialog. Checkbox validation coverage is added and typechecked but not executed; rendered confirmation-dialog acceptance remains pending on an unconfirmed draft.

Replace the single-option Confirm tray dropdown with an initially unchecked required checkbox beside the review statement. Preserve the existing explicit confirmation value and backend guard; unchecked or cleared confirmation fails inline validation. Add an accessible checkbox branch to the preparation form renderer, retaining error association, focus, pending disable and the Required footer legend. Other preparation selects retain their existing behavior. Update operator guidance and validation coverage; no operational record changes.

## Combined tray preparation and step help — September 17, 2026

Owner-approved cursor refinement: use the desktop help cursor on step information controls, matching ordering progress and distinguishing informational panels from workflow actions. Click, tap and keyboard access remain unchanged. The operator guide remains accurate; no new tests for this cursor-only change.

Owner approved one stable Prepare tray step encompassing physical tray scan, tube loading and assembly confirmation. Replace the earlier six-step strip with five steps; Prepare tray remains current until durable confirmation, never merely because one or all positions are filled. The Next step panel rotates scan/load/review guidance and explicitly permits continued loading and partial trays before confirmation. Reuse the ordering progress panel interaction for every step: hover, keyboard focus and tap/click expose purpose, completion criteria and saved progress; Escape/outside interaction dismisses, focus stays on the trigger, and panels never perform workflow commands. Preserve visible next actions, existing guards, cancelled/no-passing outcomes and completed handoff behavior. No backend or persisted model change.

Verification: frontend typecheck and scoped lint passed. Browser inspection confirmed five steps with the populated unconfirmed tray still current, saved tube counts in the help panel, keyboard focus opening and Escape dismissal, and readable panels at desktop/390px widths and in light/dark themes. Restored the original system theme and viewport. No operational records were changed; batch history remained at eight entries. Help artifacts regenerated. Regression tests were added/updated and typechecked but not run; physical touch-device and full lifecycle acceptance remain separate.

## Saved tray identity without repeat scans — September 17, 2026

Owner removed the nearby Review tray shortcut and the repeated Verify tray requirement. Use the persisted trayBarcode as the assignment source of truth; no browser-only verification state. Initial scanning uses Save tray, while an assigned tray appears read-only and enables continued loading or assembly confirmation after refresh. Change tray is available only on empty, unconfirmed drafts; failed replacement saves retain the original identity, and Cancel restores that assignment. Confirmation and execution locks remain unchanged. Remove both assembly/review navigation shortcuts while keeping next-step guidance and the actual Confirm tray action in the Tray header. No backend, schema or operational record changes. Update guide and regression coverage for remount, acknowledgement, change failure/cancellation and unsaved-entry gating.

Verification: frontend typecheck, scoped lint, generated help freshness and diff checks passed. Reloaded the existing five-tube draft in the signed-in browser: the saved physical barcode remained visible, Confirm tray remained available, and no Verify tray, Scan again or Review tray action appeared. Batch history remained at eight entries; no operational write was performed. Regression tests were updated and typechecked but not executed.

## Guided preparation journey — September 17, 2026

Owner requests state-based disclosure and a progress strip matching ordering/shipping. Distinguish Verify tray (physical identity before loading) from Confirm tray (review assembled contents and lock the draft). After confirmation, surface Start preparation directly. Permit explicit Edit tray with a reason before start, invalidating the confirmation; never permit edits after start. Partial trays remain valid. Hide sequencing handoff until the preparation batch is Complete and has passing libraries. Display the active preparation stage and only available or already-recorded steps; preserve all evidence/history. Surface completion once every tube has a resolved outcome, and do not represent all-failed batches as ready for sequencing.

Engineering scope: add confirm-tray/reopen-tray commands and a trayConfirmed read field to the existing preparation API. Derive durable confirmation from the existing audited command records ordered by command version; use existing version, role, transaction and retry guards, with no new persisted model or migration. Reject assign/add/move/remove while confirmed, and require confirmation before start. Existing draft batches require explicit confirmation; started and completed batches retain their existing state. Add a six-step progress strip with one next action, retain cancellation/reopen as secondary actions, and keep record inspection available. Update guides and state/command regression coverage; do not run tests or advance the saved operational batch without request.

Verification: Release solution build passed with zero warnings/errors; frontend typecheck, scoped lint, generated help freshness and diff checks passed. Read-only browser inspection confirmed the five saved draft tubes, highlighted Confirm tray progress, a next-action panel, hidden sequencing handoff, and keyboard navigation from Review tray into the physical-barcode area. No tray confirmation, preparation start or other operational write was performed. Tests are added/updated and compile but were not executed. Rebuild/restart the local API in Visual Studio before using the new confirmation commands; persisted transitions, concurrent-client acceptance and narrow/dark inspection remain pending.

## Eligible tubes inside Tray — September 17, 2026

Move Find eligible tubes into the Tray card immediately beneath the Required legend. Use a compact text/chevron disclosure with a top divider, rather than a nested card header; show explanatory text inside the expanded content. Preserve the collapsed default, filters, paging, access rules and scan behavior. The parent supplies the list through a ReactNode slot after the legend; the existing selected-tube detail render function is unchanged. Operator help and existing pagination test composition are updated. Tests are not executed without request.

## Collapsible eligible tubes — September 17, 2026

Find eligible tubes starts collapsed and can be tucked away using its header. Native details/summary retains keyboard activation, a visible inset focus ring and a right/down chevron. The content stays mounted, preserving filters and current page while collapsed. Update the operator guide; no eligibility, scanning or saved-record behavior changes. No new automated tests for this bounded presentation change; lint and typecheck form the checkpoint.

## Batch history disclosure — September 17, 2026

Add an explicit chevron before Batch history: right when collapsed and down when expanded. Retain native details/summary keyboard behavior, with a visible focus ring and decorative icon hidden from assistive technology. This visual cue changes no history content or workflow; the laboratory guide was reviewed and remains accurate. No new tests for this visual-only change; scoped lint and diff checks are the checkpoint.

## Eligible tube pagination — September 17, 2026

Owner requested pagination for Find eligible tubes. Show 10 tubes per page with total eligible count, current/total pages and Previous/Next controls. Both existing filters are retained; changing/clearing them resets to page 1. Keep the pager mounted during page loading, disable navigation while fetching and announce the refresh. Server clamps an out-of-range page after eligibility changes, such as a saved tube leaving the candidates.

Implementation: optional `page`/`pageSize` on the existing endpoint returns items, totalCount, page, pageSize and totalPages; omission of page retains the legacy array contract. Move existing attempt/reservation/execution eligibility predicates into the database query before Count/Skip/Take. Order by barcode then identity; the paged UI no longer has a 200-candidate ceiling. Preserve role, service, Trial, intake, job status and attempt-version rules. No persisted-model changes or operational writes. Regression assertions cover distinct pages, eligible totals, combined filters and page clamping; frontend coverage covers navigation and filter resets. Tests are updated but not run without request.

Verification: Release solution build passed with zero warnings/errors; frontend typecheck, scoped lint, generated help freshness and diff checks passed. Regression tests were updated and backend tests compiled, but tests were not executed. Connected paging and large-list query acceptance remain pending after rebuilding/restarting the local API in Visual Studio; no operational records were changed.

## Physical tray identity and compact tray workspace — September 17, 2026

Visual refinement: center QR codes horizontally and vertically in occupied cells, keep position labels at the upper left and distinct execution statuses below the code. Place the Required legend at the bottom-right of the Tray card, after the selected tube details. Help reviewed; workflow instructions remain accurate and unchanged.

Owner approved separating the reusable physical tray from its batch identifier. Operators scan its existing label; `assign-tray` saves the trimmed, exact barcode through the existing versioned/idempotent preparation command and audit record. A nullable batch TrayBarcode preserves existing records without inventing physical identities. An active-only unique database index and barcode-scoped transaction lock prevent concurrent Draft/InProgress assignment to two batches. Completion/cancellation retains history and releases the identity for reuse. Reject known batch/tube barcodes. Do not change a populated batch's assigned tray; empty drafts may be reassigned. Add and Start require a saved tray identity. Existing active work remains operable without retroactively manufacturing a scan.

The header confirms the physical label, with explicit acknowledgement before tube entry is enabled. Reopening requires scanning again for local identity confirmation. Print tray label reprints the saved physical identity. Occupied cells show compact QR references and non-Planned statuses; the readable tube identity remains in the selected detail area and accessible cell name. Unavailable text is centered vertically and horizontally while the position label stays at the upper left. Select a cell to open one detail area with the existing actions/evidence; the duplicated list is removed. A tray summary replaces repetitive Planned labels. Partial trays remain valid and Start stays an explicit review step. This intentional inline laboratory workspace exception retains scanner focus/acknowledgement behavior and physical-label confirmation.

Acceptance: separate tray/batch identities survive reload; simultaneous reuse is blocked; a closed batch permits reuse without losing history; existing tubes survive initial tray assignment; incorrect assigned labels preserve scan/focus; selected details preserve every existing tube action and evidence view. No operational tray/tube assignment is performed during implementation verification. The additive migration is scoped to verified local localhost:5432/phaeno_ops; shared environments require separate approval.

Verification: migration `20260917120029_AddPhysicalPreparationTray` applied to the verified local development database. Release solution build passed with zero warnings/errors; frontend typecheck, scoped lint, help freshness and diff checks passed. Signed-in populated browser inspection confirmed five original tube assignments, compact QR cells without repeated Planned labels, selected-cell styling and one selected tube's actions/evidence area. No barcode was fabricated or assigned and no tube was added, removed or started. Tests were updated/compiled but not executed. API restart is required to load the new command; persisted assignment/concurrency, scanner/print, narrow/dark and final operational acceptance remain pending.

## Eligible tube freezer-box filter — September 16, 2026

Operators can narrow Find eligible tubes by the freezer-box barcode recorded at accession, together with the existing tube/job search. Scan or type all or part of the box barcode; empty means all boxes. Clear filters resets both controls. The optional `freezerBox` query parameter applies to container Location before the existing candidate limit, preserving authorization and eligibility guards. Results identify their recorded freezer box; no inventory, scan, schema or saved-record changes. Success means operators can locate eligible tubes from the box in hand without scrolling through unrelated boxes. Backend regression assertions cover trimmed/partial box matching, combined search, excluded undecided tubes and clearing. Tests remain unexecuted; compile, type and lint checks are the implementation checkpoint.

Verification: Release solution build passed with zero warnings/errors; frontend typecheck, scoped lint, documentation generation and diff whitespace checks passed. Tests were not run. The running API must load the updated endpoint before connected filter acceptance.

## Inline tray scanning — September 16, 2026

Owner authorized replacing per-cell Add dialogs with direct barcode fields. The header scans the batch identity first (the owner explicitly selected tray/batch identity, not a shared tube scanner). Print batch label encodes the existing immutable batch name as a QR code with a readable name and tray format; it identifies this run, not a permanent reusable tray. Confirmation is local to the open batch workspace and resets on leaving/reloading it. No permanent-tray inventory, print-success assertion, new persisted model or migration is introduced.

Operators scan the batch label, then type/scan a tube into any empty cell. Enter or Save explicitly submits that cell through the existing audited/versioned/idempotent add command. This bounded inline entry is an intentional laboratory scan-workspace exception to form-free record lists. Advance focus only after acknowledged success, left-to-right then row-by-row; skip occupied/unavailable cells and wrap to earlier empty positions if needed. Errors preserve the entered barcode and position; competing updates are refreshed without automatically moving focus to another tube. Read-only/in-progress trays expose no tube-entry controls. Partial trays remain valid and Start preparation remains a separate explicit review/confirmation. Prevent concurrent submissions; protect unsaved tube entries on navigation and announce saving/success/error/full-tray states.


Verification: frontend typecheck, scoped lint and documentation freshness passed. Signed-in browser inspection confirmed disabled tube fields before batch confirmation, Enter confirmation focusing A1, unavailable-cell presentation and the readable batch QR label preview. No tubes were saved and preparation was not started during inspection. Added component regressions remain unexecuted; persisted scan/focus recovery and physical printing/scanning acceptance remain pending.

September 14 populated recovery: distinct actual Operator/Supervisor sessions passed stale-save review and retry; a committed material-use response was dropped and unchanged retry consumed exactly once. Actual Customer reads and all seven commands were denied with unchanged batch readback. Nested writable narrow/dark/reduced-motion recovery passed. Preserve new InProgress batch a85c03b8-9414-4ba2-8852-d21497d3fa44/version 8; original completed/resource/draft fixtures remain unchanged. Connected held/closed Job and Trial guards remain open. [Exact records and limits](../testing/runs/2026-09-14-acceptance-closure.md).

September 14 browser checkpoint: all 28 preparation/protocol-execution desktop/mobile cases passed, including uncertain-save original-command retry, definite-conflict refreshed-command retry, shared/per-tube evidence, failed-output traceability, resource eligibility, role restrictions, keyboard recovery and typed QC progression. Deterministic API fixtures only; populated signed-in/server recovery remains distinct. The broader 46-pass/two-intentional-skip browser slice is recorded in [the UAT ledger](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-desktop-and-mobile-browser-workflow-slice).

September 12 closeout: forced simultaneous creation/name-collision and retry identity now have passing PostgreSQL coverage. Both connections are observed waiting at the allocation lock before release; distinct creates retain unique names and retries retain identity. Connected preparation/scientific-gate regressions also pass. No product behavior change. The [UAT closeout ledger](../testing/runs/2026-09-12-laboratory-uat-closeout.md) separates completed software evidence from remaining manual, complete-lineage and provider prerequisites; overall acceptance remains open.

Later closeout correction UAT-20260912-07: direct preparation links without the existing Lab capability show permission guidance instead of endless disabled-query loading; unresolved/unauthorized sessions cannot render cached staff details or request related resources/tubes. No backend role/policy change. Four focused regressions and the existing Customer's signed-in 3014 denial/recovery check pass. Phaeno user guides remain accurate about role requirements.

Status: implemented and focused local verification complete, September 11, 2026. Owner/physical acceptance and production release remain pending. Preparation batches, tray configuration, scoped execution, outputs, QC reuse and sequencing handoff are implemented locally. Verification details and remaining physical/production gates are recorded below.

## Outcome and users

Laboratory Operators assemble tubes into a tray and perform library preparation as one batch. Supervisors handle exceptions and review QC where the approved method requires it. Scientific Reviewers retain the separate result-release decision. The operator should see the next permitted action without manually connecting underlying records.

Receipt/accession, controlled protocols/workflows, materials and equipment remain supporting capabilities. Library prep becomes a preparation-batch workspace; specimen and job histories remain accessible throughout.

## Agreed product rules

- A preparation batch is distinct from a sequencing batch. One configurable tray belongs to each preparation batch.
- Tray formats define a name, rows/columns, position labels (such as A1–D6 or 1–24), optional unavailable positions, and active/retired status. Show a layout preview. Retiring or changing a format must not alter existing batch layouts or history.
- Partial trays are allowed. Every selected tube must have a confirmed position; empty positions are explicit.
- Tubes may come from different commercial jobs requesting the same service when specimen and preparation eligibility match. The batch selects the approved workflow version for each new attempt; existing attempts retain their execution version. This September 16 decision supersedes the first-release job workflow pin. Explicit approved Trial constraints remain in force.
- Select accepted, physically eligible tubes through barcode confirmation. Preserve the one-tube-per-specimen rule and exclusive source reservation across competing batches.
- Membership and positions may change before preparation starts. Starting locks membership, positions, the tray-layout snapshot and the workflow version. The batch stays together until completion; no splitting or transfer after start.
- A failed tube stays in the batch history. Its failure does not automatically fail the other tubes. A reserve enters a new preparation batch only after the previous attempt is explicitly failed; it never replaces a tube in a running batch.
- Reuse preparation-protocol QC for library eligibility. Do not require the same measurements or disposition to be entered again in a separate library form. Existing independent scientific-review requirements remain separate.

## Batch-first evidence and tube exceptions

The approved protocol defines scope for each capture rather than leaving the operator to invent its meaning:

| Scope | Operator entry | Evidence meaning |
| --- | --- | --- |
| Batch | Record once, for example incubation time, temperature, reagent lot or equipment | A shared observation for the explicitly covered tubes, not individual measurements |
| Tube | Record for each applicable tube when the method requires it, such as individual concentration or yield | An individual observation tied to that tube and attempt |
| Shared value with exceptions | Enter the common value once and record different values/outcomes against identified tubes | Shared evidence plus explicit tube exceptions; the effective value remains traceable to both |

Before saving a step, show which tubes it covers and require confirmation. Default coverage includes tubes still participating; failed or excluded tubes cannot inherit later successful steps or gain sequencing eligibility. Exception entry identifies the tube/position, reason and any differing value or outcome. Preserve prior records when a step is repeated or corrected. A change to shared evidence must trigger the appropriate downstream re-review for affected tubes.

QC must resolve for each tube from its applicable shared and individual evidence, following the pinned method. An exception must not be hidden by an overall batch Pass. An unresolved Hold blocks that tube's progression; a current batch-wide blocker affects all covered tubes. Do not treat a QC Hold as an automatic failed attempt or reserve start. Customer-requested holds remain blocked from implementation.

## Connected operator journey

1. **Assemble:** create a preparation batch, choose its workflow and tray format, find eligible tubes across jobs, and scan into positions. Show specimen/job identity, source eligibility and conflicts before Start.
2. **Start:** review the tray and membership, confirm identities and lock the batch. Establish or reuse compatible unstarted attempt/execution records without duplicating them; preserve explicit barcode checks.
3. **Prepare:** open ordered steps from the batch. Record shared data and resource use once, add tube-level values/exceptions as required, and keep the tray and current blockers visible.
4. **Create outputs:** create or select derived containers within the preparation context. Carry the known job, specimen, attempt, source parent and execution automatically. Confirm output identity and actual quantities; do not require users to reassemble these relationships in a separate library form.
5. **Assess QC and complete:** reuse recorded preparation evidence to determine individual library outcomes. Account for every member as successful or explicitly failed before closing the preparation batch. Holds and pending decisions prevent closure. Successful outputs can become eligible only when their required preparation and QC are complete.
6. **Handoff:** show eligible libraries and existing sequencing membership, with a direct route to Sequencing batches. No automatic pooling, dispatch, provider communication or result release. Results & review remains the later scientific-review entry point.

## Workflow disconnects explicitly in scope

| Walkthrough problem | Required improvement |
| --- | --- |
| Preparation starts by navigating individual jobs/specimens | Batch-first landing page and tray workspace with specimen drill-down |
| Operator leaves execution to create containers or record resources | Bounded actions inside the current batch/step, returning to the same context |
| Repeated entry of known specimen/source/execution references | Carry verified links forward and display them for review |
| Separate library creation after preparation | Establish the library from its prepared output and completed evidence without a second manual linkage exercise |
| Re-entering preparation QC as library QC | One authoritative evidence set, with traceable per-library eligibility |
| Unclear next action and generic errors | Specific next permitted action, affected tubes and actionable blocker explanations |
| Batch-wide work obscures individual outcomes | Per-position status, exception details and preserved specimen/attempt history |
| Disconnected sequencing handoff | Visible eligible outputs and membership; specific duplicate-membership feedback |

This is a workflow redesign, not only a tray view or a navigation rename.

## Delivery sequence

1. Produce a reviewable batch list, assembly/tray, step capture and completion/handoff design using these rules.
2. Implement tray configuration and draft assembly, including eligibility, reservations, position uniqueness and immutable start snapshots.
3. Implement batch execution, scoped evidence, shared resource references and tube exception handling without duplicating physical consumption records.
4. Integrate output/library creation, QC reuse and the sequencing handoff. Preserve approval, audit, concurrency and cross-job authorization boundaries.
5. Run the focused acceptance journey and update user help and living test plans. Apply verified model changes to local development only under existing migration rules; update the ERD with any persisted model changes.

Make technical decisions within this scope. Do not alter older approved definitions to infer capture scopes: new scopes need explicit versioned definitions. Historical executions retain their original evidence; existing unstarted work requires compatibility checks before reuse. Mixed-job batches must remain authorized for every member, and locking/reservation must be atomic.

## Acceptance and success measures

September 12 signed-in UAT: [LAB-14 run checkpoint](../testing/runs/2026-09-12-lab-14-preparation.md) records the saved tray format and isolated protocol, now Approved v1 through the separate test-reviewer account. A review-display defect omitted evidence/QC scopes; corrected and verified with three focused tests and live inspection. Administrator inspection found that the service selector exposes only the fixed PSeq service, so creating a separate catalog item cannot unblock setup. An isolated local UAT environment now runs at port 3014 with v2 approved by the separate reviewer account and promoted only in the isolated database. Immediate workflow approval under audit-only settings was withdrawn; see the run record. Full batch execution is not yet accepted.

- Assemble a partial tray using tubes from multiple jobs on the same workflow; reject incompatible versions, unavailable tubes, duplicate positions and competing reservations without partial saves.
- Edit draft membership/positions; after start, attempts to move, replace or split tubes are rejected. Later tray-format edits/retirement leave existing layout unchanged.
- Record a shared value once; record one tube exception; verify effective evidence and QC for each tube without presenting shared data as individual measurements.
- Require individual captures when prescribed. Preserve Hold/repeat and correction history, with affected downstream evidence requiring re-review.
- Fail one tube while others progress; prevent later success inheritance and sequencing eligibility for that failed tube. Reserve fallback starts a new batch/attempt from the required first stage.
- Create outputs and resource links without leaving batch context or retyping known identifiers. Count physical reagent consumption once, with traceability to all covered tubes.
- Reuse preparation QC without a second manual QC entry. Account for all member outcomes before completion; preserve separate scientific approval and release gates.
- Check cancellations, uncertain retries, stale versions, concurrent saves, authorization denial and batch membership errors. Keep physical/provider acceptance separate from synthetic tests.
- Success: no manual re-entry solely for linking records; no duplicate QC measurement entry; next action or blocker visible in the batch workspace; prior history unchanged.

## Boundaries and preserved walkthrough

The implemented navigation is Receipt & accession → Library prep → Sequencing batches → Results & review. Later groups remain PSeq kits / Data assembly, Materials / Equipment, then Lab configurations. Library prep retains the legacy work URL; Results & review opens the same jobs at Review with preserved return context. Neither queue's inclusion proves readiness.

### Lab configurations and shared tabs — September 11, 2026

The owner approved separating laboratory setup from bench work. Supervisors and Protocol Administrators manage preparation layouts in the last sidebar section, **Lab configurations**, with a cog icon and the existing divider. Its tabs are **Protocols**, **Workflows**, and **Tray formats**, in that order. Operators continue selecting active formats in Library prep; a missing format or compatible workflow links to the relevant configuration tab. Preparation-batch membership, immutable layout snapshots, permissions, workflow approval, and QC remain unchanged.

The existing `section=protocols` URL remains supported and defaults to Protocols. `configurationTab` preserves selection on refresh and browser history. Workflow-builder save, cancel and return navigation opens Workflows. Format management uses the existing bounded configuration dialog with a live tray preview; these reusable layouts are settings, not major operational records requiring a new record workspace. The tray list retains the shared shaded header and separate record rows.

The owner's application-wide tab consistency request is implemented in the shared Portal tabs: 36 px minimum triggers, 42 px single-line strips, common padding, typography, selected surface, focus and disabled states. Removed local sizing overrides in laboratory, CRM, account and Web Operations pages. Responsive grids and label wrapping may grow while retaining the minimum target size. The durable rule is recorded in [UI/UX principles](../ui-ux-principles.md).

Acceptance: confirm the three configuration tabs, direct links/refresh, correct builder return, role-gated format actions, no format-management actions in Library prep, and consistent tab geometry/keyboard access across representative workspaces. Refresh help and the LAB-14 manual journey. This navigation change does not authorize production deployment or operational writes.

Local verification completed: TypeScript, scoped lint, help generation/consistency and diff checks passed. Signed-in inspection confirmed the three tabs, direct Tray formats loading, preview/cancel, Library prep's single create action, keyboard setup-link navigation, and workflow-builder return to Workflows without saving. Receipt/configuration strips match at 42 px with 36 px triggers. The existing Web Operations fixture was inspected at 1440, 390 and 320 px with keyboard, dark and reduced-motion coverage; no overflow or runtime errors were observed. Wrapped labels increase the shared row height as needed. User guides, frontend/E2E plans and LAB-14 were updated. No full test suite or populated tray-format mutation was run for this follow-up.

Preserve TEST-008's successful Attempt 1, its two completed executions, output PH-L-U9QNAFGL5R-E and sole membership in draft PH-BAT-20260911-KNFHQ3Z8. Do not retrofit a fictional tray or recreate fixtures. Use separate synthetic preparation-batch fixtures for the new model.

PSeq kits acceptance and eventual hiding remain separate work. Partner Data assembly is not the laboratory sequencing-data pipeline. New data processing, customer-requested holds, run-all/subset policies, multi-tray preparation batches and post-start splitting/transfers are outside this scope. Deployment, shared-database migration, authentication and dependency changes retain their existing approval boundaries.

References: [Lab Operations](LAB-OPERATIONS-PLAN.md), [specimen attempts](SPECIMEN-TUBE-ATTEMPT-PLAN.md), [UAT record](../testing/runs/2026-09-11-protocol-preparation.md), [UI principles](../ui-ux-principles.md).

## Implementation decisions and reviewable screen design

- Library prep opens the preparation-batch list. Bounded creation uses a name, active tray format and compatible approved workflow. Existing jobs remain under a lookup disclosure; historical work is never assigned a retrospective tray.
- The batch detail page shows its name/status, next action, position map, per-tube disclosures, ordered stages, sequencing handoff and retained history. Draft position actions scan, move or remove; start locks the saved layout. A wide tray can scroll horizontally without making the entire page overflow.
- Step dialogs show exact coverage, shared observations, individual values and tube exceptions. Required individual captures stay individual. Repeats/corrections preserve prior entries and invalidate later review within that execution. Completed executions remain immutable.
- Output creation carries job/specimen/source/attempt links, allocates the library barcode, records quantity/storage, and requires a subsequent identity scan. Existing compatible outputs can also be selected in the tray with an identity scan and their recorded quantities carried forward. The final stage creates the library and references the existing QC records. Closing the tray is required before sequencing membership.
- Each tube retains its existing specimen attempt and per-stage execution. A preparation record stores one original command with shared values, exceptions, coverage, actor and time; effective execution records reference that original. Physical material/equipment use is stored once and linked to the same preparation record.
- Batch commands take a batch lock and sorted job locks, apply current job/Trial checks, and use optimistic versions on related work. Existing source-attempt uniqueness remains the reservation authority. A removed draft member retains history and cancels its unstarted attempt.
- Receipts use the command identifier plus actor and exact request hash. The client retains the identifier and original version after an uncertain response; a definite rejection permits a new reviewed command. No customer-requested hold workflow, provider dispatch or result release was added.
- Migration `20260911234552_AddLibraryPreparationBatches` adds four tables and nullable resource provenance references. Applied only to the verified local `localhost/phaeno_ops` database. ERD regenerated: 178 tables, 2,685 fields, 413 foreign keys.

## Verification checkpoint

- API build, frontend type checking and scoped lint passed. The local database migration is applied and the complete ERD is current. User guides and the generated 56-guide help corpus were updated.
- Ten preparation domain cases plus five existing attempt cases passed. Two PostgreSQL journeys passed: mixed jobs with a required final stage, and an optional final stage with a pre-existing output. Coverage includes true competing reservations, stale versions, Customer read/write denial, immutable start, command replay, one physical material consumption, tube Hold/failure isolation, output identity, QC reuse, sequencing duplicate rejection and reserve fallback. A fixture-query translation error in the optional-stage test was corrected and that journey rerun successfully.
- Five protocol-authoring tests passed, including explicit scope validation, scoped round-trip and preservation of older definitions.
- Ten browser checks passed: five journeys in desktop Chromium and mobile Chromium, including shared/exception payloads and automated accessibility, failed-tube exclusion, contextual output creation/selection, uncertain-response retry with original command/version, and nested material use with exact selected coverage and unfinished step retention. The shared-entry mobile case used dark theme and reduced motion. These deterministic browser fixtures do not constitute persisted or physical laboratory acceptance.
- Signed-in local POMS inspection confirmed the batch landing page, live tray preview and cancellation without a saved format. The updated select matched its 446 px field width. Historical HS5Y7DB7 work remains outside these fixtures; synthetic PostgreSQL records were independently created and cleaned.
- [LAB-14](../testing/06-laboratory.md#lab-14--preparation-trays-shared-evidence-and-sequencing-handoff) contains the complete manual acceptance journey. Held/closed Trial races, every staff-role combination, physical tray/scanner/label handling and owner sign-off remain manual acceptance gates. No provider processing, shared-database migration or production deployment was performed.

## September 12 — System-generated preparation identifiers

Approved: remove the operator-entered preparation batch name. On successful creation the API assigns `[service]-[yyyyMMdd-HHmmss]` using UTC; PSeq Lab Service uses `PSeq`. Same-second collisions receive `-02`, `-03`, etc. Allocation is serialized in the existing PostgreSQL transaction and checks existing names; the retained request ID returns the original batch on an uncertain retry. A new create intent receives a fresh request ID even if tray/workflow/notes match. Names remain immutable; historical batch names are preserved.

Optional notes (maximum 2,000 characters) are retained in the existing create-history JSON and shown on the batch workspace. No persisted model or migration changes. Older clients may still send Name, but new identifiers are server-owned. Sequencing-batch naming is outside this preparation-form change.

Acceptance: create without a name; service/timestamp heading appears; notes survive reload; distinct requests at the same timestamp stay unique; a same-request retry returns one identity; existing names and the saved LAB-14 walkthrough remain unchanged. Backend regression assertions were extended; automated execution is deferred for this code-change request. API build, frontend TypeScript, scoped lint, generated help consistency and whitespace checks passed. Tests were not executed for this code-change request.


September 12 LAB-14 follow-up: failed-output scan prompts removed while traceability links remain; terminal specimens use Processing outcome. Live saved-record inspection passed. Failed-output regression passed on desktop/mobile (2); all 11 preparation-domain tests passed, including new repeat reason/history coverage and existing correction invalidation. Manual correction/repeat remains separate and pending; see the active run record.

September 12 follow-up: signed-in correction/repeat now passed in isolated batch PSeq-20260912-155647, including missing reason, retained Hold history, later QC invalidation, fresh review and completion. Complete stage now displays batch/stage consequences instead of an empty form body; required legends depend on required fields. See active LAB-14 run for boundaries.

September 12 resource UAT: signed-in expired-lot and overdue-equipment saves rejected without usage or inventory changes. Preparation selectors now exclude those known-ineligible choices using inclusive UTC dates; server checks retained. Draft move, reason-required removal and same-source re-add passed. Active fixture and remaining gates recorded in LAB-14 run.

September 12 UI adjustment: stage Actions moved to the top-right of its card alongside the expandable title, outside the summary control. Title reserves space for the compact menu. Menu contents and processing rules unchanged.

September 12 job-label correction: work-order summaries now include an additive displayName derived from Commercial order number, then OpaqueSubmitterReference, then WO plus full work-order ID. Dashboard, work queue and detail use this label; original Commercial fields retain their meaning. No schema change. Dashboard Open Lab operations action moved to the card header. Verified distinct test names and matching detail heading as William on isolated UAT.

September 12 Operator acceptance: William's routine preparation/resource saves passed on PSeq-20260912-160957; correction controls withheld and Supervisor QC remains required. Premature stage completion rejected. Preserve the active batch at 12 history entries for separately signed-in Supervisor handoff. Full LAB-14 remains partial; evidence and remaining gates are recorded in the active run.

September 12 Supervisor follow-up supersedes the active-batch checkpoint: William returned with the Supervisor role and successfully recorded individual QC, completed the required stage, justified the optional skip and closed PSeq-20260912-160957. Reopened batch is Complete with 18 history entries, one successful tube and one eligible unassigned library using preparation QC. Preserve it as completed. Role-transition acceptance passed; different-person review and remaining LAB-14 gates remain open in the run record.

September 12 sequencing handoff: resource library now assigned to PH-BAT-20260912-67TYPTVD, retained in Draft with two libraries. Duplicate scan blocked; frontend feedback now distinguishes Batched from missing QC and directs users to the preparation assignment. Focused scanner tests and signed-in verification passed. No server rule, schema or provider action changed; remaining acceptance gates remain in the run record.

September 12 tray snapshot acceptance passed: temporary edit/retirement excluded the test format from new batch creation without altering the existing draft layout, membership or history. Original Active 2 × 3 format with B3 unavailable restored. See LAB-14 run; no product implementation changes.

September 12 linked-record acceptance: completed resource specimen and execution retain attempt history, named evidence and resource entries, direct tray work back to preparation, and expose no individual processing controls. Corrected the execution resource guidance to identify preparation as the entry point for tray-owned work. Signed-in verification and scoped lint passed; guide already matches this behavior. No operational records changed.

September 12 reviewer draft correction: Draft status messaging now distinguishes read-only access from closed preparation, and explains positions lock at start. Scientific Reviewer session confirmed absent operating controls and unchanged draft history. Resource job remains Processing; scientific-approval validation requires a suitable ScientificReview fixture. No workflow or authorization rule changed.

September 14 signed-in response-loss acceptance: one new empty test tray was cancelled through the real isolated API, with its first successful response discarded by a bounded loopback proxy. An unchanged browser retry preserved request ID/version/payload and returned the same saved state, with one cancellation record and retained form values. The owner explicitly approved temporary Operator access; the exact assignment was deactivated immediately after the test and reviewer-only controls were verified. Older preparation fixtures remain preserved. This is bounded empty-cancellation recovery evidence; populated writes, uncertain creation and full laboratory acceptance remain separate. No application behavior change. See [the recovery run](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-saved-response-recovery--passed-with-temporary-access-removed).
