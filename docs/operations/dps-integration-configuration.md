# DPS integration configuration

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

The ignored `backend/app/appsettings.Development.json` holds this computer's
enabled DPS settings: local environment, host `127.0.0.1`, port `11883`, TLS off
on the loopback connection, the declared test recipe, and the assembly worker
enabled. The remote part of the connection is encrypted by SSH. Shared defaults
remain disabled/unconfigured. `Dps:S3` supplies the separate handoff bucket,
region, prefix and protected server-side credential profile. Application files
remain in Local storage. The S3 guard now applies to that explicit processing
destination rather than requiring an application-wide storage cutover.

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
11883 to the EC2 broker's port 1883, and removes its account-restricted temporary key copy when the API
stops. It rejects an occupied tunnel port and never changes the original key's
permissions. The EC2 hostname can change when the instance is restarted. Do not
start a second API instance on these ports while the launcher is running.

The EC2 Mosquitto process currently listens on both 1883 and 11883. DPS uses
`127.0.0.1:11883` on EC2; the local API uses `127.0.0.1:11883` on this computer.
The supplied `-L 11883:localhost:1883` convention forwards local 11883 to remote
1883. Both remote ports reach the same broker.

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
| `Dps:Host`, `Dps:Port` | Explicit bare broker host/IP and port; default port 8883 |
| `Dps:UseTls` | True by default; plaintext is restricted to a loopback broker in `local` |
| `Dps:ClientId` | Unique per concurrently running API instance; blank generates a process-instance identity stable across reconnects |
| `Dps:Username`, `Dps:Password` | Optional matching credential pair, supplied outside source |
| `Dps:ClientCertificatePath`, `Dps:ClientCertificatePassword` | Optional PKCS#12 identity, loaded with ephemeral key storage; supplied outside source |
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
The complete secret settings belong in the environment's existing secret
configuration mechanism, never in a recipe, manifest, browser payload or log.
Invalid/missing DPS configuration leaves assembly unavailable without preventing
the rest of the API from starting.

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
