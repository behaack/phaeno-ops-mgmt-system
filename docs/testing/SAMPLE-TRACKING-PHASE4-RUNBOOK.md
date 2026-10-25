# Local sample-tracking validation and recovery

## Final-review recovery safeguards

The default selection now contains 42 cases. Before creating a generated database, the runner verifies that identity is absent and persists `creationAttempted` in `ownership.json`. Cleanup reconciles every attempted identity, including a server-side creation whose response is lost; success is not inferred from the acknowledged `created` list. Each drop/absence check reconnects independently. `remainingKnownDatabases` includes unconfirmed attempted identities when cleanup cannot complete.

`uncertain-creation-1` and `uncertain-creation-2` deliberately fail after the server creates the first or second database and before the caller records acknowledgement. Their run receipts must fail; cleanup and qualification receipts must pass, with all attempted databases absent, temporary bytes removed, target variables restored and configured development unchanged. The existing `cleanup-failure-probe` still deliberately leaves one owned fixture for a separately verified repair. New ownership/cleanup receipts for `mix-equipment` describe its standalone migrated fixture, rather than using configured development as test storage.

Owning scope: [Phase 4](../plans/SAMPLE-TRACKING-PHASE4-VALIDATION-PLAN.md). This is a repeatable engineering check with synthetic identities, samples, instrument/producer declarations and scanner outcomes. It neither starts DPS nor deploys an application. It does not qualify a real laboratory procedure or hosted recovery operation.

## Run

From the repository root in PowerShell, with the existing .NET dependencies restored and PostgreSQL 18 tools installed:

```powershell
./scripts/verification/verify-sample-tracking-phase4.ps1
```

For the connected browser matrix against independently restored fixtures:

```powershell
./scripts/verification/verify-sample-tracking-phase4.ps1 -Browser
```

`-Browser` runs the recovery case and its four Chromium desktop/320px phone × light/dark scenarios. It starts a bounded test-only loopback MVC host and Vite fixture, using the production investigation/scientific-download components and real restored controllers/EF/private storage. Requests are forwarded to the host; feature responses are not fabricated. Explicit test endpoints prepare only the generated restored file/report faults and long-history rows. The check includes frozen report download/retry, exact result-to-tube identity, hold history, actionable file/report failures, pagination, overflow and selected accessibility checks. Full Portal routing and hosted sign-in remain separate. Browser mode has its own new evidence directory, `browser-results.json`, `browser.log`, screenshots and `browser-preservation.json`; its xUnit fact is orchestration evidence for four browser scenarios.

Without `-Browser`, the script builds the backend test project and runs the connected recovery case plus focused physical, lineage, scientific-evidence, investigation-scope and original commercial-journey regressions. `-NoBuild` reuses a current build. `-PostgresToolsDirectory` selects the local PostgreSQL tool installation. `-EvidenceDirectory` selects a **new** directory within this repository; existing receipts are never overwritten. Default evidence directories include a timestamp.

Credentials are read internally from the ignored local development configuration and passed only through the process environment. Never copy a connection string into the evidence directory or command line. The runner rejects a non-loopback server. Keep other local application/test writers idle during the preservation comparison; an unrelated development write must produce a failed comparison, not a false preservation claim.

Ordinary test execution skips the recovery fact. The wrapper explicitly sets `PSEQ_PHASE4_VALIDATION=1` and `PSEQ_PHASE4_STAGE=run`. It does not enable other opt-in browser/restore fixtures. It restores its environment after execution.

## What happens

1. Fingerprint every configured-development table read-only, including both protected Website intake tables. Generate two new UUID-suffixed databases. Refuse existing identities or configured-development fixture targets.
2. Apply current migrations to the empty source database and capture the commercial laboratory journey using owning commands. Actual-run identity differs from the vendor job. Current scientific requirements and independent review remain enforced. Capture the delivery, exact tube chain, preservation hold and frozen investigation report.
3. Produce a native custom-format PostgreSQL dump and a separate private-file copy. Hash every copied file. Restore into the other empty database and an independent file root. Compare every table's sorted full-record SHA-256 and row count, including migration history; compare all file bytes by SHA-256 and size.
4. Make the original private-file directory unavailable. Use the restored application controllers to validate the exact chain, download the original report and raw file, and retry original requests. Require unchanged identities, material quantities and physical uses.
5. Deliberately corrupt and remove restored raw bytes, then restore them. Deliberately alter the restored report outside the immutable application boundary, then restore it. Verify integrity/missing-file rejection. Verify conflicting/stale commands and held-material destruction are refused. Simulate result-byte cleanup through the storage adapter; internal raw evidence, lineage and report remain accessible. This is not a run of a scheduled cleanup worker.
6. Add 10,007 history events, including equal timestamps, and page through all frozen events. A second database context commits a later event while paging is in progress; it must stay outside the frozen boundary. Check complete, duplicate-free traversal, bounded rows/query count, actual timings and refusal of a report exceeding its supported history size.
7. Drop only the generated databases and verify their absence. Remove only the generated, validated, link-free temporary file tree. Compare every configured-development table again, and retain evidence receipts.

External analysis packaging and clean-scan observations are explicit fixtures. Release uses the real controller; its existing tracked customer-download helper supplies the same synthetic result bytes. The backup separately preserves and verifies those bytes in the actual local storage adapter. This does not prove a live producer, hosted object storage or a customer browser download.

## Review evidence

- `phase4.trx` and `test.log`: exact selected tests, failures and skips; a skipped recovery fact is **not** a pass.
- `checkpoint.json`: synthetic identities and request/relationship checkpoints. No credentials or real customer data.
- `ownership.json`: intended database/private-root identities written before setup and updated as resources are created. Cleanup removes only resources whose creation this run owns.
- `source-tables.json` / `restored-tables.json`: full table identities, row counts and record hashes before restored mutation probes.
- `backup-files.json` / `backup-restore.json`: private-file hashes/sizes, native dump hash, database identities and restore comparison.
- `recovery.json`: functional recovery assertions and their synthetic scope.
- `long-history.json`: event/page/query counts, local controller/database timing and report-limit result.
- `development-before.json` / `development-after.json` / `cleanup.json`: configured-development preservation, generated fixture removal and absence checks.
- `progress.json` / `run.json`: last reached recovery stage and final recovery-case status. The overall test result also requires successful focused regressions in the TRX.

Each run uses fresh fixtures; never replay a real accession, shipment or result release to manufacture evidence. The dump and copied synthetic bytes are temporary; receipts retain their hashes after cleanup. On failure inspect `cleanup.json` before a rerun. If cleanup is absent or failed, identify the exact generated database names/root from that run and inspect them before any manual removal. Do not broaden cleanup to configured development, another run, or hosted data.

The normal selection also includes real HTTP Trial custody and late-handling history regressions plus cleanup-failure unit cases. Recovery cleanup reconnects independently for each database, attempts all known resources/preservation checks, restores process targets before writing receipts and retains original operation errors alongside cleanup errors. `remainingKnownDatabases` and typed errors identify unfinished cleanup; a failed receipt cannot suppress another receipt attempt.

Every recovery case additionally runs `cleanup-failure-probe/`: its capture and first database cleanup deliberately fail. The nested `cleanup.json` and `run.json` must therefore say **failed**, while proving the other database/private files were removed, development preserved and targets restored. The probe independently removes the deliberately retained database and writes `repair.json` confirming absence. This expected negative receipt is not a failed regression; the enclosing test passes only after the assertions and repair succeed. The Trial HTTP case writes its own `trial-custody-ownership.json`, outcome and absence receipt.

## Qualification still required

The [acceptance crosswalk](../plans/SAMPLE-TRACKING-PHASE4-ACCEPTANCE.md) separates local proof from full navigation/accessibility, live identity/provider/storage/scanner, concurrent hosted database/files backup consistency, scheduled recovery/cleanup, representative legacy-copy rehearsal, scientific procedure sufficiency and the Owner's questioned-result walkthrough. None of those gates is activated or signed off by this command.
