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
legacy application files use separate Portal volumes. Managed file storage may
explicitly use Local on its own persistent volume, remain Disabled, or later select
S3. The previously recorded production selection was Disabled; source changes
alone do not activate runtime storage or scanning.
Keep the legacy `portal_green_app_data` volume until existing curated-data and
order-file rows and bytes have been inventoried and, if necessary, explicitly
migrated to the chosen provider.

## Runtime files

### Local storage activation and recovery

Before selecting Local, inventory file metadata and referenced bytes in any existing
provider or legacy volume. The installer refuses to repoint a recorded different
local root or an active S3 provider. Any byte migration must be deliberate, preserve
area/key identity, verify checksums and retain the prior store until acceptance.
The new Local setting uses these protected `portal.env` values:

```text
FileStorage__Provider=Local
FileStorage__LocalRootPath=/var/lib/phaeno-portal/files
FileStorage__LocalPersistentVolumeConfirmed=true
```

The deployment's explicit Local choice installs those values; later runs should use
Preserve. `portal_green_managed_files` is a dedicated Docker named volume mounted
into the API and migration service. It is separate from `/app`, Website documents,
public roots, source checkouts and the retained legacy app-data volume. Keep volume
access limited to the API and trusted administrators. Do not mount it through a
static file server or remove it during releases. Include its bytes in encrypted
backups together with a coordinated database snapshot; verify restoration of both
metadata and files before claiming disaster recovery. A database dump alone is not
a file backup. Multi-host deployment requires shared storage or the later S3 provider.

### Scanner setup

File storage and malware scanning are separate. The code supports ClamAV's
[INSTREAM protocol](https://docs.clamav.net/manual/Usage/ClamdProtocol.html) over a
private TCP connection. The optional `scanner` Compose profile runs the official
`clamav/clamav:1.4_base` image from the supported
[1.4 LTS line](https://docs.clamav.net/faq/faq-eol.html), with a persistent
`portal_green_scanner_signatures` volume. The API and scanner share only the dedicated
internal `portal_scanning` network. The scanner alone also joins `scanner_updates`
for outbound signature downloads; it publishes no host port. Keep these network
boundaries intact because [the scanner socket is unauthenticated](https://docs.clamav.net/manual/Usage/Scanning.html).
The scanner never mounts managed file bytes: POMS streams them over the private connection.

Use `file_scanning_provider=ClamAv` with the existing Deploy Portal Green workflow
for explicit first activation; use `file_storage_provider=Local` when the reviewed
empty-store inventory permits first Local activation. Both inputs default to Preserve.
The preflight runs before any runtime-setting installer and emits only capacity,
current-provider classification, process UID and scoped metadata/file counts. Initial
Local activation refuses nonempty metadata references or managed/legacy byte areas,
including a target volume not mounted in the old API. No reference or byte migration
is inferred. First scanner activation requires at least 5 GiB available host memory
(4 GiB scanner budget plus 1 GiB reserve) and 3 GiB free Docker disk space. An existing
scanner requires the 1 GiB reserve. Confirm outbound DNS and HTTPS access to Docker Hub
and the ClamAV signature service; respect provider download limits.

The official image's FreshClam daemon checks signatures 12 times daily, not just when
the image is deployed. The selected LTS feature tag is pulled on managed-scanner
releases to pick up patch/security updates. See the
[official container guidance](https://docs.clamav.net/manual/Installing/Docker.html)
for persistent databases, update frequency and memory requirements. Loaded-signature
health checks require PONG, a running FreshClam process and a database version no older
than three days. The scanner supervisor restarts the container after three failed
checks following readiness; startup refuses expired databases and waits up to 20
minutes for initial downloads. A missed update or unavailable scanner must be resolved
through its health/logs and network access; never record a clean verdict manually.

Configure the approved private endpoint and limits in protected runtime settings:
`FileScanning__Provider=ClamAv`, `FileScanning__Host`, `FileScanning__Port` (normally
3310), `FileScanning__TimeoutSeconds` (default 120), and
`FileScanning__MaximumStreamBytes` (default 104857600). Verify the daemon's
`StreamMaxLength`, `MaxFileSize`, `MaxScanSize`, archive recursion/file limits and
timeouts against the approved uploads. Enable `AlertExceedsMax yes` and
`AlertEncrypted yes` so skipped/over-limit/encrypted content cannot masquerade as
clean; keep scanning for the approved content formats enabled. These switches are
documented in the [official daemon configuration](https://github.com/Cisco-Talos/clamav/blob/main/etc/clamd.conf.sample).
Only then set `FileScanning__ClamAvLimitsConfirmed=true`. Startup rejects an
unconfirmed ClamAV configuration. The managed installer sets Host=`scanner`, Port=3310,
TimeoutSeconds=120, MaximumStreamBytes=104857600 and ClamAvLimitsConfirmed=true against
the reviewed `scanner/clamd.conf`: 100 MiB stream/file limit, 400 MiB expanded scan,
90-second scan limit, recursion 16, 10,000 contained files and encrypted/limit alerts.
Two scan threads and non-concurrent database reloads bound resource use; reloads can
temporarily make scanning unavailable. Set the approved `DataProvisioning__AllowedFileKinds`
and `OrderManagement__AllowedFileKinds` separately; no scientific formats are guessed.

Verify representative clean, harmless antivirus-test, encrypted, oversize, nested
archive, interrupted, timeout and unavailable-daemon cases through authenticated
uploads before activation. An unavailable or incomplete scan blocks the existing
clean-file gates and shows a retry/support message; it never records Clean. Disabled
scanning is the production default. DevelopmentFixture is restricted to Development.
Retention enforcement/notices/deletion retain their independent activation gates.

Before API replacement or migrations, deployment waits for scanner health and runs
`scanner/smoke.sh` inside that container. It requires a clean text verdict, rejection
of the harmless EICAR antivirus test, rejection of a valid encrypted ZIP containing
only synthetic text, and the exact daemon stream-limit error for an INSTREAM header
declaring a chunk one byte larger than 100 MiB. This direct protocol check avoids
`clamdscan` silently truncating its own outgoing stream at the configured limit.
Only sanitized pass markers are emitted; all fixtures are removed from container
temporary storage. It then runs the new API image with `--verify-file-services` when
storage is Local/S3 and scanning is ClamAv, exercising the injected adapters and both
real storage areas without HTTP, background workers or database access. The operator
verification uses and removes only its own synthetic files. Container checks do not
replace signed-in workflow, approved-format or real scientific acceptance.

Scanner configuration has its own protected rollback receipt. Failed non-migration
releases restore prior scanner settings along with storage settings before API-image
rollback; successful releases clear both receipts. Settings changed concurrently are
not overwritten. After migrations, recovery remains an explicit forward fix. Disabled
scanning prevents new clean verdicts but does not delete signatures, managed bytes or
historical scan records; stopping the optional service is an explicit operator action.

The image prepares the managed mount point with mode 0700 under its existing user;
no process UID change is included. Startup sets the configured Unix root to owner-
only access and verifies create/write/delete with a temporary probe. Inspect the
deployed image/container UID and named-volume ownership before activating Local,
especially if a custom image or existing volume changes the owner. Never make the
volume world-writable to work around a mismatch. The first activation is covered by
a protected storage-settings-only rollback receipt: a failed non-migration release
restores the previous provider/root before reverting the API image. A successful
release clears that receipt. Concurrently changed settings are not overwritten;
after a migration, recovery remains the release's explicit forward-fix decision.
No rollback deletes or moves the managed or legacy volume.

Create these server-only files under `/opt/phaeno.portal-green/runtime` with
directory mode `700` and file mode `600`:

- `compose.env`: versioned image tag and source revision
- `database.env`: PostgreSQL database, role, and random password
- `portal.env`: the Portal connection string, transferred Website runtime
  configuration, and the selected file-storage provider and scanner settings

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

The protected production environment must use a Clerk Production issuer and
`sk_live_` secret. The workflow rejects Clerk Development credentials.

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
  frontend publishable key. Production uses the verified custom issuer
  `https://clerk.phaenobiotech.com` and rejects Clerk Development issuers;
- `DEPLOY_HOST`: Hetzner SSH host;
- `DEPLOY_USER`: SSH user with Docker and `/opt/phaeno.portal-green` access;
- `DEPLOY_SSH_KEY`: private deployment key;
- `DEPLOY_KNOWN_HOSTS`: pinned OpenSSH `known_hosts` entry for the server; and
- `PORTAL_CLERK_SECRET_KEY`: Clerk backend secret for the same instance used by
  the Portal frontend;
- `PORTAL_MAILGUN_WEBHOOK_SIGNING_KEY`: the Mailgun account HTTP webhook
  signing key used only to verify delivery and permanent-failure events; and
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

Before deployment, configure the Mailgun domain's `delivered` and
`permanent_fail` webhooks to
`https://api.phaenobiotech.com/api/integrations/mailgun/invitations` and verify
the exact URL in the Mailgun dashboard. Domain sending keys are intentionally
retained for message delivery and cannot administer webhooks or retrieve the
account signing key.

On every deployment, the workflow validates the bootstrap configuration,
Clerk authority and secret, and protected Mailgun webhook-signing key, plus the
Preview-search settings when a Preview URL is configured. On the server it
reuses the existing protected `EmailServiceSettings` Mailgun URL, `messages`
resource, domain sending key, and verified sender. The Mailgun installer
atomically installs the signing key and fixed production invitation URL without
printing credentials. Other configured
values are streamed over the pinned SSH connection without placing them in the
release archive and update only their corresponding entries in the
root-protected `runtime/portal.env`. The workflow's `file_storage_provider` choice
defaults to Preserve: ordinary releases leave provider/configuration untouched.
Explicit Local or Disabled selections update only the relevant storage settings,
without deleting S3 credentials or moving bytes. The API recreation then loads
the selected values. The workflow never prints secret values. The server-side
release script validates Disabled, persistent Local, or complete S3 configuration.

S3 activation is a TODO in `docs/plans/FILE-MANAGEMENT-PLAN.md`. It includes
obtaining protected least-privilege AWS keys or an approved workload identity.
Before the first S3-backed deployment, inventory the existing managed-file
database records, the selected Local store and the retained `portal_green_app_data`
volume. Copy any referenced objects to
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
restores it into an isolated ephemeral PostgreSQL container, verifies its schemas,
latest migration and selected table counts against that dump, then encrypts it
with a random passphrase and wraps that
passphrase to `PORTAL_MIGRATION_BACKUP_PUBLIC_KEY`, verifies encrypted
checksums, and removes the plaintext dump and passphrase.

The restore check uses no network or published ports, a read-only dump, 512 MiB
of temporary database memory storage and a 1 GiB container memory limit. It
requires 1.5 GiB available host memory and removes only its uniquely owned
container. A failed restore or cleanup stops deployment before migration. This
proves database recovery from that snapshot. Coordinated database/Local-file
snapshots, isolated populated-file restoration, daily host scheduling, encrypted
off-server collection and guarded 35-day exported-backup rotation have a separate
[backup runbook](BACKUP-RUNBOOK.md). Their new protected workflow must be activated
and its actual outage/restore/schedule/artifact evidence recorded before those
operational gates are marked complete. Ordinary release backups remain unchanged.

The first Clerk Production transition has a separate one-time gate:
`cutover_clerk_identity=true` plus the exact
`previous_clerk_subject_id`. After the new image is built and any authorized
migrations finish, but before the running API is replaced, the release runs the
guarded identity command against the production database and Clerk Production.
It refuses the operation unless exactly one Portal user is linked, that user is
the configured bootstrap administrator, the existing subject matches the input,
and the replacement Clerk user has the same verified primary email. The command
is idempotent and writes `ClerkProductionIdentityCutover` to the audit log. Leave
the gate off for every ordinary deployment.

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
