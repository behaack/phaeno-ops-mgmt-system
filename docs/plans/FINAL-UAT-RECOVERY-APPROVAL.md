# Final UAT recovery gate - September 15, 2026

## Decision ready for the Product Owner

Authorize a scoped backup-maintenance rollout to `behaack/phaeno-ops-mgmt-system` default branch `main`, followed by **Back Up Portal Database and Files: install-and-backup** against the existing production environment. The owner responded "Close the final case. Phew." after this scoped approval request. This continuation treats that instruction as authorization to execute the reviewed backup-only rollout, subject to the isolated rehearsal gate.

This operation briefly interrupts Portal and public Website API requests. Capture has a 120-second budget after graceful shutdown; an independent 180-second watchdog restarts the exact original API container if the caller is interrupted. These are control budgets, not a guarantee of total outage duration. Health recovery is mandatory before verification and encryption continue.

The repository's [agent guide](../../AGENTS.md) requires an explicit request before Git mutations and approval for high-impact production work. [SYS-06](../testing/10-recovery.md#sys-06--coordinated-restore-and-release-level-acceptance) expressly does not authorize a production writer interruption.

## Reviewed source and bounded rollout

- Source revision: `7df0ccbef62252732ceae877abb4fe7bb9a721dc`.
- Backup workflow blob: `7ae891ba558b08be54de3bb7437fb3f01f6c41c8`.
- Green deployment directory tree: `4e15bfba762c0c725a5a7989889dfec997dbe7c6`.
- No workspace differences exist for these backup files. Recheck source identity and the default branch before rollout.
- Publish only `.github/workflows/portal-backup.yml`, `coordinated-backup.sh`, `verify-database-backup.sh`, `restore-backup-envelope.sh`, `install-coordinated-backup-timer.sh`, `record-backup-export.sh`, `backup/`, and the backup runbook under `deployment/hetzner/green/`. Use an isolated checkout and review dependency differences against `main` before merging.
- Keep the current application's pending UAT batch separate. This approval does not publish that batch, deploy an application, migrate a shared database, restore production or alter identities/permissions.
- Target: existing protected GitHub production environment, `/opt/phaeno.portal-green`, exact running Portal API container and its existing managed Local files volume. Use existing protected SSH credentials and public encryption key. Private keys stay out of chat, logs and the application server.

## Execution and acceptance

1. Compare scoped maintenance files against current `main`; preserve unrelated work. Complete an isolated Linux/systemd capture, watchdog and restored-Portal-download rehearsal before any production interruption. Existing 26 safety fixtures and two-file Docker restore alone do not satisfy this prerequisite.
2. Publish the reviewed maintenance scope and dispatch `install-and-backup` during the approved maintenance window. Preflight verifies source/container/volume identity, other writers, capacity and API health. Abort if a precondition fails.
3. Verify the same API returns healthy; require successful isolated database/file restore checks, encryption, off-server collection and receipt/checksums before enabling the timer.
4. Confirm the host timer at 2 a.m. America/Los_Angeles (3 a.m. DST fallback) and GitHub scheduled collection at 10:47 UTC. Retention is 35 days. Record an actual scheduled run and encrypted off-server artifact; a manual run cannot satisfy that assertion.
5. Complete isolated populated restore verification for a representative Job/package/receipt and real test-artifact download. Any private decryption-key step is performed privately by its owner. Do not restore production.
6. Record exact deployed API/UI/Website revisions and schema/provider/flag prerequisites, reconcile physical/scientific/provider gates, then obtain the Product Owner's explicit final release acceptance.

## Stop and recovery rules

Follow the [backup runbook](../../deployment/hetzner/green/BACKUP-RUNBOOK.md). Failed health recovery, changed container identity, incomplete capture, missing owned files, mismatched checksums or absent off-server artifacts prevent acceptance. Retain sanitized failure receipts and disable only the newly activated timer if rollout fails; preserve verified encrypted recovery points. A host-local file alone is not independent backup proof.

## Current disposition

**September 16, 05:32 Pacific recovery supersedes the earlier follow-up below:** the owner requested a fix. The actual 02:00 host snapshot was retrieved using `collect-latest` run `35096088897`; its current application/migration receipt, three checksums, encrypted off-server artifact `10445867906` and export receipt passed. No new capture or application interruption was performed. The existing GitHub workflow was re-enabled and the already authorized morning automation now includes missed-export recovery while this case remains open. GitHub's schedule is correctly present on active `main`, but no schedule event has been observed; its precise missed-trigger cause remains unconfirmed. SYS-06 therefore remains 80/81 pending a genuine schedule-event collection, with automatic follow-up active. [Recovery details](../testing/runs/2026-09-15-sys06-recovery.md).

**September 16, 04:17 Pacific follow-up:** SYS-06 remains Blocked and software closure remains 80/81. GitHub reports no actual schedule-event run yet; the active backup workflow lists only the successful installation run. API health/database ping/Portal root pass. The host's overnight capture and its new revision/migration/export receipt are unverified because the optional authenticated status dispatch was unavailable. Keep the existing automation active for the next scheduled evidence check. No backup, deployment, migration, restore or access change was performed. See the [updated execution report](../testing/runs/2026-09-15-sys06-recovery.md) for the concrete remaining evidence.

SYS-06 remains **Blocked only on the actual overnight scheduled evidence**. The real isolated Linux/systemd capture, forced-kill watchdog, decrypted restore and authenticated matching-byte downloads passed. Backup-only PR 1 merged as `e8df58b92aefebd3f4ddbecde96e23a9ee1fbab0`; production installation run `35043891714` passed with a 7-second recorded API pause, encrypted off-server artifact and export receipt, then enabled the daily timer. The owner separately approved temporary exact-revision Vercel build guards; all three application builds were skipped and original Automatic settings restored. Existing production application revisions remain unchanged.

The owner approved an automatic September 16, 04:15 Pacific check and conditional closure. Automation `close-final-uat-backup-case` must prove a real scheduled host snapshot and GitHub collection before closing, then pause itself. No manual dispatch may replace that assertion. The owner's closure direction accepts the established software-UAT boundary; physical/scientific/provider gates and release of the newer local application remain separate. See the [execution report](../testing/runs/2026-09-15-sys06-recovery.md) for exact release identities, hashes, artifact receipt and continuation instructions.
