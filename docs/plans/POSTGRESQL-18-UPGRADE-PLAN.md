# Production PostgreSQL 18 upgrade

Status: authorized and in progress, September 19, 2026. The owner accepted the proposed production upgrade with "Okay. Let's do it now." Scope includes rehearsal, backup/deployment changes, verification, source commit/push and the production engine switch. No application schema or EF migration change is planned.

## Product outcome

Align production with the PostgreSQL 18 major version already used locally. Preserve every current production row, identity, authorization, CRM relationship, configuration revision and database object. This is a full transfer, not another selective reset. Keep the deployed API/UI application and authentication settings unchanged. Other applications on the shared host are outside scope.

The [September 19 rebase](../operations/database-rebase-20260919.md) left a roughly 21 MB active database on PostgreSQL 17.10, Debian trixie, with only the standard plpgsql extension. The separately retained pre-rebase database remains on its original PostgreSQL 17 volume; it is not copied into the active version 18 instance.

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

Before writes reopen, rollback stops the new database, recreates the version 17 container from its retained volume and matched configuration, and restarts the API. After writes reopen, reconcile new records before rollback; a blind rollback can lose new business data. Never run the old engine on new-version storage.

## Acceptance

All current data and schema compare equal; the single EF baseline remains unchanged. Production reports 18.6, expected persistent volume, no public database port, commit timestamps on, and healthy API/Portal/Website reads. Backup restore succeeds and the original timer schedule uses the updated helpers. Old PostgreSQL 17 storage retains both reset recovery databases. Local administrative restart and signed-in acceptance from the prior reset remain separately tracked.

References: [PostgreSQL major upgrades](https://www.postgresql.org/docs/18/upgrading.html), [version 18 migration notes](https://www.postgresql.org/docs/18/release-18.html), [official Docker storage layout](https://hub.docker.com/_/postgres).

## Rehearsal evidence

The PostgreSQL 18.6 candidate restored all 197 tables and all 211 current rows with equal data, foreign keys, migration history and normalized schema definitions. The deployed API's migration-only check reported the database already up to date. Commit timestamps and data checksums are on. Sixteen governed-download and managed-retention regression tests passed against a separate network-isolated PostgreSQL 18.6 container, with zero failures or skips; that disposable test container was removed without touching candidate or production storage.
