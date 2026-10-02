# Portal workflow release — October 2, 2026

## Scope and verification

The owner authorized documentation, successful tests, commit, push, deployment
and necessary EF migrations. The [release plan](../plans/PORTAL-WORKFLOW-RELEASE-20261002-PLAN.md)
preserves the production-hosted test database, identities, private files and
runtime choices. No hosted reset, data repair, Clerk cutover, public Website UI
deployment or Emmaus/OCIA change is included.

Application source `66240861c32c49af1b85ac4fa4c0dcf9f6fcd5c7` was reviewed,
committed and pushed to `codex/portal-documentation-search-release`.
It provides accessioned-sample use facts, receipt/shipment history, accepted-tube
box placement, kit request management, saved quote acceptance navigation and one
Lab step Actions menu for the single Draft. Preview lot capture follows the
step's Include lot number configuration. Accepted Change quote additions can
prepare pairs after original-roster finalization and amend already-started
provider scope with the accepted-addition reason. Shipment search uses mapped
latest non-void packet fields.

| Gate | Result |
| --- | --- |
| Backend Release build | Passed, zero warnings/errors |
| EF model differences | None |
| Full connected backend | 1,201 passed, 2 intentional skips, zero failures |
| Full frontend unit suite | 1,353 passed in 212 files |
| Focused test typing correction | 18 passed |
| Full desktop/mobile browser suite | 198 passed, 2 intentional mobile print skips |
| Lint / TypeScript / production build | Passed |
| Documentation generation / consistency | 56 guides, corpus `a5744885cb96` |
| Diff / staged credential scan | Passed |

Backend tests used a newly migrated disposable loopback PostgreSQL 18 database,
then verified its removal. The two backend skips require a supported symbolic-link
storage host and the dedicated recovery-export environment. Browser tests used
an isolated mock-session server with frozen source; they make no hosted or
physical writes. Earlier build-overlapping browser reload failures are superseded
by the clean full run. Physical printer/scanner, scientific, real-provider and
hosted operator acceptance remain separate.

## Baseline and migration rehearsal

Before this release, API source was
`3cb30732e8756ab49a2002f5d5c6cabdd5eefa0a`, image
`phaeno-portal-green-api:sha-3cb30732e875-run-36669915989-1`, image ID
`sha256:4441298e0eeff8060b68390af1f50ce55d92dfd7d4b7366d5d29accca2409664`.
The public UI alias resolved to `dpl_GujX6kbdaxSXgHYpWP7rsenFzJ7d`.
The database had seven migrations through `AddLabQuoteDeliveryTarget`, with zero
Jobs, invoices and Lab samples.

The seven pending source migrations passed on an isolated dump of the current
hosted database, including a repeated idempotent application. All fourteen
migrations were recorded and every existing application table count was preserved.
The disposable database and temporary unencrypted dump were removed. Reviewed SQL
SHA-256: `7c7ac11cefd977159a7b76399d82551f1c5a54ad746071a5683a184a555509f1`.
No new migration was needed for the latest fixes.

## Recovery evidence

[Protected backup run 37075361604](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/37075361604)
completed successfully from the exact application source. Coordinated snapshot
`snapshot-20261002T225945Z-f63b3a94-6cbe-4b2c-b514-2902eb3919e1` captured the
existing API/database and Local private files with writers stopped. Isolated
restore, encryption round trip, cleanup and off-server export checks passed.
The file inventory contained zero files/bytes. The backup workflow was disabled
immediately after success; the daily timer was not changed.

Encrypted off-server artifact ID: `11256755623`, retained for 35 days.
Artifact digest: `c52403e5de637984d51af244348f9f2b5bbb7e00e34b1b7a490eecac6fce7161`.
The encrypted files were also downloaded to protected ignored local recovery
storage and matched the manifest:

| File | SHA-256 |
| --- | --- |
| `snapshot.tar.enc` | `a0d8fa1163716e27a76e4007ab0ca834516a9f7fa725e9eb9db38ec2a5646d13` |
| `snapshot.key.enc` | `1880fdb126e0dde9fc53c400f6b9456dbb420e259810bd2e4b24ee1c65f4c097` |
| `receipt.env` | `563b4c65732af02e04c2544890e99f8abfbb24e2d103ed5ba83af1304ddd9b6d` |

Keep prior recovery points and the matched API/UI rollback identities. After
writes reopen, preserve newly recorded facts and assess recovery before rollback;
never run the old API against the new schema.

## Activation status

Production UI deployment `dpl_V8im1BDmMvdceQhNsnbSgdaxeo21` is Ready at
`phaeno-ops-mgmt-system-7rp4bm727-cadexgenomics.vercel.app`. Its deployment metadata
independently confirms the exact application commit. It was built with Production
Clerk, the production API proxy and mock sessions disabled, from an isolated Git
archive with unchanged lockfile contents. The public Portal alias still pointed
to the baseline before API activation.

[Protected API run 37077429646](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/37077429646)
completed successfully from the same commit with migrations enabled and storage,
scanning and bootstrap set to Preserve; Clerk cutover remains false. The workflow
was disabled immediately afterward. The matching UI was promoted only after the
running API and all fourteen migrations were verified. The public domain's own
inspection independently resolves to the deployment above.

| Active component | Verified identity |
| --- | --- |
| API source | `66240861c32c49af1b85ac4fa4c0dcf9f6fcd5c7` |
| API image | `phaeno-portal-green-api:sha-66240861c32c-run-37077429646-1` |
| API image ID | `sha256:f25539681ce239243dc6f054604b59cfc62fddb67902fcd65c11bcdc8b58e4cc` |
| API release | `/opt/phaeno.portal-green/releases/66240861c32c49af1b85ac4fa4c0dcf9f6fcd5c7-37077429646-1` |
| Portal UI | `dpl_V8im1BDmMvdceQhNsnbSgdaxeo21`, Ready |
| Public Portal | `https://portal.phaenobiotech.com` |
| Database | `phaeno_portal_green`, PostgreSQL 18.6, fourteen migrations |

The final encrypted database backup under the deployment lock passed isolated
restore and cleanup before migration. Its encrypted files were copied off-server
and matched the manifest:

| File | SHA-256 |
| --- | --- |
| `pre-migration-20261002T232813Z-66240861c32c.dump.enc` | `7762ee931df46e302dbb085436ce4d7e89878368ffd383d1513782e187798605` |
| `pre-migration-20261002T232813Z-66240861c32c.key.enc` | `5210cdc47609904f7a84481e59fff82df774d0ab84000167de51d11c1d972375` |

All **223 existing application table counts** match the pre-migration hosted
copy. Jobs, invoices and samples remain zero. The database and Portal runtime
configuration file hashes are unchanged; the compose file selects the new image.
All private/index storage mounts are retained. API, scanner, Portal database and
the separate OCIA services remain healthy. A bounded post-startup API log check
found zero failure, fatal or unhandled-exception entries.

Live smoke checks pass: API health 200, database ping 204, accession directory
401 without credentials directly and through the Portal proxy, public Website
search/root 200 and Portal root 200. An isolated production browser rendered the
actual Clerk sign-in form with no console warnings or errors. No authentication
or operational form was submitted for these checks.

Both Vercel Git deployment controls remain `false`. Deploy Portal Green and Back
Up Portal Database and Files are `disabled_manually`, with no active deployment
run. Prior recovery packages remain retained. Temporary local build/staging
outputs were removed after verification; release logs, TRX, screenshots and
encrypted recovery evidence remain in ignored artifacts. The running local
development API and frontend outputs were preserved.

The controlled release is complete. Fresh person sign-in, authenticated hosted
workflow, physical scanner/printer, provider and scientific acceptance remain
separate from the confirmed release and automated test evidence.
