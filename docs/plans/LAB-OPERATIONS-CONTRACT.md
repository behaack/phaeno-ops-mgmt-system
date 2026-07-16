# Commercial to Lab Operations Contract

This document defines the planned version 1 application contract between
Commercial Operations and Lab Operations.

It is an architecture and implementation-planning artifact only. It does not
authorize new projects, code, schemas, tables, migrations, dependencies,
external integrations, or deployments.

## Status

- Contract direction approved through the Lab Operations planning decisions on
  2026-07-16.
- Version: `v1` core application contract implemented on 2026-07-16 in
  `PSeq.Operations.Commercial.LabOperations.Application`.
- Implemented scope: transport-neutral authorization/amendment/cancellation
  commands, acknowledgments and cancellation outcomes, work/exception
  projections, stable enums and reason codes, the generic event envelope, and
  the Commercial-owned `ILabOperationsProvider` port.
- Laboratory persistence foundation: work orders, immutable authorization
  versions, specimen/accession records, execution events, scientific approvals,
  and durable provider-command receipts are implemented in `lab_ops` by
  `20260716223048_AddLabOperationsFoundation` and
  `20260716225818_AddLabProviderCommandReceipts`.
- Initial provider: `InternalLabOperationsProvider` is registered in the API and
  implements durable command replay, authorization creation/amendment,
  cancellation feasibility, and current work projection lookup.
- Provider conformance coverage: four opt-in PostgreSQL tests in
  `backend/test/LabOperationsProviderPostgresTests.cs` cover atomic persistence,
  command replay/conflict, authorization changes, cancellation, projection
  lookup, and organization isolation. They require the explicitly configured
  migrated reference database and were compiled, but not executed, in this
  slice.
- Not yet implemented: Commercial projection persistence, event payload
  families/delivery, Laboratory role enforcement, operator execution workflows,
  or a connection to current customer workflows.
- Future provider: a third-party LIMS adapter implementing the same
  application-facing semantics.
- Automated data-pipeline and scientific file-management ownership remains a
  major TBD. This contract does not resolve or silently absorb it.
- Current `LabServiceOrder`, `LabSample`, and result-release code remains
  authoritative until a separate restructuring and migration is approved.

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
never writes commercial orders, quotes, customer timelines, HubSpot facts,
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
- The payload contains no price, quote, invoice, credit, payment, HubSpot deal,
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

Commercial Operations stores or refreshes a projection sufficient for customer
experience, communication, HubSpot summary, and reconciliation. It is not a
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
copied into Portal, email, HubSpot, QuickBooks, or a generated document.

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
- approval timestamp
- approved release-definition key/version
- permitted customer-visible QC projection, when defined
- projection version

Commercial Operations decides when and to whom the result is released. A
released result is immutable; a correction creates a new approved version and
a new Commercial release.

Version 1 deliberately does not define:

- raw NGS file references
- pipeline submission or job identifiers
- intermediate artifacts
- output manifests
- scientific storage locations
- checksums or provenance
- download URLs
- retention policy

The future pipeline/file decision will add only the minimum opaque output
reference needed by Commercial release. It must not broaden this contract into
a general file-management or pipeline API.

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

Planned event families:

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

- validate the command independently of Commercial UI validation
- create or match `LabWorkOrder` in `lab_ops`
- preserve authorization versions
- map submitted specimen IDs to future accessions without converting declared
  facts into observed facts
- store the original command outcome and payload hash so identical retries
  return the original response and conflicting command-ID reuse is rejected
- automatically amend or cancel only while affected specimens remain unreceived
- return a provider-neutral current work projection for reconciliation

It does not yet publish projections into Commercial-owned read models, deliver
events, enforce future Laboratory operator roles, or receive commands from the
current customer order flow.

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
- HubSpot Deal, Order, workflow, or activity detail
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

## Contract Tests Required Before Implementation Is Complete

The current structural and domain tests prove that the core contract is
Commercial-owned, transport-neutral, defaults to contract version 1,
represents partial cancellation, carries no commercial-pricing,
Customer/Partner-branch, vendor, pipeline, or file implementation fields, and
that the internal adapter implements the provider port. Database-backed
provider conformance coverage is implemented as opt-in PostgreSQL tests. A
passing execution against the migrated reference database remains required
before this transition is complete. Current structural, domain, and provider
coverage proves:

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

When durable Lab-to-Commercial event delivery and Commercial projection
persistence are implemented, additional conformance coverage must prove:

- newer projections cannot be overwritten by older events
- customer-action exceptions never expose internal notes automatically
- `ReadyForRelease` does not make a result externally visible
- a future fake or external provider satisfies the same contract scenarios as
  the internal provider

## Explicitly Deferred

This contract does not define:

- Laboratory operator commands and screens
- protocol, material, equipment, batch, QC, or accession entity schemas
- exact persistence tables for future provider mappings, event delivery, or
  Commercial projections; durable internal command receipts are implemented
- the development reset from `portal` to the clean `commercial_ops` baseline,
  which is governed by `PSEQ-OPERATIONS-MIGRATION-PLAN.md` and completed on
  2026-07-16
- the `lab_ops` persistence foundation, which is governed by
  `PSEQ-OPERATIONS-MIGRATION-PLAN.md` and implemented by the additive
  `AddLabOperationsFoundation` migration
- pipeline/file-management ownership or integration
- a third-party LIMS vendor or vendor payload mapping
- authentication changes or new dependencies

The remaining items are later planning and implementation steps. The registered
provider does not make current customer routing, operator workflows, event
delivery, or a future external LIMS adapter implemented.
