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
legacy application files use separate Portal volumes. New production managed
file storage is currently disabled: the API starts, but file operations return
HTTP 503 and no bytes are written. Amazon S3 remains the production target.
Keep the legacy `portal_green_app_data` volume until existing curated-data and
order-file rows and bytes have been inventoried and, if necessary, migrated to
S3.

## Runtime files

Create these server-only files under `/opt/phaeno.portal-green/runtime` with
directory mode `700` and file mode `600`:

- `compose.env`: versioned image tag and source revision
- `database.env`: PostgreSQL database, role, and random password
- `portal.env`: the Portal connection string, transferred Website runtime
  configuration, and the explicit disabled file-storage provider setting

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
non-migration deployment prints the failed API's status and recent startup logs,
then automatically restores the prior Portal API image.

Configure a protected GitHub environment named `production` with:

- `PORTAL_BOOTSTRAP_ORGANIZATION_NAME`: non-secret name of the initial Phaeno
  organization;
- `PORTAL_BOOTSTRAP_ADMIN_EMAIL`: non-secret email of the existing Clerk user
  authorized as the initial Portal administrator;
- `PORTAL_BOOTSTRAP_ADMIN_FIRST_NAME` and
  `PORTAL_BOOTSTRAP_ADMIN_LAST_NAME`: non-secret profile values for that
  administrator;
- `PORTAL_CLERK_AUTHORITY`: non-secret Clerk JWT issuer matching the Portal
  frontend publishable key, such as `https://example.clerk.accounts.dev`;
- `DEPLOY_HOST`: Hetzner SSH host;
- `DEPLOY_USER`: SSH user with Docker and `/opt/phaeno.portal-green` access;
- `DEPLOY_SSH_KEY`: private deployment key;
- `DEPLOY_KNOWN_HOSTS`: pinned OpenSSH `known_hosts` entry for the server; and
- `PORTAL_CLERK_SECRET_KEY`: Clerk backend secret for the same instance used by
  the Portal frontend; and
- `PORTAL_MIGRATION_BACKUP_PUBLIC_KEY`: PEM public key used only when an
  authorized migration is requested.

Private Website Preview search remains disabled unless the protected
environment also defines:

- `WEBSITE_PREVIEW_SEARCH_URL`: non-secret stable Vercel branch URL;
- `WEBSITE_PREVIEW_SEARCH_VERCEL_BYPASS_SECRET`: Vercel Protection Bypass for
  Automation secret; and
- `WEBSITE_PREVIEW_SEARCH_PROXY_API_KEY`: random shared proxy credential with
  at least 32 characters.

When those values are present, the workflow installs them without printing
their contents and enables the separately mounted
`portal_green_website_preview_index` volume. The corresponding Vercel Preview
Function must receive the proxy key as `WEBSITE_PREVIEW_SEARCH_API_KEY`; never
place either secret in a `PUBLIC_` variable.

On every deployment, the workflow validates the bootstrap configuration and
Clerk authority and secret, plus the Preview-search settings when a Preview URL
is configured. On the server it reuses the existing protected
`EmailServiceSettings` Mailgun URL, `messages` resource, API key, and verified
sender. The Mailgun installer retrieves the account webhook-signing key,
configures delivered and permanent-failure events for only the Portal
invitation webhook URL, and atomically installs that key and the fixed
production invitation URL without printing credentials. Other configured
values are streamed over the pinned SSH connection without placing them in the
release archive and update only their corresponding entries in the
root-protected `runtime/portal.env`. The workflow also installs
`FileStorage__Provider=Disabled` and removes stale S3/AWS entries. The API
recreation then loads the updated values. The workflow never prints secret
values. The server-side release script accepts the explicit disabled stub or a
complete S3 configuration; it continues to reject local production storage.

S3 activation is a TODO in `docs/plans/FILE-MANAGEMENT-PLAN.md`. It includes
obtaining protected least-privilege AWS keys or an approved workload identity.
Before the first S3-backed deployment, inventory the existing managed-file
database records and the retained `portal_green_app_data` volume. Copy any
referenced legacy objects to
`{PORTAL_S3_KEY_PREFIX}/{provisioning-files|order-files}/{storageKey}` and verify
representative authorized downloads before considering the local volume
retired. Do not remove the volume as part of an ordinary application release.

The bootstrap seeder uses the exact administrator email to find an existing
Clerk user. It idempotently creates or activates the local Phaeno organization,
Portal user, and administrator membership, then links that Clerk subject. It
does not create a new Clerk user unless an administrator password is separately
configured on the server.

The workflow input `apply_migrations` defaults to `false`. Selecting `true` is
the explicit shared-database approval gate. Before running the migration
container, the server creates a root-only custom-format PostgreSQL dump,
validates its catalog, encrypts it with a random passphrase, wraps that
passphrase to `PORTAL_MIGRATION_BACKUP_PUBLIC_KEY`, verifies encrypted
checksums, and removes the plaintext dump and passphrase.

## Retired Web Operations record cleanup

`.github/workflows/purge-retired-web-operations.yml` provides the manual
**Purge Retired Web Operations Records** maintenance operation. It is limited
to:

- `website.web_contacts` with `unsubscribed_at_utc` set; and
- `website.web_orders` with `completed_at_utc` set.

These are public Website intake records, not Portal user accounts or
operational orders. The workflow defaults to `preview`, which reports aggregate
candidate counts without changing data. `delete` mode additionally requires
the exact confirmation phrase `DELETE RETIRED WEB OPERATIONS DATA` in the
protected `production` environment.

Before deletion, the workflow creates and catalog-validates a full custom-format
database dump, encrypts it, wraps its random passphrase to
`PORTAL_MIGRATION_BACKUP_PUBLIC_KEY`, verifies the encrypted checksums, and
removes the plaintext material. The server retains the encrypted recovery
artifacts and a count-only purge manifest under
`/var/backups/phaeno-portal-maintenance`. The action deletes only records
eligible at its recorded UTC cutoff, rechecks candidate counts under the shared
deployment lock, performs both deletes in one transaction, verifies that no
cutoff-eligible records remain, and checks the public database-ping endpoint.
New lifecycle transitions after the cutoff remain for a later explicitly
authorized cleanup.

Runtime secrets remain outside release archives and source control. The Clerk
secret is held in the protected GitHub `production` environment and in
`/opt/phaeno.portal-green/runtime/portal.env`; other runtime secrets remain
server-only. None are printed. The successful release is exposed through
`/opt/phaeno.portal-green/current`, and the root-only deployment manifest
records its commit, image tag, release path, migration choice, and Website row
counts.

This is the post-cutover production deployment path. The standalone Website
API, bridge, File Browser, and legacy database resources were retired on
2026-07-18 after the final encrypted backup and Portal verification passed.
