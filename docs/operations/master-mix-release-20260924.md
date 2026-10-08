# Single-use master mix release — September 24–25, 2026

## Scope and source

The owner authorized the shared single-use master-mix workflow, its retirement and new-tray safeguards, testing, Git publication, deployment, and all six pending production migrations. The release source is `16a06b92a55c0fb2e45e16d38e0034e6c2514385` on `codex/portal-documentation-search-release`. Three scoped commits were pushed: `2462c273` (implementation), `030e88a9` (generated documentation), and `16a06b92` (regression fixtures). Unrelated staged checkout changes were excluded.

An isolated checkout at that exact source passed the Release backend build with zero warnings and errors, 760 disconnected backend tests with 347 database-dependent skips, 1,217 frontend unit tests across 189 files, and 190 browser tests with two skips. Frontend lint, typecheck, documentation consistency after generation, and the production build passed. The shared checkout also passed a full connected backend run against a newly migrated disposable PostgreSQL database: 1,106 passed, two skipped; that database was dropped. Its one additional Supplier catalog test was not in the scoped release commit, so the connected count is general regression evidence rather than an exact-commit test count.

The feature-specific connected master-mix and signed-in browser journeys in the [backend](../plans/BACKEND-TEST-PLAN.md#single-use-master-mix-2026-09-24), [frontend](../plans/FRONTEND-TEST-PLAN.md#single-use-master-mix-2026-09-24), and [E2E](../plans/E2E-TEST-PLAN.md#single-use-master-mix--september-24-2026) plans remain to be run. Physical recipe, label, scanner, pipetting, and bench qualification are separate acceptance evidence.

## Production migration and API

[Deploy Portal Green run 36078254854](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/36078254854) completed successfully at source `16a06b92a55c0fb2e45e16d38e0034e6c2514385`; API image tag is `sha-16a06b92a55c-run-36078254854-1`. Before applying migrations, the workflow verified an isolated restore from the live backup. Its restore checks reported four schemas, 17 existing migration rows, matching table counts and file references, and cleanup PASS. The encrypted backup and wrapped-key checksum checks passed for `pre-migration-20260925T003937Z-16a06b92a55c.dump.enc` and `.key.enc`.

The workflow applied exactly the six migrations separately approved by the owner, in this order:

1. `20260924150554_LinkPhaenoReagentProducts`
2. `20260924163055_AddTransportationKitProductsAndAssembly`
3. `20260924175734_PreserveReagentWorkflowRevisionHistory`
4. `20260924191923_EnforceUniqueLabStepNames`
5. `20260924204325_AddSingleUseMasterMix`
6. `20260924222224_CloseMasterMixGaps`

The deploy and smoke step succeeded after migration. The workflow recorded `migrations_requested=true` and the exact source and image above. The backup status workflow was disabled when a separate read-only baseline dispatch was attempted; the deployment's own fresh restore check confirmed the 17-migration baseline before applying these six.

## Portal and public verification

Vercel preview `dpl_9cG3F65BNtzXAHhzHJrgaFEMKASy` built successfully. After API activation, the same isolated source was rebuilt with Production environment settings as Ready deployment [`dpl_GPG2GEMM31KLKM1PSZjBstjv2PFS`](https://vercel.com/cadexgenomics/phaeno-ops-mgmt-system/GPG2GEMM31KLKM1PSZjBstjv2PFS). Vercel reports `portal.phaenobiotech.com` as an alias of that production deployment. The CLI deployment has no `gitSource` field; its source identity is evidenced by the isolated checkout's verified HEAD before upload, the frontend-only upload inspection, and the successful build's documentation corpus hash `8f7a90a5099a`.

Fresh public requests returned HTTP 200 for `/api/health`, HTTP 204 for `/api/v1/web-ops/database-ping`, and HTTP 200 for the Portal root. A new unauthenticated browser session rendered the complete sign-in form without page errors or failed requests; its screenshot is retained locally at `artifacts/mastermix-release-20260924/portal-signin.png`. No signed-in production master-mix record was created or used for this smoke check.
