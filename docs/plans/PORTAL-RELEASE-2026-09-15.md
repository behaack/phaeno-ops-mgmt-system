# Portal API and UI production release - September 15, 2026

## Authorization and scope

The Product Owner explicitly requested commit, push and production API/UI deployment of the completed UAT batch, then separately approved: "Yes, please apply appropriate migration."

Publish the pending Portal application, tests, guides and acceptance evidence on `codex/portal-documentation-search-release`. Deploy the exact committed API revision through `Deploy Portal Green`, preserve existing storage and scanner providers, apply the approved migration, and retain the existing Clerk identity. Build the matching Portal UI with Production environment settings before promoting it. Do not promote the separate public Website or alter provider credentials/roles.

## Database change and recovery

- Target: existing production Portal PostgreSQL database and `commercial_ops.lab_service_quotes`.
- Observed production migration from the verified backup receipt: `20260911234552_AddLibraryPreparationBatches`.
- Expected new migration: `20260916000046_AddLabChangeQuoteSnapshots`; adds nullable `accepted_amendment_snapshot_json` (jsonb), `change_roster_finalized_at` (timestamptz), and `change_scope_snapshot_json` (jsonb). No data deletion, backfill or existing-column rewrite.
- Expected database lock is brief on this empty production quote table, normally seconds; no hard outage guarantee. API replacement also requires a health-check interval.
- Existing coordinated recovery point: `snapshot-20260916T012341Z-2de2eacf-afef-4d28-a36f-b79f1d4dca53`, verified encrypted independent artifact `10426387535` from run `35043891714`. Downloaded receipt identifies the exact baseline migration; ciphertext checksums must match.
- The deployment additionally creates and restore-verifies its own encrypted pre-migration database backup before running EF migrations. Verify the actual applied migration in deployment output before promoting the UI.
- Compatibility: old API can ignore these nullable columns; new API requires them. If application verification fails, retain the additive columns and investigate a forward fix or deliberate previous-image deployment. Do not run the destructive Down migration or restore production automatically. The deployment script disables automatic image rollback after a migration.

## Verification and release identity

Release build, UI lint/typecheck, documentation corpus and focused existing UAT evidence are reviewed; fresh test results and exact deployed identities will be recorded in the release report. Confirm API health, database ping, actual image revision, UI source/environment and production domain after deployment. This application rollout is separate from SYS-06's pending actual overnight scheduled-backup evidence; update that follow-up to recognize the newly authorized deployed baseline.

Pre-publication results: Release build passed with zero warnings/errors; UI lint, typecheck and 56-guide corpus check passed. Backend baseline passed 519 checks with 258 explicitly skipped (database prerequisites plus the platform-specific link check); the separately configured Change-quote/manual-quote run passed all 5 checks without skips. UI suite passed 869/870 initially, with one kit-dialog loading timeout; its unchanged 20-test file passed on a single-worker rerun. This supplies 870 distinct passing component tests across the runs, not a claim of an entirely green first run. Prior documented browser/UAT evidence is retained without rerunning the whole manual suite. All three downloaded encrypted-backup manifest checksums match. The generated forward migration SQL contains only the three nullable column additions and EF history insertion in one transaction.

## Completed outcome

Commit `5d57de217542efeafbe45b1bd654dc1ed200a6be` is pushed and deployed to both API and Portal UI. API run `35044889461` passed the encrypted backup/restore gate, applied the approved migration and confirmed the exact running image. Portal Production rebuild `dpl_3WMeZTvFToF9MtTcNpKK5f2ohcNH` is Ready with Lint/TypeCheck passed and the production domain assigned. Public health, database, UI and proxy checks pass. [Full release evidence](../testing/runs/2026-09-15-production-release.md). The SYS-06 automation now checks this authorized baseline overnight.
