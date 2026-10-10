# POMS–DPS 1.0 contract package

The Owner directed POMS to specify the required DPS interface on October 10,
2026. Read [the developer contract](../../../plans/POMS-DPS-DEVELOPER-CONTRACT.md)
for ownership, topics, timing, S3 binding and recovery rules. This directory is
the machine-readable companion. It does not activate a processing connection.

`contract.schema.json` uses JSON Schema Draft 2020-12. Its root accepts one of
nine MQTT DTOs or the input/output manifest. Validators must enforce the UUID
and date-time formats as well as schema constraints. Additional properties are
rejected on contract records; recipe parameters follow the advertised recipe
schema. Validate document size and semantic rules in addition to JSON structure.

## Examples are not executable commands

Every file under `examples/` is a **contract fixture**. All S3 bucket/key/version
locators, processing recipe, attempt/command/event IDs, unresolved library/file/
output IDs, provider execution and generated-output fingerprints are artificial.
Do not publish these examples as real jobs or treat their lifecycle times as
recorded execution. The fake bucket is `example-contract-fixture-not-real`.

The two input manifests retain the current mock order's observed specimen IDs,
FASTQ-set IDs, filenames, mapping, full-byte checksums, sizes and read counts to
demonstrate ten files per sample. Actual S3 locators and unexposed internal IDs
must be resolved from POMS scientific receipts. Start's manifest checksum/size
matches the exact UTF-8 bytes of its associated example input manifest. The
Succeeded event likewise references the exact example output-manifest bytes.
Output object checksums inside that manifest are dummy values; no output files
or scientific execution are supplied.

The Happy path is Start → Accepted receipt → Accepted event → Running → Progress
→ Succeeded → committed ACK. The Failed, Terminated and CancelledBeforeStart
examples are **alternative outcomes**, not events to apply after Succeeded to
that same job. A query replays the exact original lifecycle event. The
NotAccepted and Unavailable replies are alternatives with different meanings.

## Semantic checks beyond the schema

- Environment and UUIDs match the actual topic and known saved POMS attempt.
- Start's recipe exactly matches the manifest and advertised supported version;
  validate its parameters against the recipe's `parameters_schema`.
- The manifest's inputs all belong to one admitted current specimen/run/set.
  Enforce paired layout, matching read IDs/counts/order, group descriptions and
  consecutive parts; reject duplicates, omissions or extra unlisted objects.
- Only authorized S3 buckets/prefixes and exact immutable versions are used.
  Stream/hash complete bytes and apply configured file/set/manifest limits.
- UTC execution times are chronologically consistent, not future-dated, and do
  not change during replay. Cancellation-before-start has no execution times.
- Nested event/receipt IDs in a Query reply match the outer queried job and
  environment. A Found reply reflects a real durable ledger entry.
- Committed ACK follows the POMS transaction commit. Conflict/rejected ACK does
  not retire DPS's final outbox entry; quarantine and alert as appropriate.
- Output manifest binds the input checksum, same job/scope/recipe/execution and
  actual times. All required roles exist and checksummed files are under the
  authorized output prefix before POMS scientific registration.
- Output provenance explicitly records reference dataset names/versions/checksums,
  or an empty reference list with a declared no-reference reason. The new fields
  are required; POMS does not fill them by inference. Tool declarations are limited
  to 63 plus the engine, matching the existing 64-entry scientific software limit.

## Integration responsibilities

The DPS developer implements this wire contract, broker subscriptions,
deduplication, execution, S3 access, capability declaration, event outbox/query
and retry/alert behavior. POMS implements its provider adapter, exact managed
object resolution/manifests, normalized lifecycle mapping/ACK and verified
output registration. Shared acceptance covers restarts, duplicate dispatch,
cancellation races, missing/changed files and two independent ten-file attempts.

POMS now registers its DPS adapter, with connection and worker settings disabled
by default. The implementation has not been built or validated, at the Owner's
request. No real MQTT job was sent, broker permission changed or assembly outcome
manufactured. DPS implementation, configuration and verification by both sides
are prerequisites for live assembly; deployment has its separate repository gate.

The reference-data schema/example revisions and POMS implementation have not been
validated. Earlier static checks recorded for the initial handoff are historical.
