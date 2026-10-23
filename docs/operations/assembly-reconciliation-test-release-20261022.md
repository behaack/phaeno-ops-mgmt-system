# Assembly reconciliation hosted-test release — October 22, 2026

## Authorized scope and target

The Owner authorized publication and deployment of the Operations reconciliation and quiet-refresh changes to the existing hosted test environment, followed by review of `SIMULATED-ASM-20261020` and exactly one linked Simulated repeat after confirming that its original execution cannot resume. Target: Portal `https://portal.phaenobiotech.com`, API `https://api.phaenobiotech.com`, existing green PostgreSQL 18.6 container and volume on the current Portal host. No database replacement, reset, migration, identity/storage cutover, Website deployment or scientific/customer release is included.

## Preservation and recovery gates

Preserve every current table and record, including complete `website.web_contacts` and `website.web_orders` history, IDs, actor references, timestamps and states; all assembly receipts, original execution facts and journal history; every current runtime/document/Local file and existing S3 object. Create a fresh protected encrypted database/file/runtime recovery package; verify an isolated PostgreSQL 18.6 restore against every table fingerprint, then collect encrypted recovery off-server and verify its envelope. Retain the current API image/release and frontend deployment as rollback targets. Populated-S3 recovery remains deferred under the existing hosted-test exception; do not activate the disabled backup timer or change storage.

## Release and rollback

Publish a scoped `codex/` branch through the protected PR path. Require all three exact-source UI jobs and a production frontend build. Stage the production-environment Portal frontend without domain assignment. Activate the matching API through the protected release script with migrations and identity cutover false, retaining its lock, source-quality, auth, storage and scanner guards. Promote the tested frontend only after API verification. Keep both Vercel Git holds and the quarantined zero-job deployment run unchanged; do not retry that orphan. Use the established bounded direct-host release path if the quarantined Actions condition still prevents safe workflow dispatch. Keep `Deploy Portal Green` disabled outside any authorized bounded run.

On application failure, return to the retained API image and frontend deployment; no data rollback is needed because the schema is unchanged. Never restore the pre-release database over subsequent activity. Any data recovery requires a separately reviewed exact scope. Preserve failed-attempt evidence rather than editing dispositions or receipt rows.

## Acceptance sequence

1. Verify release identity, health, scanner, TLS discovery, unchanged runtime/provider settings, all table/file fingerprints and Website intake contents before the authorized business writes.
2. In the signed-in Portal, verify quiet background refresh across polling boundaries: loaded rows and geometry stay stable, ended attention polls at thirty seconds, and active work uses five seconds.
3. Independently inspect DPS processes, pending commands, execution/resumption behavior and target execution state. Missing ledger history or a NotAccepted response alone cannot satisfy the no-resumption condition. Stop before reconciliation if the evidence is insufficient.
4. Review retained attempt `41e26472-16b3-41d2-9130-c041216a3da4` with the new workflow, retain Failed and all original start/stop/disposition facts, and append the reason and actual independent verification. Compare both original receipts and historical events byte-for-byte afterward.
5. Request exactly one Simulated repeat linked to that latest attempt for work order `46b38b3a-0c54-463e-b048-eb37b9787c75`, specimen `231806cd-8168-4fcb-80fc-80c3bd060dff`, purchased run 1. Verify one Run dispatch, linked lineage, terminal outcome and placeholder output checks. Do not retry automatically if this execution fails or conflicts.

## Evidence

Local verification: [87 backend, 20 frontend, focused browser and strict visual checks](../testing/runs/2026-10-22-assembly-operations-reconciliation.md). Production frontend build and production/gallery isolation pass during release preparation. Release identities, fresh recovery hashes, hosted observations and repeat results will be appended after execution.
