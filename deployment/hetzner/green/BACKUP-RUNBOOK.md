# Coordinated database and Local-file backups

This procedure preserves a matching PostgreSQL snapshot and all bytes in the
private `provisioning-files` and `order-files` areas. It supports the explicitly
configured production Local volume. It does not switch providers, migrate bytes,
restore production, reactivate expired results, or enable retention processing.

## Activate and operate

Use **Back Up Portal Database and Files** (`portal-backup.yml`) with
`mode=install-and-backup` on the reviewed maintenance revision. The production
environment uses the existing protected SSH connection and
`PORTAL_MIGRATION_BACKUP_PUBLIC_KEY`. No private decryption key is installed on
the application server. The remote installer requires root and systemd.

The first run must create, restore-check, encrypt, and collect a backup before
the maintenance task is accepted. It then enables the host timer using helpers
stored under an immutable revision directory. Ordinary API releases do not reset
or replace that timer. Deploy a newly reviewed backup revision with the same
operation when the backup implementation needs updating.

The host timer runs at **2 a.m. America/Los_Angeles**. A 3 a.m. invocation covers
the spring date when 2 a.m. does not exist; it skips when a successful backup is
less than two hours old. The timer does not catch up during office hours after a
server restart. `backup-and-collect` creates a manual recovery point;
`collect-latest` collects a verified snapshot no older than 30 hours; `status`
checks freshness without stopping the API.

The workflow's daily **10:47 UTC** collection runs automatically only after the
workflow exists on the repository's default branch, currently `main`. A manual
run on a feature branch does not activate that GitHub schedule. Until that
rollout is verified, the host has daily backups and a manual off-server export;
automatic off-server disaster recovery remains an explicit activation gate.

## Consistency and interruption budget

The maintenance script serializes with deployments using the same server lock
and GitHub concurrency group. It checks the current healthy API image, exact
writable Local-volume attachment, absence of another container using that
volume, private database networking, resource headroom, and supported storage
configuration before interrupting service.

It gracefully stops only the Portal API, checks successful shutdown and the
absence of remaining database client sessions, then captures the database dump,
file checksums/sizes, and file archive. The API's HTTP routes and background
workers are unavailable during that interval; already loaded/static Portal and
Website pages remain available. This also briefly affects public Website API
requests. Operators should avoid starting uploads or downloads in this window.
No other maintenance writer may bypass the common deployment lock.

Capture has a 120-second budget after shutdown. An independent transient systemd
watchdog starts the exact original API container after 180 seconds if the caller
is interrupted. Normal and failure cleanup also restart that exact container;
health must return before the watchdog is cancelled. A changed container identity,
forced shutdown, extra database client, timeout, or API restart failure stops the
backup. A snapshot is never marked verified if the API resumed before capture
finished. The run records actual API unavailability in seconds. Database/file
restoration and encryption happen after service resumes.

The current bounded implementation accepts up to 4 GiB of logical managed file
bytes, 100,000 files, a 256 MiB live database, and a 512 MiB custom dump. The
existing isolated database checker uses a 512 MiB data tmpfs and a 1 GiB memory
limit; at least 1.5 GiB host memory must remain available. Disk checks reserve
space for snapshot, encrypted envelope and isolated file restoration. These
bounds fail closed and need a reviewed increase as data volume grows.

## What verification proves

Every backup restores its custom dump into the existing private, network-isolated
PostgreSQL checker. Schema, migration and selected table counts are checked
against that same dump. A private reference manifest is then derived from the
restored database, covering curated files, operational files, invoice PDFs, and
result artifacts. Keys and file metadata never appear in workflow logs.

A separate isolated helper has no live-file mount or network. It first restores
two synthetic files, one per area, with matching synthetic references. It then
restores the captured archive into its own disposable volume and compares every
file's size and SHA-256 checksum against the snapshot manifest and required
database references. Invoice references verify their recorded checksum; invoices
do not have a separate persisted PDF byte-count field. Missing live references,
changed bytes, extra archive entries, duplicate paths, traversal, symbolic/hard
links, devices, and unsupported archive size fail verification. Only an explicit
completed-deletion record permits an absent historical object. Unreferenced bytes
are preserved and counted for investigation, rather than silently discarded.

The synthetic proof remains distinguishable from the actual source-file count.
An empty actual source is not described as populated Customer-data recovery.
The helpers remove only their own labelled containers/anonymous volumes and
enumerated synthetic or staging files; no live volumes are removed.

The payload contains `database.dump`, `files.tar`, two private manifests,
`snapshot.env`, and their checksums. Encryption reuses the established
AES-256-CBC/PBKDF2 envelope with a new random passphrase and RSA-OAEP/SHA-256 key
wrapping. A symmetric decryption/checksum round trip is required before the
passphrase and plaintext are removed. The production recipient's private key is
not loaded during routine backups; keep that key separately protected and
available to recovery operators.

## Copies, retention and monitoring

Verified server snapshots live in root-only
`/var/backups/phaeno-portal-coordinated/snapshot-…` directories. The workflow
copies only encrypted payload/key files, a nonsensitive receipt, and checksums to
GitHub and verifies the copied checksums before upload. The GitHub artifact digest
and URL are recorded in the run summary; artifacts retain 35 days.

An export receipt is written on the server only after a successful artifact
upload and exact snapshot-manifest match. Rotation removes a server snapshot only
after 35 days, a verified export receipt, unchanged encrypted checksums, and an
exact validated set of five owned files. It never removes the newest snapshot or
an unexported snapshot. There is no broad directory or volume pruning. An export
failure therefore preserves the server copy and fails the workflow.

Check `phaeno-portal-backup.timer`, the exit status/journal of
`phaeno-portal-backup.service`, the most recent successful workflow artifact, and
the `status` operation. A backup older than 30 hours, low capacity, failed restore,
missing artifact, disabled timer, or failed API recovery requires operator
attention. A journal entry alone is not an off-server backup. The server-key and
protected environment policies remain unchanged.

## Recovery drill and restoration boundary

Download the encrypted artifact and retain its trusted workflow digest/checksum
evidence. Use a secured recovery machine with a 0700 parent directory and the
separately held 0600 recipient private key. The following helper creates a **new**
recovery directory, validates the envelope/member paths/checksums, and decrypts
without contacting any database or file store:

```sh
bash restore-backup-envelope.sh /private/export /private/recipient.key /private/recovery-new
```

It leaves the six verified recovery payload files for review, removes its temporary
passphrase/tar, and refuses an existing destination. Reuse the matching immutable
helper revision recorded in `snapshot.env`. On a Docker-enabled secured host, run
`verify-database-backup.sh` against `database.dump` and its recorded migration,
request a new private reference-manifest output, and compare it with the recovered
`references.tsv`. Verify `files.tar` using `backup/file-tree.sh verify` with the
recovered manifests and an empty isolated destination. Routine backups execute
that same restoration logic automatically.

An actual disaster-recovery cutover requires a separate reviewed maintenance
action: keep the API stopped, restore the matching database and file tree into
new private database/file volumes, validate references/bytes and the intended API
revision, then atomically select the recovered pair and verify authorized access.
Never restore files over a live store or mix snapshots. Retained file-release,
revocation, expiry, and deletion records remain authoritative after recovery;
restoring bytes does not authorize their download. This implementation performs
recovery verification and creates reviewable payloads, not a production cutover.

## Local evidence and activation status

The focused synthetic checks cover populated archive restoration, missing/extra
files and references, checksum/size mismatch, recorded deletion, orphan
preservation, archive traversal/links/duplicates, encrypted-recipient round trip,
ciphertext/key corruption, and unchanged cleanup/restart functions under failure
or interruption. The private-reference query passed read-only schema planning
against the configured local database. Syntax/YAML checks do not prove systemd,
Docker, live outage timing or scheduled artifact collection; record those in the
production activation evidence after the protected workflow runs.

Primary references: [PostgreSQL dump consistency and restoration](https://www.postgresql.org/docs/17/backup-dump.html),
[GitHub schedule/default-branch behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onschedule),
and [GitHub artifact retention and digest checks](https://docs.github.com/en/actions/tutorials/store-and-share-data).
Timer/watchdog semantics follow the primary systemd references for
[calendar expressions](https://github.com/systemd/systemd/blob/main/man/systemd.time.xml),
[timers and missed-run persistence](https://github.com/systemd/systemd/blob/main/man/systemd.timer.xml),
and [independent transient timer services](https://github.com/systemd/systemd/blob/main/man/systemd-run.xml).
