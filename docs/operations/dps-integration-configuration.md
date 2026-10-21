# DPS integration configuration

Latest release checkpoint, October 20: source `859f3605` is active on the hosted
test API with mutual TLS on port 18883. The actual API confirms fresh discovery;
independent TLS 1.3 Describe/unused-ID Query and full preservation checks pass.
AWS profile `phaeno` identifies the running instance's new public DNS as
`ec2-3-15-181-172.us-east-2.compute.amazonaws.com`; the existing verified server
key and client identity are preserved. jq, the local AWS profile and protected
SSH key are configured. The first attempt's rollback during the address change
is historical. See the [release receipt](dps-tls-test-release-20261020.md).

October 20, 2026: the secured connection uses MQTT mutual TLS through SSH,
local `127.0.0.1:18883` to EC2 `localhost:18883`, with certificate hostname
`localhost`. The supplied private CA and PFX authenticated successfully in an
isolated .NET/MQTTnet test; Describe and an unused-ID Query received correlated
responses. Incorrect hostname, unrelated CA and missing client certificate were
rejected. See the [TLS verification record](../testing/runs/2026-10-20-dps-mtls-connection.md).
The source is now deployed under the completed release above. No assembly was
started. October 14 connection settings below are historical.

The earlier isolated hosted Linux verification passed on the exact live API
image/network
(Ubuntu 24.04.5, .NET 10.0.12) using an isolated probe compiled from the new
connection source. Linux ephemeral key loading, real DPS Describe/Query and
all three certificate rejection cases passed. That isolated verification left
the running API, original tunnel service and protected settings unchanged;
temporary probe/tunnel/certificate copies were removed. That connection
acceptance did not activate the new source
or test assembly execution. See the same verification record for preservation
evidence and the remaining worker/ACL/scientific boundaries.

The Owner authorized API/UI deployment and hosted-test simulation activation on
October 14, 2026. Follow the [preserving hosted release plan](../plans/PORTAL-DPS-TEST-ACTIVATION-20261014-PLAN.md)
for the exact target, private container-loopback SSH connection, protected host
identity, explicit simulation setting and rollback. The historical local-only
checkpoints below retain their original scope; release evidence is recorded
separately. Automatic deployment holds remain in place.

Hosted checkpoint: matched API/UI source `10e0dc9e` is deployed and the signed-in
workspace reports Processing connected, `pseq_data_assembler` 0.1.0, Simulated.
The private tunnel rebinds to the replacement API container; fresh correlated
discovery and existing-credential exact-version S3 access pass. Scientific guards
remain active. See the [release receipt](portal-dps-test-activation-20261014.md)
for exact identities, preservation, restored holds and remaining sample acceptance.

Local connection checkpoint, October 14, 2026: the Owner selected the local API
after an initial hosted-target discussion. The local API now connects through SSH
to the EC2 broker at `127.0.0.1:11883`. Its own POMS-DPS 1.0 Describe request and
correlated capabilities reply were observed. The hosted API was inspected only
and was not changed. See the [local run record](../testing/runs/2026-10-14-local-api-dps-connection.md).

The current configured and advertised recipe is `pseq_data_assembler` version
`0.1.0`. The remote implementation runs a mock pipeline. The local file provider
remains Local; a separate `Dps:S3` handoff is now configured in the existing
versioned local-test bucket. Eligible registered FASTQ sets can start through the
normal API/UI workflow, with the recipe and immutable attempts labelled
Simulated. Diagnostic outputs are verified and downloadable, while scientific
analysis admission/linking and QC remain blocked for those attempts.
See the [API/UI activation record](../testing/runs/2026-10-14-local-sample-dps-api-ui.md)
for the connected workspace, S3 SDK evidence and remaining sample acceptance.

The [standalone simulated FASTQ run](../testing/runs/2026-10-14-synthetic-fastq-s3-dps.md)
subsequently verified versioned S3 input/output transfer and a correlated
Accepted → Running → Succeeded exchange for this recipe. Its receiver journal
and committed ACKs simulate POMS persistence; the Portal API did not dispatch or
admit that synthetic job.

Historical implementation status, October 10, 2026: POMS source and regression sources compile
in the full Release solution with zero warnings/errors during release preparation.
Tests and connected validation remain deferred at the Owner's request. No connection,
command, S3 handoff or output-admission operation has been exercised. This guide
describes the implemented configuration, not evidence of a working deployment.

The API uses MQTTnet 5.2.0.1603 and the embedded POMS–DPS 1.0 JSON schema. The
browser uses the existing authenticated API and scoped SignalR notifications.
No Clerk authentication or authorization rule is changed.

## Local development startup

Keep `dps-ca.crt`, `PSeq-client-01.pfx` and its `.pfx.pass` file in an
account-restricted `%USERPROFILE%\.phaeno\certs` directory. The supplied Windows
certificate installer can prepare that directory. Never commit these files.
The launcher also accepts `-CertificateDirectory`, or the supplied
`MQTT_CA_CERT_PATH`, `MQTT_CLIENT_CERT_PATH` and `MQTT_CLIENT_CERT_PASSWORD`
environment variables. It maps these values into `Dps` settings for the child
API process and restores the caller's environment after the API stops. The API
itself binds `Dps` configuration, not the `MQTT_*` names.

The launcher overrides the former plaintext connection with host `127.0.0.1`,
port `18883`, TLS enabled and certificate hostname `localhost`. It preserves
the existing integration/assembly enablement, approved recipes, simulation,
storage and concurrency settings. Review pending work before starting an enabled
worker. Shared defaults remain disabled/unconfigured. Existing Local application
files and the separate `Dps:S3` handoff are unchanged. Direct API launches must
set the same secure `Dps` configuration explicitly; ignored older development
settings are not rewritten by this change.

Build the API, then use [the local launcher](../../backend/tools/Start-LocalDpsApi.ps1)
with the current EC2 hostname, private-key path and trusted-host file. From the
repository root:

```powershell
dotnet build backend/app/PSeq.Operations.Api.csproj --no-restore
./backend/tools/Start-LocalDpsApi.ps1 `
  -SshHost '<current EC2 hostname>' `
  -IdentityFile '<private-key file path>' `
  -KnownHostsFile '<trusted SSH host-key file path>'
```

The launcher uses the frontend's existing `https://localhost:44399` API target
and `http://localhost:48056`, opens a loopback-only SSH forward from local port
18883 to the EC2 broker's localhost port 18883, and removes its account-restricted
temporary SSH key copy when the API stops. It preserves pinned SSH host-key
checking and never changes the original key's permissions. The current EC2 DNS
name is resolved by the supplied `phaeno-datapipeline-ssh.sh` using AWS profile
`phaeno` and instance `i-0dd6c94e169e58a75`; the DNS name can change after restart.

When that supplied script already owns the tunnel, use:

```powershell
./backend/tools/Start-LocalDpsApi.ps1 -UseExistingTunnel
```

This mode requires a listening port and leaves the external tunnel running.
The API still verifies the broker's TLS identity; a listening port alone proves
no server identity. Managed mode rejects an occupied port. Do not run two API
instances on the same API ports. Only the TLS forward is required by the Portal;
the supplied script's PostgreSQL/plaintext forwards are independent.

## Required configuration

`Dps:Enabled` and `LabAssembly:WorkerEnabled` are false unless explicitly
configured. Both must be enabled for the server connection and dispatch worker.
The shipped DPS host and approved-recipe list are empty; there is no broker
fallback. Do not enable a hosted environment until Chris's service and the
contract/access validation are ready. The bounded source release follows the
[October 10 preserving release plan](../plans/PORTAL-DPS-SOURCE-RELEASE-20261010-PLAN.md);
automatic deployment holds remain in place.

| Setting | Meaning |
| --- | --- |
| `Dps:Environment` | `local`, `staging` or `production`; selects the isolated `phaeno/dps/v1/{environment}` topic root |
| `Dps:Host`, `Dps:Port` | Explicit bare broker host/IP and port; default port 18883. The SSH connection uses `127.0.0.1:18883`. |
| `Dps:UseTls` | True by default; plaintext is restricted to a loopback broker in `local` |
| `Dps:CaCertificatePath` | Optional PEM trust-root file. For this private broker, configure `dps-ca.crt`; trust is scoped to this connection, without changing the machine trust store. |
| `Dps:TlsServerName` | Certificate hostname and TLS SNI, separate from the TCP endpoint. Set `localhost` for this broker through SSH. Empty uses the TCP host. |
| `Dps:ClientId` | Unique per concurrently running API instance; blank generates a process-instance identity stable across reconnects |
| `Dps:Username`, `Dps:Password` | Optional matching credential pair, supplied outside source |
| `Dps:ClientCertificatePath`, `Dps:ClientCertificatePassword` | PKCS#12/PFX identity and password, supplied outside source. Required for this mutual-TLS broker. Windows uses temporary user key storage without `PersistKeySet`; other platforms use `EphemeralKeySet`. |
| `Dps:RequestTimeoutSeconds` | Correlated MQTT response deadline, 1–30 seconds; default 15 |
| `Dps:OperationTimeoutSeconds` | Processing/reconciliation operation deadline, 30–900 seconds; default 300 |
| `Dps:MaximumOutputFileBytes` | Output-admission file bound; default 1 GiB; actual scanning/storage limits also apply |
| `Dps:MaximumOutputSetBytes` | Output set bound; default 16 GiB |
| `Dps:Recipes` | Approved key, name, exact version, JSON parameters and required output roles |
| `Dps:Recipes:Simulated` | Explicit mock recipe marker; accepted in Development or explicitly enabled hosted test, with contract environment local. Saved on each attempt and never authorizes scientific output admission or manual analysis linking. |
| `Dps:AllowHostedTestSimulation` | False by default. Explicit hosted-test permission for a Simulated recipe under the Production runtime, restricted to contract environment local. Scientific admission, analysis linking and QC remain blocked. |
| `Dps:S3` | Optional dedicated versioned handoff bucket, region, key prefix and credential profile/file. When omitted, an already configured application S3 store is used. Local application storage alone does not supply a DPS destination. |
| `LabAssembly:MaximumConcurrentJobs` | Shared dispatch capacity, 1–32; default 4 |

Non-loopback brokers require a configured client certificate or credentials.
TLS uses standard server-certificate verification; there is no bypass switch.
Configuring TLS certificate material or a TLS server name with TLS disabled is
rejected, including on loopback. CA/client validity, CA signing constraints,
client private-key presence and declared client-authentication purpose are
checked before connecting. Certificates are reloaded on a new connection
attempt, retained for the connected lifetime and disposed on failure/shutdown.
The complete secret settings belong in the environment's existing secret
configuration mechanism, never in a recipe, manifest, browser payload or log.
Invalid/missing DPS configuration leaves assembly unavailable without preventing
the rest of the API from starting.

The supplied client's actual CN is `PSeq-client-01`; Mosquitto's
`use_identity_as_username=true` derives the broker username from that CN.
Leave optional MQTT username/password settings unset for this broker. MQTT client
IDs remain unique per process instance; they are separate from certificate CNs.
There is no developer-reported identity enrollment registry. Topic ACL grants
must still be checked against the adapter's required publish/subscription paths;
Describe/Query access alone does not establish Start/Cancel permissions.

For a later authorized hosted release, use the existing private read-only mount:
host `/opt/phaeno.portal-green/documents/private/secrets/dps` maps to
`/app/__DOCUMENTS/private/secrets/dps`. Restrict the host directory and private
files to the runtime owner, set `Dps__CaCertificatePath` and
`Dps__ClientCertificatePath` to those container paths, and provide the password
through protected `portal.env`. Also set `Dps__Host=127.0.0.1`,
`Dps__Port=18883`, `Dps__UseTls=true`, and `Dps__TlsServerName=localhost`.
The reviewed host helper now forwards 18883 to 18883; it has not been installed
or restarted. Preserve existing worker/simulation settings and release holds.

The supplied client expires March 3, 2028; the observed broker certificate
expires January 17, 2029. Renew before expiry, retain a protected recovery copy,
verify the replacement CA/identity and private-key match, and reconnect through
the normal controlled restart. Keep the prior valid identity for rollback until
the replacement is verified. Revocation and broader topic-policy acceptance
remain broker-operational checks; this connection test does not prove them.

A compatible approved recipe must match a fresh DPS Describe reply by key and
version. Parameters must satisfy the advertised local schema, output roles must
match exactly, and the selected read layout must be supported. The bounded schema
interpreter supports local `$ref`/`$defs`, primitive types, enum/const, object
properties/required/additionalProperties, arrays/items/uniqueness, lengths,
patterns, numeric bounds/multipleOf and logical/conditional combinations.
External references, unsupported vocabularies and invalid schemas fail closed.
Recipe UTC date-time and UUID formats are enforced. Keep parameter schemas
compatible with this vocabulary; POMS will not guess defaults or a new version.

The adapter requires a commercial Lab Job and one complete sealed FASTQ
set per specimen/purchased run. Managed files are verified and copied into
immutable S3 input-cache objects before the manifest is frozen. Original custody
and scientific receipts remain unchanged. Trial scope needs a
contract extension. At most 63 required output documents plus one parameters
document fit the existing scientific-evidence record; software/tool declarations
must fit its 64-entry limit. Scientific filenames retain the existing 255-character
limit, and original S3 receipt locators retain their existing 1,000-character bound.

## Dispatch and recovery

Start saves its attempt, original inputs, exact S3 manifest and stable Run command
before publication. It reconciles by job ID, verifies current scope/authorization
and pinned object identities, and sends only when DPS authoritatively reports
NotAccepted. Repeated publication uses the same command ID and unchanged body.
Capacity is checked under the shared dispatch lock, including immediate API starts.

The API requires a DPS business receipt, not a broker PUBACK. Missing broker or
capabilities return `dps_dispatch_unavailable`. Rejected publication/acceptance
or a correlated-response timeout after save returns `assembly_dispatch_failed`
or `assembly_dispatch_unconfirmed`, with `error.details.assemblyJobId`. The
saved attempt remains visible; the Start dialog offers Open saved attempt and
refreshes the assembly list. A retry does not silently change its inputs.

Cancel also saves a stable command before immediate dispatch. An acceptance
receipt does not prove termination. Rejection, CannotAct or missing acceptance
returns an error while retaining actual execution facts. The configured worker
continues authoritative lookup and existing durable deadline/escalation handling.

Lifecycle events are applied to the existing receipt ledger and acknowledged
only after commit. Control receipts have a separate `command:` event-ID namespace
and do not advance execution sequence. Duplicate/conflicting command or final
evidence cannot silently replace the saved state. Malformed scoped events get
rejected acknowledgments; unknown scope or transient failures get no commit ACK.
Progress is bounded, transient and discardable; it never delays durable lifecycle
handling or establishes completion.

## Output custody

The exact output-manifest object is checksummed and version-pinned before its
scope/recipe/input fingerprint and execution times are matched to the saved
attempt. Execution is committed and ACKed independently of output admission.
Admission then streams/verifies/scans every output, retains original versioned
S3 receipts, registers the analysis from exact input IDs and actual times, and
links that analysis without approving or publishing it.

An output-admission error retains Succeeded plus persistent attention and is
retried through the worker. It does not invent a failed computation. Reference
dataset versions or a declared no-reference reason are supplied by DPS;
reference use is never inferred. Existing requirements for scientific evidence,
performance review, QC, independent approval, packages and Customer release
remain authoritative. No scientific package or Customer result is fabricated.

No new EF entity, table, column or migration is introduced. New frozen submission
metadata lives in the existing job JSON; commands, receipts, scientific files,
analysis inputs/runs and audit events use their existing records. Historical
rows are not repaired or rewritten.
