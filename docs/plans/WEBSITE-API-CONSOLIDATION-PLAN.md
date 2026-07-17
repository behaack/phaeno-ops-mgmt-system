# Website API consolidation plan

## Status

The code consolidation is implemented in `phaeno-portal`. Production data
copy, migration execution, runtime-secret and volume configuration, public
traffic cutover, and retirement of the standalone `phaeno-website` API remain
explicit deployment work.

No shared, staging, or production database migration has been applied by this
plan.

The current `phaeno-website` deployment workflow is suitable for an ordinary
API redeploy, but not for this cutover without modification: it extracts over
the live application directory and recreates the single API container before
running public smoke checks. It has no green slot, database reconciliation
gate, or automated rollback. `phaeno-portal` does not yet have an approved
production deployment path, Docker/Compose definition, or deployment workflow.

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
- `webops.phaenobiotech.com` terminating TLS at host Nginx;
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

Keep the public hostname during consolidation. If
`webops.phaenobiotech.com` remains the Website API origin, the Astro
`PUBLIC_API_BASE_URL`, the technical-brief URL, and the scheduled database
probe do not need a coordinated DNS or Website redeploy.

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
4. Change only the Nginx upstream for `webops.phaenobiotech.com` from legacy to
   bridge, run `nginx -t`, and reload Nginx. Do not change public DNS or the
   Website API base URL.
5. Allow existing legacy upstream requests and keep-alive connections to drain.
6. Run the idempotent source-to-destination copy again. Reconcile counts and
   hashes, then prevent any further application writes to the legacy database.

After this phase, public behavior is still supplied by the standalone Website
API, but every new contact and order is stored in the Portal database.

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

On 2026-07-17, `dotnet build .\backend\PSeq.Operations.slnx` completed with
zero warnings and zero errors after the migration was generated. The new tests
were compiled by that build but were not executed; the repository policy
requires an explicit request before running the backend test plan.

The repository build proves compilation and EF model generation. It does not
prove production reCAPTCHA credentials, Mailgun templates, public-file mounts,
the external crawler target, DNS/reverse proxy, or historical data transfer.
Those remain deployment evidence.

On 2026-07-17, read-only public probes confirmed that the current root page,
search endpoint, database-ping endpoint, and technical-brief URL responded
successfully. That is the pre-cutover dial tone to preserve; it does not identify
the runtime database host or authorize production access.
