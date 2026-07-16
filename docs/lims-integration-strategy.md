# LIMS Integration Strategy

## Status

This document is the durable strategy for keeping laboratory execution
replaceable. No third-party Laboratory Information Management System (LIMS)
product has been selected, and this document does not authorize implementation
or create a dependency on an assumed vendor.

Today, Phaeno Portal remains the operational system of record for the
laboratory workflows represented in the product. Approved planning direction
in `plans/LAB-OPERATIONS-PLAN.md` introduces a fit-for-purpose internal Lab
Operations provider behind the same boundary a future third-party LIMS would
implement. That module and boundary are not yet implemented. Any ownership
change still requires an explicitly planned, data-preserving, and validated
cutover.

## Purpose

Phaeno will initially meet its small-scale execution needs with an internal Lab
Operations module. If laboratory volume, traceability, quality, or future
capabilities later justify a third-party system, Phaeno may replace that
provider with a LIMS adapter. Commercial Operations continues to own the
customer-facing scientific operation while the selected Lab Operations
provider owns explicitly assigned laboratory execution detail.

The intent is to avoid rebuilding mature LIMS capabilities inside the Portal
while preserving a coherent Phaeno experience for customers and internal
operational teams.

## Guiding Principles

1. **Keep the customer workflow in the Portal.**
   - Customers submit and track scientific work through Phaeno Portal.
   - Customers do not need direct LIMS access.
   - The Portal translates laboratory detail into appropriate customer-facing
     milestones and outcomes.
2. **Keep laboratory execution in the selected Lab Operations provider.**
   - The initial internal provider, or a future LIMS after cutover, controls
     accessioning, custody, work execution, protocol versions, QC capture,
     reagent traceability, and laboratory audit history.
   - Commercial Operations must not maintain a competing laboratory ledger.
3. **Use explicit ownership at field and event level.**
   - Shared identifiers and status projections do not make a record jointly
     authoritative.
   - Every synchronized field and event requires a named owner and conflict
     rule before implementation.
4. **Keep systems loosely coupled.**
   - Portal workflows should tolerate delayed LIMS synchronization.
   - Exchanges should be durable, idempotent, retryable, and reconcilable.
   - A transient LIMS outage must not corrupt Portal state or create duplicate
     accessions or work requests.
5. **Keep the provider replaceable.**
   - Commercial domain code depends on provider-neutral contracts.
   - Vendor models, authentication, webhooks, and field mappings remain inside
     an integration adapter.
6. **Minimize transferred data.**
   - Send only the scientific and operational data needed to execute the
     laboratory request.
   - Apply Phaeno's security, privacy, retention, and audit requirements to both
     outbound and inbound data.

## Hypothetical Future Responsibilities

The responsibilities below apply only after an approved product decision,
vendor selection, implementation, validation, and ownership cutover. They do
not describe the running application.

### Phaeno Portal (Customer-Facing Scientific Operations)

The Portal owns:

- Customer organizations, users, memberships, and permissions
- Customer projects and their business context
- Customer-facing sample submissions and Phaeno sample identifiers
- Scientific service and sequencing requests, including requested scope
- Commercial and operational approval to begin work
- Customer-visible workflow milestones and exception messages
- Analysis, report, and data-delivery workflows outside laboratory execution
- Customer communications and the customer-facing activity history

The Portal presents the end-to-end Phaeno service. It may display selected LIMS
milestones and summaries, but it does not become authoritative for the detailed
laboratory events behind those projections.

### LIMS (Laboratory Execution)

After an approved cutover, the LIMS owns:

- Laboratory accession numbers and physical barcode identities
- Containers, aliquots, storage locations, and laboratory sample state
- Chain-of-custody events within laboratory control
- Laboratory work queues, assignments, and execution status
- QC measurements, acceptance rules, results, and laboratory disposition
- Reagent and consumable lot usage
- Controlled protocols, versions, steps, and execution records
- Instrument associations and run-level execution metadata
- Laboratory audit trails, approvals, deviations, and corrective records

The LIMS executes approved work. It does not own customer accounts, project
commercial context, customer permissions, report delivery, or the overall
customer relationship.

## Integration Architecture

Commercial Operations depends on the provider-neutral Lab Operations contract
defined by `plans/LAB-OPERATIONS-PLAN.md`. The initial internal provider
implements that contract in-process. The diagram below describes the additional
adapter boundary if Phaeno later selects an external LIMS.

```text
 Customers and Phaeno Teams
             │
             ▼
      Phaeno Portal
 (Customer-Facing Scientific
        Operations)
             │
             │ Durable commands and events
             │ Provider-neutral models
             ▼
  LIMS Integration Boundary
   (mapping, retries, audit,
      reconciliation)
             │
             │ API / Webhooks / Events
             ▼
      Selected LIMS
  (Laboratory Execution)
             │
             ▼
 Instruments and Lab Work
```

Portal requests and LIMS execution must be correlated through stable Portal and
external identifiers. Vendor-specific identifiers are integration metadata;
they must not replace Phaeno business identifiers.

## Core Ownership Boundaries

### Samples

The Portal owns the customer submission, customer-visible identity, project
association, requested work, and pre-laboratory intake state. The LIMS owns the
laboratory accession, physical containers and aliquots, barcodes, locations,
and laboratory lifecycle after receipt.

The Portal may project LIMS milestones such as `Received`, `Accessioned`, `QC
complete`, or `Sequencing in progress`. Those projections are not a duplicate
laboratory event ledger.

### Chain of Custody

The LIMS is authoritative for custody transfers, storage movements, handlers,
timestamps, container changes, and other events inside laboratory control. The
Portal may show an approved customer-facing timeline or deep link for internal
users, but it must not independently reconstruct authoritative custody history.

The handoff into and out of laboratory control requires an explicit boundary
event with correlated identifiers, timestamps, and acknowledgment from the
receiving system.

### Quality Control

The LIMS owns QC execution, raw measurements, rule evaluation, approval,
deviation handling, and laboratory disposition. The Portal owns the wording and
release of customer-visible QC status and may retain an approved summary or
reference needed by downstream analysis and reporting.

Raw QC data should cross into the Portal only when a defined scientific or
customer workflow requires it. A simple customer status projection should not
copy the complete QC record.

### Reagent Lots

The LIMS owns reagent and consumable lot identity, receipt, expiration,
availability, preparation, and usage against laboratory work. The Portal may
receive a traceability reference when required for a released result, report,
investigation, or audit, but it does not manage laboratory inventory.

### Protocols

The LIMS owns controlled laboratory protocol definitions, versions, approvals,
execution steps, deviations, and operator attestations. The Portal owns the
customer-facing service definition and requested scientific outcome. A Portal
service version must map explicitly to the LIMS protocol or workflow version
used to execute it.

### Sequencing Requests

The Portal owns the customer-facing sequencing request, project context,
requested service, sample set, priority, and authorization to proceed. The LIMS
owns the derived laboratory work order, preparation and sequencing execution,
instrument/run associations, and execution status.

Submission must be idempotent. The LIMS must acknowledge whether it accepted,
rejected, or already received a request. Material changes after acceptance
require an explicit amendment or cancellation workflow rather than silent
overwrites.

## Data Ownership

| Data | System of record after cutover | Integration behavior |
| --- | --- | --- |
| Customer organizations and access | Portal | Send only the execution context the LIMS requires |
| Projects and customer service context | Portal | Send stable references and approved request metadata |
| Customer-facing sample submission | Portal | Create or match a LIMS accession through an idempotent command |
| Laboratory accession and barcode | LIMS | Return identifiers and approved status projections to Portal |
| Containers, aliquots, and locations | LIMS | Keep detail in LIMS; expose references only when needed |
| Chain of custody in the laboratory | LIMS | Return approved milestones or a deep link, not a duplicate ledger |
| QC measurements and disposition | LIMS | Return approved summaries and downstream-required results |
| Reagent and consumable lots | LIMS | Return traceability references only when required |
| Controlled protocols and execution | LIMS | Return protocol/version references and completion outcomes |
| Customer-facing sequencing request | Portal | Submit approved request and retain Portal workflow state |
| Laboratory work order and run execution | LIMS | Return acknowledgment, status, exceptions, and run references |
| Analyses, reports, and customer delivery | Portal | Consume released laboratory outputs or references |
| Vendor external identifiers | Integration metadata | Store alongside stable Portal identifiers for correlation |

## Integration Goals

The future integration should support:

- Creating or matching laboratory accessions from approved Portal submissions
- Submitting sequencing and other laboratory requests without duplicates
- Returning accession numbers, barcode references, and acceptance outcomes
- Projecting approved laboratory milestones into internal and customer views
- Receiving QC disposition and only the measurements required downstream
- Correlating protocol versions, reagent lots, runs, and released outputs when
  traceability requires them
- Handling request amendments, cancellation, rejection, and laboratory
  exceptions explicitly
- Providing internal deep links to LIMS records where useful and authorized
- Authenticating inbound notifications and tolerating duplicate or out-of-order
  events
- Recording synchronization state, attempts, failures, and reconciliation
  outcomes in the Portal integration layer
- Supporting scheduled reconciliation so missed webhooks or partial failures do
  not leave the systems permanently inconsistent

Detailed scientific payloads, status vocabularies, retention rules, and release
criteria remain discovery work. They must be defined with laboratory operators
before implementation.

## Phased Implementation Roadmap

### Phase 0: Workflow Discovery and Vendor Evaluation

- Map the real sample-receipt, accessioning, QC, preparation, sequencing,
  exception, and release workflows.
- Define canonical Portal concepts and the proposed LIMS mappings.
- Identify regulated records, signatures, retention, audit, and validation
  obligations based on Phaeno's intended use.
- Evaluate candidate vendors against the criteria in this document.
- Select a vendor only after testing its API and representative workflows in a
  sandbox or proof of concept.
- Define the cutover and rollback boundary for any workflow currently owned by
  the Portal.

### Phase 1: Integration Foundation

- Implement `ILimsProvider` and an adapter for the selected LIMS.
- Configure credentials and secrets outside source control.
- Add external-identifier mapping, idempotency, durable delivery, retry, audit,
  monitoring, and reconciliation support.
- Implement authenticated inbound webhook or event handling when supported.
- Validate provider contract tests without changing customer workflows.

### Phase 2: Accession and Request Handoff

- Send approved customer sample submissions to the LIMS.
- Receive accession, barcode, and acceptance or rejection details.
- Submit sequencing requests and correlate the resulting laboratory work order.
- Add explicit amendment and cancellation behavior.
- Run a controlled parallel-validation period before declaring the LIMS
  authoritative for these records.

### Phase 3: Laboratory Status and QC Projection

- Receive laboratory milestones, exceptions, QC disposition, and released
  output references.
- Present appropriate internal and customer-facing status in the Portal.
- Add deep links for authorized internal users.
- Monitor stale, failed, duplicate, and inconsistent integrations.
- Complete the approved ownership cutover and retire competing Portal write
  paths for laboratory-owned facts.

### Phase 4: Traceability and Advanced Workflow

- Add protocol-version, reagent-lot, custody, run, and instrument references
  where justified by scientific, quality, or regulatory needs.
- Add validated electronic approvals or signatures if required.
- Expand automated reconciliation and audit evidence.
- Reassess vendor fit and provider portability using production evidence.

Each phase requires separately approved scope and acceptance criteria. Later
phases should not be implemented speculatively.

## Provider Abstraction

Commercial application features should depend on provider-neutral commands and
results rather than an internal Lab Operations data model, vendor SDK, or
vendor record types. Both the initial internal provider and a future external
adapter implement the same application-facing contract. An illustrative
interface is:

```csharp
public interface ILabOperationsProvider
{
    Task<LabWorkSubmissionResult> SubmitSampleAsync(
        LabWorkSubmission submission,
        CancellationToken cancellationToken);

    Task<LabWorkRequestResult> SubmitSequencingRequestAsync(
        LabSequencingRequest request,
        CancellationToken cancellationToken);

    Task<LabWorkAmendmentResult> AmendSequencingRequestAsync(
        Guid labWorkRequestId,
        LabSequencingRequestAmendment amendment,
        CancellationToken cancellationToken);

    Task CancelSequencingRequestAsync(
        Guid labWorkRequestId,
        string reason,
        CancellationToken cancellationToken);

    Task<LabSampleStatus?> GetSampleStatusAsync(
        Guid accessionId,
        CancellationToken cancellationToken);

    Task<LabQcSummary?> GetQcSummaryAsync(
        Guid accessionId,
        CancellationToken cancellationToken);

    Task<LabWorkRequestStatus?> GetSequencingRequestStatusAsync(
        Guid labWorkRequestId,
        CancellationToken cancellationToken);
}
```

The final contract should be no broader than proven workflows. Webhook
validation, pagination, rate limits, vendor statuses, and vendor-specific error
handling belong in the selected adapter. Inbound events should be translated to
provider-neutral integration messages before they affect Portal workflows.

## Vendor Status

The LIMS vendor is intentionally undecided. This strategy must not be read as a
preference for a specific commercial or open-source product. Phaeno should
select a vendor only after its laboratory workflows, intended regulatory use,
operating model, and integration requirements are sufficiently concrete.

## Future Vendor Evaluation Criteria

Candidate LIMS products should be evaluated against at least these criteria:

- **API quality:** API completeness, stable versioning, documentation, sandbox
  access, webhooks or events, idempotency support, rate limits, bulk operations,
  and testability.
- **Deployment options:** Appropriate cloud and self-hosted choices, data
  residency, backup and recovery, upgrade control, availability commitments,
  and complete data export.
- **Workflow flexibility:** Configurable sample, QC, protocol, deviation, and
  approval workflows without fragile custom code; controlled versioning and
  migration of workflow definitions.
- **Barcode support:** Label design and printing, common barcode standards,
  scanner workflows, reprinting controls, parent-child container relationships,
  and offline or degraded-mode behavior where needed.
- **Audit trails:** Attributable and timestamped history, reason-for-change,
  immutable or appropriately protected records, search and export, custody
  history, and administrator activity visibility.
- **Regulatory readiness:** Role-based access, electronic signatures where
  required, validation support and evidence, retention controls, and readiness
  for the standards that apply to Phaeno's actual intended use. Marketing claims
  are not a substitute for Phaeno's own compliance assessment and validation.
- **Security and privacy:** Strong authentication, least-privilege authorization,
  encryption, tenant and environment separation, security attestations,
  incident response, and appropriate handling of sensitive scientific or
  personal data.
- **Scientific interoperability:** Instrument integrations, structured data
  import and export, file references, protocol and result models, and support
  for sequencing-related workflows.
- **Operations and support:** Reliability, observability, vendor support quality,
  implementation partners, U.S. support coverage, training, and a sustainable
  upgrade path.
- **Commercial fit:** Total cost of ownership, implementation effort,
  customization maintenance, contract terms, exit costs, and fit for a small
  organization with outsourced kit and service operations.

Evaluation should use scored, representative workflows and direct API testing,
not feature-list comparison alone.

## Architectural Rule

> **Commercial Operations owns customer-facing scientific operations. The
> selected Lab Operations provider owns laboratory execution. The provider
> boundary connects those domains without making either one a duplicate system
> of record.**

Until the internal Lab Operations transition or a future LIMS ownership cutover
is explicitly implemented, current Portal plans and implemented workflows
remain authoritative for existing behavior.
