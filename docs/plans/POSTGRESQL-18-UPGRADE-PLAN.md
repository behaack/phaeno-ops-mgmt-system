# Production PostgreSQL 18 upgrade

Status: completed in production, September 19, 2026. The owner accepted the proposed production upgrade with "Okay. Let's do it now." Scope includes rehearsal, backup/deployment changes, verification, source commit/push and the production engine switch. No application schema or EF migration change is planned.

## Product outcome

Align production with the PostgreSQL 18 major version already used locally. Preserve every current production row, identity, authorization, CRM relationship, configuration revision and database object. This is a full transfer, not another selective reset. Keep the deployed API/UI application and authentication settings unchanged. Other applications on the shared host are outside scope.

The [September 19 rebase](../operations/database-rebase-20260919.md) left a roughly 21 MB active database on PostgreSQL 17.10, Debian trixie, with only the standard plpgsql extension. The pre-rebase database stayed on the original PostgreSQL 17 volume during cutover and was not copied into the active version 18 instance. That retired volume was subsequently removed with separate owner authorization; encrypted recovery archives remain available as recorded below.

## Engineering decisions

- Use official `postgres:18.6-trixie`, preserving the Debian family and `en_US.utf8` locale. Record its exact digest.
- Restore a complete logical dump into a new cluster and named volume. PostgreSQL 18 mounts `/var/lib/postgresql` with version-specific PGDATA. Never attach the old volume to the new engine.
- Declare the new production volume external so Compose cannot silently create empty production storage. Normal deployment checks the live engine and mounted volume before mutations.
- Keep `track_commit_timestamp=on`; use version 18 data checksums. Require zero existing operational download commit-evidence records before logical transfer; otherwise stop for an evidence-preserving migration design.
- Compare every table/row, columns, constraints, indexes, foreign keys and migration history in rehearsal and after the final transfer. Compare PostgreSQL 18's additional NOT NULL catalog rows through column nullability. Normalize the reviewed equivalent varchar-array-to-text cast representation in two partial indexes and one Website check constraint; all other schema differences fail.
- Update restore verification and maintenance clients from PostgreSQL 17 to 18. Verify both a version 17 source dump and version 18 output dump.
- Reinstall the existing host backup timer against the exact new helper revision after a verified backup, preserving recipient and schedule. Scheduled GitHub collection only retrieves the latest encrypted backup and does not replace the host timer.

## Execution and rollback

1. Record current images, volumes, database/role/locale/extensions, available capacity and scheduler. Save protected runtime files and timer units.
2. Restore a fresh live dump into an isolated PostgreSQL 18 rehearsal database. Compare complete data/schema, check the existing API's migration compatibility without workers, and verify backup restoration.
3. Commit/push reviewed infrastructure source; stage an immutable release package. Record infrastructure revision separately from the unchanged application image/source.
4. Take a fresh encrypted coordinated database/files backup and retain it off-server. Acquire the deployment lock, stop API writers/workers, capture the final full dump/snapshot and restore it into the empty canonical database in the new cluster. Abort on any data/schema or evidence check failure.
5. Stop and remove only the old database container, preserving its named volume, exact image and prior Compose definition. Start the new Compose database on the populated version 18 volume, then the unchanged API. Verify data, health, enforcement and transaction timestamps.
6. Verify an encrypted version 18 backup/restore, install the new timer helpers, record the next scheduled time and measured outage. Manual execution is not scheduled-run evidence.
7. Retain old storage and recovery packages until separately authorized cleanup.

During the original cutover, before writes reopened, rollback could stop the new database, recreate the version 17 container from its retained volume and matched configuration, and restart the API. Following the separately authorized storage retirement below, that volume-based rollback is no longer available; recovery requires the matched encrypted backup and application release. After writes reopen, reconcile new records before rollback; a blind rollback can lose new business data. Never run the old engine on new-version storage.

## Acceptance

All current data and schema compare equal; the single EF baseline remains unchanged. Production reports 18.6, expected persistent volume, no public database port, commit timestamps on, and healthy API/Portal/Website reads. Backup restore succeeds and the original timer schedule uses the updated helpers. Both reset recovery databases were retained on PostgreSQL 17 storage through cutover; verified encrypted archives preserve those recovery points after the separately authorized storage retirement. Local administrative restart and signed-in acceptance from the prior reset remain separately tracked.

References: [PostgreSQL major upgrades](https://www.postgresql.org/docs/18/upgrading.html), [version 18 migration notes](https://www.postgresql.org/docs/18/release-18.html), [official Docker storage layout](https://hub.docker.com/_/postgres).

## Rehearsal evidence

The PostgreSQL 18.6 candidate restored all 197 tables and all 211 current rows with equal data, foreign keys, migration history and normalized schema definitions. The deployed API's migration-only check reported the database already up to date. Commit timestamps and data checksums are on. Sixteen governed-download and managed-retention regression tests passed against a separate network-isolated PostgreSQL 18.6 container, with zero failures or skips; that disposable test container was removed without touching candidate or production storage.

## Production execution record

- Infrastructure revision: `28b6e8c2a67e839e98e8a815710c2dd5f2f3313d`, committed and pushed on `codex/portal-documentation-search-release`. Active infrastructure release: `/opt/phaeno.portal-green/releases/postgres18-28b6e8c2a67e`.
- Production version: **PostgreSQL 18.6** (`18.6-1.pgdg13+2`, Debian trixie). Official image digest `sha256:86c951e05bf56c93d95d397747fb8820ac76cc3bedb78f43abd83eedbe3666ae`; local image ID `sha256:662db3da228c2ea2649b3ae04db4b4479e85fea5979f6a917a7f6d5cb1e7ec39`.
- Switch completed **2026-09-19 17:16:48 UTC**, with **18 seconds** of API pause. Pre/post coordinated backups each paused the API for 7 seconds, for 32 seconds across three separate maintenance pauses.
- Final write-frozen source, restored candidate and activated database comparisons all passed: **197 tables, 211 rows**, exact data/column/foreign-key/migration equality, and reviewed equivalent schema representation. Users 2, organizations 2, CRM opportunities 1 and Lab orders 0 remain intact. The original reset import receipt was preserved as a database comment.
- No new EF migration was generated or applied. Baseline remains `20260919153100_InitialPSeqOperationsRebased`. The deployed API migration-only rehearsal reported already up to date.
- Running application remains `phaeno-portal-green-api:sha-9ca9820014af-rebase-20260919`, source `9ca9820014af07aa7280bd57a73cb66f5ff6044b`. The existing Portal deployment remains unchanged; this release changes infrastructure only. Runtime records distinguish application and infrastructure revisions.
- Active database volume is `phaeno-portal-green-postgres18-data`, mounted at `/var/lib/postgresql`, with no host database port. Locale is `en_US.utf8`; recorded and actual collation versions both equal 2.41. Data checksums and commit timestamps are on; a fresh committed transaction produced an actual commit timestamp.
- Result traceability and scientific evidence runtime flags remain true. API health, Portal health/root and public Website search returned HTTP 200; database ping returned HTTP 204. The post-switch API log check found no failure or unhandled-exception entries.
- The ordinary deployment guard was exercised against version 17 and rejected the operation before any runtime file changed. Shell syntax and documentation link/whitespace checks passed. All 16 focused version 18.6 timing/retention tests passed with no skips.

### Recovery and scheduler

Pre-upgrade encrypted coordinated backup: `snapshot-20260919T171454Z-3089b820-0928-49a9-99e5-01ea87423e13`. Post-upgrade backup: `snapshot-20260919T171740Z-c6f90f08-d29b-42ac-b321-8ed131490b41`. Both passed database restoration, file-reference checks, a populated synthetic file fixture and helper cleanup. Actual production file references were zero; this is not a claim of real scientific-file recovery acceptance. Encrypted snapshots and manifests were copied off-server and checksums verified. The additional final write-frozen dump was independently encrypted, copied off-server and decrypted with the existing migration-backup private key to verify exact bytes; temporary decrypted output/passphrase files were removed.

The existing host timer now points to immutable helpers at infrastructure revision `28b6e8c2a67e839e98e8a815710c2dd5f2f3313d`. It is enabled and active, retains 02:00 America/Los_Angeles plus the 03:00 DST fallback, and reported its next execution at **September 20, 2026, 09:00 UTC (2 a.m. Pacific)**. The recipient key and off-server collection workflow were unchanged. This verifies configuration and manual backup execution, not the next scheduled run.

At the cutover checkpoint, the protected PostgreSQL 17 volume `phaeno-portal-green_portal_green_postgres_data` retained the original version 17 cluster, including the active pre-upgrade database and separately retained pre-rebase database. Its `PG_VERSION` was read as 17 using the PostgreSQL file owner with a read-only mount. The original cutover deleted no rollback volume or old database. The later authorized retirement is recorded below; the historical Compose definition, runtime manifest and encrypted recovery points remain retained. Private snapshots, scripts and receipts are under ignored `artifacts/postgres18-upgrade-20260919` locally and root-only `/opt/phaeno.portal-green/upgrade-postgres18-20260919` on the host.

### Authorized PostgreSQL 17 storage retirement

The owner subsequently instructed, "Once verified, please remove 17." At **2026-09-19 17:30:40 UTC**, a guarded operation under the deployment lock removed only the unused Portal volume `phaeno-portal-green_portal_green_postgres_data`. This removed its pre-upgrade and pre-rebase database copies from live host storage. The old Portal database container had already been removed during cutover.

Before deletion, verification confirmed the volume's Portal ownership, `PG_VERSION=17`, no container references, the exact active PostgreSQL 18 image/volume, and healthy API/database endpoints. Server and off-server encrypted archive checksums passed. Both final pre-rebase and pre-upgrade dumps were independently decrypted off-server and matched their original plaintext hashes; the pre/post-upgrade coordinated backups retained their successful restore/cleanup receipts and verified encrypted checksums.

After deletion, the old volume was confirmed absent. PostgreSQL 18.6 remained healthy on `phaeno-portal-green-postgres18-data`, with transaction timestamps and checksums on; API health returned 200 and database ping 204. No application or database restart was needed. All encrypted recovery archives were retained. The private receipt is `pg17-retirement-receipt.json` in the local and server upgrade artifact directories listed above.

The shared `postgres:17` image, ID `sha256:2d6ecff94c7417f93799039c2884c5d86515ec6e8289b1141ce6773de40f538d`, remains required by the separate `ociaapi-db-1` container. Emmaus/OCIA remained on PostgreSQL 17.10 with the same container, image and start time. The owner explicitly chose to leave Portal on 18.6 and Emmaus on 17.10. No shared image or unrelated application storage was removed.

For current Portal recovery, restore the appropriate verified PostgreSQL 18 backup into separately prepared version 18 storage. Historical pre-upgrade/pre-rebase archives remain available with their matched application/runtime recovery records. The former database-rename or old-volume reattachment shortcuts no longer apply in production. Reconcile any newer writes before restoring an older recovery point. Local database retention is unchanged.

### Separate remaining acceptance

Local PostgreSQL remains version 18.3; its earlier administrator restart requirement still reports `track_commit_timestamp=off` and is not resolved by upgrading production. The previously recorded fresh owner sign-in checks also remain separate. No identities or access permissions were changed during this engine upgrade.
