# Portal API and UI production release - September 15, 2026

## Authorized release

The owner requested commit, push and production API/UI deployment, then explicitly approved the appropriate migration. The reviewed [release plan](../../plans/PORTAL-RELEASE-2026-09-15.md) defines scope, backup, compatibility and recovery boundaries.

Application commit: `5d57de217542efeafbe45b1bd654dc1ed200a6be`, pushed on `codex/portal-documentation-search-release`; remote reference independently matched. It contains the complete 159-file UAT/application batch. The separate public Website is not promoted.

## Validation

- Release build: passed, zero warnings/errors.
- UI lint, typecheck and documentation corpus: passed (56 guides).
- Backend baseline: 519 passed, zero failed, 258 explicitly skipped because of database/platform prerequisites. Separately configured Change-quote/manual-quote run: 5 passed, zero skipped.
- Component suite: 869/870 passed initially; one kit-dialog loading timeout. Its unchanged 20-test file passed with one worker. Combined distinct coverage is 870 passing component checks, with the initial timeout retained in the record.
- Prior targeted browser/manual/database UAT remains in the linked case reports; the entire manual suite was not repeated during release.
- Existing independent encrypted recovery-point checksums all matched. Generated forward migration SQL contains only three nullable column additions and EF history insertion in a transaction.

## Production API and migration

[Deploy Portal Green run 35044889461](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/35044889461) succeeded for exact application commit `5d57de217542efeafbe45b1bd654dc1ed200a6be`, with `apply_migrations=true`, storage/scanning `Preserve` and Clerk identity cutover `false`.

- Pre-migration recovery identity: `20260911234552_AddLibraryPreparationBatches` from the independently verified coordinated backup receipt.
- Deployment-created encrypted backup: `pre-migration-20260916T014246Z-5d57de217542`; isolated database restore/migration checks and encrypted dump/key checksums passed before migration.
- Actual migration log at `2026-09-16T01:42:55Z`: applied `20260916000046_AddLabChangeQuoteSnapshots`.
- Deployment completed at `2026-09-16T01:43:05Z`; actual image revision matches the application commit. Public Website intake counts remained `12,5`.
- Independent post-deploy check at `2026-09-16T01:43:56Z`: API health HTTP 200 (`healthy`), database ping HTTP 204.

## Portal UI

The exact-commit Preview `dpl_BkFvujCycnJNbLSDGrcUJwPzhPAv` passed. After the API succeeded, Vercel's Promote to Production action rebuilt with Production environment settings and assigned `portal.phaenobiotech.com`.

- Production deployment: [`dpl_3WMeZTvFToF9MtTcNpKK5f2ohcNH`](https://vercel.com/cadexgenomics/phaeno-ops-mgmt-system/3WMeZTvFToF9MtTcNpKK5f2ohcNH), **Ready**, 23-second build, source `5d57de217542efeafbe45b1bd654dc1ed200a6be`.
- Vercel Lint and TypeCheck both passed; domain assignment completed.
- Fresh production browser navigation reached the invitation-only Sign in form. No browser error-level console entries were recorded. No live business record was created for smoke testing.
- Final public checks: API health 200, database ping 204, Portal root 200, Portal `/api/health` proxy 200, public Website 200.
- Public Website deployment remains outside this promotion; no Website production action was taken.
- Runtime log review for this deployment (last 30 minutes, covering its entire lifetime) showed zero Warning/Error/Fatal console entries and successful production-root requests. Generated deployment-host probes to unconfigured `/__clerk/v1/client` and `/__clerk/v1/environment` paths returned 404; a direct check confirmed the Portal does not expose that proxy path. The configured Clerk sign-in rendered normally on the production domain with no browser console errors. This is signed-out smoke coverage, not a new authenticated business acceptance run. Monitoring/drain configuration was unchanged and not audited in this release.

## Acceptance boundary

This release does not turn the pending overnight SYS-06 scheduled-backup assertion into a pass. The owner-approved 04:15 Pacific follow-up must use this newly authorized application baseline and the new migration, while retaining physical/scientific/provider acceptance boundaries. No destructive migration, production restore, new identity grant or public Website promotion was performed.

Automation `close-final-uat-backup-case` was updated to verify this API/UI commit and migration in the scheduled backup receipt, preserving its 04:15 Pacific schedule and quiet-until-completion/problem notification policy.
