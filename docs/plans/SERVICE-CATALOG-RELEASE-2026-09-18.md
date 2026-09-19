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

Production deployment is gated on final test success. The existing protected deployment workflow will create and restore-verify an encrypted backup before applying pending migrations. Storage, scanning and identity settings remain Preserve. The generated private local search index is excluded. The public Website is outside this Portal release.

Exact commit, production migration backup, API workflow, Vercel deployment and runtime checks will be recorded here after release.
