# Lab steps, configuration preview and materials release — September 17, 2026

## Authorized release

The owner requested commit, push and deployment of the completed session changes. The earlier explicit authorization to apply EF migrations to production remains in effect. This release includes reusable Lab steps, configuration preview, product-linked material lots, configured units, shared material quantity exceptions, lot reconciliation, preparation form refinements and the three scoped supplier/product list changes.

Deploy from `codex/portal-documentation-search-release`. Exclude the mutable local search-index `segments.gen` artifact without discarding it. Preserve file storage, scanning, authentication and existing production feature settings. No public Website promotion or operational data backfill is included.

## Migration and recovery plan

Target: the existing Portal Green production PostgreSQL database used by `https://api.phaenobiotech.com`, through the protected `Deploy Portal Green` workflow. The workflow must create and checksum-verify its encrypted pre-migration backup and perform the configured isolated restore verification before applying migrations.

Expected migrations:

1. `20260917191542_AddReusableLabSteps` — two new Lab step catalog tables and indexes.
2. `20260917225502_LinkMaterialLotsToSupplierProducts` — nullable product identity, index, check constraint and restricted foreign key; existing rows remain unlinked.
3. `20260918000907_AddMaterialQuantityReconciliation` — nullable quantity hold reason and retained JSON history defaulting to an empty array.

These are additive changes compatible with existing rows and the previous application's reads. No approved definitions, inventory quantities or historical evidence are rewritten. Expected migration duration is seconds to a few minutes; the pipeline has a 35-minute limit. Verify migration names and backup evidence in the deployment log, then exact source revision, API health and database ping. The UI must use a production-environment build of the same source revision. If a migration succeeds but application deployment fails, use the established forward-fix process; do not automatically remove schema or restore a backup over newer business data.

## Verification boundary

The implementation checkpoint passed the Release solution build (including regression compilation), frontend typecheck, scoped lint, documentation generation/check and connected fictional configuration preview. Automated suites and populated operational write acceptance were not executed. The release workflow builds again; deployment smoke and authenticated read-only UI inspection do not substitute for scientific, physical or operational acceptance.

## Deployment results

Pending dispatch and verification. Record exact commit, workflow, backup/migrations, Portal deployment identity and independent probes here after release.
