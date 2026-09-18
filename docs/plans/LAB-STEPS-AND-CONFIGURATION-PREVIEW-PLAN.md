# Lab steps and configuration preview

Status: implemented locally; validation and live catalog acceptance tracked below. Owner authorized execution on September 17, 2026.
Decision date: September 17, 2026.

## Purpose and users

Laboratory configuration authors need to define reusable procedures consistently and inspect the operator-facing data-capture experience before approving a configuration for production use. Reviewers need to understand what changed and which protocols are affected.

The owner is validating the authored configuration, not testing the application or simulating laboratory data flow. Configuration preview is part of authoring and review. It does not establish scientific validity or grant production approval.

## Agreed hierarchy

| Configuration | Responsibility |
| --- | --- |
| Lab step | Reusable definition of one laboratory action, its instructions, evidence fields, resource requirements, outputs, roles and QC criteria. |
| Protocol | Ordered composition of specific Lab step versions, with dependencies and applicability in that protocol. |
| Workflow | Ordered composition of specific protocol versions into the laboratory process. |

Current protocols embed step definitions. Current workflows reference protocol versions. The new Lab step catalog extends this model without changing historical execution meaning.

## Lab step requirements

1. Add **Lab steps** to Lab configuration, following the existing view-first list/detail and bounded authoring patterns.
2. Give each step a stable identity and immutable approved versions. Use the existing draft, approval and retirement conventions and permissions; define the detailed approval behavior in the implementation design without weakening existing controls.
3. A step owns instructions; typed captures with labels, units, allowed choices and required/optional settings; shared versus tube scope; attachment presentation; material/equipment/output requirements; operator confirmation; role requirements; and QC criteria.
4. Protocol authors select an exact step version and arrange its occurrences. Sequence, dependencies, required/conditional placement and applicability belong to the protocol composition. Avoid free-form overrides that conceal scientific differences; distinct instructions or criteria require an explicit version or distinct step.
5. Each occurrence has its own stable identity and execution evidence. Reusing a definition, including twice within one protocol, never reuses results or collapses completion counts across occurrences.
6. Show **Used by protocols** and identify newer approved step versions. Adoption is explicit and creates a new protocol draft; never update approved protocols or active batches silently.
7. Review and approve the assembled protocol independently of the approval status of its individual steps. Retiring a catalog item prevents new selection but preserves historical references.
8. Preserve exact resolved definitions and provenance in approved protocol snapshots. Existing protocols, batches, records, repeats, corrections, conditional decisions and output lineage must remain readable and executable against their original definitions.

## Configuration preview requirements

Provide **Configuration preview** from both the Lab step editor and Protocol editor, including drafts before approval. Integrate it with the existing contextual Actions convention where multiple actions exist.

The central question is: "Does this configuration ask the operator for the right information, in the right way?"

- Render the same production capture components and presentation used by Library prep, supplied with a few clearly fictional example tubes and specimen details.
- Preview instructions, field labels, input types, required/optional settings, units, choices, validation messages, shared evidence, individual-tube values/overrides, attachments and resource/output controls.
- Allow temporary example values and **Validate entry** to reveal missing or invalid capture information. Use the same configuration-level capture validation as the operational form.
- In a protocol preview, select any step directly or use **Previous step / Next step**. Do not require completion of preceding steps, actual specimen state, inventory or QC prerequisites to inspect a form.
- Permit explicit selection of relevant presentation states such as performed, skipped where permitted, repeat and correction. These are author-selected preview states, not calculated workflow progression.
- Shared/individual field placement and resource dialogs must reflect the production configuration. Opening a resource or output control may show its presentation with fictional choices; it must not allocate inventory or create operational resources.
- Attachment selection is local and disposable. No upload, scanning request or durable file reference is created. Simulated identity/barcode presentation must not allocate or register real barcodes.
- Clearly label the preview and the configuration/version being previewed. Returning to editing must preserve the author's configuration draft. Unsaved editor changes should be previewable without approving or publishing them.
- After a configuration edit, make the updated preview explicit and reset incompatible example values. Do not silently continue a preview against a stale definition.
- Offer reset and discard temporary example values when the preview ends. Do not retain specimen-like example entries as operational evidence or persist them across authoring sessions.
- Support keyboard use, focus restoration, narrow viewports, light/dark themes and required-field legends through the existing UI patterns.

## Isolation boundary

Preview must have no operational write path. It must not create or modify batches, attempts, specimens, evidence records, output containers, libraries, inventory, reservations, approvals, audit events claiming performed laboratory work, sequencing handoffs or customer-facing status. Operational save/upload/print/allocation callbacks must be absent or replaced with explicitly local preview behavior, not merely hidden buttons.

Configuration read/edit permissions remain enforced. Previewing another role's field presentation does not grant that role or permit a production action. Use fictional fixtures rather than retrieving real specimens or production inventory for this feature.

## Out of scope for the initial release

- Application/system testing tools or a test execution dashboard.
- Full batch/workflow simulation, cross-protocol data flow or production readiness evaluation.
- Automatic conditional evaluation, auto-skip decisions or progression through QC gates in preview.
- Inventory consumption, equipment availability/calibration checks, barcode allocation, output creation, report uploads or downstream handoffs in preview.
- Persistent scenario libraries, shareable simulation runs, preview evidence or new approval bypasses.

These can be considered separately if needed. They are not prerequisites for configuration preview.

## Engineering approach and delivery sequence

1. Map the current `LabProtocolDefinition`, `LabProtocolStepDefinition`, protocol editor and Library prep capture components. Separate reusable step content from occurrence-specific protocol settings. Record the migration and API contract design before implementation.
2. Refactor capture presentation into a shared renderer with injected operational versus local-preview actions. Keep existing operational behavior intact; avoid a second form implementation that can drift.
3. Deliver protocol and individual-step capture preview using draft definitions and local fictional fixtures. This authoring benefit need not wait for the catalog migration.
4. Add Lab step identities/versions, catalog authoring, usage references and explicit version adoption in protocol composition. Introduce occurrence identities and preserve frozen resolved protocol snapshots.
5. Adapt preview entry points to catalog step versions and composed protocols. Retain compatibility for legacy embedded definitions and existing execution history.
6. Plan any extraction/backfill carefully. Similar names are not proof that two embedded steps are equivalent; do not silently deduplicate different scientific procedures. Existing approved definitions must not be rewritten merely to populate the catalog.

No new dependency is presumed. Keep routes thin and configuration behavior feature-owned. A persisted-model change will require EF migrations and a same-change update to `docs/database-erd.md`; applying a future migration to shared/production environments requires authorization for that release. The September 17 authorization for the current application release does not apply to unimplemented schema changes in this plan.

## Acceptance criteria

- An author defines and versions a reusable step, composes a protocol from exact versions, and sees all protocols using that step.
- Updating/retiring a step does not change an approved protocol, active batch or historical record; explicit adoption affects only a new draft.
- Two occurrences of one step retain independent evidence and completion identity.
- A draft step/protocol preview displays the same capture structure as Library prep for that definition, including shared and individual fields and required markers.
- An author can inspect any step, enter disposable values, see capture-validation errors, reset, and return to an unchanged configuration draft without a real batch.
- Relevant form states can be inspected without manufacturing prior QC results or executing workflow progression.
- All preview interactions, including nested resource dialogs and attachments, leave operational records, inventory, files and identifiers unchanged.
- The UI clearly distinguishes preview from live recording and preserves keyboard/focus/responsive behavior.

## Validation and documentation work for implementation

Update the backend, frontend and E2E living test plans as implementation proceeds. Cover version pinning, occurrence identity, adoption/retirement, legacy compatibility, approval/authorization and optimistic concurrency. Cover presentation parity and absence of operational mutations in preview, including nested dialogs and file controls. Exercise the author workflow manually with representative shared, tube-scoped and conditional capture configurations. Run automated tests only when requested under repository policy.

Update the Phaeno configuration and protocol-execution guides when implemented. Keep this plan linked from the owning Lab plans; do not describe these proposed capabilities as currently available in user help.

## Success measures

- Authors can identify and correct capture configuration issues before approval without creating disposable operational batches.
- Reused step definitions have visible version adoption and usage, reducing duplicated authoring while preserving scientific distinctions.
- Preview faithfully reflects the production capture forms and produces zero operational side effects.

## Related documents

- [Lab Operations plan](LAB-OPERATIONS-PLAN.md)
- [Library preparation journey](LAB-WORK-JOURNEY-PLAN.md)
- [Lab Operations contract](LAB-OPERATIONS-CONTRACT.md)
- [UI/UX principles](../ui-ux-principles.md)
- [User documentation policy](../user-documentation.md)

Implementation checkpoint follows the approved requirements; production rollout remains separate.

## Implementation design - September 17, 2026

- Add separate `lab_ops.lab_steps` and `lab_ops.lab_step_versions` entities using the existing audited identity/concurrency and independent approval conventions. A version contains exactly one scoped step definition. No existing embedded steps are extracted or deduplicated automatically.
- Add optional `labStepVersionId` provenance to each resolved protocol occurrence. The existing unique step key is the occurrence identity and is preserved during editing/reordering/adoption; duplication assigns a new key. Ordered predecessors remain execution dependencies. Protocol-specific required/conditional placement remains outside catalog content.
- Resolve pinned content on the server at draft save and approval; reject modified content and unavailable new selections. Existing pinned approved content survives retirement. No operational reader resolves mutable catalog content.
- Add role-protected catalog read/create/version/transition endpoints under Lab Operations. Parent identity concurrency serializes draft editing, approval and retirement. Usage is derived from retained protocol snapshots; catalog identities/versions have no delete endpoint.
- Share the existing step editor and Library prep dialog. Preview supplies fictional members and only local callbacks, with explicit preview labels and disposal on close. Nested resource presentation uses the same form/output components with local validation only. No operational API hooks or upload callbacks are mounted by preview.
- Preserve legacy embedded protocols; the catalog is an additional authoring source. The new database migration is additive and applies locally only for this implementation. Production deployment and shared database migration are not part of this execution request.

## Local implementation checkpoint

- Implemented catalog list/detail/editor, draft/approved/discarded lifecycle, independent approval and explicit platform-administrator override, retirement and protocol usage. Old approved versions remain available for explicit exact-version selection while the identity is current; there is no automatic replacement.
- Implemented resolved version pins and stable occurrence/capture keys, read-only catalog content in protocol composition, explicit newer-version adoption in a draft, ordered prerequisite preservation and backend rejection of content overrides or silently removed provenance. No legacy extraction/backfill or approval rewriting.
- Implemented unsaved protocol/step preview with the shared Library prep dialog and validation, fictional specimens, direct step navigation, repeat/correction/skip presentation, local optional PDF selection, shared resource/output forms, reset and disposal. Operational allocation/upload/failure callbacks are absent or disabled in preview. Invalid tube cards expand to reveal errors.
- Implemented shared optional QC/preparation PDF presentation in step authoring and formal protocol review. Existing legacy report-reference behavior remains supported.
- Migration `20260917191542_AddReusableLabSteps` was reviewed (two additive tables, indexes and restricted FK) and applied only to verified `localhost:5432/phaeno_ops`. ERD, API contract, Phaeno help and living test plans updated.
- Backend Release solution/test-project build, frontend typecheck and scoped lint passed at the checkpoint. Authored domain/PostgreSQL/component regressions have not been executed, in accordance with the repository test policy. Documentation corpus regenerated: 56 guides.
- Browser inspection in the existing signed-in local session confirmed unsaved protocol preview, fictional identity, shared/per-tube capture structure, required-field validation with expanded invalid cards, direct navigation to the final QC step, and disposable output validation. Desktop and 390px reflow inspected. No configuration draft, operational evidence, inventory, output or approval was saved during these checks.
- After the owner restarted the API, live catalog creation and draft saving succeeded. The clearly labeled local TEST ONLY fixture `13f30227-3939-4d1c-8cf5-1a9946629f58` retains one unapproved draft and no protocol references. Its saved preview displayed batch scope, both fictional tubes selected, optional shared QC attachment and successful local validation. Browser inspection exposed and resolved a missing nested editor outlet. Approval/adoption/retirement, concurrency, dark-theme and full multi-role acceptance remain unverified in the browser; regression tests are authored but unexecuted. No production migration, deployment or Git mutation is included in this implementation checkpoint.

### Batch defaults clarification

The owner confirmed that all steps are performed in batch by default. New protocols enable preparation batching, and new captures/QC gates default to batch scope. Barcode identity remains tube-specific; explicit per-tube or shared-with-exceptions scopes remain available. Existing saved/approved definitions keep their exact scopes. The recording form initially covers all eligible tubes.

### Recording terminology and scientific text entry

Use Step record as the umbrella for actions, additions and measurements. Library prep and configuration preview use Batch entries and Sample entries and exceptions; authoring uses Fields to record and Recorded for. Preserve evidence terminology for supporting failure/QC evidence and preserve all stored property names and protocol-authored field labels. The shared step/protocol editor offers common units with custom text and a keyboard-accessible symbol menu for µ, Δ, °, ±, ×, ≤, ≥. Symbol insertion replaces the current text selection and returns focus/caret to the field; choosing a unit replaces only that field. No unit conversion or saved-definition rewrite.

Local manual verification: keyboard selection of µ replaced selected text in operator instructions and returned focus; a common µL unit replaced custom unit text; unsaved preview showed the Unicode instruction and Volume added (µL), Batch entries and Sample entries and exceptions. Verification edits were discarded. Frontend typecheck/scoped lint passed; existing test label expectations updated without executing tests.

### Configurable batch reports

The owner requested independent report inclusion and requiredness. New steps explicitly use `attachmentKind: none`; qc/preparation includes the selected PDF control and `attachmentRequired` controls requiredness. Missing kind preserves legacy report inference. Requiredness is validated in preview, Library prep and the API before recording any covered sample. Individual execution writes cannot bypass a required batch report. Allowed skips need no file; performed repeats/corrections require a new attachment when configured. Immutable approved snapshots are unchanged. JSON metadata is additive; no relational migration is needed.

Local report checkpoint: required-report preview showed the required marker and rejected validation without a PDF; explicit exclusion removed the control and cleared requiredness. Temporary configuration edits were discarded. Backend Release build, frontend typecheck and scoped lint passed. Regression tests are authored but unexecuted; the running API needs restart before live enforcement acceptance.

### Automatic full tube coverage

Every step entry includes all currently eligible tubes. Removed individual coverage checkboxes from the shared live/preview form. Show Applies to X tubes with an excluded count and expandable read-only identities/reasons. Coverage is derived from current eligibility, including immediate recorded failures, rather than editable selection. The API recomputes eligibility under the existing batch/work locks before recording and rejects omitted, duplicate, stale or ineligible coverage. Preserve prior-record rules for record/repeat/correct and prerequisite/hold guards. No change to preview Presentation controls.

Coverage checkpoint: browser preview displays Applies to 2 tubes and expandable read-only Included identities, with no tube-selection checkboxes. Backend Release build (including test project), frontend typecheck and scoped lint passed. Regression tests were updated but not executed. API acceptance of the new guard requires the running local API to load the rebuild. No operational data or saved configuration was modified.

### Unified fields for materials, equipment and outputs

Approved scope: add Material used, Equipment used and Output created to Fields to record, removing the separate resource panel/actions from step entry. Material fields select an eligible inventory lot and an amount; batch material fields default to amount per sample with an explicit total-batch alternative. Equipment fields link eligible registered instruments and an optional run reference. Output fields create the existing supported library container per source sample, with shared quantity/unit/location defaults and individual values. Existing output containers remain linked rather than being allocated again.

All inline entries accompany Save step record within the existing batch transaction, concurrency and idempotency protections. Server-resolved display values retain actual lot/instrument/output identities and resource-use records retain the batch record id. Preview uses fictional catalogs and local values only. Corrections retain previously recorded resource uses without consuming inventory again; correcting inventory transactions or changing an existing output identity remains its own governed operation. Repeats explicitly record fresh material/equipment use.

Legacy requirement lists remain frozen/readable and render inline on live steps. Authors may explicitly convert old requirement lists to linked fields in a draft; no silent snapshot rewrite. JSON definition/request additions require contract/ERD documentation but no relational migration. No dependencies or authentication changes. Validation covers atomic rollback, stock totals, idempotency, coverage, invalid resource ids and saved output reuse; do not run automated tests unless requested.

### Product selection and progressive sample entry (September 17)

Accepted product behavior: Material used offers the active supplier product catalog, grouped by vendor, with Enter material manually for in-house or uncatalogued material. A catalog choice snapshots the server-resolved vendor, product number, description and identity. Product selection alone does not consume inventory. Include lot number and Include equipment barcode are optional authoring settings. A tracked material entry selects a released, in-date lot and records stock use; equipment tracking selects an active instrument within calibration. Lot records currently link material definitions and suppliers, not supplier products: filter lots by supplier and require operator confirmation of the actual product/lot match; do not claim an automatic product-to-lot match. Inactive supplier/product/type choices are rejected on save.

Batch-only fields do not create a Sample entries and exceptions section. Shared fields offer an unchecked Record exception control; checking reveals collapsed sample cards and their override fields. Unchecking clears shared overrides and their exception reasons, and excludes them from the payload and validation. Individually recorded fields and individual QC still render sample cards without needing an exception. Mixed forms hide only shared overrides until opted in. Failed attempts remain retained in coverage/history; Close attempt as failed remains reachable from expanded coverage when no sample inputs are displayed.

Implementation uses JSON definition and request extensions within the existing transaction; no new relational migration. Inline resource corrections retain their recorded use; repeats require fresh use entries. Automated tests were authored/updated, not executed per repository policy. Live API loading and transaction acceptance remain separate from local preview/build verification.

Browser checkpoint: signed-in local preview verified batch-only hiding, unchecked shared exception disclosure, collapsed sample cards, clearing an unsaved override before successful validation, catalog vendor/product fill, manual material with tracked lot, per-sample totals and common output defaults. Only unsaved fictional configuration/preview values were used; the verification tab was closed without saving. Read-only active product choices are included in preparation detail under existing laboratory access; supplier administration remains unchanged. Help and generated corpus updated. Release build, frontend typecheck and scoped lint checked; regression suites authored but not executed. Running API restart and connected operational resource-save acceptance remain pending; no deployment or new migration.

### Clarification: material identity belongs to configuration

The Product Owner clarified that vendor/product selection (or a manual material description) belongs to Lab step/protocol configuration. This supersedes the earlier run-time product selector. The material name, vendor, catalog product id, supplier id and product number are retained in the versioned definition. Draft saves resolve catalog product details server-side; protocol occurrences pinned to approved Lab steps retain their exact snapshots. New material fields require an explicit configured identity. Existing material definitions without a snapshot remain readable using their configured field label; frozen historical definitions are not rewritten.

Run time displays this identity read-only and accepts quantity/unit plus the lot when Include lot number is enabled. The server rejects run-time name/vendor/product overrides. Lot selection filters by the configured vendor; exact product-to-lot association still requires operator confirmation because the current inventory does not store that relationship. The authoring catalog is read-only under existing Protocol Administrator authorization, separate from supplier administration. Preview uses the configured identity with fictional vendor-matched lots; all scope/exception behavior is retained. No new migration or authentication change.

Clarification verification: the running local authoring catalog returned supplier products. In an unsaved fixture, selected a catalog vendor/product and enabled lot capture; runtime preview showed the configured identity without product/name/vendor controls, offered a fictional lot for that vendor and validated quantity plus lot successfully. Saved configuration and operational batch data were untouched. Backend Release build, frontend typecheck, scoped lint and diff checks passed. Regression tests were updated/added but not executed; connected operational saves remain unverified.


### Exact material-lot identity follow-up

[Product-linked material lots](MATERIAL-LOT-PRODUCT-LINK-PLAN.md) supersedes the vendor-only matching limitation above: new tracked configurations select an exact product or prepared-reagent definition, operational selection enforces that identity, and fictional preview lots match it.

### Single configurable step attestation

Remove the redundant coverage checkbox. Submission acknowledges the displayed automatic coverage using the existing command flag; exact eligible coverage remains validated by the server. The configured operator attestation is the last field, after the report, and is absent when confirmation is disabled or the step is skipped. Closing a tube as failed clears a previously checked operator attestation. Existing separately required legacy resource confirmations remain unchanged.

Verification: frontend typecheck, scoped lint and whitespace checks passed. Connected preview showed the configurable attestation after the QC report and no attestation when Confirmation required was disabled. Temporary editor settings were discarded without saving. Regression cases updated, not executed.

### Production release — September 17, 2026

The owner subsequently authorized commit, push and deployment, with the earlier explicit production EF migration authorization retained. Application revision `1e96aa35a84d811296dd7bed4f554af788957a72` is deployed to both the API and Portal UI. The three additive migrations completed after encrypted-backup and isolated restore verification. See the [release record](../testing/runs/2026-09-17-lab-step-materials-release.md) for exact deployment identities and the remaining operational acceptance boundary. Local fixtures and operational records were not copied to production.
