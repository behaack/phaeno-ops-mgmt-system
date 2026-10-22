# Hosted assembly acceptance — October 20, 2026

## HTTP replay and independent recovery passed — October 21, 2026

The requested actual authenticated HTTP replay passes: two byte-identical saved
requests return the same CancelledBeforeStart attempt (200), changed instructions
under that identity reject with 409, and the saved job/version and suppressed
command remain unchanged with zero deliveries. After DPS readiness, one new
isolated attempt `12b6511c-b5bd-45e4-84c2-51769ed2f362` also passes active HTTP
replay, changed/active-request rejection, owned tunnel interruption and same-image
API restart, then Succeeded with one Start and no attention. DPS PID 24335,
start ticks, boot ID, executable hash and cwd stay identical through all 17
continuity checks after baseline. Both authenticated output downloads pass
byte/hash/version checks. This closes the HTTP replay and external-DPS-restart
qualifications from the preceding run. Simulated/TLS 18883 retained, zero active
work, all 610 original rows/115 unrelated files preserved. Fresh recovery
restore/off-server verification and preservation checks pass. The earlier
Failed/conflicted attempt remains protected; no scientific/physical acceptance.
No application or deployment change. The Owner subsequently authorized publishing
the acceptance records/plans; deployment remains held. See the
[follow-up receipt](../testing/runs/2026-10-21-hosted-http-replay-recovery-followup.md).

## Released correction and resumed acceptance — October 21, 2026

Source `79b0338f5f96b3a5fcbea24b86db89906e922f84` is committed/pushed and
active. The original whole-second cancellation reconciles without another
delivery or changed times. Fresh running cancellation, controlled cancellation
before dispatch, service request replay/active guards, active tunnel/API recovery,
success and both authenticated exact-byte/hash downloads pass. The final normal
running cancellation also passes. Keep Simulated and TLS 18883. All 610 original
rows and 115 unrelated files remain unchanged; services healthy, zero active
assemblies, no scientific analysis/QC/output packages.

The first active recovery encountered a separate DPS ledger failure and two
incompatible Failed outcomes. Preserve that conflict and its blocked specimen.
After the Owner authorized stopping the stale duplicate DPS process, precheck
found it already exited; no signal was sent. A fresh verified recovery preceded
the second approved isolated fixture, `SIMULATED ASSEMBLY ACCEPTANCE 20261021R`,
where the remaining journeys passed. A later external DPS process replacement
overlapped successful recovery, qualifying attribution to each interruption.
Service replay is not HTTP Start payload replay; no live DPS pre-start event or
automatic post-restart browser refresh is claimed. The retained old conflict,
HTTP payload replay and HTTP scientific-link denial remain explicit exceptions
to an unqualified full-protocol acceptance. See the
[final receipt](../testing/runs/2026-10-21-hosted-assembly-final.md) for the
case-by-case ledger, exact identities and evidence, and the
[release receipt](../operations/dps-timestamp-test-release-20261021.md).

The checkpoints below are historical and superseded where the final ledger
records a completed case. Scientific/physical acceptance, populated-S3 recovery
and Customer/commercial activation remain outside this run.

## Historical local correction; release then pending — October 21, 2026

The Owner subsequently authorized correcting Portal validation without commit
or deployment. Whole-second command receipts and lifecycle occurrence/start
times now compare against the saved request's second boundary. Earlier seconds,
earlier fractional timestamps, future evidence and foreign/conflicting identities
remain rejected; original timestamps remain unchanged. See the implementation
scope in the [messaging plan](POMS-DPS-MQTT-MESSAGING-PLAN.md#whole-second-request-ordering-repair--october-21-2026).
Regression sources cover command/event admission and restart/replay, including
the existing Terminated-attempt recovery path. Full solution compilation passes
with zero warnings/errors and diff/whitespace review passes. The Owner-requested
local timestamp/cancellation/recovery batch passes **54/54, zero failed/skipped**
against isolated Windows/PostgreSQL 18.3 with all 29 migrations. The temporary
cluster and credentials were removed. See the
[regression receipt](../testing/runs/2026-10-21-dps-timestamp-regression.md).
No commit/deployment or hosted reconciliation occurred; the failed hosted
acceptance below is unchanged.

## Historical retry outcome — October 21, 2026

The Owner requested a retry after the server correction. The original attempt
now reconciles to Succeeded with its original execution times and one Start.
Strict validation confirms null lifecycle percentages, and both authenticated
Portal diagnostic downloads pass exact byte/size/hash checks. A fresh running
attempt stops and persists Terminated after one Cancel delivery, but cancellation
confirmation still fails: DPS reports the receipt at `21:31:27Z`, earlier than
the stored request at `21:31:27.197347Z`. This valid-schema timestamp is rejected
by the Portal's strict ordering comparison. Attention remains on the latest
attempt, blocking further repeat/recovery/queued-cancellation cases. No new
interruption or application change was performed during this retry. Full
acceptance remains **failed/blocked**. Recipe Simulated and TLS 18883 remain;
all original 610 non-fixture rows are unchanged. See the
[retry receipt](../testing/runs/2026-10-21-hosted-assembly-acceptance-retry.md).

## Original October 20 scope and results

The Owner requested full hosted-test assembly acceptance, including cancellation
and recovery, with the recipe kept **Simulated**. After inventory confirmed an
empty Laboratory workspace, the Owner explicitly approved isolated synthetic
organization, order, sample, preparation-lineage and FASTQ setup records. These
fixtures represent software test setup, never physical or scientific evidence.

Target: the existing hosted test API at `api.phaenobiotech.com`, source
`859f36055ac4ef668b3023065ecfbd3d8ee0067a`, and the Portal at
`portal.phaenobiotech.com`. Keep mutual TLS, certificate verification, port
18883, the approved `pseq_data_assembler` 0.1.0 recipe and `Simulated=true`.

Before setup, retain a protected database dump, verify it in an isolated restore,
and record all pre-existing table contents. Use one uniquely named synthetic
Customer organization and order, one sample and complete paired FASTQ set.
Construct fixture lineage with domain methods and clearly synthetic labels;
retain setup identifiers and actual file hashes. Do not send notifications,
create external identities, change permissions, or claim wet-laboratory work.
Use normal signed-in Portal controls for execution and cancellation.

Acceptance ledger:

| Case | Required evidence | Status |
| --- | --- | --- |
| Transport and recipe | Live hosted TLS 18883, strict identity, Simulated recipe | Preflight passed |
| Start and completion | Saved request/command, provider acceptance, actual execution times, terminal success, verified immutable outputs | Start passed; provider succeeded; Portal completion failed contract validation |
| Progress and persistence | Visible progress, saved lifecycle receipts, no percentage history writes | Live progress observed; lifecycle persistence blocked; software persistence checks passed |
| Repeated requests and active-run guard | One attempt per request, concurrent/repeated execution refused or reconciled | One live attempt/Start; second Start disabled; software uniqueness/delivery checks passed; full HTTP replay pending |
| Diagnostic downloads | Authorized exact-version bytes and checksums, SIMULATED names | Independent provider S3 bytes verified; Portal downloads blocked |
| Scientific separation | No analysis/package/QC/release generated; explicit analysis-link denial | Hosted service guard passed; zero analyses, packages and QC; HTTP link action not exercised |
| Running cancellation | Saved reason/request, actual provider terminal outcome and times | Failed: saved request, zero Cancel delivery attempts because authoritative Query is invalid |
| Cancellation before execution | No fabricated start/stop timestamps; distinguish software-only evidence where provider timing prevents a live case | Software simulation passed; separate live case blocked by unresolved first attempt |
| Connection recovery | Bound loss of the owned tunnel during an owned run, restore it, reconcile the same attempt without duplicate Start | Transport restored after 12-second interruption; same attempt/one Start; lifecycle reconciliation failed |
| API recovery | Restart only the hosted test API during owned work, recover same provider execution and saved receipts | Same image healthy after restart; TLS restored; lifecycle reconciliation failed; interruption during active provider work still pending |
| Preservation | Existing rows unchanged, only approved fixture scope added, all services restored, recipe still Simulated | Passed: all 610 pre-existing rows unchanged; services healthy; TLS 18883 and Simulated retained |

Run deterministic cancellation-race, duplicate/conflicting receipt,
commit-before-ACK, late-progress and restart regression cases separately against
an isolated database. Identify them as software simulation evidence. Live
provider outcomes and UI evidence remain separate acceptance requirements.

Before each controlled interruption, verify no unrelated active assembly work.
Retain terminal test history and task-owned S3 evidence for review. Do not reset
the shared database or change the existing deployment/workflow holds. The
Owner's separate populated-S3 recovery qualification deferral remains in force;
connection/API recovery tests do not establish disaster recovery or scientific
production readiness. No new release, commit or push is requested by this run.

Result: **acceptance failed; dependent live cases blocked**. The native Linux
software batch passed 51/51, zero skipped, against isolated PostgreSQL 18.6.
DPS sends `percentage: 0` on Running/Succeeded lifecycle events; the agreed
contract requires `null`. Both raw events and their authoritative Query wrappers
fail validation. Changing only this field in offline copies makes both validate;
live payloads, application code and validation were unchanged. Preserve attempt
`bddca743-b19b-40ab-ba3c-ec1d552bb342` and its saved cancellation for reconciliation
after the server correction. No second assembly was started. See the
[run receipt](../testing/runs/2026-10-20-hosted-assembly-acceptance.md).
