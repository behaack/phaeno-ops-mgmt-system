# Order Management Plan

## 2026-08-29 PSeq order-to-cash implementation update

For PSeq Lab Service, `PSEQ-ORDER-TO-CASH-GAP-CLOSURE-PLAN.md` supersedes the
older QuickBooks-authoritative billing and payment-gated result-release
statements in this plan. POMS now derives operational readiness, permits an
internal staged order before Customer administrator activation when the active
Customer/entitlement/offering minimum is met, requires full readiness for quote
issuance and commitment, and snapshots POMS-owned billing, tax, and payment
terms in the quote.

On governed feature activation, scientifically approved output packages create
the Commercial release candidate without the duplicate manual-upload bridge.
The Result Release Manager releases per sample without a balance or credit
gate. Job completion idempotently issues a POMS invoice and immutable PDF from
the accepted quote. Native AR manages invoices, append-only adjustments,
receipts, explicit many-to-many allocations, preview/confirm CSV imports,
reversals, aging, and independently approved reconciliation. Historical manual
billing remains visible as a legacy Finance-review source and is not converted
to an issued invoice. Partner PSeq Kit and data-assembly payment behavior is
unchanged.

Keep this file updated as Customer and Partner ordering requirements are
supplied and decisions are made.

The initial-release discovery and implementation were completed on 2026-07-14.
Product direction expanded on 2026-07-15 through the former HubSpot lifecycle
plan, then changed on 2026-08-26 to a full first-party CRM and standalone
commercial lifecycle. The interim POMS catalog and manual accounting direction
below was explicitly authorized and implemented on 2026-08-26; the broader
future lifecycle changes remain unauthorized by this plan alone.

On 2026-07-16, `LAB-OPERATIONS-PLAN.md` separated Commercial Operations from an
internal, replaceable Lab Operations provider. That internal application scope
is now feature-complete: accepted quote/cancellation handoff, roles, operator
workflows, Laboratory persistence, and durable customer-safe projections are
implemented. This plan remains authoritative for commercial ordering, pricing,
files, payment, and publication; laboratory execution follows the Lab
Operations plan and contract. Raw/intermediate pipeline file ownership remains
a separate major TBD. The post-release customer deliverable lifecycle is owned
by `FILE-MANAGEMENT-PLAN.md`.

## Status

- Customer selection for PSeq Lab Service order intake now comes from canonical
  active CRM Companies. A Company is eligible only when its attached internal
  Customer operational scope is active and not manually blocked, and has the
  current service authorization and active offering required to begin pricing.
  An online administrator is not required at intake; full readiness and an
  active Customer administrator are rechecked before quote issuance. The
  displayed name always comes from the Company; the internal scope identifier
  remains the tenant key stored on the order.
- Development state: the approved initial-release workflows are implemented in
  the backend, frontend, and local PostgreSQL schema. Customer laboratory,
  Partner reagent, Partner data-assembly, and Phaeno operations/configuration
  surfaces are present. POMS now owns the editable commercial catalog, issues
  quotes without an external synchronization gate, creates stable accounting
  source records at the implemented billing boundaries, and provides the
  Phaeno-only journal-entry source report and CSV. The QuickBooks worker,
  webhook, retry, catalog-sync, and payment-reconciliation paths are disabled.
- Approved future direction: entitled Customers and Partners may place a
  configured-price PSeq Lab Service directly; it always bundles specimen
  processing with data assembly. An entitled Partner may place a PSeq Kit,
  which always bundles its reagents/kits with data assembly. Data assembly is
  not separately sellable because it has no value without the corresponding
  PSeq Lab Service or PSeq Kit inputs.
  Partners may submit specimens without identifying any downstream customer.
  Bespoke work routes through a first-party CRM Opportunity. The first Customer
  PSeq Lab Service Opportunity-to-Order conversion slice is implemented; the
  broader configured-price and bundled-service direction is not yet
  implemented.
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
  internal provider, post-acceptance roster-finalization authorization,
  cancellation routing, durable Commercial projections, and complete internal
  Lab operator workflow now exist. Twenty-two Laboratory-owned tables live in
  `lab_ops`; Commercial authorization/projection/receipt records remain in
  `commercial_ops`. Existing customer order, quote, file, payment, and
  publication records remain authoritative for their Commercial
  responsibilities in `commercial_ops`.
- Phaeno Commercial staff use **Order intake** to enter Customer orders and
  review first-party CRM-originated `SalesAssistedOrder` and `Evaluation`
  requests. Placed work, return kits, shipment lookup, physical receipt, and
  accession are intentionally absent; those begin in Lab Operations.
  The former local HubSpot simulator and its active UI have been removed;
  historical HubSpot-sourced requests remain readable. Trial Project execution
  remains governed by its owning plan. The first sales-assisted conversion
  slice is implemented for Customer PSeq Lab Service: an approved first-party
  CRM handoff can start one order, atomically becomes Applied, and remains
  visible as that order's internal commercial source.
- Verification state: the completed local checkpoint on 2026-08-28 has a clean
  backend solution build and suite against the migrated development PostgreSQL
  database (240 passed with no failures or skips), plus frontend lint,
  typecheck, full unit suite (43 files, 107 tests), client/SSR production build,
  and focused CRM Playwright coverage (4 desktop/mobile scenarios). The browser
  run used the local mock session; there is not yet deployment, signed-in
  browser acceptance, Finance reconciliation, or Product Owner acceptance
  evidence. Remaining authenticated API, accessibility, and database-backed
  browser coverage stays in the living test plans.
- Production activation is not complete or implied. It still requires approved
  real scientific definitions/profiles and shipping rules, production storage
  and malware scanning, QuickBooks/Mailgun credentials and sandbox validation,
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
- A Trial Project creates no QuickBooks order, estimate, invoice, payment, or
  zero-dollar transaction. Estimated retail value and anticipated internal cost
  remain POMS-owned internal reporting facts; future QuickBooks representation
  requires a separate explicitly Finance-approved change.
- Trial Project work is RUO and accepts no PHI. POMS uses the Prospect's non-PHI
  sample identifier and tube-barcode crosswalk while the Prospect retains any
  identity mapping outside POMS. Suspected prohibited data blocks the affected
  sample or shipment under the Trial Project's restricted hold and disposition
  rules.
- A Trial Project may freeze Phaeno or Prospect responsibility for a pre-
  approved residual-material return. That payer designation does not create a
  Phaeno order, invoice, payment gate, or QuickBooks transaction.
- Immutable customer-facing result/output packages for Customer Lab Service and
  Partner workflows use one configurable global retention default. Initial
  settings are 30 exact 24-hour days from release, a warning 5 exact 24-hour
  days before that deadline when any file remains undownloaded, and a further
  5-day whole-package grace period when any file is still undownloaded at the
  standard deadline. Authorized Phaeno users can configure Customer-, Partner-,
  or Prospect-organization overrides, and release snapshots the effective
  settings and dates. Warning, grace, download-cutoff, notification, and byte-
  deletion processing remain unimplemented. Trial Project release integration
  remains future scope because the Trial Project aggregate is not implemented.
- `SAMPLE-SHIPPING-AND-INTAKE-PLAN.md` owns a shared pre-receipt
  shipment-packet workflow for an accepted Prospect Trial Project and a future
  Customer promotional no-charge order. It includes versioned destinations,
  controlled sample types, detailed shipping instructions, printable ship-to
  label/manifest packets, packet barcodes, and scan-first intake. The shared
  configuration, return-kit and registered supplier-tube inventory, external
  assignment/correction crosswalk, printable packet and retained CSV, packet-
  plus-tube comparison scan, and Lab supplier-barcode adoption are implemented.
  Trial/freebie parent authorization and issuance remain later phases. This
  foundation does not alter the current paid-order or Trial Project boundaries
  by itself.
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
- QuickBooks Online integration is deferred. POMS uses its first-party CRM,
  Portal-owned commercial catalog and immutable quotes, and a Phaeno-only
  manual journal-entry source report. HubSpot and QuickBooks are possible
  future adapters only and are not active workflow dependencies. There is no
  separate order-management, ERP, LIMS, laboratory workflow, fulfillment,
  invoicing, or contract-management system outside POMS.
- Specifically, Phaeno currently has no ERP and no third-party LIMS. The fit-
  for-purpose internal Lab Operations module in `LAB-OPERATIONS-PLAN.md` is
  implemented behind the replaceable provider boundary.
- Do not design a handoff to an assumed external operational system. The portal
  is the operational system of record for confirmed ordering, sample receipt
  and accessioning, laboratory progress, data processing and release, reagent
  fulfillment, and data assembly state.
- POMS is the current source of truth for billable service and reagent catalog
  items and their base prices. Authorized Phaeno users maintain those facts in
  Order configuration, link them to scientific and workflow definitions, and
  preserve the accepted catalog codes, descriptions, units, and prices in the
  immutable placement snapshot.
- Partner reagent orders use set, organization-specific negotiated pricing; a
  Partner must not see or place an order using another organization's pricing.
- Authorized Phaeno users maintain negotiated Partner reagent prices in the
  Phaeno configuration area, linked to active POMS catalog items. Each
  negotiated price has effective dates and audit history.
- Placement uses the active price for that Partner and snapshots the catalog
  code, description, unit, quantity, negotiated unit price, and line total.
- In the current implementation, Customer lab-service pricing is determined per
  job. The approved next direction adds configured-price placement for standard
  work while retaining Sales-assisted pricing for bespoke work.
- The approved catalog, pricing, approval, payment, fulfillment, file,
  notification, reporting, and retention defaults are defined below.

## Approved Interim Manual Accounting Direction — 2026-08-26

This decision supersedes every current-flow requirement below that makes quote
visibility, placement, fulfillment, completion, payment recording, or file
release depend on QuickBooks synchronization. QuickBooks-specific names that
remain in the persisted model are compatibility debt only; removing or renaming
them requires a separately authorized migration. They do not represent an
active runtime integration.

- QuickBooks integration, OAuth, catalog synchronization, estimates, invoices,
  webhooks, payment reconciliation, retry queues, production credentials, and
  sandbox activation are deferred until separately requested.
- Authorized Phaeno platform administrators maintain a POMS-owned commercial
  catalog containing a stable code, name, description, selling unit, base
  price, currency, active state, audit history, and optimistic version.
  Scientific analyses, Partner offerings, and any retained assembly profiles
  link to those POMS catalog items.
- Phaeno-issued lab and assembly quotes are immutable POMS records and become
  `Issued` immediately in the same transaction as their status event and
  Customer/Partner notification. No external estimate or synchronization gate
  delays review or acceptance.
- Partner reagent placement becomes available for Phaeno review immediately
  after the active offering, negotiated price, quantity, address, PO, and
  shipping rules pass. No external estimate is created.
- POMS creates one stable manual accounting source record when a laboratory Job
  completes, when an assembly output reaches its approved billing boundary, and
  for each reagent shipment. The source record uses the immutable workflow and
  commercial snapshot; repeated report downloads do not create another record.
- A Phaeno-only **Journal-entry report** supports Finance's manual posting. It
  is filterable by inclusive accounting date range and downloadable as CSV. It
  includes a stable entry id, UTC accounting date, organization, workflow,
  POMS source and document references, PO when applicable, currency, gross
  amount, outstanding balance, payment state/reference/date, and a safe memo.
  POMS does not select ledger accounts, claim authoritative tax treatment, or
  post a balanced journal entry; Finance applies the approved chart of accounts
  and accounting policy outside POMS.
- Report rows are repeatable and deduplicated by the stable entry id. POMS does
  not infer that downloading a report means the row was posted.
- Existing credit decisions remain effective. Approved lab or assembly credit
  allows release under the existing rules. Without approved credit, completed
  files remain on payment hold. A manual payment-confirmation action and its
  authority, required evidence, audit facts, correction behavior, and precise
  held-file release consequence require separate explicit Product Owner
  approval; the journal-entry report does not imply payment or release.
- Customer and Partner users see POMS quote, amount, balance, and payment-hold
  status only. They do not see internal journal-entry identifiers, payment
  references, report contents, or Phaeno accounting notes.
- The initial implementation reuses the current commercial catalog and document
  tables without a migration. Runtime, API, UI, documentation, and tests use
  provider-neutral language. A future schema cleanup may rename legacy
  `Qbo*`, `External*`, `Sync*`, and `Synchronized*` identifiers only under an
  explicitly approved migration and compatibility plan.

### Interim implementation and acceptance status

- [x] Stop registering the QuickBooks gateway and background dispatcher, remove
  the webhook entry point, and reject historical retry/reconciliation actions
  as deferred.
- [x] Let authorized Phaeno platform administrators create, edit, activate, and
  deactivate POMS catalog items while keeping the stable item code immutable.
- [x] Issue lab and assembly quotes immediately and move placed reagent orders
  directly into Phaeno review without creating an integration outbox message.
- [x] Create stable manual accounting source records for lab completion,
  assembly output approval, and each reagent shipment.
- [x] Provide the Phaeno-only inclusive-date JSON projection and CSV download,
  plus the Order Operations **Accounting** workspace and non-posting warning.
- [x] Preserve the existing credit-approved release behavior and leave
  non-credit files on payment hold.
- [ ] Add the deferred authenticated API/PostgreSQL and browser journeys listed
  in the living test plans, then obtain Finance reconciliation and Product Owner
  acceptance. Local build, lint, and typecheck evidence is not that acceptance.
- [ ] Define and separately authorize manual payment confirmation, evidence,
  correction, and held-file release before implementing any such action.

## Workflow Audit Follow-Up — 2026-08-26

A static cross-stack review compared the current Order Management UI, API,
domain, persistence, commercial and notification workers, user documentation,
and living plans. The Phaeno-initiated Customer flow is structurally present:
an authorized Phaeno user can create the Customer-owned Job directly in
`QuoteInPreparation`, issue its price, and leave acceptance to an authorized
Customer administrator. The following audit items record closed source
findings, approved product decisions, and remaining implementation work. They
do not authorize migration, external configuration, deployment, or production
activation by themselves.

The four selected implementation findings were closed in source on 2026-08-27:
notification delivery now uses atomic leased claims with abandoned-claim
recovery, Phaeno initiation stores its mutation and idempotent replay in one
serialized transaction, laboratory pricing is bound to the canonical
`pseq-lab-service`/`specimen` catalog item, and the Customer selector preserves
loading, failure/retry, genuine-empty, and ready states. Focused regression
sources were added. The backend solution build and frontend lint/typecheck
passed; tests were not requested and were not run. This is not deployment,
authenticated acceptance, or Product Owner acceptance evidence.

The follow-on reliability pass on 2026-08-27 moved all 24 current-flow
commands that require an `Idempotency-Key` onto one transaction-scoped
execution boundary. The boundary acquires a PostgreSQL transaction advisory
lock before reading a prior result, preserves the stored HTTP status, commits
the business mutation and replay record together, rejects mismatched key reuse,
and rolls back an intermediate business save when the command fails. This also
closed the result-release path whose required key was previously unused and
made the Lab-authorization/sample-shipping finalization replay-safe. The
Commercial-to-Lab reference journey was rewritten around post-acceptance roster
entry and roster-finalization authorization. Updated application and test
sources compile with zero warnings or errors; tests were not requested and were
not run.

### Release-blocking reliability and commercial correctness

- [x] Make notification delivery recoverable after process interruption. Use an
  atomic claim or expiring lease, return abandoned `Sending` records to a
  recoverable state, prevent concurrent workers from executing the same claim,
  and expose safe operator recovery. QuickBooks dispatcher recovery is no
  longer an active release blocker because that integration is deferred.
- [x] Persist the Phaeno-initiated Customer Job mutation, status events,
  idempotency key/request hash, and replayable response in one transaction
  protected by a transaction-scoped idempotency lock. Repeating the
  same key and request returns the original Job.
- [x] Extend that same atomic idempotency invariant to every other current-flow
  idempotent command before claiming system-wide interruption safety. A retry
  after any interruption must return the original outcome or a deterministic
  in-progress result rather than repeat work or fail only because the first
  attempt already changed state.
- [x] Bind the required specimen-priced quote line to the designated PSeq Lab
  Service item or offering and its specimen sales unit. Do not allow an
  unrelated fee or adjustment line whose quantity happens to equal the Job
  specimen count to satisfy the commercial quantity rule. Show item identity
  and sales unit clearly in the Phaeno quote editor and validate them again on
  the server.
- [x] When Phaeno issues a quote, append the `QuoteInPreparation` to
  `QuoteIssued` workflow event in the same transaction and queue the Customer-
  facing quote-ready portal/email notification. A Customer administrator must
  not need to discover approval readiness only by manually refreshing the Job.

### Product-contract decisions approved — 2026-08-27

- [x] Manual and Sales-assisted order paths are not exceptions to service
  eligibility. An effective, `Ready` PSeq Lab Service entitlement and active
  offering are required for Customer Job creation/submission/acceptance and
  Phaeno Job initiation/quote issue. Pre-entitlement discovery,
  negotiation, and estimates remain in the first-party CRM custom-work flow;
  they are not Customer Jobs. An approved exception uses an explicit, audited,
  and, when appropriate, time-bounded entitlement rather than a hidden manual
  bypass. Quote acceptance snapshots the eligible commercial commitment.
  Ending the entitlement later blocks new Jobs but does not silently cancel or
  invalidate accepted work; an existing Job changes only through its owning
  hold or cancellation workflow.
- [x] Early-arriving physical samples are not a supported Customer order path
  in the current release. Customers may ship only after quote acceptance and
  exact roster finalization create the authorized shipment. An unexpected
  package follows the approved laboratory receiving and custody exception:
  quarantine and escalate it without accessioning, processing, billing, or
  attaching it to executable Job work. POMS must not promise later
  reconciliation until a separately approved unmatched-receipt workflow exists.
- [x] A Phaeno-initiated Job sends no Customer notice while it remains in
  `QuoteInPreparation`. Issuing or revising the quote for approval sends the
  quote-ready notice to every active Customer administrator currently eligible
  to approve. Quote issue rechecks that recipient set and is blocked with an
  actionable Phaeno error when it is empty. The administrator who accepts the
  quote becomes the acting administrator/order contact. Subsequent ordinary
  events go to that acting administrator; already-approved high-impact events
  continue to fan out to the acting administrator and all active organization
  administrators with duplicate recipients suppressed.

Approval closes the three product questions only. Entitlement enforcement,
recipient resolution, capability and error states, automated coverage, and
user-guide changes remain implementation work and must not be described as
verified behavior until that work is completed.

### Test, user-experience, and plan closeout

- [x] Rewrite the opt-in Commercial-to-Lab handoff tests around the current
  boundary: quote acceptance opens exact sample-roster preparation, and roster
  finalization atomically creates Commercial authorization, Lab work, specimens,
  shipping records, and durable provider evidence. Remove fixtures that insert
  samples before pricing submission and remove assertions that quote acceptance
  itself creates specimen-specific Lab authorization. Reconcile
  `BACKEND-TEST-PLAN.md`, `LAB-OPERATIONS-CONTRACT.md`, and
  `LAB-OPERATIONS-PLAN.md` with the resulting evidence.
- [x] Give the Phaeno Customer selector distinct loading, load-failure, retry,
  and genuine-empty states. Do not report an API or authorization failure as
  `No active Customer organizations are available`; disable initiation until
  eligibility data is known and surface actionable server errors in the page or
  dialog.
- [x] Add focused source coverage for Phaeno initiation replay, canonical quote-
  line identity and quantity, notification lease recovery, and Customer-selector
  state classification.
- [x] Implement the approved entitlement and quote-ready recipient/event rules:
  enforce the current `Ready` entitlement and active canonical offering at
  every pre-acceptance commitment, expose Customer and Phaeno eligibility
  states, keep accepted work operable, suppress Phaeno-initiated preparation
  notices, fan quote issue to active administrators, and route ordinary later
  events to the accepting administrator.
- [ ] Execute the owning authenticated PostgreSQL/API and browser journeys
  before treating this audit as fully accepted in a deployed environment.
- [ ] Reconcile this plan's remaining historical HubSpot, quote-acceptance Lab
  handoff, verification-count, and retention statements whenever nearby
  sections are changed. First-party CRM is the current intake source; HubSpot is
  only deferred adapter context.

### Existing deferred dependencies remain separately owned

- Configured-price PSeq Lab Service, PSeq Kit bundling, and removal of
  independently sold data assembly remain the required pre-production
  commercial redesign in this plan.
- Trial Project and Customer promotional-freebie parent workflows remain owned
  by `PROSPECT-TRIAL-PROJECT-PLAN.md` and
  `SAMPLE-SHIPPING-AND-INTAKE-PLAN.md`.
- Raw/intermediate scientific pipeline ownership, released-file retention
  execution, production S3/scanning, and byte deletion remain owned by
  `LAB-OPERATIONS-PLAN.md` and `FILE-MANAGEMENT-PLAN.md`.
- Production activation still requires the external configuration, complete
  contract and authenticated journeys, accessibility/security verification,
  deployment evidence, and signed-in Product Owner acceptance already recorded
  in this plan and the three living test plans.

## Approved Next Commercial Entry Direction

`STANDALONE-COMMERCIAL-LIFECYCLE-PLAN.md` owns the end-to-end first-party
CRM-to-operations handoff. When implementation is explicitly requested, this
plan must be expanded into exact transition, pricing, API, migration, UI, and
rollout changes before modifying the current order aggregates.

- A direct Portal order is standard, configured, entitlement-checked work. The
  complete price is shown before commitment and no Sales negotiation is needed.
- Standard Customer and Partner PSeq Lab Service uses a configured bundle price
  and places specimen processing plus data assembly as one commercial product.
  Scientific intake validation still occurs before laboratory work begins.
- The PSeq Lab Service selling unit is one committed specimen. Commercial Line
  Item quantity equals the specimen count declared on the Job and frozen when
  the organization accepts the price. Each configured offering defines the
  processing and data output included per specimen. Unusual specimens, output
  requirements, failed-input remediation, and bespoke analysis route to
  Sales-assisted work.
- Small standard PSeq Lab Service orders use the configured per-specimen price
  without a customer-specific minimum batch charge. Phaeno may assign eligible
  specimens from multiple customer orders to one internal laboratory batch to
  economize operations. This never merges the customer orders, commercial
  snapshots, CRM sale summaries, accounting-source records, tenant ownership,
  files, or results, and no external organization can discover another
  participant.
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
  organization timeline, email, CRM, accounting report, or generated document.
- Later-date notifications go to the order contact and active organization
  administrators, with duplicate recipients suppressed. Notification failure
  is visible and retryable to Phaeno but does not undo the authoritative date
  revision.
- CRM receives only the Order-level current expected completion date and
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
  invoice, CRM sale summary, or commercial commitment.
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
  payment status remains separate from operational status; a report download
  does not confirm payment.
- Each PSeq Kit unit creates a stable accounting source when it ships. A
  partial shipment records only the shipped units and one commercial order may
  therefore have multiple shipment source records. Every source preserves the
  PSeq Kit bundle price, including its assembly entitlement; data submission
  and assembly completion never create a second billing source.
- An unused or expired assembly case does not automatically create a refund or
  credit because assembly is not separately purchased. Any financial adjustment
  applies to the PSeq Kit bundle and requires an approved return, defect,
  cancellation, or documented commercial exception.
- Replacing a defective or damaged PSeq Kit unit is an audited substitution
  beneath the original commercial order. Its existing assembly case transfers
  to the replacement kit; the original unit is marked replaced, and no extra
  entitlement, sale, CRM sale summary, or invoice is created unless the Partner
  purchases an additional unit.
- The purchasing Partner organization remains the tenant owner of each PSeq Kit
  unit, assembly case, submitted data, and released result even when the Partner
  supplies the kit downstream. The entitlement cannot transfer to another
  Portal tenant. An optional Partner reference remains opaque, and Phaeno does
  not require or infer the downstream customer's identity.
- The Portal may retain separate specimen, shipment, and assembly operational
  records, states, assignments, and validation. Quotes, accepted commercial
  snapshots, POMS catalog mapping, and CRM summaries must preserve the
  approved PSeq Lab Service or PSeq Kit bundle instead of presenting its
  components as separately purchased standard lines.
- Data assembly is never a separately sold standard path. It is an included
  operational phase of PSeq Lab Service or PSeq Kit.
- Unsupported specimens, analyses, files, quantities, deliverables, discounts,
  SLAs, or terms route to `Request custom work` and a first-party CRM
  Opportunity.
- Won custom work creates a pending sales-assisted-order handoff for
  Phaeno operational validation; it does not silently create active work.
- An approved Customer PSeq Lab Service handoff can start exactly one order.
  A handoff linked to an Opportunity is orderable only while that Opportunity
  is Won. The order stores the reviewed Portal request as its immutable source;
  Order operations and CRM both expose the Company, optional Opportunity,
  request, and resulting order linkage to authorized Phaeno users.
- Every committed Portal sale publishes a relationship-safe summary to its
  linked CRM Company and Opportunity when present. Routine direct orders do not
  create CRM Opportunities automatically.
- Partner specimen work belongs to the Partner. The Portal neither requires nor
  infers a downstream-customer identity; an optional PO or project reference is
  opaque Partner data.

### Exact Configured Lab Service Implementation Sequence

This sequence expands the approved direction into implementable boundaries. It
does not authorize a migration by itself, and it does not replace the current
manual per-job quote path until the configured path is complete and activated.

#### Slice 1 — Versioned Offering Configuration

- Add a Commercial-owned `LabServiceOffering` configuration record in
  `commercial_ops`. It has a UUID identity, immutable offering name/version and
  POMS catalog-item link, customer-facing description, included active
  analysis-definition identifiers, allowed material types, included output
  contract, published minimum/maximum turnaround days, effective dates, active
  and synthetic flags, centralized audit fields, and optimistic concurrency.
- The selling unit is fixed by policy to one specimen and is not an editable
  offering field. The linked active POMS catalog item supplies the current base
  unit price and currency; POMS does not create a second mutable standard-price
  source.
- Editing availability or effective dates preserves the record and audit
  history. Changing the offering identity, POMS catalog item, included scientific
  scope, output contract, or published turnaround creates a new offering
  version. There is no hard-delete endpoint.
- Add platform-admin create/update endpoints under
  `/api/platform/order-configuration/lab-service-offerings`, include offerings
  in `OrderConfigurationDto`, and add a dedicated Lab Service offerings panel
  to Order configuration. Existing catalog, analysis, reagent, assembly, and
  commercial-profile contracts remain compatible.
- Add `/api/order-catalog/lab-service-offerings` for the selected active
  Customer or Partner tenant. The response exposes only effective,
  non-synthetic offerings whose POMS catalog item and included analysis
  definitions remain active. Catalog visibility requires an active PSeq Lab
  Service entitlement whose configuration state is ready; placement separately
  requires an active organization administrator.
- The persistence slice requires an EF migration, a complete ERD update, domain
  and controller coverage, frontend configuration coverage, and living test-plan
  updates. Do not create or apply that migration until migration work is
  explicitly requested. Applying it to a shared environment requires separate
  approval.

#### Slice 2 — Backward-Compatible Commercial Entry Identity

- Add a frozen commercial-entry mode to `LabServiceOrder`: `ManualQuote` for
  the current Customer request/quote flow, `ConfiguredDirect` for the new
  standard path, and `SalesAssisted` for an accepted CRM handoff. Existing
  rows backfill to `ManualQuote` without changing their status, quote, Lab work,
  accounting-source record, or file history.
- Configured orders retain the selected offering identity/version and an
  immutable commercial snapshot containing the bundled product name, linked
  POMS catalog item/code, currency, unit price, committed quantity,
  subtotal/total, included scientific/output scope, published turnaround range,
  and the configuration versions used at commitment.
- Reuse the current `LabServiceQuote` acceptance and
  `CommercialLabAuthorization` transaction boundary. Configured placement
  creates and accepts a single-line system-generated commercial snapshot in one
  serializable transaction; it does not expose a negotiation step or permit a
  user-entered price. The existing manual quote issuance and acceptance routes
  remain unchanged.

#### Slice 3 — Direct Standard Placement

- Add an idempotent
  `POST /api/lab-service-orders/{orderId}/place-standard` endpoint with order
  version, offering identifier/version, and the required prohibited-data
  confirmation. The server never accepts price, currency, turnaround, or
  included-scope values from the client.
- At commitment the server rechecks active organization and membership,
  organization-administrator authority, PSeq Lab Service entitlement and ready
  configuration state, effective offering and POMS catalog item, the complete
  Job-level pricing profile, scientific compatibility of every declared source
  group, quantity rules, and the absence of custom scope. Individual sample
  records do not exist yet and are not required
  for pricing or acceptance. A failed standard check leaves the draft unchanged
  and returns an actionable `Request custom work` outcome.
- A successful transaction freezes the commercial snapshot, marks the order
  `Placed/Awaiting samples`, records status/audit history, and stores the
  idempotent response. It creates no external estimate or billing source before
  the configured completion boundary. It does not authorize specimen-specific
  Lab work because individual samples cannot exist before placement. Finalizing
  a compliant post-acceptance sample roster creates the initial Commercial Lab
  authorization and Lab work order atomically.
- Customer and Partner organization administrators use the same placement
  contract. Tenant scoping continues to use the selected organization, and a
  Partner's optional PO or project reference remains opaque; no downstream-
  customer identity is collected or inferred.
- The Customer/Partner UI selects an eligible offering and completes the Job-
  level pricing profile before specimen entry. It shows included scope, per-
  specimen price, committed quantity, complete price, and published turnaround
  before commitment, and clearly separates `Place standard order` from
  `Request custom work`. Members retain view-only access.
- First-party CRM publication is a relationship-safe summary derived after the
  authoritative Portal commitment. A linked-summary failure is visible and
  retryable but does not mutate or roll back an otherwise committed Portal/Lab
  transaction. Any later external CRM publication remains gated by
  fresh adapter scope and provider configuration.

#### Rollout and Compatibility Gates

- Deploy additive schema/API support with no active production offerings first;
  the current manual quote workflow remains the only available placement path.
- Activate one non-synthetic offering only after POMS catalog linkage,
  scientific scope, output contract, published turnaround, entitlement
  readiness, tenant authorization, idempotency, audit, and Customer/Partner
  browser acceptance pass in the target environment.
- Existing manual-quote orders never change entry mode or commercial snapshot.
  A configured draft that no longer qualifies for standard placement may still
  route to the existing manual/Sales-assisted path without rewriting history.
- PSeq Kit and removal of standalone data-assembly selling remain separate
  approved slices. Configured Lab Service placement must not silently broaden
  into either change.

#### Approved Product Decision — Price and Acceptance Before Sample Entry

The Job, rather than an enumerated sample list, owns every declaration required
to determine eligibility and price. A Customer cannot create, import, edit, or
remove individual samples until Phaeno has issued the price and an authorized
organization administrator has accepted it. Quote acceptance is the commercial
commitment boundary and opens sample-list preparation.

The Job-level pricing profile contains:

- the requested specimen count, derived from the biological-source group counts,
  limited to the supported order range, and used as the quantity for the
  specimen-priced commercial line;
- one or more biological-source groups, each with a source and specimen count;
  group counts must be positive and their sum must equal the requested specimen
  count;
- the fixed `pseq-lab-service` service, extracted-RNA material, tube intake
  unit, and standard data-output contract during the current single-service
  period;
- the existing shared storage/handling requirements and safety/biohazard
  declaration; and
- optional Job notes for relevant context. Notes never replace a required
  structured pricing declaration.

One biological-source group represents a shared-source Job. Multiple groups
represent a mixed-source Job and provide Phaeno with the composition needed to
confirm standard eligibility without requiring sample identifiers. The Job's
source mode is derived from these groups rather than separately asking the
Customer to keep a mixed-source flag consistent with the source composition.

The Job-pricing form presents biological-source groups as a compact row set
under one shared `Biological source` / `Samples` header. It does not repeat
those visible field titles for every group or ask the Customer to enter a
separate total; it calculates and displays the total from the group counts.
Each row retains its own accessible control names and row-specific validation.
Instructional helper text appears immediately below its field label and before
the corresponding control so the expectation is available before data entry.
Validation text sits tightly below its control and uses the same compact type
size as helper text while retaining the destructive color and alert semantics.
Composition-level validation appears below the source rows and before the Add
source action so users encounter the problem before the next available action.
The duplicate rule says `Duplicate biological sources are not permitted.` It
ignores blank source rows, appears on blur or submit, and then reevaluates from
the current nonblank source values as the Customer edits them.

Tube quantity is not part of the commercial specimen count. The Customer
provides each sample's positive integer tube quantity later, when preparing the
sample list. Those quantities drive return-kit and shipping preparation but do
not silently change the accepted per-specimen price.

The pricing and commitment rules are:

- submitting a Job for pricing requires a complete, internally consistent Job-
  level pricing profile and requires zero individual sample records;
- existing draft sample rows from the former workflow are preserved rather
  than deleted by migration. The Customer must explicitly remove each labeled
  legacy row before pricing submission, then enter the current roster only
  after price acceptance;
- a standard specimen-priced quote line must use the Job's requested specimen
  count; additional legitimate fee or adjustment lines retain their own units
  and quantities;
- quote acceptance freezes the Job pricing profile as the committed commercial
  snapshot and moves the Job to `Placed/Awaiting samples`;
- quote acceptance does not create a specimen-specific Lab authorization;
  finalizing the compliant sample roster creates the initial immutable
  authorization and linked Lab work order;
- rejected or removed committed specimens produce an explicit audited
  commercial adjustment or credit rather than silently rewriting the accepted
  snapshot; and
- any post-acceptance change to specimen count, source-group composition, or
  other price-bearing scope requires an immutable change quote and Customer
  acceptance before the affected samples can proceed.

After acceptance, the Customer may prepare the sample list incrementally. A
partially entered list remains a valid draft and shows overall and per-source
progress, such as `37 of 100 samples entered`; compliance is enforced when the
Customer finalizes the list for shipping, not after every row. Manual Add/Edit
remains available, and the implementation must include a validated CSV import
for large Jobs so Customers are not forced through 100 separate dialogs.

The sample-list import contract is:

- imports accept only comma-delimited UTF-8 `.csv` files. An optional UTF-8 byte
  order mark and correctly quoted commas are supported; Excel `.xlsx`, legacy
  `.xls`, macro-enabled workbooks, tab-delimited files, and other spreadsheet
  formats are not accepted;
- CSV import and the downloadable Job-specific CSV template are unavailable
  until the Job price has been accepted. The sample-list page displays the
  accepted total and allowed biological-source groups beside the template and
  upload controls;
- the import columns are `customer_sample_id`, `biological_source`, and
  `tube_count`. One row represents one biological specimen, never one physical
  tube. Material, quantity unit, storage/handling, safety, service,
  and output are intentionally omitted because they are inherited from the
  accepted Job and cannot vary in the uploaded file;
- `customer_sample_id` is always parsed, normalized, stored, and previewed as
  text. Numeric-looking identifiers and leading zeros are never intentionally
  converted by the Portal. The download and upload guidance warns that Excel
  may reformat identifiers unless that column is imported and edited as Text;
- `biological_source` may be blank for a one-source Job and is then inherited
  from the accepted Job. It is required for a mixed-source Job and must match
  one of the committed source groups;
- blank trailing rows are ignored. A partially populated row is invalid.
  Unknown columns and duplicate headers are rejected rather than ignored or
  silently retained;
- the original upload is parsed ephemerally and is not retained as the sample
  record. The Portal persists only validated normalized sample facts plus audit
  metadata for the import event;
- upload first produces a server-validated preview containing valid-row count,
  total and per-source progress, ignored blank rows, and row-specific errors.
  No samples change until an administrator confirms that preview; and
- confirming an import is atomic and replaces the current editable draft
  sample list. The confirmation names that consequence explicitly, uses the
  Job's current version for concurrency protection, and leaves the previous
  draft unchanged if any row or Job-level compliance check fails. Manual edits
  may be made after a successful import and before finalization.

Finalizing the sample list requires all of the following:

- the number of sample records exactly equals the committed specimen count;
- every Customer sample identifier is present, non-PHI, and unique within the
  Job;
- every sample selects one of the committed biological-source groups, and the
  count assigned to each group exactly matches that group's committed count;
- every sample uses the fixed extracted-RNA material and a positive integer tube
  quantity; and
- storage/handling, safety, service, and output facts are inherited from the
  frozen Job profile and cannot diverge per sample.

The UI must explain each mismatch, identify the remaining or excess count by
source, and link an administrator to the change-quote path when the actual work
cannot comply with the accepted Job. The API enforces the same rules before a
shipping packet, return kit, or Lab intake authorization can be created. Manual
entry and CSV import use the same server-side normalization and compliance
rules.

One Customer sample may contain one or more physical submitted tubes. The
committed commercial quantity counts specimens; return-kit capacity and barcode
work count physical tubes. Finalizing the roster creates one stable submitted-
specimen identity per sample and the declared number of child tube slots. Phaeno
registers exactly one manufacturer barcode to each physical tube in the return
kit, and the Customer later assigns one registered barcode to each slot through
the guided scan workflow. Barcodes are never accepted in the sample-list CSV.
The frozen shipment packet repeats the Customer sample identifier for each tube
slot and labels the slot ordinal, such as `Tube 2 of 3`.

This decision resolves the prior price-before-commitment versus post-intake
acceptance conflict. Slice 1 remains independently implementable after migration
authorization; later slices must use this Job-profile-first contract.

## Implemented Initial-Release Workflows

The workflows below describe current application behavior. Their manual
per-job Customer and assembly pricing remains in force until the approved next
commercial direction is implemented and verified.

### Customer Lab Service Order

- A Customer is an end user of Phaeno laboratory services.
- A Customer organization administrator may create a lab-service request and
  submit it to Phaeno for job-specific pricing. This request is not yet a
  placed order.
- An authorized Phaeno order-pricing user may instead initiate the same
  Customer-owned Job pricing profile for an active Customer with an active
  organization administrator. The server records the submitted request
  revision and opens it directly in `Quote in preparation`; Phaeno cannot
  accept the resulting quote on the Customer's behalf. Because initiation is
  also submission, the Phaeno user must make the same no-PHI attestation before
  the server accepts it.
- Phaeno reviews the submitted job, determines its itemized job-specific price,
  and issues a quote through the portal.
- A Customer organization administrator reviews and explicitly accepts the
  quote. Quote acceptance places the lab-service order and freezes the accepted
  commercial snapshot, including POMS catalog item codes, descriptions, units,
  quantities, and job-specific prices.
- POMS retains the quote and completion accounting-source information; no
  external accounting system participates in the order or laboratory workflow.
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
  by Finance outside POMS until a separately approved adjustment workflow exists.
- Customer quotes default to 30 calendar days of validity. Authorized Phaeno
  users manage this global default in a Phaeno configuration area.
- The configured validity period is copied into the quote when it is issued.
  Changing the configuration never changes an already-issued quote or its
  expiration date.
- An authorized Phaeno user may override the expiration for an individual quote.
  The selected date is visible to the Customer and the override is audited.
- Issuing a Customer quote records it as issued immediately with its POMS
  commercial document reference, status event, and Customer notice.
- Customer quote acceptance atomically records the Commercial placement and
  opens exact sample-list preparation; it does not create Lab work or an
  invoice. Finalizing the compliant roster atomically creates the linked Lab
  authorization and work. POMS creates one stable manual accounting source
  when the portal job is marked completed.
- Scientific completion and Customer release are separate states. Completing
  laboratory/data processing may make results internally ready without making
  them downloadable by the Customer.
- Customer-safe Lab milestones, schedule health, expected timing, action counts
  and summaries, and reviewer-permitted QC are read from Commercial-owned
  projections. Ready for release never creates or publishes a result file.
- A Customer with approved credit uses Net 30 terms. Phaeno may release completed
  results when they are scientifically ready without waiting for invoice payment.
- A Customer without approved credit cannot receive or download results until
  an authorized future payment-confirmation workflow clears the hold. The portal
  shows that results are ready but held for payment without exposing the files.
- Credit approval is an audited per-Customer setting managed by authorized
  Phaeno users in the Phaeno configuration area. The initial value is not
  inferred from organization kind or administrator status.
- POMS retains the credit decision and outstanding source balance. The current
  release gate does not infer payment from a report download or external action.
- The portal has no hosted payment page and does not receive payment-card or
  bank-account data. A non-credit Customer contacts Phaeno about a held result.
- Quote revisions are immutable. Issuing a revision supersedes the prior quote,
  and only the latest unexpired quote may be accepted.
- Physical samples are sent only after quote acceptance and exact sample-roster
  finalization. Acceptance opens roster entry; finalization provides the
  Customer with sample-submission instructions and creates the authorized
  shipment in the awaiting-samples stage.
- Shipping before quote acceptance and exact roster finalization is not
  supported. An unexpected package is quarantined and escalated through the
  approved laboratory receiving and custody exception; it does not create or
  attach to a Customer Job receipt, accession, billable event, or executable Lab
  work. Later reconciliation requires a separately approved unmatched-receipt
  workflow.
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
  requirements when differentiated services are introduced. They remain
  dormant during the current standard-output period.
- Phaeno receives and accessions the samples.
- Every requested sample has a required Customer-provided sample identifier that
  is unique within its lab-service request/order. The same Customer identifier
  may appear in another order without collision.
- At physical receipt, Phaeno assigns a separate globally unique accession
  identifier. Both identifiers remain immutable, visible, and searchable in
  Customer and authorized Phaeno tracking views.
- Each job requires storage/handling requirements and a safety/biohazard
  declaration that apply to every sample. Optional Job notes hold free text for
  the job as a whole. The Customer must state whether every sample shares one
  biological source. A shared source is entered once at job level and copied to
  every sample snapshot; when sources vary, each sample requires its own source.
  Each requested sample always requires only its Customer sample identifier and
  quantity in addition to that conditional source. During the initial
  single-material period, every sample is extracted RNA; Customers do not choose
  a material type.
- The API and persisted sample retain `materialType`, `quantityUnit`,
  `storageRequirements`, and `safetyDeclaration` for compatibility and complete
  laboratory snapshots. The server enforces `extracted_rna` and copies the
  current job-level storage and safety values into every draft sample on save.
  A submitted or placed snapshot therefore remains self-contained if the model
  later supports controlled material types, units, or per-sample exceptions.
- The Customer sample form explains the expected scientific content with
  persistent helper text rather than hover-only instructions. During the
  initial tube-only intake period, Customers enter an integer **Quantity
  (tubes)** and do not choose a unit; the write contract and persisted sample
  continue to carry `quantityUnit` with the fixed value `tube` so later
  multi-unit support does not require a storage-contract change. Customers do
  not select an analysis or output package during the current standard-output
  period. New samples keep an empty dormant analysis-ID list, edits preserve
  legacy values, and every sample is authorized under the standard
  `pseq-lab-service` key and receives the same standard data-file set.
- Collection date, concentration, and per-sample notes are not collected in the
  current Customer intake because no current validation, quote, shipping, or
  Lab Operations handoff rule requires them. Their nullable backend/API fields
  remain for compatibility, and Customer edits preserve previously stored
  values. A unitless optional concentration is not scientifically useful.
  If a future analysis requires submitter-declared concentration, introduce an
  analysis-specific required value with a defined unit.
- Patient identifiers and unnecessary personal or health data are prohibited in
  sample metadata and free-text instructions.
- One Customer lab-service request/order may contain multiple samples. Every
  sample follows the same standard PSeq Lab Service and output contract.
- Phaeno prepares the job-specific quote for that standard scope. Customer
  acceptance freezes the Job notes, shared storage and safety declarations,
  final per-sample quantities, units, standard service, standard data-file
  contract, and prices in the placement snapshot.
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
  cannot download any job result until a separately approved payment-
  confirmation workflow clears the completed job's hold.
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
  snapshot and included in shipment accounting-source rows.
- Partner organization administrators maintain their organization's shipping
  address book in the portal and select an address for each reagent order.
- Placement freezes the selected shipping address in the order snapshot so
  later address-book changes do not alter an existing order.
- The current POMS workflow does not manage billing addresses; Finance handles
  invoicing details outside POMS. Phaeno may place an order on hold during review
  when its shipping address is invalid or subject to a shipping restriction.
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
- Quote issuance records an immediately visible POMS quote and commercial
  document reference. Output approval creates one stable manual accounting
  source. Quote revision, expiration, commercial snapshot, and payment-hold
  behavior follow the Customer lab quote rules unless a rule below explicitly
  differs.
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
  output is approved; Partners without approved credit see that outputs are
  ready but cannot download them until a separately approved payment-
  confirmation workflow clears the hold.
- A Partner administrator may withdraw before quote acceptance. After
  acceptance it requests cancellation, and Phaeno approves, partially approves,
  or declines according to work already performed, with a visible reason and
  any financial adjustment handled by Finance outside POMS.
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
- When a Customer modal encounters a genuine optimistic-concurrency conflict,
  the Portal loads the latest Job automatically and preserves entered values.
  It retries once only when the editable Job details are unchanged; otherwise a
  fixed alert below the modal header requires review before another save.
- The connected Phaeno organization workspace is authoritative for durable
  organization-scoped administration. The standalone global User management
  preview is not a production order or account data source.
- The repository implements the OrderManagement domain, a dormant provider
  adapter boundary, durable commercial records and notification dispatch, operational file
  records, shared local/S3 storage adapter, scan and release states, and all
  three confirmed workflow surfaces. S3 bucket and credential configuration,
  object-storage runtime proof, malware scanning, and notification delivery
  still require approved configuration and validation.
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
- A Customer lab request requires a Customer-entered Job name that is unique
  case-insensitively within that Customer organization, shared storage
  requirements, and a shared safety declaration. It may include optional Job
  notes. None of these fields is a PO or commercial authorization; cost centers,
  requisition numbers, and commercial attachments are not required in the
  initial release.
- A Partner reagent order requires a PO number at placement. A Partner data-
  assembly request requires a PO number at quote acceptance. PO values are
  immutable commercial snapshots and appear in the applicable accounting-
  source rows.
- Lab, reagent, and assembly drafts are resumable. The initial release supports
  create-from-prior only for reagent orders, with complete revalidation and no
  copied PO number. Scheduled recurring orders, bulk uploads, and automatic
  reorders are deferred.
- POMS owns billable catalog items, base prices, immutable quotes, accepted
  commercial snapshots, credit rules, and stable accounting-source records.
  Finance owns ledger selection, tax treatment, invoicing, and posting outside
  POMS while the QuickBooks integration is deferred.
- Each quote and accounting source preserves its currency. POMS does not
  perform currency conversion or negotiate multi-currency pricing.
- Portal-issued Customer and assembly quotes become visible and acceptable as
  soon as POMS commits the quote, status event, and recipient notice.
- Reagent placement moves directly into Phaeno review after local validation;
  no external estimate or synchronization gate blocks acceptance or fulfillment.
- Laboratory completion and assembly output approval each create one stable
  manual accounting source. Approved credit continues to control early release;
  a report download never changes payment or release state.
- Reagent accounting sources are created from shipped quantities, allowing one
  source row per partial shipment. Each row includes the order number, shipment
  number, PO reference, currency, and shipped total.
- POMS preserves accepted product/service line facts. A post-placement reagent
  commercial revision that increases the Partner's total requires explicit
  Partner-administrator approval before Phaeno acceptance; Finance handles any
  resulting adjustment outside POMS.
- The portal never receives card or bank credentials and does not implement a
  checkout or hosted-payment surface.

### Catalog And Configuration

- Authorized Phaeno platform administrators create and maintain active POMS
  billable items, descriptions, sales units, base prices, currency, and stable
  item codes. Deactivated items cannot be used for new work but remain readable
  in historical snapshots.
- Authorized Phaeno users link POMS catalog items to active portal-owned
  analysis definitions, reagent offerings, and assembly service/quote
  definitions. Scientific instructions and workflow rules remain portal-owned.
- A Partner reagent offering explicitly selects eligible Partner organizations,
  negotiated unit price, effective dates, selling unit, order increment,
  optional minimum/maximum, and shipping restrictions. Overlapping active price
  periods for one Partner/item are prohibited.
- Customer credit approval and Partner assembly credit approval are separate,
  audited organization settings. Approval means Net 30 result/output release;
  absence of approval means the release remains held until a separately
  approved payment-confirmation workflow clears it.
- Authorized Phaeno users manage quote-validity defaults, sample-submission
  instructions, result and assembly profiles, Partner shipping restrictions,
  and order-notification settings in a configuration area. Every consequential
  configuration change is versioned or audited and never rewrites a placed
  snapshot.

### Customer Lab-Service Contents

- Required job fields are shared storage/handling requirements and a shared
  safety/biohazard declaration plus one or more biological-source groups and
  their sample counts; Job notes are optional. After quote acceptance, required
  Customer-entered sample fields are Customer sample identifier and tube
  quantity, plus the accepted biological source when the Job has more than one
  source group. All accepted samples are initially
  extracted RNA, so material type and unit are not Customer inputs. The backend
  persists the server-enforced `extracted_rna` and `tube` values and copies the
  shared job requirements into each sample snapshot. Customer intake does not
  collect collection date, concentration, or per-sample notes unless a future
  workflow defines a scientifically valid need.
- Patient identifiers and unnecessary personal or health data are prohibited in
  fields, notes, and files. The initial release is not a PHI intake workflow.
- One request may include multiple samples. Customers do not select per-sample
  analyses or outputs; every sample receives the standard data-file set. Quote
  acceptance freezes the Job-level sample count, source composition, standard
  service, instruction, output contract, and price snapshot. Finalizing the
  exact post-acceptance roster freezes the individual sample identifiers and
  tube quantities and creates the specimen-specific Lab authorization.
- The Customer sample identifier is unique within the job. Phaeno assigns a
  globally unique accession identifier at receipt. Both remain immutable,
  visible, and searchable.
- The analysis-definition model is retained for future differentiated services
  but is not a Customer intake requirement during the standard-output period.
  Future activation may specify required intake fields, submission instructions,
  supported result-artifact kinds, and validation rules.
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
  preserves both the placement snapshot and adjustment for operational and
  manual-accounting follow-up.

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
- Early-arriving samples are not a supported Customer ordering path. An
  unexpected package is quarantined and escalated through the approved
  laboratory receiving and custody exception; it does not enter the Customer
  Job receipt, accession, billing, or Lab-authorization workflow.
- Partner administrators maintain a portal shipping-address book. A selected
  address is snapshotted at placement. Billing-address and invoicing work stays
  outside POMS until a separately approved first-party workflow exists.
- Phaeno selects reagent carrier and service. A Partner may request a delivery
  date and add shipping instructions. International, temperature-controlled,
  hazardous, or otherwise restricted shipping is allowed only when both the
  reagent offering and destination configuration permit it; otherwise the order
  is blocked at placement or placed on hold with a visible reason.
- Customer lab jobs create a stable accounting source at completion and Partner
  assembly creates one at output approval. Credit-approved Customers use Net 30
  and may receive each sample's ready files before overall job completion.
  Credit-approved Partners may receive ready assembly outputs at approval.
  Organizations without applicable credit see readiness but remain held; there
  is no current hosted payment or payment-confirmation action.
- A lab job may complete when every sample has a terminal outcome, including a
  documented rejection or approved cancellation. Completed unaffected samples
  retain their results. Financial changes use a quote revision before added work
  or require Finance follow-up outside POMS for removed work.
- A reagent draft or unaccepted placed order may be cancelled immediately by a
  Partner administrator. After acceptance, cancellation is a request; Phaeno
  may cancel all or only unshipped quantities. Shipped quantities and shipment
  history remain immutable.
- An assembly draft or unaccepted submission may be withdrawn. After quote
  acceptance, cancellation is a request; Phaeno may approve, partially approve,
  or decline based on work performed, and Finance handles any adjustment outside
  POMS.
- Phaeno may place any active workflow on hold with a tenant-safe reason and
  separate internal notes. Release from hold is an audited Phaeno action.

### Communications And Documents

- For a Customer-initiated Job, the submitting administrator is the acting
  organization administrator. That administrator receives portal activity and
  email for submission/placement, changes requested, quote issue or revision,
  acceptance, rejection, cancellation outcome, and commercial holds.
- A Phaeno-initiated Job sends no Customer notice in `QuoteInPreparation`.
  Quote issue or revision sends the approval request to every active Customer
  administrator eligible to approve; issue is blocked when none exists. The
  administrator who accepts becomes the acting organization administrator and
  receives subsequent ordinary notices.
- All organization administrators receive high-impact notices: cancellation by
  Phaeno, result/output release or payment hold, reagent substitution request,
  shipment/backorder, a result/output correction or withdrawal, an
  undownloaded-package warning, and activation of a final deletion grace
  period. Duplicate acting-administrator and administrator recipients are
  suppressed.
- Released-package warning and grace emails include the normal authenticated
  Portal package-detail link, never an attachment, bearer link, or direct file-
  download URL. The Portal rechecks current membership, tenant scope, release
  gates, and file state.
- Each package receives at most one scheduled undownloaded warning email and one
  scheduled grace-activation email, with no daily reminder cadence. The Portal
  warning remains while files are undownloaded before grace; once grace is
  active, its final-deadline countdown remains until package-byte deletion.
  Delayed warning processing suppresses a stale message when all files finish
  before outbox creation; a message already queued is not recalled, and its
  authenticated destination shows current package state.
- Non-admin members do not receive transactional email by default. They see the
  organization timeline and can access released files while their membership is
  active.
- One successful file or complete-package download by any currently authorized
  organization member satisfies the applicable download state for the whole
  organization. Other administrators and members do not need duplicate
  downloads, and internal Phaeno access does not count.
- If a required released-package warning or grace notice has no active
  organization administrator recipient, its deadline remains unchanged and
  POMS creates an urgent, tenant-safe Phaeno Operations item.
- Appropriate Phaeno operational queues receive new submissions, cancellation
  requests, holds, validation failures, work awaiting action, overdue work, and
  failed notification delivery.
- Notification delivery uses an outbox/durable retry boundary. A delivery
  failure is visible to Phaeno but never rolls back the authoritative action or
  extends a released-package retention deadline.
- POMS commercial documents are operational quote and manual accounting-source
  records, not authoritative invoices. Finance prepares invoices, credits, and
  journal entries outside POMS.
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
- The implemented initial release performs no automatic deletion. Orders,
  quotes, commercial snapshots, status histories, manifests, documents, input/
  output/result files, and download audit records are currently retained
  indefinitely and are never hard-deleted through normal workflows.
- The approved future exception is the immutable customer-facing released
  deliverable package owned by `FILE-MANAGEMENT-PLAN.md`. Its release snapshots
  the effective standard-retention, warning-lead, and grace values resolved from
  the global 30/5/5 defaults, each an exact 24-hour interval, and any active
  Customer-, Partner-, or Prospect-organization override. If all package files
  were downloaded, its download access closes at the standard deadline and
  asynchronous byte deletion is queued. If any file remains undownloaded, all
  active organization administrators receive the advance warning and then the
  grace notice; access closes at the final deadline and asynchronous deletion of
  the entire package's bytes is queued. Cleanup delay never restores access, and
  a package is never deleted piecemeal.
- A download authorized and started before the applicable cutoff may finish
  within its bounded timeout and counts only after successful stream completion.
  New downloads, retries, range resumes, and archive requests at or after the
  cutoff are denied. Physical deletion waits for an active pre-cutoff lease to
  complete or expire without reopening access or changing grace or final dates.
- The finish allowance applies only to an ordinary retention cutoff. Emergency
  quarantine, package withdrawal or correction, membership deactivation, or
  organization deactivation revokes the lease and stops the active stream. The
  attempt is recorded as revoked and does not satisfy package-download status;
  bytes already transferred cannot be recalled.
- Durable server event order resolves completion/revocation races. The first
  terminal outcome committed wins; a success committed first remains successful,
  while revocation committed first stops the stream. An incomplete transfer at
  the standard deadline is undownloaded for grace activation. Partial transfers
  do not count, simultaneous leases stay independently bounded, and disconnects
  or restarts provide no resume right.
- Maximum lease duration is Phaeno operational configuration, not an
  organization retention override, and changes only newly issued leases.
  Restoring access allows a fresh request only while the package deadline remains
  in the future.
- Each configured retention day is an exact 24-hour interval from the UTC
  package-release instant. Warning and deletion work occurs at the calculated
  instant rather than midnight; Portal views show the same instant in the
  current user's labelled local time zone with a UTC fallback.
- Package metadata, names, sizes, checksums, provenance, release facts,
  notification and download audit, policy snapshot, access-closed timestamp,
  byte-deletion timestamp, and deletion outcome remain after byte deletion.
  Input files, manifests, generated documents, commercial records, and raw/
  intermediate pipeline artifacts remain outside this policy until their own
  retention rules are separately approved.
- A corrected result/output creates a new immutable package with its own
  effective-policy snapshot, full retention clock, download tracking, and
  notices. The superseded package becomes externally unavailable immediately,
  its prior downloads do not satisfy the correction, and its bytes continue
  under its existing policy or hold until deletion while metadata/audit remain.
- A preservation hold protects package bytes but never extends external access,
  resets the frozen clock, or creates another warning/grace sequence. Releasing
  an overdue hold queues deletion immediately; otherwise the original schedule
  continues.
- File-byte deletion provides no Customer or Partner self-service restore action
  and no Phaeno restoration/regeneration promise. When source material still
  exists and Phaeno explicitly authorizes regeneration, the result is a new
  linked immutable release with recorded actor/reason, a fresh effective-policy
  snapshot, clock, download state, and notices; the deleted release is never
  revived or changed.
- A permanent tenant-safe package receipt remains downloadable to an active
  organization administrator before and after byte deletion. It includes the
  package ID, filenames, sizes, checksums, release date, download-attempt start/
  completion timestamps and outcomes, successful downloader names, access-
  closed date, actual byte-deletion date, and outcome. A post-cutoff success is
  identified as a transfer that began under pre-cutoff authorization. It
  describes a revoked attempt only as access having ended and contains no
  confidential revocation reason, file content, scientific result values,
  internal notes, network telemetry, or storage identifiers.
  Ordinary members see package status without the member-level download audit.
- The initial receipt appears as an accessible Portal record and a printable PDF
  generated from the same retained facts, with generation timestamp and package
  state. It labels the displayed user time zone and includes canonical UTC for
  each retention timestamp. CSV receipt export is deferred until demonstrated
  customer demand.
- Each sample-scoped file maps to the ordering organization's frozen non-PHI
  sample identifier, original submitted-tube supplier barcode, and Phaeno
  accession identifier when applicable. A combined/project-level file is
  labelled as such and lists every included sample identifier. Internal derived-
  container barcodes and scientific lineage stay out of the tenant receipt.
- Discarding an unsubmitted draft soft-deactivates and hides it from default
  lists while preserving its minimal record, audit, and managed files under the
  same no-automatic-deletion policy.
- Any exceptional purge or retention design for records and files outside the
  approved released-deliverable policy requires separate product, legal/
  compliance, tenant-notice, and referential-integrity review before cleanup is
  enabled. Cancellation, rejection, replacement, supersession, and
  deactivation do not delete history.

### External-System Boundary

- Phaeno Portal is the operational and commercial workflow source of truth. No
  ERP, connected accounting provider, external CRM, third-party LIMS,
  warehouse, fulfillment, payment, carrier, or partner portal is assumed.
- User actions commit local workflow state, immutable commercial snapshots,
  accounting-source records, status events, and idempotent responses in the
  same transaction. Notification delivery remains a separate durable outbox.
- Finance uses the Phaeno-only report as source material and performs ledger,
  tax, invoice, credit, and posting work outside POMS. Importing or downloading
  a row never mutates its source, records payment, or releases a held file.
- The dormant QuickBooks adapter, historical outbox records, and compatibility
  field names are retained for a possible future implementation but are not
  composed at runtime. Historical retry and reconciliation commands return the
  explicit deferred response.
- Deferred QuickBooks adapter references, for future re-discovery only:
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

- `QboCatalogItem`: legacy-named, POMS-owned editable catalog item containing a
  stable code, name, description, active state, sales unit, base price, and
  currency.
- `AnalysisDefinition`: versioned portal definition linking scientific intake,
  instructions, validation, expected results, and a POMS catalog item.
- `PartnerReagentOffering`: Partner/item availability, negotiated price and
  effective dates, selling constraints, and shipping restrictions.
- `AssemblyProfile`: versioned input metadata/file contract, validation rules,
  instructions, and expected output contract, linked to a quoteable POMS
  catalog item.
- `OrganizationCommercialProfile`: audited Customer lab-credit and Partner
  assembly-credit decisions; its legacy provider identifier is dormant.
- `CommercialDocumentLink`: legacy-compatible workflow document/source record
  with kind, stable manual identifier, document number, totals/currency,
  outstanding balance, state, and timestamps. It stores references and display
  facts, not payment credentials.
- `OrderOutboxMessage` and `OrderIntegrationAttempt`: retained historical
  integration records. No active order flow creates or dispatches them.
- `OrderNotification`: durable idempotent notification delivery, retry state,
  and last error.
- `ManagedOperationalFile`: order-owned logical reference to the general managed
  file service. Storage keys remain server-owned and are never exposed as
  authorization identifiers.

### Customer Lab-Service Aggregate

`LabServiceOrder` is the root from draft through completion and owns:

- server identity and an immutable, globally unique eight-character Job number.
  New numbers use unambiguous uppercase letters and digits, contain at least one
  of each, and reject common profane or offensive fragments (including obvious
  number substitutions) before assignment
- owning Customer organization and creating/submitting users
- required Customer-visible Job name with a normalized organization-scoped
  uniqueness key, required shared storage requirements and safety declaration,
  plus optional Job notes
- workflow state, submitted/placed/completed timestamps, and cancellation state
- immutable request revisions and placement snapshot
- current quote revision and linked POMS commercial documents/source records
- Customer-safe status summary, internal assignment/notes, audit, and `Version`

Supporting records are:

- `LabServiceRequestRevision`: immutable submitted job profile, sample,
  standard-service, and instruction facts, linked to the previous revision when
  corrected.
- `LabServiceQuote` and `LabServiceQuoteLine`: immutable numbered revisions,
  initial/change purpose, issue/expiry/supersession/acceptance facts, itemized
  prices/totals/currency, accepted amendment effect, and POMS document link.
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
  and retained financial-follow-up facts.

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
- `PartnerReagentOrderLine`: POMS catalog item/offering/version snapshot,
  description, unit, quantity, negotiated unit price, currency, and line total.
- `ReagentShipment` and `ReagentShipmentLine`: shipment/packing-slip number,
  carrier/service/tracking/ship date and per-line quantity, lot/batch, and
  optional expiration.
- `ReagentOrderAdjustment`: append-only substitution or commercial revision,
  reason, before/after facts, Partner decision, and accounting follow-up state.
- `ReagentOrderStatusEvent`: append-only status, hold, backorder, cancellation,
  acceptance, and fulfillment history with tenant-safe and internal reasons.
- `ReagentCancellationRequest`: requested scope, remaining eligible quantity,
  Phaeno decision, and retained financial-follow-up facts.

### Partner Data-Assembly Aggregate

`DataAssemblyRequest` owns:

- server identity and unique human-readable `ASM-` number
- owning Partner organization and creating/submitting users
- Partner project reference, active profile/version, workflow status, assignment,
  current quote/release, audit, and `Version`
- required PO at quote acceptance and linked POMS commercial documents/source
  records

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

Statuses describe operational progress. Quote state, accounting-source state,
payment state, and file release state remain separate so the product never
hides a commercial or scientific hold inside one overloaded status.

Every command validates the selected tenant, capability, allowed source state,
last-read `Version`, required reason/data, and idempotency key when applicable.
Every successful command appends an audit/status event in the same transaction.

### Customer Lab-Service Order

| State | Authorized next action | Result |
| --- | --- | --- |
| `Draft request` | Customer admin edits, submits, or withdraws | Submission creates an immutable request revision and moves to `Submitted for quote`; withdrawal moves to `Cancelled`. |
| `Submitted for quote` | Phaeno quote operator starts pricing, requests changes, or declines | Moves to `Quote in preparation`, `Changes requested`, or `Declined`; changes/decline require a Customer-safe reason. |
| `Changes requested` | Customer admin creates a corrected revision, resubmits, or withdraws | Resubmission returns to `Submitted for quote`; prior revision remains immutable. |
| `Quote in preparation` | Phaeno quote operator issues, requests changes, or declines | Issue atomically creates the immutable POMS quote/document, status event, and notice; state becomes `Quote issued` immediately. |
| `Quote issued` | Customer admin accepts latest unexpired quote or withdraws; Phaeno may issue a revision | Acceptance freezes the placement snapshot and moves to `Placed/Awaiting samples`; revision supersedes the prior quote. Expiry is derived from the quote date and blocks acceptance. |
| `Placed/Awaiting samples` | Customer admin enters/imports and finalizes the exact roster, then Phaeno prepares intake; Customer admin may request cancellation | Roster finalization creates specimen-specific Lab authorization and shipping records; first active laboratory work moves the job to `In progress`. |
| `In progress` | Phaeno advances samples, releases eligible results, holds/rejects samples, or decides cancellation | Any downloadable result exposes the `Results available` milestone; the job continues until all samples are terminal. |
| `Results available` | Phaeno continues remaining samples or completes the job | This Customer-visible milestone may coexist with remaining work. |
| `Cancellation requested` | Phaeno approves all/part, declines, or requests clarification | Approved scope is closed and retained for Finance follow-up; declined scope returns to its prior operational state. |
| `Completed` | No normal operational transition | Every sample is terminal and one stable manual accounting source is created. File release may still show `Payment required`. |
| `Cancelled` / `Declined` | No normal operational transition | History and any received sample/financial facts remain preserved. |

### Individual Lab Sample

| State | Phaeno-controlled transition and evidence |
| --- | --- |
| `Expected` | `Received` requires an authorized post-finalization shipment, received time, and condition. An unmatched or early package does not advance through this order state. |
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
| `Placed` | System commits the validated placement snapshot; Partner admin may cancel | The same transaction moves the order directly to `Under review`; no external synchronization gate applies. |
| `Under review` | Phaeno fulfillment operator accepts, holds, rejects, or Partner admin cancels | Acceptance moves to `Accepted`; any increased commercial revision requires Partner approval first. |
| `Accepted` | Phaeno starts fulfillment, holds, or decides a cancellation request | Start moves to `Processing`. |
| `Processing` | Phaeno records shipment, backorder, hold, substitution proposal, or cancellation decision | Partial allocation moves to `Partially shipped`; all active quantity shipped moves to `Shipped`. |
| `Partially shipped` | Phaeno adds shipments, updates ETA, proposes substitution, or closes approved remainder | Repeats until no active remaining quantity, then moves to `Shipped` or `Cancelled` for a fully cancelled remainder. |
| `Shipped` | Phaeno performs operational closeout | Moves to `Fulfilled`; delivery confirmation is not required in the initial release. |
| `On hold` | Phaeno releases to the recorded prior state, rejects, or cancels eligible scope | Requires visible reason and separate internal notes. |
| `Cancellation requested` | Phaeno approves unshipped scope, partially approves, or declines | Shipped facts stay immutable; approved financial changes are retained for Finance follow-up. |
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
| `Quote in preparation` | Phaeno quote operator issues, requests changes, or rejects | Issue atomically creates the immutable POMS quote/document, status event, and notice; visibility is immediate. |
| `Quote issued` | Partner admin supplies PO and accepts latest unexpired quote or withdraws; Phaeno may revise | Acceptance freezes the validated input/profile/commercial snapshot and moves to `Placed/Queued`. |
| `Placed/Queued` | Phaeno assembly operator starts processing, holds, or decides cancellation | Start creates a processing run and moves to `Processing`. |
| `Processing` | Phaeno records progress, failure/retry, hold, cancellation, or sends output to review | Successful processing moves to `Output review`. |
| `Output review` | Phaeno approves an immutable output release or sends it back to processing | Approval creates the release and stable manual accounting source, applies the credit/payment-hold gate, and moves to `Output available`. |
| `Output available` | System evaluates credit and payment-hold gates; Phaeno closes work | Eligible members can download only when release gates pass; closeout moves to `Completed`. |
| `On hold` | Phaeno returns to the recorded prior state, rejects, or cancels | Requires a Partner-safe reason. |
| `Cancellation requested` | Phaeno approves all/part or declines | Work and financial history remain preserved; approved adjustments are retained for Finance follow-up. |
| `Completed` / `Cancelled` / `Rejected` | No normal operational transition | Corrected output after completion creates a new immutable release, not a status rewind. |

An accepted lab or assembly job does not rewind to `Quote issued` for a scope
change. Phaeno issues a parallel immutable POMS change quote and the
organization administrator accepts or declines it. Only the accepted amendment
becomes eligible work; existing work, status, and the original placement
snapshot remain unchanged.

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

- `/api/platform/lab-service-orders`: idempotent Customer-order initiation,
  queue, request review, quote revisions, receipt/accession, sample transitions,
  result releases, holds, cancellation, and completion. Initiation takes the
  Customer organization plus the same Job pricing profile used by Customer
  drafts, creates no samples, and enters `Quote in preparation`.
- `/api/platform/reagent-orders`: queue, accept/reject/hold, substitution
  proposals, backorders, shipments, cancellation, and fulfillment closeout.
- `/api/platform/data-assembly-requests`: intake decisions, quotes, processing
  runs, output review/release, holds, cancellation, and completion.
- `/api/platform/order-configuration`: POMS catalog items/links, analysis
  definitions, reagent offerings/prices, assembly profiles, credit decisions,
  quote defaults, and shipping/instruction settings.
- `/api/platform/order-accounting/journal-entries[.csv]`: Phaeno-only inclusive-
  date manual accounting-source projection and CSV.
- `/api/platform/order-integrations`: historical synchronization records remain
  readable; retry and payment-reconciliation commands return the explicit
  deferred response. There is no active provider webhook route.

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
- Draft creation, submission, placement, quote acceptance, sample-roster
  finalization/Lab authorization, shipment creation, quote issuance, result
  release, and completion require an `Idempotency-Key`. The server
  persists the key, actor, scope, request hash, and result so a retry returns the
  original outcome and a mismatched reuse is rejected.
- List endpoints are server-paged and accept only allowlisted sort/filter fields.
  Cross-tenant ids return a non-disclosing not-found response.
- Upload endpoints return managed logical file ids and validation/scan state,
  never storage paths or trusted client checksums. Download endpoints recheck
  current tenant, membership, artifact release, and commercial gate.
- DTOs expose current state, `Version`, permitted-action booleans, Customer-safe
  timeline, commercial/release summaries, and linked document facts. Internal
  notes and notification diagnostics appear only in authorized platform DTOs.

## Approved Frontend Surfaces

Customer navigation:

- `Lab services` appears only with Customer view capability.
- Customer sample preparation and shipping are job steps inside `Lab services`;
  they do not appear as a separate primary-navigation destination. Prospect
  Trial Project shipping retains its independently authorized entry point.
- The list provides status/date search, filters, empty/loading/error states, and
  `Request lab service` only for administrators.
- `Request lab service` opens a bounded Job pricing-details modal with a
  required, organization-unique Job name, one or more required biological-
  source groups and sample counts, required shared storage requirements and
  safety declaration, and optional Job notes. Creating the Job assigns the
  immutable Job number and opens its record workspace with no individual
  samples.
- After quote acceptance, the record workspace owns the exact sample list. Add
  and Edit use bounded modals containing Customer sample ID and integer tube
  quantity, plus biological source when the accepted Job has multiple source
  groups. The list shows the accepted Job profile once instead of repeating its
  shared values on every sample.
- The job header shows the optional Job notes directly below the Job name, then
  the updated date. The immutable Job number appears once in the breadcrumb and
  is not repeated in the header metadata.
- Submit-for-pricing remains on the record workspace, requires a complete Job
  pricing profile and zero individual samples, and requires the current no-PHI
  confirmation before freezing the submitted revision.
- The record workspace keeps job actions, action-needed messages, and current
  laboratory progress visible above four responsive tabs: `Samples & shipping`,
  `Quote & billing`, `Data & results`, and `Timeline`. The tabs preserve all
  Customer-visible custody, commercial, release, revision-history, and milestone
  facts while avoiding one long two-column page.
- `Samples and shipping` unlocks after placement, owns the snapshotted
  submission instructions, and presents either the job's authorized return-kit/
  packet shipments or the current carrier/tracking actions for unreceived
  samples. A Customer shipment detail returns to its owning lab job.
- `Data and results` links into a job-scoped Data Library view. That view uses
  the existing tenant-authorized result-package and file-download contracts,
  preserves a return path to the job, and keeps the top-level organization Data
  Library available for separately assigned curated packages.
- Quote acceptance shows the complete immutable scope, expiration, itemized
  totals, instructions, credit/payment behavior, and confirmation consequence.

Partner navigation:

- `Reagent orders` and `Data assembly` appear only with their view capability.
- Reagent creation is a dedicated cart/review flow, not an inline list form. It
  supports controlled offerings/quantities, address selection, PO, requested
  date/instructions, price review, and explicit placement.
- Reagent detail shows placement snapshot, line fulfillment/backorders,
  substitution decisions, shipments/tracking/lots, POMS commercial documents,
  and a
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
- `Order operations` is a platform-only Commercial workspace with Order intake,
  one Orders list, and Accounting in the shared far-left sidebar. PSeq Lab
  Service, PSeq Kit, and Data Assembly are order types in that list, not peer
  operational modules. The
  sidebar is a remembered pinned rail on wide screens and the same non-modal
  hover, keyboard, and click rail when narrow or unpinned.
- The Orders list supports order type, assigned/unassigned, organization,
  status, overdue, and hold filters. Detail pages expose only Commercial
  commands and separate tenant-safe reasons from internal notes.
- Order intake exposes `New Customer order` to Phaeno users with order-pricing
  authority. Its bounded modal incrementally searches the eligible Customer
  list and captures the same price-bearing Job profile as the Customer flow.
  Saving creates the
  immutable submitted revision, opens the operational detail in `Quote in
  preparation`, and leaves quote issuance as the only path that makes pricing
  available for Customer-admin approval.
- Lab Operations owns the separate Receipt & accession, PSeq kit fulfillment,
  Data Assembly, and scientific execution surfaces. Commercial order details
  link to those Lab records without duplicating their mutations in Order Ops.
- `Accounting` contains the date-filtered journal-entry source preview and CSV
  download plus notification recovery. It states that downloading does not post,
  record payment, or release held files.
- `Order configuration` contains POMS catalog item creation/linking,
  analyses, Partner offerings/prices, assembly profiles, credit settings, quote
  defaults, shipping restrictions, and instruction configuration. Defaults,
  Catalog, Analyses, Sample shipping, PSeq kits, Assembly, and Credit use the
  same shared far-left sidebar behavior as the other multi-section POMS
  workspaces; the former in-page tab row is removed.

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
  and output release plus its immutable snapshot, accounting source, status
  event, notice, and idempotent response as one database transaction.
- Generate workflow numbers server-side with concurrency-safe uniqueness.
- Revalidate organization kind, capability, active configuration, POMS catalog item,
  Partner price/effective date, quantity, address, quote revision/expiry, file
  state, and commercial gate on the server at the consequential command.
- Audit draft creation, submission, quote/revision/acceptance, placement,
  receipt/accession, every status transition, holds, rework/replacement,
  validation decisions, shipments, substitutions, cancellations, releases,
  downloads, configuration, accounting-source creation, and notification state.
- Keep tenant-safe reasons separate from internal notes. Never include internal
  notes, tokens, credentials, unnecessary personal data, or sensitive file
  contents in logs, emails, audit diffs, or accounting-report memo fields.
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
- Do not configure or consume QuickBooks OAuth credentials or webhook secrets
  while the integration is deferred. Any future activation requires a separate
  approved security and idempotency design.
- Retry notification delivery with bounded backoff and visible dead-letter/
  needs-attention state. No external data silently overwrites an immutable
  portal snapshot.
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
   - Implement provider-neutral commercial document/source records, retained
     historical adapter seams, and configuration authorization.
   - Extract or implement a general managed operational-file boundary with local
     storage, checksum, scan, authorization, and audited download behavior.
   - Define synthetic analysis and assembly profiles for tests only; production
     profiles remain inactive until scientifically approved configuration exists.
2. **Commercial and configuration foundation**
   - Add POMS catalog item creation/linking, organization commercial profiles,
     quote-validity configuration, analysis definitions, Partner reagent
     offerings/prices, shipping restrictions, and assembly profiles.
   - Add Phaeno configuration UI for catalog, scientific links, and credit.
3. **Customer request and quote vertical slice**
   - Implement draft, multi-sample intake, submit/changes-requested/resubmit,
     immediate POMS quote revisions, quote acceptance, immutable placement, and
     Customer/Phaeno workspaces.
4. **Customer laboratory and result vertical slice**
   - Implement shipping facts, receipt/accession, independent sample stages,
     holds/rejections/replacements/rework, result upload/review/release,
     completion accounting source, credit/payment-hold gate, cancellation,
     documents, and notifications.
5. **Partner reagent vertical slice**
   - Implement address book, controlled offerings, draft/create-from-prior,
     locally validated placement, Phaeno review, commercial revisions,
     substitutions, partial shipments/backorders, accounting-source-on-shipment,
     cancellation, documents, notifications, and workspaces.
6. **Partner data-assembly vertical slice**
   - Implement profile-driven draft/upload/scan, immutable input revisions,
     validation/correction, job quote/acceptance, processing runs, immutable
     output releases, output-approval accounting source, credit/payment-hold
     gate, cancellation, documents, notifications, and workspaces.
7. **Operational reporting and production hardening**
   - Add cross-workflow queues, overdue/hold views, tenant CSV exports, the
     Phaeno manual journal-entry source report, notification recovery, retention
     safeguards, rate/size limits, observability, and complete security/
     accessibility verification.
   - Configure production storage/scanning, real analysis/assembly profiles,
     shipping restrictions, manual-accounting runbooks, and notification
     delivery before production activation.

Execution checkpoint:

- [x] Phases 1-6 are implemented for local development, including capability
  boundaries, all three tenant workflows, Phaeno operations/configuration,
  manual accounting sources and notification outboxes, managed-file gates,
  immutable revisions and snapshots, payment/credit release rules,
  cancellation, and reporting.
- [x] Phase 7 application work is implemented for operational queues,
  assignments/due dates, holds/overdue filters, CSV exports, manual accounting
  and notification recovery, API rate limits, upload limits, audit history,
  and tenant-safe versus internal-data separation.
- [ ] Production activation remains pending the external configuration,
  scientific approval, Finance/manual-accounting validation, deployment, and deferred
  database-backed/contract/security/accessibility coverage listed above and in
  the three owning test plans.

## Approved Acceptance Scenarios

### Customer Lab Service

1. An active Customer administrator for an organization with an effective,
   `Ready` PSeq Lab Service entitlement and active offering creates the Job
   pricing-profile draft in a modal with a required organization-unique Job
   name, source groups and sample counts, shared storage requirements, shared
   safety declaration, and optional Job notes. The system assigns an immutable
   eight-character Job number and lands on the record workspace. The
   administrator reviews the no-PHI declaration and submits one immutable
   request revision with no individual samples. A non-admin or ineligible
   organization cannot create or submit it, and another Customer cannot
   discover it.
2. Alternatively, an authorized Phaeno order-pricing user selects an active
   Customer with the same effective entitlement and offering plus at least one
   active eligible organization administrator, enters the same Job pricing
   profile, confirms the no-PHI attestation, and selects `Start pricing`. The
   Customer-owned record has one immutable submitted request revision, no
   samples, and status `Quote in preparation`; it sends no Customer notice, and
   the Phaeno user cannot approve the quote for the Customer.
3. Phaeno returns a field-specific change request. The Customer submits a new
   revision; both versions and the reason remain visible in the permitted
   timeline.
4. Phaeno issues an itemized job quote after rechecking the effective
   entitlement, active offering, and at least one eligible Customer approver.
   The same transaction makes it Customer-visible, records the status event,
   and queues one deduplicated approval notice for every active eligible
   Customer administrator. A newer revision supersedes the first; expired or
   superseded quotes cannot be accepted.
5. Customer-admin acceptance freezes the Job name, Job notes, specimen count,
   biological-source composition, shared storage and safety declarations,
   standard service/output scope, instructions, prices, currency, and
   expiration plus the effective entitlement/offer eligibility. The accepting
   administrator becomes the acting order contact. Acceptance opens exact
   sample-list preparation; finalization creates the Lab authorization.
   Repeated acceptance with the same idempotency key returns the same placed
   job. A later entitlement end blocks new Jobs without silently cancelling
   this accepted one.
6. Phaeno records receipt, condition, immutable accession id, and independent
   progress for each sample. A held/rejected sample requires a Customer-safe
   reason; a replacement is linked without erasing the original.
7. A credit-approved Customer downloads one sample's released result while
   other samples remain in progress, before the overall job accounting source
   exists. A non-credit Customer sees readiness but cannot download any held job
   result; report generation never clears the hold.
8. Completion succeeds only when every sample is terminal. Cancellation after
   placement is decided by Phaeno, preserves work/history, and retains any
   financial follow-up for Finance outside POMS.

### Partner Reagent

1. An active Partner administrator creates a multi-line draft using only active
   offerings for that Partner. The server rejects another Partner's price,
   inactive item, invalid unit/increment, out-of-range quantity, restricted
   destination, missing PO, or stale price.
2. Creating from a prior order copies eligible lines into a new draft but not
   the PO, address snapshot, price, or availability decision; every fact is
   revalidated at placement.
3. Placement freezes the PO, shipping address, items, quantities, negotiated
   prices, and currency, then moves the one local order directly into Phaeno
   review without an external synchronization state.
4. Phaeno partially ships a line and backorders the remainder. The Partner sees
   shipment quantity, remaining quantity, ETA when known, carrier/tracking,
   lot/batch, expiration when applicable, packing slip, and the shipment's
   accounting-source amount.
5. A proposed substitute is not fulfillable until a Partner administrator
   approves the item and commercial effect. Approval and decline both preserve
   the original placement and proposal history.
6. Cancellation before Phaeno acceptance is immediate. After acceptance, only
   unshipped scope may be approved for cancellation; shipped facts and
   accounting-source records remain intact.

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
   requires a PO and current unexpired POMS quote, and freezes the input/profile/
   commercial snapshot.
4. Phaeno records a processing run with profile/pipeline versions, provenance,
   QC, and immutable output manifest. A corrected output becomes a new release
   and never overwrites the prior one.
5. Output approval creates the stable manual accounting source. Credit-approved
   Partner members may download ready outputs immediately; non-credit Partner
   members see readiness but remain blocked, and report generation never clears
   the hold. Every file download is tenant-authorized and audited.
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
4. Failed notification delivery retries without duplicating the business action.
   Repeated accounting report downloads return the same stable entry IDs without
   creating new source records or marking them posted.
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
   override, and exposes only Order-level schedule health to first-party CRM or
   a future external CRM.

## Verification Plan

The running backend, frontend, and e2e test plans now record the implemented
tests, latest execution results, and remaining production-gate coverage. Before
production activation, complete the following minimum coverage:

- Backend unit/domain tests for every transition table, immutable revision,
  quantity/price/date invariant, release gate, cancellation decision, and
  Customer-safe/internal data boundary.
- Backend integration tests against PostgreSQL for tenant isolation, optimistic
  concurrency, idempotency, notification/accounting-source atomicity, unique
  workflow/accession numbers, effective-dated prices, managed-file ownership,
  and download audit.
- Manual accounting API/PostgreSQL tests for Phaeno-only access, inclusive UTC
  date filtering, stable entry IDs, exact billing boundaries, historical-
  provider exclusion, safe CSV output, and repeat-download non-posting.
- QuickBooks adapter contract and sandbox tests are deferred with the integration
  and are not a current production gate.
- Frontend component tests for capability navigation, forms/validation, quote
  review, upload/scan progress, transition confirmations, safe timelines,
  release/payment banners, substitutions, backorders, and error recovery.
- E2E journeys for every approved acceptance scenario, including Customer admin
  and member, Partner admin and member, Prospect denial, platform operations,
  two-tenant isolation, narrow viewport, and keyboard-only operation.
- Accessibility verification for focus order/restoration, required fields,
  table/list semantics, live status and upload announcements, validation errors,
  dialogs, color contrast, zoom/reflow, reduced motion, and automated axe checks.
- Failure tests for stale versions, repeated idempotency keys, notification
  outage, scan unavailable/rejected, storage cleanup/reconciliation,
  expired/superseded quotes, changed prices, restricted destinations, payment
  hold, and deactivated membership.
- Security tests for client-supplied organization/file/storage ids, cross-tenant
  enumeration, malicious file names/content types, size/count limits, unsafe CSV
  values/logs, and attempted PHI/prohibited-data submission.
- Production-readiness smoke tests for configured storage/scanner, email
  delivery, manual accounting reconciliation, upload/download, and one non-
  billable synthetic end-to-end journey before activation.

Test execution was not requested for this implementation checkpoint, so the
living test suites were updated but not run. Production and authenticated
database/browser tests remain separate because they require explicit execution,
external configuration, and deployment authority.

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
- [x] POMS catalog/quote/accounting-source ownership, Finance-owned ledger/tax/
  posting work, payment-hold boundary, currency, idempotency, failure, and
  reconciliation responsibilities are explicit; QuickBooks is deferred.
- [x] Base notification events and recipient rules, documents, search, queues,
  CSV export, audit views, the approved future released-deliverable global
  30/5/5 defaults and organization overrides, and preservation of all other
  records/files are explicit. The Phaeno-initiated Job recipient exception was
  resolved on 2026-08-27: no notice during quote preparation, all active
  eligible Customer administrators at quote issue/revision, the accepting
  administrator for later ordinary events, and all active administrators for
  high-impact events.
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
- Organization self-service purge, self-service legal-hold administration,
  exceptional purge, and retention policies for inputs, documents, commercial
  records, and raw/intermediate pipeline files. Automatic released-deliverable
  deletion under the global configurable policy is approved future scope, not
  deferred product scope.
- Scheduled reports, bulk file/document export, custom report builders, advanced
  analytics, and data-warehouse feeds.
- Customer/Partner-authored catalog items, negotiated-price editing by Partners,
  manual placement price overrides, and offline order imports.
- Final delivery confirmation from carriers; `Fulfilled` is Phaeno operational
  closeout after all active quantities are shipped or cancelled.
