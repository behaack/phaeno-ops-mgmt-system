# Hosted HTTP replay and independent recovery follow-up — October 21, 2026

The requested **HTTP request replay and recovery without a DPS restart pass**
against the actual hosted API. After the Owner reported DPS ready, one fresh
isolated attempt recovered through tunnel interruption and same-image API
restart, then completed successfully with one Start delivery and no attention.
DPS PID 24335, process start ticks, machine boot ID, executable hash and working
directory remain identical through all 17 continuity checks after baseline.
Recipe **Simulated** and mutual TLS **18883** remain unchanged. No DPS process
was started or stopped by Codex. No application source change, deployment,
migration, commit or push occurred during verification. The Owner subsequently
authorized committing/pushing these acceptance records and plans only;
deployment remains held.

## Actual authenticated HTTP replay

Target: `POST https://api.phaenobiotech.com/api/platform/lab-operations/work-orders/7722f311-e4ec-4d29-a533-29d5e97800f5/assembly-jobs`.

Reconstruct the exact original saved request for isolated synthetic attempt
`60e1e783-ac75-4dd6-bd5a-c0d4c146aa8a`, including its original two input IDs,
sample, run, recipe and null previous-attempt/reason. Its state is already
CancelledBeforeStart with a suppressed Run command and zero deliveries.
Authenticate with a 60-second token for the existing active operator session.
Use the configured backend credential only in memory; no new sign-in session,
identity, role or access is created, and no token is persisted. The existing-session
operation is documented in the [official Clerk SDK reference](https://github.com/clerk/clerk-sdk-python/blob/main/docs/sdks/sessions/README.md#create_token).

| Request | HTTP result | Saved result |
| --- | --- | --- |
| Byte-identical replay 1 | 200, success | Same attempt ID, CancelledBeforeStart |
| Byte-identical replay 2 | 200, success | Same attempt ID, CancelledBeforeStart |
| Same ID with changed instructions | 409, `assembly_job_invalid` | Rejected: identity belongs to different instructions |

The successful requests use body SHA-256
`a88da6576e08394c473c811ff879fc4dab528873608d02889bb0362814c64dcb`.
After requests, the job's state, provider ID, actual times, disposition,
attention, version and output flag exactly match their pre-test values. The
single Run command remains suppressed with **zero deliveries**; no Cancel
command, new attempt or active work is created. This is a real HTTP endpoint
test, rather than the earlier direct service invocation. It qualifies replay of
a saved terminal request. Fresh active-attempt HTTP replay and concurrent-request
guards subsequently passed in the recovery run below.

Verified at `23:32:25.274675Z`. See the
[HTTP evidence](assets/2026-10-21-hosted-http-replay-recovery-followup/http-terminal-replay.json).
The first harness assertion expected the controller's declared 202; the public
API returned a successful 200 envelope. The assertion was corrected to accept
the actual successful status and the complete state/identity/command checks then
passed. Initial token preflight received a non-JSON 403 with the default Python
client; the explicit product User-Agent succeeded. These were test-client
preflight issues; no application or authentication setting changed.

## Independent recovery without DPS restart — passed

The Owner reported DPS running and authorized the retry. Initial process checks
preceded application startup; the launcher was later visible and the actual
DPS application was confirmed at `23:47:54.860332Z`. The monitor excludes a
`dotnet run` build launcher unless it owns a broker connection, so parent and
application processes are not misclassified as duplicate DPS instances.
There was no active assembly work before the test. The existing synthetic
specimen and exact verified FASTQ inputs were reused; no new setup fixture.

| Check | Evidence | Result |
| --- | --- | --- |
| Fresh authenticated HTTP Start | One request/attempt `12b6511c-b5bd-45e4-84c2-51769ed2f362`, success 200 | Pass |
| Two byte-identical active HTTP replays | Both 200, same saved attempt; Accepted then Running as lifecycle advances | Pass |
| Same ID, changed instructions | 409, different-instructions identity guard | Pass |
| New ID while this attempt is active | 409, existing active assembly guard | Pass |
| Owned tunnel interruption | 12 seconds configured; `23:48:11.906880Z` to `23:48:24.277961Z` observed; restored | Pass |
| Same-image Portal API restart | Start changes from `23:14:22.356514817Z` to `23:48:24.988364647Z`; healthy/TLS restored by `23:48:31.325713Z` | Pass |
| Saved execution after interruptions | Same attempt/provider execution and actual start, Running, no attention | Pass |
| DPS continuity | PID 24335, start ticks `8259682`, boot ID, executable hash and cwd equal at baseline and all 17 subsequent samples through terminal HTTP read | Pass; no DPS restart |
| Final outcome | Succeeded, no attention, immutable output manifest, one confirmed Run delivery and no Cancel | Pass |
| Authenticated output downloads | Both 200, SIMULATED names, no-store, exact manifest byte counts and SHA-256, pinned S3 versions | Pass |

Request body SHA-256:
`57b59bbb01822b9dde2323aac1f4cb80abb5c19654bafcd070c3b46c6d2e991c`.
Provider execution is `dps-12b6511c-b5bd-45e4-84c2-51769ed2f362`.
Actual start `23:48:11.004788Z`, actual stop `23:50:42.849887Z`, disposition
`23:50:43.058776Z` (4:48–4:50 p.m. PDT). The final authenticated HTTP read at
`23:50:50Z` reports Succeeded and two simulated outputs. DPS executable SHA-256:
`95fabb9c500a7eb3290236fccfc390739c844893631ef3a49a12d93d6e95b3d4`.
This closes the earlier recovery qualification caused by an external DPS
replacement during the previous attempt. Each interruption is bracketed by
Running evidence within the same continuous attempt; no other interruption or
provider process change overlaps this run.

See [recovery and active HTTP evidence](assets/2026-10-21-hosted-http-replay-recovery-followup/active-recovery.json),
[preflight](assets/2026-10-21-hosted-http-replay-recovery-followup/recovery-preflight.json)
and [last process check](assets/2026-10-21-hosted-http-replay-recovery-followup/provider-last-check.json).

| HTTP output download | Bytes | SHA-256 |
| --- | ---: | --- |
| `SIMULATED-assembly-output.fasta` | 56 | `da854250812c5640d9ba9e4efba7d462912f723d74fb474a33722c92b4f29077` |
| `SIMULATED-provenance-report.json` | 280 | `a82487e832cd1629867beb1ccd1cf0e0d911d3c98254fa2246b18e63c8321a17` |

The authenticated downloads were verified at `23:51:10.860744Z`; bytes were
compared in memory and no plaintext output files or bearer tokens were retained.
See [output verification](assets/2026-10-21-hosted-http-replay-recovery-followup/output-verification.json).
This run uses real authenticated HTTP/API and persistence evidence; a new browser
flow or automatic browser refresh is not claimed.

## Historical readiness checkpoint

Read-only process snapshots at `23:31:30.557883Z`, `23:32:25.648403Z` and
`23:37:18.435705Z` found no current DPS process. Portal API, database, scanner,
SSH tunnel and loopback TLS forwarding remain healthy. The server developer was
asked to start one DPS instance and leave it running unchanged. Codex did not
start or stop any DPS process.

The completed continuation used the existing reconciled synthetic specimen in
work order `7722f311-e4ec-4d29-a533-29d5e97800f5`. Its bounded scope was:

1. Require exactly one current DPS process and no unrelated active assembly.
2. Record its PID, process start ticks, machine boot ID, executable SHA-256 and
   working directory; keep comparing these through completion.
3. Start one Simulated attempt via the authenticated public HTTP endpoint,
   replay the same bytes, reject changed instructions and a concurrent request,
   and verify one attempt/Start.
4. Interrupt only the owned tunnel for 12 seconds, restore it, and restart only
   the same Portal API image. Verify the same provider execution and actual start.
5. Require unchanged DPS identity throughout, successful completion, immutable
   outputs, no attention and one Start delivery. Any DPS change disqualifies
   this independent recovery proof; do not silently classify it as passed.

No runtime/deployment/authentication configuration change was needed.
The deployed API remains source `79b0338f5f96b3a5fcbea24b86db89906e922f84`,
image `sha256:3ced49a630f3596d79c1ddc31810dbca966bc617159a97c205b33b96cb101127`.
The original conflicting Failed attempt remains retained and blocked; no
receipt, hash, timestamp, outcome or safety guard is manually cleared.

## Recovery copy and preservation

A fresh full database recovery passes isolated PostgreSQL 18.6 restore. Its
250-table baseline is captured; independent off-server decryption and PGDMP/hash
verification pass. No plaintext dump or unwrapped recovery key is retained. Protected
recovery is under
`/var/backups/phaeno-portal-deploy/assembly-acceptance-20261020/timestamp-release-20261021/http-recovery-followup`
and ignored `.artifacts/dps-timestamp-release-20261021/followup` off-server.

- Dump SHA-256: `147e6ab92f4042bf191762b155b5baad4b3fa4db51e799ad9f4ccdf41832eeb2`.
- Encrypted dump SHA-256: `4bd6957b6912341c4cd15f664d3272373360f35b530eb855a79cd13a9753c2f3`.

Final postflight at `23:51:12.201075Z` verifies all 610 original non-fixture rows and
115 unrelated runtime/document files unchanged, 29 migrations retained, zero
active assemblies, and zero analyses/QC/output packages across both fixtures.
API/database/scanner healthy, tunnel active; public health, Portal and Website
200 and anonymous assembly 401. Release image/settings and orphan-run quarantine
remain unchanged. The same API image was restarted only for recovery; no source,
deployment, migration, new setup fixture, commit or push occurred during
verification. Existing Website intake history and populated-S3 recovery deferral
remain preserved. See
[postflight evidence](assets/2026-10-21-hosted-http-replay-recovery-followup/final-postflight.json)
and the [preceding acceptance ledger](2026-10-21-hosted-assembly-final.md).

Protected evidence archive SHA-256:
`d658287bca24e2589804008d44e553c6ccaec49558b21b1cfbb5315d9a21cf48`.
Encrypted recovery, synthetic history and raw receipts are retained. The helper
ran over protected SSH in memory, exits normally and leaves no helper service,
container or persisted credential. HTTP scientific-link denial, live DPS
pre-start cancellation, automatic browser refresh, populated-S3 disaster
recovery and physical/scientific acceptance remain outside this follow-up.
The original Failed/conflicted attempt remains protected for Operations
reconciliation; this successful new attempt does not erase that history.
