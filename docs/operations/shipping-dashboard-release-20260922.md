# Shipping contents and Customer dashboard release — September 22, 2026

## Scope and authorization

The owner requested documentation updates, tests, commit, push and redeployment of the pending Portal changes. The release includes supplier-product shipping-kit contents, Department-scoped Customer request and result summaries, fixed purchased sequencing runs with independent reserve tubes, sized sample-submission units, and clearer CRM request completion and pricing guidance. Updated Customer, Partner and Phaeno help describes the implemented behavior.

Production activation also includes the previously committed assembly foundation, Company Department setup, catalog service-family and invitation-completion changes. The prior application remains live until the required production migrations are separately approved under the [operations boundary](../operations-readiness.md#database-migrations).

## Verified production target and migration plan

Read-only preflight on September 23 UTC confirmed API source `85fadf139b8953f6293ddb6e59de1ca541b9ac91`, healthy API/database/scanner containers, PostgreSQL 18.6 and the existing `phaeno-portal-green-postgres18-data` volume. The database is `phaeno_portal_green` in `phaeno-portal-green-db`. Seven migrations are applied, ending at `20260921171011_AddSharedShippingProceduresAndContainerPacking`. The production Portal is Ready deployment `dpl_FNsRcLVpxyMTbaH2VTqvM11Aw1N5` with the same source revision.

Four migrations must run in order before the new API can be activated:

| Migration | Effect |
| --- | --- |
| `20260922145657_AddLabAssemblyJobs` | Adds assembly job/event tables, restrictive relationships and indexes. The assembly worker stays disabled and the provider remains unavailable. |
| `20260922163113_AddCompanyDepartmentSetup` | Adds a nullable Company setup-organization reference, unique index and restrictive foreign key. |
| `20260922194907_AddCatalogServiceFamily` | Adds a service-family field defaulting to Other; classifies only the existing `pseq-lab-service` stable reference as PSeq Lab Service. |
| `20260923001318_AddShippingKitContents` | Adds revision-owned kit content rows, positive quantities, restrictive foreign keys and uniqueness/lookup indexes. No existing contents are inferred or seeded. |

Existing records, prices and activation states are retained. Production preflight counts were 3 users, 3 Companies, 1 catalog item, 12 Website contacts and 5 Website orders. The sole catalog item was inactive PSeq Service at USD 1,250 per specimen. Deployment does not copy development catalog data.

Use the existing `deployment/hetzner/green/deploy-release.sh` procedure and recovery recipient `/opt/phaeno.portal-green/reset-20260919/rebase-backup-public.pem`. Before migration, that procedure takes a database backup, verifies an isolated restore, encrypts the backup and wraps its key. A failed recovery check blocks migration. Retain the encrypted recovery envelopes and matching checksums off-host under ignored release artifacts. Keep runtime settings, blank bootstrap email, persistent Local storage and ClamAV unchanged.

The additive DDL should take seconds, although database locks can extend this. Build and recovery checks happen first; apply migrations before API replacement, then activate the matching Portal UI. Previous code is compatible with the added schema. Prefer an assessed forward fix or previous application image with the added schema retained; never automatically drop new assembly history or kit contents. Disaster recovery uses the matched encrypted snapshot and runtime/image records.

Verify exact migration history and new tables/fields, retained catalog price/status and prior record counts, matching API image/source manifest and Portal source/alias, public health (200), database ping (204), scanner health and recent runtime errors.

## Verification and release status

Frontend verification passed: 1,185 unit tests across 185 files, ESLint, TypeScript and the production build. All 184 applicable desktop/mobile browser cases have passing full-run/follow-up evidence; two mobile print cases are intentionally skipped. The full browser run recorded 178 passed, 3 failed and 3 flaky; corrected fixtures and isolated-cache follow-ups passed 22, 2 and 16 cases without retries. See the [E2E checkpoint](../plans/E2E-TEST-PLAN.md#september-22-2026--authorized-release-regression-checkpoint) for the evidence boundary.

Backend verification covers 1,046 passing applicable cases plus one intentional Windows skip for the Unix symlink fixture. The full PostgreSQL-enabled run recorded 1,028 passed, 18 failed and one skipped; a 56-case focused follow-up passed every corrected case. Fixtures now use PostgreSQL timestamp precision and actual configured quote offerings, while preserving their assertions. Release solution build passed with zero warnings/errors, and EF reports no pending model changes. Isolated local test databases were removed afterward. See the [backend checkpoint](../plans/BACKEND-TEST-PLAN.md#september-22-2026--authorized-release-regression-checkpoint).

Generated help passes consistency validation for all 56 guides, and changed Markdown paths and whitespace checks pass. Exact publication and prepared artifact identities are retained under ignored `artifacts/shipping-dashboard-release-20260922`. Production migration approval remains pending; no production data or active application was changed by the read-only preflight or local regression checks.

Automated fixture coverage is separate from signed-in hosted invitation/MFA and customer/staff workflow acceptance, real provider delivery, physical kit/scanner validation and scientific acceptance. Those boundaries are not closed by this software release.
