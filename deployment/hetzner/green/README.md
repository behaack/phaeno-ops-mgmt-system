# Hetzner Portal green deployment

This stack provisions the production Phaeno Portal API and its isolated
PostgreSQL database. The Portal API owns the public Website API functionality.
It does not change Nginx or expose the Portal database on the host.

## Isolation

- Unrelated OCIA API: `127.0.0.1:8083`
- Portal API: `127.0.0.1:8084`
- Portal PostgreSQL: Docker network only

The Portal API reads public Website documents and private Website credentials
from `/opt/phaeno.portal-green/documents`. Its Lucene index and Portal-owned
application files use separate Portal volumes.

## Runtime files

Create these server-only files under `/opt/phaeno.portal-green/runtime` with
directory mode `700` and file mode `600`:

- `compose.env`: versioned image tag and source revision
- `database.env`: PostgreSQL database, role, and random password
- `portal.env`: the Portal connection string and transferred Website runtime
  configuration

These files are ignored and must never be committed or printed.

## Deployment sequence

Run from `/opt/phaeno.portal-green`:

```bash
docker compose \
  --env-file runtime/compose.env \
  --file deployment/hetzner/green/docker-compose.yml \
  build api

docker compose \
  --env-file runtime/compose.env \
  --file deployment/hetzner/green/docker-compose.yml \
  up --detach db

docker compose \
  --env-file runtime/compose.env \
  --file deployment/hetzner/green/docker-compose.yml \
  run --rm migrate

docker compose \
  --env-file runtime/compose.env \
  --file deployment/hetzner/green/docker-compose.yml \
  up --detach api
```

The migration command is explicit and exits after applying pending EF
migrations. API startup never applies migrations.

## Green verification

```bash
curl \
  --fail \
  --header 'X-Forwarded-Proto: https' \
  http://127.0.0.1:8084/api/health
```

Before any import, verify that migration `20260717215539_AddWebsiteApi` exists
in `public.__ef_migrations_history` and that `website.web_contacts` and
`website.web_orders` are empty.

Do not add an Nginx route until database import, runtime configuration, public
documents, search, reCAPTCHA rejection, and notification behavior pass the
green acceptance gate.

## GitHub Actions deployment

`.github/workflows/deploy.yml` provides the manual **Deploy Portal Green**
workflow. It deploys the selected commit to a versioned directory under
`/opt/phaeno.portal-green/releases`, builds a revision-labelled image, and
recreates only the Portal API on `127.0.0.1:8084`.

The workflow deliberately does not change Nginx or public DNS. It verifies the
internal Portal health, database ping, search, technical brief, invalid
reCAPTCHA rejection, unchanged Website row counts, deployed image
tag/revision, and the continuing public Website dial tone. A failed
non-migration deployment automatically restores the prior Portal API image.

Configure a protected GitHub environment named `production` with:

- `DEPLOY_HOST`: Hetzner SSH host;
- `DEPLOY_USER`: SSH user with Docker and `/opt/phaeno.portal-green` access;
- `DEPLOY_SSH_KEY`: private deployment key;
- `DEPLOY_KNOWN_HOSTS`: pinned OpenSSH `known_hosts` entry for the server; and
- `PORTAL_MIGRATION_BACKUP_PUBLIC_KEY`: PEM public key used only when an
  authorized migration is requested.

The workflow input `apply_migrations` defaults to `false`. Selecting `true` is
the explicit shared-database approval gate. Before running the migration
container, the server creates a root-only custom-format PostgreSQL dump,
validates its catalog, encrypts it with a random passphrase, wraps that
passphrase to `PORTAL_MIGRATION_BACKUP_PUBLIC_KEY`, verifies encrypted
checksums, and removes the plaintext dump and passphrase.

Runtime secrets remain only in `/opt/phaeno.portal-green/runtime`; they are
never archived or printed. The successful release is exposed through
`/opt/phaeno.portal-green/current`, and the root-only deployment manifest
records its commit, image tag, release path, migration choice, and Website row
counts.

This is the post-cutover production deployment path. The standalone Website
API, bridge, File Browser, and legacy database resources were retired on
2026-07-18 after the final encrypted backup and Portal verification passed.
