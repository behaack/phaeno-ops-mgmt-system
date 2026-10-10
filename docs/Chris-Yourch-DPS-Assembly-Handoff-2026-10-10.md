# DPS assembly handoff for Chris Yourch

To: **Chris Yourch**  
Date: October 10, 2026

Chris,

Please implement the POMS–DPS assembly interface specified below. POMS already
holds the two samples' verified FASTQ files and saved sequencing results. The
next milestone is two independent assembly jobs with ten input files each.

This document contains the full specification, representative JSON payloads
and the complete machine-readable schema, so it can be forwarded on its own.
The optional companion ZIP contains all 22 examples and the original synthetic
FASTQs: [Developer handoff package](dps-developer-handoff-20261010.zip).

The specification is the required new contract. It does not describe an already
connected service. All example S3 locations, recipe/execution details and
unresolved internal IDs are fixtures; actual file locations and identities must
be resolved from POMS's admitted receipts. Examples must not be submitted as real
assembly jobs. Scientific approval and Customer release remain separate.


## Full developer specification

Version: `poms-dps/1.0`. Owner-directed specification, October 10, 2026.

Status: **ready for DPS developer implementation; neither server implements this
wire contract yet**. The existing dummy MQTT probe is separate. This document
defines the required behavior, rather than reverse-engineering that probe.

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

POMS work after DPS adopts this contract: implement the provider/transport and
service availability mapping, resolve/pin exact input objects, write the manifest,
map Describe/receipts/query/events/acks to the existing command/recovery services,
register verified output evidence and complete the connected UI journey. No
provider activation, production deployment or broker-access expansion is
authorized by publication of this document. Each application must prove its
implementation; this handoff does not claim either is already connected.

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


## Representative JSON payloads

These examples illustrate the required fields and structure. Alternative outcomes
are not a single sequence of events. All example object locations are artificial.


### Service capabilities

```json
{
  "contract_version": "poms-dps/1.0",
  "environment": "local",
  "dto_id": 107,
  "request_id": "d7f7e2db-ed0d-58ac-bfff-0144d2e3eb8f",
  "service_key": "dps",
  "instance_id": "example-dps-instance",
  "available": true,
  "message": "Contract fixture only; not a real service advertisement.",
  "supports_idempotent_start": true,
  "supports_authoritative_query": true,
  "supports_cancellation": true,
  "recipes": [
    {
      "key": "example-assembly-recipe",
      "name": "Example recipe for schema review only",
      "version": "fixture-1",
      "parameters_schema": {
        "type": "object",
        "properties": {
          "fixture_only": {
            "const": true
          }
        },
        "required": [
          "fixture_only"
        ],
        "additionalProperties": false
      },
      "supported_read_layouts": [
        "PairedEnd"
      ],
      "required_output_roles": [
        "assembly_output",
        "provenance_report"
      ]
    }
  ]
}
```


### Sample 1 Start command

```json
{
  "contract_version": "poms-dps/1.0",
  "environment": "local",
  "dto_id": 100,
  "command_id": "cc5f5c71-27b3-5870-8861-21d1416af74c",
  "job_id": "1476fdca-9f62-5779-b160-f4f0465595b0",
  "requested_at_utc": "2026-10-10T18:00:01Z",
  "data_folder": "s3://example-contract-fixture-not-real/fixture/assemblies/assembly-1476fdca-9f62-5779-b160-f4f0465595b0/",
  "input_manifest": {
    "bucket": "example-contract-fixture-not-real",
    "region": "us-east-2",
    "key": "fixture/assemblies/assembly-1476fdca-9f62-5779-b160-f4f0465595b0/input-manifest.json",
    "version_id": "fixture-version-not-real",
    "sha256": "48a8522ac277e47ee107230ace705d07e05d823ebb58da552a772c0d70daf740",
    "size_bytes": 10390
  },
  "recipe": {
    "key": "example-assembly-recipe",
    "version": "fixture-1",
    "parameters": {
      "fixture_only": true
    },
    "required_output_roles": [
      "assembly_output",
      "provenance_report"
    ]
  }
}
```


### Sample 1 complete input manifest

```json
{
  "contract_version": "poms-dps/1.0",
  "environment": "local",
  "document_type": "input_manifest",
  "job_id": "1476fdca-9f62-5779-b160-f4f0465595b0",
  "created_at_utc": "2026-10-10T18:00:00Z",
  "scope": {
    "organization_id": "82e39acb-fef9-426b-89a1-ab7dfd4e1bb8",
    "commercial_order_id": "592cd408-f968-452f-8082-09c037642f74",
    "lab_work_order_id": "07289da4-0361-4ef9-a475-89c3ecf2b9ae",
    "specimen_id": "caff0091-6f41-46ab-aff5-3e2634e49698",
    "library_id": "f5b731cf-6fb6-5011-afb2-8741d5b5c388",
    "sequencing_batch_id": "1d0291ea-09f4-44f0-848e-83014141d2c8",
    "vendor_results_version": 1,
    "fastq_set_id": "9d2d3cf8-ced2-45bd-bb5d-d82f4be8b02f",
    "fastq_set_version": 1,
    "sequencing_run_number": 1
  },
  "read_layout": "PairedEnd",
  "recipe": {
    "key": "example-assembly-recipe",
    "version": "fixture-1",
    "parameters": {
      "fixture_only": true
    },
    "required_output_roles": [
      "assembly_output",
      "provenance_report"
    ]
  },
  "files": [
    {
      "file_id": "49e7bd4b-c65f-5b11-8ff6-13e0680ac7c9",
      "sequencing_output_id": "99fd9bf8-0713-5d64-9687-cc0b26e0e838",
      "original_file_name": "UI-20261010-01_S1_L001_R1_001.fastq.gz",
      "stored_file_name": "PH-L-GQXNCJRKP2-A__9d2d3cf8ced245bdbb5dd82f4be8b02f__F001__G001__R1__P001.fastq.gz",
      "group_number": 1,
      "read_number": 1,
      "part_number": 1,
      "group_description": "MOCK-FLOWCELL-739XKNR4 / L001",
      "read_count": 100,
      "compression": "gzip",
      "s3": {
        "bucket": "example-contract-fixture-not-real",
        "region": "us-east-2",
        "key": "fixture/raw/PH-L-GQXNCJRKP2-A__9d2d3cf8ced245bdbb5dd82f4be8b02f__F001__G001__R1__P001.fastq.gz",
        "version_id": "fixture-version-not-real",
        "sha256": "be085ae2017e0fa2d16afcc841b593476e4f17509439a627e13c8c4d32bf10a9",
        "size_bytes": 5644
      }
    },
    {
      "file_id": "2497328f-bc16-5031-a025-2f8b61ef6a0c",
      "sequencing_output_id": "b36ca78b-4ad0-5505-9fc6-c9ebbf565307",
      "original_file_name": "UI-20261010-01_S1_L001_R2_001.fastq.gz",
      "stored_file_name": "PH-L-GQXNCJRKP2-A__9d2d3cf8ced245bdbb5dd82f4be8b02f__F001__G001__R2__P001.fastq.gz",
      "group_number": 1,
      "read_number": 2,
      "part_number": 1,
      "group_description": "MOCK-FLOWCELL-739XKNR4 / L001",
      "read_count": 100,
      "compression": "gzip",
      "s3": {
        "bucket": "example-contract-fixture-not-real",
        "region": "us-east-2",
        "key": "fixture/raw/PH-L-GQXNCJRKP2-A__9d2d3cf8ced245bdbb5dd82f4be8b02f__F001__G001__R2__P001.fastq.gz",
        "version_id": "fixture-version-not-real",
        "sha256": "9e7a44f8ebad5502fd0d39a1bf45b7a2ac09a1d39bd646df8173bfc2e8281be1",
        "size_bytes": 5648
      }
    },
    {
      "file_id": "5f7a38bb-c5df-54a0-97df-2609296f444a",
      "sequencing_output_id": "6c86928e-9834-5d72-8e92-d5e301b3d9ee",
      "original_file_name": "UI-20261010-01_S1_L001_R1_002.fastq.gz",
      "stored_file_name": "PH-L-GQXNCJRKP2-A__9d2d3cf8ced245bdbb5dd82f4be8b02f__F001__G001__R1__P002.fastq.gz",
      "group_number": 1,
      "read_number": 1,
      "part_number": 2,
      "group_description": "MOCK-FLOWCELL-739XKNR4 / L001",
      "read_count": 100,
      "compression": "gzip",
      "s3": {
        "bucket": "example-contract-fixture-not-real",
        "region": "us-east-2",
        "key": "fixture/raw/PH-L-GQXNCJRKP2-A__9d2d3cf8ced245bdbb5dd82f4be8b02f__F001__G001__R1__P002.fastq.gz",
        "version_id": "fixture-version-not-real",
        "sha256": "de62a0b203677d2bf79ecc0d6a6b918437869a2b122df2a61c91824dce97491b",
        "size_bytes": 5660
      }
    },
    {
      "file_id": "205c5ab6-a3aa-5fbc-b550-84ee8ea32054",
      "sequencing_output_id": "83772b60-5514-5341-81d8-91da61def166",
      "original_file_name": "UI-20261010-01_S1_L001_R2_002.fastq.gz",
      "stored_file_name": "PH-L-GQXNCJRKP2-A__9d2d3cf8ced245bdbb5dd82f4be8b02f__F001__G001__R2__P002.fastq.gz",
      "group_number": 1,
      "read_number": 2,
      "part_number": 2,
      "group_description": "MOCK-FLOWCELL-739XKNR4 / L001",
      "read_count": 100,
      "compression": "gzip",
      "s3": {
        "bucket": "example-contract-fixture-not-real",
        "region": "us-east-2",
        "key": "fixture/raw/PH-L-GQXNCJRKP2-A__9d2d3cf8ced245bdbb5dd82f4be8b02f__F001__G001__R2__P002.fastq.gz",
        "version_id": "fixture-version-not-real",
        "sha256": "d1ccdce9cf833e0bec8a176ae06d4c2f8ca2a63a10792a63fd6c1ba928935c1b",
        "size_bytes": 5665
      }
    },
    {
      "file_id": "2cd89b89-0177-5465-8a8d-5314a47a4324",
      "sequencing_output_id": "8464b6d2-f88f-5dce-86ff-a7e6d789fce5",
      "original_file_name": "UI-20261010-01_S1_L001_R1_003.fastq.gz",
      "stored_file_name": "PH-L-GQXNCJRKP2-A__9d2d3cf8ced245bdbb5dd82f4be8b02f__F001__G001__R1__P003.fastq.gz",
      "group_number": 1,
      "read_number": 1,
      "part_number": 3,
      "group_description": "MOCK-FLOWCELL-739XKNR4 / L001",
      "read_count": 100,
      "compression": "gzip",
      "s3": {
        "bucket": "example-contract-fixture-not-real",
        "region": "us-east-2",
        "key": "fixture/raw/PH-L-GQXNCJRKP2-A__9d2d3cf8ced245bdbb5dd82f4be8b02f__F001__G001__R1__P003.fastq.gz",
        "version_id": "fixture-version-not-real",
        "sha256": "b53a8f63addbe9aff82a5628a212a7246695c35257290290dc1b62fe67e7d558",
        "size_bytes": 5660
      }
    },
    {
      "file_id": "980d868c-2cb0-5dd1-b84c-bc5663fd95b3",
      "sequencing_output_id": "9a59d31a-5d0c-5ccc-973c-1a6b7d29ee0f",
      "original_file_name": "UI-20261010-01_S1_L001_R2_003.fastq.gz",
      "stored_file_name": "PH-L-GQXNCJRKP2-A__9d2d3cf8ced245bdbb5dd82f4be8b02f__F001__G001__R2__P003.fastq.gz",
      "group_number": 1,
      "read_number": 2,
      "part_number": 3,
      "group_description": "MOCK-FLOWCELL-739XKNR4 / L001",
      "read_count": 100,
      "compression": "gzip",
      "s3": {
        "bucket": "example-contract-fixture-not-real",
        "region": "us-east-2",
        "key": "fixture/raw/PH-L-GQXNCJRKP2-A__9d2d3cf8ced245bdbb5dd82f4be8b02f__F001__G001__R2__P003.fastq.gz",
        "version_id": "fixture-version-not-real",
        "sha256": "f143fa07ba692f1744d6cd6cb3aa87a9d8b26f62fa13e256ffe443f348a3736f",
        "size_bytes": 5656
      }
    },
    {
      "file_id": "911c72be-19f7-5b07-aac9-c199327a7ba6",
      "sequencing_output_id": "202e5995-eb35-5e01-9e44-0acf90d30822",
      "original_file_name": "UI-20261010-01_S1_L001_R1_004.fastq.gz",
      "stored_file_name": "PH-L-GQXNCJRKP2-A__9d2d3cf8ced245bdbb5dd82f4be8b02f__F001__G001__R1__P004.fastq.gz",
      "group_number": 1,
      "read_number": 1,
      "part_number": 4,
      "group_description": "MOCK-FLOWCELL-739XKNR4 / L001",
      "read_count": 100,
      "compression": "gzip",
      "s3": {
        "bucket": "example-contract-fixture-not-real",
        "region": "us-east-2",
        "key": "fixture/raw/PH-L-GQXNCJRKP2-A__9d2d3cf8ced245bdbb5dd82f4be8b02f__F001__G001__R1__P004.fastq.gz",
        "version_id": "fixture-version-not-real",
        "sha256": "f6cb64d6bef7ee951dcc66433846effbe6768ef5c1c786d964816cd9faadc1f1",
        "size_bytes": 5653
      }
    },
    {
      "file_id": "00ac5689-9ef2-5b85-a1f0-6e17455ea12f",
      "sequencing_output_id": "3c32717b-fe4d-55e1-b080-4c0634689889",
      "original_file_name": "UI-20261010-01_S1_L001_R2_004.fastq.gz",
      "stored_file_name": "PH-L-GQXNCJRKP2-A__9d2d3cf8ced245bdbb5dd82f4be8b02f__F001__G001__R2__P004.fastq.gz",
      "group_number": 1,
      "read_number": 2,
      "part_number": 4,
      "group_description": "MOCK-FLOWCELL-739XKNR4 / L001",
      "read_count": 100,
      "compression": "gzip",
      "s3": {
        "bucket": "example-contract-fixture-not-real",
        "region": "us-east-2",
        "key": "fixture/raw/PH-L-GQXNCJRKP2-A__9d2d3cf8ced245bdbb5dd82f4be8b02f__F001__G001__R2__P004.fastq.gz",
        "version_id": "fixture-version-not-real",
        "sha256": "80401fd3adc0ae8ee56633ef2e9ff724dc5cceb503cfad0620970b4597a24f00",
        "size_bytes": 5656
      }
    },
    {
      "file_id": "ed214cef-8f66-52cf-ad67-c8d299596432",
      "sequencing_output_id": "fa503e07-67ee-5093-af83-731b0a24fb10",
      "original_file_name": "UI-20261010-01_S1_L001_R1_005.fastq.gz",
      "stored_file_name": "PH-L-GQXNCJRKP2-A__9d2d3cf8ced245bdbb5dd82f4be8b02f__F001__G001__R1__P005.fastq.gz",
      "group_number": 1,
      "read_number": 1,
      "part_number": 5,
      "group_description": "MOCK-FLOWCELL-739XKNR4 / L001",
      "read_count": 100,
      "compression": "gzip",
      "s3": {
        "bucket": "example-contract-fixture-not-real",
        "region": "us-east-2",
        "key": "fixture/raw/PH-L-GQXNCJRKP2-A__9d2d3cf8ced245bdbb5dd82f4be8b02f__F001__G001__R1__P005.fastq.gz",
        "version_id": "fixture-version-not-real",
        "sha256": "cab48cff088161e98641a72f80d15a6864139a72f75d44c012d734622efca3b9",
        "size_bytes": 5656
      }
    },
    {
      "file_id": "0bbacef7-1a34-5a98-915a-1a3c78344720",
      "sequencing_output_id": "a15373b7-96d0-5b2e-b5a2-9fe70a1ac9f5",
      "original_file_name": "UI-20261010-01_S1_L001_R2_005.fastq.gz",
      "stored_file_name": "PH-L-GQXNCJRKP2-A__9d2d3cf8ced245bdbb5dd82f4be8b02f__F001__G001__R2__P005.fastq.gz",
      "group_number": 1,
      "read_number": 2,
      "part_number": 5,
      "group_description": "MOCK-FLOWCELL-739XKNR4 / L001",
      "read_count": 100,
      "compression": "gzip",
      "s3": {
        "bucket": "example-contract-fixture-not-real",
        "region": "us-east-2",
        "key": "fixture/raw/PH-L-GQXNCJRKP2-A__9d2d3cf8ced245bdbb5dd82f4be8b02f__F001__G001__R2__P005.fastq.gz",
        "version_id": "fixture-version-not-real",
        "sha256": "fb464ef44798df790f9c21cd514a0cbe68b31bbebdf9833e9feb7fbb3f070c4b",
        "size_bytes": 5648
      }
    }
  ],
  "output_destination": {
    "bucket": "example-contract-fixture-not-real",
    "region": "us-east-2",
    "prefix": "fixture/assemblies/assembly-1476fdca-9f62-5779-b160-f4f0465595b0/outputs/"
  }
}
```


### Start acceptance receipt

```json
{
  "contract_version": "poms-dps/1.0",
  "environment": "local",
  "dto_id": 108,
  "receipt_id": "4f7eb479-002f-5f48-8794-ba0cc58f7527",
  "command_id": "cc5f5c71-27b3-5870-8861-21d1416af74c",
  "job_id": "1476fdca-9f62-5779-b160-f4f0465595b0",
  "command_kind": "Start",
  "outcome": "Accepted",
  "provider_job_id": "fixture-execution-01",
  "occurred_at_utc": "2026-10-10T18:00:02Z",
  "reason": null
}
```


### Actual execution started

```json
{
  "contract_version": "poms-dps/1.0",
  "environment": "local",
  "dto_id": 102,
  "event_id": "e3d1c59c-568c-5d2f-9ca0-beb8f1ad31d6",
  "job_id": "1476fdca-9f62-5779-b160-f4f0465595b0",
  "provider_job_id": "fixture-execution-01",
  "sequence": 2,
  "event_type": "Running",
  "occurred_at_utc": "2026-10-10T18:01:00Z",
  "started_at_utc": "2026-10-10T18:01:00Z",
  "stopped_at_utc": null,
  "disposition_at_utc": null,
  "never_started": false,
  "percentage": null,
  "reason": null,
  "output_manifest": null
}
```


### Transient progress

```json
{
  "contract_version": "poms-dps/1.0",
  "environment": "local",
  "dto_id": 102,
  "event_id": "d84bd641-f0e4-5a9e-a215-382a698ad945",
  "job_id": "1476fdca-9f62-5779-b160-f4f0465595b0",
  "provider_job_id": "fixture-execution-01",
  "sequence": 3,
  "event_type": "Progress",
  "occurred_at_utc": "2026-10-10T18:01:00Z",
  "started_at_utc": "2026-10-10T18:01:00Z",
  "stopped_at_utc": null,
  "disposition_at_utc": null,
  "never_started": false,
  "percentage": 40,
  "reason": null,
  "output_manifest": null
}
```


### Successful execution

```json
{
  "contract_version": "poms-dps/1.0",
  "environment": "local",
  "dto_id": 102,
  "event_id": "0a4e9780-efa0-5ae1-bc7e-4a48badfb583",
  "job_id": "1476fdca-9f62-5779-b160-f4f0465595b0",
  "provider_job_id": "fixture-execution-01",
  "sequence": 4,
  "event_type": "Succeeded",
  "occurred_at_utc": "2026-10-10T18:02:10Z",
  "started_at_utc": "2026-10-10T18:01:00Z",
  "stopped_at_utc": "2026-10-10T18:02:00Z",
  "disposition_at_utc": "2026-10-10T18:02:10Z",
  "never_started": false,
  "percentage": null,
  "reason": null,
  "output_manifest": {
    "bucket": "example-contract-fixture-not-real",
    "region": "us-east-2",
    "key": "fixture/assemblies/assembly-1476fdca-9f62-5779-b160-f4f0465595b0/output-manifest.json",
    "version_id": "fixture-version-not-real",
    "sha256": "662b3e9ce65e3a064a9302a78c72cc6117061feba4ef12a0e9268cd77f2cef14",
    "size_bytes": 2638
  }
}
```


### Complete output manifest

```json
{
  "contract_version": "poms-dps/1.0",
  "environment": "local",
  "document_type": "output_manifest",
  "job_id": "1476fdca-9f62-5779-b160-f4f0465595b0",
  "provider_job_id": "fixture-execution-01",
  "scope": {
    "organization_id": "82e39acb-fef9-426b-89a1-ab7dfd4e1bb8",
    "commercial_order_id": "592cd408-f968-452f-8082-09c037642f74",
    "lab_work_order_id": "07289da4-0361-4ef9-a475-89c3ecf2b9ae",
    "specimen_id": "caff0091-6f41-46ab-aff5-3e2634e49698",
    "library_id": "f5b731cf-6fb6-5011-afb2-8741d5b5c388",
    "sequencing_batch_id": "1d0291ea-09f4-44f0-848e-83014141d2c8",
    "vendor_results_version": 1,
    "fastq_set_id": "9d2d3cf8-ced2-45bd-bb5d-d82f4be8b02f",
    "fastq_set_version": 1,
    "sequencing_run_number": 1
  },
  "recipe": {
    "key": "example-assembly-recipe",
    "version": "fixture-1",
    "parameters": {
      "fixture_only": true
    },
    "required_output_roles": [
      "assembly_output",
      "provenance_report"
    ]
  },
  "input_manifest_sha256": "48a8522ac277e47ee107230ace705d07e05d823ebb58da552a772c0d70daf740",
  "started_at_utc": "2026-10-10T18:01:00Z",
  "stopped_at_utc": "2026-10-10T18:02:00Z",
  "created_at_utc": "2026-10-10T18:02:05Z",
  "provenance": {
    "engine": "example-engine",
    "engine_version": "fixture-1",
    "tools": [
      {
        "name": "example-tool",
        "version": "fixture-1"
      }
    ],
    "container_images": []
  },
  "outputs": [
    {
      "artifact_id": "2c51d791-89a7-565b-9f76-7650aae2e2db",
      "role": "assembly_output",
      "format": "FASTA",
      "file_name": "fixture-output.fasta",
      "s3": {
        "bucket": "example-contract-fixture-not-real",
        "region": "us-east-2",
        "key": "fixture/assemblies/assembly-1476fdca-9f62-5779-b160-f4f0465595b0/outputs/fixture-output.fasta",
        "version_id": "fixture-version-not-real",
        "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "size_bytes": 100
      }
    },
    {
      "artifact_id": "12fdf6f6-34b5-5391-a03c-412b8176275a",
      "role": "provenance_report",
      "format": "JSON",
      "file_name": "fixture-provenance.json",
      "s3": {
        "bucket": "example-contract-fixture-not-real",
        "region": "us-east-2",
        "key": "fixture/assemblies/assembly-1476fdca-9f62-5779-b160-f4f0465595b0/outputs/fixture-provenance.json",
        "version_id": "fixture-version-not-real",
        "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "size_bytes": 100
      }
    }
  ]
}
```


### Commit acknowledgment

```json
{
  "contract_version": "poms-dps/1.0",
  "environment": "local",
  "dto_id": 105,
  "event_id": "0a4e9780-efa0-5ae1-bc7e-4a48badfb583",
  "job_id": "1476fdca-9f62-5779-b160-f4f0465595b0",
  "status": "committed",
  "receipt_id": "4dffc868-dbcd-5932-a4d1-0727cff5639d",
  "reason": null
}
```


### Cancellation request

```json
{
  "contract_version": "poms-dps/1.0",
  "environment": "local",
  "dto_id": 101,
  "command_id": "07fb67a0-69da-54c6-8f4e-2c64251958f6",
  "job_id": "1476fdca-9f62-5779-b160-f4f0465595b0",
  "requested_at_utc": "2026-10-10T18:01:30Z",
  "reason": "Example operator cancellation request."
}
```


### Authoritative lookup request

```json
{
  "contract_version": "poms-dps/1.0",
  "environment": "local",
  "dto_id": 103,
  "request_id": "396ccd46-c8bc-5066-8de7-300f508525a1",
  "job_id": "1476fdca-9f62-5779-b160-f4f0465595b0"
}
```


### Authoritative NotAccepted reply

```json
{
  "contract_version": "poms-dps/1.0",
  "environment": "local",
  "dto_id": 104,
  "request_id": "396ccd46-c8bc-5066-8de7-300f508525a1",
  "job_id": "1476fdca-9f62-5779-b160-f4f0465595b0",
  "status": "NotAccepted",
  "event": null,
  "command_receipts": [],
  "latest_progress": null,
  "reason": null
}
```


## Complete JSON Schema

JSON Schema Draft 2020-12; enforce UUID and date-time formats. Semantic integrity,
lineage, topic scope and chronological checks from the specification also apply.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:phaeno:poms-dps:1.0",
  "title": "POMS–DPS 1.0 developer contract",
  "oneOf": [
    {
      "$ref": "#/$defs/start"
    },
    {
      "$ref": "#/$defs/cancel"
    },
    {
      "$ref": "#/$defs/event"
    },
    {
      "$ref": "#/$defs/query"
    },
    {
      "$ref": "#/$defs/query_response"
    },
    {
      "$ref": "#/$defs/event_ack"
    },
    {
      "$ref": "#/$defs/describe"
    },
    {
      "$ref": "#/$defs/capabilities"
    },
    {
      "$ref": "#/$defs/command_receipt"
    },
    {
      "$ref": "#/$defs/input_manifest"
    },
    {
      "$ref": "#/$defs/output_manifest"
    }
  ],
  "$defs": {
    "s3_object": {
      "type": "object",
      "properties": {
        "bucket": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255
        },
        "region": {
          "type": "string",
          "minLength": 1,
          "maxLength": 64
        },
        "key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 1024
        },
        "version_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 1024,
          "not": {
            "const": "null"
          }
        },
        "sha256": {
          "type": "string",
          "minLength": 1,
          "maxLength": 64,
          "pattern": "^[0-9a-f]{64}$"
        },
        "size_bytes": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9223372036854775807
        }
      },
      "required": [
        "bucket",
        "region",
        "key",
        "version_id",
        "sha256",
        "size_bytes"
      ],
      "additionalProperties": false
    },
    "recipe": {
      "type": "object",
      "properties": {
        "key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100
        },
        "version": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100
        },
        "parameters": {
          "type": "object"
        },
        "required_output_roles": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 64,
            "pattern": "^[a-z][a-z0-9_]*$"
          },
          "minItems": 1,
          "maxItems": 64,
          "uniqueItems": true
        }
      },
      "required": [
        "key",
        "version",
        "parameters",
        "required_output_roles"
      ],
      "additionalProperties": false
    },
    "scope": {
      "type": "object",
      "properties": {
        "organization_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "commercial_order_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "lab_work_order_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "specimen_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "library_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "sequencing_batch_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "vendor_results_version": {
          "type": "integer",
          "minimum": 1,
          "maximum": 2147483647
        },
        "fastq_set_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "fastq_set_version": {
          "type": "integer",
          "minimum": 1,
          "maximum": 2147483647
        },
        "sequencing_run_number": {
          "type": "integer",
          "minimum": 1,
          "maximum": 2147483647
        }
      },
      "required": [
        "organization_id",
        "commercial_order_id",
        "lab_work_order_id",
        "specimen_id",
        "library_id",
        "sequencing_batch_id",
        "vendor_results_version",
        "fastq_set_id",
        "fastq_set_version",
        "sequencing_run_number"
      ],
      "additionalProperties": false
    },
    "input_file": {
      "type": "object",
      "properties": {
        "file_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "sequencing_output_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "original_file_name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 1024
        },
        "stored_file_name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 1024
        },
        "group_number": {
          "type": "integer",
          "minimum": 1,
          "maximum": 2147483647
        },
        "read_number": {
          "enum": [
            1,
            2
          ]
        },
        "part_number": {
          "type": "integer",
          "minimum": 1,
          "maximum": 2147483647
        },
        "group_description": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255
        },
        "read_count": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9223372036854775807
        },
        "compression": {
          "enum": [
            "gzip",
            "none"
          ]
        },
        "s3": {
          "$ref": "#/$defs/s3_object"
        }
      },
      "required": [
        "file_id",
        "sequencing_output_id",
        "original_file_name",
        "stored_file_name",
        "group_number",
        "read_number",
        "part_number",
        "group_description",
        "read_count",
        "compression",
        "s3"
      ],
      "additionalProperties": false
    },
    "input_manifest": {
      "type": "object",
      "properties": {
        "contract_version": {
          "const": "poms-dps/1.0"
        },
        "environment": {
          "enum": [
            "local",
            "staging",
            "production"
          ]
        },
        "document_type": {
          "const": "input_manifest"
        },
        "job_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "created_at_utc": {
          "type": "string",
          "minLength": 1,
          "maxLength": 40,
          "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
          "format": "date-time"
        },
        "scope": {
          "$ref": "#/$defs/scope"
        },
        "read_layout": {
          "enum": [
            "PairedEnd",
            "SingleEnd"
          ]
        },
        "recipe": {
          "$ref": "#/$defs/recipe"
        },
        "files": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/input_file"
          },
          "minItems": 1,
          "maxItems": 256
        },
        "output_destination": {
          "type": "object",
          "properties": {
            "bucket": {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            "region": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "prefix": {
              "type": "string",
              "minLength": 1,
              "maxLength": 1024,
              "pattern": "/$"
            }
          },
          "required": [
            "bucket",
            "region",
            "prefix"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "contract_version",
        "environment",
        "document_type",
        "job_id",
        "created_at_utc",
        "scope",
        "read_layout",
        "recipe",
        "files",
        "output_destination"
      ],
      "additionalProperties": false
    },
    "output_file": {
      "type": "object",
      "properties": {
        "artifact_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "role": {
          "type": "string",
          "minLength": 1,
          "maxLength": 64,
          "pattern": "^[a-z][a-z0-9_]*$"
        },
        "format": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100
        },
        "file_name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 1024
        },
        "s3": {
          "$ref": "#/$defs/s3_object"
        }
      },
      "required": [
        "artifact_id",
        "role",
        "format",
        "file_name",
        "s3"
      ],
      "additionalProperties": false
    },
    "output_manifest": {
      "type": "object",
      "properties": {
        "contract_version": {
          "const": "poms-dps/1.0"
        },
        "environment": {
          "enum": [
            "local",
            "staging",
            "production"
          ]
        },
        "document_type": {
          "const": "output_manifest"
        },
        "job_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "provider_job_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255
        },
        "scope": {
          "$ref": "#/$defs/scope"
        },
        "recipe": {
          "$ref": "#/$defs/recipe"
        },
        "input_manifest_sha256": {
          "type": "string",
          "minLength": 1,
          "maxLength": 64,
          "pattern": "^[0-9a-f]{64}$"
        },
        "started_at_utc": {
          "type": "string",
          "minLength": 1,
          "maxLength": 40,
          "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
          "format": "date-time"
        },
        "stopped_at_utc": {
          "type": "string",
          "minLength": 1,
          "maxLength": 40,
          "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
          "format": "date-time"
        },
        "created_at_utc": {
          "type": "string",
          "minLength": 1,
          "maxLength": 40,
          "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
          "format": "date-time"
        },
        "provenance": {
          "type": "object",
          "properties": {
            "engine": {
              "type": "string",
              "minLength": 1,
              "maxLength": 100
            },
            "engine_version": {
              "type": "string",
              "minLength": 1,
              "maxLength": 100
            },
            "tools": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 100
                  },
                  "version": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 100
                  }
                },
                "required": [
                  "name",
                  "version"
                ],
                "additionalProperties": false
              },
              "minItems": 1,
              "maxItems": 100
            },
            "container_images": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 1024
              },
              "minItems": 0,
              "maxItems": 100
            }
          },
          "required": [
            "engine",
            "engine_version",
            "tools",
            "container_images"
          ],
          "additionalProperties": false
        },
        "outputs": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/output_file"
          },
          "minItems": 1,
          "maxItems": 256
        }
      },
      "required": [
        "contract_version",
        "environment",
        "document_type",
        "job_id",
        "provider_job_id",
        "scope",
        "recipe",
        "input_manifest_sha256",
        "started_at_utc",
        "stopped_at_utc",
        "created_at_utc",
        "provenance",
        "outputs"
      ],
      "additionalProperties": false
    },
    "start": {
      "type": "object",
      "properties": {
        "contract_version": {
          "const": "poms-dps/1.0"
        },
        "environment": {
          "enum": [
            "local",
            "staging",
            "production"
          ]
        },
        "dto_id": {
          "const": 100
        },
        "command_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "job_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "requested_at_utc": {
          "type": "string",
          "minLength": 1,
          "maxLength": 40,
          "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
          "format": "date-time"
        },
        "data_folder": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048,
          "pattern": "^s3://[^/]+/.+/$"
        },
        "input_manifest": {
          "$ref": "#/$defs/s3_object"
        },
        "recipe": {
          "$ref": "#/$defs/recipe"
        }
      },
      "required": [
        "contract_version",
        "environment",
        "dto_id",
        "command_id",
        "job_id",
        "requested_at_utc",
        "data_folder",
        "input_manifest",
        "recipe"
      ],
      "additionalProperties": false
    },
    "cancel": {
      "type": "object",
      "properties": {
        "contract_version": {
          "const": "poms-dps/1.0"
        },
        "environment": {
          "enum": [
            "local",
            "staging",
            "production"
          ]
        },
        "dto_id": {
          "const": 101
        },
        "command_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "job_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "requested_at_utc": {
          "type": "string",
          "minLength": 1,
          "maxLength": 40,
          "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
          "format": "date-time"
        },
        "reason": {
          "type": "string",
          "minLength": 1,
          "maxLength": 1000
        }
      },
      "required": [
        "contract_version",
        "environment",
        "dto_id",
        "command_id",
        "job_id",
        "requested_at_utc",
        "reason"
      ],
      "additionalProperties": false
    },
    "event": {
      "type": "object",
      "properties": {
        "contract_version": {
          "const": "poms-dps/1.0"
        },
        "environment": {
          "enum": [
            "local",
            "staging",
            "production"
          ]
        },
        "dto_id": {
          "const": 102
        },
        "event_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "job_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "provider_job_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255
        },
        "sequence": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9223372036854775807
        },
        "event_type": {
          "enum": [
            "Accepted",
            "Running",
            "Progress",
            "Succeeded",
            "Failed",
            "Terminated",
            "CancelledBeforeStart"
          ]
        },
        "occurred_at_utc": {
          "type": "string",
          "minLength": 1,
          "maxLength": 40,
          "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
          "format": "date-time"
        },
        "started_at_utc": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 40,
              "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        },
        "stopped_at_utc": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 40,
              "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        },
        "disposition_at_utc": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 40,
              "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        },
        "never_started": {
          "type": "boolean"
        },
        "percentage": {
          "anyOf": [
            {
              "type": "number",
              "minimum": 0,
              "maximum": 100
            },
            {
              "type": "null"
            }
          ]
        },
        "reason": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 1000
            },
            {
              "type": "null"
            }
          ]
        },
        "output_manifest": {
          "anyOf": [
            {
              "$ref": "#/$defs/s3_object"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "contract_version",
        "environment",
        "dto_id",
        "event_id",
        "job_id",
        "provider_job_id",
        "sequence",
        "event_type",
        "occurred_at_utc",
        "started_at_utc",
        "stopped_at_utc",
        "disposition_at_utc",
        "never_started",
        "percentage",
        "reason",
        "output_manifest"
      ],
      "additionalProperties": false,
      "allOf": [
        {
          "if": {
            "properties": {
              "event_type": {
                "const": "Accepted"
              }
            }
          },
          "then": {
            "properties": {
              "never_started": {
                "const": false
              },
              "started_at_utc": {
                "type": "null"
              },
              "stopped_at_utc": {
                "type": "null"
              },
              "disposition_at_utc": {
                "type": "null"
              },
              "percentage": {
                "type": "null"
              },
              "output_manifest": {
                "type": "null"
              },
              "reason": {
                "type": "null"
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "event_type": {
                "const": "Running"
              }
            }
          },
          "then": {
            "properties": {
              "never_started": {
                "const": false
              },
              "started_at_utc": {
                "type": "string",
                "minLength": 1,
                "maxLength": 40,
                "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
                "format": "date-time"
              },
              "stopped_at_utc": {
                "type": "null"
              },
              "disposition_at_utc": {
                "type": "null"
              },
              "percentage": {
                "type": "null"
              },
              "output_manifest": {
                "type": "null"
              },
              "reason": {
                "type": "null"
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "event_type": {
                "const": "Progress"
              }
            }
          },
          "then": {
            "properties": {
              "never_started": {
                "const": false
              },
              "started_at_utc": {
                "type": "string",
                "minLength": 1,
                "maxLength": 40,
                "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
                "format": "date-time"
              },
              "stopped_at_utc": {
                "type": "null"
              },
              "disposition_at_utc": {
                "type": "null"
              },
              "percentage": {
                "type": "number",
                "minimum": 0,
                "maximum": 100
              },
              "output_manifest": {
                "type": "null"
              },
              "reason": {
                "type": "null"
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "event_type": {
                "const": "Succeeded"
              }
            }
          },
          "then": {
            "properties": {
              "never_started": {
                "const": false
              },
              "started_at_utc": {
                "type": "string",
                "minLength": 1,
                "maxLength": 40,
                "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
                "format": "date-time"
              },
              "stopped_at_utc": {
                "type": "string",
                "minLength": 1,
                "maxLength": 40,
                "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
                "format": "date-time"
              },
              "disposition_at_utc": {
                "type": "string",
                "minLength": 1,
                "maxLength": 40,
                "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
                "format": "date-time"
              },
              "percentage": {
                "type": "null"
              },
              "output_manifest": {
                "$ref": "#/$defs/s3_object"
              },
              "reason": {
                "type": "null"
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "event_type": {
                "const": "Failed"
              }
            }
          },
          "then": {
            "properties": {
              "never_started": {
                "const": false
              },
              "started_at_utc": {
                "type": "string",
                "minLength": 1,
                "maxLength": 40,
                "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
                "format": "date-time"
              },
              "stopped_at_utc": {
                "type": "string",
                "minLength": 1,
                "maxLength": 40,
                "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
                "format": "date-time"
              },
              "disposition_at_utc": {
                "type": "string",
                "minLength": 1,
                "maxLength": 40,
                "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
                "format": "date-time"
              },
              "percentage": {
                "type": "null"
              },
              "output_manifest": {
                "type": "null"
              },
              "reason": {
                "type": "string",
                "minLength": 1,
                "maxLength": 1000
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "event_type": {
                "const": "Terminated"
              }
            }
          },
          "then": {
            "properties": {
              "never_started": {
                "const": false
              },
              "started_at_utc": {
                "type": "string",
                "minLength": 1,
                "maxLength": 40,
                "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
                "format": "date-time"
              },
              "stopped_at_utc": {
                "type": "string",
                "minLength": 1,
                "maxLength": 40,
                "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
                "format": "date-time"
              },
              "disposition_at_utc": {
                "type": "string",
                "minLength": 1,
                "maxLength": 40,
                "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
                "format": "date-time"
              },
              "percentage": {
                "type": "null"
              },
              "output_manifest": {
                "type": "null"
              },
              "reason": {
                "type": "string",
                "minLength": 1,
                "maxLength": 1000
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "event_type": {
                "const": "CancelledBeforeStart"
              }
            }
          },
          "then": {
            "properties": {
              "never_started": {
                "const": true
              },
              "started_at_utc": {
                "type": "null"
              },
              "stopped_at_utc": {
                "type": "null"
              },
              "disposition_at_utc": {
                "type": "string",
                "minLength": 1,
                "maxLength": 40,
                "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
                "format": "date-time"
              },
              "percentage": {
                "type": "null"
              },
              "output_manifest": {
                "type": "null"
              },
              "reason": {
                "type": "string",
                "minLength": 1,
                "maxLength": 1000
              }
            }
          }
        }
      ]
    },
    "query": {
      "type": "object",
      "properties": {
        "contract_version": {
          "const": "poms-dps/1.0"
        },
        "environment": {
          "enum": [
            "local",
            "staging",
            "production"
          ]
        },
        "dto_id": {
          "const": 103
        },
        "request_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "job_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        }
      },
      "required": [
        "contract_version",
        "environment",
        "dto_id",
        "request_id",
        "job_id"
      ],
      "additionalProperties": false
    },
    "query_response": {
      "type": "object",
      "properties": {
        "contract_version": {
          "const": "poms-dps/1.0"
        },
        "environment": {
          "enum": [
            "local",
            "staging",
            "production"
          ]
        },
        "dto_id": {
          "const": 104
        },
        "request_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "job_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "status": {
          "enum": [
            "Found",
            "NotAccepted",
            "Unavailable"
          ]
        },
        "event": {
          "anyOf": [
            {
              "$ref": "#/$defs/event"
            },
            {
              "type": "null"
            }
          ]
        },
        "command_receipts": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/command_receipt"
          },
          "minItems": 0,
          "maxItems": 2
        },
        "latest_progress": {
          "anyOf": [
            {
              "type": "object",
              "properties": {
                "percentage": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 100
                },
                "sequence": {
                  "type": "integer",
                  "minimum": 1,
                  "maximum": 9223372036854775807
                },
                "occurred_at_utc": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 40,
                  "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
                  "format": "date-time"
                }
              },
              "required": [
                "percentage",
                "sequence",
                "occurred_at_utc"
              ],
              "additionalProperties": false
            },
            {
              "type": "null"
            }
          ]
        },
        "reason": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 1000
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "contract_version",
        "environment",
        "dto_id",
        "request_id",
        "job_id",
        "status",
        "event",
        "command_receipts",
        "latest_progress",
        "reason"
      ],
      "additionalProperties": false,
      "allOf": [
        {
          "if": {
            "properties": {
              "status": {
                "const": "Found"
              }
            }
          },
          "then": {
            "properties": {
              "event": {
                "$ref": "#/$defs/event"
              },
              "reason": {
                "type": "null"
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "status": {
                "enum": [
                  "NotAccepted",
                  "Unavailable"
                ]
              }
            }
          },
          "then": {
            "properties": {
              "event": {
                "type": "null"
              },
              "command_receipts": {
                "maxItems": 0
              },
              "latest_progress": {
                "type": "null"
              }
            }
          }
        }
      ]
    },
    "event_ack": {
      "type": "object",
      "properties": {
        "contract_version": {
          "const": "poms-dps/1.0"
        },
        "environment": {
          "enum": [
            "local",
            "staging",
            "production"
          ]
        },
        "dto_id": {
          "const": 105
        },
        "event_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "job_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "status": {
          "enum": [
            "received",
            "committed",
            "conflict",
            "rejected"
          ]
        },
        "receipt_id": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 36,
              "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "reason": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 1000
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "contract_version",
        "environment",
        "dto_id",
        "event_id",
        "job_id",
        "status",
        "receipt_id",
        "reason"
      ],
      "additionalProperties": false,
      "allOf": [
        {
          "if": {
            "properties": {
              "status": {
                "const": "committed"
              }
            }
          },
          "then": {
            "properties": {
              "receipt_id": {
                "type": "string",
                "minLength": 1,
                "maxLength": 36,
                "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                "format": "uuid"
              },
              "reason": {
                "type": "null"
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "status": {
                "enum": [
                  "received",
                  "conflict",
                  "rejected"
                ]
              }
            }
          },
          "then": {
            "properties": {
              "receipt_id": {
                "type": "null"
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "status": {
                "enum": [
                  "conflict",
                  "rejected"
                ]
              }
            }
          },
          "then": {
            "properties": {
              "reason": {
                "type": "string",
                "minLength": 1,
                "maxLength": 1000
              }
            }
          }
        }
      ]
    },
    "describe": {
      "type": "object",
      "properties": {
        "contract_version": {
          "const": "poms-dps/1.0"
        },
        "environment": {
          "enum": [
            "local",
            "staging",
            "production"
          ]
        },
        "dto_id": {
          "const": 106
        },
        "request_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        }
      },
      "required": [
        "contract_version",
        "environment",
        "dto_id",
        "request_id"
      ],
      "additionalProperties": false
    },
    "capability_recipe": {
      "type": "object",
      "properties": {
        "key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100
        },
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255
        },
        "version": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100
        },
        "parameters_schema": {
          "type": "object"
        },
        "supported_read_layouts": {
          "type": "array",
          "items": {
            "enum": [
              "PairedEnd",
              "SingleEnd"
            ]
          },
          "minItems": 1,
          "maxItems": 2,
          "uniqueItems": true
        },
        "required_output_roles": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 64,
            "pattern": "^[a-z][a-z0-9_]*$"
          },
          "minItems": 1,
          "maxItems": 64,
          "uniqueItems": true
        }
      },
      "required": [
        "key",
        "name",
        "version",
        "parameters_schema",
        "supported_read_layouts",
        "required_output_roles"
      ],
      "additionalProperties": false
    },
    "capabilities": {
      "type": "object",
      "properties": {
        "contract_version": {
          "const": "poms-dps/1.0"
        },
        "environment": {
          "enum": [
            "local",
            "staging",
            "production"
          ]
        },
        "dto_id": {
          "const": 107
        },
        "request_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "service_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100
        },
        "instance_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100
        },
        "available": {
          "type": "boolean"
        },
        "message": {
          "type": "string",
          "minLength": 1,
          "maxLength": 1000
        },
        "supports_idempotent_start": {
          "type": "boolean"
        },
        "supports_authoritative_query": {
          "type": "boolean"
        },
        "supports_cancellation": {
          "type": "boolean"
        },
        "recipes": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/capability_recipe"
          },
          "minItems": 0,
          "maxItems": 100
        }
      },
      "required": [
        "contract_version",
        "environment",
        "dto_id",
        "request_id",
        "service_key",
        "instance_id",
        "available",
        "message",
        "supports_idempotent_start",
        "supports_authoritative_query",
        "supports_cancellation",
        "recipes"
      ],
      "additionalProperties": false
    },
    "command_receipt": {
      "type": "object",
      "properties": {
        "contract_version": {
          "const": "poms-dps/1.0"
        },
        "environment": {
          "enum": [
            "local",
            "staging",
            "production"
          ]
        },
        "dto_id": {
          "const": 108
        },
        "receipt_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "command_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "job_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "format": "uuid"
        },
        "command_kind": {
          "enum": [
            "Start",
            "Cancel"
          ]
        },
        "outcome": {
          "enum": [
            "Accepted",
            "Rejected",
            "CannotAct"
          ]
        },
        "provider_job_id": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            {
              "type": "null"
            }
          ]
        },
        "occurred_at_utc": {
          "type": "string",
          "minLength": 1,
          "maxLength": 40,
          "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?Z$",
          "format": "date-time"
        },
        "reason": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 1000
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "contract_version",
        "environment",
        "dto_id",
        "receipt_id",
        "command_id",
        "job_id",
        "command_kind",
        "outcome",
        "provider_job_id",
        "occurred_at_utc",
        "reason"
      ],
      "additionalProperties": false,
      "allOf": [
        {
          "if": {
            "properties": {
              "outcome": {
                "const": "Accepted"
              }
            }
          },
          "then": {
            "properties": {
              "provider_job_id": {
                "type": "string",
                "minLength": 1,
                "maxLength": 255
              },
              "reason": {
                "type": "null"
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "outcome": {
                "enum": [
                  "Rejected",
                  "CannotAct"
                ]
              }
            }
          },
          "then": {
            "properties": {
              "reason": {
                "type": "string",
                "minLength": 1,
                "maxLength": 1000
              }
            }
          }
        }
      ]
    }
  }
}
```
