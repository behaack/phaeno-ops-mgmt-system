# Commercial to Lab Operations Contract

Personal step performance and recorder separation are specified in the [step performance contract](LAB-STEP-PERFORMANCE-CONTRACT.md). This additive internal execution/preparation extension preserves existing authorization and compatible clients; it does not change the commercial authorization envelope or activate new release gates.

Phase 1 result lineage is specified in the [result capture contract](LAB-RESULT-LINEAGE-CONTRACT.md). It adds explicit sequencing outputs, completed-analysis inputs and result-to-tube binding under existing Lab/pipeline authorization. It does not change this provider's commercial authorization envelope. Capture and guards are implemented locally; traceability and scientific-evidence enforcement default on following the September 19 immediate-cutoff decision. Existing test jobs receive no backfill or exemption for subsequent approval/release; production deployment remains separate.

## Shared library outputs (2026-09-17)

Preparation detail advertises bulkOutputs. The existing versioned commands endpoint accepts action outputs, stageId and outputs [{memberId, quantity, quantityUnit, location}]. Outputs is omitted when null to preserve existing request hashes. Validate distinct current-batch members, active output-producing protocol, open unheld attempts, no existing output, positive quantities and required bounded unit/location strings. All outputs use individual generated barcodes and attempt/source lineage. Save once under existing batch/job locks and transaction, with outputResults [{memberId, outputContainerId, barcode}] in history. Exact retries return the original receipt without new outputs. Creation does not confirm physical barcodes or QC. The individual output command remains supported.

## Optional preparation reports - September 17, 2026

Preparation detail adds optionalPreparationReports. POST preparation/batches/{id}/commands/with-report accepts the existing multipart payload and file fields; GET preparation/batches/{id}/records/{recordId}/report downloads the saved report. Existing with-qc-report and qc-report routes remain supported. The pinned performed step determines attachment type: QC gate uses qcReport; non-QC steps with preparation-record-reference text in shared/batch scope use preparationReport. Other steps reject attachments. Both metadata objects share filename, content type, size, hash and clean scan status; storageKey remains private. The legacy preparation reference is optional, while other required captures/resources remain enforced. Existing locks, roles, concurrency, replay fingerprinting, PDF validation, scanning and private download authorization apply.

## Automatic preparation review skip — September 17, 2026

Preparation detail adds optional `automaticSkipAvailable`, calculated from the exact recognized conditional-review definition, every continuing execution history, job/attempt eligibility and the current actor's existing step role. Clients may POST the existing versioned/idempotent command with action `evaluate-conditions`; this uses the same locks, job guards and role checks as other preparation writes. A successful step/failure command also evaluates the rule in its transaction. GET never saves evidence. A generated standard skipped step retains empty captures/QC and false performed/resource attestations, plus `automatic: true` and `triggerRequestId` in its preparation record details. Skips never overwrite existing target evidence. Existing correction/staleness rules still apply. This is a bounded compatibility rule for the established prior-step-2 Hold/Fail condition, not a general prose evaluator.


## Optional preparation QC reports — September 17, 2026

Preparation detail advertises `optionalQcReports: true`. `POST /platform/lab-operations/preparation/batches/{id}/commands/with-qc-report` accepts multipart `payload` (the existing versioned preparation command) and `file` (one optional report represented by using this endpoint only when selected). Only performed QC steps accept uploads; PDF signature/extension and 10 MiB size limit are checked. File name, length and SHA-256 participate in idempotency. Existing actor, role, version, execution and tube eligibility checks apply before storage. A clean malware scan is required before evidence can commit. Ordinary commands continue to save without attachments.

`GET /platform/lab-operations/preparation/batches/{id}/records/{recordId}/qc-report` is lab-authorized, validates record ownership and clean scan status, and returns a private PDF attachment. Public record details include report metadata but omit storage keys. The two legacy synthetic QC file-reference keys are optional at QC gates; other required protocol captures remain enforced. Approved definitions and prior references are preserved.


## Service-based commercial jobs — September 16, 2026

Commercial AuthorizeLabWorkCommand and amendments no longer resolve a Production workflow or require ApprovedWorkflowVersionId. The optional field remains wire-compatible for historical replay and explicitly approved Trial scope. Commercial jobs choose exact procedures at attempt/batch execution; preserve service identity, authorization snapshots and provider command idempotency. Existing job workflow columns are retained historical data, not commercial eligibility restrictions.


This document defines the version 1 application contract between
Commercial Operations and Lab Operations.

It governs the implemented version 1 application boundary and remains the
design authority for compatible providers. It does not authorize new projects,
contract versions, schemas, migrations, dependencies, external integrations,
or deployments.

## Status

- Contract direction approved through the Lab Operations planning decisions on
  2026-07-16.
- Current status: implemented for the approved internal application scope;
  database-backed conformance execution passed on 2026-07-16; authenticated
  browser, physical bench, and production activation remain incomplete.
- Version: `v1` core application contract implemented on 2026-07-16 in
  `PSeq.Operations.Commercial.LabOperations.Application`.
- Implemented scope: transport-neutral authorization/amendment/cancellation
  commands, acknowledgments and cancellation outcomes, work/exception
  projections, stable enums and reason codes, the generic event envelope, and
  the Commercial-owned `ILabOperationsProvider` port.
- Laboratory persistence: work orders, immutable authorization versions,
  specimen/accession and container records, protocols and execution, materials,
  equipment, libraries, operational batches, sendouts and custody, exceptions,
  scientific approvals, provider-command receipts, and the durable outbox are
  implemented in `lab_ops`. Commercial authorizations, customer-safe
  projections, and event receipts are implemented in `commercial_ops`.
- Initial provider: `InternalLabOperationsProvider` is registered in the API and
  implements durable command replay, authorization creation/amendment,
  cancellation feasibility, and current work projection lookup.
- Provider conformance coverage: five opt-in PostgreSQL tests in
  `backend/test/LabOperationsProviderPostgresTests.cs` cover atomic persistence,
  command replay/conflict, authorization changes, cancellation, projection
  lookup, organization isolation, event replay, out-of-order delivery,
  customer-safe fields, and no-file publication at `ReadyForRelease`. They
  require the explicitly configured migrated reference database and all five
  passed together on 2026-07-16.
- Commercial handoff coverage: thirteen opt-in PostgreSQL controller test sources
  now prove Phaeno initiation and shared command idempotency, quote acceptance
  without premature Lab work, atomic roster-finalization authorization and
  shipping, rollback after intermediate provider persistence, accepted
  cancellation, a started-work cancellation veto, and the complete rollback-
  isolated operator journey through the customer-safe Ready-for-release
  projection. The original five-case handoff suite passed on 2026-07-16. The
  expanded sources compiled on 2026-08-27; the current suite was not run.
- Completed application integration: accepted customer quotes open exact
  sample-roster preparation, and replay-safe finalization of a compliant roster creates the
  Commercial authorization and Lab work atomically; approved cancellations are
  checked by Lab before Commercial commits; durable events update idempotent,
  monotonic Commercial projections; Lab roles protect the operator workflows;
  and the customer order detail reads only customer-safe progress, action, and
  reviewer-permitted QC fields.
- Future provider: a third-party LIMS adapter implementing the same
  application-facing semantics.
- Raw and intermediate pipeline data remain outside POMS. For PSeq final
  deliverables, the provider-neutral pipeline adapter registers an immutable
  manifest and transfers artifacts directly through object storage; large file
  bytes never pass through the API.
- POMS-governed output-package scanning and Result Release Manager publication
  are authoritative for PSeq. `ReadyForRelease` is scientific readiness only
  and never makes a file customer-visible or consults invoice balance.

## Purpose

Commercial Operations needs to authorize Phaeno laboratory work and present a
coherent customer experience without depending on the internal laboratory data
model. Lab Operations needs enough authorized scientific and specimen context
to execute work without owning the customer relationship, sale, price, Portal
permissions, or release decision.

The same boundary must work for:

- an internal Lab Operations module today
- a future in-house NGS extension
- a future third-party LIMS replacement

## Boundary Rule

```text
Customer or Partner
        |
        v
Commercial order / approved Trial Project
        |
        v
ILabOperationsProvider v1
        |
        +-- InternalLabOperationsProvider
        |
        +-- ThirdPartyLimsProvider (future)
        |
        v
Stable milestones, schedule, exceptions, and scientific readiness
        |
        v
Commercial customer communication and release
```

Commercial Operations never writes `lab_ops` entities directly. Lab Operations
never writes commercial orders, quotes, customer timelines, CRM facts,
QuickBooks facts, Portal permissions, or customer release records directly.

Sharing one API, one database, and one EF context does not weaken this rule.

## Contract Scope

Version 1 covers only:

- authorizing a laboratory work order from an approved commercial or Trial
  Project source
- replacing an authorization with a newer immutable version before or within
  allowed execution limits
- asking Lab Operations to assess and apply a cancellation request
- acknowledging whether a command was accepted, already applied, rejected, or
  requires manual review
- querying a stable work projection for reconciliation
- publishing stable milestones and schedule health
- raising and resolving internal or customer-action-required exceptions
- announcing that scientific work is approved and ready for Commercial release
  with the pinned output-package and approval identifiers

Version 1 is not the Lab operator API. Protocol authoring, accession actions,
container movements, material use, equipment use, batch construction, NGS
send-out, QC execution, deviations, and scientific review use Laboratory-owned
application services and screens.

## Stable Identifiers

The contract uses Phaeno-owned identifiers. A future provider may add external
identifiers in its adapter mapping, but vendor identifiers never replace these
keys.

| Identifier | Owner | Meaning |
| --- | --- | --- |
| `CommandId` | Calling module | Globally unique idempotency key for one command. |
| `CorrelationId` | Originating workflow | Connects commands, acknowledgments, events, and reconciliation. |
| `AuthorizationId` | Commercial | Stable identity of the permission to perform a body of Lab work. |
| `AuthorizationVersion` | Commercial | Monotonically increasing immutable authorization snapshot version. |
| `AuthorizationSourceId` | Commercial | Commercial order ID or approved Trial Project ID. |
| `SubmittingOrganizationId` | Commercial | Organization that owns and submitted the Phaeno work. |
| `SubmittedSpecimenId` | Commercial | Stable identity of a specimen declaration before Lab receipt. |
| `LabWorkOrderId` | Laboratory | Stable identity of Lab execution created from an authorization. |
| `AccessionId` | Laboratory | Stable identity assigned to a received biological specimen. |
| `LabExceptionId` | Laboratory | Stable identity for one Lab issue and its resolution. |
| `ScientificApprovalId` | Laboratory | Stable identity of the approved release candidate. |
| `ResultOutputPackageId` | Pipeline/POMS | Stable identity of the complete final-deliverable package pinned by scientific approval. |

Identifiers are UUIDs in the Phaeno implementation. Human-readable order
numbers, accession numbers, specimen references, and barcodes are attributes,
not primary integration keys.

## Authorization Source

```csharp
public enum LabWorkAuthorizationSource
{
    CommercialOrder,
    TrialProject
}
```

- Paid work references exactly one Commercial order.
- A separately approved Trial Project may authorize bounded no-charge work
  without pretending to be an order.
- Customer and Partner are not authorization-source types. Both become the
  submitting organization and follow the same Lab workflow.
- A Partner's downstream customer is neither required nor inferred.

## Command Envelope

Every command carries transport-neutral control metadata:

```csharp
public sealed record LabOperationsCommandMetadata(
    Guid CommandId,
    Guid CorrelationId,
    DateTime OccurredAtUtc,
    int ContractVersion = 1);
```

Rules:

- `CommandId` makes retries idempotent.
- `OccurredAtUtc` records when the business action occurred, not when a retry
  reached the provider.
- `ContractVersion` selects application semantics, not a vendor API version.
- Authentication credentials, webhook signatures, rate limits, and vendor
  routing are adapter concerns and are not domain fields.

## Authorize Work

Commercial Operations sends a complete immutable authorization snapshot, not a
partially merged Lab entity.

```csharp
public sealed record AuthorizeLabWorkCommand(
    LabOperationsCommandMetadata Metadata,
    Guid AuthorizationId,
    int AuthorizationVersion,
    LabWorkAuthorizationSource SourceType,
    Guid AuthorizationSourceId,
    Guid SubmittingOrganizationId,
    string ServiceKey,
    int ServiceVersion,
    string TurnaroundPolicyKey,
    string? OpaqueSubmitterReference,
    IReadOnlyList<AuthorizedSpecimen> Specimens);

public sealed record AuthorizedSpecimen(
    Guid SubmittedSpecimenId,
    string SubmitterSpecimenReference,
    string DeclaredMaterialType,
    string DeclaredBiologicalSource,
    decimal DeclaredQuantity,
    string DeclaredQuantityUnit,
    string DeclaredStorageRequirements,
    string DeclaredSafetyInformation,
    DateTime? DeclaredCollectionDate,
    decimal? DeclaredConcentration,
    string? SubmissionNote,
    IReadOnlyList<string> RequestedServiceKeys);
```

The exact request type may evolve during implementation, but these ownership
rules are fixed:

- Commercial owns the submitted declarations and service authorization.
- Lab validates actual received material and creates accession/container facts.
- Declared data is never silently converted into an observed Lab fact.
- For Customer Lab Service work, Commercial sends the initial authorization only
  after the price-accepted sample roster is finalized. `DeclaredQuantity` with
  unit `tube` is the number of expected submitted physical containers for one
  biological specimen. Lab creates one specimen/accession and may attach
  multiple registered-supplier submitted containers to it, one per received
  tube, while preserving each container barcode and any missing-tube exception.
- The payload contains no price, quote, invoice, credit, payment, CRM Opportunity,
  or Portal membership data.
- The payload contains no Customer-versus-Partner branch.
- The payload contains no downstream customer identity for Partner submissions.

An accepted command creates or matches one Lab work order. Retrying the same
`CommandId` and payload returns the original acknowledgment. Reusing the same
`CommandId` with different content is rejected.

## Amend Work Authorization

An amendment is a full replacement snapshot with a higher authorization
version. It is not a mutable patch against Laboratory tables.

```csharp
public sealed record AmendLabWorkAuthorizationCommand(
    LabOperationsCommandMetadata Metadata,
    Guid AuthorizationId,
    int ExpectedAuthorizationVersion,
    int NewAuthorizationVersion,
    string CommercialReasonCode,
    AuthorizeLabWorkCommand ReplacementAuthorization);
```

Rules:

- versions increase monotonically
- resending an already applied version is idempotent
- a stale expected version is rejected as a concurrency conflict
- Lab may reject or require manual review when work has passed a point where
  the requested change is scientifically or physically safe
- Commercial owns any price, quote, customer consent, or contractual effects
- accepted amendments preserve previous authorization versions
- Lab never infers expanded commercial scope from an operator action

## Cancellation Request

Commercial Operations owns the customer cancellation workflow and financial
decision. Lab Operations owns whether physical/scientific execution can stop
and what work has already occurred.

```csharp
public sealed record RequestLabWorkCancellationCommand(
    LabOperationsCommandMetadata Metadata,
    Guid AuthorizationId,
    int ExpectedAuthorizationVersion,
    string ReasonCode,
    IReadOnlyList<Guid>? SubmittedSpecimenIds);
```

- A null specimen list asks to cancel all remaining work.
- A populated list asks to cancel only the correlated specimen work.
- Lab returns accepted, partially accepted, rejected, or manual-review-needed.
- Lab response describes operational feasibility and affected work only.
- Commercial determines customer wording, credits, refunds, order status, and
  notification.
- Cancellation never deletes accession, custody, execution, or audit history.

## Command Acknowledgment

```csharp
public enum LabCommandDisposition
{
    Accepted,
    AlreadyApplied,
    Rejected,
    ManualReviewRequired
}

public sealed record LabCommandAcknowledgment(
    Guid CommandId,
    Guid CorrelationId,
    LabCommandDisposition Disposition,
    Guid? LabWorkOrderId,
    int? AppliedAuthorizationVersion,
    string? ReasonCode,
    DateTime AcknowledgedAtUtc);
```

Cancellation uses a distinct outcome because partial acceptance is meaningful:

```csharp
public enum LabCancellationDisposition
{
    Accepted,
    PartiallyAccepted,
    Rejected,
    ManualReviewRequired
}

public sealed record LabCancellationOutcome(
    Guid CommandId,
    Guid CorrelationId,
    LabCancellationDisposition Disposition,
    Guid? LabWorkOrderId,
    IReadOnlyList<Guid> AffectedSubmittedSpecimenIds,
    string? ReasonCode,
    DateTime AcknowledgedAtUtc);
```

`ReasonCode` is a controlled provider-neutral code. Vendor error messages,
stack traces, internal notes, and customer-facing prose do not cross in this
field.

Initial reason-code families include:

- `authorization_invalid`
- `authorization_version_conflict`
- `unsupported_service`
- `work_already_started`
- `change_not_safe`
- `cancellation_not_possible`
- `manual_review_required`
- `provider_unavailable`
- `command_id_conflict`

The exact code registry is implementation work and must remain small.

## Provider Interface

The application-facing interface is intentionally narrow:

```csharp
public interface ILabOperationsProvider
{
    Task<LabCommandAcknowledgment> AuthorizeWorkAsync(
        AuthorizeLabWorkCommand command,
        CancellationToken cancellationToken);

    Task<LabCommandAcknowledgment> AmendAuthorizationAsync(
        AmendLabWorkAuthorizationCommand command,
        CancellationToken cancellationToken);

    Task<LabCancellationOutcome> RequestCancellationAsync(
        RequestLabWorkCancellationCommand command,
        CancellationToken cancellationToken);

    Task<LabWorkProjection?> GetWorkProjectionAsync(
        Guid authorizationId,
        CancellationToken cancellationToken);
}
```

This interface is not a CRUD repository and must not expose `IQueryable`, EF
entities, `DbContext`, vendor DTOs, vendor status strings, or direct table
operations.

## Stable Work Projection

September 10 intake correction: internal durable events also carry a safe intake snapshot (physical receipt present, submitted-specimen ID, actual receipt timestamp, accession ID after all expected tubes are accessioned, and operator for audit). Commercial applies it only with a newer projection version and the matching work authorization/organization. Storage, receipt notes and scientific acceptance stay in Lab. The public provider projection and milestones below remain unchanged.

September 10 customer stages: the approved Customer/Partner list/detail enhancement adds an optional `laboratoryProgress` summary through `LabCustomerProgressService`. This internal read boundary joins only already-authorized Commercial orders to their matching organization/authorization/Lab work, and exposes current stage keys, counts and scoped sample IDs. It reads recorded preparation, sendout and output evidence without returning execution details, storage, provider details or internal QC. This does not change `ILabOperationsProvider`, command/event versions, durable projections or persisted milestones; a replacement provider must supply equivalent safe stage facts before detailed progress can be shown. List responses omit sample IDs; detail responses include them for the authorized roster. Stage availability never authorizes result access.

Commercial Operations stores or refreshes a projection sufficient for customer
experience, communication, CRM summary, and reconciliation. It is not a
copy of the Lab execution ledger.

```csharp
public sealed record LabWorkProjection(
    Guid AuthorizationId,
    Guid LabWorkOrderId,
    int AuthorizationVersion,
    LabWorkMilestone Milestone,
    LabScheduleHealth ScheduleHealth,
    DateTime? CurrentExpectedCompletionAtUtc,
    int ActiveCustomerActionCount,
    DateTime LastChangedAtUtc,
    long ProjectionVersion);
```

`ProjectionVersion` increases monotonically so duplicate or out-of-order events
cannot move Commercial state backwards.

The persisted Commercial projection also carries only the controlled
customer-action summary and reviewer-permitted QC JSON needed by the current
Portal view. It does not carry internal notes, raw QC, batch membership, or file
references.

## Milestones and Schedule Health

Milestones are deliberately coarse and stable:

```csharp
public enum LabWorkMilestone
{
    AwaitingSpecimens,
    Received,
    OnHold,
    Processing,
    AwaitingExternalSequencing,
    DataProcessing,
    ScientificReview,
    ReadyForRelease,
    Cancelled
}

public enum LabScheduleHealth
{
    OnTrack,
    AtRisk,
    Delayed,
    Complete
}
```

Rules:

- internal protocol steps, container state, batch state, equipment, reagent
  usage, provider manifests, and raw QC never become milestones
- Commercial maps milestones to customer-safe language
- cross-customer batch membership never crosses the contract
- `DataProcessing` is reserved because the customer experience needs it, but
  its producing system and transition contract remain part of the major
  pipeline TBD; no implementation may assign ownership by assumption
- `ReadyForRelease` does not release anything to a customer
- Commercial controls completion wording after release

An exception is not a milestone. It is independent state so work can remain in
`Processing` while being at risk or waiting for customer action.

## Exceptions

```csharp
public enum LabExceptionAudience
{
    Internal,
    CustomerActionRequired
}

public enum LabExceptionSeverity
{
    Advisory,
    Blocking
}

public sealed record LabExceptionProjection(
    Guid LabExceptionId,
    Guid AuthorizationId,
    Guid? SubmittedSpecimenId,
    LabExceptionAudience Audience,
    LabExceptionSeverity Severity,
    string ActionCode,
    DateTime RaisedAtUtc,
    DateTime? ResponseDueAtUtc,
    bool IsResolved,
    long ProjectionVersion);
```

Initial `ActionCode` families may include:

- `replace_specimen`
- `provide_missing_information`
- `confirm_scope_change`
- `resubmit_data`
- `contact_phaeno`

Lab owns the full scientific issue and internal notes. Commercial receives the
structured action projection and may provide an authorized Phaeno user a
separate staff-only summary when required. No internal Lab note is automatically
copied into Portal, email, CRM, QuickBooks, or a generated document.

Commercial owns recipient selection, customer-safe wording, deadlines shown to
the organization, reminders, and response capture. A Partner remains the
recipient for its work; Phaeno does not require the Partner's downstream
customer.

## Expected Completion Changes

Lab Operations may publish a revised expected completion date with:

- the new UTC timestamp
- schedule health
- a controlled reason code
- projection version

Commercial owns Portal and email communication. The existing approved rule
remains: later dates notify the ordering organization using customer-safe
wording; earlier dates update the Portal without requiring an email. Internal
batch composition and internal notes never cross.

## Scientific Readiness and Release

Lab Operations ends at `ReadyForRelease` and publishes:

- `AuthorizationId`
- `LabWorkOrderId`
- `ScientificApprovalId`
- `ResultOutputPackageId`
- approval timestamp
- approved release-definition key/version
- permitted customer-visible QC projection, when defined
- projection version

Commercial Operations decides when and to whom the result is released. A
released result is immutable; a correction creates a new approved version and
a new Commercial release.

Version 1 deliberately does not define or store:

- raw NGS file references
- pipeline submission or job identifiers
- intermediate artifacts
- raw or intermediate output manifests
- raw or intermediate scientific storage locations
- raw or intermediate checksums or provenance
- download URLs
- retention policy

PSeq final deliverables use the separate governed `ResultOutputPackage` and
`ResultArtifact` contract. Scientific approval pins that package/version and
the Commercial projection creates its release candidate automatically. This
does not broaden the Lab provider contract into general file management or
pipeline orchestration.

## Event Envelope

Lab-to-Commercial changes use a durable provider-neutral envelope:

```csharp
public sealed record LabOperationsEventEnvelope<TPayload>(
    Guid EventId,
    Guid CorrelationId,
    Guid AuthorizationId,
    long ProjectionVersion,
    DateTime OccurredAtUtc,
    int ContractVersion,
    TPayload Payload);
```

Version 1 event families:

- `LabWorkMilestoneChanged`
- `LabScheduleChanged`
- `LabExceptionRaised`
- `LabExceptionResolved`
- `LabWorkReadyForRelease`
- `LabCancellationOutcomeRecorded`

The internal provider may execute in-process, but events still require durable,
idempotent application semantics. A future external adapter may receive
webhooks, poll, or reconcile; those transport details do not change the event
contract.

## Delivery, Idempotency, and Reconciliation

- Every command is idempotent by `CommandId` plus payload hash.
- Every event is idempotent by `EventId`.
- Projection updates apply only when `ProjectionVersion` is newer.
- Duplicate delivery is expected and harmless.
- Out-of-order events are ignored or reconciled; they never move state
  backwards.
- Failed delivery is retryable and observable.
- `GetWorkProjectionAsync` provides scheduled reconciliation when delivery is
  missed or uncertain.
- A provider outage does not corrupt Commercial state or create duplicate Lab
  work.
- Internal implementation may share a database transaction where appropriate,
  but callers must not rely on that property because a future LIMS will not.

## Internal Provider Behavior

`InternalLabOperationsProvider` now:

- validates commands independently of Commercial UI validation
- creates or matches `LabWorkOrder` in `lab_ops`
- preserves authorization versions
- maps submitted specimen IDs to accessions without converting declared
  facts into observed facts
- stores the original command outcome and payload hash so identical retries
  return the original response and conflicting command-ID reuse is rejected
- automatically amends or cancels only while affected specimens remain
  unreceived
- returns a provider-neutral current work projection for reconciliation
- participates in the caller's transaction so sample-roster finalization cannot
  leave Commercial authorization, shipping, and Lab work out of sync
- writes durable outbox events that the registered dispatcher applies to
  Commercial-owned projections with event-receipt and projection-version guards

The internal Lab Operations API separately enforces additive operator,
supervisor, protocol-administrator, scientific-reviewer, and
operations-administrator roles. Platform administrators retain bootstrap
access. These roles are implementation detail and do not widen the provider
contract.

Commercial code references the contract assembly or neutral application types,
not `PSeq.Operations.Laboratory` EF entities.

## Future Third-Party LIMS Adapter Behavior

`ThirdPartyLimsProvider` will eventually:

- map Phaeno IDs to vendor IDs in adapter-owned integration metadata
- translate provider-neutral commands into vendor requests
- translate vendor states into Phaeno milestones and exceptions
- authenticate webhooks or callbacks
- handle rate limits, retries, duplicate notifications, and reconciliation
- preserve Phaeno command/event idempotency even if the vendor lacks native
  idempotency
- prevent vendor-specific fields or statuses from leaking into Commercial
  domain or UI code

Replacing the internal provider requires a separately approved ownership
cutover, history strategy, contract test suite, reconciliation proof, and
rollback plan.

## Data That Must Not Cross This Contract

Commercial to Lab Operations must not send:

- price, quote lines, discounts, taxes, invoice, payment, or credit state
- QuickBooks IDs except an opaque procurement reference when separately needed
- CRM Opportunity, sale, workflow, or activity detail
- Portal membership and invitation records
- Customer-versus-Partner branching instructions
- a Partner's downstream customer identity
- customer-facing email prose

Lab Operations to Commercial must not send:

- protocol step-by-step execution logs
- internal batch membership or other organizations' participation
- reagent recipes, source lots, or consumption detail unless a future approved
  release definition explicitly requires a safe summary
- equipment details or internal calibration records
- raw QC or deviation records by default
- internal notes, investigation details, or staff-only reasoning
- vendor credentials, raw vendor payloads, or vendor error messages
- unresolved raw, intermediate, or output file-management detail

## Contract Verification

The current structural and domain tests prove that the core contract is
Commercial-owned, transport-neutral, defaults to contract version 1,
represents partial cancellation, carries no commercial-pricing,
Customer/Partner-branch, vendor, pipeline, or file implementation fields, and
that the internal adapter implements the provider port. Database-backed
provider conformance coverage is implemented as opt-in PostgreSQL tests. Those
database-backed tests passed against the migrated local `phaeno_ops` database
on 2026-07-16. Together, the structural/domain checks and the passing
database-backed scenarios establish:

- Customer and Partner authorizations produce indistinguishable Lab behavior
- a Partner authorization works without downstream customer identity
- repeated identical commands do not create duplicate work
- reused command IDs with different payloads are rejected
- safe authorization amendments persist while stale or unsafe changes are
  rejected or sent to manual review
- full pre-receipt cancellation and partial cancellation of mixed-intake work
  preserve the received specimen
- one organization's projection never contains another organization's data or
  batch participation
- no pipeline/file ownership is inferred by the v1 types

The database-backed projection-delivery test additionally covers:

- newer projections cannot be overwritten by older events
- customer-action exceptions never expose internal notes automatically
- `ReadyForRelease` does not make a result externally visible
- duplicate delivery after a durable receipt remains harmless

The controller-path operator journey additionally covers additive role
assignment, protocol approval/activation, receipt/accession, barcode print
history, QC-gated material and calibrated-equipment use, library lineage,
batch/sendout/custody records, exception resolution, scientific approval, and
the absence of file or result publication at `ReadyForRelease`. Physical label
printing and scanning remain governed by
`LAB-OPERATIONS-BENCH-VALIDATION.md`; database evidence is not a substitute for
that activation gate.

A future fake or external provider must satisfy the same contract scenarios as
the internal provider before a provider cutover.

## Explicitly Deferred

This contract does not define:

- pipeline/file-management ownership or integration
- a third-party LIMS vendor or vendor payload mapping
- authentication changes or new dependencies

The first two items are activation and future-integration boundaries, not gaps
in the completed internal Lab Operations application scope. The registered
provider and current workflows do not make a future external LIMS adapter or
pipeline/file integration implemented.

## Initial Trial contract extension (2026-09-05)

`LabAuthorizeCommand.ApprovedWorkflowVersionId` optionally pins a Trial to the
approved PSeq workflow version. The provider permits that previously approved
version after catalog retirement; an unapproved draft is never eligible.
`TrialProject` is now an active authorization source, with immutable organization
and department ownership and one work authorization per submitted Trial sample.

Governed package registration accepts either the existing Lab order/sample pair
or the new `trialProjectId`/`trialSampleId` pair, with the other pair null. Both
forms require matching organization and Lab work authorization. Idempotency replay
checks the parent identity. Clean artifacts still need the existing Lab scientific
approval and Result Release Manager boundary; a Trial reissue requires a new
package correcting the same original sample and newly transferred objects.
Subsequent Trial package approvals advance the work's projection version so every
scientific decision has a distinct audit identity. Whole-Trial release and its
retention snapshot are owned by the Trial aggregate, not a paid Lab order.

Shared scientific/pipeline/shipping writes honor the Trial's current approval,
acceptance and hold. Custody, receipt and exception documentation can continue
while held. Completed Trials permit only governed correction/reissue work through
the result path. See `TRIAL-INTEGRATION-CLOSEOUT.md` for release and activation gates.


## Reusable Lab step authoring contract - September 17, 2026

`GET /api/platform/lab-operations/steps` returns current and retired identities, exact versions and protocol occurrence usage to authorized Laboratory staff. Protocol Administrator writes: `POST steps`, `POST steps/{id}/versions` (definitionJson, parent version, optional draftId), and `POST steps/{id}/transition` (approve/discard/retire, parent version, selected versionId, retirement reason or explicitly authorized approvalOverrideReason). Phaeno membership, roles and platform override checks reuse existing request context. No deletion or preview-write endpoint exists.

A Lab step version contains one scoped `LabProtocolDefinition` step, unconditionally required and without nested catalog references. A protocol occurrence may add `labStepVersionId`; its existing unique `key` remains the stable evidence identity. The server checks pinned content and approved release provenance, permits occurrence-specific required/condition placement, and preserves exact resolved snapshots. Retired identities cannot be newly selected; retained occurrence pins remain readable/executable. The snapshot's optional `attachmentKind` (`qc`/`preparation`) selects the existing optional PDF attachment presentation. Preview uses these production components locally and creates no operational records.

Step definition report settings: `attachmentKind` accepts none/qc/preparation or absent for legacy behavior; `attachmentRequired` defaults false and requires an explicit report kind plus preparation batch mode when true. Performed entries without the required upload are rejected before execution writes. Skips do not require files and cannot attach one. The individual step endpoint rejects performed entries whose definition requires a batch report.

Preparation step commands must cover exactly the current eligible member set for their stage, step and action. Under the batch/work locks, omitted, duplicate or stale coverage is rejected before recording any sample, using preparation_step_coverage_changed. Failed/closed/operationally held members and unmet prerequisites remain ineligible; initial records and repeats/corrections retain their existing prior-record eligibility rules.

### Inline step resource entries

Preparation detail advertises `inlineResourceFields: true` and `configuredMaterials: true`. GET `steps/material-products` supplies active vendor/product choices under Protocol Administrator authorization for configuration. Supplier administration permissions are unchanged. Step commands may carry `resourceEntries` with the JSON shape documented in the ERD. Resource fields require preparation-batch mode: material/equipment scope is batch or tube, output scope is tube, with one output field per step. Raw resource capture strings are rejected; the server resolves identity and validates use, then records effective capture values. Batch per-sample material quantity is multiplied by exact eligible coverage. Material captures carry a `material` snapshot (name, optional vendor, productId, supplierId and productNumber) resolved when saving configuration. Run-time product/name/vendor overrides are rejected and the frozen snapshot supplies identity. Product assignment does not consume stock; a tracked lot entry uses the existing released/in-date/version/quantity checks. Active supplier products and supplier/type status are validated at configuration save. The selected product and a supplier-backed lot must share a supplier; an exact product/lot relationship is not inferred. Output entries allocate separate containers per attempt, or retain existing outputs without reallocating. These writes participate in the step transaction and request receipt. Corrections reject fresh resource entries and retain prior captured resource values. Preview remains local and does not call these endpoints.

Existing frozen material fields without a material snapshot use their configured label at run time. Embedded/new material configuration must define a snapshot before saving; pinned approved Lab step content is retained unchanged.

### Exact material lot identity - September 17, 2026

This extension supersedes the supplier-only matching described above. Purchased lots expose nullable `supplierProductId` and `productName`; new purchased lots require an active product belonging to their supplier. Prepared lots remain product-free. `GET material-lots/products` supplies the active catalog to existing authorized Laboratory operators. `POST material-lots/{lotId}/product` accepts `supplierProductId` and the current lot `version` for a one-time assignment of an existing unlinked purchased lot. It rejects stale versions, another supplier's product, inactive catalog entries, prepared lots and replacement of an established assignment. No historical lots are automatically mapped.

`GET steps/prepared-materials` supplies active prepared-reagent definitions under Protocol Administrator authorization. Configured material snapshots may carry `materialDefinitionId` instead of product/supplier identity. New tracked material fields require one of those structured identities. Execution requires the exact purchased product and supplier, or the exact prepared material definition and lot kind, before existing QC, expiry, stock, unit and concurrency checks. Legacy unstructured frozen fields retain their earlier matching behavior. Configuration preview supplies fictional matching lots without creating inventory or consumption. See [the implementation plan](MATERIAL-LOT-PRODUCT-LINK-PLAN.md).

Material captures may specify `unit` in their retained JSON; new material authoring requires it. Runtime resource entries must use that configured unit, and tracked lots must match it exactly; no automatic conversion is performed. Frozen definitions without units retain legacy behavior.

### Per-sample material amount exceptions (2026-09-17)

Shared material captures require per-sample quantities. `step.resourceEntries` may contain one common entry and explicit member overrides retaining the same lot/version/unit. Overrides include `amountUnknown`, `exceptionReason` (required, max 2000), and `disposition` (`continue`, `hold`, `fail`). Known quantities accept zero only on overrides; unknown requires no quantity and cannot continue. Common coverage excludes overridden members. Server validation, known consumption, resolved capture evidence, preparation history and tube dispositions commit atomically and retain request-id replay protection. Corrections cannot replace prior resource use. Fail takes precedence over hold.

Unknown tracked use holds the lot through `quantityHoldReason` and appends `quantityHistoryJson` audit data. All consumption paths reject unresolved quantity holds. `POST material-lots/{id}/reconcile-quantity` requires Supervisor/OperationsAdministrator and `{ countedQuantity, reason, version }`; count must be between zero and last balance. It records the balance adjustment, actor/time/reason, clears the hold and leaves historical sample amounts unknown. Preparation action `resume` requires Supervisor and a reason; both preparation and attempt resume paths require supervised review and resolution of uncertain linked lot holds for material exceptions. Existing QC and protocol prerequisites continue to apply.
