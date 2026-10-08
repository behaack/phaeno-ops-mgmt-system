# Service catalog consolidation release - September 18, 2026

## Authorization and scope

The owner requested all UI, API and E2E tests, fixes until successful, then commit, push, production deployment and necessary EF migrations.

This release consolidates scientific definitions beneath their service catalog items; enforces exact supported sample-type revision relationships and one current definition per item; preserves accepted snapshots and legacy historical records; adds linkable sample-type detail pages; and aligns Analyses, PSeq kits, Assembly, Legacy links and catalog headers with semantic colors and typography. See ORDER-MANAGEMENT-PLAN.md and SAMPLE-SHIPPING-AND-INTAKE-PLAN.md for behavior and compatibility details.

Full-suite fixes also protect in-flight preparation failure records, preserve failed-tube inspection while skipping a step, retain approval-override drafts, contain the CRM Tasks table header on mobile, and restore focus after email recovery. Older browser fixtures now follow current workflows. No live customer, laboratory, billing or notification writes are part of verification.

## Verification

- UI: all 1,047 tests passed in 166 files on the final full run (97.62 seconds).
- API: all 891 eligible tests passed, including database integration cases against an isolated PostgreSQL 18 instance (15 minutes 16 seconds). The existing Unix symlink test is excluded on Windows; 892 total cases, zero failures.
- E2E: all 162 eligible desktop/mobile cases passed (4.3 minutes). Two print-layout cases run on desktop and are excluded on mobile; 164 total cases, zero failures. Browser fixtures simulate external services and unavailable authentication; this is not live identity-provider or physical-print acceptance.
- Full lint, typecheck, frontend production build, backend Release build (zero warnings/errors), documentation corpus check and whitespace checks passed. Documentation corpus: 56 guides, `f0cfbec99481`.
- EF pending-model check passed. The additive migration `20260918232810_ConsolidateServiceSampleTypes` applies successfully to an empty isolated local database and is already applied to normal local development.

## Migration and deployment

Production deployment followed final test success. The protected deployment workflow created and restore-verified an encrypted backup before applying pending migrations. Storage, scanning and identity settings remained Preserve. The generated private local search index is excluded. The public Website is outside this Portal release.

- Application commit: `f1d31e49f58a14e5ed58df2a4790a50496508c93`, pushed to `codex/portal-documentation-search-release` and independently matched to the remote branch.
- API: [Deploy Portal Green run 35410313810](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/35410313810) succeeded. Runtime source revision matches the application commit; image `sha-f1d31e49f58a-run-35410313810-1`, verified at 2026-09-19 00:48 UTC.
- Backup: `pre-migration-20260919T004802Z-f1d31e49f58a`; restore, migration-history and cleanup checks passed, as did encrypted dump/key checksums. Logs confirm `20260918232810_ConsolidateServiceSampleTypes` was applied successfully.
- Post-API-release checks: public API health 200/healthy and database ping 204.
- Frontend: [Production deployment 9NLUU18FUTdKSiQrcoy9WhACvawx](https://vercel.com/cadexgenomics/phaeno-ops-mgmt-system/9NLUU18FUTdKSiQrcoy9WhACvawx) is Ready, rebuilt using Production settings from the same application commit and assigned to `portal.phaenobiotech.com`; both deployment checks passed. Source preview: `F2694QstYodU9K1afCe4NnVEn9Mq`.
- Post-frontend-release checks: Portal root 200 and Portal API proxy health 200. Fresh signed-in navigation loaded the service catalog, its new item detail route and embedded Scientific definition section, the sample-type list and exact-revision detail route, and all four corrected settings lists (Analyses, PSeq kits, Assembly and Legacy links). Screenshots confirmed consistent shaded headers, matching title styling and right-aligned creation actions. The production catalog has no scientific definition yet; its explicit empty state and manual-pricing availability are correct. No configuration or business records were changed during browser verification.

Automatic approval review blocked an initial frontend promotion action while the API was still deploying. No promotion occurred then. After API and migration success was verified, the production-environment frontend rebuild proceeded.

The owned isolated PostgreSQL test instance was stopped after the suites passed. Only the pre-existing generated private search index remains outside the release. A documentation-only follow-up records deployment evidence; it does not change the deployed application identity.
