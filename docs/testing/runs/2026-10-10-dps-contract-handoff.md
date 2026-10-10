# Owner-defined DPS contract handoff — October 10, 2026

## Subsequent implementation boundary

The Owner subsequently authorized POMS implementation without validation and
explicitly requested dispatch errors. Provider/transport, S3 manifests,
command/query/lifecycle/ACK integration, initial Start/Cancel dispatch, saved
attempt UI recovery and scanned output/analysis admission are written. MQTTnet
5.2.0.1603 is added to the API; defaults remain disabled/unconfigured. No build,
lint, test, browser validation, MQTT connection, dispatch, migration or deployment
was run. New regression sources are unexecuted. Output provenance/schema/examples
now require actual reference versions or an explicit no-reference reason; the
earlier static checks below are historical and do not validate these revisions.

The Owner requested completion of the assembly connection and clarified that
POMS should dictate the required server contract because DPS source/real
input-output documentation is unavailable. Prepared the developer specification,
Draft 2020-12 JSON schema, 22 examples and forwardable handoff note. The existing
dummy MQTT test remains distinct from this new operational contract.

## Static verification

- Draft 2020-12 schema compiled with existing repository Ajv 8.20.0 and
  ajv-formats 3.0.1; all 22 example JSON documents validate, including UUID and
  date-time formats. No package was installed or application dependency changed.
- Both input examples have ten files, group 1, consecutive paired R1/R2 parts
  1–5, purchased run 1. Full-byte SHA-256 and sizes match the original local
  synthetic files and the current Results v1 UI evidence.
- Start manifest references contain the SHA-256/size of the exact serialized
  manifest bytes. The Succeeded example binds the exact output-manifest bytes.
  Query Found replays the unchanged original lifecycle event.
- Contract package Markdown links resolve. ZIP integrity and required assets
  pass, including 22 JSON fixtures, two ten-file UI evidence sets and the original
  20-file synthetic FASTQ ZIP. Archive size: 145,530 bytes at this checkpoint.
- Application test suites were not run, per the repository's request-only rule.

## Evidence and delivery boundary

Specification: `docs/plans/POMS-DPS-DEVELOPER-CONTRACT.md`.
Schemas/examples/handoff: `docs/contracts/poms-dps/v1/`.
ZIP: `artifacts/ui-single-phase-two-samples-20261010/dps-developer-handoff-20261010.zip`.
Input evidence: `artifacts/ui-single-phase-two-samples-20261010/assembly-input-evidence.json`.

S3 locators/version IDs, unresolved receipt/library IDs, recipe and all execution
facts in the examples are explicitly artificial. The examples are not dispatchable
jobs. Actual object locators require resolution/pinning from POMS admitted
receipts; the contract does not invent them from display filenames.

No MQTT command, assembly attempt, runtime configuration, broker access,
credential change, migration, deployment or Git mutation occurred. The existing
unavailable provider remains registered. Full POMS/DPS runtime implementation,
contract acceptance and activation are outstanding. The Owner subsequently chose
a standalone Markdown handoff addressed to Chris Yourch. The downloadable file
includes the specification, representative JSON payloads and complete JSON Schema;
no external email/chat message has been sent.
