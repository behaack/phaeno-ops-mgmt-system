# DPS timestamp hosted-test release and acceptance — October 21, 2026

## Completed release and scoped acceptance

Source `79b0338f5f96b3a5fcbea24b86db89906e922f84` is committed/pushed and
active as image `sha256:3ced49a630f3596d79c1ddc31810dbca966bc617159a97c205b33b96cb101127`.
Original cancellation recovery, fresh running cancellation, Portal cancellation
before dispatch, hosted service replay/guards, active recovery, success and both
authenticated output downloads pass. Another fresh running cancellation passes
after completion. Zero active assemblies remain. All original 610 rows, 115
unrelated files, Website intake history, runtime settings and 29 migrations are
preserved. Recovery restore/decryption and healthy service readback pass.

The prior provider conflict remains protected, and the successful recovery
overlaps an external DPS process replacement. Literal HTTP Start replay,
HTTP scientific-link denial, live DPS pre-start cancellation and automatic
browser refresh are not separately qualified. See the
[final acceptance receipt](../testing/runs/2026-10-21-hosted-assembly-final.md)
and [release receipt](../operations/dps-timestamp-test-release-20261021.md).
Temporary helper builds/settings were removed, evidence/recovery retained,
and deployment holds, quarantine and S3 recovery deferral preserved. Completion
documentation is committed/pushed separately without another API deployment.

## Recorded live checkpoint and isolated resumption

Source `79b0338f5f96b3a5fcbea24b86db89906e922f84` is pushed and active. Original
whole-second cancellation reconciles, and fresh running cancellation passes.
Active tunnel/API recovery preserves the execution and one Start, but the
provider subsequently reports conflicting Failed outcomes for missing
`ledger.json` and `ledger.json.tmp`. Read-only inspection found two DPS processes
in the same directory; PID 11234 used a replaced/deleted executable, PID 16624
the current one. The Owner authorized stopping only the stale instance and
retrying. It had already exited at the stop precheck, so no signal was sent;
readback confirms only PID 16624 remains. Competing ledger writers are an
inference, not established by source inspection.

Retain the original failed/conflicted attempt without changing its evidence or
clearing its safety guard. The existing synthetic-record authorization covers
a second clearly labelled isolated fixture, `SIMULATED ASSEMBLY ACCEPTANCE
20261021R`, created through the same domain-based setup helper. Its Lab Job is
`7722f311-e4ec-4d29-a533-29d5e97800f5`; no unrelated configuration or notifications.
A fresh database recovery including the conflict history passes isolated restore
and independent off-server decryption before this setup. Remaining checks resumed
only in this new fixture. Queue-boundary setup uses the real Start service
and dispatcher lease, normal signed-in Portal cancellation, and exact/changed
service-request replay; label this accurately rather than claiming HTTP Start
replay or a live DPS CancelledBeforeStart event.

## Authorized scope

The Owner requested commit/push of the reviewed Portal timestamp correction,
deployment to the existing hosted test environment, and completion of the
remaining assembly acceptance, including cancellation and recovery. Keep
`pseq_data_assembler` 0.1.0 **Simulated** and mutual TLS **18883**. Only the API,
regression sources and associated plans/evidence are released. Both frontends,
identity, storage, credentials, security settings, database model/migrations and
scientific/commercial release remain unchanged.

The correction and cancellation/recovery regressions passed 54/54 with zero
failures/skips on isolated local PostgreSQL; full solution compilation passed.
The exact tested source fingerprints are in the
[regression receipt](../testing/runs/2026-10-21-dps-timestamp-regression.md).

## Target, preservation and recovery

Target the existing `/opt/phaeno.portal-green` API and PostgreSQL 18.6 database
`phaeno_portal_green`; preceding API source is
`859f36055ac4ef668b3023065ecfbd3d8ee0067a`. Preflight confirms 29 migrations through
`20261017190934_SplitInternalOrderNotes`, a healthy API/tunnel, TLS 18883,
Simulated enabled, and zero active assemblies. Existing fixture attempts are
Succeeded `bddca743-b19b-40ab-ba3c-ec1d552bb342` and Terminated
`0d730ada-b761-4c6d-97cf-2c421e00dd12`; the latter retains the rejected Cancel
receipt warning. Reuse their approved synthetic organization, sample, FASTQ and
preparation lineage; do not create unrelated setup or rewrite recorded outcomes.

Preserve all schemas, records, identity/membership, audit/scientific/commercial
history, runtime configuration, document/Local files and all S3 object versions.
Explicitly preserve complete `website.web_contacts` and `website.web_orders`
records, including IDs, contents, timestamps, locales, actor references and
completed/unsubscribed history. Capture full-table and per-record fingerprints,
including all 610 original non-fixture rows. Only scoped synthetic assembly,
command/receipt/event and normal related audit/work-order updates may change as
authorized acceptance progresses. No reset, deletion, backfill or migration.

Before cutover, take fresh database, protected runtime, document and Local-file
recovery. Restore the database in a disposable PostgreSQL 18.6 container, verify
migrations/reference checks, compare file archives, encrypt with the existing
recovery public key, collect the ciphertext off-server and independently verify
decryption/archive contents. Keep protected prior compose/manifest/current-link
metadata for image rollback. Preserve the populated-S3 recovery deferral and
disabled backup timer; this run does not qualify populated-S3 disaster recovery.

## Publication and cutover

1. Review/stage only the timestamp source/tests and associated records, scan for
   credentials, commit/push main and verify the exact remote SHA. Create and hash
   an exact-commit archive; verify extracted candidate source before execution.
2. Retain the orphaned Actions run `39056745064` quarantine fence. It remains
   queued with zero jobs and `Deploy Portal Green` is disabled. As in the previous
   preserving release, use the exact-source protected `deploy-release.sh`
   directly; do not enqueue a competing run or remove the fence. Retain its
   deployment lock, database/storage/scanner/auth/Website checks and rollback.
3. Run with migrations and identity cutover false. Preserve all runtime settings,
   including the Simulated recipe, TLS trust/hostname/client identity and 18883.
   Restart only the existing tunnel service as needed to follow the new API
   network namespace. No frontend publication or deployment-hold change.
4. Verify exact API source/image, public/direct health and authorization, database
   and scanner health, actual DPS discovery on TLS 18883, unchanged runtime/file
   hashes and unchanged migration/Website/non-fixture record fingerprints.
   Scoped background reconciliation may add the missing Cancel receipt and clear
   only the existing fixture's attention through the normal processor.

## Remaining acceptance

First reconcile the exact Terminated attempt: accept the original whole-second
Cancel receipt, clear attention, retain original execution times and one
Start/Cancel delivery. Then use signed-in normal Portal actions for a fresh
running cancellation and success/download journey. During owned active
processing only, interrupt/restore the owned tunnel and restart the same API
image, then verify reconciliation of the same execution without another Start.
Exercise cancellation before execution and repeated-request/idempotency guards;
record any provider scheduling limitation distinctly from deterministic software
evidence. Retain synthetic terminal history and immutable output checksums.

After each interruption, restore service and verify no unrelated active work.
Keep zero scientific analysis/QC/package/release from simulated attempts. Record
passed, failed and provider-constrained cases separately in the owning
[acceptance plan](ASSEMBLY-HOSTED-ACCEPTANCE-20261020-PLAN.md) and final run receipt.
Commit/push the documentation-only completion record without another deployment.

## Rollback

Before activation, failure leaves the prior API active. On failed non-migration
activation, use the protected script's prior-image rollback, restore prior
compose/manifest/current-link metadata and restart the existing tunnel against
that API namespace. Recheck health/TLS/configuration and preserved data. Never
restore an older database over new activity or delete retained attempts/files.
Frontends, the orphan-run fence, Vercel Git holds and S3 recovery deferral remain.
