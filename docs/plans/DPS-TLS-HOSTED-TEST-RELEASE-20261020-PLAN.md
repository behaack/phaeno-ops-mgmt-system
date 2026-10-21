# DPS TLS hosted-test release — October 20, 2026

## Authorization and target

The Owner requested committing/pushing the reviewed TLS connection changes and
deploying them to the existing hosted test environment using port 18883. This
supersedes the earlier no-commit/no-deploy scope for this release only. Release
the API and owned DPS connection settings/helper. The Portal and Website
frontends have no changed application code or contract and remain on their
current deployments, with both Vercel Git holds preserved. No commercial or
scientific activation, sample execution, dependency/authentication change,
database migration or data reset is included.

Target `/opt/phaeno.portal-green`, API `https://api.phaenobiotech.com`, existing
PostgreSQL 18.6 database `phaeno_portal_green`, private S3/ClamAV selections and
the existing host-owned DPS SSH service. The preceding API source is
`390341dd9ba913f6f5a416de827ad4de99c8f380`; main also contains its documentation
receipt `410d1fc40657a2defe9b350eaf26bb18df57e555`. Verify current identities,
migration history, pending work, configuration and recovery again before cutover.

Preparation checkpoint: Release solution compilation passes with zero warnings
and errors. Fresh hosted preflight confirms engine 180006, 29 migrations through
`20261017190934_SplitInternalOrderNotes`, zero assembly jobs and the preceding
healthy API image. All 250 table fingerprints are captured, including 12 Website
contacts and six Demo requests with unchanged full-record digests. Fresh recovery
includes the database, protected runtime, existing documents and Local files;
isolated restore passes and the encrypted recovery is collected off-server for
independent verification before cutover. The stale-run fence is intact.

The orphaned Actions run `39056745064` remains queued with no jobs. Follow the
[preceding preserving release procedure](ORDER-NOTES-HOSTED-TEST-RELEASE-20261019-PLAN.md):
independently verify its exact release-path quarantine and retain it; do not
dispatch another run. Use the exact-source protected `deploy-release.sh` directly
while `Deploy Portal Green` remains disabled. Its lock, build, scanner, health,
authorization, Website preservation and rollback checks remain in force.

## Preservation and recovery

Preserve every database schema/table/record, membership and identity mapping,
organization/Department, operational/scientific/Finance record and audit,
configuration, existing Local/document files, S3 object/version and prior release.
Explicitly include complete `website.web_contacts` and `website.web_orders`
history, original IDs, content, dates, locales, actors and completed/unsubscribed
states. Capture full-table/full-record fingerprints before and after, not just
counts. No historical emails or subscriptions are replayed or reactivated.

Before changing runtime files, take fresh database, runtime, Local-file and
document recovery. Restore the database in an isolated PostgreSQL 18.6 container
without live mounts and verify current migration/schema/reference checks. Verify
file archives against their sources. Encrypt with the existing recovery public
key, retain checksums, collect encrypted recovery off-server and independently
verify decryption/archive/restore evidence. Keep protected exact copies of
`portal.env`, `compose.env`, DPS helper/service and pinned SSH metadata for
operational rollback. Do not use a Local-only coordinated backup against S3.
Preserve the Owner's hosted-test populated-S3 recovery deferral and disabled
timer; this release does not qualify populated S3 recovery.

There is no replacement database or cutover: keep the current database and
migrations, pass `apply_migrations=false`, identity cutover false, and preserve
all other providers/flags. Stop if pending migrations, different data-model
requirements, changed targets or existing pending assembly jobs appear; do not
silently dispatch work as part of connection acceptance.

## Preparation and cutover

1. Retain the passing 25 focused Windows checks, three launcher checks and
   [isolated live Windows/Linux evidence](../testing/runs/2026-10-20-dps-mtls-connection.md).
   Build the Release solution, verify source/JSON/scripts/docs and exact scope.
   Record no model/migration change. Commit only the TLS source/tests/guides and
   this preserving plan on main, push, and pin local/remote equality and archive
   SHA-256. Keep all private material and ignored evidence outside Git.
2. Preflight the actual runtime and stale-run fence; capture and verify recovery.
   Confirm no queued/in-progress assembly attempts. Prepare a new versioned,
   owner-restricted `documents/private/secrets/dps/tls-20261020` directory using
   the supplied CA/PFX, preserving any existing destination material. It maps
   through the already read-only private documents mount; no mount change is
   required. Supply the PFX password only through protected runtime settings.
3. Own only these `portal.env` settings: `Dps__Host=127.0.0.1`,
   `Dps__Port=18883`, `Dps__UseTls=true`, `Dps__TlsServerName=localhost`,
   `Dps__CaCertificatePath`, `Dps__ClientCertificatePath` and
   `Dps__ClientCertificatePassword`. Preserve existing integration/worker,
   concurrency, simulation, recipe, S3, identity and all unrelated values.
   Install the exact committed SSH helper with loopback 18883 to EC2 localhost
   18883; preserve the SSH identity, trusted host metadata and service policy.
4. Extract and verify the pinned Git archive into a new release path. Execute the
   protected release script with migrations/identity cutover false and no runtime
   installers. Retain its database/storage/scanner checks. Restart only the owned
   DPS tunnel helper so it follows the replacement API namespace and TLS port.
5. Verify exact API source/image, unchanged migrations/data/file providers,
   secret-file ownership/mount readability, healthy API/database/scanner, pinned
   tunnel and localhost TLS listener. Require the actual API's fresh correlated
   DPS discovery log reporting TLS true, port 18883 and availability true.
   Independently verify Describe/unused-ID Query through the new tunnel without
   Start/Cancel. Check direct/public/proxied anonymous protected-route rejection,
   Website dial tone, unchanged frontend assets and bounded new-runtime errors.
6. Compare full record fingerprints and all unrelated runtime values; record
   expected owned TLS/release metadata changes, source, image, recovery identities,
   connection evidence and restored/preserved holds in the release receipt.
   Commit/push that documentation-only receipt without another deployment.

## Rollback

Before replacement, preparation failure leaves the existing image active.
On failure after settings installation, restore the protected preceding
`portal.env`, DPS helper and release metadata, restart only the owned tunnel and
restore the preceding API image using the protected non-migration rollback.
The previous valid image is compatible with the unchanged current database.
Retain the new versioned credentials privately for investigation; do not delete
existing credentials, data, objects, volumes or recovery. Do not restore an old
database over new activity. Frontends remain untouched throughout. Keep the
orphan-run fence and all deployment holds in place. Worker execution/recovery,
full Start/Cancel ACLs and scientific/business acceptance remain separate gates.
