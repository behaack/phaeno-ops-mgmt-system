# Sequencing assembly foundation release — September 22, 2026

## Scope and authorization

The owner authorized commit, push and deployment of the endpoint-independent [sequencing assembly implementation](../plans/SEQUENCING-DATA-ASSEMBLY-PLAN.md). Production migration approval is separately required by the [operations boundary](../operations-readiness.md#database-migrations). The unavailable provider and default-disabled background runner remain in place. This release cannot start real assembly, create simulated scientific results or import external output.

## Reviewed migration and recovery

`20260922145657_AddLabAssemblyJobs` adds `lab_ops.lab_assembly_jobs` and `lab_ops.lab_assembly_events`, restrictive relationships and lookup/uniqueness indexes. It neither rewrites nor removes existing data. There are no persisted percentages or progress-update histories. The migration has already been applied to verified local `localhost:5432/phaeno_ops_clean_20260919`.

Read-only production preflight found seven applied migrations, ending at `20260921171011_AddSharedShippingProceduresAndContainerPacking`; only the assembly migration is pending. Production target is the existing PostgreSQL 18 Portal database `phaeno_portal_green` in `phaeno-portal-green-db`, using the verified `phaeno-portal-green-postgres18-data` volume. The prior API is `85fadf139b8953f6293ddb6e59de1ca541b9ac91` and all three API/database/scanner containers are healthy.

Use the existing `deployment/hetzner/green/deploy-release.sh` procedure with the retained recovery recipient `/opt/phaeno.portal-green/reset-20260919/rebase-backup-public.pem`. It takes a custom-format database backup, restores a disposable copy for verification, then encrypts the dump and recovery key before applying migrations. Retain encrypted envelopes and verified checksums off-host. No secrets or plaintext dumps belong in Git.

The additive DDL should take seconds on this target; database lock contention can extend that. Build and backup verification precede migration. Apply the migration before activating the API, then the matching Portal UI. Prior code is compatible with the added tables. Prefer an assessed forward fix or previous application image while retaining the schema; never automatically drop recorded job history. Disaster recovery uses the matched encrypted backup/runtime records.

Verify the precise migration history, both tables and their indexes, unchanged prior business-record counts, API source label and deployment manifest, scanner health, public API health (200), database ping (204), and matching Ready Vercel production source/alias. Preserve runtime configuration, persistent Local file storage, ClamAV and blank bootstrap email. Verify the background runner remains disabled and no provider is available.

## Verification boundary

Backend solution and Portal production builds, TypeScript, focused ESLint, documentation checks and whitespace checks passed during implementation. Added regression sources compile; automated suites remain unrun under the repository's request-only test rule. No real provider, scientific output or signed-in hosted assembly journey has been verified.

## Release status

Prepared for publication. Production migration approval and activation are pending. Deployment receipts will be retained under ignored `artifacts/sequencing-assembly-release-20260922`.
