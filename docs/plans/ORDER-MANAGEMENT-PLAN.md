# Order Management Plan

Keep this file updated as Customer and Partner ordering requirements are
supplied and decisions are made.

The initial-release discovery and implementation were completed on 2026-07-14.
Product direction expanded on 2026-07-15 through the HubSpot lifecycle plan.
Those new changes are not authorized for implementation by this plan alone.

On 2026-07-16, `LAB-OPERATIONS-PLAN.md` separated Commercial Operations from an
internal, replaceable Lab Operations provider. That internal application scope
is now feature-complete: accepted quote/cancellation handoff, roles, operator
workflows, Laboratory persistence, and durable customer-safe projections are
implemented. This plan remains authoritative for commercial ordering, pricing,
files, payment, and publication; laboratory execution follows the Lab
Operations plan and contract. Pipeline and scientific-file ownership remain a
separate major TBD.

## Status

- Development state: the approved initial-release workflows are implemented in
  the backend, frontend, and local PostgreSQL schema. Customer laboratory,
  Partner reagent, Partner data-assembly, and Phaeno operations/configuration
  surfaces are present.
- Approved future direction: entitled Customers and Partners may place a
  configured-price PSeq Lab Service directly; it always bundles specimen
  processing with data assembly. An entitled Partner may place a PSeq Kit,
  which always bundles its reagents/kits with data assembly. Data assembly is
  not separately sellable because it has no value without the corresponding
  PSeq Lab Service or PSeq Kit inputs.
  Partners may submit specimens without identifying any downstream customer.
  Bespoke work routes through HubSpot. These changes are not implemented.
- Required pre-production alignment: the implemented standalone Partner
  data-assembly commercial workflow is superseded. It must become the included,
  kit-linked assembly phase of PSeq Kit; the existing Customer laboratory flow
  must become PSeq Lab Service with its included assembly phase. Preserve the
  operational records and validation where useful, but remove independent
  assembly entitlement, pricing, quoting, placement, and ordering.
- Order Management persistence is included in the clean
  `20260716220428_InitialPSeqOperations` baseline applied to the rebuilt
  Development database. The former feature migrations were intentionally
  replaced during the approved disposable-database reset.
- The Commercial-owned provider-neutral Lab Operations v1 contract, registered
  internal provider, atomic quote-acceptance/cancellation routing, durable
  Commercial projections, and complete internal Lab operator workflow now
  exist. Twenty-two Laboratory-owned tables live in `lab_ops`; Commercial
  authorization/projection/receipt records remain in `commercial_ops`. Existing
  customer order, quote, file, payment, and publication records remain
  authoritative for their Commercial responsibilities in `commercial_ops`.
- Verification state: the prior clean-baseline backend, frontend, and
  desktop/mobile suites passed. The complete Lab slice has a clean backend
  build, frontend lint/typecheck and client/SSR build, and applied local
  migrations. Five opt-in provider/projection tests and four controller handoff
  tests are authored and compile but have not been executed; the remaining Lab
  API, frontend, and database-backed browser coverage stays in the living test
  plans.
- Production activation is not complete or implied. It still requires approved
  real scientific definitions/profiles and shipping rules, production storage
  and malware scanning, QuickBooks/Postmark credentials and sandbox validation,
  deployment configuration, runbooks, and the deferred authenticated database-
  backed/contract test suites recorded in the owning test plans.
- Requested outcomes:
  - allow Customers and entitled Partners to place PSeq Lab Service and track
    its specimen-processing and assembly phases
  - allow entitled Partners to place PSeq Kit and submit the resulting data for
    its included assembly phase
  - allow entitled Partners to submit PSeq Lab Service specimens without
    disclosing a downstream-customer identity
- Confirmed boundary: Prospect organizations cannot view, create, or place
  orders, including Prospect organization administrators.
- A separately approved Prospect Trial Project may authorize bounded sample
  submission for no-charge try-before-you-buy work. It is not an order, quote,
  invoice, or general Prospect capability and is owned by
  `PROSPECT-TRIAL-PROJECT-PLAN.md`.
- Initial ordering authority is organization-admin-only. Active Customer
  organization administrators may create and place Customer lab service orders;
  active Partner organization administrators may create and place enabled
  Partner specimen, reagent, and data-assembly work.
- Active non-admin Customer and Partner members may view their selected
  organization's orders, track progress, and download released results or
  outputs, but they cannot create drafts, place orders, submit assembly work, or
  cancel an order.
- A separately assignable purchaser/order-placer role is deferred. The initial
  release intentionally uses the existing organization-admin boundary rather
  than adding a new membership permission model.
- QuickBooks Online is the only implemented external business system. HubSpot
  is the selected relationship CRM and planned integration target, but it is
  not connected today. There is no separate order-management, ERP, LIMS,
  laboratory workflow, fulfillment, invoicing, or contract-management system
  outside Phaeno Portal.
- Specifically, Phaeno currently has no ERP and no third-party LIMS. QuickBooks
  Online must not be modeled as either one. The fit-for-purpose internal Lab
  Operations module in `LAB-OPERATIONS-PLAN.md` is implemented behind the
  replaceable provider boundary.
- Do not design a handoff to an assumed external operational system. The portal
  is the operational system of record for confirmed ordering, sample receipt
  and accessioning, laboratory progress, data processing and release, reagent
  fulfillment, and data assembly state.
- QuickBooks Online is the source of truth for billable service and reagent
  items and their base prices. Phaeno staff maintain those commercial facts in
  QuickBooks Online, not in Phaeno Portal.
- The portal synchronizes QuickBooks billable items and base prices read-only,
  links them to portal-owned scientific and workflow definitions, and preserves
  the accepted item identifiers, descriptions, units, and prices in the
  immutable placement snapshot.
- Partner reagent orders use set, organization-specific negotiated pricing; a
  Partner must not see or place an order using another organization's pricing.
- Authorized Phaeno users maintain negotiated Partner reagent prices in the
  Phaeno configuration area, linked to synchronized QuickBooks items. Each
  negotiated price has effective dates and audit history.
- Placement uses the active price for that Partner and snapshots the QuickBooks
  item reference, description, unit, quantity, negotiated unit price, and line
  total. QuickBooks receives the actual negotiated price used by the order.
- In the current implementation, Customer lab-service pricing is determined per
  job. The approved next direction adds configured-price placement for standard
  work while retaining Sales-assisted pricing for bespoke work.
- The approved catalog, pricing, approval, payment, fulfillment, file,
  notification, reporting, and retention defaults are defined below.

## Approved Next Commercial Entry Direction

`HUBSPOT-PORTAL-LIFECYCLE-PLAN.md` owns the end-to-end commercial handoff. When
implementation is explicitly requested, this plan must be expanded into exact
transition, pricing, API, migration, UI, and rollout changes before modifying
the current order aggregates.

- A direct Portal order is standard, configured, entitlement-checked work. The
  complete price is shown before commitment and no Sales negotiation is needed.
- Standard Customer and Partner PSeq Lab Service uses a configured bundle price
  and places specimen processing plus data assembly as one commercial product.
  Scientific intake validation still occurs before laboratory work begins.
- The PSeq Lab Service selling unit is one accepted specimen. Commercial Line
  Item quantity equals the accepted specimen count. Each configured offering
  defines the processing and data output included per specimen. Unusual
  specimens, output requirements, failed-input remediation, and bespoke
  analysis route to Sales-assisted work.
- Small standard PSeq Lab Service orders use the configured per-specimen price
  without a customer-specific minimum batch charge. Phaeno may assign eligible
  specimens from multiple customer orders to one internal laboratory batch to
  economize operations. This never merges the customer orders, commercial
  snapshots, HubSpot Orders, QuickBooks records, tenant ownership, files, or
  results, and no external organization can discover another participant.
- The published PSeq Lab Service turnaround window starts at Phaeno specimen
  acceptance. Cross-customer batching must occur within that window and cannot
  leave an accepted specimen waiting indefinitely. Each organization may see
  only its own order progress and expected timing, never the internal batch
  composition or another organization's participation.
- Each PSeq Lab Service offering has its own published turnaround range. The
  Portal displays that range before commitment and preserves it in the order's
  commercial snapshot. It is an operating target, not a guaranteed service
  level, unless the governing contract explicitly states otherwise.
- Specimen acceptance calculates the target completion date and enables
  internal at-risk alerts. A Phaeno user with `CanManageLabOperations` may
  override the current expected completion date with a required reason. The
  audit history preserves the original and revised dates, actor, timestamp, and
  reason. The ordering organization sees its current expected timing without
  receiving internal batch-composition information.
- An override that moves the expected completion date later automatically
  updates the Portal and emails the ordering organization with the revised date
  and a customer-safe reason. An earlier date updates the Portal without an
  email. The audit history retains the notification content and delivery state;
  customer communication never reveals internal batch composition.
- The controlled customer-facing reasons are `Laboratory scheduling
  adjustment`, `Additional processing or quality review`, `Equipment or supply
  interruption`, `Specimen or shipping issue`, `Customer action required`, and
  `Other operational delay`. The last reason requires a customer-safe note.
  Operations may record a separate internal note that is never copied to an
  organization timeline, email, HubSpot, QuickBooks, or generated document.
- Later-date notifications go to the order contact and active organization
  administrators, with duplicate recipients suppressed. Notification failure
  is visible and retryable to Phaeno but does not undo the authoritative date
  revision.
- HubSpot receives only the Order-level current expected completion date and
  schedule health (`On track`, `At risk`, `Delayed`, or `Complete`). Delay
  reason text, internal notes, specimen facts, and laboratory batch details do
  not cross the CRM boundary.
- TAT reporting retains the quoted offering range, original target date,
  current expected date, override history, and actual completion date. An
  override does not change the original-target performance baseline. The Portal
  also measures receipt-to-acceptance separately from acceptance-to-completion
  so intake delay remains visible.
- Standard Partner PSeq Kit uses the active organization-specific negotiated
  commercial bundle for its reagents/kits plus data assembly.
- One PSeq Kit purchase creates one commercial order with two independently
  tracked operational phases: kit fulfillment, followed by data submission and
  assembly. The included assembly phase does not create another quote, order,
  invoice, HubSpot Order, or commercial commitment.
- Each purchased PSeq Kit unit includes exactly one assembly case for data
  produced by that kit. Corrected or replacement files for the same case are
  versioned resubmissions and do not consume another entitlement or create a
  new commercial purchase.
- Purchasing multiple PSeq Kit units creates the same number of separately
  identified assembly cases. A Partner may submit the cases at different times;
  each case has independent intake, processing, exception, completion, and
  result-release state beneath the single commercial order.
- An unused assembly case expires 90 days after its kit's labeled expiration
  date. When no expiration is recorded, the fallback is 12 months after
  shipment. The Portal shows the applicable deadline before and after purchase.
  Authorized Phaeno staff may grant an audited extension with a reason; an
  extension does not create a second sale or assembly entitlement.
- Delivering every physical kit changes the order summary to `Kit fulfilled /
  assembly pending` while any included assembly case remains open. The PSeq Kit
  order becomes operationally `Completed` only after every included case has
  results released, expires unused, or is formally cancelled. Financial and
  payment status remains separately derived from QuickBooks.
- Each PSeq Kit unit is invoiced through QuickBooks when it ships. A partial
  shipment invoices only the shipped units and one commercial order may
  therefore associate with multiple shipment invoices. Every invoice line
  preserves the PSeq Kit bundle price, including its assembly entitlement;
  data submission and assembly completion never create a second invoice.
- An unused or expired assembly case does not automatically create a refund or
  credit because assembly is not separately purchased. Any financial adjustment
  applies to the PSeq Kit bundle and requires an approved return, defect,
  cancellation, or documented commercial exception.
- Replacing a defective or damaged PSeq Kit unit is an audited substitution
  beneath the original commercial order. Its existing assembly case transfers
  to the replacement kit; the original unit is marked replaced, and no extra
  entitlement, sale, HubSpot Order, or invoice is created unless the Partner
  purchases an additional unit.
- The purchasing Partner organization remains the tenant owner of each PSeq Kit
  unit, assembly case, submitted data, and released result even when the Partner
  supplies the kit downstream. The entitlement cannot transfer to another
  Portal tenant. An optional Partner reference remains opaque, and Phaeno does
  not require or infer the downstream customer's identity.
- The Portal may retain separate specimen, shipment, and assembly operational
  records, states, assignments, and validation. Quotes, accepted commercial
  snapshots, QuickBooks mapping, and HubSpot summaries must preserve the
  approved PSeq Lab Service or PSeq Kit bundle instead of presenting its
  components as separately purchased standard lines.
- Data assembly is never a separately sold standard path. It is an included
  operational phase of PSeq Lab Service or PSeq Kit.
- Unsupported specimens, analyses, files, quantities, deliverables, discounts,
  SLAs, or terms route to `Request custom work` and a HubSpot Deal.
- Closed Won custom work creates a pending sales-assisted-order handoff for
  Phaeno operational validation; it does not silently create active work.
- Every committed Portal sale publishes a relationship-safe HubSpot Order
  summary. Routine direct orders do not create HubSpot Deals.
- Partner specimen work belongs to the Partner. The Portal neither requires nor
  infers a downstream-customer identity; an optional PO or project reference is
  opaque Partner data.

## Implemented Initial-Release Workflows

The workflows below describe current application behavior. Their manual
per-job Customer and assembly pricing remains in force until the approved next
commercial direction is implemented and verified.

### Customer Lab Service Order

- A Customer is an end user of Phaeno laboratory services.
- A Customer organization administrator first creates a lab-service request and
  submits it to Phaeno for job-specific pricing. This request is not yet a
  placed order.
- Phaeno reviews the submitted job, determines its itemized job-specific price,
  and issues a quote through the portal.
- A Customer organization administrator reviews and explicitly accepts the
  quote. Quote acceptance places the lab-service order and freezes the accepted
  commercial snapshot, including synchronized QuickBooks item identifiers,
  descriptions, units, quantities, and job-specific prices.
- QuickBooks Online receives the corresponding estimate/invoice information;
  the portal remains the operational source for the order and laboratory work.
- The Customer job lifecycle is `Draft request`, `Submitted for quote`, `Quote
  in preparation`, `Quote issued`, `Placed/Awaiting samples`, `In progress`,
  `Results available`, and `Completed`.
- Phaeno may return a submitted request to the Customer for changes or decline
  it with a Customer-visible reason. Returning it reopens only the request facts
  needed for correction; no quote or placement snapshot is silently rewritten.
- A Customer organization administrator may withdraw a lab-service request
  immediately before quote acceptance.
- After quote acceptance, the Customer submits a cancellation request with a
  reason. Cancellation is not immediate: Phaeno approves or declines it based
  on sample receipt and work already performed, with a Customer-visible outcome.
- Authorized Phaeno operators may cancel a placed job directly with a Customer-
  visible reason. Any resulting charge, credit, or invoice adjustment is managed
  through QuickBooks Online and linked back to the portal record.
- Customer quotes default to 30 calendar days of validity. Authorized Phaeno
  users manage this global default in a Phaeno configuration area.
- The configured validity period is copied into the quote when it is issued.
  Changing the configuration never changes an already-issued quote or its
  expiration date.
- An authorized Phaeno user may override the expiration for an individual quote.
  The selected date is visible to the Customer and the override is audited.
- Issuing a Customer quote creates or synchronizes the corresponding QuickBooks
  estimate through a durable integration boundary.
- Customer quote acceptance atomically records the Commercial placement and
  authorizes the linked Lab work; either both commit or neither commits. It does
  not immediately create an invoice. Phaeno converts or synchronizes the
  accepted estimate to a QuickBooks invoice when the portal job is marked
  completed.
- Scientific completion and Customer release are separate states. Completing
  laboratory/data processing may make results internally ready without making
  them downloadable by the Customer.
- Customer-safe Lab milestones, schedule health, expected timing, action counts
  and summaries, and reviewer-permitted QC are read from Commercial-owned
  projections. Ready for release never creates or publishes a result file.
- A Customer with approved credit uses Net 30 terms. Phaeno may release completed
  results when they are scientifically ready without waiting for invoice payment.
- A Customer without approved credit cannot receive or download results until
  the linked QuickBooks invoice is confirmed paid. The portal shows that results
  are ready but held for payment without exposing the files.
- Credit approval is an audited per-Customer setting managed by authorized
  Phaeno users in the Phaeno configuration area. The initial value is not
  inferred from organization kind or administrator status.
- QuickBooks Online remains authoritative for the linked invoice, Net 30 terms,
  balance, and paid status consumed by the portal's release gate.
- For a Customer without approved credit, the portal displays the synchronized
  QuickBooks invoice status and a QuickBooks-hosted payment link. Payment-card
  and bank-account data never enters or passes through Phaeno Portal.
- Quote revisions are immutable. Issuing a revision supersedes the prior quote,
  and only the latest unexpired quote may be accepted.
- Physical samples are normally sent only after quote acceptance. The placed
  order provides the Customer with sample-submission instructions and enters an
  awaiting-samples stage.
- If physical samples arrive before quote acceptance, Phaeno records their
  receipt and chain-of-custody facts but places them on commercial hold. No
  laboratory work may begin until an authorized Customer administrator accepts
  the quote.
- Customer administrators may record carrier, tracking number, and ship date.
  The Customer-visible custody timeline includes those supplied shipping facts,
  Phaeno receipt date/time, receipt condition or exception, accession identifier,
  current sample stage, and timestamped stage history.
- Receiving employee, internal storage location, and internal operational notes
  are restricted to authorized Phaeno users and never appear in Customer-facing
  contracts or notices.
- Authorized Phaeno users manage default sample-submission instructions in the
  Phaeno configuration area, including laboratory address, packing, labeling,
  temperature, safety, and carrier guidance.
- Portal-owned analysis definitions may add analysis-specific submission
  requirements. Quote acceptance snapshots the complete applicable instruction
  set so later configuration changes do not rewrite a placed job.
- Phaeno receives and accessions the samples.
- Every requested sample has a required Customer-provided sample identifier that
  is unique within its lab-service request/order. The same Customer identifier
  may appear in another order without collision.
- At physical receipt, Phaeno assigns a separate globally unique accession
  identifier. Both identifiers remain immutable, visible, and searchable in
  Customer and authorized Phaeno tracking views.
- Each requested sample requires its Customer sample identifier, sample/material
  type, biological source or species, quantity and unit, storage/handling
  requirements, requested analysis, and a safety/biohazard declaration.
- Collection date, concentration, and Customer notes are optional sample fields.
- Patient identifiers and unnecessary personal or health data are prohibited in
  sample metadata and free-text instructions.
- One Customer lab-service request/order may contain multiple samples. Each
  sample may request one or more active Phaeno analysis definitions linked to
  synchronized QuickBooks billable items.
- Phaeno may refine the proposed per-sample analysis set while preparing the
  job-specific quote. Customer acceptance freezes the final per-sample analyses,
  quantities, units, and prices in the placement snapshot.
- Phaeno analyzes the samples in the laboratory.
- Phaeno processes the resulting data.
- Resulting data is made available to the Customer through the portal.
- The Customer can track the progress of its samples through the portal.
- Each sample progresses independently through `Expected`, `Received`,
  `Accessioned`, `Lab analysis`, `Data processing`, `Data available`, and
  `Completed`.
- Authorized Phaeno operators control sample transitions. Every transition is
  timestamped and retained in a Customer-visible history.
- `On hold` and `Rejected` are exception states. Entering either state requires
  a Customer-safe reason; internal notes remain separate. Customers cannot
  change sample status.
- Result availability and release are sample-specific. For credit-approved
  Customers, Phaeno may release each sample's result files as soon as that sample
  reaches `Data available`.
- Customers without approved credit may see that sample results are ready but
  cannot download any job result until the completed job's QuickBooks invoice
  is confirmed paid.
- A Customer lab-service job reaches `Completed` only when every sample is
  completed, rejected, or otherwise closed in a terminal outcome.
- When a sample is insufficient or unusable, Phaeno places it `On hold` with a
  Customer-visible reason and may request a replacement.
- A replacement sample remains in the same job, receives its own Customer and
  Phaeno accession identifiers, and is explicitly linked to the preserved
  rejected/insufficient original sample.
- Phaeno may initiate documented rework on the same sample without erasing prior
  status history. Any replacement or rework that changes price or scope requires
  a new immutable quote revision and Customer acceptance before added work.

### Partner Reagent Order

- A Partner can place orders for reagents through the portal.
- Reagent ordering is a distinct commercial and fulfillment workflow from a
  Customer lab service order.
- A Partner organization administrator must provide a purchase-order number
  before placement. The purchase-order number is frozen in the placement
  snapshot and synchronized to the linked QuickBooks transaction.
- Partner organization administrators maintain their organization's shipping
  address book in the portal and select an address for each reagent order.
- Placement freezes the selected shipping address in the order snapshot so
  later address-book changes do not alter an existing order.
- QuickBooks Online remains the system of record for billing addresses. Phaeno
  may place an order on hold during review when its shipping address is invalid
  or subject to a shipping restriction.
- A reagent order can contain one or more lines. Each line selects an active
  reagent explicitly made available to that Partner and records a quantity in
  the reagent's configured selling unit or increment.
- Reagent lines may include an optional note. Free-text products, custom units,
  and manual price overrides are not allowed at placement.
- Phaeno may fulfill a reagent order in partial shipments. Fulfillment is
  tracked by line and quantity, and the Partner can see shipped and remaining
  quantities plus an estimated ship date when known.
- Unfulfilled quantities remain visible as backordered. Phaeno cannot substitute
  a different reagent without explicit approval from a Partner organization
  administrator.
- Reagent orders may be saved as drafts. The initial release does not schedule
  automatically recurring orders or accept bulk order uploads.
- A Partner administrator may create a new draft from a prior order. The new
  draft never copies the prior purchase-order number and must revalidate current
  item availability, negotiated prices, quantity rules, and shipping address
  before placement.
- Partner-specific offering configuration may set minimum, maximum, and order-
  increment quantities. The server revalidates every constraint at placement.
- The Partner may cancel a draft or a placed order that Phaeno has not accepted.
  After acceptance, the Partner submits a cancellation request. Phaeno may
  approve all or only the unshipped remainder, or decline the request, with a
  Partner-visible reason. Shipped quantities are never erased.
- Each shipment records shipped quantities by line, carrier, service when
  known, tracking number, ship date, and the reagent lot or batch identifier.
  Expiration is recorded and shown when the supplied reagent has one.
- Phaeno selects the carrier and service during fulfillment. A Partner may add
  a requested-delivery date and shipping instructions, but neither is a Phaeno
  commitment until confirmed. Integrated rate shopping, label purchasing,
  delivery guarantees, returns, and RMA workflows are deferred.
- The reagent-order lifecycle is `Draft`, `Placed`, `Under review`, `Accepted`,
  `Processing`, `Partially shipped`, `Shipped`, and `Fulfilled`, with `On hold`,
  `Cancellation requested`, `Cancelled`, and `Rejected` exception outcomes.

### Partner Data Assembly Submission

- A Partner organization administrator creates a resumable draft, selects an
  active Phaeno-managed assembly profile, provides the profile-required
  metadata and instructions, and uploads input files to managed portal storage.
- Submission freezes an immutable input-manifest revision containing file names,
  sizes, checksums, scan results, profile/version, metadata, and instructions.
- Phaeno performs intake validation. Phaeno may return the request for
  correction with field/file-specific reasons or reject it with a Partner-
  visible reason. A correction creates a new preserved input revision; it never
  mutates the submitted manifest.
- Data assembly is priced per job. After successful intake validation, Phaeno
  issues an itemized quote. A Partner administrator supplies a purchase-order
  number and accepts the current unexpired quote to place the work.
- Quote issuance creates or synchronizes a QuickBooks estimate. Completion
  creates or synchronizes the QuickBooks invoice. Quote revision, expiration,
  commercial snapshot, and payment-link behavior follow the Customer lab quote
  rules unless a rule below explicitly differs.
- Phaeno processes the accepted request and records the assembly profile and
  processing/pipeline version, provenance, QC outcome, and generation time.
- An output release is immutable and contains a manifest plus one or more
  scanned, checksummed result files. A corrected replacement is a new output
  release; prior releases and their audit history remain preserved.
- The assembled data/results produced by Phaeno are made available for the
  Partner to download and provide to its own customers. Phaeno Portal does not
  collect the Partner's end-customer identities or deliver files directly to
  them in the initial release.
- Release follows an audited per-Partner credit setting: credit-approved
  Partners use Net 30 and may download scientifically ready outputs after the
  completion invoice synchronizes; Partners without approved credit see that
  outputs are ready but cannot download them until QuickBooks confirms payment.
- A Partner administrator may withdraw before quote acceptance. After
  acceptance it requests cancellation, and Phaeno approves, partially approves,
  or declines according to work already performed, with a visible reason and
  any financial adjustment handled in QuickBooks.
- The data-assembly lifecycle is `Draft`, `Submitted`, `Intake validation`,
  `Changes requested`, `Quote in preparation`, `Quote issued`, `Placed/Queued`,
  `Processing`, `Output review`, `Output available`, and `Completed`, with `On
  hold`, `Cancellation requested`, `Cancelled`, and `Rejected` exception
  outcomes.

These are three distinct workflows. Do not force them into one generic `Order`
entity, status model, or form merely because each begins with a submission.

## Current Repository Baseline

- Tenant context is an organization selected with `X-Organization-Id`.
- Current code implements `Phaeno`, `Customer`, `Prospect`, and `Partner`
  organization kinds. Older prose that still describes Prospect or Partner as
  plan-only is stale and must be corrected with the implementation slice.
- Customer-facing tenant access is represented by an active user, active
  organization, and active organization membership.
- Phaeno administrative work uses explicit platform views rather than switching
  freely into a customer organization.
- Backend features belong under `backend/app/Features/<FeatureName>`.
- Frontend routes stay thin; feature UI belongs under
  `frontend/src/features` and API integration under `frontend/src/api`.
- Mutable records use optimistic concurrency and centralized auditing.
- The connected Phaeno organization workspace is authoritative for durable
  organization-scoped administration. The standalone global User management
  preview is not a production order or account data source.
- The repository implements the OrderManagement domain, QuickBooks provider
  boundary, durable commercial and notification dispatch, operational file
  records, local file storage adapter, scan and release states, and all three
  confirmed workflow surfaces. Production QuickBooks, object storage, malware
  scanning, and notification delivery still require approved runtime
  configuration and validation.
- Order-management files remain separate from the data-provisioning aggregate
  while following the same environment-scoped storage, checksum, scan, audit,
  and tenant-authorization principles.

## Planning Principles

- A Customer lab service order belongs to exactly one Customer organization.
- A Partner reagent order and data assembly submission belong to exactly one
  Partner organization.
- Prospect organizations are ineligible for every order read and write
  capability. A project-specific Trial Project authorization may permit bounded
  sample submission without granting order access. Conversion to Customer does
  not retroactively create orders.
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
- Prospect Trial Project samples/results are also operational data with their
  own organization- and project-scoped rules. They are not Customer orders and
  are not curated Prospect sample packages.
- Only an active organization administrator receives an order-placement or
  assembly-submission capability in the initial release. This is an intentional
  product decision; organization membership alone never grants commercial
  authority.
- Placing an order is a distinct operation from saving or editing a draft.
- For Customer lab services, submitting a request for pricing is also distinct
  from placement. Only explicit acceptance of Phaeno's issued quote places the
  order.
- A placed order preserves the commercial facts accepted at placement time.
  Later catalog, description, unit, or price changes must not rewrite history.
- Placement is idempotent so retries cannot create duplicate orders.
- Status changes, totals, and customer-visible history are server-owned.
- Orders are not hard-deleted through normal product workflows.
- Payment-card data must not enter Phaeno Portal unless a separate reviewed
  payment design explicitly requires it.

## Approved Product Decisions

The discovery gate is closed. The following decisions are approved defaults for
the initial release and replace the open questions previously held in this
section.

The later PSeq bundle decision above supersedes every statement in this section
that treats Partner data assembly as a separately entitled, quoted, priced, or
placed commercial service. Those statements continue to describe the current
implemented workflow only; they are not production-approved behavior and must
be translated into the included assembly phase of PSeq Kit during the required
pre-production alignment.

### Commercial Flow

- An eligible organization does not require a second internal approval after an
  organization administrator acts. The administrator's submit, accept, place,
  substitution-approval, or cancellation-request action is the organization's
  authoritative action.
- Customer lab work and Partner data assembly are priced per job through an
  immutable Phaeno quote. Partner reagents use the active organization-specific
  negotiated price at placement.
- Customer and assembly quotes default to 30 calendar days. The default is
  configuration; each issued quote snapshots its expiration and may have an
  audited per-quote override. Only the latest unexpired revision is acceptable.
- After initial acceptance, added or changed Customer lab or Partner assembly
  scope uses an immutable change-quote revision. Acceptance appends an order
  amendment without rewriting the original placement; the added work remains
  blocked until acceptance. Decline leaves the existing accepted scope intact.
- A Customer lab request has one optional Customer reference/PO field. Cost
  centers, requisition numbers, and commercial attachments are not required in
  the initial release.
- A Partner reagent order requires a PO number at placement. A Partner data-
  assembly request requires a PO number at quote acceptance. PO values are
  immutable commercial snapshots and synchronize to QuickBooks.
- Lab, reagent, and assembly drafts are resumable. The initial release supports
  create-from-prior only for reagent orders, with complete revalidation and no
  copied PO number. Scheduled recurring orders, bulk uploads, and automatic
  reorders are deferred.
- QuickBooks Online is the only commercial integration. It owns billable items,
  base prices, customer billing addresses, estimates, invoices, taxes, freight,
  discounts, currency, terms, balances, payment state, and hosted payment links.
- The portal uses one connected QuickBooks company and snapshots the currency
  returned by QuickBooks. It does not perform currency conversion or negotiate
  multi-currency pricing.
- Portal-issued Customer and assembly quotes are not visible or acceptable until
  the corresponding QuickBooks estimate has synchronized successfully.
- Reagent placement creates or synchronizes a QuickBooks estimate. The local
  order remains valid if QuickBooks is temporarily unavailable, but Phaeno
  cannot accept or fulfill it until commercial synchronization succeeds.
- Customer and assembly completion creates or synchronizes a QuickBooks invoice.
  A credit-approved Customer may download each scientifically ready sample
  result before the overall job completes or its invoice exists. A credit-
  approved Partner assembly output waits for the completion invoice to
  synchronize, but not for payment.
- Reagent invoices are created from shipped quantities, allowing separate
  invoices for partial shipments. Partner reagent fulfillment is invoice-on-
  shipment under the Partner's QuickBooks terms; the initial release has no
  additional portal payment gate for shipment.
- QuickBooks Online API progress invoicing is not supported and an Estimate may
  link to only one Invoice. Reagent shipment invoices are therefore standalone
  QuickBooks invoices containing the portal reagent-order number, shipment
  number, and PO reference; the portal relates all of them to the placement
  Estimate through `CommercialDocumentLink` records instead of unsupported
  QuickBooks progress-invoice links.
- QuickBooks is authoritative for tax, freight, discount, and invoice totals.
  The portal preserves the accepted product/service line facts separately. A
  post-placement reagent commercial revision that increases the Partner's total
  requires explicit Partner-administrator approval before Phaeno acceptance.
- The portal never receives card or bank credentials and does not implement a
  checkout surface. It displays synchronized status and QuickBooks-hosted links.

### Catalog And Configuration

- A scheduled and manually triggerable read-only sync imports active QuickBooks
  billable items, descriptions, sales units, base prices, currency, and stable
  external identifiers. Deactivated QuickBooks items cannot be used for new
  work but remain readable in historical snapshots.
- Authorized Phaeno users link synchronized QuickBooks items to active portal-
  owned analysis definitions, reagent offerings, and assembly service/quote
  definitions. Scientific instructions and workflow rules remain portal-owned.
- A Partner reagent offering explicitly selects eligible Partner organizations,
  negotiated unit price, effective dates, selling unit, order increment,
  optional minimum/maximum, and shipping restrictions. Overlapping active price
  periods for one Partner/item are prohibited.
- Customer credit approval and Partner assembly credit approval are separate,
  audited organization settings. Approval means Net 30 result/output release;
  absence of approval means release only after QuickBooks confirms payment.
- Authorized Phaeno users manage quote-validity defaults, sample-submission
  instructions, result and assembly profiles, Partner shipping restrictions,
  and order-notification settings in a configuration area. Every consequential
  configuration change is versioned or audited and never rewrites a placed
  snapshot.

### Customer Lab-Service Contents

- Required sample fields are Customer sample identifier, sample/material type,
  biological source/species, quantity and unit, storage/handling requirements,
  requested analysis, and safety/biohazard declaration. Collection date,
  concentration, and Customer notes are optional.
- Patient identifiers and unnecessary personal or health data are prohibited in
  fields, notes, and files. The initial release is not a PHI intake workflow.
- One request may include multiple samples. Each sample may include one or more
  active analyses. Phaeno may refine them while quoting; quote acceptance freezes
  the final sample, analysis, quantity, unit, instruction, and price snapshot.
- The Customer sample identifier is unique within the job. Phaeno assigns a
  globally unique accession identifier at receipt. Both remain immutable,
  visible, and searchable.
- An active analysis definition specifies the required intake fields, applicable
  submission instructions, supported result-artifact kinds, and validation
  rules. As a representative non-production contract, an analysis may produce a
  human-readable report, tabular results, and a machine-readable data archive,
  each with file metadata, checksum, provenance, and generation time.
- Exact production analyses and scientifically valid result formats are Phaeno-
  approved configuration content. A production analysis cannot be activated
  until its real instructions, allowed file kinds, required result artifacts,
  and validation rules have been reviewed; synthetic fixtures may be used for
  implementation and automated tests.

### Partner Reagent Contents

- An order has one or more lines. Each line selects an active reagent offering
  available to the selected Partner and supplies a valid quantity in the
  configured selling unit/increment. An optional line note is allowed.
- Free-text products, custom units, and manual price overrides are prohibited.
  The server revalidates item activity, Partner availability, effective price,
  unit, increment, minimum, maximum, and address restrictions at placement.
- Fulfillment is recorded at line-and-quantity level. A shipment allocation may
  include the original line, quantity, reagent lot/batch, expiration when one
  applies, packing-slip reference, carrier, service, tracking number, and ship
  date.
- Partial shipments and backorders are supported. The Partner sees shipped and
  remaining quantities and an estimated ship date when known.
- A substitute creates an append-only proposed order adjustment. It identifies
  the original and proposed reagent, quantity, price/total effect, and reason.
  Nothing is substituted until a Partner administrator approves it; approval
  updates QuickBooks and preserves both the placement snapshot and adjustment.

### Partner Data-Assembly Contents

- Phaeno manages versioned assembly profiles. A profile defines its name,
  description, instructions, required metadata schema, allowed file kinds,
  individual and total size limits, manifest rules, validation rules, expected
  output contract, and whether the profile is active for a Partner.
- Every submission requires a Partner project/reference name, active assembly
  profile/version, profile-required scientific context, requested output, input
  files, and confirmation that the package contains no prohibited identifiers or
  unnecessary personal/health data. Processing notes are optional.
- Managed upload derives storage keys, sizes, checksums, and scan status on the
  server. Submission is blocked while a file is missing, disallowed, unscanned,
  scanning, unavailable, failed, or rejected.
- The submitted input manifest is immutable. A correction creates a new revision
  that references the prior revision and explains the change; prior files and
  validation results remain preserved.
- A representative non-production profile accepts one required synthetic primary
  data file and optional supporting metadata, requires a project reference and
  source/reference version, and produces an output manifest, assembled synthetic
  data file, and QC summary. This validates workflow behavior without asserting
  a real scientific format.
- Exact production file kinds, schemas, scientific validators, size limits, and
  output definitions are activation-time Phaeno scientific configuration. A
  production profile cannot be activated until those values are supplied and
  approved, but they do not require a different order-management schema.
- Every output release identifies the source input revision, assembly profile
  and version, processing/pipeline version, QC status, provenance, generated
  time, file list, sizes, and checksums. Downloads are authorized and audited.

### Shipping, Billing, And Fulfillment

- Customer sample shipping is carrier-agnostic in the initial release. Phaeno
  provides snapshotted instructions; Customers may record carrier, tracking,
  and ship date. The portal does not buy labels, calculate rates, or guarantee a
  service level.
- Early-arriving samples are received and tracked but placed on commercial hold
  until quote acceptance. Chain-of-custody and internal-vs-Customer-visible
  boundaries follow the confirmed workflow above.
- Partner administrators maintain a portal shipping-address book. A selected
  address is snapshotted at placement. Billing addresses remain in QuickBooks.
- Phaeno selects reagent carrier and service. A Partner may request a delivery
  date and add shipping instructions. International, temperature-controlled,
  hazardous, or otherwise restricted shipping is allowed only when both the
  reagent offering and destination configuration permit it; otherwise the order
  is blocked at placement or placed on hold with a visible reason.
- Customer lab jobs and Partner assembly jobs create QuickBooks invoices at
  completion. Credit-approved Customers use Net 30 and may receive each sample's
  ready files before overall job completion. Credit-approved Partners may
  receive ready assembly outputs after completion-invoice synchronization.
  Organizations without applicable credit see readiness and the hosted payment
  link but cannot download until the completed invoice is paid.
- A lab job may complete when every sample has a terminal outcome, including a
  documented rejection or approved cancellation. Completed unaffected samples
  retain their results. Financial changes use a quote revision before added work
  or a QuickBooks credit/adjustment for removed work.
- A reagent draft or unaccepted placed order may be cancelled immediately by a
  Partner administrator. After acceptance, cancellation is a request; Phaeno
  may cancel all or only unshipped quantities. Shipped quantities and shipment
  history remain immutable.
- An assembly draft or unaccepted submission may be withdrawn. After quote
  acceptance, cancellation is a request; Phaeno may approve, partially approve,
  or decline based on work performed, and QuickBooks records any adjustment.
- Phaeno may place any active workflow on hold with a tenant-safe reason and
  separate internal notes. Release from hold is an audited Phaeno action.

### Communications And Documents

- The acting organization administrator receives portal activity and email for
  submission/placement, changes requested, quote issued or revised, acceptance,
  rejection, cancellation outcome, and commercial holds. Because the initial
  submitter is an administrator, duplicate administrator fan-out is suppressed.
- All organization administrators receive high-impact notices: cancellation by
  Phaeno, result/output release or payment hold, reagent substitution request,
  shipment/backorder, and a result/output correction or withdrawal.
- Non-admin members do not receive transactional email by default. They see the
  organization timeline and can access released files while their membership is
  active.
- Appropriate Phaeno operational queues receive new submissions, cancellation
  requests, holds, validation failures, work awaiting action, overdue work, and
  failed QuickBooks or notification delivery.
- Notification delivery uses an outbox/durable retry boundary. A delivery
  failure is visible to Phaeno but never rolls back the authoritative action.
- QuickBooks estimates, invoices, credits, and payment links remain authoritative
  QuickBooks documents linked from the portal; the portal does not generate a
  competing invoice.
- Portal records provide printable/downloadable immutable snapshots: lab quote
  and sample-submission manifest, reagent order confirmation and per-shipment
  packing slip, assembly submission/validation receipt and output manifest.
  Generated documents contain tenant-safe facts and never internal notes.

### Search, Reporting, Audit, And Retention

- Tenant lists support server-side paging and filtering by workflow, status,
  order/request number, date, and submitter. Lab search also supports Customer
  sample id and accession id; reagent search supports PO, item, and tracking;
  assembly search supports Partner project reference, PO, and profile.
- Phaeno receives cross-organization operational queues for quote preparation,
  sample intake, holds, result release, reagent review/backorders/shipments,
  assembly validation/processing, cancellations, overdue actions, and failed
  integrations.
- Initial export is CSV metadata for the current authorized filtered list. It
  excludes file bytes, internal notes, payment credentials, and another tenant's
  data. Bulk document/file export and scheduled reporting are deferred.
- Tenant users see a curated, Customer/Partner-safe timeline. Authorized Phaeno
  users see the full audit history, internal operational notes, configuration
  changes, and integration attempts.
- The initial release performs no automatic deletion. Orders, quotes, commercial
  snapshots, status histories, manifests, documents, input/output/result files,
  and download audit records are retained indefinitely and are never hard-
  deleted through normal workflows.
- Discarding an unsubmitted draft soft-deactivates and hides it from default
  lists while preserving its minimal record, audit, and managed files under the
  same no-automatic-deletion policy.
- A later retention or exceptional purge design must receive separate product,
  legal/compliance, tenant-notice, and referential-integrity review before any
  cleanup is enabled. Cancellation, rejection, replacement, supersession, and
  deactivation do not delete history.

### External-System Boundary

- Phaeno Portal is the operational source of truth. QuickBooks Online is the
  commercial source of truth. No ERP, CRM, LIMS, warehouse, laboratory,
  fulfillment, payment, carrier, or external partner portal is assumed.
- QuickBooks integration is adapter-based and durable. Every outbound command
  has an idempotency key, local integration state, retry history, last error,
  and linked external identifier. Inbound item/payment synchronization is also
  idempotent.
- User actions commit local workflow state and an outbox message atomically.
  QuickBooks outages surface `Commercial sync pending` or `Commercial sync
  failed`; they do not create duplicate local work or duplicate QuickBooks
  transactions.
- Phaeno operators can retry failed synchronization and see reconciliation
  mismatches. A mismatch never silently changes a placement, quote, shipment,
  invoice link, or release decision.
- QuickBooks webhooks are acknowledged promptly and queued for asynchronous,
  idempotent processing. Because events may be missed or arrive out of order, a
  scheduled Change Data Capture reconciliation runs from the last successful
  checkpoint in addition to the normal webhook/item-sync flow.
- Verified QuickBooks technical references:
  - [Linked transactions](https://developer.intuit.com/app/developer/qbo/docs/workflows/manage-linked-transactions)
    documents the one-Invoice-per-Estimate API constraint and lack of progress
    invoicing support.
  - [Webhook configuration](https://developer.intuit.com/app/developer/qbo/docs/develop/webhooks/configure-webhooks)
    documents OAuth-connected companies, verifier handling, supported entities,
    and event payloads.
  - [Webhook best practices](https://developer.intuit.com/app/developer/qbo/docs/develop/webhooks/best-practices)
    recommends asynchronous processing and Change Data Capture reconciliation.

## Implementation-Ready Domain Direction

Use separate feature-owned aggregates for the three workflows. Do not create a
generic `Order` aggregate or one shared status enum. Share only infrastructure
and value objects whose meaning is actually identical.

All persisted identifiers use UUID primary keys named `Id` in C# and snake_case
database identifiers. Mutable roots use centralized audit stamping and numeric
optimistic-concurrency `Version`. Immutable revisions and status events are
append-only.

### Shared Commercial And Operational Support

- `QboCatalogItem`: read-only local projection of the QuickBooks item id, name,
  description, active state, type, sales unit, base price, and currency.
- `AnalysisDefinition`: versioned portal definition linking scientific intake,
  instructions, validation, expected results, and one or more QuickBooks items.
- `PartnerReagentOffering`: Partner/item availability, negotiated price and
  effective dates, selling constraints, and shipping restrictions.
- `AssemblyProfile`: versioned input metadata/file contract, validation rules,
  instructions, and expected output contract, linked to quoteable QuickBooks
  items.
- `OrganizationCommercialProfile`: audited Customer lab-credit and Partner
  assembly-credit decisions plus the linked QuickBooks customer identifier.
- `CommercialDocumentLink`: workflow id, document kind, QuickBooks id, document
  number, URL when safe, sync state, totals/currency, and timestamps. It stores
  references and display facts, not payment credentials.
- `OrderOutboxMessage` and `OrderIntegrationAttempt`: durable idempotent
  QuickBooks/notification delivery, retries, reconciliation, and last error.
- `ManagedOperationalFile`: order-owned logical reference to the general managed
  file service. Storage keys remain server-owned and are never exposed as
  authorization identifiers.

### Customer Lab-Service Aggregate

`LabServiceOrder` is the root from draft through completion and owns:

- server identity and unique human-readable `LAB-` number
- owning Customer organization and creating/submitting users
- optional Customer reference/PO
- workflow state, submitted/placed/completed timestamps, and cancellation state
- immutable request revisions and placement snapshot
- current quote revision and linked QuickBooks documents
- Customer-safe status summary, internal assignment/notes, audit, and `Version`

Supporting records are:

- `LabServiceRequestRevision`: immutable submitted sample/analysis/instruction
  facts, linked to the previous revision when corrected.
- `LabServiceQuote` and `LabServiceQuoteLine`: immutable numbered revisions,
  initial/change purpose, issue/expiry/supersession/acceptance facts, itemized
  prices/totals/currency, accepted amendment effect, and QuickBooks estimate
  link.
- `LabSample`: Customer sample id, accession id, required metadata, receipt and
  condition facts, current operational status, replacement/rework lineage, and
  `Version`.
- `LabSampleAnalysis`: analysis-definition/version snapshot and its final quoted
  quantity/unit/commercial-line linkage.
- `SampleStatusEvent`: append-only transition, actor, time, tenant-safe reason,
  internal note, and supporting receipt/processing facts.
- `LabResultRelease` and `LabResultArtifact`: immutable release/version,
  scientific readiness, commercial release state, profile/provenance/QC facts,
  managed files, checksums, generation/release times, and download history.
- `LabCancellationRequest`: requested scope/reason, decision, decided actor/time,
  and QuickBooks adjustment link.

### Partner Reagent Aggregate

`PartnerReagentOrder` owns:

- server identity and unique human-readable `REAG-` number
- owning Partner organization and creating/placing users
- required PO number, optional requested-delivery date and shipping instructions
- selected shipping-address snapshot
- immutable placement snapshot and current operational status
- line-level fulfillment totals, current hold/cancellation facts, audit, and
  `Version`

Supporting records are:

- `PartnerShippingAddress`: Partner-managed active address-book entry with audit
  and concurrency; historical orders reference only the immutable snapshot.
- `PartnerReagentOrderLine`: QuickBooks item/offering/version snapshot,
  description, unit, quantity, negotiated unit price, currency, and line total.
- `ReagentShipment` and `ReagentShipmentLine`: shipment/packing-slip number,
  carrier/service/tracking/ship date and per-line quantity, lot/batch, and
  optional expiration.
- `ReagentOrderAdjustment`: append-only substitution or commercial revision,
  reason, before/after facts, Partner decision, and QuickBooks sync state.
- `ReagentOrderStatusEvent`: append-only status, hold, backorder, cancellation,
  acceptance, and fulfillment history with tenant-safe and internal reasons.
- `ReagentCancellationRequest`: requested scope, remaining eligible quantity,
  Phaeno decision, and linked QuickBooks adjustment.

### Partner Data-Assembly Aggregate

`DataAssemblyRequest` owns:

- server identity and unique human-readable `ASM-` number
- owning Partner organization and creating/submitting users
- Partner project reference, active profile/version, workflow status, assignment,
  current quote/release, audit, and `Version`
- required PO at quote acceptance and linked QuickBooks documents

Supporting records are:

- `AssemblyInputRevision`: immutable metadata/instruction manifest, correction
  reason, previous-revision link, submitter/time, and validation summary.
- `AssemblyInputFile`: managed-file reference, logical role, original file name,
  size, checksum, content/file kind, scan state, and validation results.
- `DataAssemblyQuote` and `DataAssemblyQuoteLine`: same immutable quote invariants
  and initial/change purpose as Customer lab work, scoped to the assembly
  request.
- `AssemblyProcessingRun`: profile and pipeline versions, started/completed
  times, operator, provenance, QC outcome, failure/hold facts, and retry lineage.
- `AssemblyOutputRelease` and `AssemblyOutputFile`: immutable release/version,
  source input revision/run, manifest, result files, checksums, readiness,
  commercial release state, and download history.
- `AssemblyStatusEvent` and `AssemblyCancellationRequest`: append-only workflow,
  correction, rejection, hold, cancellation, and release decisions.

## Approved Transition Contracts

Statuses describe operational progress. Quote state, QuickBooks sync state,
payment state, and file release state remain separate so the product never hides
a commercial or scientific hold inside one overloaded status.

Every command validates the selected tenant, capability, allowed source state,
last-read `Version`, required reason/data, and idempotency key when applicable.
Every successful command appends an audit/status event in the same transaction.

### Customer Lab-Service Order

| State | Authorized next action | Result |
| --- | --- | --- |
| `Draft request` | Customer admin edits, submits, or withdraws | Submission creates an immutable request revision and moves to `Submitted for quote`; withdrawal moves to `Cancelled`. |
| `Submitted for quote` | Phaeno quote operator starts pricing, requests changes, or declines | Moves to `Quote in preparation`, `Changes requested`, or `Declined`; changes/decline require a Customer-safe reason. |
| `Changes requested` | Customer admin creates a corrected revision, resubmits, or withdraws | Resubmission returns to `Submitted for quote`; prior revision remains immutable. |
| `Quote in preparation` | Phaeno quote operator issues, requests changes, or declines | Issue creates an immutable quote and QuickBooks estimate; state becomes `Quote issued` only after sync succeeds. |
| `Quote issued` | Customer admin accepts latest unexpired quote or withdraws; Phaeno may issue a revision | Acceptance freezes the placement snapshot and moves to `Placed/Awaiting samples`; revision supersedes the prior quote. Expiry is derived from the quote date and blocks acceptance. |
| `Placed/Awaiting samples` | Phaeno receives/accessions samples; Customer admin may request cancellation | Receipt progresses individual samples; first active laboratory work moves the job to `In progress`. |
| `In progress` | Phaeno advances samples, releases eligible results, holds/rejects samples, or decides cancellation | Any downloadable result exposes the `Results available` milestone; the job continues until all samples are terminal. |
| `Results available` | Phaeno continues remaining samples or completes the job | This Customer-visible milestone may coexist with remaining work. |
| `Cancellation requested` | Phaeno approves all/part, declines, or requests clarification | Approved scope is closed and QuickBooks adjusted; declined scope returns to its prior operational state. |
| `Completed` | No normal operational transition | Every sample is terminal and invoice sync is initiated. File release may still show `Payment required` or `Commercial sync pending`. |
| `Cancelled` / `Declined` | No normal operational transition | History and any received sample/financial facts remain preserved. |

### Individual Lab Sample

| State | Phaeno-controlled transition and evidence |
| --- | --- |
| `Expected` | `Received` requires received time and condition; early receipt may add a commercial hold. |
| `Received` | `Accessioned` assigns the immutable globally unique accession id and records receiving facts. |
| `Accessioned` | `Lab analysis` records the authorized start and analysis context. |
| `Lab analysis` | `Data processing` records completion/handoff facts or enters `On hold`/`Rejected` with reason. |
| `Data processing` | `Data available` requires a scientifically ready, scanned, checksummed result release and provenance. |
| `Data available` | `Completed` closes the sample operationally; commercial release is evaluated separately. |
| `On hold` | Resume to the recorded prior state, link a replacement, or move to `Rejected`; every decision requires a reason. |
| `Rejected` | Terminal for that sample. A replacement is a new linked sample; prior history is never rewritten. |

### Partner Reagent Order

| State | Authorized next action | Result |
| --- | --- | --- |
| `Draft` | Partner admin edits, places, or discards the unplaced draft | Placement validates and freezes item/price/address/PO facts and moves to `Placed`; discard soft-deactivates the draft. |
| `Placed` | System begins QuickBooks sync; Partner admin may cancel | Successful commercial sync moves to `Under review`; failure remains visible/retryable. |
| `Under review` | Phaeno fulfillment operator accepts, holds, rejects, or Partner admin cancels | Acceptance moves to `Accepted`; any increased commercial revision requires Partner approval first. |
| `Accepted` | Phaeno starts fulfillment, holds, or decides a cancellation request | Start moves to `Processing`. |
| `Processing` | Phaeno records shipment, backorder, hold, substitution proposal, or cancellation decision | Partial allocation moves to `Partially shipped`; all active quantity shipped moves to `Shipped`. |
| `Partially shipped` | Phaeno adds shipments, updates ETA, proposes substitution, or closes approved remainder | Repeats until no active remaining quantity, then moves to `Shipped` or `Cancelled` for a fully cancelled remainder. |
| `Shipped` | Phaeno performs operational closeout | Moves to `Fulfilled`; delivery confirmation is not required in the initial release. |
| `On hold` | Phaeno releases to the recorded prior state, rejects, or cancels eligible scope | Requires visible reason and separate internal notes. |
| `Cancellation requested` | Phaeno approves unshipped scope, partially approves, or declines | Shipped facts stay immutable; approved financial changes synchronize to QuickBooks. |
| `Fulfilled` / `Cancelled` / `Rejected` | No normal operational transition | Retained as immutable commercial and fulfillment history. |

`Backordered` is a derived line/order condition when accepted quantity remains
unallocated after a shipment or Phaeno review; it is not a destructive status
transition. Estimated ship dates may be revised with an audited event.

### Partner Data-Assembly Request

| State | Authorized next action | Result |
| --- | --- | --- |
| `Draft` | Partner admin edits/uploads, submits, or discards the unsubmitted draft | Submission freezes an input revision and moves to `Submitted`. |
| `Submitted` | System starts scan/manifest checks | Moves to `Intake validation`; incomplete scan/checks remain blocking and visible. |
| `Intake validation` | Phaeno assembly operator accepts intake for pricing, requests changes, or rejects | Moves to `Quote in preparation`, `Changes requested`, or `Rejected` with field/file-specific tenant-safe reasons. |
| `Changes requested` | Partner admin creates a corrected revision, resubmits, or withdraws | Resubmission returns to `Submitted`; prior revisions remain immutable. |
| `Quote in preparation` | Phaeno quote operator issues, requests changes, or rejects | Issue creates the immutable quote and QuickBooks estimate; visibility waits for successful sync. |
| `Quote issued` | Partner admin supplies PO and accepts latest unexpired quote or withdraws; Phaeno may revise | Acceptance freezes the validated input/profile/commercial snapshot and moves to `Placed/Queued`. |
| `Placed/Queued` | Phaeno assembly operator starts processing, holds, or decides cancellation | Start creates a processing run and moves to `Processing`. |
| `Processing` | Phaeno records progress, failure/retry, hold, cancellation, or sends output to review | Successful processing moves to `Output review`. |
| `Output review` | Phaeno approves an immutable output release or sends it back to processing | Approval creates the release, starts completion invoice sync, and moves to `Output available`. |
| `Output available` | System evaluates invoice sync, credit, and payment gates; Phaeno closes work | Eligible members can download only when release gates pass; closeout moves to `Completed`. |
| `On hold` | Phaeno returns to the recorded prior state, rejects, or cancels | Requires a Partner-safe reason. |
| `Cancellation requested` | Phaeno approves all/part or declines | Work and financial history remain preserved; approved adjustments synchronize to QuickBooks. |
| `Completed` / `Cancelled` / `Rejected` | No normal operational transition | Corrected output after completion creates a new immutable release, not a status rewind. |

An accepted lab or assembly job does not rewind to `Quote issued` for a scope
change. Phaeno issues a parallel immutable change quote, QuickBooks synchronizes
the amended commercial document, and the organization administrator accepts or
declines it. Only the accepted amendment becomes eligible work; existing work,
status, and the original placement snapshot remain unchanged.

## Approved Authorization Contract

Expose explicit capability booleans in session output. Frontend role-name checks
are never an authorization boundary.

External-organization capabilities:

- `CanViewLabServiceOrders`
- `CanCreateLabServiceRequests`
- `CanSubmitLabServiceRequests`
- `CanAcceptLabServiceQuotes`
- `CanRequestLabServiceCancellation`
- `CanViewSampleProgress`
- `CanDownloadLabResults`
- `CanViewReagentOrders`
- `CanCreateReagentOrders`
- `CanPlaceReagentOrders`
- `CanApproveReagentSubstitutions`
- `CanRequestReagentCancellation`
- `CanViewDataAssemblyRequests`
- `CanCreateDataAssemblyRequests`
- `CanSubmitDataAssemblyRequests`
- `CanAcceptDataAssemblyQuotes`
- `CanRequestDataAssemblyCancellation`
- `CanDownloadDataAssemblyOutputs`

Phaeno operational capabilities:

- `CanViewAllOperationalOrders`
- `CanManageOrderConfiguration`
- `CanQuoteLabServiceWork`
- `CanManageLabOperations`
- `CanManageReagentFulfillment`
- `CanManageDataAssembly`
- `CanManageOrderIntegrations`
- `CanViewOrderAudit`

Initial capability outcomes:

| Actor | Outcome |
| --- | --- |
| Active Customer administrator | Customer create, edit, submit, quote-acceptance, cancellation-request, read, tracking, and eligible result-download capabilities for the selected active Customer. |
| Active Customer non-admin member | Customer read, tracking, and eligible result-download capabilities only. |
| Active Partner administrator | Partner reagent and assembly create, edit, place/submit, quote/substitution approval, cancellation-request, read, and eligible download capabilities for the selected active Partner. |
| Active Partner non-admin member | Partner reagent/assembly read, progress, and eligible assembly-output download capabilities only. |
| Prospect member or administrator | No order-management capability or navigation. |
| Platform administrator | Every Phaeno operational capability in the initial release, exercised through explicit platform views. |

- A dedicated Phaeno staff-role assignment model is deferred. The API still
  checks the explicit operational capability so later role assignment does not
  require rewriting workflow authorization.
- Active membership grants organization-wide read access to that organization's
  operational orders; there are no per-order member grants in the initial
  release. Organization administrators control that access through membership
  management.
- Tenant endpoints require the selected `X-Organization-Id`, validate active
  actor/membership/organization and correct organization kind, and derive the
  owner from that context. Client-supplied owner ids are ignored or rejected.
- Phaeno cross-organization work occurs only through platform routes and
  capabilities. Switching the selected organization never grants Phaeno
  operational authority.
- Backend authorization is mandatory for lists, details, commands, documents,
  and each file download. UI visibility is convenience only.

## Approved API Contract

Keep endpoint groups feature-owned and separate. These paths define the initial
contract shape; implementation may make naming-only refinements without changing
the approved behavior.

Tenant Customer routes:

- `GET|POST /api/lab-service-orders`
- `GET|PATCH /api/lab-service-orders/{orderId}`
- `POST /api/lab-service-orders/{orderId}/submit-for-quote`
- `POST /api/lab-service-orders/{orderId}/withdraw`
- `POST /api/lab-service-orders/{orderId}/quotes/{quoteId}/accept`
- `POST /api/lab-service-orders/{orderId}/cancellation-requests`
- `GET /api/lab-service-orders/{orderId}/samples/{sampleId}/results`
- `GET /api/lab-service-orders/{orderId}/results/{artifactId}/download`

Tenant Partner reagent routes:

- `GET|POST /api/reagent-orders`
- `GET|PATCH /api/reagent-orders/{orderId}`
- `POST /api/reagent-orders/{orderId}/place`
- `POST /api/reagent-orders/{orderId}/cancel`
- `POST /api/reagent-orders/{orderId}/cancellation-requests`
- `POST /api/reagent-orders/{orderId}/adjustments/{adjustmentId}/decision`
- `GET /api/reagent-orders/{orderId}/shipments`
- `GET|POST /api/partner-shipping-addresses`
- `PATCH|DELETE /api/partner-shipping-addresses/{addressId}`

Tenant Partner assembly routes:

- `GET|POST /api/data-assembly-requests`
- `GET|PATCH /api/data-assembly-requests/{requestId}`
- `POST /api/data-assembly-requests/{requestId}/inputs`
- `DELETE /api/data-assembly-requests/{requestId}/inputs/{inputId}`
- `POST /api/data-assembly-requests/{requestId}/submit`
- `POST /api/data-assembly-requests/{requestId}/withdraw`
- `POST /api/data-assembly-requests/{requestId}/quotes/{quoteId}/accept`
- `POST /api/data-assembly-requests/{requestId}/cancellation-requests`
- `GET /api/data-assembly-requests/{requestId}/outputs/{releaseId}`
- `GET /api/data-assembly-requests/{requestId}/outputs/{releaseId}/files/{fileId}/download`

Phaeno platform route groups:

- `/api/platform/lab-service-orders`: queue, request review, quote revisions,
  receipt/accession, sample transitions, result releases, holds, cancellation,
  and completion.
- `/api/platform/reagent-orders`: queue, accept/reject/hold, substitution
  proposals, backorders, shipments, cancellation, and fulfillment closeout.
- `/api/platform/data-assembly-requests`: intake decisions, quotes, processing
  runs, output review/release, holds, cancellation, and completion.
- `/api/platform/order-configuration`: QuickBooks projections/links, analysis
  definitions, reagent offerings/prices, assembly profiles, credit decisions,
  quote defaults, and shipping/instruction settings.
- `/api/platform/order-integrations`: synchronization status, reconciliation,
  and retry commands.
- `/api/integrations/quickbooks/webhook`: signature-validated QuickBooks events;
  it does not use selected-tenant context.

Contract rules:

- Use the shared `ApiResponse<T>` envelope, standard domain error mapping, and
  tenant-safe validation details.
- Draft create/update bodies contain workflow-owned fields only. Core commands
  are small: submit uses `{ version }`; reagent placement uses `{ version,
  purchaseOrderNumber, shippingAddressId, requestedDeliveryDate?,
  shippingInstructions? }`; assembly quote acceptance adds `{ quoteId,
  purchaseOrderNumber }`; lab quote acceptance uses `{ version, quoteId }`.
- Phaeno transition commands use `{ version, reason?, internalNote?, ...facts }`
  and require state-specific facts such as receipt condition, accession id,
  shipment allocations, processing version, or result/output manifest.
- Mutable commands require the last-read `Version`; stale writes return `409
  Conflict` with reload guidance.
- Draft creation, submission, placement, quote acceptance, shipment creation,
  completion, and integration retry require an `Idempotency-Key`. The server
  persists the key, actor, scope, request hash, and result so a retry returns the
  original outcome and a mismatched reuse is rejected.
- List endpoints are server-paged and accept only allowlisted sort/filter fields.
  Cross-tenant ids return a non-disclosing not-found response.
- Upload endpoints return managed logical file ids and validation/scan state,
  never storage paths or trusted client checksums. Download endpoints recheck
  current tenant, membership, artifact release, and commercial gate.
- DTOs expose current state, `Version`, permitted-action booleans, Customer-safe
  timeline, commercial/release summaries, and linked document facts. Internal
  notes and integration diagnostics appear only in authorized platform DTOs.

## Approved Frontend Surfaces

Customer navigation:

- `Lab services` appears only with Customer view capability.
- The list provides status/date search, filters, empty/loading/error states, and
  `Request lab service` only for administrators.
- Creation is a dedicated resumable workflow with job details, repeatable sample
  cards, per-sample analyses, safety confirmation, review, and submit-for-quote.
- The record workspace uses clear sections for overview, samples, quote and
  commercial status, files/results, and timeline. It shows Customer-visible
  custody facts and makes scientific readiness vs payment release unmistakable.
- Quote acceptance shows the complete immutable scope, expiration, itemized
  totals, instructions, credit/payment behavior, and confirmation consequence.

Partner navigation:

- `Reagent orders` and `Data assembly` appear only with their view capability.
- Reagent creation is a dedicated cart/review flow, not an inline list form. It
  supports controlled offerings/quantities, address selection, PO, requested
  date/instructions, price review, and explicit placement.
- Reagent detail shows placement snapshot, line fulfillment/backorders,
  substitution decisions, shipments/tracking/lots, QuickBooks documents, and a
  tenant-safe timeline.
- Data assembly creation is a dedicated resumable workflow with profile
  instructions, metadata, upload progress/scan validation, manifest review, and
  explicit submission. Detail shows correction requests, quote, processing,
  commercial gate, immutable output releases, and audited downloads.

Phaeno navigation:

- The POMS dashboard includes a Phaeno-only Order Operations / Lab Operations /
  Accounts selector. Its initial Order Operations panel is an explicitly
  labelled mock snapshot for layout validation; it does not claim connected
  queue counts or replace the full operational workspace.
- `Order operations` is a platform-only workspace with separate Lab, Reagents,
  Assembly, and Integrations sections in the shared far-left sidebar. The
  sidebar is a remembered pinned rail on wide screens and the same non-modal
  hover, keyboard, and click rail when narrow or unpinned.
- Each queue supports assigned/unassigned, organization, status, date, overdue,
  hold, and integration filters. Detail pages expose only capability-authorized
  workflow commands and separate tenant-safe reasons from internal notes.
- `Order configuration` contains QuickBooks item synchronization/linking,
  analyses, Partner offerings/prices, assembly profiles, credit settings, quote
  defaults, shipping restrictions, and instruction configuration.

UI rules:

- Keep route files thin, server state in TanStack Query, and forms in React Hook
  Form plus Zod. Use Shadcn/Radix primitives and semantic design tokens.
- Use dedicated pages for multi-step creation and record workspaces. Use modals
  for bounded list-management actions such as adding an address, placing a hold,
  deciding cancellation, or confirming a substitution. Do not put data-entry
  forms inline in lists.
- Meet WCAG 2.2 AA: keyboard access, logical focus, visible focus, labelled icon
  actions, required markers, field/file errors, live upload/status announcements,
  contrast, zoom/reflow, and reduced motion.
- Irreversible or high-impact actions name the record and consequence in an
  explicit confirmation. Concurrency conflicts preserve unsent user input where
  safe and offer reload/review rather than silent overwrite.
- Mobile supports review, tracking, approvals, and downloads. Dense scientific
  entry and Phaeno operations optimize for laptop/desktop while remaining
  accessible and reflow-safe.

## Reliability, Audit, And Security

- Treat each submitted revision, quote issue, placement, shipment, completion,
  and output release plus its immutable snapshot/outbox message as one database
  transaction.
- Generate workflow numbers server-side with concurrency-safe uniqueness.
- Revalidate organization kind, capability, active configuration, QBO item,
  Partner price/effective date, quantity, address, quote revision/expiry, file
  state, and commercial gate on the server at the consequential command.
- Audit draft creation, submission, quote/revision/acceptance, placement,
  receipt/accession, every status transition, holds, rework/replacement,
  validation decisions, shipments, substitutions, cancellations, releases,
  downloads, configuration, and external synchronization.
- Keep tenant-safe reasons separate from internal notes. Never include internal
  notes, tokens, credentials, unnecessary personal data, or sensitive file
  contents in logs, emails, audit diffs, or QuickBooks memo fields.
- Prohibit patient identifiers, PHI, and unnecessary personal data in the
  initial lab and assembly workflows. Field help, confirmations, validation,
  and terms must say so; reported violations trigger an operational hold and
  restricted review, not broad tenant exposure.
- Managed uploads use server-generated keys, configured file/size limits,
  streaming checksums, malware scanning, safe file names, and reconciliation of
  storage/database failures. No input or result becomes processable/releasable
  without the required clean scan state.
- Every download reauthorizes the current actor, selected tenant, file ownership,
  release state, and payment gate. Use API proxying or short-lived signed URLs
  whose design supports immediate blocking when membership or release is
  revoked.
- Store QuickBooks OAuth credentials and webhook secrets only in environment/
  secret configuration. Validate webhook signatures, timestamps, company id,
  and replay/idempotency before processing.
- Retry QuickBooks and notification delivery with bounded backoff and visible
  dead-letter/needs-attention state. Reconciliation is explicit; external data
  never silently overwrites an immutable portal snapshot.
- Apply rate, size, count, and concurrency limits to uploads and consequential
  commands. Record operational ids without logging order/file contents.
- No normal workflow hard-deletes orders, revisions, status events, commercial
  documents, shipment facts, input/output/result manifests, or audits.

## Implementation Phases

Each phase is independently reviewable. Implementation and local migrations
were explicitly requested; production credentials, external configuration, and
deployment remain separate activation work.

1. **Foundation and contract fixtures**
   - Add the approved session capabilities and platform boundaries.
   - Implement a QuickBooks adapter contract, local fake, catalog projection,
     outbox/retry/reconciliation model, and configuration authorization.
   - Extract or implement a general managed operational-file boundary with local
     storage, checksum, scan, authorization, and audited download behavior.
   - Define synthetic analysis and assembly profiles for tests only; production
     profiles remain inactive until scientifically approved configuration exists.
2. **Commercial and configuration foundation**
   - Add QuickBooks item synchronization/linking, organization commercial
     profiles, quote-validity configuration, analysis definitions, Partner
     reagent offerings/prices, shipping restrictions, and assembly profiles.
   - Add Phaeno configuration UI and integration health/retry visibility.
3. **Customer request and quote vertical slice**
   - Implement draft, multi-sample intake, submit/changes-requested/resubmit,
     job-specific quote revisions, QuickBooks estimate sync, quote acceptance,
     immutable placement, and Customer/Phaeno workspaces.
4. **Customer laboratory and result vertical slice**
   - Implement shipping facts, receipt/accession, independent sample stages,
     holds/rejections/replacements/rework, result upload/review/release,
     completion invoice, credit/payment gate, cancellation, documents, and
     notifications.
5. **Partner reagent vertical slice**
   - Implement address book, controlled offerings, draft/create-from-prior,
     placement/QuickBooks estimate, Phaeno review, commercial revisions,
     substitutions, partial shipments/backorders, invoice-on-shipment,
     cancellation, documents, notifications, and workspaces.
6. **Partner data-assembly vertical slice**
   - Implement profile-driven draft/upload/scan, immutable input revisions,
     validation/correction, job quote/acceptance, processing runs, immutable
     output releases, completion invoice, credit/payment gate, cancellation,
     documents, notifications, and workspaces.
7. **Operational reporting and production hardening**
   - Add cross-workflow queues, overdue/hold/integration views, tenant CSV
     exports, reconciliation tools, retention safeguards, rate/size limits,
     observability, and complete security/accessibility verification.
   - Configure production storage/scanning, QuickBooks credentials/webhooks,
     real analysis/assembly profiles, shipping restrictions, and runbooks before
     production activation.

Execution checkpoint:

- [x] Phases 1-6 are implemented for local development, including capability
  boundaries, all three tenant workflows, Phaeno operations/configuration,
  QuickBooks and notification outboxes, managed-file gates, immutable revisions
  and snapshots, payment/credit release rules, cancellation, and reporting.
- [x] Phase 7 application work is implemented for operational queues,
  assignments/due dates, holds/overdue filters, CSV exports, QuickBooks and
  notification recovery, API rate limits, upload limits, audit history, and
  tenant-safe versus internal-data separation.
- [ ] Production activation remains pending the external configuration,
  scientific approval, sandbox/smoke validation, deployment, and deferred
  database-backed/contract/security/accessibility coverage listed above and in
  the three owning test plans.

## Approved Acceptance Scenarios

### Customer Lab Service

1. An active Customer administrator creates a multi-sample draft, supplies all
   required metadata, selects active analyses, reviews the no-PHI declaration,
   and submits one immutable request revision. A non-admin cannot create or
   submit it, and another Customer cannot discover it.
2. Phaeno returns a field-specific change request. The Customer submits a new
   revision; both versions and the reason remain visible in the permitted
   timeline.
3. Phaeno issues an itemized job quote. It is not Customer-visible until the
   QuickBooks estimate sync succeeds. A newer revision supersedes the first;
   expired or superseded quotes cannot be accepted.
4. Customer-admin acceptance freezes samples, analyses, instructions, prices,
   currency, expiration, and Customer reference. Repeated acceptance with the
   same idempotency key returns the same placed job.
5. Phaeno records receipt, condition, immutable accession id, and independent
   progress for each sample. A held/rejected sample requires a Customer-safe
   reason; a replacement is linked without erasing the original.
6. A credit-approved Customer downloads one sample's released result while
   other samples remain in progress, before the overall job invoice exists. A
   non-credit Customer sees readiness but cannot download any held job result
   until QuickBooks reports the completed invoice paid.
7. Completion succeeds only when every sample is terminal. Cancellation after
   placement is decided by Phaeno, preserves work/history, and links any
   QuickBooks adjustment.

### Partner Reagent

1. An active Partner administrator creates a multi-line draft using only active
   offerings for that Partner. The server rejects another Partner's price,
   inactive item, invalid unit/increment, out-of-range quantity, restricted
   destination, missing PO, or stale price.
2. Creating from a prior order copies eligible lines into a new draft but not
   the PO, address snapshot, price, or availability decision; every fact is
   revalidated at placement.
3. Placement freezes the PO, shipping address, items, quantities, negotiated
   prices, and currency. A QuickBooks outage leaves one local order in visible
   sync-pending state; retry cannot create a duplicate estimate.
4. Phaeno partially ships a line and backorders the remainder. The Partner sees
   shipment quantity, remaining quantity, ETA when known, carrier/tracking,
   lot/batch, expiration when applicable, packing slip, and the invoice for
   shipped quantity.
5. A proposed substitute is not fulfillable until a Partner administrator
   approves the item and commercial effect. Approval and decline both preserve
   the original placement and proposal history.
6. Cancellation before Phaeno acceptance is immediate. After acceptance, only
   unshipped scope may be approved for cancellation; shipped facts and invoices
   remain intact.

### Partner Data Assembly

1. An active Partner administrator selects an active allowed profile, uploads
   files, supplies required metadata, and submits only after every file has an
   allowed kind, authoritative checksum, and clean scan. A missing/failed scan,
   invalid manifest, prohibited-data declaration failure, or another Partner's
   file id blocks submission.
2. Phaeno requests a file/metadata correction. The Partner creates a new input
   revision; prior files, manifest, checksums, validation results, and reason are
   preserved.
3. Successful intake leads to a job-specific quote. Partner-admin acceptance
   requires a PO, current unexpired quote, successful QuickBooks estimate, and
   freezes the input/profile/commercial snapshot.
4. Phaeno records a processing run with profile/pipeline versions, provenance,
   QC, and immutable output manifest. A corrected output becomes a new release
   and never overwrites the prior one.
5. Credit-approved Partner members may download ready outputs after successful
   completion-invoice sync. Non-credit Partner members see readiness but remain
   blocked until QuickBooks reports payment. Every file download is tenant-
   authorized and audited.
6. Phaeno cancellation/rejection and Partner cancellation requests retain every
   input/output revision, processing fact, visible reason, and financial link.

### Cross-Cutting

1. Prospect actors receive no order navigation or API capability. Wrong-kind,
   inactive, non-member, and cross-tenant access fails without leaking record
   existence.
2. Non-admin Customer/Partner members can read and download only released data;
   they cannot create, submit, accept, place, approve, or cancel.
3. Stale `Version` commands return `409 Conflict`; idempotent retries return the
   original result; two different payloads cannot reuse one idempotency key.
4. Failed QuickBooks and notification delivery retries without duplicating the
   business action. Phaeno can see and reconcile every failure.
5. Tenant-visible timelines omit internal notes and integration secrets. Audit
   and Phaeno operational views retain the complete authorized history.
6. Deactivation or commercial/file hold blocks new access immediately without
   deleting historical records or previously recorded download events.
7. A later PSeq Lab Service expected-date override requires a controlled
   customer-safe reason, retains a separate private internal note, preserves the
   original target, updates the tenant-safe timeline, and produces one
   de-duplicated durable notification.
8. Phaeno reporting distinguishes receipt-to-acceptance from
   acceptance-to-completion, measures against the original target after an
   override, and exports only Order-level schedule health to HubSpot.

## Verification Plan

The running backend, frontend, and e2e test plans now record the implemented
tests, latest execution results, and remaining production-gate coverage. Before
production activation, complete the following minimum coverage:

- Backend unit/domain tests for every transition table, immutable revision,
  quantity/price/date invariant, release gate, cancellation decision, and
  Customer-safe/internal data boundary.
- Backend integration tests against PostgreSQL for tenant isolation, optimistic
  concurrency, idempotency, outbox atomicity, unique workflow/accession numbers,
  effective-dated prices, managed-file ownership, and download audit.
- QuickBooks adapter contract tests for item/payment sync, estimate/invoice/
  credit idempotency, partial-shipment invoices, webhook replay/signature, retry,
  and reconciliation mismatches using a fake or sandbox—not live production.
- Frontend component tests for capability navigation, forms/validation, quote
  review, upload/scan progress, transition confirmations, safe timelines,
  release/payment banners, substitutions, backorders, and error recovery.
- E2E journeys for every approved acceptance scenario, including Customer admin
  and member, Partner admin and member, Prospect denial, platform operations,
  two-tenant isolation, narrow viewport, and keyboard-only operation.
- Accessibility verification for focus order/restoration, required fields,
  table/list semantics, live status and upload announcements, validation errors,
  dialogs, color contrast, zoom/reflow, reduced motion, and automated axe checks.
- Failure tests for stale versions, repeated idempotency keys, QuickBooks outage,
  notification outage, scan unavailable/rejected, storage cleanup/reconciliation,
  expired/superseded quotes, changed prices, restricted destinations, payment
  hold, and deactivated membership.
- Security tests for client-supplied organization/file/storage ids, cross-tenant
  enumeration, malicious file names/content types, size/count limits, webhook
  replay, unsafe logs, and attempted PHI/prohibited-data submission.
- Production-readiness smoke tests for configured storage/scanner, QuickBooks
  sandbox/company connection, webhook receipt, email delivery, upload/download,
  and one non-billable synthetic end-to-end journey before activation.

Test execution was explicitly requested for this implementation checkpoint.
Future production/sandbox tests remain separate because they require external
configuration and deployment authority.

## Definition Of Ready For Implementation

- [x] Users, organization kinds, authority, tenant access, and initial Phaeno
  operational capability mapping are approved.
- [x] Lab request/quote, sample metadata, accessioning, independent sample
  stages, result artifacts, release gates, cancellation, and representative
  synthetic output contract are documented.
- [x] Reagent catalog, Partner pricing, quantity, PO, address, review,
  fulfillment, backorder, substitution, shipping, cancellation, invoicing, and
  create-from-prior rules are documented.
- [x] Assembly profile, input revision, validation/correction, quote, processing,
  output release, download, payment, and representative synthetic profile rules
  are documented.
- [x] The three workflow transition contracts and terminal/exception outcomes
  are approved.
- [x] QuickBooks ownership, estimates/invoices/payment, tax/freight/currency,
  idempotency, failure, and reconciliation boundaries are explicit.
- [x] Notification recipients/events, documents, search, queues, CSV export,
  audit views, and no-auto-deletion retention are explicit.
- [x] Domain aggregates, API route/command shapes, frontend surfaces,
  reliability/security rules, implementation phases, and acceptance scenarios
  are defined.
- [x] Actual production scientific profile values are correctly treated as
  activation configuration requiring Phaeno scientific approval, not invented
  schema requirements.

The product-planning gate is satisfied and the initial-release application has
been implemented locally. This does not authorize production activation or
deployment; the unchecked activation gate above remains binding.

## Deferred Product Scope

- A separately assignable purchaser/order-placer role, granular Phaeno staff
  roles, second-person organization approval, and per-order member grants.
- Automatically recurring orders, scheduled reorders, bulk order import, and
  create-from-prior for lab or assembly work.
- Portal card/bank payment, stored payment methods, multi-currency conversion,
  and a portal-generated authoritative invoice.
- ERP, CRM, LIMS, warehouse/inventory allocation, carrier rate/label/delivery
  integration, returns, exchanges, and RMA workflows.
- Direct delivery or delegated portal access to a Partner's downstream customer,
  and storage of downstream-customer identities.
- In-browser scientific file viewers, arbitrary free-form scientific workflows,
  and activation of any production analysis/assembly profile without approved
  real scientific rules.
- Automatic retention deletion, organization self-service purge, legal hold,
  exceptional purge, and configurable retention periods.
- Scheduled reports, bulk file/document export, custom report builders, advanced
  analytics, and data-warehouse feeds.
- Customer/Partner-authored catalog items, negotiated-price editing by Partners,
  manual placement price overrides, and offline order imports.
- Final delivery confirmation from carriers; `Fulfilled` is Phaeno operational
  closeout after all active quantities are shipped or cancelled.
