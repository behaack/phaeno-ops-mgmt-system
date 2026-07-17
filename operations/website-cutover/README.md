# Website data cutover tooling

This package snapshots the two legacy Website intake tables and the Website
documents volume, imports the database snapshot into the Portal-owned
`website` schema, and verifies every copied business column and document file.
It does not apply EF migrations, change Nginx, stop either API, or delete
source data.

The source remains:

- `public."WebContacts"`
- `public."WebOrders"`

The destination is:

- `website.web_contacts`
- `website.web_orders`

The import preserves identifiers and contact creation timestamps. It is
idempotent by primary key and updates a destination row only when a source
business value differs. Destination-only rows are retained; this is required
after the bridge API begins accepting new submissions directly into the Portal
database.

## Safety boundary

`snapshot` performs source reads and creates local backup artifacts.

`verify` creates temporary destination tables inside a rolled-back transaction.
It does not persist destination changes.

`import` writes to the Portal database and requires
`ALLOW_PORTAL_WEBSITE_IMPORT=YES`. Run it only after:

1. the target database and restore point have been recorded;
2. the Portal migrations, including `AddWebsiteApi`, have been applied with
   explicit shared-database approval; and
3. the snapshot artifacts and generated checksums are stored securely.

The snapshot contains personal and inquiry data. The documents archive may
also contain private runtime material. Store it outside the repository with
owner-only permissions, encrypt it at rest, restrict access, and retain or
destroy it under the approved migration policy. The tool sets restrictive
filesystem permissions but does not encrypt the artifacts itself; use an
encrypted backup filesystem or approved encrypted transfer/storage.

## Credential setup

Use a libpq service file supplied by the runtime secret store. Connection
strings and passwords must not be passed as command-line arguments or committed
to this repository.

Example structure:

```ini
[website-source]
host=source-host
port=5432
dbname=source-database
user=source-role
password=source-password
sslmode=require

[portal-destination]
host=destination-host
port=5432
dbname=destination-database
user=destination-role
password=destination-password
sslmode=require
```

Protect the file before use:

```bash
chmod 600 /run/secrets/phaeno-pg-service.conf
```

The source role needs `SELECT` access to the two legacy tables. The destination
role needs `SELECT`, `INSERT`, and `UPDATE` access to the two Portal tables.

## Required client tools

Use PostgreSQL 17 client tools:

- `psql`
- `pg_dump`
- `pg_restore`
- `sha256sum`
- Bash

The existing `postgres:17` image can provide these tools without installing
packages on the host. Mount this repository read-only, the service file
read-only, and a protected backup directory read-write.

## Create the snapshot

Choose a new, empty directory outside the repository:

```bash
export PGSERVICEFILE=/run/secrets/phaeno-pg-service.conf
export WEBSITE_SOURCE_PGSERVICE=website-source
export PORTAL_DESTINATION_PGSERVICE=portal-destination
export SNAPSHOT_DIR=/var/backups/phaeno-website/2026-07-17T220000Z
export WEBSITE_DOCUMENTS_DIR=/opt/phaeno.website-api/documents

bash ./operations/website-cutover/website-data-cutover.sh snapshot
```

The snapshot command:

- fails on missing source tables or duplicate normalized contact emails;
- creates a custom-format PostgreSQL backup of both source tables;
- exports reviewable CSV copies;
- generates a destination-ready staging script using safely quoted SQL
  literals;
- records deterministic source counts and hashes;
- creates a tar archive plus a per-file SHA-256 manifest for the documents
  volume; and
- writes `SHA256SUMS` for every migration artifact.

The production counts observed before this tooling was added were 13 contacts
and 2 orders. Those values are a historical baseline, not hard-coded
expectations: the snapshot records the authoritative counts at execution time.

## Import into Portal

After the Portal migration has been applied:

```bash
export ALLOW_PORTAL_WEBSITE_IMPORT=YES
bash ./operations/website-cutover/website-data-cutover.sh import
unset ALLOW_PORTAL_WEBSITE_IMPORT
```

The command verifies `SHA256SUMS`, checks for both destination tables, performs
the upserts in one transaction, and fails before commit if any snapshot row
differs from its destination row. It prints snapshot and destination-subset
hashes plus the number of destination-only rows.

## Verify without changing data

The same snapshot can be checked again:

```bash
bash ./operations/website-cutover/website-data-cutover.sh verify
```

This loads the snapshot into temporary tables, compares every business column,
prints deterministic hashes, and rolls the transaction back.

## Verify the Portal documents volume

Mount or restore the protected documents archive at the Portal documents path,
then verify every source file:

```bash
(cd "${SNAPSHOT_DIR}" && sha256sum --check --strict SHA256SUMS)
tar --extract \
  --file="${SNAPSHOT_DIR}/website-documents.tar" \
  --directory=/path/to/portal/documents
export PORTAL_DOCUMENTS_DIR=/path/to/portal/documents
bash ./operations/website-cutover/website-data-cutover.sh verify-documents
```

The check allows destination-only files but fails if a source file is missing
or its SHA-256 digest differs. Restore only into the prepared Portal volume;
never extract the archive over the legacy source volume.

## Initial and final copy sequence

1. Run `snapshot`, `import`, and `verify` while the legacy API remains live.
2. Start and validate the bridge API against the Portal database.
3. Switch Nginx from legacy to bridge so new writes go only to Portal.
4. Create a new source snapshot.
5. Run `import`, `verify`, and `verify-documents` again. Destination-only
   bridge submissions remain intact and are reported separately.
6. Record the final artifacts and results before switching from bridge to the
   Portal API.

Do not retire the source database from this package. Retirement remains a
separate approval after the observation window, final backup, and
reconciliation.
