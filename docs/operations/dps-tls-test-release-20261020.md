# DPS TLS hosted-test release — rolled back October 20, 2026

The Owner requested commit/push and deployment of the secured DPS connection
using port 18883. Source is committed and pushed. The new API built and passed
the protected deployment's health, scanner, storage and Website preservation
checks, but did not confirm actual TLS discovery before the connection guard's
deadline. The guard restored the preceding API, runtime settings, tunnel helper
and current-release link. **The TLS release is not currently active.**

The data pipeline's known public endpoint,
`ec2-18-118-29-30.us-east-2.compute.amazonaws.com`, now times out on SSH port 22
from both Windows and the hosted machine's own network. The installed tunnel's
journal shows the same timeout, including before cutover. The earlier isolated
Linux connection test succeeded against this endpoint; that earlier success
does not establish present availability. Confirmation of instance
`i-0dd6c94e169e58a75` status/current public DNS is pending. No certificate
verification bypass, plaintext fallback or new SSH trust was introduced.

## Release and rollback identities

- Committed/pushed source: `859f36055ac4ef668b3023065ecfbd3d8ee0067a`.
- Git archive SHA-256:
  `daa64c8d98b8353893e70dd4feae7e19cb93ae3c629a4b39bac5879ed8553e90`.
- Retained candidate image:
  `phaeno-portal-green-api:sha-859f36055ac4-manual-20261020-1`, image ID
  `sha256:175513e5c741915200efdd1904ba6c7c5144489cb35e88c2de86259004815a6d`.
- Retained candidate release:
  `/opt/phaeno.portal-green/releases/859f36055ac4ef668b3023065ecfbd3d8ee0067a-manual-20261020-1`.
- Restored active API source:
  `390341dd9ba913f6f5a416de827ad4de99c8f380`, image
  `phaeno-portal-green-api:sha-390341dd9ba9-manual-20261019-1`, image ID
  `sha256:5a956aaaf05dea86ae5459fa6be41d10e89c7633c8dcf65619f193eee52eaaf6`.
- Portal frontend remains deployment `dpl_AdCQwmiXcNz8LXAhcs2wU8K8y4zL` from
  the preceding release. All 16 public asset hashes and canonical/prior-pin
  asset selections still exactly match its retained release evidence.

The exact-source protected host script was used with migrations and identity
cutover false. No runtime installers or frontend/Website deployment ran. The
workflow remains `disabled_manually`; orphan run `39056745064` remains queued
with zero jobs and fenced at its exact release-path absence guard. No Actions
run was dispatched. Both Vercel Git deployment holds remain false.

## Recovery and preservation

Fresh recovery includes the database, protected runtime, existing document tree
and Local file volume. Isolated PostgreSQL 18.6 restoration and reference checks
pass. The archives were compared with their sources, encrypted, collected
off-server and independently decrypted/inspected. The custom-format database
signature, all 250 table fingerprints and isolated restore receipt were verified.

| Encrypted recovery artifact | SHA-256 |
| --- | --- |
| `recovery.tar.gz.enc` | `21f4bb35b6915e2c676cdfd907cdbdd72a5ff400ab1cf137a90da54600a29991` |
| `recovery.key.enc` | `97004486140f71e4f5f1994d8e604a1591a2014c4a8cf91a9089ed1fca300c9d` |

After rollback, **all 250 full-table/full-record fingerprints exactly equal the
pre-release baseline**. There remain 29 migrations through
`20261017190934_SplitInternalOrderNotes` and zero assembly jobs. All 12 Website
contacts and six Demo requests retain complete-record digests
`ef77bd28975f174e0fefaf39931bd25f` and
`95aa679ef04abf2b672f77ee6b9f6222`, including historical states and identities.
No database restore, migration, reset, business write or notification replay ran.

All 115 preexisting runtime/document files retain their content hashes and
permissions, including restored release metadata/settings/helper and unchanged
SSH identity, trusted-host metadata and service definition. Local files remain
empty. Existing storage/provider/identity/simulation/worker settings are
unchanged. The protected script's temporary scanner/storage probes passed and
cleaned their own objects; no existing S3 object was changed. The hosted-test
populated-S3 recovery deferral and disabled backup timer remain.

The new versioned CA/PFX files remain restricted to root, with a mode-0700
directory and mode-0600 files under the existing read-only documents mount.
Their paths and password are absent from the restored active TLS settings.
Existing credentials are preserved. Private recovery and receipts are retained
under `/var/backups/phaeno-portal-deploy/dps-tls-20261020` and ignored,
account-restricted `.artifacts/dps-tls-release-20261020` off-server. No private
material is committed. Task-owned hosted staging and local temporary credential
copies were removed and their absence verified; the supplied originals remain
untouched.

## Verification and resumption gate

The Release solution build passes with zero warnings/errors. Earlier connection
verification retains its [Windows/Linux evidence](../testing/runs/2026-10-20-dps-mtls-connection.md),
25 focused checks and three launcher checks. Full regression suites were not
run as part of this release. The candidate's protected deployment passed scanner
clean/EICAR/encrypted/oversize checks, file-service checks, API health and full
Website preservation. Actual API TLS discovery did not pass, so an independent
post-cutover Describe/unused-ID Query was not run.

After rollback, API/database/scanner health pass, public health returns 200,
database ping 204, anonymous direct/proxied assembly reads 401 and the canonical
Website 200. The bounded API failure/critical scan is empty; DPS connection
warnings continue while the external SSH endpoint is unavailable. No assembly
Start/Cancel, real input, output admission, scientific QC or business acceptance
was performed.

Before retrying, establish the instance's current endpoint and pinned SSH
reachability. Review current data/runtime drift and existing candidate/recovery
destinations rather than blindly rerunning the first-attempt script. Retain the
deployment lock and no-migration/identity boundaries, restore the seven owned
TLS settings and committed 18883 helper, and use the protected exact-source
release path. Require actual API correlated TLS discovery and an independent
Describe/unused-ID Query through its replacement network namespace, then repeat
full preservation and public/hold checks. Keep all release holds and the orphan
fence in place. The [preserving release plan](../plans/DPS-TLS-HOSTED-TEST-RELEASE-20261020-PLAN.md)
remains incomplete until that connection acceptance succeeds.
