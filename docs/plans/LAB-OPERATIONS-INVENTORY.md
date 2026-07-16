# Lab Operations Current-State Inventory and Ownership Classification

This document completes Steps 1 and 2 of Phase 0 in
`LAB-OPERATIONS-PLAN.md`:

1. inventory the existing laboratory-related implementation
2. classify each current element by target module, project, schema, and
   disposition

This is a planning artifact only. It does not authorize project renames,
namespace changes, schema changes, entity moves, migrations, API changes, or UI
changes.

## Inventory Date and Evidence

Inventory completed on 2026-07-16 from the pre-restructure repository source:

- `backend/PhaenoPortal.slnx`
- backend project files under `backend/app`, `backend/test`, and `backend/tools`
- `backend/app/Infrastructure/Persistence/AppDbContext.cs`
- `backend/app/Features/OrderManagement`
- current EF migrations and model snapshot
- current Order Management controllers and frontend routes
- `backend/test/OrderManagementDomainTests.cs`
- current session capabilities in Accounts

Stage 1 of `PSEQ-OPERATIONS-MIGRATION-PLAN.md` subsequently renamed the
solution, API/test/Reference Journey project shells, and added empty Commercial
and Laboratory projects. The following context/schema checkpoint then renamed
the single context, removed the default schema, and mapped every current entity
to `commercial_ops`. The Accounts, Relationships, and Data Provisioning domain
entities and pure application code were then moved into Commercial, along with
their environment-neutral ports. Commercial configuration/catalog, Partner kit
ordering and fulfillment, commercial workflow/outbox/notification records, and
environment-neutral QuickBooks/notification ports followed as the first two
Order Management sub-slices. Immutable lab-service request revisions and
lab-service/data-assembly quotes are the third; external download audit is the
fourth. The API retains HTTP, EF mapping/orchestration,
Clerk/Postmark/QuickBooks adapters, environment configuration, local
file/scanner, hosted dispatch, mixed/deferred Order Management records, and
error translation. No Laboratory entities were created, and the old
database and seven-migration lineage were replaced on 2026-07-16 by the clean
`InitialPSeqOperations` Development baseline.

## Findings

The current system is one deployable .NET web project with feature folders,
an active Commercial module plus an empty Laboratory module shell, one test
project, one reference-journey tool, one React frontend, and one EF Core
`PSeqOperationsDbContext`. The current EF model targets `commercial_ops`,
creates an empty `lab_ops`, and keeps migration history in `public`; the rebuilt
Development database contains no `portal` schema.

The principal boundary problem is not the modular-monolith deployment. It is
that the current `OrderManagement` feature and `portal` schema jointly own:

- customer and partner commercial ordering
- quoting and QuickBooks integration
- customer specimen submission
- physical receipt and accession
- internal laboratory state
- partner kit/reagent fulfillment
- data-assembly intake and processing state
- operational file records
- scientific review and customer release

Several existing aggregates therefore cannot be moved intact. They must be
split so Commercial Operations retains the customer and commercial record
while Lab Operations receives only authorized work and owns laboratory
execution.

## Approved Target Naming Map

These are target names for future implementation planning. No rename is made by
this inventory.

| Current | Target | Classification |
| --- | --- | --- |
| `backend/PhaenoPortal.slnx` | `backend/PSeq.Operations.slnx` | Stage 1 complete; external product remains Phaeno Portal. |
| `PhaenoPortal.App` web project | `PSeq.Operations.Api` | Stage 1 shell rename complete; Accounts HTTP/persistence/external adapters remain here by design. |
| Accounts, Relationship Management, Data Provisioning, and commercial Order Management code | `PSeq.Operations.Commercial` | Accounts, Relationships, and Data Provisioning domain/application code moved. Commercial configuration/catalog, Partner kit, integration, notification, workflow-support, request-revision, quote, and external download-audit code moved; mixed/deferred Order Management records are pending. |
| Internal laboratory execution code currently inside Order Management | `PSeq.Operations.Laboratory` | Empty project shell exists; Lab implementation remains pending. |
| `PhaenoPortal.Test` | `PSeq.Operations.Test` | Stage 1 shell rename complete; remains the initial combined test project. |
| `PhaenoPortal.ReferenceJourney` | `PSeq.Operations.ReferenceJourney` | Stage 1 rename complete. |
| `PhaenoPortal.App.*` namespaces | `PSeq.Operations.Api.*`, `.Commercial.*`, and `.Laboratory.*` | Namespace follows the owning project. |
| `AppDbContext` | `PSeqOperationsDbContext` | Complete. One context remains; the API applies explicit entity mappings and enforces module schema ownership. |
| configured schema `portal` | `commercial_ops` | Complete in the rebuilt Development database; all 51 current business tables are in `commercial_ops`. |
| no laboratory schema | `lab_ops` | Complete as an empty reserved schema in the clean baseline; no Laboratory entities are implied. |
| one `PersistenceOptions.Schema` setting | explicit Commercial, Lab Operations, and migration-history schema settings | Implemented; validation requires three distinct snake-case identifiers. |
| physical database naming based on Phaeno Portal | environment-specific PSeq Operations database naming | Keep one database. Apply naming when an environment is rebuilt or migrated; do not couple it to the entity split. |
| React application and external title `Phaeno Portal` | retain `Phaeno Portal` | External product identity is not renamed. |

The two target business schemas are `commercial_ops` and `lab_ops`. The
completed reset design places the single EF migration-history table in
PostgreSQL `public` as module-neutral technical infrastructure; `public` owns
no business records. See `PSEQ-OPERATIONS-MIGRATION-PLAN.md`.

## Current Solution and Feature Classification

| Current area | Current location | Target owner/project | Disposition |
| --- | --- | --- | --- |
| HTTP host, authentication wiring, API envelope, error mapping | `backend/app/Program.cs`, `Infrastructure/Api` | `PSeq.Operations.Api` | Retain as thin host/shared HTTP infrastructure. |
| Accounts and Clerk identity mapping | Commercial `Accounts` plus API `Features/Accounts` adapters | Commercial | Domain entities and pure policy are in Commercial; the API retains HTTP, actor lookup, EF orchestration, Clerk/Postmark, and bootstrap adapters. Lab roles reuse internal users but remain Lab-owned authorization concepts. |
| Relationship state and service entitlements | Commercial `Relationships` plus API `Features/RelationshipManagement` adapters | Commercial | Domain entities and service-eligibility policy are in Commercial; the API retains HTTP, EF mapping/orchestration, actor enforcement, and error translation. Entitlements authorize work; they do not become Lab records. |
| Curated data provisioning | Commercial `DataProvisioning` plus API `Features/DataProvisioning` adapters | Commercial | Domain entities, pure policy, manifest construction, and file/scanner/notification ports are in Commercial; the API retains HTTP, EF, authorization, environment configuration, local storage/scanner, Postmark, and dispatch adapters. Its `SourceSample` is curated reference-data provenance, not a received customer laboratory specimen. |
| Health endpoints | `Features/Health` | API host | Retain as deployment/runtime infrastructure. |
| Order Management | Commercial `OrderManagement` plus API `Features/OrderManagement` | Split | Commercial configuration/catalog, Partner kit domain rules, request revisions, quotes, external download audit, commercial workflow/outbox/notification records, and environment-neutral vendor ports are in Commercial. API adapters, mixed lab execution, and deferred pipeline/file records remain pending their approved splits. |
| EF context and migrations | `Infrastructure/Persistence`, `Migrations` | Shared API composition with module-owned mappings | Keep one context and migration stream; replace one default schema with explicit mappings. |
| Audit interceptor and current `audit_events` table | `Infrastructure/Persistence/Auditing` | Shared infrastructure | Retain current behavior during restructuring. Whether Lab audit records remain shared or become Lab-owned is deferred to migration design. |
| React frontend | `frontend` | One Phaeno Portal application | Retain one application; split feature ownership and navigation internally. |
| Reference Journey tool | `backend/tools/PSeq.Operations.ReferenceJourney` | Shared verification utility | Uses the renamed context and explicit schema settings; it passes against the clean baseline and rolls back every fixture row. |

## Current Order Management Entity Classification

All entities below are currently mapped by `PSeqOperationsDbContext` into
`commercial_ops` and created there by `InitialPSeqOperations`. Table names shown
are the current snake-case names.

### Commercial Configuration and Integration

| Current entity/table | Target owner/schema | Disposition and target meaning |
| --- | --- | --- |
| `QboCatalogItem` / `qbo_catalog_items` | Commercial / `commercial_ops` | Retain. QuickBooks catalog projection and base commercial facts. |
| `AnalysisDefinition` / `analysis_definitions` | Commercial / `commercial_ops` | Retain as customer-facing service/intake/result definition. A future Lab protocol mapping is a separate Lab-owned record. |
| `PartnerReagentOffering` / `partner_reagent_offerings` | Commercial / `commercial_ops` | Retain but rename toward `PSeqKitOffering`; it is negotiated kit pricing, not an internal laboratory reagent. |
| `AssemblyProfile` / `assembly_profiles` | Deferred / remain Commercial temporarily | Freeze in place. It combines intake, file, output, and pipeline assumptions covered by the major pipeline/file TBD. |
| `OrganizationCommercialProfile` / `organization_commercial_profiles` | Commercial / `commercial_ops` | Retain. QuickBooks customer link and commercial credit state. |
| `OrderSystemConfiguration` / `order_system_configurations` | Commercial / `commercial_ops` | Retain. Current quote validity, customer submission instructions, and shipping configuration are customer/commercial concerns. |
| `CommercialDocumentLink` / `commercial_document_links` | Commercial / `commercial_ops` | Retain. QuickBooks estimate, invoice, credit, and payment references. |
| `OrderOutboxMessage` / `order_outbox_messages` | Commercial / `commercial_ops` | Retain for commercial integrations. A future Lab boundary requires its own provider-neutral delivery records rather than overloading this entity. |
| `OrderIdempotencyRecord` / `order_idempotency_records` | Commercial / `commercial_ops` | Retain for current APIs; reconsider generic HTTP idempotency placement only during implementation design. |
| `OrderNotification` / `order_notifications` | Commercial / `commercial_ops` | Retain. External communication remains Commercial-owned. |
| `OrderStatusEvent` / `order_status_events` | Commercial / `commercial_ops` | Retain for the customer/commercial timeline. Lab requires a separate execution history and publishes only stable milestones. |
| `OrderCancellationRequest` / `order_cancellation_requests` | Commercial / `commercial_ops` | Retain. Commercial cancellation request and decision; Lab receives only an approved amend/cancel command. |

### PSeq Lab Service: Aggregates That Must Split

| Current entity/table | Target owner/schema | Disposition and target meaning |
| --- | --- | --- |
| `LabServiceOrder` / `lab_service_orders` | Split between Commercial / `commercial_ops` and Laboratory / `lab_ops` | Replace the mixed aggregate. Commercial retains organization, commercial order number, request/quote/placement/cancellation, customer status, and release relationship. Lab receives a new `LabWorkOrder` containing authorization and execution state. Do not move the current table wholesale. |
| `LabServiceRequestRevision` / `lab_service_request_revisions` | Commercial / `commercial_ops` | Now lives in Commercial. Retain as the immutable customer submission/revision snapshot associated with the commercial order. Lab receives the authorized execution payload through the future contract. |
| `LabSample` / `lab_samples` | Split between Commercial / `commercial_ops` and Laboratory / `lab_ops` | Commercial retains the submitted specimen reference, declared metadata, requested service, and inbound-shipment context. Lab receives new accession, specimen, container, location, intake-disposition, and execution records. Preserve stable correlation IDs; do not move this table intact. |
| `LabServiceQuote` / `lab_service_quotes` | Commercial / `commercial_ops` | Now lives in Commercial. Retain and rename with the commercial order model if needed. It has no Lab Operations ownership. |
| `LabResultRelease` / `lab_result_releases` | Split; current record remains in Commercial until pipeline TBD is resolved | Lab eventually owns scientific approval and `Ready for release`; Commercial owns the immutable customer release/version and visibility. Pipeline version, provenance, manifest, and file assumptions remain explicitly unassigned. Do not move this table in the first restructure. |

### Partner Kit/Reagent Commerce

These records represent products sold to Partners. They are not internal Lab
Operations reagent or inventory records.

| Current entity/table | Target owner/schema | Disposition and target name |
| --- | --- | --- |
| `PartnerShippingAddress` / `partner_shipping_addresses` | Commercial / `commercial_ops` | Retain; consider `OrganizationShippingAddress` if kit eligibility later extends beyond Partner-only naming. |
| `PartnerReagentOrder` / `partner_reagent_orders` | Commercial / `commercial_ops` | Retain but rename to `PSeqKitOrder` when the approved bundle model is implemented. |
| `PartnerReagentOrderLine` / `partner_reagent_order_lines` | Commercial / `commercial_ops` | Retain but rename to `PSeqKitOrderLine`. |
| `ReagentShipment` / `reagent_shipments` | Commercial / `commercial_ops` | Retain but rename to `KitShipment`; this is customer fulfillment, not internal NGS send-out. |
| `ReagentShipmentLine` / `reagent_shipment_lines` | Commercial / `commercial_ops` | Retain but rename to `KitShipmentLine`. Its lot/expiration fields describe fulfilled commercial kit units and do not replace Lab reagent-lot records. |
| `ReagentOrderAdjustment` / `reagent_order_adjustments` | Commercial / `commercial_ops` | Retain but rename to `KitOrderAdjustment`. |

### Data Assembly and Scientific Files

The approved product direction removes data assembly as a separately sold
standard product. It becomes an included phase of PSeq Lab Service or PSeq Kit.
The technical pipeline and file boundary is deliberately unresolved.

| Current entity/table | Target owner/schema | Disposition |
| --- | --- | --- |
| `DataAssemblyRequest` / `data_assembly_requests` | Commercial case plus deferred processing boundary | Preserve current data. Replace the standalone-sale aggregate with an included assembly case under its PSeq order only after the pipeline contract is defined. Do not move it to `lab_ops`. |
| `AssemblyInputRevision` / `assembly_input_revisions` | Major pipeline/file TBD | Freeze and preserve. Ownership depends on the future customer-data intake and pipeline boundary. |
| `DataAssemblyQuote` / `data_assembly_quotes` | Commercial history / `commercial_ops` | Now lives in Commercial. Retain historical records, then retire the standalone quote path when the bundle model is implemented. |
| `AssemblyProcessingRun` / `assembly_processing_runs` | Major pipeline/file TBD | Freeze and preserve. Do not classify as Lab Operations merely because it processes scientific data. |
| `AssemblyOutputRelease` / `assembly_output_releases` | Split between deferred pipeline output and Commercial release | Preserve current records. Commercial will own customer release; pipeline metadata remains TBD. |
| `ManagedOperationalFile` / `managed_operational_files` | Major pipeline/file TBD; remain in current schema | Preserve current behavior. Do not move Lab-result or assembly files into `lab_ops` until ownership is approved. |
| `OperationalFileDownload` / `operational_file_downloads` | Commercial access audit / `commercial_ops` | Now lives in Commercial. Retain with the external download surface, subject to the future file-management decision. |

### Shared Status, Operation, and Rule Types

| Current type | Target classification |
| --- | --- |
| `LabServiceOrderStatus` | Split. Commercial order lifecycle and Lab work-execution lifecycle require separate types. |
| `LabSampleStatus` | Split. Customer submission/visible milestone state remains Commercial; accession, container, disposition, and execution state becomes Laboratory. |
| `ReagentOrderStatus` | Commercial; rename toward `PSeqKitOrderStatus`. |
| `AssemblyRequestStatus` | Preserve for current behavior, then replace with included assembly-case state only after the pipeline boundary is defined. |
| `QuoteStatus`, `QuotePurpose` | Commercial; now live in the Commercial module. |
| `CommercialDocumentKind` | Commercial. |
| `IntegrationStatus`, `IntegrationOperation` | Commercial for the existing QuickBooks/notification outbox. Future Lab provider delivery requires its own neutral contract types. |
| `OperationalFilePurpose`, `OperationalFileScanStatus`, `FileReleaseStatus` | Major pipeline/file TBD; preserve current behavior and do not move to Laboratory. |
| `ReagentAdjustmentStatus` | Commercial; rename toward `KitOrderAdjustmentStatus`. |
| `CancellationRequestStatus` | Commercial. Lab receives only an authorized amendment/cancellation command. |
| `OrderNotificationStatus` | Commercial. |
| `ReagentShippingRules` | Commercial; rename toward `KitShippingRules`. It does not describe internal Lab material storage or handling. |
| `OrderWorkflowTypes` | Split/retire as a cross-domain discriminator. Commercial workflow identifiers may remain; Lab Operations must use typed work-order identifiers and its own execution model. |

## Current Backend Support-Code Classification

| Current code | Target owner | Disposition |
| --- | --- | --- |
| `OrderManagementModelConfiguration` | Split | Commercial and Laboratory projects each own their EF mappings; the shared context applies both. Explicit `ToTable` schemas replace reliance on one default schema. |
| `OrderManagementDtos` | Split | Customer/order/release DTOs remain Commercial. Lab commands, work records, batches, QC, and roles receive Laboratory-owned contracts. Do not share the current mixed DTO wholesale. |
| `QuickBooksGateway` | Commercial port plus API adapters | Request/result contracts and `IQuickBooksGateway` are in Commercial; OAuth, HTTP, and logging implementations remain in the API. |
| `OrderIntegrationDispatcher` | API adapter for Commercial outbox | Commercial owns the outbox record and vendor port. EF polling, hosted execution, and vendor translation remain in the API; do not reuse vendor-specific operations as the Lab provider contract. |
| `OrderNotificationDispatcher` | Commercial port plus API adapters | `IOrderNotificationSender` is in Commercial; Postmark/logging senders and hosted EF dispatch remain in the API. |
| `OrderIdempotencyService` | Commercial record plus API persistence adapter | The idempotency record is in Commercial; the current HTTP/EF service remains in the API. A generic host-level abstraction may be extracted later only if both modules prove the need. |
| `OrderRequestContext` | Commercial | Retain organization/tenant commercial request context. Internal Lab authorization must use Phaeno-user roles rather than pretending to be a Customer or Partner tenant. |
| `OperationalFileServices` | Major pipeline/file TBD | Preserve current behavior and location until scientific file ownership is approved. |
| `OrderManagementOptions` | Split | Commercial integration/file settings remain Commercial or deferred; new Lab settings belong to Laboratory. |
| `OrderManagementException` | Split | Replace with module-specific domain/application failures while preserving the common API error envelope. |
| `OrderCsvExport` | Commercial | Retain with customer and commercial order reporting. Lab exports, if required, are separate Lab capabilities. |

## Current API Surface Classification

| Current controller/route | Target owner | Disposition |
| --- | --- | --- |
| `OrderCatalogController` / `api/order-catalog` | Commercial | Retain; rename catalog concepts toward PSeq Lab Service and PSeq Kit. Assembly profile endpoint remains frozen pending pipeline discovery. |
| `OrderConfigurationAdminController` / `api/platform/order-configuration` | Commercial, with future Lab configuration removed | Retain commercial, QuickBooks, kit, and customer-intake configuration. Future protocols, materials, and equipment belong to separate Lab APIs. |
| `OrderIntegrationsAdminController`, notifications, and QuickBooks webhook | Commercial | Retain. |
| `LabServiceOrdersController` / `api/lab-service-orders` | Commercial | Retain as the customer/partner PSeq Lab Service order and submission API. It must stop directly mutating accession or Lab execution state after the boundary exists. |
| `PlatformLabServiceOrdersController` / `api/platform/lab-service-orders` | Split | Quote, commercial cancellation, customer communication, and release remain Commercial. Receipt, accession, internal transitions, QC, and scientific readiness move behind Lab Operations APIs/provider contract. |
| `PlatformOrderAssignmentsController` / `api/platform/order-assignments` | Split | Commercial work assignment remains Commercial. Lab work queues and assignments become Lab-owned. |
| `ReagentOrdersController`, `PlatformReagentOrdersController`, and shipping-address controller | Commercial | Retain and rename from reagent-order language to PSeq Kit commerce/fulfillment. |
| `DataAssemblyRequestsController` and `PlatformDataAssemblyRequestsController` | Commercial plus major pipeline TBD | Preserve current behavior; replace standalone sale later. Do not move processing endpoints into Lab Operations until pipeline ownership is defined. |

## Current Frontend Classification

| Current surface | Target owner | Disposition |
| --- | --- | --- |
| `/lab-services`, create, detail, and edit | Commercial Portal | Retain as Customer/Partner ordering, submission, status, exception-response, QC-summary, and release surfaces. |
| `/reagent-orders`, create, detail, and edit | Commercial Portal | Rename toward `/pseq-kits` when the PSeq Kit commercial model is implemented. |
| `/data-assembly`, create, detail, and edit | Commercial Portal plus pipeline TBD | Preserve until included assembly cases replace the standalone path. Do not move to Lab workspace. |
| `/order-configuration` | Commercial internal workspace | Retain commercial configuration panels. Future protocol/material/equipment configuration moves to Lab Operations. |
| `/order-operations` queue and detail | Split | Commercial quote, kit fulfillment, cancellation, communication, and release move to a Commercial Operations workspace. Receipt, accession, lab execution, batches, send-out, QC, and scientific readiness move to a new internal `/lab-operations` workspace. |
| `features/orders/operations/LabOperationsPanel.tsx` | Laboratory | Replace with Lab-owned screens and API client; do not carry the mixed commercial DTO unchanged. |
| `features/orders/operations/ReagentOperationsPanel.tsx` | Commercial | Retain as PSeq Kit fulfillment; it is not internal reagent preparation. |
| `features/orders/operations/AssemblyOperationsPanel.tsx` | Major pipeline/file TBD | Preserve; ownership and replacement wait for pipeline discovery. |
| `frontend/src/api/order-management.ts` | Split | Divide into Commercial and future Lab Operations clients/contracts. Customer-facing Lab Service APIs remain Commercial despite the service name. |

## Current Authorization Classification

The running application does not implement the approved additive laboratory
roles. Current Phaeno operational capabilities are broad booleans granted to a
platform administrator, including:

- `CanQuoteLabServiceWork`
- `CanManageLabOperations`
- `CanManageReagentFulfillment`
- `CanManageDataAssembly`
- `CanManageOrderIntegrations`

Target classification:

- quoting, kit fulfillment, integrations, customer communication, and release
  remain Commercial capabilities
- Lab Operator, Lab Supervisor, Protocol Administrator, Scientific Reviewer,
  and Lab Operations Administrator become Laboratory roles
- a person may hold one or more roles
- Customer and Partner permissions remain Commercial Portal permissions and
  never grant direct Lab Operations access

No role or authentication changes are authorized by this inventory.

## Current Tests and Migration Assets

| Current asset | Target classification |
| --- | --- |
| `backend/test/OrderManagementDomainTests.cs` | Split into Commercial order/kit/assembly-history tests and Laboratory execution tests when code moves. Preserve current tests until replacement coverage exists. |
| frontend order status and navigation tests | Retain with Commercial Portal; add Lab workspace tests only with implementation. |
| `20260716220428_InitialPSeqOperations` | The single reviewed Development baseline; it replaced the seven former migrations during the approved reset. |
| `PSeqOperationsDbContextModelSnapshot.cs` | Current snapshot generated from the restructured model; EF reports no pending model changes. |
| `public.__ef_migrations_history` | Current migration-history table containing the single clean baseline row. The rebuilt database has no `portal` schema. |

## Records That Must Not Be Confused

- Commercial PSeq Kit/reagent offerings and shipments are not internal Lab
  reagent materials, prepared lots, or consumption records.
- Data Provisioning `SourceSample` records are reference-data provenance, not
  received customer specimens or laboratory accessions.
- A Customer/Partner `LabServiceOrder` is not the future Lab `LabWorkOrder`.
- A customer specimen submission is not the laboratory accession or physical
  container record.
- Customer-visible `OrderStatusEvent` history is not the Lab execution ledger.
- Existing `AssemblyProcessingRun` records are not assigned to Lab Operations
  while the automated-pipeline boundary is TBD.
- Existing operational files are not assigned to Lab Operations merely because
  they contain scientific content.

## Step 1 Result: Current Inventory

Inventory is complete for the current:

- solution and project structure
- backend features and shared persistence
- Order Management domain entities and tables
- relevant API controllers
- relevant frontend routes and operational panels
- current operational capabilities
- current tests and migrations

## Step 2 Result: Ownership Classification

Classification is complete at the current aggregate, API-surface, UI-surface,
project, and schema level:

- **Retain in Commercial:** accounts, relationships, entitlements, catalog,
  quotes, commercial orders, PSeq Kit commerce, QuickBooks, notifications,
  customer timelines, customer-facing status, and customer release.
- **Split:** `LabServiceOrder`, `LabSample`, `LabResultRelease`, platform Lab
  controller operations, the mixed internal operations workspace, and shared
  order DTO/API clients.
- **Create in Laboratory:** work orders, accessions, physical containers,
  protocol execution, internal materials/lots, equipment, batches, NGS
  send-out, internal QC/deviations, and scientific readiness.
- **Defer without moving:** assembly processing, pipeline runs, scientific file
  management, provenance, and retention.
- **Rename for clarity:** solution and .NET projects under PSeq Operations;
  `portal` schema to `commercial_ops`; new `lab_ops` schema; commercial reagent
  ordering toward PSeq Kit terminology.

## Explicitly Not Completed

This inventory itself does not:

- define the `ILabOperationsProvider` contract; that is recorded in
  `LAB-OPERATIONS-CONTRACT.md`
- design the reset/restructure sequence; that is recorded in
  `PSEQ-OPERATIONS-MIGRATION-PLAN.md`
- identify the first implementation slice
- rename files, projects, namespaces, APIs, routes, entities, or schemas
- create or apply an EF migration
- change application behavior or tests

Those are later steps requiring separate authorization.
