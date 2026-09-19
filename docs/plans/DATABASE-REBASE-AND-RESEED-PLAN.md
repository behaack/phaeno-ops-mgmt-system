# Database rebase and selective preservation

Status: production reset/release activated and local database switched, September 19, 2026. Final local service restart and signed-in acceptance are tracked in the execution record. After settling the preservation choices below, the owner instructed **Execute**. That instruction authorizes this reset, migration replacement, local and production cutover, and the matched release. The reset execution retained the original databases and did not itself authorize cleanup. After the separate PostgreSQL 18 upgrade, the owner authorized [retirement of Portal's old production storage](POSTGRESQL-18-UPGRADE-PLAN.md#authorized-postgresql-17-storage-retirement). Encrypted recovery archives and the original local database remain retained.

This is a new reset project. The [July restructuring/reset record](PSEQ-OPERATIONS-MIGRATION-PLAN.md) remains historical evidence and does not authorize this production reset.

## Product outcome

Start local development and production from the same complete schema and reviewed reusable configuration. Production retains people, customer relationships, access and CRM sales work. Local retains only the owner's account, its required organization/access and reusable configuration. Test laboratory and order activity should not populate either clean database. New laboratory results must satisfy the already approved traceability and scientific-evidence requirements.

Users affected: Phaeno administrators and laboratory/commercial staff, Customer and Partner users, and prospects represented in CRM. Success means existing retained users can sign in with their intended access, customer records remain connected, CRM pipelines retain their business context, and new laboratory work uses the configured workflow without fabricated historical evidence.

## Confirmed decisions

1. Rebase EF migrations and prepare clean databases for both local development and production.
2. In **production**, preserve all users and customers, including user accounts/access, customer organizations, contacts, departments and addresses. Include the Phaeno organization and required Partner/prospect records and relationships; do not silently omit inactive users or entities needed by retained CRM records. In **local**, preserve only **bhaack@phaenobiotech.com**, its environment-correct identity and the organization/department/access records required for that account. Do not preserve local customer records or CRM sales transactions, or retain additional local users as hidden import dependencies.
3. Retain reusable configuration: catalog/prices, sample types, shipping definitions/instructions, laboratory protocols/workflows, stage durations, holidays and policies. Exclude clearly identified test-only configuration through a reviewed seed manifest, not an automatic name-based deletion rule.
4. Preserve **production CRM pipeline data**: pipelines/stages, leads, opportunities, linked companies/contacts, owners, stage history, notes/activities, tasks and relevant custom fields. This supersedes the earlier general removal of activity history for these CRM records. Local receives CRM pipeline and stage definitions as configuration, without CRM sales data. Show exact dependencies and exceptions in the preservation inventory.
5. All current operational data were described as test data. No traceability backfill is needed. Preserving approved master/CRM records is a selective transfer, not a reconstruction of laboratory history.

Use one reviewed reusable configuration seed in both environments, with environment-specific identity references and private commercial overrides kept separate. Retain each environment's correct login bindings. Never copy production Clerk subject IDs into a different Clerk instance without a verified identity mapping.

| Environment | Retained people and business records | Shared seed |
| --- | --- | --- |
| Production | All users/access, customers and required company/contact relationships, complete approved CRM sales/pipeline data | Reviewed reusable configuration |
| Local | Only bhaack@phaenobiotech.com and its required organization/access; no customer or CRM sales data | The same reviewed configuration content, including CRM pipeline/stage definitions |

The execution inventory and exact dispositions are recorded in [the reset runbook](../operations/database-rebase-20260919.md). Website customer inquiries were preserved, the production PSeq price retained inactive for review, and exact test-only definitions excluded. CRM handoff dependencies were retained without replay. Keep rollback sources until a separate explicit cleanup decision; no automatic retention deadline was invented.

## Repository findings at the reset planning checkpoint

- There are 76 migration source files at this planning checkpoint. This is a repository count, not a claim about migrations applied to production. Current uncommitted traceability changes are part of the proposed target and must be frozen and verified before generating its baseline.
- `PSeqOperationsDbContext` spans `commercial_ops`, `lab_ops` and `website`; migration history is `public.__ef_migrations_history`. A reset limited to the visible Lab and Order screens would miss part of the database.
- User identity is external to PostgreSQL in Clerk. The database stores internal user IDs, linked external subjects, organization/department memberships, business roles and Lab roles. CRM companies link to access organizations; contacts link to users and company relationships. Preserving users alone does not preserve access or customer identity.
- The current startup seeder creates/updates the configured Phaeno administrator, organization and department, can reactivate them, and can contact Clerk. It is not a general preservation importer. Run import before normal startup and verify bootstrap cannot overwrite retained access/profile state or create unintended identities.
- Some reference data are model-managed; other defaults exist only in historical migration SQL. For example, product types and released-deliverable policy initialization must be explicitly accounted for when replacing the migration chain.
- The current production workflow invokes a migration command against its configured database, with an encrypted backup. It is not a selective-reset workflow. The new initial migration must never run against the old populated schema.
- Checked-in production Compose uses PostgreSQL 17, while recent local verification used PostgreSQL 18. Verify actual versions and test the baseline/import on the production version; do not combine this reset with an unrequested engine upgrade.

## Preservation and reset inventory

Build a machine-readable, reviewed allowlist covering every mapped table plus database objects and file references. Assign every item to preserve, reusable seed, discard from the replacement, regenerate, or unresolved. Unresolved dependencies stop that part of the reset. The full preservation scope below applies to production. Local uses the one-account/configuration-only scope above.

| Area | Proposed treatment |
| --- | --- |
| People and access | Preserve users, internal IDs, environment-correct external identities, active/inactive states, organization/department memberships and administrator flags, business/Lab roles, and applicable Trial approval authority. Preserve existing restrictions; do not grant broad default access. |
| Customers and relationships | Preserve organizations, CRM companies and contacts, company/contact and contact/user links, departments, delivery locations/addresses, owners, communication preferences, approved entitlements, applicable commercial terms and customer policy overrides. Preserve current approvals/restrictions without creating balances or new approval evidence. |
| CRM pipeline and sales work | Preserve pipeline/stage definitions, stage ordering/probability/outcomes, leads, opportunities and their numbers/amounts/currency/owners/current stages, opportunity contacts and stage history, associated activities/tasks, relevant custom fields/values and saved views. Include merged-record dependencies and necessary relationship/handoff evidence. Preserve sales context without replaying a handoff or creating another order. |
| Catalog and scientific definitions | Seed the reviewed catalog, sales units/base prices, one current service definition per item, required supporting revisions, supported sample-type relationships, analyses and assembly profiles. Customer/Partner-specific pricing stays attached to the correct retained organization. |
| Shipping configuration | Seed sample types, container definitions/sizes/compatibilities, destinations and shipping instruction rules, with all exact referenced revisions. Exclude physical stock kits, allocated tubes, shipments, packets and scan history. |
| Lab configuration | Seed reviewed workflow/stage/protocol/step definitions and required versions, tray formats, material/product/supplier definitions, storage locations, stage timing policies and holiday calendars. Equipment master records are seed candidates for review; lots, quantities, usage and calibration evidence are not silently treated as configuration. |
| Policies and defaults | Seed approved order/quote defaults, retention policies, CRM settings and genuine system reference values. Keep result traceability and scientific evidence enforced. Preserve required revision relationships and applicable policy overrides. |
| Operational transactions | Exclude test orders, quotes, jobs, samples, attempts, execution/preparation records, batches, libraries, sequencing/analysis records, result packages, releases, downloads, retention schedules, Trials, shipment/stock activity, invoices/payments and accounting transactions unless an explicit preservation dependency is approved. |
| Automation and delivery state | Do not replay old notifications, invitations, outbox messages, provider callbacks or pending integration jobs. Review invitation state explicitly: preserve account status, but do not reactivate an expired link or send a new invitation as a side effect. Record reset/import provenance separately. |
| Website and Data Provisioning | Inventory public inquiries, search/crawler state, documents, datasets/grants and managed-file metadata separately. Regenerate rebuildable search state. Keep existing sources backed up until the owner reviews any records not covered by the confirmed decisions. |
| Files and audit | Preserve bytes/metadata needed by retained configuration or CRM records, with verified size/checksum and links. Keep the full old database/files in the rollback backup; the replacement starts operational audit history fresh while retaining approved CRM/business history and an explicit import receipt. Do not purge old files as part of the cutover. |

Keep source UUIDs for retained records within each environment, including inactive production owners/authors needed for references. Local configuration dependencies must respect the one-user restriction; never import extra user rows or attribute other people's past approvals to the retained account. Determine dependencies from foreign keys **and** JSON/polymorphic references, stored manifests, provider IDs and static files. A CRM opportunity linked to a discarded test order must not retain a working link to a nonexistent order: produce a reviewed disposition that preserves sales context, archives the original association, and changes only the live operational link where the model permits it. Never silently reopen an opportunity or replay its handoff.

## Implementation approach

### 1. Freeze and inspect

- Identify the exact application/model revision, local and production endpoints, database names, schema versions, file roots, Clerk instances and active workers. Record redacted fingerprints and counts; never emit credentials or customer exports into source control.
- Preserve the current worktree and archive the old migration chain with its matching application version. Prepare an authorized release checkpoint before replacing migration sources.
- Produce per-environment preservation reports, dependency closures and configuration comparisons. Shared configuration is a reviewed versioned set; do not silently choose whichever environment has a later timestamp.
- Separate reusable non-personal seed content from private per-environment preservation bundles and runtime secrets. A fresh environment must not acquire production mail, payment or pipeline credentials from a seed.

### 2. Build export/import and seeding tools

- Use a bounded maintenance command/tool, separate from normal startup and API writes. Export consistently from the source without changing it. Include schema/source version, environment identity, table/record counts, checksums, dependency mappings and explicit exclusions in a manifest.
- Support the actual source schemas found locally and in production. Read older source records through an explicit extraction mapping or a restored disposable copy; do not require upgrading the source production database just to export it.
- Make imports transactional, dependency-ordered and restartable. Exact replays must not duplicate or reset records; conflicting content fails clearly. Maintain foreign keys and validate unique constraints and polymorphic references.
- Import preserved identities and account records before configuration whose authors/owners reference them. Reconcile fixed seeded IDs with retained IDs explicitly; do not merge customer or identity records by display name or email alone.
- Preserve configuration version/revision and approval meaning. If a shared configuration's required author/approver cannot be resolved correctly in an environment, flag it for review; do not fabricate an approver or silently mark a draft approved. Imported reference snapshots must not imply newly performed scientific work.
- Keep local configuration content identical where approved, but treat environment-bound ownership/approval metadata as an explicit mapping. Resolve any necessary new local approval through the existing supported workflow and preserve source provenance in the private import receipt. The one-account local setup must not weaken production separation-of-duties checks; additional identities needed for automated journeys belong only in disposable test databases.
- Run with notifications, cleanup, projections, integration dispatch and external identity provisioning inactive. Emit a private import receipt; do not generate ordinary business actions for restored rows.

### 3. Create one new initial migration

- Generate a new baseline and model snapshot from the frozen complete model after preserving the old source history. Review all schemas, fields, foreign keys, uniqueness/check constraints, indexes, sequences, extensions, model-managed seed rows and any custom SQL/database objects.
- Separate obsolete historical backfills from still-required schema/default behavior. Carry required custom behavior into the baseline or reviewed deterministic seed, then prove it exists on an empty database. [EF documentation](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/managing#resetting-all-migrations) specifically calls out retaining custom migration code during a reset.
- The fresh database must have only the new baseline history and no pending model changes. Add a guard so rebase tooling refuses a populated or mismatched target; do not merely erase migration-history rows or stamp the new baseline onto the old schema.
- Update hard-coded migration assertions, database fixtures, backup verification expectations, ERD, setup/operations documentation and relevant test plans. Keep historical test and release records labelled as historical.

### 4. Rehearse locally with replacement databases

- Take full recoverable backups of the local source database and required files, plus the selective preservation export. Verify the restore before switching the working local application.
- Create a separate empty database, apply the new baseline, load the approved reference seed and preserved local data, and validate the manifest. Compare schema and required reference behavior with the current migration chain on disposable databases.
- Rehearse production's export/import using a protected restored copy, the production PostgreSQL major version, and external effects disabled. Imported production identities are not automatically suitable for local sign-in; use the reviewed environment mapping.
- Record runtime and downtime estimates from the rehearsal. Keep test-generated transactions in disposable test databases, not in the final clean local/production target.
- Switch the local application only after successful verification; retain its old database until the reset is accepted.

### 5. Prepare and execute the production cutover

The owner's **Execute** instruction supplies the production-reset/migration/deployment authorization. Record the concrete target identities, preservation/seed manifests, exclusions, rehearsal results, maintenance window and rollback package before activation.

- Use a dedicated guarded reset/cutover procedure rather than the ordinary additive-migration switch. Validate permissions, capacity, database ownership/grants, extensions, backup paths and PostgreSQL commit-timestamp support required by download evidence.
- Take a maintenance window and stop all writers and background workers, including shared Website intake and relevant webhook delivery/processing. Control retries so old provider work cannot execute against the clean database; establish how external requests received during maintenance are safely retried or reconciled.
- After the write freeze, take and verify the final encrypted database/file backup and consistent selective export. Build a new empty production database, apply the baseline and import the approved manifest. Do not drop the original first.
- Check preserved counts/identities/access, CRM totals and stages, configuration dependencies and excluded operational counts before exposing the replacement.
- Switch the application release and database connection as a matched pair. Review runtime overrides so required traceability/scientific enforcement is on. Verify API health/database access, Portal sign-in and roles, customer/CRM records, configuration pages and shared public Website endpoints.
- Enable workers and reopen writes only after acceptance checks. Confirm backup jobs now target the new database and file locations. Record the actual release identity, baseline, seed version and preservation-manifest hashes.

### 6. Rollback and completion

- Retain the original database, matching application release, runtime configuration and required file snapshot throughout the agreed rollback window. A failed pre-opening cutover restores that matched set, not an EF downgrade through the discarded migration chain.
- If writes have resumed, freeze again and reconcile those new writes before rollback; do not silently discard post-cutover customer or CRM work.
- Archive old migration source in version history and the release/rollback package. Removal of old databases or file sets is a later explicit cleanup action after reset acceptance and the agreed retention window.

## Verification and acceptance criteria

Execution includes backend, frontend and E2E suites after fixture updates, plus PostgreSQL 17/18 schema and selective-import rehearsals.

- Baseline creates a complete empty database on both supported target versions; all required schema objects/defaults are present and EF reports no pending model changes.
- Import and seed are repeatable without duplicates or changes to retained IDs/status/roles; interrupted/conflicting/partial imports fail safely. Exclusion and dependency checks fail closed.
- Every retained user/customer record and relationship matches its preservation manifest. Active/inactive state, permissions and tenant/department boundaries survive. A valid administrator can sign in without accidental account provisioning or a new invitation.
- Local contains exactly one user account, matching bhaack@phaenobiotech.com and its verified local identity; no customer organizations or CRM sales transactions survive except any explicitly necessary account-access dependency shown in the approved manifest. Shared CRM pipeline/stage definitions are present. Production preserves the full approved user/customer/CRM scope.
- CRM opportunities retain identifiers, counts, amounts, currencies, stages, owners, contacts and approved history. CRM boards/details/tasks work; no broken order/Trial links or unintended handoff replay.
- Catalog/sample-type relationships, shipping instructions, workflow/protocol revisions, duration/holiday rules and policies are usable and contain only approved seed entries. Seed replay cannot overwrite later staff changes.
- Target databases contain no excluded test operational work. New work can complete the intended workflow on a disposable equivalent; incomplete traceability blocks result approval/release.
- No notification, integration, invitation or cleanup is triggered during import/rehearsal. Preserved file references resolve to the intended bytes without exposing discarded operational files.
- Encrypted backup restore and matched application/database rollback are demonstrated. Shared Website/API checks pass. Local and production manifests and release identity are recorded separately.

## Planning deliverables and authorization boundary

The initial planning step changed documentation only. The subsequent **Execute** instruction superseded that planning-only boundary. Execution records and recovery instructions are maintained in [the reset runbook](../operations/database-rebase-20260919.md). Protected exports and record-level manifests stay outside source control.
