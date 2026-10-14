# Hosted-test DPS API and UI release — October 14, 2026

The Owner requested updating documents, committing/pushing and deploying API/UI
after enabling sample assembly locally. Release the matched Portal API, UI and
help corpus to the existing hosted test environment, and enable the same
`pseq_data_assembler` version `0.1.0` simulation. Scientific admission and
Customer release remain prohibited for these attempts. Commercial activation,
Trial contract changes and scientific recipe validation are outside this scope.

Completed checkpoint: matched source `10e0dc9e5c6b0b739fd7efd3d570451e7194cbad`
is deployed. API run #106 succeeds and the matching ready frontend is promoted.
Hosted private discovery, authenticated connected UI, exact-version S3 access,
data preservation, health, authorization and bounded errors pass. Release holds
are restored. No complete hosted FASTQ sets exist, so actual sample execution
remains a separate acceptance case. See the
[completion receipt](../operations/portal-dps-test-activation-20261014.md).

## Target and preservation

Target `/opt/phaeno.portal-green` on the existing deployment host, API
`https://api.phaenobiotech.com` and UI `https://portal.phaenobiotech.com`.
The actual database is `phaeno_portal_green`, PostgreSQL `180006`, with 25
migrations through `20261007025545_VersionedVendorLibraryExceptions`. The live
API source/image is `60b176f0c7cdac308531efe3713d667942381ea5` /
`phaeno-portal-green-api:sha-60b176f0c7cd-run-38499219507-1`; the prior frontend
is `dpl_9tuoG5YUr8ngaN93dPepB15UYmaj`, with version boundary `1791994479939`.
Verify these again immediately before cutover.

Preserve every database record, identity mapping, membership, role, configuration,
business/scientific/Finance history, audit record, S3 object/version, Local
recovery file and existing release image. Website `web_contacts` and `web_orders`
are explicitly included, preserving IDs, complete contents, dates, language,
completed/unsubscribed states and actors. At preflight they contain 12 and 6
rows; full-row digests are `615d4900c2dd625b39e16cc5300d4461` and
`6ddf868c9dfd11f82832c22d0aa98a49`. No history is replayed or reactivated.

The database/model is unchanged; no replacement database is prepared. Use
`apply_migrations=false`, bootstrap/storage/scanning Preserve, identity cutover
false, and hosted-test S3 reconfiguration false. Stop if a migration or data
transformation becomes necessary. Existing S3 storage in
`phaeno-portal-hosted-test-767828764389-us-east-2` and ClamAV remain active.

Retain and checksum the existing restore-verified encrypted database/Local-file
recovery. The Owner's hosted-test S3 recovery deferral remains applicable; do not
run Local-only coordinated backup against S3 or claim current S3 backup coverage.
Create private recovery copies of the exact pre-change runtime settings before
installing the tunnel/activation settings, and retain the former API/UI for
rollback. Current S3 recovery and commercial readiness remain separate gates.

## Hosted connection and simulation setting

Keep ASP.NET Production, identity validation, scanning, file storage, mounts,
private database networking and existing worker selections. Enable only the
assembly worker and DPS connection with concurrency one. Preflight verifies
zero assembly jobs, sequencing outputs and FASTQ sets; activation cannot dispatch
old queued work. Do not import local fixtures or create sample/scientific records.

Install the reviewed host-owned SSH helper as a systemd service. Its protected
identity and pinned trusted-host file remain on the host. It joins only the
current API container network namespace, listens on `127.0.0.1:11883` there,
and forwards over SSH to the EC2 broker's 1883 port. It automatically rebinds
after container replacement and never publishes a host/public MQTT port. DPS
continues using EC2 loopback 11883 on the same Mosquitto broker. The supplied
identity does not change EC2 accounts, IAM, security groups or API authentication.

An explicit, default-off `Dps:AllowHostedTestSimulation` setting permits the
approved Simulated recipe under the existing hosted-test Production runtime,
only with contract environment local. It does not relax scientific schema,
analysis-link, QC or release guards. Development/local simulation remains
supported. Use the existing hosted S3 credentials/store for immutable processing
handoff; do not install the local-development AWS profile or change IAM access.

## Release sequence and rollback

Preparation checkpoint: the full Release solution compiles with zero warnings
and errors; TypeScript, scoped frontend lint, generated help (56 guides, corpus
`a5f6195373c0`), shell syntax and whitespace checks pass. EF comparison reports
no model changes. Retained coordinated snapshot
`snapshot-20261009T230131Z-ac831699-c1c3-435f-87c3-7c50315ea3b1` passes encrypted
checksums and retains restore/envelope/cleanup verification; it is historical
Local-file recovery, not current S3 coverage. The processing server independently
confirms hosted-test bucket versioning Enabled. Automated suites remain deferred.

1. Review the scoped source/help/configuration changes, validate build/type/lint,
   help and script syntax, and confirm no model change. Automated suites remain
   deferred. Commit the reviewed release and preserving plan on main, push, and
   pin ordinary local/remote equality. Exclude unrelated in-progress edits.
2. Create a hashed archive of that exact commit. Stage a Production Vercel build
   on the verified Cadexgenomics project `prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R`, root
   frontend, from its GitHub source pinned to the SHA, with domains unassigned.
3. Verify encrypted recovery/settings copies and zero pending assembly work.
   Install the pinned tunnel helper and protected key/host metadata; add only the
   owned DPS/assembly settings to `portal.env`. These apply with the new image.
4. Use the Owner-approved bounded enable/run/disable of Deploy Portal Green for
   the pinned main source, with the preserving choices above. Restore the manual
   workflow hold afterward. Keep both Vercel Git deployment holds throughout.
5. Verify the new API source/image, unchanged engine/migrations/storage/scanner,
   full Website intake preservation, API/database health and actual DPS Describe
   round trip. Require an available Simulated recipe and working exact-version
   S3 access without creating an assembly attempt.
6. Promote the ready matching Production frontend without rebuilding. Check
   canonical alias/assets, protected staging, existing-browser version pins,
   authenticated assembly page, public Website/API dial tone, anonymous direct/
   proxied authorization and bounded errors. Advance the version boundary only
   after matched API compatibility/preservation checks, then verify the old pin
   and available browser use the new build.

On API failure, the existing release script restores its prior image. On later
failure, restore the protected preceding settings, stop/disable only the owned
tunnel service, restore the prior API/image and Vercel frontend/boundary, and
verify health. Preserve any new database records and S3 versions; do not restore
an old database over new activity. Do not delete buckets, objects, volumes or
historical databases. No request, upload, scientific approval, QC or Customer
release is part of smoke acceptance. Record actual release identities and limits
in the completion receipt before the final report.
