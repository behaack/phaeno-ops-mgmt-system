# Order Management Plan

Keep this file updated as customer ordering requirements are supplied and
decisions are made.

Do not execute this plan until the product questions in the discovery gate are
resolved and implementation is explicitly requested.

## Status

- Planning state: discovery; business details are pending.
- Requested outcome: allow a customer to place orders in Phaeno Portal.
- No catalog, pricing, approval, payment, fulfillment, or notification behavior
  is assumed yet.

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

- An order belongs to exactly one customer organization.
- The backend derives the customer organization from validated selected-tenant
  context; it does not trust an arbitrary organization id supplied in an order
  payload.
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

- Who receives and fulfills an order: Phaeno, a distributor, a partner, or a
  destination selected per order?
- Can only customer organizations order, or can distributors also order?
- Is there one catalog or a customer/distributor-specific catalog?
- Are prices shown in the portal? If so, are they contractual, tiered, quoted,
  promotional, or calculated elsewhere?
- Does an order require customer-side approval before placement?
- Does Phaeno or a distributor review/accept an order after placement?
- Are purchase-order numbers, cost centers, requisition numbers, or attachments
  required?

### Order Contents

- What is ordered: products, kits, tests, services, subscriptions, data access,
  or another item type?
- Which item attributes must be captured, such as SKU, quantity, unit,
  configuration, requested date, or instructions?
- Are partial quantities, backorders, substitutions, or recurring orders
  supported?
- May users save drafts, duplicate past orders, upload orders, or reorder?
- Are minimum/maximum quantities or other customer-specific constraints needed?

### Shipping, Billing, And Fulfillment

- Are shipping and billing addresses selected from managed address books or
  entered per order?
- Are tax, freight, discounts, currency, and payment terms calculated here or in
  an external system?
- Is online payment in scope, or is ordering performed against invoice/contract
  terms?
- Which fulfillment statuses and customer cancellation rules are required?
- Is there an ERP, CRM, distributor, or fulfillment integration? Which system is
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

The following is a starting shape, not a final schema. Omit fields and entities
that the discovery gate does not justify.

### Order

Candidate responsibilities:

- server-generated `Id` and human-readable `OrderNumber`
- owning `CustomerOrganizationId`
- optional receiving/fulfilling organization or external destination
- `Status`
- customer reference such as purchase-order number, if required
- submitted-by user and placement timestamp
- currency and monetary totals only if the portal owns price calculation
- immutable placement snapshot or an immutable placed revision
- optional external-system identifiers and synchronization state
- audit fields and concurrency `Version`

### OrderLine

Candidate responsibilities:

- parent order id
- stable catalog/product reference when one exists
- item identifier, description, unit, and configuration snapshot
- requested quantity
- unit price, adjustments, tax, and line total only when in scope
- line-level fulfillment status only when partial fulfillment is required

### Supporting Models

Add only when justified by requirements:

- `CatalogItem` and organization-specific availability/pricing
- `OrderAddressSnapshot`
- `OrderStatusEvent` for an append-only customer-visible timeline
- `OrderAttachment` integrated with the file-management design
- `OrderIntegrationAttempt` or an outbox message for reliable external delivery
- `OrderApproval` for customer-side or Phaeno-side approval

## Status Model Direction

Do not finalize statuses before fulfillment requirements are known. A minimal
starting distinction is:

- `Draft`: customer-editable and not yet committed.
- `Placed`: customer submission succeeded and the snapshot is immutable.

Possible later states include `PendingApproval`, `Accepted`, `Rejected`,
`Processing`, `PartiallyFulfilled`, `Fulfilled`, and `Cancelled`. Each transition
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

- `CanViewOrders`
- `CanCreateOrderDrafts`
- `CanPlaceOrders`
- `CanCancelOrders`
- `CanManageOrders`

Expected boundaries:

- Customer users see only orders owned by their selected customer organization.
- Phaeno order operators use an explicit cross-customer operational view.
- A distributor/partner view is deferred until the organization terminology,
  assignment model, and fulfillment responsibility are decided.
- Backend authorization is mandatory even when the UI hides unavailable
  actions.

## API Direction

Final paths and payloads follow the resolved workflow. A likely REST shape is:

- `GET /api/orders`
- `POST /api/orders` to create a draft
- `GET /api/orders/{id}`
- `PATCH /api/orders/{id}` to edit an allowed draft
- `POST /api/orders/{id}/place`
- `POST /api/orders/{id}/cancel`
- Phaeno-only status transition endpoints or commands as required

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

- an Orders navigation item visible only when the selected organization and
  user have order access
- an order list with status, number, submitted date, and relevant total or item
  summary
- a dedicated create/edit workflow rather than an inline form in the list
- a review step that shows the exact placement snapshot
- an order detail page with status history and available actions
- accessible confirmation and error recovery for placement

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

1. Complete the discovery gate and write the accepted workflow, state machine,
   permissions, and integration ownership into this plan.
2. Define API examples, validation rules, and an implementation-ready data
   model; review tenant and audit boundaries.
3. Add backend domain entities, persistence mappings, and a migration only when
   migration work is explicitly requested.
4. Add customer-scoped draft, placement, list, and detail endpoints with unit
   and integration tests.
5. Add the customer order list, create/review flow, and detail UI using real API
   hooks.
6. Add Phaeno operational order management if required.
7. Add notifications and external integrations behind durable delivery
   boundaries.
8. Add reporting, exports, advanced fulfillment, and convenience workflows only
   after the core placement path is proven.

## Verification Plan

When implementation begins, update the running backend, frontend, and e2e test
plans with concrete cases. At minimum cover:

- tenant isolation for list, detail, edit, placement, and cancellation
- capability gates for customer and Phaeno actors
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
- The ordering party, receiving party, and fulfillment source of truth are named.
- The item/catalog and price sources of truth are named.
- Required fields and validations are documented with representative examples.
- The status transition table and cancellation rules are approved.
- Authorization capabilities and Phaeno operational roles are approved.
- Payment, tax, shipping, notification, and integration scope is explicit.
- API contracts and acceptance scenarios are reviewed.

## Deferred Until Details Arrive

- Final data schema and migration shape.
- Final API payloads and endpoint list.
- Catalog and pricing administration.
- Distributor/partner fulfillment workflows.
- Payment processing.
- Shipping, tax, invoicing, and ERP/CRM integrations.
- Notifications, exports, reporting, and document generation.

