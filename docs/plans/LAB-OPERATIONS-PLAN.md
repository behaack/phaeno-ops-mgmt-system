# Lab Operations Plan

## 2026-08-29 governed-result and dual-control update

`PSEQ-ORDER-TO-CASH-GAP-CLOSURE-PLAN.md` closes the previously unresolved
PSeq final-output boundary. The provider-neutral pipeline integration now
registers an idempotent manifest and object-storage transfer targets for final
deliverables only. `ResultOutputPackage` and immutable artifacts carry
checksum and malware-scan evidence. Scientific approval requires a complete
clean package, pins its package identifier/version, and projects that identity
with `LabWorkReadyForRelease`. Corrections create a new package/approval/release
version; withdrawal and delivery/retention evidence remain historical.

Protocol authors cannot approve their own version. This separation is always
enforced at the formal protocol-approval boundary. A scientific
reviewer cannot approve work to which that actor contributed through receipt,
accessioning, execution, QC, library, batch, or sendout events. Lab Operations
Administrator is an access/resource role; bench, supervisory, protocol, and
scientific work require their explicit additive roles after enforcement.
Other dual-control checks launch in audit-only mode and become blocking only
after staffing and staging acceptance.

Keep this file updated as Phaeno's internal laboratory workflows are designed
and implemented.

This plan records the approved product direction, implemented application
scope, and remaining validation and activation gates. It does not authorize a
new schema migration, project reorganization, dependency change, deployment,
or production activation.

## Status

- Planning direction approved on 2026-07-16.
- Current status: feature-complete for the approved internal Lab Operations
  application scope. Database-backed controller/provider verification is
  complete; physical bench validation and production activation are
  incomplete.
  Customer quote acceptance atomically records commercial placement and opens
  exact sample-roster preparation. Finalizing the compliant roster atomically
  creates the Commercial authorization, Laboratory work order, specimens, and
  shipment records; approved cancellation reaches Lab before Commercial
  commits it. Additive Lab roles, the operator
  workspace, durable Lab-to-Commercial projections, receipt/accession and
  physical lineage, controlled protocols and execution, including the
  dedicated structured version builder, materials and equipment, libraries and
  cross-order batches, provider-neutral NGS sendouts
  and custody, exceptions, scientific approval, and the Ready-for-release
  handoff are implemented. Barcode completion includes POMS-allocated
  checksummed container identifiers, browser-rendered Code 39 labels,
  reasoned print/reprint/failure history, exact scan lookup, and scan-first
  QC-passed-library batch entry with duplicate and wrong-context rejection.
  Phaeno operators use **Receipt & accession** in Lab Operations to prepare
  return kits, identify shipments, compare tubes, and reach a roster-finalized
  placed order's existing work order. Order Operations retains only the
  Commercial source order and links to the same work order.
  The eight operational workspace sections now use the shared
  far-left sidebar beneath the toolbar, with a remembered pinned desktop rail
  and the same non-modal hover, keyboard, and click rail when narrow or
  unpinned. Laboratory role administration now lives in the durable Phaeno
  user record in User management, whose consolidated update preserves the
  existing audited Laboratory role assignments. Phaeno invitations also retain
  intended Laboratory roles and activate them only when the invitation is
  accepted. The POMS dashboard now includes a Phaeno-only Order Operations /
  Lab Operations / Accounts selector whose initial Lab panel is explicitly
  mock data for layout validation, not a connected Laboratory queue or
  production-readiness signal. Current Commercial file
  scanning, payment/credit, and publication remain separate.
- Architecture state: Phaeno operates a fit-for-purpose internal Lab Operations
  module behind a provider-neutral boundary. Commercial Operations remains
  customer-facing and can later replace the internal module with a third-party
  LIMS adapter without redesigning the customer or commercial workflows.
- Initial scientific scope: small-scale reagent preparation, specimen receipt,
  library preparation, outsourced NGS, and scientific readiness before the
  separately owned handoff to Phaeno's existing automated data pipeline.
- Phaeno will not initially run NGS in-house.
- The boundary from generated NGS files through Phaeno's automated pipeline,
  including raw/intermediate storage, retention, provenance, and output
  generation, is a major TBD. This plan assumes only that approved customer
  output files eventually become available for release through the Portal.
  `FILE-MANAGEMENT-PLAN.md` owns the settled post-release lifecycle: global
  30/5/5 defaults, Customer/Partner/Prospect organization overrides, release-
  time snapshot, undownloaded warnings, grace, and package-byte deletion.
- This plan supersedes the laboratory-execution direction in
  `ORDER-MANAGEMENT-PLAN.md`. That plan remains authoritative for commercial
  ordering, pricing, fulfillment, files, payment, and publication.
- Phase 0 Steps 1 and 2 are complete. The evidence-backed current-state
  inventory and ownership classification are recorded in
  `LAB-OPERATIONS-INVENTORY.md`. That file is a dated pre-implementation
  snapshot; the restructure and migrations were completed afterward.
- Phase 0 Step 3 is complete. The provider-neutral version 1
  Commercial-to-Lab Operations boundary is recorded in
  `LAB-OPERATIONS-CONTRACT.md`; its Commercial-owned core types and outbound
  provider port are implemented. The registered internal provider handles
  durable authorization/amendment/cancellation and projection lookup. Event
  delivery, the operator workspace, Laboratory roles, and the Customer
  workflow connection are now implemented. Five opt-in PostgreSQL conformance
  tests cover the provider's persistence, idempotency, amendment, cancellation,
  projection, and isolation behavior plus replay-safe, monotonic, customer-safe
  projection delivery. All five passed against the migrated local `phaeno_ops`
  database on 2026-07-16.
- Thirteen opt-in PostgreSQL controller test sources now cover Phaeno initiation,
  shared command idempotency, canonical Lab-service pricing, quote acceptance
  without premature Lab work, atomic roster-finalization authorization and
  shipping, rollback after intermediate provider persistence, accepted
  cancellation, started-work veto without a partial Commercial decision, and
  the rollback-isolated operator journey from assigned roles and accession
  through Ready for release, including replay-safe roster finalization. The original five-case handoff suite passed
  against the migrated local `phaeno_ops` database on 2026-07-16. The expanded
  sources compiled with zero warnings or errors on 2026-08-27; tests were not
  requested and the current thirteen-case suite was not run.
- Software-side bench preflight and the remaining physical acceptance protocol
  are recorded in `LAB-OPERATIONS-BENCH-VALIDATION.md`. Barcode allocation,
  Code 39 rendering, reasoned print outcomes, scan lookup, scan-first batching,
  lineage, and workflow evidence passed; real printer, scanner, label-stock,
  degraded-mode, and operator observations remain pending.
- `SAMPLE-SHIPPING-AND-INTAKE-PLAN.md` owns the separate pre-receipt
  shipment-packet barcode and scan handoff for accepted Prospect Trial Projects
  and future Customer promotional no-charge orders. Its shared configuration,
  return-kit and registered supplier-tube inventory, external crosswalk,
  immutable printable packet, and read-only packet-plus-tube comparison scan
  are implemented; the owning Trial/freebie issuance workflows remain later
  phases. A comparison scan does not record custody. At accession, a validated
  registered supplier barcode is adopted as the submitted container's
  authoritative identity without a second label; POMS continues to allocate
  its own authoritative barcodes for derived containers.
- Phase 0 Step 4 is complete in design and local execution. The approved clean
  development database and migration reset, solution/project restructure, and
  schema baseline sequence are recorded in
  `PSEQ-OPERATIONS-MIGRATION-PLAN.md`. The solution/project shell restructure
  and single-context schema target are implemented. The Accounts,
  Relationships, Data Provisioning, commercial configuration, Partner kit,
  integration, notification, workflow-support, request-revision, and quote
  slices plus the external download audit are extracted into Commercial.
  Commercial order, file, and release records remain Commercial-owned; the
  pipeline/file boundary remains deferred. The disposable
  Development reset, clean `InitialPSeqOperations` migration, database rebuild,
  bootstrap, Reference Journey, and baseline verification suites completed on
  2026-07-16. The additive `CompleteLabOperations` and `AddLabQcProjection`
  migrations plus `EnforceLabLibraryLineage` are applied to the local
  `phaeno_ops` database.

## Goal

Provide enough laboratory structure to run Phaeno's initial PSeq services
reliably without building a pharmaceutical-grade LIMS or burdening a small team
with unnecessary data entry. Preserve clean extension paths for additional
laboratory modules, in-house NGS, stricter controls if later justified, and
replacement by a third-party LIMS.

## Governing Product Principles

1. **Balance traceability with workload.** Capture information needed for
   scientific reproducibility, error investigation, customer accountability,
   and material lineage. Use scanning, defaults, batch entry, and automatic
   timestamps to reduce operator work.
2. **Keep workflows flexible where they actually evolve.** High-level service
   stages remain stable, while laboratory protocols and their detailed steps
   are controlled, versioned definitions that can change without a software
   deployment.
3. **Keep Commercial and Lab Operations replaceably separate.** Commercial
   Operations depends on provider-neutral requests, milestones, exceptions,
   and released outputs rather than internal Lab Operations tables or a vendor
   data model.
4. **Design for future modules without implementing them speculatively.** The
   initial implementation supports PSeq Lab Service and the limited PSeq Kit
   handoff. In-house sequencing and unrelated services remain future modules.
5. **Use fit-for-purpose controls.** Phaeno's internal laboratory will not
   process pharmaceutical samples requiring FDA-submission-oriented execution.
   The initial system will not claim GxP, 21 CFR Part 11, or equivalent
   readiness and will not impose those controls without a separately approved
   product and compliance decision.
6. **Publish deliberately.** Internal laboratory facts are private by default.
   Customers and Partners see only explicitly approved milestones, QC
   information, and deliverables through Commercial Operations.

## Product and Solution Identity

- `Phaeno Portal` remains the external customer- and partner-facing product
  name.
- `PSeq Operations Platform` is the working internal umbrella name for the
  combined Commercial Operations and Lab Operations solution. A naming change
  is not required to begin implementation.
- The implemented deployment shape remains a modular monolith, not separately
  deployed services.

## Target Technical Boundary

The target architecture is:

- one deployed API
- one PostgreSQL database
- one EF Core `DbContext`
- one migration history and transaction boundary
- two target database schemas: `commercial_ops` and `lab_ops`
- the single EF migration-history table in PostgreSQL `public`, which contains
  no business records
- feature-owned EF configurations and module-owned write paths

The implemented backend project boundaries are:

1. `PSeq.Operations.Api` - thin HTTP host and composition root
2. `PSeq.Operations.Commercial` - accounts, relationships, entitlements,
   commercial orders, customer-facing status, and release
3. `PSeq.Operations.Laboratory` - internal laboratory execution
4. `PSeq.Operations.Test` - contract, domain, integration, and architecture
   tests

The existing Reference Journey tool remains a non-product utility. The exact
target layout and implementation sequence are defined in
`PSEQ-OPERATIONS-MIGRATION-PLAN.md`.

The EF model maps Commercial/current-flow and projection records to
`commercial_ops`, Laboratory execution records to `lab_ops`, and migration
history to `public`; it does not use a default schema. The verified disposable
Development database and former migration chain were replaced on 2026-07-16 by
the clean `InitialPSeqOperations` baseline and five additive Lab migrations; no
legacy data backfill was needed.
That approval does not extend to staging, production, shared, or unexpectedly
valuable data. Two business schemas are an ownership and maintenance boundary,
not a security boundary. Authorization remains enforced by the API. The shared
context must not become permission for features to mutate each other's entities
directly.

## System Ownership

### Commercial Operations Owns

- Customer, Partner, and Prospect relationship state
- Organizations, users, memberships, invitations, and entitlements
- Quotes, pricing, commercial orders, order snapshots, and amendments
- first-party CRM, manual-accounting source and reconciliation workflows, plus
  any future external CRM or accounting adapter
- Customer and Partner submission experiences
- Authorization to begin paid or approved no-charge work
- Customer-facing milestones, expected timing, and exception communication
- The content and timing of result release
- Customer-facing activity history and permitted downloads

### Lab Operations Owns

- Physical PSeq kit preparation, substitution handling, shipping, and fulfillment
- Data Assembly input validation, processing, QC review, and output approval
- Laboratory work orders and laboratory execution state
- Physical receipt, accessioning, and intake disposition
- Specimen, container, aliquot, and derived-library lineage
- Phaeno barcodes and laboratory locations
- Controlled protocol definitions, versions, and executions
- Reagent materials, prepared lots, lot status, and consumption
- Equipment references and calibration status needed for execution
- Internal work queues, operational batches, and assignments
- NGS send-out manifests, custody, provider references, and exceptions
- Internal QC, holds, deviations, rework, and scientific approval
- The `Ready for release` handoff to Commercial Operations

### Deliberately Unassigned

Ownership and implementation remain TBD for:

- generated raw NGS files
- submission into and orchestration of Phaeno's automated data pipeline
- intermediate pipeline artifacts
- file provenance, checksums, and lineage across the pipeline
- scientific file storage and lifecycle
- raw and intermediate pipeline retention policy
The former final-output handoff TBD is closed by the governed PSeq manifest,
package, scientific-approval, and Commercial release implementation described
at the top of this plan. Its dedicated-staging/provider activation gates remain
open; this does not claim raw or intermediate pipeline ownership.

No initial Lab Operations design may silently claim this area or create a
competing scientific file-management system.

## Replaceable Lab Operations Contract

The planned version 1 commands, acknowledgments, projections, events,
idempotency rules, and prohibited data are authoritative in
`LAB-OPERATIONS-CONTRACT.md`.

Commercial Operations must communicate through a provider-neutral Lab
Operations application contract even while both modules run in the same
process and share one database.

```text
Commercial Operations
        |
        v
Lab Operations contract
        |
        +-- Internal Lab Operations provider (initial)
        |
        +-- Third-party LIMS adapter (future)
```

The contract should be no broader than proven workflows. It will eventually
cover capabilities such as:

- authorize laboratory work
- amend or cancel authorized work before prohibited execution points
- acknowledge receipt or rejection
- return stable milestones and expected timing
- raise an internal or customer-action-required exception
- report scientific approval and readiness; the minimum opaque output
  reference is deferred until the pipeline/file boundary is defined

Commands and events must have stable Phaeno identifiers, be idempotent, and be
safe to retry and reconcile. Vendor authentication, identifiers, statuses,
webhooks, mappings, and error handling belong in an external adapter. Direct
cross-schema writes and customer UI queries against `lab_ops` tables are not
allowed application boundaries.

One commercial order may authorize multiple laboratory work orders for
staggered receipt, replacement material, or separately scheduled processing.
Each paid laboratory work order belongs to exactly one commercial order. A
separately approved Trial Project may authorize bounded no-charge work without
being misrepresented as a commercial order.

## Organizations and External Users

- An organization may be a Customer, a Partner, or both.
- Customers and Partners may both purchase PSeq Lab Service and submit
  specimens for Phaeno to process.
- Once authorized work enters Lab Operations, Customer and Partner work follows
  the same workflow. Lab Operations does not branch on the submitting
  organization's commercial classification.
- A Partner is not required to identify or disclose its downstream customer.
  An optional Partner reference remains opaque Partner data.
- Partner-specific pricing, contracts, and permissions remain Commercial
  Operations concerns.
- Selling a PSeq Kit creates and preserves a Commercial order and pricing
  snapshot. Physical kit review, preparation, substitution handling, shipping,
  and fulfillment occur in the Lab Operations PSeq kits workflow. Kit
  fulfillment does not create a specimen accession or scientific Lab work order
  unless Phaeno is separately authorized to process specimens.
- Customers and Partners never receive direct access to the Lab Operations
  workspace. They interact through Portal submissions, approved milestones,
  customer-safe exceptions, selected QC information, and released outputs.

## Internal Roles

Laboratory permissions are additive. A person may hold one or more of:

- Lab Operator
- Lab Supervisor
- Protocol Administrator
- Scientific Reviewer
- Lab Operations Administrator

The model must support separation-of-duties rules, but the initial release will
not universally require two different people. A protocol or service may require
independent approval when scientifically or contractually justified. Every
approval and authorized override records its actor and timestamp.

## Initial End-to-End Workflow

```text
Commercial work authorized
        |
        v
Physical specimens received
        |
        v
Accession and intake disposition
        |
        v
Reagent preparation and library preparation
        |
        v
Internal cross-order operational batch
        |
        v
NGS provider send-out and returned NGS output
        |
        v
[ BIG TBD: pipeline and all scientific file management ]
        |
        v
Customer output files available to Phaeno
        |
        v
Scientific approval / Ready for release
        |
        v
Commercial release through Phaeno Portal
```

Phaeno may combine eligible work from multiple organizations and commercial
orders in one internal batch to economize operations. This never merges tenant
ownership, commercial orders, expected timing, customer files, or results, and
no external organization can discover another participant.

### PSeq Lab Service

The intended high-level workflow is:

1. specimen receipt and accession
2. intake acceptance, hold, or rejection
3. reagent preparation as required
4. library preparation
5. outsourced NGS
6. general `Data processing` status across the unresolved pipeline boundary
7. scientific review
8. ready-for-release handoff

PSeq Lab Service is one commercial product that includes processing and data
assembly. Its operational phases do not become separate sales.

### PSeq Kit

PSeq Kit is one commercial product combining the kit with its included data
assembly entitlement. The order and pricing snapshot remain Commercial;
physical kit fulfillment and the included Data Assembly execution are operated
from Lab Operations. If
Phaeno never receives a physical specimen, the workflow must not create a
fictitious accession. The detailed path from customer data submission through
the existing automated pipeline remains part of the major pipeline and file
management TBD.

## Accession and Physical Traceability Defaults

These are engineering defaults to refine with actual laboratory operators, not
additional Product Owner decisions:

- Accession first, then accept, hold, or reject, so every physically received
  specimen has a traceable receipt record.
- One accession represents one biological specimen.
- Physical containers, aliquots, prepared libraries, and other derived
  materials are child records with parent-child lineage.
- Each received or derived physical container receives a unique Phaeno barcode
  when the operational benefit justifies it.
- Customer and Partner labels remain searchable references but are not the
  authoritative physical identity.
- Barcode reprints retain history and require a reason.
- Failed, exhausted, replaced, or repeated material remains traceable rather
  than being silently overwritten.

The UI and operating procedures must minimize scanning and data-entry burden.
Batch actions and inherited values should be preferred whenever they preserve
unambiguous identity and scientific validity.

## Versioned Protocol and Service Workflow Builders

Workflow flexibility belongs inside controlled laboratory protocols and their
service-level composition, not in arbitrary changes to the commercial
lifecycle.

The bounded protocol builder supports:

- ordered and repeatable steps
- approved optional and conditional steps
- required operator confirmations
- typed data capture such as number, text, date, choice, file reference, and
  barcode
- input materials, prepared outputs, and container lineage
- reagent and lot recording
- equipment type requirements and actual equipment used
- QC gates with pass, fail, and hold outcomes
- role-based execution and approval
- Draft, Approved, Superseded, and Discarded user-facing protocol versions;
  the internal Active status remains an implementation detail for exact
  service-workflow pinning and is presented as Approved
- a POMS-generated immutable protocol key derived from the entered protocol
  name, with a stable suffix when the readable key is already in use

Each marketed laboratory service has one canonical controlled service workflow.
That stable workflow identity has ordered versions made from exact approved
protocol versions. Each workflow stage has a name, sequence, Required,
Optional, or Conditional requirement, a plain-language condition when
conditional, and optional handoff criteria. This stitches reusable protocols
into a complete service process without merging them into one unmaintainable
protocol.

Service workflow versions follow Draft, Approved, Production, Retired, and
Discarded states. Promoting an Approved workflow to Production pins its exact
Approved protocol versions, retires the previous Production workflow for that
service, and preserves every historical version. There is only one Production
workflow version for a marketed service at a time.

A Lab work order pins the Production service workflow version when Commercial
authorizes it. Work created before workflow control was introduced pins the
current Production workflow when its first protocol execution is assigned.
Each execution then pins both a workflow stage and that stage's exact protocol
version. Required prior stages must be completed in the same specimen or
work-order scope before a later stage can be assigned. A procedure or workflow
change does not rewrite active or historical work. A deviation is recorded
against an execution; it does not mutate either controlled definition.

Each protocol may have only one Draft. A Draft remains resumable and editable
until approval, or it may be discarded while remaining in history. Protocol
approval is an irreversible controlled release: an independent Protocol
Administrator reviews the exact ordered definition, explicitly attests that it
is ready, and POMS records the approver and timestamp. Approval locks the
version, makes it the current Approved version for future use, and marks the
previous Approved version Superseded. A later version starts from the current
Approved definition and is not in effect until it completes approval. Existing
work and service workflows remain pinned to their exact historical versions.

The product uses structured ordered editors rather than a generic drag-and-drop
workflow programming environment. Arbitrary graphs, parallel branches,
unrestricted formulas, general API calls, nested workflows, and other
programming-language capabilities are out of scope. The underlying model may
gain additional controlled step or stage types when proven laboratory needs
justify them.

Protocol and service-workflow identities remain bounded modal create actions.
Authoring either kind of version is a documented exception to the default
modal-edit pattern and uses a dedicated page because each contains ordered
children, validation, review, and unsaved-work protection. The protocol editor
also manages typed captures, resource requirements, and QC gates and keeps raw
JSON as a collapsed read-only preview rather than an authoring control.

The Protocols workspace presents a newly created protocol identity as **Setup
incomplete**, hides its system key from the working card, and uses **Edit
protocol** for the initial controlled definition.
Creating an identity continues directly to that structured builder. Version
language begins only after the initial definition exists; later controlled
changes use **Create new version**. The bounded name/description action is
explicitly labeled **Edit name and description** so it is not mistaken for the
procedure editor. These commands, **Review and approve**, Draft discard, and
eligible deletion are grouped in a labeled **Actions** menu to keep the list
compact.

Protocol Administrators may edit the protocol name and optional description in
a bounded modal only until its first approval. The POMS-generated protocol key
and every Approved or Superseded identity and version remain immutable. A
protocol that has never been approved may be deleted with destructive
confirmation after POMS verifies that no laboratory or workflow record
references it. Once any version has been approved, the protocol and its full
history are permanent controlled records.

## Controlled Operational Flexibility

- Work may be held, resumed, repeated, cancelled, or routed through an approved
  conditional protocol step.
- Required scientific or chain-of-custody steps cannot be silently skipped.
- An authorized Operations user may override an allowed control with a required
  reason; the original and revised state remain auditable.
- Workflow or protocol changes apply prospectively. Active work remains on its
  original version unless an explicit, validated migration process is later
  designed.
- The previously approved turnaround target, at-risk alert, and authorized
  expected-date override behavior remains owned by
  `ORDER-MANAGEMENT-PLAN.md`.

## Reagent and Material Management

Lab Operations tracks the laboratory facts needed for materials and internally
prepared reagents:

- material identity, supplier reference, and supplier lot
- Phaeno-prepared lot and container identity
- source component lots and preparation protocol version
- preparation quantities and calculations
- operator and preparation timestamp
- required QC and approval
- expiration or retest date
- storage location, current status, and available quantity
- QC disposition, laboratory QC date, and a required reason for failed QC
- protocol execution or batch consumption

A prepared reagent cannot be available for use until its required QC and
approval are complete.

POMS owns a reusable material definition with a system-assigned immutable key;
operators select that identity when receiving or preparing a lot rather than
typing a key per lot. Supplier and storage location are controlled, auditable
reference records. Supplier is required only for a supplier lot. Retired
references remain available to historical records but cannot be selected for
new work. A missing material, supplier, or storage reference can be named in a
focused related-record modal without abandoning the lot form; the draft name
returns as the selected option and the reference is created with the lot.

Expiration or retest is stored as a date and remains valid through the end of
that laboratory day. A future exact time-sensitive prepared-reagent use-by
control, if required by bench validation, will be a separate timestamp rather
than changing every lot to time-of-day expiration.

Prepared-reagent composition is structured lot lineage rather than free-form
JSON. Creation requires one or more QC-approved, unexpired source lots, records
the exact quantities and units, and atomically reduces source availability.

Lab Operations is not a purchasing, accounts-payable, or warehouse-management
system. QuickBooks remains authoritative for vendors, purchase orders, bills,
approvals, payments, and accounting value. Initially, purchasing is manual:

1. Lab Operations identifies a replenishment need.
2. A user creates and manages the purchase order in QuickBooks.
3. Lab Operations may store the QuickBooks purchase-order number or link.
4. QuickBooks records the financial receipt and bill.
5. Lab Operations records the laboratory material or lot received.

The design may reserve a small `IProcurementProvider` seam, but no QuickBooks
procurement API integration is approved. If volume later justifies automation,
the first candidate is one-way creation of a draft or approval-pending
QuickBooks purchase order from an approved replenishment request.

## Equipment

The initial release includes a lightweight equipment registry sufficient to:

- identify an equipment asset and type
- assign an immutable, scanner-safe asset code when the equipment is registered
- select equipment type and location from known laboratory values, with a
  focused create option when a value is missing
- record whether it is available for use
- record the most recent calibration and due dates as date-only laboratory
  facts
- let a protocol require an equipment type
- record the specific equipment used during execution

Automatic instrument control, telemetry ingestion, and detailed maintenance
management are out of scope. A future in-house NGS module may add instrument,
run, maintenance, and telemetry integrations without changing the commercial
boundary.

## Outsourced NGS

An NGS send-out is an external processing batch that may contain libraries from
multiple organizations and commercial orders. Lab Operations tracks:

- a human-friendly batch name, system-owned External sequencing type, and
  immutable POMS batch number
- draft, in-progress, or complete status with captured UTC start and completion
  timestamps, entered through the transition confirmation modal
- included libraries and Phaeno barcodes
- provider and requested service
- shipment and manifest identifiers
- chain-of-custody timestamps
- provider-assigned identifiers
- expected and actual turnaround
- receipt confirmation and exceptions

Provider contracts, invoices, and payment remain outside Lab Operations. Phaeno
does not initially model in-house instruments, sequencing-run scheduling, or
sequencer telemetry.

## Holds, Exceptions, Rework, and Corrections

Lab Operations exceptions are classified as:

- `Internal`: Phaeno can resolve the issue without external action.
- `Customer action required`: replacement material, missing information,
  authorization, unusable data, or another response is required.

Lab Operations owns the scientific issue and required action. Commercial
Operations owns the customer- or partner-facing message, recipient, deadline,
and follow-up.

Lab Operations may initiate documented rework under the same commercial order
when correcting a Phaeno processing or QC failure. Customer-requested repeats,
added specimens, or expanded scope require Commercial Operations authorization
and may require an amended or new order.

A released result is immutable. A scientific correction creates a new version
with its reason, approval, and release timestamp; the previous version remains
in history and the affected organization is notified through Commercial
Operations.

## Stable Milestones and Publication Boundary

Commercial Operations must not derive customer-visible state by querying
internal laboratory tables. Lab Operations publishes a small, stable milestone
vocabulary such as:

- Received
- On hold
- Processing
- Awaiting external sequencing
- Data processing
- Scientific review
- Ready for release
- Exception

Commercial Operations maps these milestones to customer-safe wording. Internal
stages, work queues, batch composition, provider detail, and laboratory notes
remain private.

Lab Operations ends at `Ready for release`. A Scientific Reviewer approves a
customer-facing release package containing only permitted QC, interpretation,
and available deliverables. Commercial Operations controls when that package
becomes visible.

Nothing becomes externally visible merely because it exists in Lab Operations.
For a multi-customer batch, only specimen-specific or appropriately sanitized
batch-level QC may be published. Another organization's identifiers, files, or
results must never be exposed. Permitted release content may vary by service
and evolve through versioned release definitions.

## Physical Retention and Disposition

The system should be capable of recording:

- current physical storage location
- retain-until date when known
- hold or preservation requirements
- exhausted, returned, transferred, or disposed status
- final disposition date, operator, method, and reason

Except for the confirmed Trial Project rule below, actual retention periods are
a policy TBD. The system must not automatically record physical material as
disposed merely because a date has passed; an authorized operator confirms the
disposition.

The Trial Project policy is the first service-specific exception to that TBD:

- remaining extracted RNA is retained for 30 calendar days after `Completed` or
  `Closed incomplete` by default;
- the exact duration and `Destroy` or pre-approved `Return` disposition are
  frozen on the Trial Project, and later configuration changes do not rewrite
  it;
- return is allowed only when approved before the first sample shipment, with
  destination, handling, and shipping payer frozen in the terms;
- a retain-until date creates due work but never an automatic disposition;
- an authorized operator records exhaustion, return, or destruction with date,
  method, reason, actor, and return tracking when applicable; and
- Trial material cannot be reused for research, training, validation, another
  project, or another organization without separate written authorization.

This Trial-specific rule does not settle retention periods for paid Customer or
Partner work. A controlled hold or incident-preservation requirement supersedes
the normal due date until authorized disposition.

## Initial Release Scope

Included:

- internal Lab Operations workspace and additive roles
- provider-neutral Commercial-to-Lab Operations contract
- receipt, accessioning, intake disposition, and physical lineage
- versioned bounded protocol builder and execution
- reagent materials, prepared lots, QC, and consumption
- lightweight equipment and calibration tracking
- library-preparation execution and operational batching
- outsourced NGS batches, manifests, custody, and provider references
- holds, exceptions, deviations, rework, and scientific approval
- stable milestone projection to Commercial Operations
- controlled projection of reviewer-permitted QC to Commercial Operations;
  customer deliverable availability remains at the existing Commercial/file
  boundary

Explicitly excluded or deferred:

- in-house NGS execution and instrument integration
- a generic workflow programming environment
- full procurement, accounting, or warehouse management
- QuickBooks procurement automation
- Partner-executed laboratory work
- direct Customer or Partner access to Lab Operations
- pharmaceutical-submission-oriented GxP or Part 11 controls
- raw NGS and intermediate file management
- automated data-pipeline orchestration
- raw/intermediate scientific file provenance, lifecycle, and retention policy
- the technical output-generation and handoff contract into an immutable
  customer-facing release; post-release retention is already assigned to File
  Management

## Future Extension Paths

### In-House NGS

Add an internal sequencing module with run planning, instrument association,
reagent and flow-cell tracking, run QC, telemetry, and maintenance only when
Phaeno decides to operate sequencing instruments. Commercial Operations should
continue consuming the same stable milestones and outputs.

### Additional Laboratory Modules

New service modules may contribute controlled protocol step types, records, and
milestones while preserving the same accession, authorization, publication,
and audit principles. Do not expand the initial PSeq workflow preemptively.

### Third-Party LIMS Replacement

A future LIMS may replace all or part of the internal Lab Operations provider.
Before cutover, Phaeno must map ownership at field and event level, prove the
provider contract against representative workflows, migrate or preserve
authoritative history, validate reconciliation and failure recovery, and
remove competing internal write paths. The durable strategy is recorded in
`docs/lims-integration-strategy.md`.

## Phased Delivery

### Phase 0 - Operator Discovery and Migration Design

- Completed inventory and ownership-classification evidence is maintained in
  `LAB-OPERATIONS-INVENTORY.md`.
- The completed version 1 provider contract is maintained in
  `LAB-OPERATIONS-CONTRACT.md`.
- The completed clean reset and restructuring design is maintained in
  `PSEQ-OPERATIONS-MIGRATION-PLAN.md`.
- Complete for development: document the evidence-backed receipt, accession,
  reagent-preparation, library-preparation, batching, send-out, exception, and
  review workflows. Representative bench observation remains a production
  activation gate.
- Complete: define the minimum data capture that protects scientific work
  without adding unnecessary operator burden.
- Complete: inventory existing `LabServiceOrder`, `LabSample`, accession, QC,
  and release records in Order Management.
- Production gate: validate barcode hardware, labels, scanning, and degraded-
  mode procedures with representative equipment using
  `LAB-OPERATIONS-BENCH-VALIDATION.md`.
- Preserved boundary: keep pipeline and scientific file-management ownership
  explicitly open.

### Phase 1 - Module and Contract Foundation

- Complete: the Commercial-owned provider-neutral v1 core contract, explicit
  schema guards, Laboratory persistence, registered idempotent internal
  provider, current-workflow connection, and local `phaeno_ops` database.
- Complete: establish Commercial and Laboratory module write boundaries.
- Complete: add the first Laboratory-owned work, immutable authorization,
  specimen/accession, execution-event, and scientific-approval entities through
  `AddLabOperationsFoundation`.
- Complete: add durable provider-command receipts through
  `AddLabProviderCommandReceipts` and implement authorization, safe
  amendment/cancellation, exact retry replay, and current milestone projection
  lookup.
- Complete: opt-in database-backed provider and projection-delivery conformance
  coverage passes against the migrated local reference database with
  run-specific cleanup.
- Complete: opt-in controller-path coverage passes for atomic quote
  authorization, the Commercial-to-Lab cancellation handoff,
  persisted-provider rollback, started-work veto, and the full
  rollback-isolated operator journey.
- Complete: implement internal laboratory roles and authorization, including
  active-Phaeno-member eligibility, disabled/offboarded-user denial, exact
  additive capabilities, session projection, and platform-admin bootstrap.
- Complete: persist Commercial-owned milestone/exception projections and add durable
  Lab-to-Commercial event delivery.
- Complete: extend the existing module-direction architecture tests to prevent direct
  cross-module persistence access as Laboratory entities are introduced.
- Complete: preserve current customer-facing behavior while adding the
  customer-safe Lab milestone, schedule, action, and permitted-QC projection.

### Phase 2 - Intake, Protocols, and Materials

- Complete: receipt, accession, containers, POMS-allocated checksummed
  barcodes, browser-rendered Code 39 labels, reasoned print outcomes,
  scan-first lookup, label history, optional retention, and intake disposition.
- Complete: structured protocol authoring with ordered steps, typed captures,
  resource requirements, QC gates, JSON preview, cloned version creation,
  resumable draft editing and discard history, approval withdrawal,
  one-open-candidate enforcement, approval, Production/Retired control, pinned
  versioning, execution, and system-owned readable protocol-key allocation.
- Complete: one canonical controlled workflow per marketed laboratory service,
  ordered Required, Optional, and Conditional protocol stages, workflow
  Draft/Approved/Production/Retired/Discarded lifecycle, atomic protocol
  promotion, exact work-order and execution pinning, and prior-required-stage
  gating through `AddControlledLabServiceWorkflows`.
- Complete: controlled material definitions with POMS-assigned keys,
  supplier/storage references, supplier and prepared-reagent lots, structured
  component lineage, date-only expiration/retest, consumption, equipment,
  calibration, and QC records.
- Production gate: validate minimum fields, labels, scanners, and degraded-mode
  procedures with representative PSeq bench work before activation. The
  software preflight is complete; the physical scenarios and exposed gaps are
  tracked in `LAB-OPERATIONS-BENCH-VALIDATION.md`.

### Phase 3 - Library Preparation and NGS Send-Out

- Complete: library lineage and preparation execution.
- Complete: internal batching across authorized work orders, including
  scan-first QC-passed-library entry and duplicate/wrong-context rejection.
  POMS uses the library container barcode as the library key and allocates
  date-stamped, scanner-safe batch numbers.
- Complete: provider-neutral NGS send-out manifests, custody, provider identifiers, timing, and
  exception handling.
- Complete in the application boundary: projections contain only authorization,
  stable milestone/schedule, action count, customer-safe summary, expected
  timing, and reviewer-permitted QC; batch membership and other-organization
  identifiers remain Lab-only. Database-backed two-tenant proof remains a test
  execution gate.

### Phase 4 - Review and Customer Publication

- Complete: scientific review and Ready-for-release handoff.
- Complete on the Lab side: versioned release definitions and reviewer-
  whitelisted QC project to Commercial. No file or deliverable is created or
  published by the Lab transition.
- Complete for current scope: correction remains durable through exceptions,
  resolution, work events, projection receipts, and existing Commercial
  notification/release history.
- Preserved boundary: output availability is not connected until the future
  pipeline and file-management decision is approved.

The Product Owner authorized completion of the remaining phases on 2026-07-16.
The application scope is complete. Production activation still requires the
explicit physical bench-work, label/scanner, external-provider, authenticated
browser, deployment, and content gates recorded here; those gates do not
expand Lab into the unresolved pipeline or scientific file domain.

## Acceptance Outcomes

The initial Lab Operations capability is successful when:

- an authorized PSeq Lab Service can be traced from commercial authorization
  through receipt, protocol execution, outsourced NGS, scientific approval,
  and the existing Commercial release gates without exposing another
  organization
- protocol changes create controlled versions without rewriting active or
  historical executions
- operators can complete routine work without redundant entry of commercial,
  organization, repeated batch data, or system-owned protocol, library, and
  batch identifiers
- Phaeno can identify which specimens, materials, protocol versions, equipment,
  operators, batches, and exceptions contributed to an internal result when
  those facts are required by the approved protocol
- Commercial Operations depends only on the provider-neutral contract and
  stable projections, not the internal Lab Operations schema
- a Partner submitting specimens is processed identically to a Customer while
  retaining Partner ownership and optional opaque references
- the system does not claim ownership of the unresolved pipeline and
  scientific file-management domain

Baseline operator time, correction rate, turnaround performance, exception
rate, and support burden should be measured during pilot use before numerical
targets are imposed.

## Open Decisions and Major TBDs

1. **Pipeline and scientific file management:** ownership, storage,
   orchestration, raw/intermediate provenance and retention, security, output
   generation, and the technical handoff into the immutable released package.
   The post-release customer deliverable policy is settled under File
   Management with global 30/5/5 defaults and Customer/Partner/Prospect
   organization overrides.
2. **Physical retention policy:** paid Customer and Partner periods and other
   service-specific rules. The configurable Trial Project default is settled at
   30 calendar days after terminal operational closure, with operator-confirmed
   destruction or a return frozen before first shipment.
3. **Operator workflow validation:** software preflight is complete; minimum
   required fields, batch-entry behavior, labels, scanners, degraded mode, and
   exception paths still require the physical acceptance session in
   `LAB-OPERATIONS-BENCH-VALIDATION.md`.
4. **External NGS provider details:** services, identifiers, manifest formats,
   status access, and returned-output handshake.
5. **QuickBooks automation trigger:** revisit only when manual procurement
   volume and reconciliation burden justify integration.
6. **Stricter quality or regulatory controls:** require a separate intended-use,
   compliance, cost, and validation decision.

## Ongoing Planning and Documentation Maintenance

For future Lab Operations changes:

- keep `ORDER-MANAGEMENT-PLAN.md` aligned so commercial orders remain separate from
  laboratory work orders
- update `FILE-MANAGEMENT-PLAN.md` only after the scientific file boundary is
  approved
- update `BACKEND-TEST-PLAN.md`, `FRONTEND-TEST-PLAN.md`, and
  `E2E-TEST-PLAN.md` with each delivered slice
- update `docs/architecture.md`, `docs/business-rules.md`, and the appropriate
  Customer, Partner, and Phaeno user guides only as behavior becomes real
- keep `docs/lims-integration-strategy.md` provider-neutral and aligned with
  the internal-provider-first direction

## Trial parent integration (2026-09-05)

The distinct Trial workflow now invokes the existing PSeq Lab provider with a frozen approved workflow, creates shared shipments after Prospect acceptance and sample validation, and releases governed packages through the shared retention lifecycle. Complete packages freeze policy and close the Trial; partial packages do not start that clock. Trial holds serialize with scientific writes and byte cleanup. See `PROSPECT-TRIAL-PROJECT-PLAN.md` and `TRIAL-INTEGRATION-CLOSEOUT.md` for evidence and remaining production activation gates. Promotional Customer freebie issuance remains separate.
