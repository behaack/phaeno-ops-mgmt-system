# DPS output admission — Portal-only hosted-test release receipt

Status: **deployed and verified October 23, 2026 PDT**. The Owner authorized committing/pushing the reviewed engineering work and deploying only the Portal API and matching frontend/help. The [preserving plan](../plans/DPS-ADMISSION-PORTAL-TEST-RELEASE-20261023-PLAN.md) governs this release. No DPS deployment/start, assembly command, real pilot, migration, authentication change or storage cutover occurred.

## Published and deployed identity

| Item | Verified identity |
| --- | --- |
| Reviewed/deployed API and frontend source | `b3b72ac787957e7fdc9395b7ea69ef3e70e502b1` |
| Protected publication | [PR #7](https://github.com/behaack/phaeno-ops-mgmt-system/pull/7), merged as `3752f607ae8d16603cf3f8af4e538225ad4dc73b` |
| Source tree | `4952268104c850e751c6833ef54e3c72e14da1f1` |
| Exact source archive SHA-256 | `10d6c1f3eb4c8476252d25367379fa40fa4d4b63f89734cf0e144bef3742e059` |
| API image | `phaeno-portal-green-api:sha-b3b72ac78795-manual-20261023-admission` |
| API image ID | `sha256:054aef2236ed787ab6665bc5e82bead2670c96e8802f1b6c0fdf60f7d5a93ef6` |
| API release | `/opt/phaeno.portal-green/releases/b3b72ac787957e7fdc9395b7ea69ef3e70e502b1-manual-20261023-admission` |
| Frontend | `dpl_AKHhdm8Dww2KS6yyP8q7vy5jEQwz`, `phaeno-ops-mgmt-system-7dph9l59u-cadexgenomics.vercel.app` |
| Canonical Portal | [Hosted test](https://portal.phaenobiotech.com) |
| Help corpus/index | 62 guides, `9aae02df9751634cbb72bff7c7f7390f6b21867fad686bd785de9ec3506e32e0` |

The Portal now checks the complete scientific-output and parameter-file set against the effective scanner/file/set limits before downloads or file registration. An oversized set retains its saved execution facts and requires Operations review. Existing scientific admission/retry behavior, endpoints, authorization, schema and `poms-dps/1.0` remain unchanged.

The [DPS engineering package](../../integrations/dps/README.md) is published as a source patch and handoff artifact in this repository. It was not applied or activated on the processing server or published to the separate pipeline repository. Its historical verification receipt remains the implementation-time snapshot, not a claim of hosted scientific acceptance.

## Checks and activation

The prior focused verification remains 36 Portal checks, five documentation publication checks and 51 local Linux DPS fixture checks passed. This release additionally passed a Portal Release build with zero warnings/errors, frontend typecheck, documentation freshness and production frontend build. All three required exact-source jobs (`ui-quality`, `visual-baselines`, `workflow-behavior`) passed in [the PR run](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/39912078075). Required checks/admin enforcement and reviewed images were not changed.

The connected Vercel app could not access the known project; the existing authenticated Vercel CLI completed the scoped release. The production-environment frontend was staged without assigning domains, and its 15 entry assets (1,549,318 bytes) were fetched through authenticated deployment access and hashed. The protected API release script passed its exact-source quality gate, lock, runtime/auth/storage/scanner checks, clean/EICAR/encrypted/oversize scanner smoke and both-area storage/checksum/scan/readback verification. It activated the API with migrations and identity cutover false and completed at `2026-10-23T11:56:22Z`.

Only the Portal-owned SSH tunnel restarted to follow the replacement API namespace; the remote DPS process was not started or changed. After API health verification, the already-tested frontend was promoted without rebuilding. All 15 canonical assets equal the staged bytes. The skew release boundary advanced to `1792756667393`, retaining the twelve-hour maximum (`43200` seconds), and the prior auto-domain setting was restored.

## Recovery and preservation

Fresh protected recovery is retained under `/var/backups/phaeno-portal-deploy/dps-admission-portal-20261023`. A coordinated exported PostgreSQL snapshot supplied the dump and complete table fingerprints. An isolated PostgreSQL 18 restore reproduced all 250 table fingerprints. Independent off-server decryption verified every one of the 117 included runtime/document/Local files and the dump/restore comparison without writing plaintext locally.

| Encrypted artifact | SHA-256 |
| --- | --- |
| `recovery.tar.gz.enc` | `4d83e286773f40f36b6158b6942e6990c9b1bfcb45afdf33c278a136cc1edd4b` |
| `recovery.key.enc` | `5b408e07bc6a735f026afa9facf30f47fcdbd462521910942fb9d4ea38232dce` |

Final comparisons show **all 250 database tables unchanged**, including all 12 Mailing-list contacts and six Demo requests with complete contents/history. All 115 unrelated files are unchanged; only `runtime/compose.env` and `runtime/deployment-manifest.txt` contain expected release metadata changes. No database was replaced or restored over live activity. Prior API image `sha256:0c2c513d5750159c05255f52d4a1a9bf597f3c6c24f1c08aa81117ca6eb6c977` and frontend `dpl_EZzXjhyhEirkaC1qyw8aGR821FwU` remain rollback targets.

`SIMULATED-ASM-20261020` retains all six attempts, 28 receipts, 42 events and nine commands with whole-record equality. This includes both disputed terminal receipts, the original Failed execution and appended Operations reconciliation, all earlier repeat outcomes and the successful diagnostic repeat `e1572182-c16b-446a-9ecb-a45a2d3ec15e`. No new assembly or scientific analysis was created.

Read-only DPS comparisons retain source `c68e584f29a0e8faa2a9a6537075d356de1929fc`, the identical ledger SHA-256 `be97b1c7563d07958c15a92d0ca093797f856dacf6ff21fd27699621c9d60e70`, four terminal jobs and all final acknowledgments. No DPS worker was running before or after this release. DPS checks were read-only; no installation or binary change was performed.

## Hosted acceptance and remaining holds

- API/database/scanner are healthy; public API health returns 200, database ping 204 and anonymous assembly access 401. API image source and runtime provider/auth settings match the reviewed release and preservation scope.
- The existing signed-in browser reloads the retained successful attempt with unchanged start/stop/disposition, parent link, delivery receipt, input hashes, diagnostic outputs and history. It truthfully reports DPS unavailable while the worker remains stopped. The updated Phaeno help renders the new admission-recovery instructions. The browser was returned to its original assembly record.
- The API reports the matching 62-guide documentation index. The bounded post-release API error scan found zero failure/critical/unhandled records; a fifteen-minute frontend error/fatal log query returned zero records without excluded intervals. This is bounded release observation, not extended monitoring or scientific validation.
- Runtime settings and both OCIA container identities/start times are unchanged. Existing Vercel Git holds remain in source. `Deploy Portal Green` remains `disabled_manually`; orphan `39056745064` remains queued with unchanged timestamp and its exact release-path quarantine intact. It was neither retried nor cancelled. The established protected direct-host path handled this release.
- Populated-S3 recovery deferral and the disabled backup timer remain. No commercial activation, scientific approval, real pilot or DPS restart occurred. Actual native integration/qualification and scientific approvals remain governed by the [real-assembly plan](../plans/REAL-ASSEMBLY-HOSTED-TEST-IMPLEMENTATION-PLAN.md).
