# Investigation attachment integrity and restore rehearsal

Local verification on September 18, 2026 (artifact timestamps use UTC September 19). This continues the [sample traceability verification](2026-09-18-sample-traceability.md). No production deployment, shared migration or policy activation occurred.

## Implemented checks

Supporting reports are directly downloadable from sample history. Each request requires existing internal Lab authorization, the exact job/specimen and a reference from that specimen's execution to the specified preparation record. Another sample's membership in the same batch is insufficient. The new endpoint and existing preparation endpoint check clean-scan metadata, PDF signature, exact bounded byte length and SHA-256 before returning bytes. Admission is audited without claiming browser receipt. Saved investigation JSON/HTML downloads verify the original manifest checksum before returning either format.

PostgreSQL preparation regression covers a valid download, wrong job, unknown record/role, unrelated specimen, an uncovered member of the same shared batch, external actor denial, same-length corruption, shorter/longer bytes, missing storage, and no successful-admission event for failed verification. Browser cases cover a visible integrity error, successful retry/download, stable UI identity, keyboard focus, accessibility scans, light/dark themes and 320-pixel reflow on desktop/mobile projects.

## Restore proof

Final checkpoint: **43 focused backend regression cases plus one restore case passed**, with zero failures/skips in those final runs. The **four expanded investigation browser cases passed in 14.2 seconds**. Typecheck, touched-file lint, documentation checks (56 guides, corpus `c8b6054e65fd`) and whitespace validation pass. The mobile dark supporting-report screenshot was inspected visually. The previous 41 frontend unit cases and eight protocol browser cases were unchanged and were not rerun for this continuation. No persisted model changed.

`LabInvestigationRestorePostgresTests.InvestigationBackupRestoresExactTubeChainReportAndPrivateAttachment` passed without skips. The test accepts only a loopback PostgreSQL server. It creates two unique databases, applies all 75 migrations to the first, seeds synthetic evidence, commits it, captures a native PostgreSQL custom-format dump, copies the private files, then restores into the independent second database and file root. Both databases are removed in `finally`; it never restores into or drops the configured reference database. Private files use temporary directories outside the repository, as required by the real storage implementation.

The synthetic fixture includes a source tube and derived library, attempt, execution with personal performance and attached preparation record, sendout, sequencing output, analysis/input, attributed result artifact and saved investigation report. The rehearsal checks:

- Equal applied migration history and evidence-section counts after restoration.
- The restored result still resolves to the exact analysis, sequencing input and original tube barcode.
- Byte-for-byte identical investigation JSON and its original SHA-256.
- Successful scoped download and checksum of the restored QC PDF after removing the original source file.
- Result-byte deletion through the real storage adapter leaves the tube chain, saved report and separate supporting PDF readable.
- An intentional offline change to the restored manifest is rejected on download by `report_integrity_failed`.

Successful evidence: `artifacts/sample-investigation-20260919/restore-only.trx` and `investigation-restore-8ca5e400f1eb4659a596465f808cb1ed/verification.json` beneath the same artifact directory. The manifest records section counts, migration identities, synthetic IDs, private backup location, file/report/dump hashes and 28.47 seconds through the assertion checkpoint. The full test run took 38 seconds including cleanup. The database dump contains only synthetic fixture data.

Re-run with `PSEQ_OPERATIONS_REFERENCE_CONNECTION` set to an explicitly disposable loopback server, `PSEQ_POSTGRES_TOOLS_DIRECTORY` pointing to matching PostgreSQL tools and optionally `PSEQ_INVESTIGATION_RESTORE_ARTIFACTS` for verification artifacts. Select the exact test above. It needs permission to create/drop its own generated databases. No new package dependency is required.

## Verification corrections and limits

The first run could not connect because the restarted disposable server lacked its custom port option. The rehearsal then exposed test setup mismatches in EF migration-history naming and private storage placement; these were corrected to use the application's real settings and storage restrictions. Preparation assertions were updated for verified in-memory file responses. Browser verification also caught a duplicate React key introduced while adding the supporting-report section; the key now identifies the section and capture time, and the test checks for recurrence.

This is a functional local recovery proof with synthetic scientific evidence and declared test scan status. It does not validate a real instrument/producer, scanner, hosted object store, scheduled backup, crash-consistent backup during concurrent ingestion, approved retention/holds, scheduled result cleanup, or laboratory-owner acceptance. The result deletion check invokes the storage adapter directly; it does not substitute for retention-worker and concurrent-hold tests. The sparse fixture does not exercise every resource/custody/result pathway. Those boundaries remain explicit in the owning plan.
