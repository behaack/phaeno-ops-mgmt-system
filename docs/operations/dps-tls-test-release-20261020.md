# DPS TLS hosted-test release — completed October 20, 2026

TLS source `859f36055ac4ef668b3023065ecfbd3d8ee0067a` is active in the existing
hosted test environment. The actual API confirms fresh correlated DPS discovery
with TLS true, port 18883 and availability true. An independent mutual-TLS
Describe and unused-ID Query through the released API network namespace also
pass. This completes the preserving connection release after the first attempt
was rolled back during the pipeline server restart.

## Released identity and connection

- Committed/pushed API source: `859f36055ac4ef668b3023065ecfbd3d8ee0067a`.
- Git archive SHA-256:
  `daa64c8d98b8353893e70dd4feae7e19cb93ae3c629a4b39bac5879ed8553e90`.
- API image: `phaeno-portal-green-api:sha-859f36055ac4-manual-20261020-1`.
- Image ID: `sha256:175513e5c741915200efdd1904ba6c7c5144489cb35e88c2de86259004815a6d`.
- Host release: `/opt/phaeno.portal-green/releases/859f36055ac4ef668b3023065ecfbd3d8ee0067a-manual-20261020-1`.
- API start: `2026-10-21T03:01:31.390413639Z` (October 20 in Los Angeles).
- Actual API log: `DPS MQTT discovery confirmed (TLS: True, Port: 18883, Available: True).`
- Same EC2 instance: `i-0dd6c94e169e58a75`; authenticated AWS lookup identifies
  `ec2-3-15-181-172.us-east-2.compute.amazonaws.com`, public IP `3.15.181.172`.
- TCP connection: API-namespace `127.0.0.1:18883` over SSH to EC2
  `localhost:18883`; TLS certificate name remains `localhost`.

All 1,036 retained release source files match the pinned Git archive. The
candidate image is byte-identical to the verified first-attempt image. The
protected deployment script ran with migrations and identity cutover false;
scanner/storage, API health, authorization and Website preservation guards pass.
No runtime installers or Portal/Website frontend deployment ran.

The public address changed during the instance restart. Windows and the hosted
API namespace both authenticate the new address with the unchanged SSH identity
and previously verified server key. Only `DPS_SSH_HOST` and a new hostname alias
for that same key change in the tunnel configuration. Original pins, identity,
service definition and all unrelated settings remain intact. The committed
helper now forwards port 18883 and follows the replacement API namespace.

## Recovery and preservation

Fresh retry recovery includes the full database, protected runtime, existing
document tree and Local file volume. Isolated PostgreSQL 18.6 restore/reference
checks pass. Archives were compared against their sources, encrypted, collected
off-server and independently decrypted/inspected. The PostgreSQL custom-format
signature, all 250 fingerprints and isolated restore receipt were verified.

| Retry recovery artifact | SHA-256 |
| --- | --- |
| `recovery.tar.gz.enc` | `1dd77e3ecc4ba1d0d0ebaaedb3119cc21bab0ad0886315ea9354776d447f582c` |
| `recovery.key.enc` | `0b04ed4d0a16a168e84e7dfad7b86263e0a6ba24278dd03fa80c54a21e2ce685` |

**All 250 full-table/full-record fingerprints exactly equal the fresh baseline.**
There remain 29 migrations through `20261017190934_SplitInternalOrderNotes` and
zero assembly jobs. All 12 Website contacts and six Demo requests preserve
complete-record digests `ef77bd28975f174e0fefaf39931bd25f` and
`95aa679ef04abf2b672f77ee6b9f6222`, including historical states and identities.
No migration, database restore/reset, business write or notification replay ran.

All 111 runtime/document files outside the six owned settings/helper/release
metadata paths retain their full hashes and permissions. The document tree and
versioned certificates are unchanged from retry preflight. Only the seven Portal
TLS values, committed helper, current SSH hostname/pin alias and expected release
metadata change. Private certificates retain root ownership, a mode-0700
directory and mode-0600 files under the existing read-only documents mount.
Local files remain empty. Original credential and provider selections, worker,
concurrency, recipe and explicit hosted-test simulation settings are preserved.

The protected script's temporary scanner/storage probes pass and clean their own
objects; existing S3 objects remain untouched. Populated hosted-test S3 recovery
qualification remains deferred. The Local-only backup timer remains disabled
and inactive; no Local backup was run against the S3 selection.

Protected receipts/recovery are retained under
`/var/backups/phaeno-portal-deploy/dps-tls-20261020-retry2` and ignored,
account-restricted `.artifacts/dps-tls-release-20261020/retry2` off-server.
Preceding releases, first-attempt recovery and operational rollback copies remain.
Temporary hosted password/PEM/key material and local deployment-key/password
copies were removed after verification. Original attachments, the configured
user SSH key/AWS profile and permanent restricted credentials are preserved.

## Verification and remaining boundaries

The earlier Release build passes with zero warnings/errors. The
[Windows/Linux connection record](../testing/runs/2026-10-20-dps-mtls-connection.md)
retains 25 focused checks, three launcher checks, Linux ephemeral PFX loading and
wrong-hostname/unrelated-CA/missing-client rejection evidence. No application
source changed for the retry and no full regression suite was rerun.

The released API itself validates correlated discovery using the private CA/PFX.
The independent probe negotiates TLS 1.3 with hostname localhost, receives the
available `pseq_data_assembler` 0.1.0 recipe and an authoritative `NotAccepted`
response with no events/receipts for a fresh unused job. Both exchanges use fresh
correlation IDs and non-retained QoS 1 messages. No Start/Cancel/event ACK or
real-input operation is sent. The Windows line ending on the supplied password
file is normalized only in memory for the independent OpenSSL diagnostic.

API/database/scanner health pass. Public API health returns 200, database ping
204, direct/proxied anonymous assembly reads 401 and the canonical Website 200.
The bounded released-API failure/critical scan is empty. Three initial connection
warnings precede successful discovery; none follow confirmation. Port 18883
listens only on the API container's loopback, with no host-level listener; the
old 11883 listener is absent from that namespace.

The Portal frontend remains `dpl_AdCQwmiXcNz8LXAhcs2wU8K8y4zL` from the preceding
release. All 16 public asset hashes and canonical/prior-pin selections match
retained release evidence. Workflow `315525604` remains `disabled_manually`;
orphan run `39056745064` remains queued with zero jobs and the exact-path fence
intact. No Actions dispatch is issued. Both Vercel Git deployment holds remain
false. Commercial activation, full Start/Cancel ACL/recovery journeys, physical
or scientific acceptance, QC and Customer release remain separate gates. The
configured recipe remains Simulated.

## Local access setup and first-attempt history

jq 1.8.2 and AWS CLI 2.38.2 work in Git Bash. The Owner completed browser sign-in
for profile `phaeno`, region `us-east-2`, output JSON. The downloaded SSH key is
copied to the script's expected user-home path with a user-only ACL, and its
public fingerprint matches the hosted identity. Local known-hosts entries reuse
the previously verified server key for both addresses. No private keys, AWS
session tokens or PFX password are committed. Future CLI sessions can renew the
same profile with `aws login --profile phaeno --region us-east-2`.

The first attempt passed protected release checks but failed actual discovery
while the saved address `18.118.29.30` was unreachable. Its guard restored the
preceding API/settings/helper; all 250 fingerprints and 115 preexisting files
were preserved then. Its encrypted recovery and rollback receipts remain under
`dps-tls-20261020`, including ciphertext hashes
`21f4bb35b6915e2c676cdfd907cdbdd72a5ff400ab1cf137a90da54600a29991` and
`97004486140f71e4f5f1994d8e604a1591a2014c4a8cf91a9089ed1fca300c9d`.
Authenticated address discovery and the preserving retry above supersede that
incomplete checkpoint. See the
[completed preserving plan](../plans/DPS-TLS-HOSTED-TEST-RELEASE-20261020-PLAN.md).
