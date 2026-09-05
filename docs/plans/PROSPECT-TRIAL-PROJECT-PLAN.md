# Prospect Trial Project Plan

The authorized 2026-09-05 [review gap closure](REVIEW-GAP-CLOSURE-2026-09-05.md)
extends the existing Trial workflow with batch sample entry, visible sample-type
requirements, current-scope conflict recovery, download availability and
retention feedback, unsaved-work protection, and contextual CRM request creation.
The existing batch endpoint and scientific authorization boundaries are retained.
Verification and delivery boundaries are recorded in that review plan.

Keep this file updated as Prospect trial-project requirements are supplied and
decisions are made.

Implementation was requested during Portal closeout. On 2026-09-05 the Product
Owner confirmed that initial Trials use the existing PSeq analyses and acceptance
rules. The execution scope below supersedes the earlier planning-only boundary.

## Status

- Initial application integration implemented and verified locally (2026-09-05).
  Trials use existing versioned PSeq analysis definitions and Lab workflow
  acceptance rules. Approval freezes those versions. Production rollout awaits
  new migration approval; activation gates remain tracked separately.
- Authorized closeout includes implementation, tests and audience-specific user
  documentation. Existing storage/deletion holds and physical/provider acceptance
  gates remain in force. Review any new migration before requesting shared-database
  approval; the preceding release approved only its seven reviewed migrations.

- Product direction was approved on 2026-07-15 for planning purposes.
- A Trial Project is a no-charge, closed-ended project through which a Prospect
  may submit samples for Phaeno processing before deciding whether to become a
  Customer or Partner.
- A Trial Project is not an order, quote, invoice, curated demonstration-data
  grant, or general Prospect capability.
- The Trial parent workflow is now implemented locally: first-party CRM intake,
  versioned PSeq scope, independent approval, Prospect acceptance, coded samples,
  replacements, Lab authorization, shared shipments, governed result release,
  retention and explicit commercial closeout. Prospect order denial remains.
- Trial execution calls the existing Lab provider with the frozen PSeq workflow
  version; operators use existing Lab roles, scientific review and shipping paths.
  Parent holds and acceptance are enforced across those shared write paths.
- Product direction was clarified on 2026-08-18: there is no universal sample
  cap for a Trial Project. Each project records an explicitly approved sample
  allowance based on its scope and anticipated cost. Approval freezes that
  allowance, and any later change requires a versioned amendment and reapproval.
- Product direction was clarified on 2026-08-18: there is no universal
  submission-window duration. Phaeno approves and freezes project-specific
  submission-open and submission-close dates. Prospect acceptance is also
  required before submission, and extending either date requires a versioned
  amendment and reapproval.
- Product direction was clarified on 2026-08-18: every replacement requires
  explicit Phaeno approval and recorded lineage to the original sample. A
  Phaeno-caused processing failure restores one replacement slot. A problem
  with the Prospect-supplied sample does not restore a slot automatically;
  Phaeno may approve an exception. Replacement history never silently changes
  the project's approved sample allowance.
- Product direction was clarified on 2026-08-18: released customer deliverable
  packages use a configurable global retention default, initially 30 exact
  24-hour days from complete-package release, a warning 5 exact 24-hour days
  before that deadline when any file remains undownloaded, and a further 5-day
  grace period for the entire package when any file is still undownloaded at
  the standard deadline. A Customer, Partner, or Prospect organization may have
  Phaeno-managed overrides. Release snapshots the effective values and dates;
  conversion does not reset or extend them. There is no separate project-
  specific override.
- Product direction was clarified on 2026-08-18: deletion of a non-converting
  Prospect's released Trial package does not automatically deactivate the
  organization. After the commercial opportunity is closed, an authorized
  Phaeno user may explicitly deactivate it only after confirming there is no
  other active Trial Project, grant, or commercial relationship. The decision
  and reason are audited.
- Product direction was clarified on 2026-08-18: FASTQ, FASTA, and BAM are the
  current configurable default deliverables, not a permanent hard-coded set.
  Approval freezes the exact selected deliverables and their configuration
  versions for each Trial Project. Configuration changes affect only future
  approvals; changing an approved project's deliverables requires a versioned
  amendment and reapproval.
- Product direction was clarified on 2026-08-18: a no-charge Trial Project does
  not create a QuickBooks order, estimate, invoice, payment, or zero-dollar
  transaction. POMS retains estimated retail value and anticipated internal cost
  as internal Trial Project reporting facts. Any future QuickBooks representation
  requires a separate, explicitly Finance-approved product and integration
  change.
- Product direction was clarified on 2026-08-18: the Chief Business Officer and
  Chief Operating Officer remain the default commercial and scientific/
  operations approvers. Each may designate explicitly authorized Phaeno
  delegates for that approval domain. POMS records the actual approver, domain,
  decision, reason, timestamp, and primary-versus-delegate authority; both
  approval decisions remain required.
- Product direction was clarified on 2026-08-18: the two affirmative approvals
  for a Trial Project or amendment must come from two different people. A user
  authorized in both domains cannot satisfy both decisions for the same scope
  version; an authorized delegate must provide one of them.
- Product direction was clarified on 2026-08-18: every Trial Project is Research
  Use Only (RUO), and no protected health information (PHI) is permitted or
  expected. Prospect-visible terms and result-release artifacts state `For
  Research Use Only. Not for use in diagnostic procedures.` The Prospect uses
  non-PHI sample identifiers and retains any identity mapping outside POMS.
- Product direction was clarified on 2026-08-18 and superseded only in its
  external-system assumption on 2026-08-26: the first-party CRM-to-POMS handoff
  carries only commercial request context: the Opportunity, Company, primary
  Contact, Phaeno owner, business objective, commercial justification, and
  intended conversion relationship. Phaeno staff define the proposed sample
  allowance, submission window, analyses, deliverables, and other scientific
  scope in the Trial Project workflow. CRM receives only relationship-safe
  milestones and a POMS deep link.
- Product direction was clarified on 2026-08-18: Trial Project execution and
  commercial conversion are separate outcomes. POMS records `Completed` only
  after the complete approved result package is released. Otherwise POMS uses
  `Closed incomplete` with a required reason. First-party CRM records
  `Converted to Customer`, `Converted to Partner`, or `Closed without
  conversion` with a required reason.
  It may instead use nonterminal `Follow-up scheduled` with a required owner and
  date. No CRM outcome converts the organization automatically.
- Product direction was clarified on 2026-08-18: the default residual-material
  policy is to retain remaining extracted RNA for 30 calendar days after
  terminal POMS closure and then destroy it. The retention duration is
  configurable and frozen per Trial Project. Return is available only when
  approved before the first sample shipment, with return-shipping responsibility
  frozen in the terms. Trial material is never reused without separate written
  authorization.
- Trial partial releases reuse governed clean artifacts and do not start the
  complete-package clock. Complete release freezes the shared policy and closes
  the Trial. Existing warning/grace, byte cleanup, receipts and reissue mechanisms
  include Trial packages. Production storage and processing switches remain held.
- First-party CRM is implemented; HubSpot remains a deferred optional adapter.
- The execution authorization at the top supersedes the historical planning-only
  scope. New shared-database migration approval is still a release prerequisite.

## Related Documents

- `CRM-PLAN.md` owns first-party CRM, and
  `STANDALONE-COMMERCIAL-LIFECYCLE-PLAN.md` owns the CRM/Portal boundary.
  `../crm-integration-strategy.md` and
  `HUBSPOT-PORTAL-LIFECYCLE-PLAN.md` retain the deferred external-adapter
  boundary and historical design.
- `AUTH-USER-SYSTEM-PLAN.md` owns organization, membership, invitation, and
  conversion authorization.
- `ORDER-MANAGEMENT-PLAN.md` owns Customer and Partner commercial ordering and
  preserves the rule that a Trial Project is not an order.
- `FILE-MANAGEMENT-PLAN.md` owns the released customer deliverable global
  defaults, organization overrides, notification, grace, byte-deletion, and
  retained-metadata contract used by Trial, Customer, and Partner packages.
- `LAB-OPERATIONS-PLAN.md` and `LAB-OPERATIONS-CONTRACT.md` own the implemented
  provider boundary used by approved Trial Projects for laboratory execution.
- `SAMPLE-SHIPPING-AND-INTAKE-PLAN.md` owns the shared versioned ship-to,
  sample-type, detailed-instruction, return-kit, registered-tube crosswalk,
  printable packet, pre-receipt barcode, and scan-first intake capability used
  by an accepted Trial Project and a future Customer promotional no-charge
  order. It does not turn a Trial Project into an order.
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

- Sales representatives use the first-party POMS CRM to manage Companies,
  Contacts, Opportunities, relationship activity, and commercial pipelines.
- A Sales representative requests a Trial Project from the CRM Opportunity.
- The CRM request contains commercial context only. Scientific scope is
  proposed, reviewed, approved, and amended only in POMS.
- Expressed interest alone does not create a Portal organization or Trial
  Project. The request must pass the approved review process.
- The organization remains a `Prospect` throughout the trial.
- A Prospect cannot create a Trial Project or place an order.
- A Prospect organization administrator may submit samples only within an
  approved, accepted, active Trial Project and only while its submission window
  and approved scope allow it.
- There is no universal Trial Project sample maximum. Each approved project
  carries its own frozen sample allowance, which may be changed only through a
  versioned amendment and reapproval.
- There is no universal Trial Project submission-window duration. Each approved
  project carries its own frozen opening and closing dates. Submission requires
  both Prospect acceptance and the current date to fall within that window;
  extensions require a versioned amendment and reapproval.
- Every replacement requires explicit Phaeno approval and recorded lineage to
  the original sample. A Phaeno-caused processing failure restores one
  replacement slot. A Prospect-supplied sample problem does not restore a slot
  automatically; Phaeno decides whether to approve an exception. The approved
  sample allowance remains frozen and replacement history cannot silently
  increase it.
- Trial sample submission does not grant a general ordering, quoting, assembly,
  reagent-purchasing, or repeat-trial capability.
- Every Trial Project is no-charge, well-defined, and closed-ended.
- Every Trial Project is RUO and is not offered or represented for diagnosis,
  treatment, patient management, or another clinical use. PHI and direct patient
  identifiers are prohibited throughout the workflow.
- A Trial Project has no QuickBooks transaction or payment gate. Its estimated
  retail value and anticipated internal cost remain internal POMS reporting
  facts rather than a zero-dollar order or other accounting document.
- Commercial and scientific/operations approval are both required before a
  Trial Project becomes available to the Prospect.
- The Chief Business Officer and Chief Operating Officer are the default
  approvers for their respective domains. Each may designate explicitly
  authorized Phaeno delegates. Delegation is domain-specific and does not merge
  or remove the two required approval decisions.
- Commercial and scientific/operations approval for the same Trial Project
  scope version must be given by two different people, including when one user
  holds both approval authorities.
- The initial workflow uses one standardized Trial Package. Bespoke Trial
  Packages are outside the initial release unless separately approved.
- The approved scope is frozen. Material changes require an explicit,
  versioned amendment and reapproval rather than silently rewriting the trial.
- Authorized Phaeno configuration owns the eligible Trial Project deliverable
  catalog and its default selection. The current default selects FASTQ, FASTA,
  and BAM. Each approval snapshots the exact selected deliverables and their
  configuration versions; later configuration changes affect only future
  approvals.
- Trial samples and results are confidential, organization-scoped operational
  data. They are not Phaeno-owned curated Prospect sample packages and never
  enter the curated Prospect catalog automatically.
- Conversion is an explicit Phaeno action after or during the commercial
  decision. It preserves the organization, memberships, Trial Projects,
  samples, results, and audit history, but it does not reset or extend the
  Trial Project result package's snapshotted standard or final deletion
  deadlines.
- Scientific/operational completion and the CRM commercial outcome are
  independent. A completed Trial Project may still close without conversion or
  remain in scheduled commercial follow-up.
- Trial package deletion and organization deactivation are separate events.
  Package-byte deletion does not automatically deactivate a non-converting
  Prospect organization. Deactivation requires commercial closeout,
  confirmation that no other Trial Project, grant, or relationship remains
  active, and an explicit audited Phaeno action.
- A completed Trial Project never becomes a paid order. Future paid work begins
  through a new Customer or Partner workflow after conversion.

## Initial Standard Trial Package

- Sample type: extracted RNA only.
- Intended use: Research Use Only. Not for use in diagnostic procedures.
- Data boundary: no PHI. The Prospect supplies only non-PHI sample identifiers
  and retains any person-to-sample mapping in its own records outside POMS.
- Sample allowance: explicitly approved and frozen per Trial Project; there is
  no universal maximum.
- Commercial approver: Chief Business Officer by default, or an explicitly
  authorized commercial-approval delegate.
- Scientific/operations approver: Chief Operating Officer by default, or an
  explicitly authorized scientific/operations-approval delegate.
- Turnaround: per Phaeno schedule. Trial work is slotted around paid commercial
  work and has no fixed turnaround-time commitment.
- Deliverables: FASTQ, FASTA, and BAM are the current configurable default
  selection. Authorized Phaeno configuration may add, retire, or change the
  default selection for future approvals. Each Trial Project freezes its exact
  selected deliverables and configuration versions at approval. Adding or
  removing a deliverable afterward requires a versioned amendment and
  reapproval.
- Released result files: the complete standard result package resolves and
  snapshots the global defaults plus any active Prospect-organization override
  when it is released. Initially, the global standard
  deletion deadline is 30 exact 24-hour days after release, the undownloaded-
  file warning is due 5 exact 24-hour days before that deadline, and a package
  with any file still undownloaded at the standard deadline receives a further
  5-day grace period. Partial or per-sample result availability does not
  start this package clock. There is no project-specific override, and
  conversion does not reset or extend either deletion deadline.
- Shipping and submission behavior follows
  `SAMPLE-SHIPPING-AND-INTAKE-PLAN.md`: one accepted Trial Project may produce
  multiple versioned shipment packets when destinations or sample-type handling
  requirements differ. The first real extracted-RNA destination, packing,
  temperature, carrier, timing, and exception instructions remain activation
  content to approve.
- Sample replacement: Phaeno approval and lineage to the original sample are
  required. A Phaeno-caused processing failure restores one replacement slot;
  a Prospect-supplied sample problem requires an explicit Phaeno exception to
  restore a slot. The approved sample allowance itself does not silently
  increase.
- Residual material: remaining extracted RNA is retained for 30 calendar days
  after terminal POMS closure by default and then destroyed. The approved
  project may freeze a different retention duration or pre-shipment return
  disposition. A return disposition identifies who pays return shipping. No
  material is reused without separate written authorization.
- Scientific inputs, analysis definitions and acceptance rules: use the existing
  PSeq definitions and Lab workflow versions (confirmed 2026-09-05). Approval
  freezes the selected active versions; production configuration must be ready
  before authorizing execution.
- Scope exclusion: reagent and data-assembly trials are not part of this
  workflow. Those require Customer status and are handled through an offline
  process.

## RUO And No-PHI Contract

- The customer-facing statement is `For Research Use Only. Not for use in
  diagnostic procedures.` It appears in Trial Project terms and acceptance,
  project detail, result-release notices, and the downloadable result package.
- Trial Project outputs must not be represented or used by Phaeno for diagnosis,
  treatment selection, patient management, or reporting into a patient's
  medical record.
- POMS does not request, accept, or need PHI. Patient names, medical-record
  numbers, dates of birth, direct patient identifiers, and unnecessary personal
  or health information are prohibited in every field, filename, upload, tube
  label, manifest, note, notification, audit detail, and CRM record.
- The Prospect creates one non-PHI sample identifier per submitted sample and
  owns the scientific meaning and any person-to-sample crosswalk exclusively in
  its own records. Phaeno preserves only the non-PHI sample-to-tube crosswalk
  required for shipment, intake, processing, and result return.
- Before accepting the Trial Project and again before confirming a shipment,
  the Prospect administrator affirms the current RUO and no-PHI terms. POMS
  records the terms version, actor, and timestamp.
- Suspected prohibited data blocks submission, receipt progression, processing,
  and release for the affected material or file. POMS places it in a restricted
  hold/quarantine state and records only a safe incident category, status,
  actor, and timestamps without copying the suspected PHI into logs, audit
  diffs, notifications, or CRM.
- Work resumes only after authorized Phaeno review and approved correction,
  replacement, return, or other disposition. The final incident-response and
  physical-material disposition procedure remains an activation runbook owned
  by the appropriate Phaeno operations and compliance functions.
- Final production wording and placement require regulatory/legal review. The
  current statement follows the FDA's
  [In Vitro Diagnostic Device Labeling Requirements](https://www.fda.gov/medical-devices/device-labeling/in-vitro-diagnostic-device-labeling-requirements)
  reference for research-use labeling.

## Residual Material Retention And Disposition

- Authorized Phaeno configuration supplies a 30-calendar-day default residual-
  material retention period. Configuration changes affect only future Trial
  Project approvals.
- Approval freezes the exact retention duration and final disposition for the
  Trial Project. The standard disposition is `Destroy`.
- The retention clock begins at terminal POMS operational closure: `Completed`
  or `Closed incomplete`. Project closure does not itself assert that physical
  material has already been destroyed.
- A `Return` disposition is permitted only when explicitly approved before the
  first sample shipment. The frozen terms identify the return destination,
  handling requirements, and whether Phaeno or the Prospect pays return
  shipping.
- Changing an approved retention duration or disposition before the first
  sample shipment requires a versioned amendment and reapproval. Return cannot
  be added through the normal workflow after that shipment is confirmed.
- At the retain-until date, POMS creates or exposes due work but does not mark
  material destroyed automatically. An authorized operator records `Exhausted`,
  `Returned`, or `Destroyed`, together with the actual date, method, reason,
  actor, and any return tracking reference.
- A prohibited-data hold or other controlled preservation requirement suspends
  the ordinary disposition schedule until an authorized incident disposition
  is recorded.
- Trial material may not be reused for Phaeno research, training, validation,
  another project, or another organization without separate written
  authorization outside the Trial Project terms.

## System Ownership

### First-Party CRM

The POMS CRM owns:

- company and relationship contacts
- sales opportunity and pipeline stage
- sales representative and account owner
- meeting, email, note, task, and follow-up history
- the Sales-originated Trial Project request, business objective, and commercial
  justification
- expected conversion type and commercial value
- conversion decision, close reason, and commercial outcome

### Phaeno Portal

The Portal owns:

- Prospect organization, invitations, memberships, and tenant access
- Trial Project review, approval, scope, amendments, and lifecycle
- proposed and approved sample allowance, submission window, analyses,
  deliverables, and other scientific or operational scope
- Prospect acceptance of the no-charge trial terms
- sample submission, shipping facts, receipt, accessioning, and custody
- laboratory and data-processing progress presented to the Prospect
- trial deliverables, result release, download state, retention, and deletion
- operational audit, concurrency, security, and retention behavior

### QuickBooks Online

- A true no-charge Trial Project creates no QuickBooks order, estimate, invoice,
  payment, zero-dollar transaction, or payment gate.
- The Trial Project records an estimated retail value and anticipated internal
  cost in POMS for internal approval, Finance reporting, budgeting, and
  conversion analysis. These values are not accounting documents and are not
  exposed to the Prospect through the Trial Project workflow.
- Any future requirement to represent Trial Projects in QuickBooks is a
  separate product and integration change requiring explicit Finance approval;
  it does not retroactively manufacture transactions for completed projects.

## Users And Responsibilities

### Sales Representative

- qualifies the Prospect in first-party CRM
- requests the Trial Project from the associated opportunity
- explains the commercial objective and expected conversion value
- supplies relationship-safe business context but does not define or transmit
  the Trial Project's scientific scope in CRM
- follows the read-only trial status linked into CRM
- records `Converted to Customer` or `Converted to Partner` as the final outcome
- records `Closed without conversion` only with a required reason
- may instead keep the decision nonterminal as `Follow-up scheduled` with a
  required owner and date

### Commercial Approver

- is the Chief Business Officer by default or an explicitly authorized Phaeno
  delegate acting only within the commercial approval domain
- confirms the Prospect is sufficiently qualified
- evaluates the expected value against the no-charge cost
- approves, declines, or returns the request for clarification
- approves any material amendment that increases cost or duration

### Scientific/Operations Approver

- is the Chief Operating Officer by default or an explicitly authorized Phaeno
  delegate acting only within the scientific/operations approval domain
- confirms sample types, acceptance requirements, analyses, capacity, and
  deliverables are feasible
- finalizes the approved scientific scope and submission instructions
- approves, declines, or returns the request for clarification
- approves material scientific amendments and replacement exceptions

### Approval Authority And Delegation

- Each default approver may explicitly designate and revoke Phaeno delegates
  for that approver's domain.
- A delegation records its domain, delegate, designating authority, effective
  and revoked timestamps, and reason. It grants no authority in the other
  approval domain or in unrelated POMS workflows.
- Every approval records the actual acting user, approval domain, decision,
  reason, timestamp, and whether the user acted as the primary approver or a
  delegate. A delegated decision is never attributed to the default approver.
- Commercial and scientific/operations decisions remain separately required
  even when delegated coverage is used.
- The same user cannot provide both affirmative decisions for one Trial Project
  scope version. If a user holds both authorities, another active primary
  approver or delegate must provide the other decision. This applies to initial
  approval and every amended scope version.
- Authority is validated when the decision is recorded. Later delegation
  revocation does not rewrite a valid historical approval.

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

## First-Party CRM Request

The CRM Opportunity request contains at least:

- POMS CRM Company and Opportunity identifiers
- Prospect company and primary contact
- Sales representative and account owner
- intended relationship: Customer, Partner, or undetermined
- business objective and commercial justification

The CRM request does not carry proposed samples, scientific inputs,
analyses, deliverables, shipping facts, or laboratory instructions. After POMS
receives the commercial request, authorized Phaeno users define the proposed
sample allowance, submission window, permitted material, analyses,
deliverables, shipping constraints, and measurable scientific acceptance
criteria in the Trial Project review workflow.

CRM request application must be idempotent. A repeated command must not create
a second Portal organization or Trial Project for the same approved request.

## First-Party CRM Pipeline Behavior

- The CRM Opportunity stage represents commercial progress; the Portal Trial
  Project status represents scientific and operational progress.
- Recommended commercial progression is `Qualified` -> `Evaluation proposed`
  -> `Trial requested` -> `Trial active` -> `Conversion decision` -> `Closed
  won` or `Closed lost`.
- Moving an opportunity to `Trial requested` submits or enables the request but
  does not itself approve the Trial Project or authorize samples.
- The Portal publishes its approval and operational status as relationship-safe
  CRM activity and summary fields so Sales can follow progress without editing
  scientific state.
- Sales remains responsible for the opportunity stage and close decision. The
  Portal remains authoritative for approval, submission eligibility, samples,
  results, and completion.
- `Follow-up scheduled` keeps the Opportunity in `Conversion decision` and requires a
  Sales owner and follow-up date. It is not a final outcome.
- `Converted to Customer` and `Converted to Partner` are final CRM outcomes
  that may support, but never perform, the corresponding authorized POMS
  conversion. `Closed without conversion` is final and requires a reason.

## Approval Workflow

1. Sales submits `Trial requested` from the CRM Opportunity.
2. The Portal records a pending request without granting Prospect access.
3. The Chief Business Officer or an active authorized commercial delegate
   approves, declines, or requests clarification.
4. The Chief Operating Officer or an active authorized scientific/operations
   delegate finalizes and approves, declines, or requests clarification.
5. The Portal requires the two affirmative decisions to have different acting
   users, then creates the frozen Trial Project scope. If needed, an authorized
   Phaeno user creates the Prospect organization and invites its primary
   contact. Digital retention settings are not frozen at approval; the complete
   result-package release snapshots the effective global-plus-organization
   settings at that time.
6. The Prospect administrator reviews and explicitly accepts the no-charge
   trial terms, including the versioned RUO and no-PHI affirmation.
7. Acceptance permits sample submission only while the project-specific frozen
   submission window is open and its approved allowance remains available.

A declined request returns a concise relationship-safe reason. Internal notes
and scientific review details remain in the owning POMS workflow.

## Frozen Trial Scope

Approval snapshots:

- Trial Project number, name, and objective
- Prospect organization and CRM Opportunity reference
- Sales owner and both actual approvers, including each approval domain and
  primary-versus-delegate authority source
- approved sample allowance, with no universal maximum
- extracted RNA as the permitted sample type and the required metadata
- permitted analyses and applicable analysis-definition versions
- submission instructions and shipping responsibilities
- submission-open and submission-close dates
- current estimated schedule, explicitly identified as non-binding
- the exact selected deliverables and their configuration versions, using
  FASTQ, FASTA, and BAM as the current configurable default selection
- estimated retail value and anticipated internal cost
- success criteria
- the replacement policy, including authorized replacement slots, the cause,
  the approving Phaeno user, and lineage to the original sample
- residual-material retention duration and final disposition
- return destination, handling requirements, and shipping payer when return is
  approved before the first sample shipment
- Prospect-visible terms and restrictions
- the accepted RUO/no-PHI terms version, actor, and timestamp

Reaching the sample limit closes further submission even when the calendar
window remains open. Reaching the submission deadline closes further
submission even when the sample allowance is unused. Processing and result
delivery may continue after submission closes.

Trial work is scheduled around paid commercial work. Schedule estimates and
updates are operational communications rather than a guaranteed turnaround-time
service level. A schedule-only update does not require a scope amendment.

The eligible deliverable catalog and default selection are also configuration
for future approvals. Configuration changes never rewrite an approved Trial
Project. Its complete standard result package means all deliverables selected
and frozen for that project have been released; later catalog or default
changes do not alter that completion condition or its retention-clock trigger.

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
- Partial or per-sample result availability does not start the released-package
  retention clock. The clock starts only when every deliverable frozen in that
  Trial Project's complete standard result package is released to the Prospect.
- `Completed` requires every submitted sample to reach a terminal outcome and
  the complete approved result package to be released. If the approved work or
  package cannot be completed, POMS uses `Closed incomplete` with a required
  Prospect-safe reason instead of `Completed`.
- Expiration or cancellation blocks new submission immediately without erasing
  received samples, custody records, results, or audit history.
- A new trial after closure requires a new Sales request and approval. Reopening
  a completed or declined Trial Project is not a normal workflow.

## Released Result Retention And Deletion

`FILE-MANAGEMENT-PLAN.md` owns the shared released-deliverable lifecycle. The
following rules define its Trial Project application:

- Authorized Phaeno configuration supplies three global positive whole-day
  defaults: standard retention, warning lead, and undownloaded-file grace. The
  initial values are 30, 5, and 5 exact 24-hour days respectively. The warning
  lead must be shorter than the standard retention period.
- An authorized Phaeno user may set optional Prospect-organization overrides
  for any of the three values. Omitted values inherit the global default, the
  effective combination must pass the same validation, and every override
  change or removal requires a reason and audit history. Prospect users cannot
  edit the policy themselves.
- Release of the complete frozen result package resolves the global defaults
  and active organization override, then snapshots the three effective values,
  their sources, and the resulting warning, standard-deletion, and final-
  deletion timestamps. Later global or organization changes affect only
  packages released afterward. There is no Trial Project or approval-time
  override.
- Each configured retention day is an exact 24-hour interval from the UTC
  release instant. POMS does not round warning or deletion work to midnight.
  The Portal displays labelled local-time equivalents for the current user and
  falls back to UTC when a browser time zone is unavailable.
- A successful download by any currently authorized Prospect organization
  member satisfies that file for the organization; each administrator or member
  does not need a duplicate download. An individual download marks only that
  file, while a successful complete-package archive marks every file in the
  immutable package. Failed, cancelled, unauthorized, or internal Phaeno
  downloads do not satisfy the customer-download condition. A later membership
  change does not erase a valid historical organization download.
- At the snapshotted warning timestamp, if any file in the package has never
  been downloaded, POMS sends one tenant-safe email to every active Prospect
  organization administrator and shows the warning in the Portal. The email
  contains no file names, scientific details, attachments, or direct file links.
  It includes the normal authenticated Portal link to the package detail page,
  where current membership and tenant authorization are rechecked. If there is
  no active administrator, the deadline does not change and POMS creates an
  urgent Phaeno Operations item. This is the only scheduled pre-deadline email;
  its Portal warning clears if every file is downloaded before grace begins. A
  delayed worker suppresses the warning if all files finish before outbox
  creation; a message already queued is not recalled, and its authenticated
  destination shows current package state.
- At the standard deletion deadline, POMS queues asynchronous deletion of the
  complete package bytes when every file was downloaded, but new download
  access closes at that exact timestamp regardless of cleanup completion. If
  any file remains undownloaded, the entire package enters its snapshotted
  5-day grace period and POMS sends one grace notice with the same authenticated
  package-detail link to the administrators and shows the final deadline in the
  Portal. With no active
  administrator, POMS updates the urgent Operations item and leaves the final
  deadline unchanged. This is the second and final scheduled retention email;
  no daily reminder emails are sent.
- A download during grace does not shorten the already communicated grace
  period, and the Portal grace countdown remains visible until deletion. At the
  final deadline POMS closes new download access immediately and queues
  asynchronous deletion of the complete package bytes. Cleanup delay or failure
  creates urgent Phaeno Operations work but never makes the package downloadable
  again. Files are never deleted piecemeal from one immutable released package.
- A file or archive transfer authorized and started before the applicable
  cutoff may finish within its normal bounded timeout, and counts only if that
  same response stream completes successfully. New downloads, retries, range
  resumes, and archive requests at or after the cutoff are denied. An active
  pre-cutoff lease may delay physical deletion only until it completes or
  expires; it does not reopen access, cancel grace, or change the final deadline.
- That finish allowance applies only to the ordinary retention cutoff. An
  emergency quarantine, package withdrawal or correction, Prospect membership
  deactivation, or Prospect organization deactivation immediately revokes the
  lease and stops the active response stream. The attempt is recorded as
  revoked, does not count as a download, and cannot recall bytes already sent.
- Server-side durable event order resolves boundary races. A success committed
  before revocation remains successful; revocation committed first wins. A
  lease must be created strictly before the cutoff, and an incomplete transfer
  at the standard deadline is undownloaded for grace activation even if it later
  completes. Partial file/archive transfers never count, multiple leases remain
  independently bounded, and a disconnect or restart creates no resume right.
- The lease-duration limit is Phaeno operational configuration rather than a
  Prospect retention override and changes only future leases. Restored access
  permits only a fresh request while the original package deadline is still in
  the future.
- A controlled security quarantine or preservation hold blocks deletion until
  authorized resolution. Notification delivery retries safely, but a delivery
  failure does not itself extend either deadline. A hold preserves bytes without
  extending access or resetting the clock/notices; releasing an overdue hold
  queues deletion immediately.
- Package metadata, file names and sizes, checksums, provenance, release facts,
  download audit, notification history, policy snapshot, deletion timestamp,
  and deletion outcome remain after bytes are deleted. Normal deletion offers
  no Prospect self-service restore action and no restoration or regeneration
  promise.
- The permanent receipt distinguishes the authoritative download-access-closed
  timestamp from the actual package-byte-deletion timestamp. While cleanup is
  pending, the Portal may show `Deletion processing` but exposes no download
  action.
- The retained metadata provides a permanent tenant-safe package receipt. A
  Prospect organization administrator can view or export its package ID,
  filenames, sizes, checksums, release timestamp, download-attempt start and
  completion timestamps and outcomes, successful downloader names, byte-
  deletion timestamp, and outcome. A success completed after the cutoff is
  identified as having started under a pre-cutoff authorization. Ordinary
  Prospect members see package status without the member-level download audit.
  A revoked outcome says only that access ended; its confidential reason remains
  Phaeno-only. The receipt never contains file bytes, scientific result values,
  internal notes, network telemetry, storage identifiers, or another
  organization's data.
- The receipt is available as an accessible Portal record and printable PDF
  generated from the same retained metadata. The PDF states its generation time
  and represented package state, labels the displayed user time zone, and shows
  canonical UTC beside each localized retention timestamp. CSV receipt export
  is not part of the initial Trial Project workflow.
- For each sample-scoped file, the receipt maps the Prospect's frozen non-PHI
  sample identifier to the original submitted-tube supplier barcode and Phaeno
  accession identifier. A combined/project-level file is clearly labelled and
  lists all included non-PHI sample identifiers rather than implying a one-file/
  one-sample relationship. Internal derived-container barcodes and scientific
  lineage remain outside the Prospect receipt.
- If source material still exists and Phaeno authorizes regeneration, POMS
  creates a separately linked, immutable Trial package reissue with a recorded
  Phaeno actor and reason, the then-effective Prospect-organization policy, and
  fresh dates, download state, and notices. It never revives or changes the
  deleted package record.
- A corrected release immediately makes the superseded package unavailable to
  the Prospect without erasing its metadata or audit history. The correction is
  a new immutable package with its own effective-policy snapshot, full clock,
  download tracking, and notices; downloads of the old package do not satisfy
  the new one. Superseded bytes remain governed by their existing snapshot or a
  preservation hold until deletion. Conversion to Customer or Partner does not
  reset or extend either package's dates.

## Sample And Result Workflow

- Sample metadata, safety restrictions, receipt, accessioning, custody,
  independent sample statuses, result provenance, file scanning, and release
  use the same scientific and security standards as Customer laboratory work.
- After Prospect acceptance, sample preparation and shipping use the shared
  workflow in `SAMPLE-SHIPPING-AND-INTAKE-PLAN.md`. The Portal resolves the
  approved sample types and eligible Phaeno destinations, groups only compatible
  samples, registers the Phaeno-supplied return-kit tubes, requires the Prospect
  administrator to associate each permanent tube barcode with one expected
  non-PHI sample identifier, freezes that crosswalk with the detailed shipping
  instructions, and issues one printable packet barcode per physical shipment.
  Scanning the packet and tube identifies the Trial Project, expected sample,
  and existing Lab work; it does not itself record receipt. At accession the
  supplier tube barcode becomes that submitted container's authoritative
  physical identity, while derived containers receive POMS barcodes.
- The implementation may share operational services and UI components with
  Customer lab-service workflows and must use the existing Lab Operations
  provider for approved execution, but Trial Project records remain a distinct
  aggregate and do not enter the commercial order state machine.
- Each submitted sample belongs to exactly one Trial Project and one Prospect
  organization.
- The backend validates the approved sample type, metadata, analysis scope,
  sample allowance, submission window, organization, membership, and project
  state at submission.
- The backend requires the current RUO/no-PHI affirmation and rejects PHI or
  direct patient identifiers in structured values it can validate. Suspected
  prohibited data discovered later places the affected material or file on a
  restricted hold and blocks receipt progression, processing, and release until
  authorized disposition.
- Every replacement requires explicit Phaeno authorization and recorded
  lineage to the original sample. When Phaeno causes a processing failure, one
  replacement slot is restored without rewriting the frozen approved sample
  allowance. A Prospect-supplied sample problem does not restore a slot
  automatically; Phaeno must approve and record an exception. Original and
  replacement samples remain in history, and neither path silently increases
  the approved allowance.
- Result release has no invoice or payment gate. Scientific readiness,
  authorization, file safety, and approved deliverable scope still apply.
- Terminal closure calculates the frozen residual-material retain-until date.
  Lab Operations records actual exhaustion, return, or destruction; reaching
  the date never creates a false automatic disposition.
- Residual material cannot be assigned to internal research, training,
  validation, another project, or another organization through the Trial
  Project workflow.
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

## CRM Link And Future External Synchronization

The Trial Project may expose only approved commercial summaries to first-party
CRM and any future external CRM adapter:

- request received
- approved, declined, returned, cancelled, or expired
- Prospect organization and Trial Project relationship-safe identifiers plus an
  internal POMS deep link
- Prospect invitation and acceptance status
- sample-submission opened or closed
- processing started
- results delivered
- completed or closed incomplete
- organization converted to Customer or Partner, or retained as Prospect after
  commercial closeout

Do not place sample identifiers, raw files, scientific results, QC details,
custody details, internal notes, or other sensitive operational content in CRM.

Once a Trial Project exists, a CRM projection failure or future external CRM
outage must not block Portal sample receipt, processing, result release, or
closure. Failed summary publication is visible and retryable to authorized
Phaeno users.

## Conversion And Closure

- POMS operational status and CRM commercial outcome are separate. Trial
  completion does not imply commercial conversion, and a commercial outcome
  does not rewrite Trial Project completion.
- POMS records `Completed` only when the complete approved result package is
  released. Otherwise the terminal operational outcome is `Closed incomplete`
  with a required Prospect-safe reason.
- Sales records exactly one final commercial outcome in first-party CRM:
  `Converted to Customer`, `Converted to Partner`, or `Closed without conversion`.
  Closed without conversion requires a reason.
- Sales may instead record `Follow-up scheduled` with a required owner and date.
  That state is nonterminal and remains unresolved until Sales records a final
  commercial outcome.
- An authorized Phaeno user explicitly converts the same Prospect organization
  to Customer or Partner when the commercial decision warrants it. A CRM stage
  or outcome never performs the conversion automatically.
- Conversion preserves Trial Projects, samples, results, memberships, stable
  identifiers, curated-data grants, and audit history. It does not reset or
  extend a released Trial package's snapshotted warning, standard-deletion, or
  final-deletion timestamps.
- Released Trial package bytes follow their snapshotted deletion path after
  conversion just as they would without conversion. The Trial Project, result
  metadata, and audit history remain preserved. The initial global policy has
  no organization-kind or project-amendment extension path.
- Normal Customer or Partner capabilities begin only after conversion.
- The first paid transaction is a new Customer or Partner record. It does not
  mutate or replace the Trial Project.
- A lost, abandoned, or expired opportunity closes the commercial evaluation.
  CRM records it as `Closed without conversion` with a reason. Trial result
  package bytes remain governed by their snapshotted retention terms, but
  deletion does not deactivate the Prospect organization automatically.
- After commercial closeout, an authorized Phaeno user may explicitly
  deactivate a non-converting Prospect organization only after confirming it
  has no other active Trial Project, curated-data grant, or commercial
  relationship. The review, decision, actor, reason, and timestamp are audited;
  normal deactivation does not delete operational history.

## Audit, Reliability, And Security

Audit at least:

- CRM request application and idempotency identity
- commercial and scientific decisions, actors, reasons, and timestamps
- enforcement that the two affirmative decisions for each initial or amended
  scope version were made by different acting users
- approval-delegate designation, revocation, domain, authority source, reason,
  and effective timestamps
- Trial Project creation, Prospect acceptance, and frozen scope version
- every amendment and reapproval
- operational completion or incomplete closure, including the required reason
- the frozen retention duration, disposition, return terms when applicable,
  calculated retain-until date, holds, and actual operator-confirmed physical
  disposition
- explicit organization conversion, including actor, target kind, source
  commercial-outcome reference, and timestamp
- sample submission, receipt, accessioning, replacement, rejection, and status
  transition
- result upload, review, release, and download
- the released-package policy snapshot; warning, standard-deletion, and final-
  deletion timestamps; per-file customer-download state; notification attempts;
  holds; byte-deletion outcome; and retained metadata
- submission closure, expiration, cancellation, completion, and incomplete
  closure
- CRM summary publication attempts and retries
- organization conversion or deactivation

Use optimistic concurrency on mutable records, durable retry for CRM summary
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
   progress, and released-result download/retention lifecycle.
5. Validate the workflow through the first-party CRM handoff and Portal deep
   links.
6. Add first-party CRM summary publication, retry, and reconciliation after the
   authoritative workflow is proven. Defer any HubSpot adapter.
7. Complete production scientific configuration, storage, scanning,
   notification, operational runbooks, and full authenticated verification.

## Verification Plan

### Backend

- approval requires separately recorded commercial and scientific/operations
  decisions by active primary approvers or delegates authorized for the exact
  domain
- the same user cannot provide both affirmative decisions for an initial or
  amended scope version, including when authorized in both domains
- delegate designation/revocation and every decision retain the actual user,
  domain, authority source, reason, and timestamp; delegation grants no cross-
  domain or unrelated authority
- the configurable deliverable catalog uses FASTQ, FASTA, and BAM as its
  current default selection; approval snapshots the exact selected deliverables
  and configuration versions
- changing the deliverable catalog or defaults affects only future approvals,
  while changing an approved project's selected deliverables requires a
  versioned amendment and reapproval
- complete-package release and the retention clock use the project's frozen
  deliverable selection rather than current configuration
- complete-package release resolves the global 30/5/5 defaults plus any active
  Prospect-organization override and snapshots the effective values and policy
  sources; later configuration changes affect only later releases and no Trial
  Project override is accepted
- successful individual downloads mark only their files, a successful complete-
  package archive marks all package files, and failed, cancelled, or internal
  Phaeno downloads do not satisfy the customer-download condition
- when any file remains undownloaded, the warning and grace notices are sent
  once to every active Prospect organization administrator without scientific
  detail, while failed delivery retries without extending the deadlines
- an all-downloaded package closes access and queues atomic package-byte
  deletion at the standard deadline; an incompletely downloaded package receives
  the full snapshotted grace period and closes access plus queues deletion at the
  final deadline even if downloaded during grace
- a strictly pre-cutoff lease may finish within its unchanged bounded timeout;
  partial or abandoned transfers do not count, an incomplete standard-deadline
  transfer activates grace, revocation overrides the finish allowance, and
  durable server event order resolves completion/revocation races
- package deletion is idempotent, waits only for eligible leases, respects
  controlled preservation holds without extending access or resetting dates,
  and retains the required metadata and complete audit history without
  promising byte restoration
- only one Trial Project is created for one CRM request identity
- Prospect organization admins can submit only within an approved, accepted,
  open Trial Project
- Prospect members can view but cannot submit in the initial release
- the current version of the RUO/no-PHI terms is retained with the accepting
  actor and timestamp at both project acceptance and shipment confirmation
- structured patient identifiers and other prohibited PHI are rejected
- suspected prohibited data places the affected sample or shipment in a
  restricted hold that blocks receipt progression, processing, and release;
  logs, audits, notifications, and CRM receive only safe incident metadata
- sample limits, deadlines, types, analyses, and amendment versions are enforced
- Prospects retain no normal ordering capability
- cross-tenant reads, writes, files, and results are denied
- replacement authorization, original-sample lineage, cause, and approving
  Phaeno user are recorded
- a Phaeno-caused processing failure restores exactly one replacement slot
- a Prospect-supplied sample problem does not restore a slot without an
  explicit Phaeno exception
- original and replacement history cannot silently increase or rewrite the
  frozen approved allowance
- the 30-day residual-material default applies to future approvals, each project
  freezes its exact duration and disposition, and later configuration changes
  do not rewrite approved projects
- `Return` is rejected unless approved before the first sample shipment with a
  destination, handling rules, and shipping payer; post-shipment changes are
  rejected by the normal workflow
- terminal closure calculates retain-until work without automatically recording
  destruction, and only an authorized operator can record exhaustion, return,
  or destruction
- Trial material cannot be reassigned or reused without a separate written-
  authorization workflow outside the Trial Project
- result release does not use payment gates
- Trial Project creation, approval, execution, release, and closeout create no
  QuickBooks transaction and do not depend on QuickBooks availability
- POMS retains estimated retail value and anticipated internal cost for
  authorized internal reporting without exposing them to the Prospect
- CRM projection failures and future external CRM outages do not block
  operational transitions
- POMS rejects `Completed` until the complete approved package is released and
  requires a reason for `Closed incomplete`
- CRM commercial outcomes never cause an automatic organization conversion;
  Customer or Partner conversion requires a separate authorized POMS action
- conversion preserves the complete trial history and enables only the target
  organization-kind capabilities
- conversion does not reset or extend a Trial package's snapshotted deletion
  dates, and package-byte deletion preserves records and audit history
- Trial package-byte deletion does not automatically deactivate a non-
  converting Prospect organization
- non-converting Prospect deactivation requires closed commercial evaluation,
  no other active Trial Project, grant, or relationship, and an explicit
  audited Phaeno action

### Frontend

- Phaeno request and project lists use the standard list/detail flow
- review, approval, decline, amendment, and closure actions communicate effects
  and restore focus correctly
- approval actions identify the acting user's commercial or scientific/
  operations authority and whether it is primary or delegated; delegation
  administration clearly shows domain, status, designator, reason, and dates
- after one affirmative decision, the other domain prevents that same user from
  approving the scope version and explains that a different authorized person
  is required
- Prospect submission availability and unavailable reasons match backend state
- the exact RUO statement is prominent in project terms, project detail,
  release notices, and the downloadable result package
- project acceptance and shipment confirmation require the current versioned
  no-PHI affirmation
- prohibited-data feedback is actionable but does not redisplay or propagate
  the suspected value
- approval and Prospect terms show the frozen retention duration, disposition,
  and return-shipping responsibility; Phaeno views distinguish a due disposition
  from operator-confirmed exhaustion, return, or destruction
- limits, deadlines, instructions, sample status, and released results remain
  clear across desktop, tablet, narrow, keyboard, and screen-reader use
- Phaeno configuration clearly distinguishes eligible deliverables from the
  default selection, and approval previews the exact deliverables and versions
  that will be frozen for the project
- internal notes and CRM context never appear in Prospect-facing output
- Phaeno views clearly separate POMS operational completion from the read-only
  CRM commercial outcome; `Follow-up scheduled` shows its owner and date as
  unresolved, and incomplete closure shows its required Prospect-safe reason
- estimated retail value, anticipated internal cost, and Finance reporting stay
  in authorized Phaeno views and never appear to the Prospect
- conversion does not present the Trial Project as having a new or extended
  retention or grace deadline; deleted trial files remain unavailable while
  retained project history stays visible where authorized
- the Portal displays the frozen warning, standard-deletion, and conditional
  final-deletion dates; an undownloaded-file warning and grace notice identify
  the package and action without exposing scientific details in email
- package-byte deletion does not present the Prospect organization as
  deactivated; the Phaeno closeout action identifies blocking active trials,
  grants, or relationships and requires a retained reason

### End To End

- first-party CRM-originated request through primary and delegated approval coverage in
  both domains, rejection of a same-person second approval, two-person approval
  of the initial and amended scope versions, commercial-only request fields,
  POMS-owned scientific scoping, safe outbound milestones and deep link,
  Prospect invitation and acceptance,
  versioned RUO/no-PHI affirmations, non-PHI sample identifiers, bounded sample
  submission, prominent RUO labeling, prohibited-data rejection or restricted
  quarantine followed by authorized disposition, receipt, processing, result
  release, frozen residual-material retention and operator-confirmed destruction
  or pre-approved return, complete-package-gated `Completed` or reasoned
  `Closed incomplete`,
  each final CRM outcome plus nonterminal owned/dated follow-up, explicit
  authorized conversion with no automatic transition, and conversion without
  resetting or extending the released package's frozen deletion dates
- FASTQ/FASTA/BAM default selection, a future configured deliverable/default
  change, immutable project snapshots, amendment/reapproval, and retention-clock
  start only after the project's complete frozen package is released
- the global 30/5/5 defaults, Prospect-organization override and release
  snapshot, future-only configuration change, individual and complete-archive
  download accounting, no warning plus standard-deadline
  deletion when all files were downloaded, undownloaded warning plus grace and
  final-deadline deletion when any file remains, and retained metadata/audit
- package deletion follows the frozen deadlines after conversion while the
  Trial Project and audit history remain preserved
- decline, expiration, cancellation, amendment, replacement, CRM summary retry, and
  closed-without-conversion journeys
- a non-converting Prospect remains active when Trial package bytes are deleted,
  cannot be deactivated while another active Trial Project, grant, or commercial
  relationship exists, and is deactivated only by an explicit audited Phaeno
  closeout action
- estimated retail value and anticipated internal cost remain reportable in
  POMS while the complete Trial Project journey creates no QuickBooks
  transaction and remains available during a QuickBooks outage
- Prospect ordering denial remains intact throughout the trial
- two-tenant isolation for project metadata, samples, files, and results

Do not run tests or execute this verification plan until explicitly requested.

## Open Product Decisions

- The first real extracted-RNA destination plus its shipping, packing, labeling,
  temperature, carrier, timing, and exception instructions. The structured
  multi-destination and multi-sample-type configuration behavior is owned by
  `SAMPLE-SHIPPING-AND-INTAKE-PLAN.md`.
- Initial scientific inputs, analyses and sample-acceptance rules were resolved
  on 2026-09-05: reuse existing PSeq rules. Raw/intermediate pipeline provenance
  and retention remain owned by the existing pipeline activation work; Trial
  integration consumes the same approved immutable final-package handoff.

## Definition Of Ready For Implementation

- the standardized extracted-RNA package and per-project approved sample-
  allowance rule remain approved
- scientific inputs, approved analyses, and shipping details are approved
- the Chief Business Officer and Chief Operating Officer approval workflow is
  operationally assigned, including the actual authorized delegates available
  when either default approver is unavailable
- Prospect-visible commercial terms, sample restrictions, and frozen residual-
  material disposition are approved; the confirmed RUO/no-PHI wording and all
  customer-facing terms receive final regulatory/legal review before activation
- the confirmed global 30-day released-package retention, 5-day undownloaded
  warning, and 5-day grace defaults, each calculated as exact 24-hour intervals;
  Customer-, Partner-, and
  Prospect-organization overrides; complete-package deletion unit; release-time
  effective-policy snapshot; and retained-metadata rules remain the
  implementation contract
- the confirmed commercial-only CRM request fields, `Trial requested` stage
  behavior, controlled manual handoff, POMS-owned scientific scoping, and safe
  outbound milestones remain the implementation contract
- the confirmed separation of POMS operational completion, CRM final
  commercial outcomes, nonterminal owned/dated follow-up, and explicit POMS
  conversion remains the implementation contract
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
- CRM storage of scientific data or result content
- reuse of Prospect trial samples or results as Phaeno-owned curated data
  without a separately approved ownership, consent, and de-identification
  workflow

## Closeout dependency (2026-09-05)

The Portal closeout now implements shared retention enforcement, durable notices,
cleanup/holds/reissue and retained receipts for existing Lab/PSeq/Assembly release
parents. The Trial integration now connects its distinct parent workflow to
those shared mechanisms using current PSeq analyses and scientific acceptance rules, explicitly
confirmed by the Product Owner on 2026-09-05. Do not treat shared file infrastructure
or reserved provider identifiers as implemented Trial behavior before verification.

## Execution slices (2026-09-05)

1. Distinct Trial aggregate, versioned scope, domain-specific approval authority,
   two-person approval, acceptance, amendments, samples/replacements and closure.
2. First-party CRM request and safe milestones; reuse the existing Lab provider,
   versioned shipping configuration and governed file lifecycle without an order
   or payment gate. Preserve organization and Department scope after conversion.
3. Phaeno and Prospect list/detail workspaces with bounded modal actions,
   backend-derived permissions, typed forms, concurrency recovery and clear terms.
4. Regression/reference-journey tests, user guides, ERD and readiness evidence.
   Keep production activation and physical acceptance distinct from local proof.

## Engineering decisions and current verification

- Scope editing uses a dedicated page because it coordinates a versioned analysis
  and deliverable selection, time window, sample allowance, material disposition,
  terms and internal costs. Lists remain form-free; other actions use bounded
  modals. This is the complexity exception under the UI/UX principles.
- CRM activities are a recoverable projection of immutable Trial events, keyed by
  event ID. A minute-based publisher and explicit retry publish only safe summaries
  and links. Pending projection does not block scientific transactions.
- An explicit close-access action checks final evaluations and other relationships
  and records a reason. General Company/organization deactivation directs Trial
  Prospects to this action. Conversion remains an explicit existing CRM workflow.
- New persistence is migration `20260905172646_AddTrialProjectIntegration`; it has
  been applied to an isolated local PostgreSQL reference database. Shared database
  application and production activation have not been performed for this change.
- Detailed final checks and remaining rollout gates are recorded in
  `TRIAL-INTEGRATION-CLOSEOUT.md`. Do not infer production readiness from local
  tests or from the previously deployed Portal closeout.
