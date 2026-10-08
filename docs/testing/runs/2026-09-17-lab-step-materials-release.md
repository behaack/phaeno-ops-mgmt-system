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

Application revision `1e96aa35a84d811296dd7bed4f554af788957a72` was committed and pushed to `codex/portal-documentation-search-release`.

[Deploy Portal Green run 35303119908](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/35303119908) succeeded for that exact revision. Inputs: migrations true, file storage/scanning Preserve, Clerk identity cutover false. The job completed in 4m13s.

The log records `backup_restore_check=PASS` and `backup_restore_cleanup=PASS` at 03:28:59 UTC on September 18 (September 17 PDT). The encrypted dump and key checksums for `pre-migration-20260918T032854Z-1e96aa35a84d` both reported OK. All three migrations listed above applied at 03:29:03 UTC. The deployment reported matching source revision at 03:29:13 UTC and unchanged Website intake counts `12,5`.

The exact-commit Portal [preview HbWiEUepEjjhSXcNhVEdy5dfXSYu](https://vercel.com/cadexgenomics/phaeno-ops-mgmt-system/HbWiEUepEjjhSXcNhVEdy5dfXSYu) built successfully. Promotion created a new build with Production environment settings: [GMNz16zPXsDuRFpUNVuQFbXgVHJB](https://vercel.com/cadexgenomics/phaeno-ops-mgmt-system/GMNz16zPXsDuRFpUNVuQFbXgVHJB). Vercel displayed Ready, a 26-second build, September 17 at 8:30:18 PM PDT, source `1e96aa35a84d811296dd7bed4f554af788957a72`, and the assigned domain `portal.phaenobiotech.com`.

Independent post-promotion probes returned API health 200, database ping 204, Portal root 200 and Portal API-health proxy 200. Fresh browser navigation rendered the signed-in POMS dashboard, new laboratory navigation, the new Lab steps catalog (empty in production), the existing Materials list, and its material-detail page with the unassigned product clearly shown. No browser console errors were reported. No production configuration or operational records were written for smoke verification. Automated suites and populated laboratory acceptance remain unperformed; this release does not copy local fixtures into production.
