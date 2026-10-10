# POMS–DPS assembly integration: developer contract

Version: `poms-dps/1.0`. Owner-directed specification, October 10, 2026.

Status: **POMS implementation written, not built or validated; DPS implementation
and connected acceptance await Chris Yourch**. The existing dummy MQTT probe is
separate. This document defines the required behavior, rather than
reverse-engineering that probe. The Owner explicitly deferred validation runs.

## Outcome and ownership

An authorized Phaeno operator starts assembly for one specimen and one purchased
sequencing run using the exact FASTQs and processing recipe saved in POMS. DPS
reads those inputs, runs the recipe, writes verifiable outputs and reports actual
execution facts. POMS retains the attempt and file lineage, displays progress,
registers verified outputs, and supports independent scientific review and
Customer release. Execution success never constitutes scientific approval or
Customer publication.

POMS owns authorization, sample/run allocation, input admission, immutable input
manifest, attempt identity, requested recipe, result registration and release.
DPS owns durable command deduplication, scheduling, execution, actual times,
output creation, lifecycle event retries and authoritative job lookup.

## One job means one specimen/run

- `job_id` is the POMS assembly-attempt UUID, not the commercial order, batch,
  sample name or library barcode. The commercial order has two samples, so it
  creates two independent assembly attempts.
- Start and Cancel each have a stable `command_id` from the saved POMS command
  ledger. Retries use the same ID and unchanged body. A new attempt requires a
  new `job_id`; a later scientific reanalysis does not overwrite the earlier one.
- `provider_job_id` is DPS's stable execution identity. It must not change during
  retries, queries, cancellation or event replay.
- UUIDs use canonical lowercase hyphenated form. Times are actual UTC RFC 3339
  values ending in `Z`. Checksums are full-byte SHA-256, lowercase hexadecimal.
  Neither ETags nor multipart composite checksums substitute for SHA-256.

## MQTT transport

Both applications connect server-side. The Portal browser never connects to the
broker. Use explicit environment configuration, an environment-specific topic
root, distinct instance client IDs and least-privilege identities. Hosted
connections use a private TLS broker and standard certificate verification.
Local isolated contract fixtures may use a local broker. There is no automatic
public-broker fallback. No secrets or signed download URLs appear in messages.

Topic root: `phaeno/dps/v1/{environment}`, with environment `local`, `staging` or
`production`. These are **new topics**, deliberately separate from the old
`backend/data_process/...` dummy probe. Do not bridge the two automatically.

| Direction | Suffix below the root | DTO | Purpose |
| --- | --- | --- | --- |
| POMS → DPS | `commands/start` | 100 | Accept one exact assembly instruction |
| POMS → DPS | `jobs/{job_id}/commands/cancel` | 101 | Request cancellation |
| DPS → POMS | `jobs/{job_id}/events` | 102 | Lifecycle or transient progress |
| POMS → DPS | `jobs/{job_id}/commands/query` | 103 | Authoritative lookup/replay |
| DPS → POMS | `jobs/{job_id}/queries/{request_id}` | 104 | Lookup result |
| POMS → DPS | `jobs/{job_id}/acks` | 105 | Event commit/receipt acknowledgment |
| POMS → DPS | `service/describe` | 106 | Discover compatible service/recipes |
| DPS → POMS | `service/replies/{request_id}` | 107 | Capability response |
| DPS → POMS | `jobs/{job_id}/receipts` | 108 | Start/Cancel acceptance or rejection |

All payloads are UTF-8 JSON objects with `contract_version`, `environment` and
`dto_id`. Topic and payload IDs/environment must match exactly. Maximum message
size is 64 KiB; large manifests and logs belong in S3. Schema files and complete
examples are in `docs/contracts/poms-dps/v1/`. Unknown versions, fields, enum
values, invalid IDs, excessive sizes and malformed messages are rejected safely.

Use QoS 1 and retain=false for commands, lifecycle events, receipts, queries,
capabilities and acknowledgments. Subscribe before publication, restore
subscriptions after reconnect and use bounded exponential backoff. Progress may
use QoS 0, retain=false. A broker PUBACK is not business acceptance or execution.

## Meaning of data_folder and S3 inputs

`data_folder` is an **S3 URI for this attempt's control/output prefix**, ending
in `/`. It is neither a path on the operator's computer nor a folder DPS should
scan for arbitrary FASTQs. The Start command also supplies the exact
`input_manifest` object locator, version, byte size and checksum.

POMS's existing hierarchy is preserved:

```text
{configured-prefix}/customer-{organization_uuid_without_hyphens}/
  job-{lab_work_order_uuid_without_hyphens}/
  sample-{specimen_uuid_without_hyphens}/
  library-{library_uuid_without_hyphens}/
  sequencing-{fastq_set_uuid_without_hyphens}-run-001/
    raw/{existing-input-objects}
    assemblies/assembly-{attempt_uuid_without_hyphens}/
      input-manifest.json
      outputs/{new-output-objects}
      output-manifest.json
```

POMS writes one immutable `input-manifest.json` before accepting dispatch. It
freezes organization, commercial order, Lab work order, specimen, library, batch,
vendor result version, FASTQ set/version, purchased run, layout and recipe. Each
file carries its admitted scientific receipt/output IDs, original and stored
names, group/read/part, group description, read count, compression, exact S3
bucket/key/version, SHA-256 and compressed byte size.

DPS reads **only** the listed objects at their exact non-null version IDs. It
verifies manifest checksum/size, all file checksum/sizes and mapping completeness
before execution. POMS resolves and pins the exact managed S3 versions matching
its admitted receipts; it does not invent object keys from filenames. Require
bucket versioning before activation. Originals need not be copied or renamed.
FASTQs remain under their current capture; the attempt prefix holds instructions
and new outputs. Each R1/R2 part uses matching identifiers in the same order.

For the current fixture, each attempt has ten gzip files: group 1, parts 1–5,
each with R1 and R2, 100 synthetic 150-base reads per file, purchased run 1 and
new preparation. Exactly those ten files belong in each manifest. Do not combine
the two samples or treat twenty files as twenty sequencing runs.

POMS grants DPS read access to the pinned input/manifest objects and write access
only to that attempt's output prefix using server-managed identities. No bucket
wide write permission or credentials in JSON are required. DPS's access must be
verified separately from POMS's ability to upload/read the same bucket.

## Processing instructions and capabilities

Start includes `recipe` with a stable key, exact version, parameters object and
required output roles. The same recipe appears in the input manifest; a mismatch
is rejected. DPS advertises supported recipes, parameter schemas, layouts and
required output roles through Describe. POMS offers only compatible available
recipes and freezes the selected version. Parameters come from approved
configuration; neither application silently supplies a different recipe.

The actual production recipe and required scientific deliverables come from the
implemented pipeline and approved configuration. Example fixture recipe keys
are placeholders, not an assertion that a PSeq scientific recipe exists. The
server developer must supply its capability declaration and parameter schema.

## Start, command receipts and idempotency

DPS validates the command and manifest references, then atomically records the
instruction and responsibility for `job_id` before replying Accepted (DTO 108).
Acceptance does not mean execution began. It retains a hash of the instruction.
Repeating the same command returns the original receipt/execution identity;
reusing a job or command ID with changed instructions returns Rejected/Conflict.
Concurrent deliveries must never enqueue two computations.

Receipt outcomes are `Accepted`, `Rejected` or `CannotAct`. Every receipt echoes
command/job IDs, command kind, DPS occurrence time and a stable `receipt_id`.
Rejected includes a safe reason. CannotAct is meaningful for cancellation after
an execution already finished; it does not replace that final outcome.

POMS persists the request and command before sending. On an ambiguous response
or restart it queries the same job before resending. Only an authoritative
NotAccepted result permits resend, and resend retains the same command/job IDs.

## Lifecycle and transient progress

DTO 102 event types are `Accepted`, `Running`, `Progress`, `Succeeded`, `Failed`,
`Terminated` or `CancelledBeforeStart`. Use named strings, never guessed numeric
status codes. Each event has a stable `event_id`, monotonically increasing
per-job `sequence`, `provider_job_id` and DPS `occurred_at_utc`.

- Accepted has no start/stop/disposition time.
- Running means execution actually started and requires `started_at_utc`.
- Progress requires confirmed start and a percentage in [0,100]. It never
  advances execution state, creates history or establishes completion. POMS
  keeps only its latest fresh in-memory value. It may acknowledge `received`
  without a database write; DPS need not replay stale percentages.
- Succeeded/Failed/Terminated require actual start, stop and disposition times,
  ordered start ≤ stop ≤ disposition. Failure/termination includes a safe reason.
- CancelledBeforeStart requires `never_started=true`, null start/stop and an
  actual disposition time. A cancellation request alone is not this outcome.
- Succeeded also requires the immutable output-manifest locator.

Event IDs and bodies remain unchanged on retry. Progress and older nonterminal
events never overwrite a committed terminal outcome. Actual execution times are
distinct from POMS recording/receipt times; receipt time is never substituted.

POMS maps lifecycle evidence through its existing receipt/attempt services.
Different terminal evidence for the same event or attempt requires reconciliation
and cannot silently alter the saved result.

## Output handoff

DPS writes new immutable output objects inside the authorized `outputs/` prefix,
records complete-file SHA-256 and byte size and reads them back to verify storage.
It then writes a versioned `output-manifest.json`. Publish Succeeded only after
all required recipe outputs and the manifest are durably available.

The output manifest binds the job, provider execution, sample/run, recipe and
**input-manifest checksum**, actual start/stop times and engine/tool provenance.
Provenance requires `reference_data` and `reference_data_not_applicable`: provide
actual named/versioned reference datasets (with an optional checksum) and a null
no-reference reason, or an empty reference list and an explicit producer-declared
no-reference reason. POMS does not infer that a reference-free workflow ran.
These declarations satisfy attribution fields, not independent scientific approval.
Each output has a stable artifact UUID, configured role, format, stored filename,
exact S3 locator/version, SHA-256 and size. Required scientific output roles are
declared by the recipe. Diagnostic files are not silently treated as deliverables.

POMS checks manifest binding, destination prefix, exact bytes, scan admission
and required roles before registering the analysis/files through its existing
scientific capture path. Failed registration remains an actionable handoff
issue; it does not falsify DPS's already committed execution outcome. DPS cannot
approve QC, make a specimen delivered, invoice a new run or publish Customer
files. Customer retention does not erase internal execution/file evidence.

## Cancellation, lookup and acknowledgments

Cancel uses its own stable command ID and a safe reason. Accepted means DPS saved
the cancellation request. A running job remains running until an authoritative
final event arrives. If success wins the race, save Success; never replace it
with a fabricated cancellation.

Query must read DPS's durable job ledger. Found returns the latest **original**
lifecycle event (unchanged event ID/sequence/body), applicable command receipts
and optional fresh progress. NotAccepted means DPS authoritatively has no
accepted instruction for this ID. Unavailable/timeout means uncertainty, not
NotAccepted. Absence of a retained MQTT message proves neither fact.

For lifecycle events POMS returns DTO 105 `committed` only after the owning DB
transaction commits. Exact replays receive the same committed receipt identity.
Conflicting evidence gets `conflict`; invalid scoped evidence gets `rejected`.
Neither is a successful commit acknowledgment. DPS retains the final event in a
durable outbox across restarts and retries until committed. Do not acknowledge
an unknown job by creating a POMS attempt from the incoming event.

Defaults: Run receipt 5 minutes; actual start confirmation 10 minutes after
acceptance; cancellation confirmation 5 minutes; retry delay 5 seconds growing
to 60 seconds. POMS shows persistent uncertainty and continues reconciliation.
After 30 minutes without final commit acknowledgment, DPS logs one active
escalation and alerts the configured Operations destination independently of
POMS, then **continues retrying**. Actual alert recipients are deployment config.
No secret, raw sequence or private address is placed in operational messages.

## Developer implementation checklist and acceptance

1. Implement schema/version validation, explicit broker/environment config and
   Describe with real recipe/schema/output requirements.
2. Implement Start/Cancel durable deduplication, business receipts and job lookup.
3. Resolve the pinned S3 manifest/inputs and verify DPS access and all bytes.
4. Execute the requested recipe, report actual times and transient progress,
   publish durable lifecycle events and write verifiable outputs/manifests.
5. Implement commit acknowledgment handling, restart recovery, cancellation
   races, continuing retries and the independent 30-minute alert.
6. Demonstrate two separate jobs for the supplied two-sample fixture, ten files
   per job, with exact specimen/run/manifest binding. Transport-fixture payloads
   have synthetic locators/checksums and must not be mistaken for executable jobs.
7. Prove duplicate Start launches once; changed replay is rejected; POMS downtime
   preserves the final event; a restart/query recovers the original evidence;
   success/cancel races retain the real final result; unknown/cross-environment
   messages cannot change another job; progress=100 alone cannot mark success.
8. Prove tampered/missing/extra/mispaired inputs prevent execution and changed,
   missing or out-of-prefix outputs prevent scientific registration.

POMS source now implements provider/transport and availability mapping, exact
versioned S3 input/parameter manifests, Describe/receipt/query/event/ACK mapping,
initial Start and Cancel dispatch errors, saved-attempt UI recovery, and scanned
output/analysis admission. Default connection/worker settings remain disabled;
no server connection or execution was attempted. Chris-dependent contract
acceptance, compilation and validation are outstanding. Each application must
prove its implementation before activation. Production deployment retains its
separate repository approval gate.

The initial POMS adapter supports admitted versioned S3 inputs on commercial Lab
Jobs, one complete sealed FASTQ set per attempt. Trial-specific source scope
requires a contract extension. Existing scientific evidence limits permit at
most 63 required output documents plus the parameters document; compatible
recipes must observe that bound. POMS still requires scientific review for any
reference-data, QC or other missing evidence; producer metadata is not approval.

## Current acceptance case

Order **739XKNR4**, one phase, two synthetic samples, batch
**PH-BAT-20261010-N2YN6WU2**, Results v1. Both libraries saved Success.

| Sample | Specimen UUID | Library barcode | Purchased run | Files |
| --- | --- | --- | --- | --- |
| UI-20261010-01 | caff0091-6f41-46ab-aff5-3e2634e49698 | PH-L-GQXNCJRKP2-A | 1 | 10 gzip FASTQs, 5 R1/R2 pairs |
| UI-20261010-02 | 0999d086-d1a1-456d-a4f4-d0ae06b780b5 | PH-L-5M2FHJ27XL-R | 1 | 10 gzip FASTQs, 5 R1/R2 pairs |

Commercial order UUID: `592cd408-f968-452f-8082-09c037642f74`.
Lab work order UUID: `07289da4-0361-4ef9-a475-89c3ecf2b9ae`.
Batch UUID: `1d0291ea-09f4-44f0-848e-83014141d2c8`.
The handoff includes the exact UI-observed filenames, mappings, sizes, read counts
and SHA-256 values, plus the original synthetic FASTQ ZIP. S3 keys/versions and
unexposed internal IDs are not guessed; POMS resolves them from admitted receipts
when creating the actual assembly instructions. No assembly has been dispatched.
