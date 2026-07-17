# Prospect Trial Project Plan

Keep this file updated as Prospect trial-project requirements are supplied and
decisions are made.

Do not execute this plan unless explicitly requested.

## Status

- Product direction was approved on 2026-07-15 for planning purposes.
- A Trial Project is a no-charge, closed-ended project through which a Prospect
  may submit samples for Phaeno processing before deciding whether to become a
  Customer or Partner.
- A Trial Project is not an order, quote, invoice, curated demonstration-data
  grant, or general Prospect capability.
- The current application does not implement Trial Projects. Existing code and
  authorization correctly prevent Prospects from viewing, creating, or placing
  orders.
- The implemented Lab Operations v1 contract already reserves `TrialProject`
  as an authorization source, but no Trial Project currently invokes it. A
  future Trial Project implementation must route approved work through the
  existing provider and Phaeno-only Lab roles rather than create a second
  laboratory execution path.
- HubSpot is the selected relationship CRM and planned integration target, but
  no CRM integration exists in the running application. The workflow must
  support a manual handoff before automation is required.
- No implementation, dependency, schema, authentication, migration, HubSpot
  integration, or test execution is authorized by this planning decision.

## Related Documents

- `../crm-integration-strategy.md` owns the durable HubSpot/Portal boundary, and
  `HUBSPOT-PORTAL-LIFECYCLE-PLAN.md` owns its active lifecycle contract.
- `AUTH-USER-SYSTEM-PLAN.md` owns organization, membership, invitation, and
  conversion authorization.
- `ORDER-MANAGEMENT-PLAN.md` owns Customer and Partner commercial ordering and
  preserves the rule that a Trial Project is not an order.
- `LAB-OPERATIONS-PLAN.md` and `LAB-OPERATIONS-CONTRACT.md` own the implemented
  provider boundary that a future approved Trial Project uses for laboratory
  execution. They do not make Trial Projects implemented.
- `ORGANIZATION-DATA-PROVISIONING-PLAN.md` owns Phaeno-curated sample packages,
  which remain separate from Prospect-supplied trial samples and results.
- `BACKEND-TEST-PLAN.md`, `FRONTEND-TEST-PLAN.md`, and `E2E-TEST-PLAN.md` track
  deferred verification coverage.

## Purpose

Allow a qualified Prospect to complete a controlled try-before-you-buy project
using its own samples without prematurely converting the organization to a
Customer or Partner or granting normal ordering authority.

The commercial goal is to help Sales and the Prospect reach an informed
conversion decision. The operational goal is to accept, process, and release
results for only the samples and analyses explicitly approved for one bounded
trial.

## Confirmed Product Decisions

- Sales representatives live in HubSpot and manage companies, contacts,
  opportunities, relationship activity, and the commercial pipeline there.
- A Sales representative requests a Trial Project from the HubSpot Deal.
- Expressed interest alone does not create a Portal organization or Trial
  Project. The request must pass the approved review process.
- The organization remains a `Prospect` throughout the trial.
- A Prospect cannot create a Trial Project or place an order.
- A Prospect organization administrator may submit samples only within an
  approved, accepted, active Trial Project and only while its submission window
  and approved scope allow it.
- Trial sample submission does not grant a general ordering, quoting, assembly,
  reagent-purchasing, or repeat-trial capability.
- Every Trial Project is no-charge, well-defined, and closed-ended.
- Commercial and scientific/operations approval are both required before a
  Trial Project becomes available to the Prospect.
- The initial workflow uses one standardized Trial Package. Bespoke Trial
  Packages are outside the initial release unless separately approved.
- The approved scope is frozen. Material changes require an explicit,
  versioned amendment and reapproval rather than silently rewriting the trial.
- Trial samples and results are confidential, organization-scoped operational
  data. They are not Phaeno-owned curated Prospect sample packages and never
  enter the curated Prospect catalog automatically.
- Conversion is an explicit Phaeno action after or during the commercial
  decision. It preserves the organization, memberships, Trial Projects,
  samples, results, and audit history.
- A completed Trial Project never becomes a paid order. Future paid work begins
  through a new Customer or Partner workflow after conversion.

## Initial Standard Trial Package

- Sample type: extracted RNA only.
- Maximum sample allowance: five samples.
- Commercial approver: Chief Business Officer.
- Scientific/operations approver: Chief Operating Officer.
- Turnaround: per Phaeno schedule. Trial work is slotted around paid commercial
  work and has no fixed turnaround-time commitment.
- Deliverables: the standard commercial result package, initially including
  FASTQ, FASTA, and BAM files. Any additional deliverables remain TBD.
- Result access: three months by default, beginning when the complete standard
  result package is released to the Prospect. The duration may be explicitly
  overridden during Trial Project approval. Partial or per-sample releases do
  not start the access clock.
- Shipping and submission details: TBD.
- Sample replacement rules: TBD.
- Scientific inputs, analysis definitions, acceptance rules, and related
  production configuration: TBD.
- Scope exclusion: reagent and data-assembly trials are not part of this
  workflow. Those require Customer status and are handled through an offline
  process.

## System Ownership

### HubSpot

HubSpot owns:

- company and relationship contacts
- sales opportunity and pipeline stage
- sales representative and account owner
- meeting, email, note, task, and follow-up history
- the Sales-originated Trial Project request and commercial justification
- expected conversion type and commercial value
- conversion decision, close reason, and commercial outcome

### Phaeno Portal

The Portal owns:

- Prospect organization, invitations, memberships, and tenant access
- Trial Project review, approval, scope, amendments, and lifecycle
- Prospect acceptance of the no-charge trial terms
- sample submission, shipping facts, receipt, accessioning, and custody
- laboratory and data-processing progress presented to the Prospect
- trial deliverables, result release, and result access
- operational audit, concurrency, security, and retention behavior

### QuickBooks Online

- A true no-charge Trial Project has no quote, invoice, payment gate, or
  QuickBooks transaction by default.
- The Trial Project records an estimated retail value and anticipated internal
  cost for approval, budgeting, and conversion analysis without manufacturing
  a zero-dollar order.
- If Finance later requires accounting-system representation of promotional
  work, that is a separate product and integration decision.

## Users And Responsibilities

### Sales Representative

- qualifies the Prospect in HubSpot
- requests the Trial Project from the associated opportunity
- explains the commercial objective and expected conversion value
- proposes, but does not approve, the scientific scope
- follows the read-only trial status returned to HubSpot
- records the final won, lost, extended, or abandoned commercial outcome

### Commercial Approver

- is the Chief Business Officer for the initial Trial Package
- confirms the Prospect is sufficiently qualified
- evaluates the expected value against the no-charge cost
- approves, declines, or returns the request for clarification
- approves any material amendment that increases cost or duration

### Scientific/Operations Approver

- is the Chief Operating Officer for the initial Trial Package
- confirms sample types, acceptance requirements, analyses, capacity, and
  deliverables are feasible
- finalizes the approved scientific scope and submission instructions
- approves, declines, or returns the request for clarification
- approves material scientific amendments and replacement exceptions

### Phaeno Operator

- receives and accessions samples
- records custody and operational status
- performs or coordinates the approved work
- uploads, reviews, and releases the defined results
- closes incomplete, expired, rejected, or completed work with an appropriate
  Prospect-safe reason

### Prospect Organization Administrator

- accepts the Trial Project terms
- submits eligible samples and required metadata within the approved window
- records permitted shipping facts
- tracks the project and samples
- views and downloads released results

### Prospect Organization Member

- views the Trial Project, sample progress, and released results for the
  selected organization
- cannot submit samples, amend the project, or receive ordering authority in
  the initial release

## HubSpot Request

The Sales request contains at least:

- HubSpot Company and Deal identifiers
- Prospect company and primary contact
- Sales representative and account owner
- intended relationship: Customer, Partner, or undetermined
- trial objective and measurable success criteria
- requested sample count, up to the five-sample maximum
- confirmation that the submitted material will be extracted RNA
- requested analyses within the approved scientific scope
- requested submission timing and known scheduling constraints
- expected commercial value and commercial justification
- known shipping, handling, safety, or timing constraints

HubSpot request receipt must be idempotent. A retried webhook or manual retry must
not create a second Portal organization or Trial Project for the same approved
request.

## HubSpot Pipeline Behavior

- The HubSpot Deal stage represents commercial progress; the Portal Trial
  Project status represents scientific and operational progress.
- Recommended commercial progression is `Qualified` -> `Evaluation proposed`
  -> `Trial requested` -> `Trial active` -> `Conversion decision` -> `Closed
  won` or `Closed lost`.
- Moving an opportunity to `Trial requested` submits or enables the request but
  does not itself approve the Trial Project or authorize samples.
- The Portal publishes its approval and operational status into separate
  read-only HubSpot fields so Sales can follow progress without editing scientific
  state.
- Sales remains responsible for the opportunity stage and close decision. The
  Portal remains authoritative for approval, submission eligibility, samples,
  results, and completion.

## Approval Workflow

1. Sales submits `Trial requested` from the HubSpot Deal.
2. The Portal records a pending request without granting Prospect access.
3. Commercial review approves, declines, or requests clarification.
4. Scientific/operations review finalizes and approves, declines, or requests
   clarification.
5. Approval applies the default three-month result-access duration or records
   an explicit override, then creates the frozen Trial Project scope. If needed,
   an authorized Phaeno user creates the Prospect organization and invites its
   primary contact.
6. The Prospect administrator reviews and explicitly accepts the no-charge
   trial terms.
7. Acceptance opens sample submission until the approved limit or deadline is
   reached.

A declined request returns a concise HubSpot-safe reason. Internal notes and
scientific review details remain in the Portal.

## Frozen Trial Scope

Approval snapshots:

- Trial Project number, name, and objective
- Prospect organization and HubSpot Deal reference
- Sales owner and both approvers
- approved maximum of five samples
- extracted RNA as the permitted sample type and the required metadata
- permitted analyses and applicable analysis-definition versions
- submission instructions and shipping responsibilities
- submission-open and submission-close dates
- current estimated schedule, explicitly identified as non-binding
- the standard commercial deliverables, including FASTQ, FASTA, and BAM files
- the approved result-access duration, whether the three-month default or an
  explicit approval-time override, beginning when the complete standard result
  package is released
- the access-duration override reason when the default is not used
- estimated retail value and anticipated internal cost
- success criteria
- replacement and rework rules
- Prospect-visible terms and restrictions

Reaching the sample limit closes further submission even when the calendar
window remains open. Reaching the submission deadline closes further
submission even when the sample allowance is unused. Processing and result
delivery may continue after submission closes.

Trial work is scheduled around paid commercial work. Schedule estimates and
updates are operational communications rather than a guaranteed turnaround-time
service level. A schedule-only update does not require a scope amendment.

The default result-access duration is configuration for future approvals.
Changing that default never rewrites an already-approved Trial Project. After
approval, changing the snapshotted duration requires a versioned amendment and
reapproval.

An amendment preserves the prior approved version, identifies the changed
facts and reason, and requires the applicable commercial and scientific
reapprovals. It never changes already-recorded sample or result history.

## Trial Project Lifecycle

The primary lifecycle is:

`Requested` -> `Under review` -> `Approved` -> `Awaiting Prospect acceptance`
-> `Awaiting samples` -> `In progress` -> `Results available` -> `Completed`

Terminal alternatives are:

- `Declined`
- `Expired`
- `Cancelled`
- `Closed incomplete`

Rules:

- `Approved` requires both required approvals and a complete frozen scope.
- Prospect acceptance is explicit and is not quote acceptance or order
  placement.
- Submission is allowed only after Prospect acceptance and while the project
  remains open for submissions.
- The first accepted sample moves an awaiting project into operational work.
- Results may become available per sample while other approved samples remain
  in progress.
- Partial or per-sample result availability does not start the access clock,
  whether the project uses the three-month default or an approved override. The
  clock starts only when the complete standard result package is released to
  the Prospect.
- `Completed` requires every submitted sample to reach a terminal outcome and
  every promised deliverable to be released or explicitly closed with a
  Prospect-safe explanation.
- Expiration or cancellation blocks new submission immediately without erasing
  received samples, custody records, results, or audit history.
- A new trial after closure requires a new Sales request and approval. Reopening
  a completed or declined Trial Project is not a normal workflow.

## Sample And Result Workflow

- Sample metadata, safety restrictions, receipt, accessioning, custody,
  independent sample statuses, result provenance, file scanning, and release
  use the same scientific and security standards as Customer laboratory work.
- The implementation may share operational services and UI components with
  Customer lab-service workflows and must use the existing Lab Operations
  provider for approved execution, but Trial Project records remain a distinct
  aggregate and do not enter the commercial order state machine.
- Each submitted sample belongs to exactly one Trial Project and one Prospect
  organization.
- The backend validates the approved sample type, metadata, analysis scope,
  sample allowance, submission window, organization, membership, and project
  state at submission.
- A replacement requires Phaeno authorization and recorded lineage. It does not
  silently increase the sample allowance.
- Result release has no invoice or payment gate. Scientific readiness,
  authorization, file safety, and approved deliverable scope still apply.
- Trial data remains tenant-isolated after conversion because the same
  organization identity is preserved.

## Authorization Contract

Trial submission requires all of the following:

- authenticated, globally active user
- active membership in the active selected Prospect organization
- organization-administrator capability in the initial release
- Trial Project owned by that selected organization
- Trial Project approved and accepted
- submission window open
- approved sample allowance remaining
- submitted sample and analyses within the frozen scope

This produces a project-specific `CanSubmitTrialSamples` outcome. It never
produces `CanOrder`, `CanPlaceOrder`, or another organization-wide commercial
capability.

All active members of the selected Prospect organization may view the Trial
Project, its tenant-safe progress, and released results in the initial release.
Phaeno cross-organization work occurs only through authorized platform views.

## Portal Experience

### Phaeno

- A Trial Requests list supports review queues, status, Sales owner, Prospect,
  requested scope, age, and due date.
- Selecting a request opens a dedicated, view-first Trial Project workspace.
- Commercial and scientific decisions are explicit bounded actions with
  confirmations, reasons, and optimistic concurrency.
- Operational users receive queues for samples awaiting receipt, accessioning,
  processing, review, result release, and overdue action.
- Internal notes are visually and contractually separate from Prospect-visible
  reasons.

### Prospect

- A Trial Projects list shows only projects for the selected organization.
- Selecting a Trial Project opens a dedicated, view-first workspace containing
  scope, status, remaining allowance, deadlines, instructions, samples,
  timeline, and results.
- The primary submit-sample action is available only when the backend-derived
  project-specific authorization allows it.
- The interface explains why submission is unavailable when the project is
  awaiting approval or acceptance, full, expired, cancelled, or completed.
- Prospect navigation does not expose Customer ordering, Partner reagent,
  Partner assembly, quote, invoice, or payment surfaces.

## HubSpot Synchronization

The Portal may publish only approved commercial summaries:

- request received
- approved, declined, returned, cancelled, or expired
- Prospect organization and Trial Project identifiers plus internal deep links
- Prospect invitation and acceptance status
- sample-submission milestone or aggregate submitted count
- processing started
- results delivered
- completed or closed incomplete
- conversion recommended, converted, or closed without conversion

Do not send sample identifiers, raw files, scientific results, QC details,
custody details, internal notes, or other sensitive operational content to the
HubSpot.

Once a Trial Project exists, a HubSpot outage or delayed synchronization must not
block Portal sample receipt, processing, result release, or closure. Failed HubSpot
status publication is visible and retryable.

## Conversion And Closure

- Trial completion does not automatically convert the organization.
- Sales records the commercial decision in HubSpot.
- An authorized Phaeno user explicitly converts the same Prospect organization
  to Customer or Partner when the commercial decision warrants it.
- Conversion preserves Trial Projects, samples, results, memberships, stable
  identifiers, curated-data grants, and audit history.
- Normal Customer or Partner capabilities begin only after conversion.
- The first paid transaction is a new Customer or Partner record. It does not
  mutate or replace the Trial Project.
- A lost, abandoned, or expired opportunity closes the commercial evaluation.
  Trial result access and organization deactivation follow the approved
  retention and access terms rather than deleting operational history.

## Audit, Reliability, And Security

Audit at least:

- HubSpot request receipt and idempotency identity
- commercial and scientific decisions, actors, reasons, and timestamps
- Trial Project creation, Prospect acceptance, and frozen scope version
- every amendment and reapproval
- sample submission, receipt, accessioning, replacement, rejection, and status
  transition
- result upload, review, release, and download
- submission closure, expiration, cancellation, completion, and incomplete
  closure
- HubSpot publication attempts and retries
- organization conversion or deactivation

Use optimistic concurrency on mutable records, durable retry for HubSpot
publication, managed-file scanning and authorization, tenant-scoped reads and
writes, and append-only status history for consequential transitions. Trial
data must never be exposed through the Phaeno-owned curated Prospect catalog.

## Success Measures

- time from Sales request to approval decision
- percentage of approved trials accepted by Prospects
- percentage of approved sample allowance actually submitted
- time from sample receipt to result delivery
- percentage completed within the currently communicated schedule estimate
- trial-to-Customer and trial-to-Partner conversion rates
- conversion time after result delivery
- estimated retail value and internal cost per converted organization
- frequency and reason for declined, expired, amended, and repeated requests
- number of scope, tenant-isolation, or unauthorized-submission violations,
  with a target of zero

## Implementation Direction

1. Resolve the open product decisions below and approve implementation scope.
2. Add the Trial Project domain, lifecycle, frozen scope, approvals, samples,
   results, audit, and organization-scoped authorization.
3. Add Phaeno request-review and operational workspaces.
4. Add Prospect Trial Project list/detail, acceptance, sample submission,
   progress, and result access.
5. Validate the workflow with a manual HubSpot handoff and Portal deep links.
6. Add the HubSpot adapter, idempotent request intake, status publication,
   retry, and reconciliation only after the manual workflow is proven.
7. Complete production scientific configuration, storage, scanning,
   notification, operational runbooks, and full authenticated verification.

## Verification Plan

### Backend

- approval requires commercial and scientific decisions
- only one Trial Project is created for one HubSpot request identity
- Prospect organization admins can submit only within an approved, accepted,
  open Trial Project
- Prospect members can view but cannot submit in the initial release
- sample limits, deadlines, types, analyses, and amendment versions are enforced
- Prospects retain no normal ordering capability
- cross-tenant reads, writes, files, and results are denied
- replacement and rework cannot silently exceed scope
- result release does not use payment gates
- HubSpot outages do not block operational transitions
- conversion preserves the complete trial history and enables only the target
  organization-kind capabilities

### Frontend

- Phaeno request and project lists use the standard list/detail flow
- review, approval, decline, amendment, and closure actions communicate effects
  and restore focus correctly
- Prospect submission availability and unavailable reasons match backend state
- limits, deadlines, instructions, sample status, and released results remain
  clear across desktop, tablet, narrow, keyboard, and screen-reader use
- internal notes and HubSpot context never appear in Prospect-facing output

### End To End

- HubSpot-originated request through both approvals, Prospect invitation and
  acceptance, bounded sample submission, receipt, processing, result release,
  completion, and conversion
- decline, expiration, cancellation, amendment, replacement, HubSpot retry, and
  closed-without-conversion journeys
- Prospect ordering denial remains intact throughout the trial
- two-tenant isolation for project metadata, samples, files, and results

Do not run tests or execute this verification plan until explicitly requested.

## Open Product Decisions

- Extracted-RNA shipping, packing, labeling, temperature, carrier, and
  submission instructions.
- Required scientific inputs, approved analyses and versions, sample-acceptance
  rules, prohibited-data rules, result provenance, and production file policy.
- The submission window and how its dates are selected for each Trial Project.
- Additional standard commercial deliverables beyond FASTQ, FASTA, and BAM.
- Result-access behavior after conversion and when a non-converting Prospect
  organization is deactivated after its approved access period.
- Whether Phaeno-caused processing failure permits a replacement outside the
  original allowance or uses an explicit approved replacement slot.
- Whether Finance requires no-charge promotional activity to appear in
  QuickBooks or another accounting report despite having no invoice.

## Definition Of Ready For Implementation

- the standardized extracted-RNA package and five-sample maximum remain
  approved
- scientific inputs, approved analyses, shipping details, submission window,
  additional deliverables, and replacement rules are approved
- the Chief Business Officer and Chief Operating Officer approval workflow is
  operationally assigned, including delegated coverage when either is
  unavailable
- Prospect-visible terms, sample restrictions, prohibited-data rules, and
  post-access organization deactivation behavior are approved
- HubSpot request fields, pipeline stage behavior, and manual handoff are approved
- conversion success criteria and closed-without-conversion behavior are
  approved
- production storage, scanner, scientific definitions, notification, and
  operational ownership are explicit
- backend, frontend, E2E, migration, and rollout scope is explicitly requested

## Deferred Scope

- Prospect-created or self-approved trials
- recurring, open-ended, subscription, or automatically renewed trials
- automatic organization conversion based on project status
- turning a Trial Project into a paid order
- general Prospect ordering or quote capability
- bespoke or custom Trial Packages
- reagent or data-assembly Trial Projects; these require Customer status and
  remain an offline process
- partner-managed customer trials
- bulk campaign-based Trial Project creation
- HubSpot storage of scientific data or result content
- reuse of Prospect trial samples or results as Phaeno-owned curated data
  without a separately approved ownership, consent, and de-identification
  workflow
