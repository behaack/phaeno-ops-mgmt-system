# DPS integration configuration

Implementation status, October 10, 2026: POMS source and regression sources compile
in the full Release solution with zero warnings/errors during release preparation.
Tests and connected validation remain deferred at the Owner's request. No connection,
command, S3 handoff or output-admission operation has been exercised. This guide
describes the implemented configuration, not evidence of a working deployment.

The API uses MQTTnet 5.2.0.1603 and the embedded POMS–DPS 1.0 JSON schema. The
browser uses the existing authenticated API and scoped SignalR notifications.
No Clerk authentication or authorization rule is changed.

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

The initial adapter requires a commercial Lab Job and one complete sealed FASTQ
set per specimen/purchased run, stored in versioned S3. Trial scope needs a
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
