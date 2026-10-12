# Scientific, retained-list, localization and performance continuation

Date: October 11, 2026. Authorized scope: continue the remaining application gaps
and run relevant tests. Follows the [earlier verification](2026-10-11-system-gap-closure-verification.md)
and [closure register](../../plans/SYSTEM-GAP-CLOSURE-PLAN.md).

Customer-only i18n and deployment on hold remain in force. No model/migration,
dependency, authentication, provider dispatch, remote database, deployment or Git
mutation occurred. Existing operational data and the running app output remain.

## Delivered behavior

- Work/review discovery assesses existing command scientific lineage, profile,
  current vendor inputs, performance review, exact-package QC and artifacts
  before counts or paging. Review shares whole-work and exact-sample attempt
  readiness. Assessment takes no command locks or stamps; commands still recheck
  and retain their concurrency boundary. Invalid release configuration disables
  the release source.
- Reagent runs have complete search/status/paging and saved list return. Tenant
  downloads/activity/governance and Phaeno provisioning/activity/governance have
  stable scoped pages and totals. Active attention is filtered before paging.
  Trial timeline pages reach older events and filter internal commercial outcomes
  before external counts. Legacy list ceilings were removed for complete retained
  reads. Governance contextual actions use the shared Actions menu.
- Customer help metadata/search and shared Department dictionaries, touched API
  error feedback and data-history dates use the Customer catalog/locale. Scientific
  and entered values retain their meaning. Other audiences remain English; en-US
  alone is published. Normal English source messages bypass pseudolocale matching.
- Guide bodies load individually with status, retained heading/navigation on
  failure, and Reload guide recovery. Updated guides, review dates and generated
  corpus remain consistent; lazy map validation accepts only explicit MDX paths.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Full frontend regression checkpoint | 240 files; 1,504 passed, 3 skipped, 0 failed | [Log](../../../output/gap-closure-20261011/frontend-remaining-full-final.log) |
| Final affected components | 8 files; 32 passed, 0 failed | [Log](../../../output/gap-closure-20261011/frontend-remaining-affected-final.log) |
| Additional list/menu regressions | 2 files; 3 passed, 0 failed | [Log](../../../output/gap-closure-20261011/frontend-remaining-list-menu.log) |
| Backend build and full suite | 0 build warnings/errors; 899 passed, 407 gated skips, 0 failed | [Build](../../../output/gap-closure-20261011/backend-remaining-build-final.log), [Tests](../../../output/gap-closure-20261011/backend-remaining-full-final.log), [TRX](../../../output/gap-closure-20261011/remaining-full-final.trx) |
| Selected PostgreSQL regressions | 5 passed, 0 skipped/failed | [Log](../../../output/gap-closure-20261011/backend-remaining-connected-final.log), [TRX](../../../output/gap-closure-20261011/remaining-connected-final.trx) |
| Relevant browser acceptance | 50 unique cases pass across final runs | [Batch](../../../output/gap-closure-20261011/e2e-remaining-final.log), [Data/help fixes](../../../output/gap-closure-20261011/e2e-data-help-final.log), [Guide recovery](../../../output/gap-closure-20261011/e2e-help-recovery-final.log) |
| TypeScript and ESLint | Pass after final source/test changes | [Types](../../../output/gap-closure-20261011/frontend-remaining-typecheck-last.log), [Lint](../../../output/gap-closure-20261011/frontend-remaining-lint-last.log) |
| Help publication / Customer references | 5 publication checks pass; 56 guides, corpus `668cd030c417`; 2,756 valid Customer English messages | [Publication](../../../output/gap-closure-20261011/documentation-remaining-tests.log), [Corpus](../../../output/gap-closure-20261011/documentation-remaining-generate.log), [Catalog](../../../output/gap-closure-20261011/customer-messages-remaining.log) |
| Isolated client/SSR/Nitro build | Pass; help/search 60.83 KB (12.19 KB gzip), previously 928.78 KB (237.79 KB gzip); main 2,065.14 KB (593.22 KB gzip) | [Build log](../../../output/gap-closure-20261011/frontend-remaining-build-final.log) |

The full frontend run initially forwarded the worker flag incorrectly; that run
was stopped and the passing checkpoint used two workers. Browser failures exposed
old heading/navigation/hydration assumptions and a missing guide heading during
module failure. The final expectations and fallback are corrected. Expected
network-abort console errors remain in the guide-recovery log. The publication
validator was updated alongside the lazy import map, then regenerated and checked.

Final working-tree whitespace and new receipt links pass. The previously staged
home-test trailing blank line noted by the earlier receipt was not changed in
the index. Task-created helper scripts, isolated build output/cache and Nitro
intermediates were removed after verification. Logs and TRX evidence remain.

PostgreSQL target: configured loopback Development database
`phaeno_ops_recovery_20261008`. Tests roll back only their synthetic rows. Connected
proof includes 505 scoped downloads/notices plus an excluded other-Department
download, older active governance amid 505 resolved incidents, 262 reagent runs
and 120 older Trial events. No migration or historical repair was applied.

## Remaining acceptance

The complete authenticated actor/source trigger-clearance matrix, external supply
prerequisite inventory and other list-return journeys remain open. Read-only
scientific validation deliberately evaluates all scoped candidates before totals;
its per-package evidence queries and external-domain reads need populated-tenant
latency/query-cost acceptance. The main bundle remains large; lazy help reduces
help download cost but does not close whole-application load performance.

Customer localization still needs a complete validation/server-error, guide-body,
email and generated-document inventory plus approved scientific/financial
translations before any additional language. Operational recovery/monitoring,
physical laboratory/hardware/training acceptance and the production-database
release plan remain separate gates. No full application or operational closure,
hosted readiness or deployment is claimed.
