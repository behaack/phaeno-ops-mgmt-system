# Order Management Plan

Keep this file updated as customer ordering requirements are supplied and
decisions are made.

Do not execute this plan until the product questions in the discovery gate are
resolved and implementation is explicitly requested.

## Status

- Planning state: discovery; business details are pending.
- Requested outcomes:
  - allow Customers to place lab service orders and track their samples
  - allow Partners to place reagent orders
  - allow Partners to submit data for Phaeno data assembly and retrieve the
    assembled data/results
- Confirmed boundary: Prospect organizations cannot view, create, or place
  orders, including Prospect organization administrators.
- No catalog, pricing, approval, payment, fulfillment, or notification behavior
  is assumed yet.

## Confirmed Product Workflows

### Customer Lab Service Order

- A Customer is an end user of Phaeno laboratory services.
- A Customer places a lab service order through the portal.
- The order involves submission of physical samples to Phaeno's laboratory.
- Phaeno receives and accessions the samples.
- Phaeno analyzes the samples in the laboratory.
- Phaeno processes the resulting data.
- Resulting data is made available to the Customer through the portal.
- The Customer can track the progress of its samples through the portal.

### Partner Reagent Order

- A Partner can place orders for reagents through the portal.
- Reagent ordering is a distinct commercial and fulfillment workflow from a
  Customer lab service order.

### Partner Data Assembly Submission

- A Partner can submit data to Phaeno for data assembly.
- Phaeno processes the submitted data through a data-assembly workflow.
- The assembled data/results produced by Phaeno are made available for the
  Partner to download and provide to its own customers.

These are three distinct workflows. Do not force them into one generic `Order`
entity, status model, or form merely because each begins with a submission.

## Current Repository Baseline

- Tenant context is an organization selected with `X-Organization-Id`.
- Persisted organization kinds currently include `Phaeno` and `Customer`.
- Customer-facing tenant access is represented by an active user, active
  organization, and active organization membership.
- Phaeno administrative work uses explicit platform views rather than switching
  freely into a customer organization.
- Backend features belong under `backend/app/Features/<FeatureName>`.
- Frontend routes stay thin; feature UI belongs under
  `frontend/src/features` and API integration under `frontend/src/api`.
- Mutable records use optimistic concurrency and centralized auditing.
- The current customer administration UI is mock-backed and must not be treated
  as a production order data source.

## Planning Principles

- A Customer lab service order belongs to exactly one Customer organization.
- A Partner reagent order and data assembly submission belong to exactly one
  Partner organization.
- Prospect organizations are ineligible for every order read and write
  capability. Conversion to Customer does not retroactively create orders.
- The backend derives the owning organization from validated selected-tenant
  context; it does not trust an arbitrary organization id supplied in an order
  payload.
- Sample tracking is sample-specific because samples within one lab service
  order may progress independently.
- Laboratory accessioning, analysis, data processing, and data availability are
  explicit traceable stages; they are not one generic "processing" flag.
- Data assembly inputs and outputs are operational records, not seed datasets.
- Customer lab-order samples/results and Partner assembly inputs/results are
  Customer- or Partner-owned operational data. Their access rules are separate
  from the organization-wide rule for Phaeno-owned curated Prospect data.
- Only a user with an explicit order-placement capability may submit an order.
  Being an organization admin alone should not implicitly grant commercial
  authority unless that is an intentional product decision.
- Placing an order is a distinct operation from saving or editing a draft.
- A placed order preserves the commercial facts accepted at placement time.
  Later catalog, description, unit, or price changes must not rewrite history.
- Placement is idempotent so retries cannot create duplicate orders.
- Status changes, totals, and customer-visible history are server-owned.
- Orders are not hard-deleted through normal product workflows.
- Payment-card data must not enter Phaeno Portal unless a separate reviewed
  payment design explicitly requires it.

## Discovery Gate

Resolve and record these decisions before designing the final contract or
creating a migration.

### Commercial Flow

- Which Customer users may create and submit lab service orders?
- Which Partner users may place reagent orders or submit data for assembly?
- Are lab services and reagents organization-specific or drawn from shared
  catalogs?
- Are prices shown in the portal? If so, are they contractual, tiered, quoted,
  promotional, or calculated elsewhere?
- Does either order type require organization-side approval before placement?
- What Phaeno review or acceptance occurs for lab service orders, reagent
  orders, and data assembly submissions?
- Are purchase-order numbers, cost centers, requisition numbers, or attachments
  required?

### Order Contents

- Which lab service, sample metadata, submission instructions, and requested
  analyses are required for a lab service order?
- Which sample identifiers are Customer-provided, Phaeno-generated during
  accessioning, or both?
- Which reagent identifiers, quantities, units, and configurations are required
  for a Partner reagent order?
- Which file formats, metadata, validation, and assembly instructions are
  required for a Partner data assembly submission?
- Are partial quantities, backorders, substitutions, or recurring orders
  supported?
- May users save drafts, duplicate past orders, upload orders, or reorder?
- Are minimum/maximum quantities or other customer-specific constraints needed?

### Shipping, Billing, And Fulfillment

- How are physical samples shipped or delivered to Phaeno, and what receipt or
  chain-of-custody information must Customers see?
- How are reagents shipped to Partners, and are shipping and billing addresses
  selected from managed address books or entered per order?
- Are tax, freight, discounts, currency, and payment terms calculated here or in
  an external system?
- Is online payment in scope, or is ordering performed against invoice/contract
  terms?
- Which cancellation, rejection, insufficient-sample, rework, and partial-
  completion rules apply to lab orders and individual samples?
- Which reagent fulfillment, backorder, and cancellation rules apply?
- Which data assembly rejection, correction, and resubmission rules apply?
- Is there an ERP, CRM, partner, or fulfillment integration? Which system is
  the source of truth after submission?

### Communications And Reporting

- Who receives submission, acceptance, rejection, shipment, and cancellation
  notifications?
- Which documents are produced or attached, such as a confirmation, packing
  slip, invoice, or certificate?
- What search, export, operational dashboard, and audit-history views are
  required?
- What retention policy applies to orders and their documents?

## Proposed Domain Direction

Use separate feature-owned aggregates for the three workflows. Share small
primitives only where their meaning and lifecycle are genuinely identical.

### LabServiceOrder

Candidate responsibilities:

- server-generated identity and human-readable order number
- owning Customer organization
- requested lab service and submission instructions
- `Status`
- customer reference such as purchase-order number, if required
- submitted-by user and placement timestamp
- immutable submitted-order snapshot
- optional external-system identifiers and synchronization state
- audit fields and concurrency `Version`

### LabSample

Each submitted sample is a traceable child record with its own progression:

- parent lab service order
- Customer-provided sample identifier and required sample metadata
- Phaeno accession identifier assigned at receipt
- current sample status and timestamps for traceable stages
- requested analysis and processing context
- result/data availability without exposing storage details
- rejection, exception, or rework reason when applicable

### PartnerReagentOrder

Candidate responsibilities:

- owning Partner organization and ordering user
- reagent line snapshots, quantities, units, and configuration
- shipping, billing, price, and payment facts only when confirmed in scope
- placement and fulfillment status/history
- external fulfillment identifiers when applicable
- audit fields and concurrency `Version`

### DataAssemblyRequest

Candidate responsibilities:

- owning Partner organization and submitting user
- submitted input files/data and immutable intake manifest
- assembly instructions and validation results
- processing status, version/provenance, and exception history
- completed assembled data/results authorized to that Partner
- audit fields and concurrency `Version`

### Supporting Models

Add only when justified by requirements:

- `CatalogItem` and organization-specific availability/pricing
- `OrderAddressSnapshot`
- workflow-specific status events for append-only Customer/Partner timelines
- `OrderAttachment` integrated with the file-management design
- `OrderIntegrationAttempt` or an outbox message for reliable external delivery
- `OrderApproval` for customer-side or Phaeno-side approval
- `SampleStatusEvent` for sample-level laboratory traceability
- `AssemblyInput` and `AssemblyOutput` integrated with managed file storage

## Status Model Direction

Do not finalize statuses before laboratory and fulfillment requirements are
known. Candidate stage families are:

- Lab service order: draft, submitted, awaiting samples, in progress, results
  available, completed, cancelled.
- Individual lab sample: expected, received, accessioned, in lab analysis, data
  processing, data available, completed, rejected or otherwise blocked.
- Reagent order: draft, placed, accepted, processing, shipped/fulfilled,
  cancelled or rejected.
- Data assembly request: draft, submitted, intake validation, processing,
  output available, completed, rejected or cancelled.

Exact terms and transition rules require further discovery. Each transition
must define:

- authorized actor and tenant context
- allowed source states
- required reason or supporting data
- whether the customer may still edit or cancel
- notifications and external integration effects
- audit and concurrency behavior

## Authorization Direction

Define capability booleans in session output rather than relying on frontend
role-name checks. Candidate capabilities are:

- `CanViewLabServiceOrders`
- `CanCreateLabServiceOrders`
- `CanSubmitLabServiceOrders`
- `CanViewSampleProgress`
- `CanPlaceReagentOrders`
- `CanSubmitDataAssemblyRequests`
- `CanDownloadDataAssemblyOutputs`
- Phaeno operational capabilities for accessioning, lab progress, data
  processing, reagent fulfillment, and assembly processing

Expected boundaries:

- Customer users see only orders owned by their selected customer organization.
- Customer users see sample progress and released data only for their selected
  Customer organization.
- Prospect users do not receive order capabilities or order navigation.
- Partner users see only reagent orders, assembly submissions, and downloadable
  outputs owned by their selected Partner organization.
- Customer and Partner organization administrators manage member access to
  their organization-owned samples, results, assembly inputs, and assembly
  outputs. Authorized Phaeno administrators may provide audited support.
- Phaeno order operators use an explicit cross-customer operational view.
- Backend authorization is mandatory even when the UI hides unavailable
  actions.

## API Direction

Final paths and payloads follow the resolved workflows. Keep endpoint groups
separate for:

- Customer lab service orders and sample tracking
- Partner reagent orders and fulfillment status
- Partner data assembly requests, inputs, progress, and outputs
- Phaeno-only accessioning and workflow-transition commands

Contract requirements:

- Use the shared `ApiResponse<T>` envelope and standard error mapping.
- Require the selected organization header for customer-scoped requests.
- Require the last-read version for mutable updates and return `409 Conflict`
  for stale writes.
- Require an idempotency key for placement and any external submission command.
- Return validation errors at field or line-item level without exposing another
  tenant's data.
- Paginate and filter order lists from the first production implementation.

## Frontend Direction

Customer-facing surfaces will likely include:

- a Lab services navigation item visible only to eligible Customer users
- a lab service order list and dedicated create/review workflow
- a lab service order workspace with samples and their individual progress
- clear receipt/accession, analysis, processing, and data-availability stages
- a review step that shows the exact placement snapshot
- resulting data access from the relevant order/sample workspace
- accessible confirmation and error recovery for placement

Partner-facing surfaces will likely include:

- a Reagent orders list, create/review workflow, detail, and fulfillment history
- a Data assembly list and dedicated submission workflow with file validation
- durable assembly progress, correction requests, and completed output downloads

Phaeno-facing surfaces will likely include:

- a cross-customer order queue with filters and search
- order detail and authorized status-management actions
- external integration state and retry/escalation visibility when applicable

Use React Hook Form, TanStack Query hooks, Shadcn components, responsive layouts,
and WCAG 2.2 AA behavior. Destructive or irreversible actions require explicit
confirmation. Do not use inline create/edit forms inside order lists.

## Reliability, Audit, And Security

- Write an explicit audit event for draft creation, placement, cancellation,
  approval/rejection, status changes, and external-system synchronization.
- Treat placement and its immutable snapshot as one transaction.
- Use an outbox or equivalent durable handoff if placement triggers email or an
  external system; do not make order integrity depend on a synchronous provider
  call.
- Generate order numbers server-side with a uniqueness strategy that works
  under concurrency.
- Validate all catalog and pricing facts on the server at placement time.
- Avoid storing unnecessary personal, shipping, billing, or health data.
- Apply retention and access rules to attachments and generated documents.
- Log operational identifiers without logging sensitive order contents.

## Implementation Phases

1. Complete discovery for the Customer lab service order and sample lifecycle,
   Partner reagent fulfillment, and Partner data assembly workflow.
2. Define API examples, validation rules, and an implementation-ready data
   model; review tenant and audit boundaries.
3. Add backend domain entities, persistence mappings, and a migration only when
   migration work is explicitly requested.
4. Implement Customer lab service order submission and sample tracking as one
   validated vertical slice.
5. Implement Partner reagent ordering as a separate vertical slice.
6. Implement Partner data assembly submission and output delivery as a separate
   vertical slice backed by managed file storage.
7. Add notifications and external integrations behind durable delivery
   boundaries.
8. Add reporting, exports, advanced fulfillment, and convenience workflows only
   after the core placement path is proven.

## Verification Plan

When implementation begins, update the running backend, frontend, and e2e test
plans with concrete cases. At minimum cover:

- tenant isolation for list, detail, edit, placement, and cancellation
- sample-level progress isolation and traceability across multi-sample orders
- Customer access to completed lab data without access to another Customer's data
- Partner reagent ordering without Customer lab-service capabilities
- Partner assembly input/output isolation and authorized downloads
- capability gates for customer and Phaeno actors
- denial of all order list, detail, draft, and placement access for Prospects
- draft validation and server-side item revalidation
- idempotent placement under retries and concurrent requests
- immutable placed-order snapshots
- optimistic concurrency conflicts
- allowed and rejected status transitions
- external handoff failure and retry without duplicate orders
- list filters, empty/loading/error states, and responsive UI
- keyboard flow, focus management, validation announcements, and automated
  accessibility checks
- the complete customer journey from draft through confirmed placement

Do not run tests or execute the test plans until explicitly requested.

## Definition Of Ready For Implementation

- The discovery gate is answered.
- Required lab services, sample metadata, accessioning rules, laboratory stages,
  and data-release rules are documented with representative examples.
- Reagent catalog, fulfillment, shipping, and commercial rules are documented.
- Data assembly inputs, validation, processing, and downloadable outputs are
  documented with representative examples.
- The three workflow transition tables and cancellation/rejection rules are
  approved.
- Authorization capabilities and Phaeno operational roles are approved.
- Payment, tax, shipping, notification, and integration scope is explicit.
- API contracts and acceptance scenarios are reviewed.

## Deferred Until Details Arrive

- Final data schema and migration shape.
- Final API payloads and endpoint list.
- Catalog and pricing administration.
- Detailed reagent fulfillment workflows.
- Detailed laboratory accessioning and processing rules.
- Detailed data assembly input and output rules.
- Payment processing.
- Shipping, tax, invoicing, and ERP/CRM integrations.
- Notifications, exports, reporting, and document generation.
