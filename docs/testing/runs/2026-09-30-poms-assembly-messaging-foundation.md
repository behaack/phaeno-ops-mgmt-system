# POMS assembly messaging foundation — September 30, 2026

## Delivered scope

The authorized [messaging foundation](../../plans/POMS-DPS-MQTT-MESSAGING-PLAN.md) adds durable Run/Cancel delivery identities, saved attempts/backoff, confirmation deadlines, persistent attention and 30-minute escalation. Normalized lifecycle receipts commit before acknowledgment eligibility, deduplicate provider event IDs, retain conflicting evidence and preserve saved execution outcomes. Actual execution times remain distinct from POMS receipt/confirmation times. Percentages remain transient.

Authorized Phaeno laboratory viewers receive job-scoped SignalR refresh prompts for committed status/attention and transient progress. Notifications contain only job identity/version; clients reload authenticated HTTP snapshots, resubscribe after reconnect and retain polling fallback. Access is rechecked before delivery, and expired/revoked connections close. The job detail includes Delivery and recovery. The official browser client is pinned to `@microsoft/signalr@10.0.11`; the Vite development server has an explicit notification WebSocket proxy.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| API and test-project build in isolated `MqttFoundation` configuration | Pass; zero warnings/errors on final build | `dotnet build backend/test/PSeq.Operations.Test.csproj -c MqttFoundation --nologo -v quiet` compiles the API and referenced modules without replacing Visual Studio's Debug output. |
| Focused backend domain/reference suite | Pass: 24, failed: 0, skipped: 0 | [TRX](../../../backend/artifacts/mqtt-foundation-evidence/mqtt-foundation.trx), [test output](../../../backend/artifacts/mqtt-foundation-evidence/backend-tests.log) |
| Additive migration on isolated PostgreSQL database | Pass | [Migration output](../../../backend/artifacts/mqtt-foundation-evidence/isolated-migration.log) |
| Configured local development migration | Applied: `20261001032706_AddAssemblyMessagingRecovery`, database `phaeno_ops_clean_20260919` | [Local migration output](../../../backend/artifacts/mqtt-foundation-evidence/local-migration.log); subsequent history check confirmed this exact migration. Existing unfinished attempts receive unconfirmed recovery identities; no existing execution or scientific records are deleted. |
| EF model/snapshot consistency | Pass; no pending model changes | `dotnet ef migrations has-pending-model-changes --project backend/app --startup-project backend/app --configuration MqttFoundation --no-build` |
| Frontend assembly regressions | Pass: 3 files, 11 cases | `pnpm run test -- src/features/lab-operations/use-assembly-notifications.test.tsx src/features/lab-operations/AssemblyJobs.test.tsx src/features/lab-operations/assembly-jobs.test.ts` |
| Frontend lint and typecheck | Pass | `pnpm run lint`, `pnpm run typecheck`; notification hook lint repeated after the final reconnect adjustment. |
| Frontend production build | Pass | [Build output](../../../backend/artifacts/mqtt-foundation-evidence/frontend-build.log) |
| Documentation generation/check | Pass: 56 guides, corpus `04ac3666a479` | `pnpm docs:generate`, `pnpm docs:check`; Phaeno laboratory guide and review date updated. |
| Complete database ERD | Regenerated | `python scripts/generate-database-erd.py`: 231 tables, 3408 fields, 547 foreign keys. |
| Whitespace validation | Pass | `git diff --check` |
| Task-owned isolated database cleanup | Pass | [Cleanup evidence](../../../backend/artifacts/mqtt-foundation-evidence/cleanup.log); each isolated run removed its newly created database. |

Backend reference coverage includes simultaneous receivers, durable commit visibility from a separate context, restart/replay, cross-instance stale receipt tracking after conflict, database timestamp precision, progress without receipt/job/audit history, wrong-provider/foreign-event rejection, stale lifecycle evidence, malformed manifests, preserved terminal facts, cancellation races, retry persistence, escalation without abandonment and expired/revoked notification access. Domain tests cover receipt versus execution, accepted-state start rejection, pre-execution cancellation, immutable conflicts and reconnect scoping. Frontend tests cover watched versus foreign notices, fresh token retrieval, reconnect/scope change, disabled sessions, failure retries/cleanup and cancellation-outcome presentation without an invented command receipt.

## Remaining acceptance and activation

- The running Visual Studio/IIS Express API uses its existing Debug output. Restart that local API to load this implementation. The migration is already applied; the custom verification build did not stop or replace the owner's debugger.
- Live authenticated browser-to-hub behavior and responsive/manual notification acceptance are not claimed. Internal SignalR dispatch/client regressions are synthetic. Hosted release planning must verify a WebSocket-capable API origin/proxy and reconnect behavior; progress currently belongs to the reporting instance's transient cache.
- No MQTT client, DPS connection, broker credentials, wire enum mapping, invented response topic or independent Operations alert sender is configured. Processing remains default off with the unavailable provider.
- DPS shared-source/contract review, application acknowledgments and durable DPS replay, TLS/topic authorization, output-folder/manifest verification, multi-instance live routing, prolonged-outage proof, hosted acceptance and scientific/business acceptance remain the [plan's external gates](../../plans/POMS-DPS-MQTT-MESSAGING-PLAN.md).
- No deployment, Git staging, commit or push was performed. The Portal deployment hold remains in effect.

Temporary verification helper/build directories are removed after use. Evidence logs/TRX are retained for review; running Debug/development output and pre-existing frontend build output are preserved.
