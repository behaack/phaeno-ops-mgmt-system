# DPS timestamp, cancellation and recovery regression — October 21, 2026

Result: **54/54 passed, zero failed, zero skipped**. This is local software
regression evidence for the uncommitted whole-second timestamp correction.
No application or test-source correction was needed during this run.

The Owner explicitly requested the timestamp regressions, including cancellation
and recovery, without commit or deployment. Hosted acceptance and the existing
Terminated attempt remain unchanged until a separately authorized release/retest.

## Environment and isolation

- Windows, .NET SDK 10.0.401, native PostgreSQL 18.3.
- Fresh task-owned cluster on an ephemeral IPv4 loopback port; SCRAM
  authentication, generated temporary credentials, no shared database connection.
- All 29 existing migrations applied to the empty disposable database, through
  `20261017190934_SplitInternalOrderNotes`. No migration files or model changed.
- The test/API binaries were compiled after the four changed source files.
  Their tested source fingerprints and exact test filter are retained in the
  [run receipt](assets/2026-10-21-dps-timestamp-regression/receipt.json).
- Completed run: `2026-10-21T22:41:32Z`–`2026-10-21T22:43:15Z`; test duration
  approximately 64 seconds, excluding setup and migration.

An initial setup attempt stalled on Windows child-process handling before tests
started. Its database was stopped and removed. The corrected hidden launcher
waits for the startup helper rather than the server's lifetime. The completed
run stopped its own server, removed the temporary cluster/credentials and
restored its process environment. No hosted runtime, broker, tunnel, recipe,
release holds, application configuration or existing database was changed.

## Executed coverage

| Group | Passed | Coverage |
| --- | ---: | --- |
| DPS contract | 27 | Ten new request-ordering boundaries, optional-start and retained UTC/future guards; existing strict contract/security defaults and scientific/diagnostic separation |
| Assembly domain | 11 | Queued cancellation, running cancellation/success race, actual execution-time integrity, database-precision replay and transient progress |
| Messaging domain | 6 | Stable retry identity, terminal cancellation race, before-start cancellation, conflicting replay and reconnect subscriptions |
| Connected PostgreSQL | 10 | Three new DPS receiver cases plus existing restart/recovery, commit-before-ACK, duplicate/conflicting receipts, cancellation race, delivery escalation, access expiry and malformed-manifest guards |
| **Total** | **54** | **All executed; zero skips** |

The three new connected cases verify:

1. A whole-second Start receipt and Running event can match a subsecond Portal
   request. The lifecycle transaction commits before ACK; a new receiver/context
   replays the same evidence without duplicates, redelivery or changed start time.
2. A whole-second Accepted Cancel receipt is admitted after a Terminated event.
   Replay remains idempotent. Normal processor reconciliation clears the
   attention state, preserves actual start/stop times and receipt occurrence,
   and leaves one cancellation delivery attempt.
3. Prior-second, earlier fractional, future and foreign evidence is rejected.
   A changed payload under an existing receipt ID records a conflict, retains
   the original occurrence time and requires Operations reconciliation.

The ten boundary cases include the observed `21:31:27Z` receipt versus
`21:31:27.197347Z` request, a request at the final tick of a second, preceding
seconds, fractional differences as small as one tick, exact equality, later
evidence and midnight boundaries. No general clock-skew tolerance is introduced.

## Evidence and remaining boundary

The exact executed cases and outcomes are in the
[TRX result](assets/2026-10-21-dps-timestamp-regression/timestamp-regression.trx).
The requested batch used the existing compiled test project with
`dotnet test --no-build --no-restore` and the receipt's explicit filter.
Whitespace/path checks pass.

These tests use synthetic provider evidence and an isolated local database.
They do not execute a remote DPS job, exercise the hosted Linux/PostgreSQL 18.6
runtime, or establish scientific acceptance. The real hosted cancellation
warning and remaining Simulated TLS-18883 acceptance cases still require an
authorized deployment and reconciliation of the original saved attempt.
No commit, push or deployment occurred.
