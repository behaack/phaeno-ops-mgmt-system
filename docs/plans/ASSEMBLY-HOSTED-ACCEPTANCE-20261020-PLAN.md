# Hosted assembly acceptance — October 20, 2026

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
