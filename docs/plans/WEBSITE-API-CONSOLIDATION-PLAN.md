# Website API consolidation plan

## Status

The code consolidation is implemented in `phaeno-portal`. The isolated Portal
green API/database is provisioned on the existing Hetzner host and the Portal
migration chain has been applied there. Phase 3 is complete: the Portal API is
the public Website API upstream, new Website writes persist through the shared
Portal context and database, browser acceptance passed, and notification
delivery was confirmed. The temporary bridge remains available during the
observation window. Retiring the bridge and standalone `phaeno-website`
API/database remains explicit Phase 4 deployment work.

Repeatable cutover tooling is implemented under
`operations/website-cutover`. It creates a protected source snapshot and
custom-format backup, generates an idempotent primary-key import, preserves
source identifiers and contact timestamps, and verifies every copied business
column with deterministic hashes. It also archives the Website documents volume
and records per-file SHA-256 digests. It retains destination-only rows so
bridge submissions cannot be lost during the final legacy delta.

On 2026-07-17, the production `snapshot` operation completed without changing
the source database or live routing. It recorded 13 Website contacts, 2 Website
orders, zero duplicate normalized-email groups, and 97 files totaling
8,318,449 bytes in the documents volume. All inner artifact checksums passed.
The snapshot was encrypted, its random archive key was wrapped to a dedicated
off-server recovery key, both encrypted files were independently downloaded
and verified through archive decryption, and a root-only encrypted copy was
retained on Hetzner. The temporary plaintext snapshot, temporary database
credential file, and one-use server tools were removed. Portal migrations,
destination import, bridge deployment, and traffic changes remained
unexecuted at snapshot time.

Later on 2026-07-17, a new Docker-network-only PostgreSQL 17 database was
created for the Portal green slot. All seven Portal migrations were applied,
ending at `20260717215539_AddWebsiteApi`. The destination has the expected
`commercial_ops`, `lab_ops`, and `website` schemas.

The verified snapshot was then imported into the green `website` schema in one
transaction. The destination contains 13 contacts and 2 orders, has zero
duplicate normalized-email groups, and matches both recorded source hashes
exactly. An independent verification repeated the comparisons inside a
rolled-back transaction. The source database was not changed by the initial
import. A final source snapshot was subsequently captured after public traffic
moved to the bridge; it contained the same rows and fingerprints and was
imported idempotently.

The current `phaeno-website` deployment workflow is suitable for an ordinary
API redeploy, but not for this cutover without modification: it extracts over
the live application directory and recreates the single API container before
running public smoke checks. It has no green slot, database reconciliation
gate, or automated rollback. `phaeno-portal` now has a green-only
Docker/Compose definition under `deployment/hetzner/green`, an explicit
one-shot migration mode, and trusted forwarded-header handling. The first
green deployment is running at `127.0.0.1:8084`; its PostgreSQL service has no
host-published port. Public routing now points to Portal at
`127.0.0.1:8084`; the bridge remains available as the immediate rollback
upstream at `127.0.0.1:8085`, and the standalone API remains available at
`127.0.0.1:8081` for the observation window.

The temporary Website bridge is running at `127.0.0.1:8085`, connected to the
Portal Docker network and database, with the shared Website documents mounted
read-only and a separate search-index volume. Its explicit bridge model maps
the legacy entities to the Portal `website` schema without running the
standalone migration history. Nginx currently routes both
`api.phaenobiotech.com` and the compatibility hostname
`webops.phaenobiotech.com` to Portal. The canonical hostname has an explicit
Vercel DNS A record, a valid TLS certificate, and a dedicated Nginx server
block. The prior hostname remains a temporary compatibility alias during the
observation window.
The bridge has zero established connections and remains loopback-only for
rollback.

The manual `.github/workflows/deploy.yml` workflow now provides the controlled
Portal green deployment path. It builds and uploads a versioned release,
preserves server-only runtime files, leaves Nginx and public routing unchanged,
smokes the isolated API, and automatically restores the prior image after a
failed non-migration deployment. Shared-database migrations remain off by
default and require an explicit workflow input plus an encrypted pre-migration
backup.

## Product boundary

Anonymous visitors to the Phaeno marketing website must retain:

- public website search;
- contact and technical-brief requests;
- non-binding order inquiries;
- reCAPTCHA verification;
- internal Mailgun notifications and technical-brief delivery;
- public document hosting; and
- the lightweight database ping used for smoke checks.

The public website remains a separate Astro application. Its API behavior moves
into Phaeno Portal so the organization does not operate a second .NET API or a
second EF Core context.

## Implemented contract

The existing paths and request shapes remain stable:

- `GET /api/v1/web-ops/database-ping`
- `GET /api/v1/web-ops/search-pages?search=...`
- `POST /api/v1/web-ops/contact`
- `POST /api/v1/web-ops/order`
- `GET /public/...`

Search responses continue to use the standard API envelope. Successful
database-ping, contact, and order requests return `204 No Content`.

The implementation keeps the existing Astro metadata and sitemap contract,
Google reCAPTCHA Enterprise verification, Mailgun template names, technical
brief URL, Lucene index, crawler behavior, and scheduled index rebuild. Known
marketing origins are explicitly allowed by CORS; loopback origins are also
allowed in Development.

## Persistence ownership

- `PSeqOperationsDbContext` is the only runtime EF Core context.
- `WebContact` maps to `website.web_contacts`.
- `WebOrder` maps to `website.web_orders`.
- Website columns follow the portal's snake-case database convention.
- `website.web_contacts.normalized_email` is unique so concurrent duplicate
  submissions cannot create multiple mailing-list contacts.
- EF migration history remains `public.__ef_migrations_history`.
- Migration `AddWebsiteApi` creates the schema, tables, and unique index.

The Website records are public-intake records, not Portal users,
organizations, memberships, orders, or HubSpot contacts. Any later promotion
into CRM or Portal onboarding must be an explicit workflow.

## Internal Web Operations dashboard

The POMS home includes a read-only **Web Operations** panel for Phaeno platform
administrators. It shows the total mailing-list and demo-request intake counts,
the five newest mailing-list contacts, and up to five demo requests ordered by
organization. The UI labels the persisted `WebOrder` public inquiries as
**Demo Requests** without changing the public Website contract or persistence
model.

The additive internal endpoint is `GET /api/web-ops/dashboard`. It requires an
authenticated active Phaeno platform administrator and returns only the bounded
summary needed by the dashboard. The existing anonymous
`/api/v1/web-ops/...` routes remain unchanged. This surface does not promote
Website intake into an Account, Portal request, HubSpot contact, or operational
order.

## Runtime configuration

The portal now owns these existing Website API configuration sections:

- `WebsiteApi`
- `GoogleAuthSettings`
- `EmailServiceSettings`
- `WebCrawlerSettings`
- `WebSearchSettings`
- `ChronJobs:IndexWebsite`

Production must provide the reCAPTCHA service-account credential, Mailgun API
key/from address, the public-document volume, and a durable writable Lucene
index path. Secrets must come from the deployment platform rather than
source-controlled settings.

## Current Website deployment boundary

The checked-in Website deployment material currently describes:

- the public Website UI deployed separately on Vercel;
- `api.phaenobiotech.com` as the canonical Website API hostname;
- `webops.phaenobiotech.com` retained temporarily as a compatibility alias;
- the standalone API bound to `127.0.0.1:8081`;
- File Browser bound to `127.0.0.1:8082`;
- `/opt/phaeno.website-api/documents` mounted at `/app/__DOCUMENTS`;
- GitHub Actions archiving `api/`, uploading it to
  `/opt/phaeno.website-api`, and running
  `docker compose up -d --build api`; and
- public root, search, and database-ping smoke checks after the live container
  has already been replaced.

The Website repository's checked-in connection default and deployment prose do
not represent the actual production database identified by the owner. Treat
their provider and host statements as stale until the deployed runtime
configuration is inspected through an approved, credential-safe process.

The public hostname remained stable during the implementation and database
consolidation. After Phase 3 acceptance, DNS and TLS for
`api.phaenobiotech.com` were brought up before the canonical origin changed,
and the prior hostname was preserved as an alias. Repository configuration,
the technical-brief URL, deployment smoke checks, and the scheduled database
probe now use the canonical hostname. The Vercel `PUBLIC_API_BASE_URL` setting
also uses the canonical hostname for all environments. The live Website build
continues to use the compatibility alias until its next successful production
deployment.

## No-disruption data and traffic cutover

Use three concurrently runnable API slots during the transition:

| Slot | Purpose | Database |
| --- | --- | --- |
| legacy | Current standalone Website API on `127.0.0.1:8081` | Legacy Website PostgreSQL database |
| bridge | Temporary standalone Website API with its EF mappings pointed at `website.web_contacts` and `website.web_orders` | Portal PostgreSQL database |
| portal | New Phaeno Portal API | Portal PostgreSQL database through `PSeqOperationsDbContext` |

The bridge is deliberate. It keeps the proven Website runtime contract while
moving writes to the destination before the application implementation changes.
It also gives the Nginx rollback upstream the same database as Portal, so
rolling API traffic back cannot hide or strand submissions accepted after the
database cutover.

### Phase 0: establish deployment truth

1. Record the authoritative runtime source and destination PostgreSQL hosts,
   database names, application roles, and TLS requirements from the deployed
   environments. Do not infer them from old documentation or checked-in
   development defaults.
2. Record source and destination backups plus a tested restore procedure,
   expected copy duration, migration owner, Nginx owner, and rollback-window
   owner.
3. Add a production Portal container definition and a deployment workflow that
   can deploy a versioned green slot without replacing the active upstream.
4. Add trusted forwarded-header handling before `UseHttpsRedirection()` in
   Portal because host Nginx terminates HTTPS.
5. Preserve the current `/opt/phaeno.website-api/documents` volume. Mount it at
   `/app/__DOCUMENTS` for bridge and Portal so the public technical brief,
   private reCAPTCHA credential, and durable Lucene index survive container
   changes.
6. Allocate loopback-only ports for bridge and Portal without changing
   File Browser on `127.0.0.1:8082`. The exact ports are an operational input;
   examples are `8083` and `8084`.

The prepared Hetzner green stack uses `127.0.0.1:8084` for Portal, keeps its
PostgreSQL service Docker-network-only, mounts Website documents read-only, and
uses separate volumes for the green Lucene index and Portal-owned files.

### Phase 1: prepare and backfill the Portal database

1. Inspect legacy `"WebContacts"` for duplicate normalized emails. Resolve any
   duplicates before loading the unique destination index.
2. With explicit shared-database approval, apply the Portal migrations,
   including `AddWebsiteApi`, to the destination database.
3. Copy legacy `"WebContacts"` into `website.web_contacts`, preserving `Id`
   and `CreatedAtUtc`; map legacy names and casing explicitly.
4. Copy legacy `"WebOrders"` into `website.web_orders`, preserving `Id` and
   all inquiry content.
5. Make both copy operations repeatable and idempotent by primary key so the
   same copy can be used for the final delta.
6. Compare source and destination counts plus deterministic hashes over every
   business column. Record any intentional duplicate-contact resolution.

The prepared `operations/website-cutover/website-data-cutover.sh` package
implements the source snapshot, data-only backup, idempotent import, and
snapshot-subset verification used by this phase. It requires private libpq
service configuration, keeps credentials out of command-line arguments, and
requires an explicit environment guard before destination writes.

The source API stays live throughout this initial copy.

### Phase 2: move writes before changing implementations

1. Build a temporary bridge release of the standalone Website API whose
   `PseqDatabase` maps the existing entities to
   `website.web_contacts` and `website.web_orders`.
2. Configure that bridge with the Portal database connection, existing
   reCAPTCHA and Mailgun secrets, and the preserved documents volume. Do not
   run the standalone Website migration history against the Portal database.
3. Start the bridge on its green loopback port and smoke it directly through
   Nginx with a temporary internal route or host header.
4. Change only the Nginx upstream for the then-current public Website API
   hostname from legacy to bridge, run `nginx -t`, and reload Nginx. Do not
   change public DNS or the Website API base URL.
5. Allow existing legacy upstream requests and keep-alive connections to drain.
6. Run the idempotent source-to-destination copy again. Reconcile counts and
   hashes, then prevent any further application writes to the legacy database.

After this phase, public behavior is still supplied by the standalone Website
API, but every new contact and order is stored in the Portal database.

Phase 2 completed on 2026-07-18 UTC. Nginx routes the stable public hostname to
the bridge on `127.0.0.1:8085`. The legacy upstream drained to zero established
connections and remains running on `127.0.0.1:8081` solely for immediate
rollback. The final source import and independent rolled-back verification
matched every source business-field fingerprint.

### Phase 3: switch the API implementation

1. Deploy the Portal API on its green loopback port using the same Portal
   database, Website secrets, public documents, and private index volume as the
   bridge.
2. Smoke `GET /api/health`, database ping, representative search, the public
   technical-brief URL, CORS, and invalid reCAPTCHA rejection before exposing
   the Portal slot. The old workflow's root-page smoke must become the Portal
   health check because Portal does not serve the standalone API root page.
3. Use controlled browser submissions with real reCAPTCHA tokens to verify one
   contact and one order, persistence in the `website` schema, expected
   duplicate-contact behavior, and Mailgun delivery.
4. Change the Nginx upstream from bridge to Portal, validate the configuration,
   and reload Nginx.
5. If Portal is unhealthy, switch Nginx back to the bridge. Both implementations
   use the same Portal database, so this rollback does not require a data
   rollback or reverse copy.

Phase 3 completed on 2026-07-18 UTC. Two submissions made while the bridge was
public increased the shared destination from 13 contacts and 2 orders to 14
contacts and 3 orders; the corresponding order and mailing-list notifications
were both accepted and delivered. Nginx then changed only the Website upstream
from the bridge on `127.0.0.1:8085` to Portal on `127.0.0.1:8084`.

After that implementation switch, a controlled browser acceptance pair with
identifier `PortalCutover-20260718T014950Z` produced the expected success
states. The exact synthetic contact and order each appeared once in the Portal
`website` schema, increasing the totals to 15 contacts and 4 orders. The
contact did not request a technical brief. Mailgun reported accepted and
delivered events for both the Portal order and mailing-list templates.

### Phase 4: observe and retire

1. Keep the bridge available for the agreed rollback window while monitoring
   endpoint errors, rejected submissions, notification failures, crawler/index
   completion, and database connectivity.
2. Repeat destination row-count and hash checks after the observation window.
   The legacy source should remain unchanged after the Phase 2 drain.
3. Take a final retained backup of the legacy database and preserve the prior
   standalone release artifact.
4. Remove the bridge only after Portal has met the acceptance gates.
5. Disable or replace the Website repository's standalone API deploy workflow.
   Move ownership of deployment and the database-ping monitor to Portal while
   keeping the public probe URL stable.
6. Retire the legacy database only under a separate, explicitly approved
   retention and deletion step.

## Cutover invariants

- Never recreate the active API container as the cutover mechanism.
- Never direct the rollback API at the legacy database after Portal-database
  writes begin.
- Roll back the Nginx upstream, not the Portal database migration or migrated
  rows.
- Preserve source identifiers and timestamps and use repeatable copy commands.
- Do not destroy or mutate the legacy source beyond preventing new writes until
  the final backup, reconciliation, and retention decision are complete.
- Do not apply a shared or production migration without explicit approval.

## Verification boundary

On 2026-07-17,
`dotnet build .\backend\PSeq.Operations.slnx --configuration Release --no-restore`
completed with zero warnings and zero errors. The new tests were compiled by
that build but were not executed; the repository policy requires an explicit
request before running the backend test plan.

The repository build proves compilation and EF model generation. It does not
prove production reCAPTCHA credentials, Mailgun templates, public-file mounts,
the external crawler target, DNS/reverse proxy, or historical data transfer.
Those remain deployment evidence.

On 2026-07-17, read-only public probes confirmed that the current root page,
search endpoint, database-ping endpoint, and technical-brief URL responded
successfully. That is the pre-cutover dial tone to preserve; it does not identify
the runtime database host or authorize production access.

The same date, the isolated green deployment was built from source archive
SHA-256
`a54c5c71fe967f783932dd2f6ec24dc2e403c7e1c5a7e1aae24e6ed8ebd510d8`
as image `phaeno-portal-green-api:green-a54c5c71fe96`. The green database was
healthy with zero restarts and no host-published port. The green API was
healthy with zero restarts and returned: API health `200`, database ping `204`,
representative search `200`, and the technical brief `200`. During the same
check, the existing Website database ping returned `204` and the public Website
returned `200`. Both API listeners remained loopback-only, and no Nginx or DNS
change was made.

The initial data import matched:

- contacts: 13 rows and hash `cfc2e50a1eefe8ac4b059be76abac3bb`;
- orders: 2 rows and hash `487e2763f18deb80a15597907199858f`; and
- duplicate normalized-email groups: 0.

Catalog-valid pre-import and post-import Portal database dumps were encrypted
with the snapshot recovery material, independently decrypted and compared to
their plaintext inputs, and retained root-only with SHA-256 checksums. The
plaintext dumps, decrypted snapshot, archive passphrase, temporary database
service file, and one-use import workspace were securely removed. Post-import
probes again returned green health `200`, green database ping `204`, green
search `200`, green technical brief `200`, current Website database ping `204`,
and public Website `200`; both green containers remained healthy with zero
restarts.

The bridge source archive SHA-256 was
`042c2c8d00929db8fb866a7f84a5c7547c6538321750aef2b4d95130c7f81617`,
and the deployed image was
`phaeno-website-bridge-api:bridge-042c2c8d0092`. Direct bridge probes returned
database ping `204`, representative search `200`, technical brief `200`, CORS
preflight `204`, and invalid reCAPTCHA rejection `400`; the rejection did not
change the destination counts of 13 contacts and 2 orders. Both bridge and
legacy EF model mappings were inspected and matched their expected schemas,
tables, and columns.

Deployment inspection first found an invalid notification credential in the
ignored local Website configuration. The exact Mailgun messages endpoint
rejected an intentionally incomplete request with `401 Unauthorized`; the
request could not send email, and all runtime files were restored.

The owner then supplied the replacement through the
`PSeq.Operation.Api` application settings. It was streamed into the
root-only bridge and Portal runtime secret files without being printed or
passed on a command line. An intentionally incomplete request to the exact
Mailgun messages endpoint returned `400 Bad Request`, proving authentication
without sending email. The tracked application-settings value was immediately
cleared back to empty. The bridge and Portal containers were recreated with
the runtime secret and retained zero restarts.

The guarded Nginx cutover then changed only the Website upstream from
`127.0.0.1:8081` to `127.0.0.1:8085`. The original configuration is retained
root-only with SHA-256
`7ee6414527adfc2751c7aeee29e46f12f3f7fec0aa352ca8e1f781b117995373`.
Public bridge probes returned database ping `204`, representative search
`200`, technical brief `200`, CORS preflight `204`, and invalid reCAPTCHA
rejection `400`. The destination remained at 13 contacts and 2 orders, and the
legacy API remained available with database ping `204`.

After the legacy upstream drained to zero established connections, the final
source snapshot recorded:

- contacts: 13 rows and hash `cfc2e50a1eefe8ac4b059be76abac3bb`;
- orders: 2 rows and hash `487e2763f18deb80a15597907199858f`;
- duplicate normalized-email groups: 0; and
- documents: 97 files totaling 8,318,449 bytes.

The idempotent final import reported zero destination-only rows and exact
source/snapshot/destination hashes for both tables. Independent verification
repeated the comparison in a rolled-back transaction, and every document
checksum passed. The authoritative final source snapshot and a post-import
Portal database dump were encrypted with the existing off-server recovery key,
their encrypted checksums passed, and all temporary plaintext snapshot and
database-dump files were securely removed.

The Phase 3 Portal cutover completed at `20260718T015903Z`. The guarded switch
first retained a root-only Nginx backup at
`/var/backups/phaeno-website-cutover/nginx-pre-portal-20260718T015903Z.conf`
with SHA-256
`745ceb340b346e22b3efc19c7d2f417b7c1011f12688d61d1254e3cfc3a037dc`.
The public Portal API then returned health `200`, database ping `204`,
representative search `200`, and the technical brief `200`; the public Website
returned `200`. CORS preflight returned `204` with the expected marketing
origin, and an invalid reCAPTCHA submission was rejected with `403` without
changing row counts.

The post-browser production audit confirmed 15 contacts, 4 orders, exactly one
synthetic contact, and exactly one synthetic order. Portal remained healthy
with zero restarts and no cutover-period application errors. Both Portal
notifications were accepted and delivered, the bridge still returned database
ping `204`, and it had zero established connections. The standalone API also
returned database ping `204`. Nginx configuration validation passed; the host
continues to emit an unrelated duplicate-server-name warning for another
domain. Public traffic remains on Portal while the bridge and prior API stay
available for the Phase 4 observation window.

The canonical hostname activation completed at `20260718T025657Z`. Vercel DNS
has an explicit `api` A record for `178.156.175.151` with TTL 60. The
`api.phaenobiotech.com` TLS certificate is valid through 2026-10-16. The
guarded Nginx change retained a root-only backup at
`/var/backups/phaeno-website-cutover/nginx-pre-api-hostname-20260718T025657Z.conf`
with SHA-256
`96770d59788d6c63b1ff0abe505f24f042de8110385081bfce8c71a1bf35495a`.
Public checks returned Portal health `200`, database ping `204`,
representative search `200`, and the technical brief `200`. The compatibility
hostname continued to return database ping `204`.

Vercel `PUBLIC_API_BASE_URL` was updated for all Website environments to
`https://api.phaenobiotech.com/api/v1/`. A production rebuild of current
`main` failed before promotion because `ui/src/styles/global.css` imports the
missing `ui/src/styles/design-system.css`. A guarded attempt to rebuild the
still-current known-good production revision was rejected because that
revision no longer belongs to `main`. Vercel therefore left the existing
production deployment and assigned domains unchanged. The live Website
continues operating through the retained compatibility hostname, and the next
successful Website deployment will bake in the canonical API origin.

The deployment workflow and server helper were validated statically and by
repository build checks; creating the workflow does not itself deploy a new
release. Its first production dispatch remains an explicit operator action
through the protected `production` GitHub environment.
