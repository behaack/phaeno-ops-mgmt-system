# S3 hosted cutover

Status: prepared October 9, 2026; execution is not authorized. This plan does
not lift the repository deployment holds or authorize source-object changes.
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

## Recovery and replacement preparation

1. Freeze scientific/file writers and acquire the deployment/backup maintenance
   locks. Pin every physical key, object version, receipt, length and full SHA-256.
2. Produce a coordinated encrypted database/current-file recovery point. Verify
   off-server export, decryption and a populated isolated restore; old evidence
   is not proof for this release. Record retained recovery IDs privately.
3. Prepare a separate restore-rehearsal database and file namespace with network
   isolation and dispatch/deletion disabled. Restore metadata and bytes and verify
   all required references. There is no live replacement/reset requirement for
   this source-only change; any later replacement needs explicit preserved-data
   scope, destination preparation and Owner approval.
4. Implement and rehearse S3-aware coordinated backup/restore before activation.
   The current Local-only backup timer refuses S3 and cannot be accepted as the
   new recovery mechanism. Include typed managed locators, original bucket/key/
   version identities and full integrity evidence. Recovery of an original must
   not silently substitute another version or claim missing original bytes exist.
5. Back up protected runtime settings and prepare the exact storage-locator
   conversion/rollback mapping. Keep the previous Local volume and metadata
   recovery point until acceptance. No destructive remedy is authorized here.

## Cutover

Copy only approved referenced managed files into record-derived S3 destinations,
using immutable writes and full checksum/length readback. Original external
scientific objects are read in place and excluded from managed-file conversion.
Convert provider locators once while retaining scientific IDs and facts; reject
unknown or shared ownership instead of inventing a library/run. Coordinate the
metadata switch, new API/scanner configuration and writer restart in one bounded
maintenance window. Install the explicit empty S3 key prefix for customer-first
roots and preserve other runtime/worker/retention flags.

Restore normal operation only after recovery, authorization and proxy checks.
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
large permitted files through the real proxy and a populated S3 restore. Confirm
the new backup schedule and monitoring work after activation. Record actual
evidence and restore Git/workflow deployment holds after the authorized release.

This prepared plan leaves target pinning, infrastructure scope, populated recovery
and S3 backup implementation open. Obtain explicit hosted release authorization
only after those requirements produce a concrete reviewable release package.
