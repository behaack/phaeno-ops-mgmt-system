# Shipping versioning, kit assembly, Purchasing, and Equipment release

Release source: `4e0ee32b251d2a31aee2cb91ed8c2d1af1fcdbca` on `codex/portal-documentation-search-release`.

## Local verification

- Backend Release suite against a disposable PostgreSQL 18 database migrated from empty through 33 EF migrations: **1,114 passed, 0 failed, 1 Windows-only skip**. The disposable database was removed. EF reported no pending model changes; the configured development database was already current.
- Frontend: **1,214 tests across 190 files passed**; lint, TypeScript, the 56-guide documentation check, and the standard production build passed.
- Dedicated HTTPS Playwright run: **194 passed, 2 intentional mobile-print skips**. This covers deterministic browser fixtures, not hosted signed-in or physical acceptance.
- Generated local frontend build and test outputs from this run were removed before the source commit.

## Production API and database

[Deploy Portal Green run 36292180801](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/36292180801) succeeded for the release source, with image `phaeno-portal-green-api:sha-4e0ee32b251d-run-36292180801-1`. The workflow preserved storage, scanning, bootstrap, and Clerk identity settings and requested EF migrations.

The guarded migration step verified a disposable restore of the pre-migration PostgreSQL backup (`backup_restore_check=PASS`, four schemas, 23 historical EF migrations), encrypted the backup and recovery key, and verified both encrypted checksums before applying migrations. It applied the ten pending migrations, ending at `20260927012819_AddShippingContainerTubeCapacity`, for 33 total. The workflow's deploy, smoke, and public dial-tone steps passed. Independent checks of `https://api.phaenobiotech.com/api/health` and the database-ping endpoint returned 200 and 204.

## Production Portal UI

The first Vercel CLI attempt could not read a locked, unrelated Visual Studio index under `backend/.vs`; it did not change the production alias. The successful deployment used a `git archive` of the exact release commit, with 914 tracked frontend files and no backend paths in Vercel's dry-run upload list.

[Vercel deployment dpl_FV4dV2nSGsSBez6Ar7y9FdssFtE9](https://vercel.com/cadexgenomics/phaeno-ops-mgmt-system/FV4dV2nSGsSBez6Ar7y9FdssFtE9) is Ready and assigned to `portal.phaenobiotech.com`. Independent checks through that domain returned 200 for the Portal root and built CSS, 200 for the proxied API health endpoint, and 204 for the proxied database ping.

## Remaining acceptance

Hosted signed-in journeys, physical kit assembly and barcode/scan qualification, and scientific workflow acceptance remain separate. Historical placed Jobs without saved Sample type and Shipping procedure pins require explicit review before another packet is issued; the migration does not infer those pins.
