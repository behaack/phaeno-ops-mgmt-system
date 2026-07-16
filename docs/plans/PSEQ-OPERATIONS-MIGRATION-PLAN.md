# PSeq Operations Restructuring and Database Reset Plan

This document defines the implementation sequence for restructuring the
current backend as PSeq Operations and replacing the current development
database and EF migration history with a clean baseline.

It is a planning artifact only. It does not itself delete a database, delete
migration files, rename projects, create schemas, apply a migration, deploy, or
authorize a reset of any shared environment.

## Status

- Design completed on 2026-07-16 from the current repository and EF model.
- The Product Owner approved starting over with migrations and deleting the old
  database rather than preserving its data.
- That approval applies to the disposable development database placed in scope
  for this restructure. It must not be inferred for staging, production, a
  shared database, or any environment later found to contain records that must
  be retained.
- Stage 1 is implemented: the solution and project shells are renamed, empty
  Commercial and Laboratory projects exist, and live command paths are
  updated.
- The Stage 2 context/schema checkpoint is implemented: the single context is
  renamed, schema settings are explicit, every current entity targets
  `commercial_ops`, and architecture tests protect the module direction.
- The first three Stage 2 feature slices are implemented: Accounts,
  Relationships, and Data Provisioning domain entities and pure application
  code live in Commercial, along with their environment-neutral ports. HTTP,
  EF mapping/orchestration, Clerk/Postmark, bootstrap, environment configuration,
  local file/scanner, notification dispatch, and API error translation remain
  in the API.
- Commercial Order Management extraction is in progress. Commercial
  configuration/catalog, Partner kit ordering and fulfillment, commercial
  workflow/outbox/notification records, and environment-neutral QuickBooks and
  notification ports now live in Commercial. Immutable lab-service request
  revisions, lab-service/data-assembly quotes, and the external download audit
  are also extracted. Mixed order, sample, processing, managed-file, and release
  records remain in the API pending their approved splits.
- Laboratory-owned mappings remain pending.
- The database and seven historical migrations remain untouched. A temporary
  compile-only alias keeps their generated metadata buildable until Stage 3.
- The automated data-pipeline and scientific file-management boundary remains
  explicitly unresolved and outside the reset.

## Objective

Reach the approved target with a clean development baseline:

- external product remains **Phaeno Portal**
- internal solution becomes **PSeq Operations Platform**
- one deployed API
- one PostgreSQL database
- one EF Core context and migration stream
- separate Commercial and Laboratory projects
- business data separated into `commercial_ops` and `lab_ops`
- one new initial migration replaces the seven current development migrations
- Commercial eventually depends on the provider-neutral Lab Operations
  contract, not Laboratory entities or tables

## Reset Decision

The implementation will not migrate or backfill the current database.

Instead it will:

1. verify that the selected database is the disposable development database
2. stop all processes that can connect to it
3. delete the existing database
4. delete the current EF migration source and model snapshot
5. restructure the solution, projects, namespaces, context, and mappings
6. generate one new `InitialPSeqOperations` migration
7. create a new empty database from that migration
8. reseed only approved development/reference data

This removes the need for:

- a `portal` to `commercial_ops` data migration
- EF migration-history relocation
- compatibility aliases for historical `AppDbContext` metadata
- legacy-record backfill or status interpretation
- dual writes or a legacy Lab provider for migrated records
- preservation of current database UUIDs, releases, files, or audit history

Git history remains the record of the deleted migration source. The reset does
not rewrite Git history.

## Destructive Scope Guard

Before deletion, the implementation must display and record:

- the resolved server/host and port
- the exact database name
- the active environment
- whether any non-development configuration references that database
- the current table and row counts
- whether any active API, Reference Journey, worker, or test process is using it

The reset proceeds only when all of the following are true:

- the resolved target is explicitly identified as disposable development data
- the target is not staging, production, or shared
- no record is required for customer, commercial, scientific, audit, or release
  history
- no application process is writing
- the database name and server exactly match the approved target

If any condition fails, stop. Do not broaden the approval or substitute a
different database.

## Current Evidence Baseline

The reset design accounts for these current facts:

- solution: `backend/PhaenoPortal.slnx`
- web project: `backend/app/PhaenoPortal.App.csproj`
- test project: `backend/test/PhaenoPortal.Test.csproj`
- utility: `backend/tools/PhaenoPortal.ReferenceJourney`
- context: `AppDbContext`
- current business schema: `portal`
- current history table: `portal.__ef_migrations_history`
- seven current migrations under `backend/app/Migrations`
- the Reference Journey directly constructs the current context and configures
  migration history
- live command/path references exist in `README.md`, `AGENTS.md`, the
  verification playbook, architecture and operations-readiness documents, the
  backend test plan, and the Reference Journey README
- no repository GitHub Actions workflow currently references the solution

The implementation must refresh this inventory immediately before the reset.

## Target Solution Layout

Use three production projects plus one test project:

```text
backend/
  PSeq.Operations.slnx
  app/
    PSeq.Operations.Api.csproj
    Migrations/
  modules/
    PSeq.Operations.Commercial/
      PSeq.Operations.Commercial.csproj
    PSeq.Operations.Laboratory/
      PSeq.Operations.Laboratory.csproj
  test/
    PSeq.Operations.Test.csproj
  tools/
    PSeq.Operations.ReferenceJourney/
      PSeq.Operations.ReferenceJourney.csproj
```

Keeping the API project under `backend/app` minimizes unrelated path churn.
The folder name has no product or architecture meaning.

### Project Dependencies

```text
PSeq.Operations.Api
    |-- PSeq.Operations.Commercial
    `-- PSeq.Operations.Laboratory

PSeq.Operations.Test
    |-- PSeq.Operations.Api
    |-- PSeq.Operations.Commercial
    `-- PSeq.Operations.Laboratory
```

Rules:

- Commercial does not reference Laboratory.
- Laboratory does not reference Commercial.
- Commercial owns its outbound `ILabOperationsProvider` port and neutral
  Commercial-facing contract types.
- The API composition root contains the adapter that implements the Commercial
  port using the internal Laboratory application service. A future external
  LIMS adapter occupies the same composition boundary.
- No fifth shared-contract project is introduced until independent reuse proves
  it necessary.
- The API hosts the single `PSeqOperationsDbContext`, migration stream, HTTP
  infrastructure, and concrete persistence adapters.
- Each module owns its domain model, application rules, persistence interfaces,
  and EF model configuration.
- Architecture tests enforce the reference direction and prohibit direct
  Commercial-to-Laboratory dependencies.

## Target Persistence Layout

### Business Schemas

- `commercial_ops`: accounts, relationships, entitlements, curated data,
  commercial orders, PSeq Kit fulfillment, customer-facing projections,
  integrations, communication, access audit, and release
- `lab_ops`: authorized laboratory work, receipt, accession, physical lineage,
  execution, internal exceptions, scientific approval, and later protocols,
  materials, equipment, batches, and outsourced NGS records

PostgreSQL `public` contains only the single EF migration-history table as
technical infrastructure. It owns no business records, so the application
still has exactly two business schemas.

### Context and Configuration

`AppDbContext` is renamed to `PSeqOperationsDbContext`. Until the old migrations
are deleted in Stage 3, a compile-only global type alias preserves their
generated metadata. It does not register or create a second runtime context and
will be deleted with the historical migrations.

Replace the single ambiguous schema setting with:

- `CommercialSchema` = `commercial_ops`
- `LaboratorySchema` = `lab_ops`
- `MigrationsHistorySchema` = `public`
- `MigrationsHistoryTable` = `__ef_migrations_history`

Do not rely on `HasDefaultSchema` after the split. Every module-owned entity is
mapped explicitly to its schema, so an omitted mapping does not silently land
in Commercial.

Keep one context and transaction boundary. Sharing the context does not permit
modules to query or mutate each other's entities directly.

### Initial Baseline Contents

The new initial migration creates:

- `commercial_ops`
- `lab_ops`
- all currently implemented tables under `commercial_ops`
- `public.__ef_migrations_history` through EF configuration

Creating `lab_ops` now reserves the approved boundary. It does not require
inventing Lab tables before their model is implemented.

The current mixed `LabServiceOrder`, `LabSample`, `LabResultRelease`, assembly,
pipeline, and operational-file records remain mapped to `commercial_ops` in the
new baseline because that is the implemented behavior. Their later split is an
additive implementation migration, not something to fake in an empty schema.

## Staged Implementation Sequence

### Stage 0 - Verify the Disposable Target

1. Record the current Git commit and working-tree changes.
2. Resolve the effective connection string without printing its password.
3. record server, port, database name, environment, schemas, table counts, row
   counts, and migration IDs
4. confirm no shared or non-development configuration points to the target
5. stop the API, Reference Journey, workers, tests, and any other database user
6. optionally take a final local backup only as a short-term safety net; this is
   not a commitment to migrate its data

Gate: the target must be positively identified as the approved disposable
development database. Uncertainty stops the reset.

### Stage 1 - Rename the Solution and Project Shells

Status: implemented on 2026-07-16. The renamed five-project solution builds and
EF discovers all seven unchanged migrations. The database and migrations were
not changed. The backend test suite remains pending an explicit test request
under repository policy.

1. Rename the solution to `PSeq.Operations.slnx`.
2. Rename the API and test project files in place.
3. Add Commercial and Laboratory class-library projects.
4. Rename the Reference Journey project and folder.
5. Update project references and all live build, EF, verification, and utility
   command paths in the repository.
6. Preserve HTTP routes, API envelopes, authentication, frontend behavior, and
   runtime configuration semantics.

Gate:

- the renamed solution restores and builds
- current backend tests pass before domain code is moved
- Reference Journey builds
- no database operation has occurred

Rollback: revert the code/project rename. The current database is untouched at
this stage.

### Stage 2 - Establish the New Context and Module Mappings

Status: the context/schema checkpoint, initial architecture guard, Accounts,
Relationships, and Data Provisioning extractions, plus the first four commercial
Order Management sub-slices are implemented on 2026-07-16. The API retains HTTP,
EF mapping/orchestration, Clerk/Postmark/QuickBooks adapters,
environment/configuration, local file/scanner, notification dispatch, and API
error translation as intended.
Items 4, 6, and 7 plus the remaining feature slices in item 5 remain pending.
The solution builds; the backend test suite remains pending an explicit test
request under repository policy.

1. Rename the context to `PSeqOperationsDbContext`.
2. Introduce explicit Commercial, Laboratory, and migration-history settings.
3. Map every currently implemented entity explicitly to `commercial_ops`.
4. Ensure the future Lab schema is created as part of the new baseline. Its
   setting is reserved now; physical creation belongs to Stage 4.
5. Move Commercial domain/application code into the Commercial project in
   small slices: Accounts, Relationship Management, Data Provisioning, then
   commercial Order Management.
   - Accounts domain and pure application policy: complete.
   - Relationship Management domain and pure application policy: complete.
   - Data Provisioning domain, pure application services, and ports: complete.
   - Commercial Order Management: in progress.
     - Configuration/catalog and Partner kit domain/rules: complete.
     - Commercial integration, outbox, notification, and workflow support:
       complete.
     - Commercial request-revision and quote records: complete.
     - External operational-file download audit: complete.
     - Mixed order, sample, assembly-processing, managed-file, and release
       records: wait for their approved Commercial/Laboratory/pipeline splits.
6. Keep HTTP composition, the shared context, and concrete persistence adapters
   in the API project.
7. Add the Laboratory project shell and its registration boundary without
   inventing unimplemented workflows.
8. Add architecture tests for project and module direction.

Gate:

- the model contains no business table in `public` or `portal`
- every current business table maps to `commercial_ops`
- `lab_ops` is present but may contain no business tables yet
- Commercial and Laboratory do not reference each other
- no old migration or snapshot is used to judge the new model

### Stage 3 - Delete the Old Database and Migration History

This is the destructive checkpoint explicitly approved for the disposable
development target.

1. Re-run the Stage 0 identity guard immediately before deletion.
2. Delete the exact approved development database using one database tool and
   a literal, verified target name.
3. Verify the database no longer exists.
4. Delete the current files under `backend/app/Migrations`:
   - the seven migration source files
   - the seven generated designer files
   - `AppDbContextModelSnapshot.cs`
5. Preserve the `Migrations` directory for the new baseline.
6. Search for and remove only live references that assume the old migration
   names or `portal` schema. Historical planning prose may describe the former
   state when clearly labeled.

Do not delete another database, database server, migration folder, generated
data file, or Git history.

Rollback: before a new database is used, restore the optional backup and revert
the code commit if a reset must be abandoned. Once new development work begins,
prefer reseeding the clean baseline rather than resurrecting the old model.

### Stage 4 - Generate the Clean Initial Migration

1. Generate `InitialPSeqOperations` from the restructured model.
2. Review the migration and model snapshot in full.
3. Verify it creates `commercial_ops` and `lab_ops`.
4. Verify every current entity table is created in `commercial_ops`.
5. Verify the migration-history configuration targets `public`.
6. Verify there is no `portal` schema, no table-copy SQL, no data backfill, and
   no reference to the deleted migration IDs.
7. Generate and inspect an idempotent SQL script for the empty database.

Gate: the initial migration is a faithful clean representation of current
implemented behavior plus the approved schema boundary. It must not pretend
the future Laboratory entity split is already implemented.

### Stage 5 - Create and Seed the New Development Database

1. Create the development database with the approved PSeq Operations physical
   name, or retain the current physical name if environment configuration makes
   that safer. Database naming is independent of schema ownership.
2. Apply `InitialPSeqOperations`.
3. Verify schemas, tables, constraints, indexes, migration history, and
   connection permissions.
4. Run only approved seed/bootstrap behavior.
5. Run the Reference Journey, then confirm its transaction rollback leaves no
   fixture data.
6. Run backend tests and representative API smoke tests.
7. Start the frontend and verify current customer/platform routes still load.

Gate:

- one context and one migration are active
- one history table exists at `public.__ef_migrations_history`
- no `portal` schema exists
- current business tables exist only in `commercial_ops`
- `lab_ops` exists
- authentication/bootstrap and tenant isolation still work
- current user-visible behavior remains compatible

### Stage 6 - Introduce the Real Lab Foundation Later

The database reset does not make the separate Lab module implemented.

When that implementation is authorized:

1. introduce the provider-neutral contract from
   `LAB-OPERATIONS-CONTRACT.md`
2. add Laboratory-owned work-order, receipt, accession, container, event,
   exception, and scientific-approval models
3. add Commercial-owned authorization and projection models
4. generate an additive `AddLabOperationsFoundation` migration
5. move new work through the provider boundary
6. retire direct writes to the mixed Commercial laboratory fields only after
   replacement behavior and tests exist

Because the reset starts without legacy records, no historical backfill is
planned. If real work is entered before this stage ships, stop and design a
new data-preserving transition for those records; do not silently delete them
under the old reset approval.

## Verification Matrix

### Code and Architecture

- renamed solution build
- backend test suite
- Reference Journey build and representative run
- exact project-reference graph
- architecture tests for module direction
- no stale live paths to the old solution or projects
- no dependency or authentication changes unless separately approved

### EF and Database

- destructive-target identity recorded without credential exposure
- old database absence confirmed after deletion
- old migration files and snapshot absent
- exactly one new initial migration and snapshot
- clean-database migration application
- idempotent SQL script review
- exactly one history table in `public`
- exactly two business schemas
- no business table in `public` or `portal`
- schema, table, column, index, constraint, and sequence manifest review

### Runtime and Customer Protection

- current routes and API envelopes remain compatible
- tenant scoping and Phaeno internal authorization remain enforced
- current quoting, order, kit, file, download, and release flows work against
  newly seeded data
- no Lab Operations UI or role is represented as implemented merely because
  `lab_ops` exists
- no pipeline/file ownership is implied

## Approval and Safety Rules

- The approved deletion is limited to the verified disposable development
  database and current migration source.
- Any staging, production, shared, or unexpectedly valuable database requires a
  new explicit decision and a data-preserving plan.
- Do not print or commit connection-string credentials while verifying targets.
- Do not combine the database reset with authentication, dependency, pipeline,
  file-management, deployment, or production-activation changes.
- Do not stage or commit Git changes unless separately requested.

## Acceptance Outcomes

The reset/restructure is complete only when:

- `PSeq.Operations.slnx` contains API, Commercial, Laboratory, and Test projects
  with the approved dependency direction
- `PSeqOperationsDbContext` is the single context
- the old development database and seven-migration lineage are gone
- one reviewed `InitialPSeqOperations` migration recreates an empty environment
- `commercial_ops` owns all currently implemented business records
- `lab_ops` exists for future Laboratory-owned records
- `public` owns only EF migration history
- current Portal behavior works with freshly seeded data
- the separate Lab module is still accurately described as planned, not shipped
- the unresolved pipeline/file boundary remains unresolved

## Explicitly Deferred

This plan does not authorize or settle:

- the Lab Operations entity implementation beyond an empty schema boundary
- pipeline orchestration or scientific file ownership
- raw, intermediate, or customer-output retention
- a third-party LIMS vendor
- in-house NGS
- physical material retention periods
- QuickBooks procurement automation
- authentication changes
- new dependencies
- staging or production reset
- deployment or production activation
