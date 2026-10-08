# Material tracking release — September 23, 2026

## Scope and authorization

The owner requested completion of the material-tracking implementation, documentation, testing, commit, push and deployment. The [owning plan](../plans/SAMPLE-MATERIAL-TRANSFER-PLAN.md) records the product decisions. The release captures customer-declared amounts per shipping tube, separate barcoded library and sequencing tubes, actual transfers and remaining balances, optional exhaustion overrides for biological material and reagent lots, a Biological material preparation field, and product-dependent inventory expiration dates.

Interrupted preparation-step saves retain the exact command and attached report across browser reload; sequencing allocation and transfer commands have the same recovery. Server receipts prevent duplicate allocation or consumption. New shipment-specific return kits require catalog product identities and freeze expiration evidence, closing the older free-text entry path. Existing history remains readable.

The release also activates the previously staged assembly foundation, Company Department setup, catalog service-family, shipping-kit contents and Customer dashboard changes. The owner explicitly approved the six production migrations on September 23, 2026, after reviewing the prepared release and migration plan. Activation followed the separate migration authorization required by the [operations policy](../operations-readiness.md#database-migrations).

## Pre-activation target and approved migration plan

Read-only preflight confirmed API source `85fadf139b8953f6293ddb6e59de1ca541b9ac91`, healthy API/database/scanner containers, PostgreSQL 18.6 and the retained `phaeno-portal-green-postgres18-data` volume. The database is `phaeno_portal_green` in `phaeno-portal-green-db`. Seven migrations are applied through `20260921171011_AddSharedShippingProceduresAndContainerPacking`. The production Portal is Ready deployment `dpl_FNsRcLVpxyMTbaH2VTqvM11Aw1N5` at the same source revision.

The following migrations were approved and subsequently applied in this order:

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

### Production activation completed

Both applications now run source `b056528aa59cbec9f2ebc83d407b08211a7c08da`, committed and pushed on `codex/portal-documentation-search-release`:

| Component | Verified production identity |
| --- | --- |
| API | Image `phaeno-portal-green-api:sha-b056528aa59c-material-tracking`; runtime manifest deployed at `2026-09-23T18:01:54Z`; current release directory and image revision label match the source above. |
| Portal | Ready deployment `dpl_AuGhQtr8WawYdmWn7v4xffXJjxUi`, promoted at `2026-09-23T18:03:13Z`; production target and completed `portal.phaenobiotech.com` alias match this deployment. |
| Database | All 13 migrations applied through `20260923172325_AddReturnKitProductExpiration`; biological transfer table and material quantity, tube identity and expiry snapshot fields verified. |

The deployment procedure verified an isolated database restore before applying the six approved migrations. Restore and cleanup checks passed. Encrypted backup `pre-migration-20260923T180134Z-b056528aa59c.dump.enc`, its wrapped key and checksum file are retained under `/var/backups/phaeno-portal-deploy/` and copied off-host into the ignored release `recovery/` directory. Both copied envelopes match their SHA-256 checksums. Plaintext temporary recovery material was removed by the procedure. The deployed source archive SHA-256 is `fc5e27ed4367313e45fd5d80f6476d45c0c88b552ad4fee99b28fdf35fca20aa`.

API, PostgreSQL and ClamAV containers are healthy. API health returns HTTP 200, database ping HTTP 204 and Portal root HTTP 200. Scanner clean/EICAR/encrypted/oversize checks and the file-storage smoke check passed. Post-activation inspection confirms Local storage, ClamAV scanning, blank bootstrap email and a disabled assembly worker, with the retained PostgreSQL 18 volume. Users, Companies, catalog items and Website contact/order counts match preflight; the inactive catalog item retains its USD 1,250 per-specimen price and receives the intended service-family classification. No biological transfers were fabricated.

A fresh unauthenticated browser loaded the complete production sign-in form at `2026-09-23T18:07:48Z`, with no uncaught JavaScript errors, failed network requests or HTTP 5xx responses. The screenshot was visually checked. API logs contained no failure, unhandled-exception or fatal entries since startup at the verification checkpoint. Vercel's runtime-error connector returned HTTP 403, so a platform-wide runtime-error query is not claimed; deployment identity, public responses and the fresh browser were independently verified. Signed-in hosted workflow acceptance remains separate from this deployment smoke check.

## Operational adoption

Add **Biological material** through a new approved Lab step/protocol version; existing approved definitions are unchanged. Historical in-progress work without assigned library tubes retains its output path. Every new sendout, including an older batch's first sendout, requires an observed sequencing transfer. Operators must not fabricate transfers or repeat physical pipetting to satisfy software evidence.

Physical scanner/label use, scientific validity of quantities and procedures, real provider handoff and signed-in hosted workflow acceptance remain distinct from automated fixture evidence. The external assembly adapter remains unavailable and its worker disabled.
