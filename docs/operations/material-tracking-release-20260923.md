# Material tracking release — September 23, 2026

## Scope and authorization

The owner requested completion of the material-tracking implementation, documentation, testing, commit, push and deployment. The [owning plan](../plans/SAMPLE-MATERIAL-TRANSFER-PLAN.md) records the product decisions. The release captures customer-declared amounts per shipping tube, separate barcoded library and sequencing tubes, actual transfers and remaining balances, optional exhaustion overrides for biological material and reagent lots, a Biological material preparation field, and product-dependent inventory expiration dates.

Interrupted preparation-step saves retain the exact command and attached report across browser reload; sequencing allocation and transfer commands have the same recovery. Server receipts prevent duplicate allocation or consumption. New shipment-specific return kits require catalog product identities and freeze expiration evidence, closing the older free-text entry path. Existing history remains readable.

Previously staged assembly, Company Department setup, catalog service-family, shipping-kit contents and Customer dashboard changes are also ahead of production. The release must apply all six pending migrations before activating its API and UI. The [operations policy](../operations-readiness.md#database-migrations) requires explicit authorization for production migrations separately from the release preparation below.

## Verified production target and migration plan

Read-only preflight confirmed API source `85fadf139b8953f6293ddb6e59de1ca541b9ac91`, healthy API/database/scanner containers, PostgreSQL 18.6 and the retained `phaeno-portal-green-postgres18-data` volume. The database is `phaeno_portal_green` in `phaeno-portal-green-db`. Seven migrations are applied through `20260921171011_AddSharedShippingProceduresAndContainerPacking`. The production Portal is Ready deployment `dpl_FNsRcLVpxyMTbaH2VTqvM11Aw1N5` at the same source revision.

Apply these migrations in order:

| Migration | Effect |
| --- | --- |
| `20260922145657_AddLabAssemblyJobs` | Adds assembly job/event tables, restrictive relationships and indexes. The assembly worker remains disabled. |
| `20260922163113_AddCompanyDepartmentSetup` | Adds a nullable Company setup-organization reference with index and restrictive foreign key. |
| `20260922194907_AddCatalogServiceFamily` | Adds a service-family field defaulting to Other; classifies only the stable `pseq-lab-service` reference as PSeq Lab Service. |
| `20260923001318_AddShippingKitContents` | Adds revision-owned kit content rows, positive quantities, restrictive relationships and indexes. |
| `20260923165524_AddSampleMaterialTransfersAndProductExpiry` | Adds immutable biological transfer records; nullable declaration, quantity and tube references; quantity history; product `can_expire` default false; and stock expiration snapshots. |
| `20260923172325_AddReturnKitProductExpiration` | Adds a nullable frozen product-expiration snapshot to shipment-specific return kits. |

No historical quantities, pipetting, kit contents or expiration dates are inferred. No tables or existing data are removed. Production preflight counts were 3 users, 3 Companies, 1 catalog item, 12 Website contacts and 5 Website orders. The sole catalog item was inactive PSeq Service at USD 1,250 per specimen. Development catalog data is not deployed.

Use `deployment/hetzner/green/deploy-release.sh` with recovery recipient `/opt/phaeno.portal-green/reset-20260919/rebase-backup-public.pem`, SHA-256 `88d02c27ff9bc422dded509dfdf294e4c8b8f8015f2677d4e486aa6d590c5518`. The procedure takes a database backup, verifies an isolated restore, encrypts the backup and wraps its key before permitting migration. Failed recovery verification blocks migration. Retain encrypted envelopes and matching checksums off-host under ignored release artifacts. Preserve the runtime configuration, blank bootstrap email, Local storage, ClamAV and disabled assembly worker.

Additive DDL is expected to take seconds, although lock waits can extend that. Build and recovery checks run first; migrate before replacing the API, then activate its matching Portal deployment. Previous code remains compatible with added schema. Prefer an assessed forward fix or previous application image with the added schema retained; do not automatically run destructive Down migrations against newly captured history. Disaster recovery uses the matched encrypted snapshot and runtime/image records.

Verify exact migration history and new fields/tables, retained catalog price/status and preflight counts, matching API image/source manifest and Portal deployment/alias, health HTTP 200, database ping HTTP 204, scanner health and recent runtime errors.

## Verification and activation

Software release verification is complete. Evidence is retained under ignored `artifacts/material-tracking-release-20260923`, including machine-readable combined test outcomes, logs, browser screenshots and the reviewed six-migration SQL script. That script's SHA-256 is `f6d0c2f318a48a0b777246d01d29b302c55145bc47318156034dd8d739e15a4f`.

Frontend: the complete initial suite passed 1,208 tests in 188 files. After adding durable recovery, 15 focused component tests passed, TypeScript and full ESLint passed, all 56 generated guides passed consistency checks, and the final production build passed. Full browser execution recorded 187 passed, one failed and two intentional mobile print skips. The unchanged CRM case then passed with all eight CRM desktop/mobile cases in a focused run; combined evidence covers all 188 applicable browser cases. The full run is not represented as a clean run. New fixtures prove interrupted transfer/report recovery, original command replay and one debit, with desktop/mobile accessibility checks.

Backend: **1,072 applicable cases have passing evidence**, with one intentional Windows skip for the Unix symlink test and no unresolved failures. The full PostgreSQL run recorded 1,067 passes/four failures/one skip; focused follow-ups recorded 64 passes/two failures, 45 passes/one failure, and two final passes. Every failed case has a later passing result. The dispatch query now uses mapped `VoidedAt`; fixtures represent the catalog-linked kits and third sequencing tube. The new preparation case also checks report-backed rollback/replay and distinguishes operational holds from QC holds. Final Release build has zero warnings/errors, EF reports no pending model changes, and both feature migrations are applied to verified `localhost:5432/phaeno_ops_clean_20260919`. The complete ERD is regenerated and disposable loopback test databases were removed. See the [backend checkpoint](../plans/BACKEND-TEST-PLAN.md#september-23-2026--material-amounts-transfers-and-expiration).

Production migration approval and activation are pending. No production data or active application has been changed by local verification or read-only preflight. Publication and staged deployment do not by themselves establish activation.

## Operational adoption

Add **Biological material** through a new approved Lab step/protocol version; existing approved definitions are unchanged. Historical in-progress work without assigned library tubes retains its output path. Every new sendout, including an older batch's first sendout, requires an observed sequencing transfer. Operators must not fabricate transfers or repeat physical pipetting to satisfy software evidence.

Physical scanner/label use, scientific validity of quantities and procedures, real provider handoff and signed-in hosted workflow acceptance remain distinct from automated fixture evidence. The external assembly adapter remains unavailable and its worker disabled.
