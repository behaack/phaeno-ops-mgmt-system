# HubSpot to Phaeno Portal Lifecycle Plan

Keep this file updated as the HubSpot-to-Portal relationship, onboarding, sales,
and account-lifecycle integration is designed and implemented.

Do not execute this plan unless explicitly requested.

## Status

- Product direction was approved on 2026-07-15 for planning purposes.
- HubSpot is the selected relationship CRM and planned integration target.
- HubSpot is not connected to the running application today. No HubSpot
  dependency, credential, webhook, schema change, migration, deployment, or
  test execution is authorized by this plan alone.
- Phase 0 developer setup began on 2026-07-15. HubSpot developer project
  `Phaeno Portal Integration` (project ID `317349345`) and its private,
  static-auth app shell (app ID `45850780`) were created on platform version
  `2026.03`; build `1` validated, built, and auto-deployed successfully.
- The deployed app shell has no CRM object scopes, webhook subscriptions,
  permitted URLs, runtime credential, or Portal connection. Its sole required
  scope is HubSpot's generated `oauth` baseline. The HubSpot CLI personal access
  key is restricted to `Developer Projects` and is stored in the developer's
  user-level CLI configuration, not this repository.
- QuickBooks Online remains the implemented commercial system of record.
- The current application still uses manual per-job pricing for Customer
  laboratory work and a standalone Partner data-assembly workflow. The
  standalone assembly commercial model is now superseded and must be refactored
  into the included assembly phase of PSeq Lab Service or PSeq Kit before
  production activation. Standard configured-price bundles, Partner PSeq Lab
  Service, and HubSpot synchronization are approved future changes, not
  implemented behavior.
- The plan uses HubSpot standard Companies, Contacts, Deals, Orders, and Line
  Items as its baseline. It does not require an Enterprise-only custom object.
  Exact account capabilities, scopes, layouts, workflows, and sandbox behavior
  must be validated before implementation.
- Available proof environment: a newly created HubSpot Free account containing
  HubSpot-provided sample CRM records, the developer project described above,
  the Phase 0 configuration recorded below, and the disposable Phaeno-named
  Company, Contact, and Deal used for the manual proof. It is non-production and
  may be used for disposable sample Companies, Contacts, Deals, Orders, Line
  Items, app/API proof, and manual lifecycle exercises. No real customer,
  specimen, financial, or confidential data may be loaded into it.
- HubSpot Free supports app/API development but does not provide the general
  Professional/Enterprise workflows tool or an Enterprise standard sandbox.
  Phase 0 must therefore prove the core contract through the app/API and manual
  actions, then identify any paid-tier automation required before production.
- A Professional upgrade is anticipated during the week of 2026-07-20. The
  exact Hub subscription and activation are not yet confirmed, so the plan must
  not treat Professional workflows or reporting as available until the account
  is inspected after upgrade.
- On 2026-07-15 the Free account accepted ten custom properties, then disabled
  `Create property` and exposed an upgrade URL reporting `limit=10&value=10`.
  The ten-property foundation is live and verified in the HubSpot UI: six
  Company properties, three Contact properties, and one Deal property. The
  remaining Deal, Order, and Line Item contract is pending the anticipated
  upgrade and capability recheck.
- Phaeno's authoritative HubSpot reporting timezone is Eastern Time. The
  account was already configured for Eastern Time when this decision was
  confirmed on 2026-07-15, so no account-default change was required.
- A HubSpot Deal is created only for a genuine Sales-managed revenue
  opportunity requiring qualification, scientific or commercial scoping,
  pricing, negotiation, or approval. Ordinary prospects, non-commercial
  evaluation inquiries, and routine configured-price Portal orders do not
  create Deals. Committed routine sales remain visible to Sales through
  Company-associated HubSpot Orders. Every Deal must have one primary
  associated Company; additional Company associations are secondary context
  and an orphan Deal is invalid.
- The approved Phaeno Deal pipeline stages are `Qualified opportunity`,
  `Scientific and commercial scoping`, `Proposal or quote sent`, `Contract or
  purchase-order review`, `Commitment pending`, `Closed Won`, and `Closed
  Lost`. Portal onboarding and operational fulfillment occur outside this
  commercial pipeline. The stages and initial probabilities were configured
  and verified in the HubSpot Free account on 2026-07-15.
- Deal `Amount` may remain unknown in `Qualified opportunity` and `Scientific
  and commercial scoping`, but it must be populated before the Deal enters
  `Proposal or quote sent` or any later open stage.
- HubSpot's default Deal amount calculation is `Total contract value (TCV)`.
  It represents the full value of the specific negotiated opportunity, not the
  Company's lifetime value or hypothetical future routine Portal orders. The
  setting was configured and verified in the Free account on 2026-07-15.
- Before a Deal enters `Proposal or quote sent`, it must have at least one
  high-level commercial Line Item supporting the proposed scope and TCV. Line
  Items may contain approved service, quantity, term, and pricing summaries but
  never specimen identifiers, scientific details, result content, protected
  information, or a Partner's downstream-customer identity.
- The initial standard commercial families are `PSeq Lab Service` and `PSeq
  Kit`. `PSeq Lab Service` always bundles specimen processing with data
  assembly. `PSeq Kit` always bundles its reagents/kits with data assembly.
  HubSpot Line Items use the bundled commercial product name even when the
  Portal tracks the operational components separately. Data assembly is not a
  standalone product or separately purchasable service because it has no value
  without the corresponding PSeq Lab Service or PSeq Kit inputs.
- The standard PSeq Lab Service selling unit is one accepted specimen. HubSpot
  and QuickBooks Line Item quantity equals the accepted specimen count. The
  standard offering defines its included processing and data output. Unusual
  specimen types, output requirements, failed-input remediation, or bespoke
  analysis route to Sales rather than silently changing the standard unit or
  scope.
- PSeq Lab Service accepts small standard orders at the configured per-specimen
  price without a customer-specific minimum batch charge. Phaeno may combine
  eligible work from multiple customer orders in an internal laboratory batch
  to achieve operating efficiency. The customer orders, HubSpot Orders,
  QuickBooks records, tenant data, and results remain separate, and no customer
  can discover another customer's participation or data.
- The customer-facing PSeq Lab Service turnaround window begins when Phaeno
  accepts the specimen. Internal batching must fit within that published
  window; it cannot delay an accepted specimen indefinitely. Customers may see
  their own order progress and expected timing but never the batch composition
  or another customer's participation.
- Each PSeq Lab Service offering defines its own published turnaround range.
  The Portal shows it before commitment and freezes it in the commercial order
  snapshot. It is an operating target rather than a guaranteed service level
  unless the customer's contract explicitly makes it one.
- At specimen acceptance, the Portal calculates a target completion date and
  flags at-risk work internally. A Phaeno user with lab-operations authority may
  override the current expected completion date. The override requires a reason
  and preserves the original date, revised date, actor, timestamp, and history;
  the customer sees the current expected timing but no internal batch details.
- Moving the expected completion date later automatically updates the Portal
  and notifies the ordering organization by email with the revised date and a
  customer-safe reason. Moving it earlier updates the Portal without sending an
  email. Notification delivery and content are retained in the audit history,
  and neither path exposes internal batching information.
- Operations chooses the customer-facing reason from `Laboratory scheduling
  adjustment`, `Additional processing or quality review`, `Equipment or supply
  interruption`, `Specimen or shipping issue`, `Customer action required`, or
  `Other operational delay`. The last option requires a customer-safe note.
  Operations may also record a separate internal note, which is never copied to
  email, an external timeline, HubSpot, or QuickBooks.
- A later-date notification goes to the order contact and active organization
  administrators with duplicate recipients suppressed. The Portal timeline
  retains the revised date and customer-safe explanation. Delivery failure is
  visible and retryable internally but does not roll back the date change.
- HubSpot receives only the Order-level current expected completion date and
  schedule health of `On track`, `At risk`, `Delayed`, or `Complete`. It does
  not receive the delay-reason text, internal note, specimen facts, batch
  composition, or another organization's participation.
- TAT reporting preserves the offering's quoted range, original target date,
  current expected date, every override, and actual completion date. An
  override never rewrites the original target or on-time-performance baseline.
  Receipt-to-acceptance time is measured separately so delayed intake cannot
  make acceptance-to-completion performance appear better than the full
  customer experience.

## Related Documents

- `../crm-integration-strategy.md` owns the durable CRM/Portal boundary.
- `../../integrations/hubspot/` contains the source-controlled HubSpot developer
  project. HubSpot account configuration derived from that project is read-only
  in the HubSpot UI and changes through validated project uploads.
- `AUTH-USER-SYSTEM-PLAN.md` owns organizations, invitations, memberships,
  tenant access, and organization-type transitions.
- `PROSPECT-TRIAL-PROJECT-PLAN.md` owns no-charge Prospect Trial Projects.
- `ORDER-MANAGEMENT-PLAN.md` owns Customer and Partner operational order
  workflows and QuickBooks integration.
- `ORGANIZATION-DATA-PROVISIONING-PLAN.md` owns Phaeno-curated data grants,
  including grants to approved Portal Prospects.
- `BACKEND-TEST-PLAN.md`, `FRONTEND-TEST-PLAN.md`, and `E2E-TEST-PLAN.md` own
  living verification coverage when implementation is authorized.

## Purpose

Connect the commercial relationship managed in HubSpot to the tenant access,
scientific work, orders, and results managed in Phaeno Portal without turning
the Portal into a CRM or HubSpot into a scientific system.

The integration must allow Sales to understand each account's onboarding,
services, committed sales, high-level operational activity, and payment state
while keeping scientific data, tenant authorization, files, and operational
control in the Portal.

## Product Vocabulary

| Term | Meaning |
| --- | --- |
| HubSpot prospect | A commercially interesting company or contact in HubSpot. This creates no Portal organization, account, invitation, or access. |
| Portal Prospect | An approved evaluation tenant that needs Portal access for a Trial Project or explicitly granted curated demonstration data. |
| Customer | An end-user organization approved for configured PSeq Lab Service. |
| Partner | An organization approved for PSeq Lab Service, PSeq Kit, or both. |
| Direct Portal sale | Standard configured work an eligible organization can price and commit to without Sales negotiation. |
| Sales-assisted work | Bespoke or exceptional work that requires a HubSpot deal before executable Portal work is created. |
| Service entitlement | An approved organization-specific capability that controls which Portal sales and operational workflows are available. |
| Portal integration request | The audited Portal record for an inbound onboarding, evaluation, service-change, relationship-change, sales-assisted-order, or offboarding handoff. |

## System Ownership

| Information or workflow | System of record | Integration behavior |
| --- | --- | --- |
| Companies and relationship contacts | HubSpot | Publish only the approved company/contact facts needed to request Portal access. |
| Account owner, pipeline, deals, notes, calls, email, and follow-up | HubSpot | Internal commercial context may be shown read-only to authorized Phaeno users. |
| Commercial qualification and Closed Won/Lost outcome | HubSpot | Creates a pending Portal request; never directly grants or removes access. |
| Organizations, memberships, invitations, and tenant access | Portal | Publish approved status summaries to HubSpot. |
| Portal Prospect evaluations and Trial Projects | Portal | Publish relationship-safe milestones only. |
| Service entitlements and operational readiness | Portal | HubSpot requests changes; Portal review activates them. |
| Specimen, reagent, and data-assembly workflows | Portal | Publish committed-sale and high-level operational summaries only. |
| Scientific scope, specimens, custody, QC, results, and files | Portal | Never synchronize to HubSpot. |
| Billable items, estimates, invoices, tax, freight, balances, terms, and paid status | QuickBooks Online | Portal consumes authoritative facts and publishes approved high-level sale/payment summaries to HubSpot. |
| Authentication sessions and external identity | Clerk | Portal retains authorization authority; no HubSpot role or contact grants access. |

## Confirmed Product Decisions

- Customer and Partner remain mutually exclusive organization types at one
  point in time.
- A Partner may be entitled to PSeq Lab Service, PSeq Kit, or both. PSeq Lab
  Service includes specimen processing and data assembly. PSeq Kit includes its
  reagents/kits and data assembly.
- Partner specimen work belongs to the Partner. Phaeno does not require, infer,
  or synchronize the Partner's downstream-customer identity. An optional PO,
  project code, or internal reference is opaque Partner data.
- Most HubSpot companies never receive Portal access.
- Every ordinary external-organization onboarding request originates in
  HubSpot. An audited Phaeno-only path is reserved for migration, recovery, or
  another documented non-sales exception.
- A Portal Prospect is created only for approved evaluation access. A company
  that is already approved to buy is onboarded directly as a Customer or
  Partner and does not pass through Portal Prospect.
- HubSpot Closed Won satisfies commercial approval but creates only a pending
  Portal onboarding or service-change request.
- Phaeno review confirms organization type, designated primary administrator,
  enabled services, billing/configuration readiness, and operational readiness
  before access or capabilities are activated.
- PSeq Lab Service and PSeq Kit entitlements are enabled independently. Partner
  kind alone grants neither bundle, and data assembly is never enabled or sold
  as a standalone capability.
- HubSpot must explicitly identify the intended initial Portal administrator.
  The deal contact is not invited by default.
- Portal invitations and memberships do not automatically create HubSpot
  contacts. HubSpot owns relationship contacts; Portal owns access.
- An active Customer may later become a Partner, or a Partner may later become
  a Customer, through a pending relationship-change request and explicit
  cutover. The same Portal organization, users, records, results, identifiers,
  and audit history are preserved.
- A HubSpot commercial close or contract termination cannot directly deactivate
  an active Portal organization. It creates a pending offboarding request so
  open work, result access, retention, billing, and required downloads can be
  reviewed.
- External administrators cannot directly change legal identity,
  Customer/Partner classification, contracted services, billing identity, or
  commercial terms. `Request account change` routes the request to HubSpot.

## HubSpot Trigger And Accounts Workspace Intent

Ordinary external-account intake begins in HubSpot, not from a create action in
POMS. HubSpot remains the working surface for Companies, relationship Contacts,
commercial qualification, Deals, and the status that authorizes a handoff.
POMS remains the authority for the resulting Portal account, tenant access,
service readiness, entitlements, invitations, and operational records.

The intended automated handoff is:

1. HubSpot reaches an explicitly configured eligible state with all required
   Company, relationship, service, and designated-administrator fields present.
2. A HubSpot workflow calls the authenticated POMS integration boundary with a
   provider-neutral request. Ordinary Company edits and intermediate Deal
   stages do not call POMS.
3. POMS validates the source identifiers and request revision, applies a
   deterministic idempotency key, and records or returns the same pending
   request for duplicate delivery.
4. An authorized Phaeno user reviews the request. Receipt and approval do not
   by themselves create access, enable a service, send an invitation, or place
   an order.
5. POMS creates or links the external account, completes readiness and access
   work through the owning workflows, and records the request as applied only
   after those outcomes are verified.
6. POMS publishes the safe request status, Portal account identifier, and
   approved lifecycle summaries back to HubSpot through the durable outbound
   integration boundary.

Initial trigger intent is:

- an explicitly approved evaluation request creates an evaluation intake;
- `Closed Won`, with the required onboarding fields complete, creates a
  Customer or Partner onboarding intake;
- approved service, relationship, Sales-assisted-work, and offboarding states
  create their corresponding request types; and
- a later material source change creates a new request revision or supersedes
  an unprocessed revision rather than silently rewriting an approved snapshot.

The exact HubSpot properties, workflow actions, endpoint payload, signing and
authentication mechanism, retry schedule, idempotency composition, and
supersession rules remain Phase 1 implementation details that must be proven in
the actual HubSpot subscription before production activation.

The standard POMS **Accounts** workspace reflects this ownership boundary:

- it lists only Prospect, Customer, and Partner accounts, never the internal
  Phaeno authorization organization;
- it provides account discovery, review, readiness, access, service, and
  request-history surfaces;
- it does not expose normal **New account**, **New organization**, or manual
  **New request** actions;
- it identifies HubSpot intake as not connected until the integration is
  actually operational; and
- migration, recovery, or other documented non-sales exceptions use a separate
  restricted and audited manual path, not the standard Accounts page.

## End-to-End Relationship Lifecycle

### 1. HubSpot-Only Relationship

1. Sales creates or manages the Company, Contacts, and Deals in HubSpot.
2. Lead, prospect, qualification, meeting, and ordinary opportunity stages do
   not create Portal data.
3. Sales remains free to manage the relationship without a Portal dependency.

### 2. Evaluation Access

1. Sales explicitly requests an approved evaluation from the HubSpot Deal.
2. The Portal records a pending integration request idempotently.
3. A curated-data evaluation follows the data-provisioning approval boundary.
4. A Trial Project follows the commercial and scientific approvals in
   `PROSPECT-TRIAL-PROJECT-PLAN.md`.
5. Only after approval does Phaeno create or link a Portal Prospect and invite
   the designated administrator.
6. The Portal publishes invitation, acceptance, evaluation, and conversion
   milestones to HubSpot without publishing scientific data.

### 3. Direct Customer or Partner Onboarding

1. A HubSpot Deal reaches Closed Won with the intended organization type,
   services, designated Portal administrator, and commercial references.
2. HubSpot sends an idempotent onboarding request.
3. The Portal matches an existing organization by its stored HubSpot Company
   identifier or creates a pending candidate; name matching alone never silently
   merges organizations.
4. Phaeno verifies operational and access readiness. Closed Won is not
   reapproved commercially in the Portal.
5. Approval creates or activates the Customer or Partner, enables only the
   approved service entitlements, links required QuickBooks configuration, and
   sends the invitation.
6. Invitation acceptance activates the Portal membership. It does not create a
   new HubSpot contact.
7. The Portal publishes activation and service status to HubSpot.

### 4. Expansion and Service Changes

1. Standard services already enabled for the organization remain directly
   orderable in the Portal.
2. A new contracted service, negotiated price, unusual commitment, or material
   expansion is managed through a HubSpot Deal.
3. Closed Won creates a pending service-change request for the existing Portal
   organization rather than another tenant.
4. Phaeno verifies configuration and activates the service at an explicit
   effective point.
5. Prior operational and commercial snapshots remain unchanged.

### 5. Customer/Partner Relationship Change

1. HubSpot records the approved new relationship.
2. The Portal creates a pending relationship-change request.
3. Phaeno reviews open work, service cutover, access, pricing, billing, and
   result obligations.
4. At the approved cutover, the same organization changes kind and receives the
   new service entitlements. Old services are disabled for new work.
5. Existing work and historical records remain accessible under their original
   authorization and retention rules; the conversion never rewrites history.

### 6. Offboarding

1. A HubSpot close, termination, or Sales request cancels an unactivated
   onboarding request when no access was granted.
2. For an active organization, HubSpot creates a pending offboarding request.
3. Phaeno reviews open work, Trial or result-access commitments, outstanding
   billing, required downloads, retention, and legal or operational holds.
4. An authorized Phaeno user schedules or performs deactivation with a safe
   external reason.
5. The Portal publishes the final access state to HubSpot. Neither system
   deletes scientific, commercial, or audit history through normal offboarding.

## Service Model

| Organization | Potential service entitlement | Initial sales path |
| --- | --- | --- |
| Portal Prospect | Approved Trial Project | No charge; HubSpot request plus Portal approval |
| Portal Prospect | Curated demonstration data | Phaeno-approved grant; not an order |
| Customer | Standard PSeq Lab Service: specimen processing plus data assembly | Direct configured-price Portal sale |
| Customer | Bespoke specimen or analysis work | Sales-assisted HubSpot Deal |
| Partner | Standard PSeq Lab Service: specimen processing plus data assembly | Direct configured-price Portal sale |
| Partner | Bespoke specimen or analysis work | Sales-assisted HubSpot Deal |
| Partner | Standard PSeq Kit: reagents/kits plus data assembly | Direct negotiated-price Portal sale |
| Partner | Bespoke reagent, assembly, or deliverable | Sales-assisted HubSpot Deal |

Service entitlement is necessary but not sufficient for placement. The Portal
still validates active organization and membership, administrator authority,
offering/profile availability, scientific inputs, quantity rules, pricing,
QuickBooks linkage, shipping, file safety, and workflow-specific requirements.

## Direct Versus Sales-Assisted Work

Direct ordering is allowed only when all of the following are true:

- the organization has the service entitlement;
- the requested offering, profile, specimen type, analysis, deliverables, and
  quantity fit active Portal configuration;
- the Portal can show the complete configured or negotiated price before
  commitment;
- standard commercial terms, turnaround posture, shipping, and data delivery
  apply; and
- no Sales negotiation, scientific scoping, special discount, contract change,
  capacity commitment, or special compliance review is required.

For a standard Customer or Partner PSeq Lab Service, the Portal sells specimen
processing and data assembly as one commercial product. It displays the
configured bundle price, records the administrator's commitment, freezes the
commercial snapshot, and creates or synchronizes the QuickBooks estimate. The
Portal may track specimen processing and assembly as distinct operational
workflows, but it must not present or publish specimen processing as a
standalone standard commercial line. Scientific intake validation occurs after
placement and before laboratory work.

A standard PSeq Kit commercially bundles its reagents/kits with data assembly.
Partner-specific eligibility, negotiated pricing, shipment, and data-assembly
operations remain separately controlled and auditable inside the Portal, while
the accepted quote/order and HubSpot summary preserve the PSeq Kit bundle. One
PSeq Kit purchase creates one commercial order and one HubSpot Order with two
operational phases: kit fulfillment, followed by data submission and assembly.
The included assembly phase never creates a second sale or HubSpot Order. Each
purchased PSeq Kit unit includes one assembly case for data produced by that
kit. Corrected or replacement files for the same case are resubmissions, not a
new commercial purchase or another assembly entitlement. An order for multiple
PSeq Kit units creates the same number of separately tracked assembly cases;
each case may be submitted, processed, completed, and released independently.
An unused assembly case expires 90 days after the kit's labeled expiration
date. If no kit expiration is recorded, it expires 12 months after shipment.
Phaeno may grant an audited extension without creating another sale. Kit
delivery produces a `Kit fulfilled / assembly pending` operational summary; the
PSeq Kit order is operationally complete only when every included assembly case
has results released, expires unused, or is formally cancelled. QuickBooks
billing state remains separate from this operational completion state. Each
PSeq Kit unit is invoiced through QuickBooks when it ships; a partial shipment
invoices only the shipped units. The invoice line preserves the PSeq Kit bundle,
and later data submission or assembly completion never creates a second invoice.
An unused or expired assembly case has no independent refund or credit value.
Any adjustment applies to the PSeq Kit bundle through an approved return,
defect, cancellation, or commercial-exception process. Replacing a defective or
damaged kit unit transfers its existing assembly case to the replacement unit;
it creates neither another entitlement nor another sale unless an additional
unit is purchased. The purchasing Partner remains the tenant owner of every kit
unit and assembly case even when it supplies the kit downstream. The entitlement
cannot transfer to another Portal tenant, and Phaeno neither requires nor
infers the downstream customer's identity.

When direct ordering is unavailable, the Portal offers `Request custom work`.
That action creates a structured HubSpot Sales request and does not create an
order or commercial commitment. Scientific files, specimen details, and other
sensitive content stay in the Portal; HubSpot receives the minimum relationship
summary and a secure internal link when appropriate.

## Sales-Assisted Order Handoff

1. Sales manages the bespoke engagement as a HubSpot Deal.
2. Closed Won creates a pending sales-assisted-order handoff in the Portal.
3. Phaeno Operations verifies executable scientific scope, deliverables,
   capacity, QuickBooks linkage, and submission instructions.
4. The Portal creates the appropriate specimen-processing, reagent, or
   data-assembly record with immutable links to the HubSpot Deal and commercial
   handoff.
5. The organization administrator reviews the final operational scope before
   submitting specimens or data. This is an operational confirmation, not a
   reopening of the completed commercial negotiation.

## HubSpot Sales Visibility

### Committed Sale Boundary

HubSpot counts a transaction as a sale only after buyer commitment:

- Customer or Partner PSeq Lab Service: configured-price bundle placement or
  acceptance of a sales-assisted scope;
- Partner PSeq Kit: negotiated-price bundle placement or acceptance of a
  sales-assisted scope; and
- custom work: HubSpot Deal Closed Won, linked to the resulting Portal order.

Drafts, evaluation requests, quote requests, and custom-work inquiries are not
sales. Cancelled, rejected, credited, or refunded sales remain visible with
their final status so reporting is not inflated.

### Standard HubSpot Records

HubSpot's current standard Orders API supports Company, Contact, Deal, Invoice,
Payment, Quote, and Line Item associations. The baseline therefore uses the
standard Order object for committed-sale visibility. HubSpot custom objects are
Enterprise features and are not required by this plan. Validate both facts in
the actual subscription during Phase 0:

- [HubSpot Orders API](https://developers.hubspot.com/docs/api-reference/latest/crm/objects/orders/guide)
- [HubSpot custom-object availability](https://knowledge.hubspot.com/object-settings/create-custom-objects)

- **Company:** one HubSpot Company links to one Portal organization unless a
  genuinely separate legal or tenant-isolation boundary requires another
  organization.
- **Contact:** the designated initial Portal administrator may link to one
  HubSpot Contact. Other Portal users do not synchronize automatically.
- **Deal:** represents negotiated evaluation, onboarding, service expansion,
  relationship change, renewal when action is required, or custom work.
  Routine direct orders do not create Deals.
- **Order:** one HubSpot Order represents each committed Portal sale and is
  associated with its Company, optional originating Deal, and approved Line
  Items. The Portal/QuickBooks identifiers prevent duplicates.
- **Line Item:** carries approved commercial summary lines only. Scientific
  metadata and result content never become line-item properties.

### Per-Sale Summary

Each HubSpot Order receives only approved sales facts:

- Portal workflow type, order number, and internal deep link;
- HubSpot Company and optional originating Deal association;
- committed date, completion date, and current high-level status;
- sale type, amount, currency, and approved line-item summary;
- assigned HubSpot account owner through the Company relationship;
- high-level QuickBooks state such as estimate created, invoiced, paid,
  overdue, credit terms, cancelled, credited, or refunded; and
- last successful synchronization plus visible retry/error state for authorized
  internal users.

QuickBooks remains authoritative for financial facts. HubSpot is a reporting
and relationship view, not the ledger.

### Company-Level Summary

The HubSpot Company may expose derived, read-only properties or cards for:

- Portal organization type and active/inactive state;
- enabled services;
- initial administrator invitation/acceptance state;
- lifetime and recent committed sales;
- open-order count and last committed sale date;
- last operational activity and result-delivery dates;
- high-level payment standing;
- pending onboarding, custom-work, service-change, relationship-change, or
  offboarding request; and
- synchronization health.

Routine sales are immediately visible in HubSpot but do not require individual
interruptions. Immediate notification is reserved for first sale, custom-work
request, cancellation/refund, overdue payment or credit hold, Sales
intervention, material expansion, relationship change, or another configured
exception. Routine repeat sales may be summarized in a dashboard or digest.

## Portal Experience

### Authorized Phaeno Users

- A pending integration-request queue separates onboarding, evaluation,
  service changes, relationship changes, sales-assisted orders, and offboarding.
- The organization detail workspace shows a read-only HubSpot summary: Company
  and Deal links, account owner, commercial stage, approved services, pending
  requests, last sync, and retryable failures.
- HubSpot notes, emails, and sensitive relationship history are not copied into
  general Portal fields. The initial release favors deep links over duplicating
  editable CRM workflows.
- Review actions show the exact external request, proposed changes, readiness
  checks, conflicts, and effect before approval.

### External Organization Users

- Prospect, Customer, and Partner users never see HubSpot account ownership,
  deals, internal notes, sync failures, or commercial relationship history.
- Eligible administrators see direct configured-price ordering only for active
  service entitlements.
- Unsupported work shows `Request custom work` with clear expectations that no
  order or price commitment has been created.
- `Request account change` routes legal identity, classification, service,
  billing, or commercial changes to Sales.

## Integration Contract

### Inbound Request Types

- `EvaluationRequested`
- `OnboardingRequested`
- `ServiceChangeRequested`
- `RelationshipChangeRequested`
- `SalesAssistedOrderRequested`
- `OffboardingRequested`

Each request contains the HubSpot account identifier, source object and version,
request type, Company, Deal when applicable, designated administrator when
applicable, intended organization type, requested services, commercial outcome,
effective timing, relationship-safe notes, and a deterministic idempotency key.

### Portal Request Lifecycle

`Received` -> `Pending review` -> `Approved` -> `Applying` -> `Completed`

Alternatives are `Clarification requested`, `Declined`, `Cancelled`, `Failed`,
and `Superseded`.

Receiving a request never grants access. `Failed` preserves the request and
supports retry; a duplicate delivery returns the existing result. A later
material HubSpot change creates a new request version rather than rewriting an
approved snapshot.

### Outbound Events

- request received, clarification requested, approved, declined, cancelled,
  failed, retried, or completed;
- Portal organization linked, activated, reclassified, or deactivated;
- designated administrator invited, accepted, expired, or replaced;
- service enabled or disabled;
- Trial Project relationship-safe milestones;
- committed sale created or status changed;
- invoice/payment summary changed;
- custom-work or account-change request submitted; and
- reconciliation mismatch detected or cleared.

## Data Excluded From HubSpot

- specimen and accession identifiers;
- downstream-customer identity for Partner work;
- patient, subject, or protected-health information;
- scientific metadata, requested sequences, analyses, QC details, and results;
- chain-of-custody details and internal laboratory notes;
- uploaded or generated files and file names that may reveal scientific facts;
- Portal membership lists beyond the explicitly linked administrator;
- credentials, invitation tokens, webhook secrets, raw integration payloads,
  and internal exception details; and
- QuickBooks payment instruments or bank/card information.

## Reliability And Security

- The Portal must continue operating when HubSpot is unavailable. HubSpot
  synchronization is never in the critical transaction path for access,
  scientific work, result release, or order completion.
- Inbound webhooks are authenticated, replay-safe, idempotent, and processed
  through durable inbox records. Fetch authoritative HubSpot records when a
  notification is only a change signal.
- Outbound Company, Contact, Deal, and Order updates use a durable outbox with
  bounded retry and reconciliation.
- Correlate one Portal organization to the exact HubSpot Company identifier;
  correlate one Portal sale to one HubSpot Order identifier. Names and emails
  are matching aids, not durable identity keys.
- Duplicate, late, and out-of-order events cannot create another tenant, invite,
  entitlement, order, or transition.
- Every access, entitlement, relationship, offboarding, and synchronization
  transition is audited with actor/source, request identifier, timestamp,
  before/after values, and safe failure details.
- Secrets remain in runtime configuration. Logs and audit records contain safe
  identifiers, not access tokens or full sensitive payloads.
- Reconciliation reports missing links, mismatched states, stale sync, and
  repeated failure without silently overwriting Portal authority.

## Implementation Direction

### Backend

- Add a narrow `ICrmProvider` boundary and a HubSpot adapter; do not expose
  HubSpot SDK or property models to account, order, or trial domains.
- Add Portal-owned external-record links for HubSpot Company, Contact, Deal, and
  Order identifiers.
- Add durable integration requests, inbound receipts, outbound messages,
  attempts, status, correlation, and reconciliation state.
- Add organization service entitlements with active periods, source request,
  approver, configuration readiness, and optimistic concurrency.
- Preserve the mutually exclusive organization kind while adding authorized
  Customer-to-Partner and Partner-to-Customer transitions.
- Extend specimen-processing authorization to entitled Partners without
  collecting downstream-customer identity.
- Add configured-price placement for PSeq Lab Service and negotiated-price
  placement for PSeq Kit while preserving their included data-assembly phases,
  immutable commercial snapshots, and the existing QuickBooks boundary.
- Keep sales-assisted work linked to its HubSpot Deal and operational handoff.
- Derive HubSpot sale summaries from authoritative Portal and QuickBooks state;
  never accept HubSpot edits as operational order mutations.

### Frontend

- Replace the mock-only organization administration dependency before claiming
  a connected HubSpot onboarding workflow.
- Add Phaeno integration-request queues and organization-level HubSpot summary.
- Add service-entitlement and readiness review with explicit effective dates.
- Add direct configured-price placement for eligible standard work.
- Add `Request custom work` and `Request account change` with durable success,
  failure, and retry feedback.
- Keep HubSpot context internal and all external-facing labels, errors, and
  feedback internationalization-enabled.

### HubSpot Configuration

- Define the Company, Contact, Deal, Order, and Line Item properties required by
  the approved contract.
- Define the explicit request actions and permissioned workflows for evaluation,
  onboarding, service changes, relationship changes, sales-assisted work, and
  offboarding.
- Configure Company and Order layouts, saved views, reports, and exception
  notifications for Sales.
- Configure least-privilege app scopes, webhook subscriptions, secrets,
  signature verification, sandbox/test records, and credential rotation.
- Validate standard Order creation, Company/Deal associations, line items,
  reporting, and workflow automation in the actual HubSpot subscription before
  finalizing the production contract.

#### Phase 0 Live Deal Pipeline

The Free account's single `Sales Pipeline` was configured and verified on
2026-07-15. HubSpot retained the preexisting internal IDs when the visible
stage names were changed. Integration code and workflow configuration must use
the verified internal IDs rather than deriving identifiers from display names.

| Display stage | Probability | HubSpot internal stage ID |
| --- | ---: | --- |
| Qualified opportunity | 20% | `appointmentscheduled` |
| Scientific and commercial scoping | 40% | `qualifiedtobuy` |
| Proposal or quote sent | 60% | `presentationscheduled` |
| Contract or purchase-order review | 80% | `decisionmakerboughtin` |
| Commitment pending | 90% | `contractsent` |
| Closed Won | 100% | `closedwon` |
| Closed Lost | 0% | `closedlost` |

The probabilities are initial forecasting assumptions and should be
recalibrated after Phaeno has enough real conversion data. Only `Closed Won`
may initiate the approved pending Portal handoff; no stage grants access or
creates an operational order by itself.

The account's automatic `end of this month` close-date default was disabled on
2026-07-15. Sales must enter a realistic expected close date rather than rely on
an artificial month-end forecast. The HubSpot Free form editor exposes the
controls for making `Close date` and the primary Company association mandatory
as disabled, so UI enforcement is pending the post-upgrade capability recheck;
until then both are documented Sales operating rules. The Free Deal form also
disables conditional logic for `Amount`, and no stage requirement was saved;
the post-upgrade check must enforce `Amount` before `Proposal or quote sent` if
the upgraded subscription supports it.

#### Phase 0 Live Property Foundation

The following non-production HubSpot configuration was created and verified on
2026-07-15. Each object has a custom `Phaeno Portal` property group. Blank
Company relationship fields continue to mean that an ordinary HubSpot company
or prospect has no approved Portal relationship.

| Object | Label | Internal name | Type | Values or rule |
| --- | --- | --- | --- | --- |
| Company | Phaeno relationship | `phaeno_portal_relationship` | Dropdown select | `Portal Prospect`, `Customer`, `Partner`; blank means no Portal relationship |
| Company | Portal account status | `phaeno_portal_account_status` | Dropdown select | `Pending review`, `Invitation pending`, `Active`, `Pending change`, `Pending offboarding`, `Inactive` |
| Company | Portal services | `phaeno_portal_services` | Multiple checkboxes | Active labels: `Trial Project`, `Curated demo data`, `PSeq Lab Service`, `PSeq Kit`. HubSpot retained option internal values `Specimen processing` and `Reagent ordering` for the two renamed bundles; legacy `Data assembly` is archived. |
| Company | Portal organization ID | `phaeno_portal_organization_id` | Unique single-line text | Stable Portal system link; not a business identifier |
| Company | Portal readiness | `phaeno_portal_readiness` | Dropdown select | `Not reviewed`, `Pending`, `Ready`, `Blocked`; does not grant access |
| Company | Portal administrator status | `phaeno_portal_admin_status` | Dropdown select | `Not designated`, `Designated`, `Invited`, `Accepted`, `Expired`, `Replaced` |
| Contact | Designated Portal administrator | `phaeno_portal_designated_admin` | Single checkbox | Explicit business designation; does not grant access |
| Contact | Portal user ID | `phaeno_portal_user_id` | Unique single-line text | Stable Portal system link; does not determine permissions |
| Contact | Portal invitation status | `phaeno_portal_invitation_status` | Dropdown select | `Not invited`, `Invited`, `Accepted`, `Expired`, `Replaced` |
| Deal | Requested Portal relationship | `phaeno_portal_requested_relationship` | Dropdown select | `Portal Prospect`, `Customer`, `Partner`; Closed Won still requires review |

The default Company and Contact `Key information` cards and the default Deal
`About this deal` card were updated manually to surface all ten Phaeno Portal
properties on their owning record types.

#### Phase 0 Manual Record Proof

The Free-account baseline was exercised manually and verified in the HubSpot UI
on 2026-07-15 using disposable, non-production records:

- Company `Phaeno Phase 0 — Customer Sample` (HubSpot record ID
  `333656241855`) is a `Customer` with `PSeq Lab Service`, account status
  `Pending review`, readiness `Pending`, administrator status `Designated`, and
  no Portal organization identifier.
- Contact `Phase 0 Customer Admin` (HubSpot record ID `518824150753`) is the
  Company's only associated Contact. It is the designated Portal administrator,
  has invitation status `Not invited`, and has no Portal user identifier.
- Deal `Phaeno Phase 0 — PSeq Lab Service Opportunity` (HubSpot record ID
  `335881126620`) is in `Sales Pipeline` at `Qualified opportunity`, requests a
  `Customer` relationship, has the sample Company as its one `Primary` Company,
  and is associated with the sample Contact. Amount and close date are blank,
  which is allowed at this stage.
- No Portal organization, user, invitation, entitlement, order, access, or
  QuickBooks transaction was created. These records prove only the manual CRM
  contract and associations.

While the Contact was created, HubSpot's email-domain behavior also created an
unintended `example.com` Company and made it the initial association. The
unintended Company was deleted and the intended sample Company association was
verified. Production onboarding must use an explicit Company identifier and
deterministic association rather than trust email-domain matching; the account's
automatic Company creation/association behavior must be reviewed after upgrade.
Creating the associated Deal also advanced HubSpot's standard Company lifecycle
stage to `Opportunity`; the Phaeno relationship property remained `Customer` and
continues to be the authoritative Portal-relationship signal.

The Free-tier ceiling prevented creation of the rest of the approved contract.
After the account upgrade, recheck the exact subscription and limit before
adding:

- Deal request type, requested services, handoff status, request identifier,
  and safe Portal link;
- Order Portal order identifier, workflow type, sale type, operational status,
  amount/currency summary, safe Portal link, QuickBooks summary, and sync state;
- Line Item Portal line identifier and approved service category;
- Company request summary, synchronization health, safe Portal link, and the
  approved aggregate sales and operational summaries; and
- saved views, layouts, workflows, reports, and exception notifications.

No paid-tier workflow automation, CRM scope, webhook, runtime credential,
Portal connection, Order, Line Item, or real business data was created in this
configuration slice. The record-card layouts, Phaeno sales pipeline, and
disposable manual proof records described above are live in the Free account.

## Implementation Phases

### Portal Foundation Implemented 2026-07-15

- The mock Customer administration surface has been replaced with a durable
  Phaeno organization workspace while retaining the existing `/customers`
  route for link compatibility.
- Organization records now carry operational readiness and an internal note.
  Readiness is explicitly separate from membership, data grants, service
  entitlement, and order authorization.
- Dated PSeq Lab Service and PSeq Kit entitlements are implemented with
  configuration state, approval actor, optional source request, overlap
  protection, history-preserving end reasons, audit stamping, and optimistic
  concurrency.
- The source-request selector now offers only approved or applied requests for
  the organization that include the selected service, and the backend enforces
  the same rule. A blank source remains available only as an explicit manual
  exception.
- A durable manual/HubSpot request model and Phaeno review queue now cover
  onboarding, evaluation, service change, relationship change,
  Sales-assisted order, and offboarding. Approval never creates an
  organization, invitation, entitlement, or order; operations must make and
  verify the owning change before marking the request applied.
- The Phaeno UI now provides organization list/detail, readiness, member and
  invitation administration, entitlements, Prospect conversion, and request
  review. Live HubSpot ingestion, outbound status synchronization,
  reconciliation, and paid-tier automation remain Phase 1 work.
- A real-Clerk local acceptance journey was completed on 2026-07-15 against the
  local API and PostgreSQL database. It proved manual pre-organization request
  review, durable association of the applied request to the completed
  organization, designated-administrator invitation, same-identifier Prospect
  conversion to Customer, PSeq Lab Service activation, and final Portal
  readiness. It did not write to HubSpot, QuickBooks, shared environments, or
  an external email provider. Desktop/mobile browser coverage now verifies the
  lifecycle dialogs and eligible request selector, while the rollback-only
  PostgreSQL reference journey verifies source eligibility and entitlement-end
  persistence. Broader authenticated HTTP coverage remains in the living test
  plans.

### Phase 0: Contract And Sandbox Proof

- Use the empty HubSpot Free account as the initial integration lab; do not wait
  for or imply an Enterprise sandbox.
- Inventory the enabled standard objects, property limits, app/API scopes, and
  Free-tier UI/reporting behavior.
- Approve field-level mapping, scopes, request actions, Sales layouts, and
  privacy review.
- Prove Company, Contact, Deal, Order, Line Item, webhook, association, and
  reconciliation behavior in a non-production HubSpot environment.
- After the anticipated Professional upgrade, record the exact Hub subscription
  and revalidate workflow triggers, actions, reports, limits, and permissions
  before moving automation into the production contract.
- Document a manual handoff and recovery path before automation.

### Phase 1: Organization Linking And Pending Onboarding

- Add external identifiers and HubSpot ingestion to the implemented durable
  integration-request queue.
- Ingest evaluation and Closed Won onboarding requests idempotently.
- Add Phaeno review, direct Customer/Partner creation, Portal Prospect creation
  only for approved evaluation, designated-admin invitation, and status return.
- Keep service entitlements explicit and inactive until readiness approval.

### Phase 2: Direct Standard Sales And HubSpot Orders

- Implement configured-price Customer and Partner PSeq Lab Service placement.
- Implement negotiated-price Partner PSeq Kit placement with its included data
  assembly.
- Publish committed PSeq Lab Service and PSeq Kit sales as HubSpot Orders.
- Synchronize QuickBooks-derived invoice/payment summaries and Company totals.

### Phase 3: Custom Work And Account Lifecycle

- Implement Portal-originated custom-work and account-change requests.
- Implement sales-assisted-order handoff from Closed Won Deals.
- Implement service expansion, Customer/Partner relationship change, and
  offboarding review.

### Phase 4: Operational Hardening

- Add full reconciliation, stale-sync monitoring, retry ownership, dashboards,
  digests, exception notifications, runbooks, sandbox regression coverage, and
  production activation evidence.

## Acceptance Scenarios

1. A HubSpot lead or ordinary prospect never appears in the Portal.
2. An approved Trial request creates one pending request and, after approval,
   one Portal Prospect and one invitation despite webhook replay.
3. Closed Won for a direct buyer creates a pending onboarding request, not an
   active tenant. Phaeno approval activates only the selected services.
4. The designated administrator is invited; other HubSpot contacts and later
   Portal members are not synchronized automatically.
5. An entitled Customer places a configured-price PSeq Lab Service directly;
   one HubSpot Order appears after commitment and no HubSpot Deal is created.
6. An entitled Partner places PSeq Lab Service without disclosing any
   downstream customer; the sale and operational record belong to the Partner.
7. A Partner entitled only to PSeq Kit cannot place PSeq Lab Service. Its kit
   purchase includes the corresponding data-assembly workflow, which cannot be
   purchased or activated independently.
8. A bespoke request creates HubSpot Sales work but no Portal order. Closed Won
   later creates one pending sales-assisted handoff.
9. A committed Portal sale shows amount, currency, status, Portal link, and
   high-level payment state in HubSpot without scientific data.
10. A Customer-to-Partner transition preserves tenant identity and history,
    blocks old services for new work at cutover, and activates only approved
    Partner services.
11. A HubSpot termination cannot deactivate an active Portal organization until
    the offboarding review completes.
12. HubSpot outage, duplicate delivery, or outbound failure does not block
    Portal access, order operations, result release, or QuickBooks authority.
13. Two organizations cannot discover or mutate each other's CRM links,
    integration requests, orders, users, specimens, files, or results.
14. A later expected-completion override requires a controlled customer-safe
    reason, preserves the original target, updates the ordering organization's
    Portal timeline, and sends one de-duplicated notification while keeping the
    internal note private.
15. HubSpot shows the current Order-level expected completion and schedule
    health so Sales can understand a delay, but it receives no reason text,
    specimen fact, internal note, or batch detail.

## Success Measures

- time from HubSpot request to Portal review decision and activation;
- percentage of onboarding requests completed without manual data correction;
- duplicate organization, invitation, entitlement, and HubSpot Order count,
  with a target of zero;
- percentage of standard work placed directly versus routed to Sales;
- custom-work request response and Closed Won handoff time;
- HubSpot sale-summary completeness and synchronization freshness;
- PSeq Lab Service receipt-to-acceptance time, acceptance-to-completion TAT by
  offering, original-target adherence, override frequency, and delay-reason
  distribution;
- reconciliation mismatch and retry volume;
- first-order, expansion, cancellation, and offboarding response time; and
- scientific-data or tenant-isolation exposure through HubSpot, with a target
  of zero.

## Definition Of Ready For Implementation

- the HubSpot Free proof account, Super Admin, and integration owner are
  identified, and the required production subscription is determined from the
  proof rather than assumed;
- Company, Contact, Deal, Order, Line Item, and workflow capabilities are proven
  in that account;
- field mapping, request actions, service catalog, configured-price rules,
  payment-summary fields, alerts, and reporting are approved;
- Partner specimen-processing scientific and operational requirements are
  approved in the owning order plan;
- Customer and Partner direct-pricing configurations and Sales-assisted
  exception criteria are approved;
- Portal organization administration, manual request review, and service
  entitlements are implemented on the durable backend; HubSpot ingestion and
  status return remain gated by the integration proof;
- privacy, retention, credential, webhook, retry, reconciliation, and outage
  runbooks are approved;
- backend, frontend, migration, HubSpot configuration, QuickBooks sandbox, E2E,
  deployment, and production-activation scope is explicitly requested.

## Deferred Scope

- automatically importing every HubSpot company, contact, lead, or prospect;
- bidirectional editing of HubSpot commercial fields in the Portal;
- synchronizing ordinary Portal members into HubSpot;
- exposing scientific or specimen-level data in HubSpot;
- collecting a Partner's downstream-customer identity;
- implementing multiple CRM providers;
- replacing QuickBooks with HubSpot accounting or payment authority;
- automated deletion of Portal or HubSpot history during offboarding; and
- Enterprise-only custom objects unless a later proven requirement justifies
  their cost and complexity.
