# S3 hosted cutover

Status: hosted-test and local S3 active October 9, 2026. The Owner moved
S3-aware backup/restore to the production launch requirements; it no longer
blocks local or hosted-test S3 use. Preserve existing records and file access.
No source-object deletion, database reset or commercial production launch is
authorized. Restore deployment holds after any bounded testing release.
The [implementation plan](S3-STORAGE-AND-SCIENTIFIC-ACCESS-PLAN.md) records code,
local inventory and read-only AWS evidence.

## Target and preserved data

Target the existing Hetzner Portal Green runtime under `/opt/phaeno.portal-green`,
including its production-hosted test database selected by protected `portal.env`.
Before execution, pin its exact database name/host, API/frontend source revisions,
storage provider, volume attachments, scanner and worker settings in the private
release receipt. A historical release or the local recovery database does not
identify that target. Do not deploy before this preflight is complete.

Preserve every Customer, Job, sample, library, sequencing/capture, assembly,
scientific receipt, release, retention/hold and audit record. No reset, synthetic
fixture copy, schema migration or application authentication change is planned.
Inspect current physical file references and ownership instead of assuming the
hosted store is empty. Preserve unrelated bucket objects and server volumes.

Use a dedicated hosted-test S3 destination in the approved AWS account/region,
independent of local development. Pin its final name, ownership and allowed
prefixes before execution; the discovered development bucket is not a hosted
destination approval. Prepare least-privilege runtime credentials without putting
them in source, release archives, browser bundles or logs. Original scientific
admission requires exact non-null object versions and original-version
preservation; scope all infrastructure changes explicitly before applying them.

Testing infrastructure scope: use new private versioned destinations
`phaeno-portal-local-test-767828764389-us-east-2` and
`phaeno-portal-hosted-test-767828764389-us-east-2` in the verified account/region.
Leave `phaeno-dev-01`, `elasticblast-phaeno` and their existing data/configuration
untouched. Separate application identities are scoped to their corresponding
test bucket, with version reads and multipart upload support but no permanent
version deletion. Keep the supplied administrator credential on the owner's
machine for provisioning; do not install it in the hosted API.

Local activation must first convert the currently four scientific receipts using
their existing customer/work/sample/library/FASTQ-set identities, verify complete
bytes and retain the Local copies. The hosted inventory was empty at the last
release; recheck it immediately before switching. Nonsecret local profile selection
belongs in environment-specific configuration; credentials stay outside source.
Use the existing protected deployment path for hosted configuration and explicitly
defer its Local-only backup timer. Test resources are not production approval.

## Testing preparation and production recovery requirement

1. Freeze scientific/file writers and acquire the deployment/backup maintenance
   locks. Pin every physical key, object version, receipt, length and full SHA-256.
2. Testing cutover does not require a new backup, populated restore rehearsal or
   completed S3 backup implementation. Retain existing recovery copies, the Local
   files and an exact locator conversion/rollback manifest. Verify each copied
   file's complete checksum and length before changing its provider address.
3. Keep test storage independent of future production and unrelated bucket data.
   Use private versioned test buckets and workload credentials scoped to their
   destinations. Original version pinning, scanning and tenant/file attribution
   remain testing requirements; the backup deferral does not waive them.
4. Explicitly defer the Local-only backup timer when testing switches to S3; do
   not report that it protects S3 objects or allow a failing Local timer to imply
   current recovery coverage. Preserve its prior settings and existing snapshots.
5. Before commercial production activation, implement S3-aware coordinated
   backup/restore, schedule/monitoring and a populated isolated restore rehearsal.
   Include managed locators, original bucket/key/version identities and complete
   integrity evidence. Pin production destinations and preserved/reset data,
   verify off-server recovery, and prepare cutover/rollback acceptance. A testing
   waiver does not satisfy this production gate.

## Cutover

Copy only approved referenced managed files into record-derived S3 destinations,
using immutable writes and full checksum/length readback. Original external
scientific objects are read in place and excluded from managed-file conversion.
Convert provider locators once while retaining scientific IDs and facts; reject
unknown or shared ownership instead of inventing a library/run. Coordinate the
metadata switch, new API/scanner configuration and writer restart in one bounded
maintenance window. Install the explicit empty S3 key prefix for customer-first
roots and preserve other runtime/worker/retention flags.

Restore testing operation after integrity, authorization and proxy checks.
Keep source preservation, byte-deletion activation, real DPS connection and
Customer scientific approval/publication as separately authorized actions.

## Rollback

Quiesce file writers again; preserve any post-cutover receipts, objects and
scientific operations before deciding recovery. Do not restore an old database
over new scientific records without an explicit reconciliation decision. Use the
verified rollback mapping and preserved Local bytes for pre-cutover managed
receipts; new S3-original receipts need their exact original access retained or
a reviewed recovery path. Restore the prior application/runtime revision only
when it can interpret every retained locator. Preserve S3 bytes, original
versions and diagnostic/recovery evidence; do not delete the target bucket.

## Acceptance and release authority

Verify authenticated upload/download, original admission/version pinning,
scanner failure, source change/deletion, Customer/Job/sample isolation, repeated
libraries/captures/assemblies, preserved old files, interruption/retry recovery,
large permitted files through the real proxy. Populated S3 restore, backup schedule
and recovery monitoring are production launch requirements. Record actual
evidence and restore Git/workflow deployment holds after the authorized release.

Testing may proceed after target, scoped access, preserved-file conversion and
functional acceptance are verified. Backup/restore implementation remains tracked
for production and must not be represented as complete during testing.

## Testing activation checkpoint

Source `9a391b3f` is active on the hosted API and matching Portal frontend. The
guarded cutover verified an empty hosted file store, preserved the Local volume,
kept ClamAV and authentication/worker settings, applied no migrations, and disabled
the Local-only backup timer with `PortalTesting__S3BackupsDeferred=true`. Public
health/rendering and direct/proxied anonymous authorization checks pass.

Both isolated test buckets and their scoped identities are active. Real S3
version/read/multipart/overwrite/isolation checks pass. The four local retained
FASTQs are copied and complete-byte verified at their record-derived destinations.
After the Owner stopped the old API, four addresses were converted atomically with
maintenance audit events. All other scientific receipt fields and the Local bytes
are preserved. The active Development storage factory reads every retained file
with exact checksum/length; API/frontend restart, health/rendering and anonymous
authorization checks pass. Normal Visual Studio build outputs are refreshed.
Detailed credentials/mappings/receipts stay private. Authenticated user upload and
scientific workflow acceptance remain distinct from these cutover checks.
