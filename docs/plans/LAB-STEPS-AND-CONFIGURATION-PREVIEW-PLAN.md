# Lab steps and configuration preview

Status: owner-approved product direction; planned, not implemented.
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

Implementation remains pending. This change records the agreed requirements only.
