# Direct Trial workflow and Opportunity Department verification

Date: October 2, 2026. Scope: local implementation and software verification.

This records the earlier checkpoint. A later owner decision also permits Platform
administrators and Commercial leadership to create Trials and approve complete
scope on submission. Current scope is in the
[Trial plan](../../plans/PROSPECT-TRIAL-PROJECT-PLAN.md#october-2-2026--administrator-and-leadership-direct-approval).

Business Development now creates a Trial directly for a searchable Company and
Department. No Opportunity or Company request is required. Commercial leadership
is the only role that decides submitted Trial scope; one approval advances it to
Prospect acceptance. Scientific Operations authority remains separate for Lab
configuration, holds, disposition and results. Administrator status does not
substitute for either new business role, and no existing user is auto-granted one.

New/Edit Opportunity uses server-side Company search. A sole active Department is
selected automatically; multiple active Departments require explicit selection;
zero permit Company-level work. Changing Company clears Department. Create/edit,
Lead conversion and import enforce the same server rule. Multi-Department Lead or
import work uses the ordinary Opportunity form to select its Department.

## Database evidence

Migration `20261003002746_DirectTrialLeadershipAndOpportunityDepartment` was
applied to the configured local database `localhost:5432/phaeno_ops_clean_20260919`.
It makes historical Trial CRM parents and decision authorities nullable and adds
the nullable Opportunity Department FK/index. It performs no deletion, reset,
backfill, role grant or decision-state conversion. EF reports no pending model
changes. The complete ERD is regenerated (231 tables, 3,415 fields, 551 FKs).

Historical decisions and frozen scopes remain readable. Customer scope history
does not expose an old incomplete or rejected review merely because the new
workflow requires one approval. Older submitted scopes with an existing decision
must be resubmitted rather than rewriting their history. Migration downgrade is
guarded against removing Department selections or inventing required CRM parents;
rollback requires a verified pre-migration backup.

PostgreSQL integration tests used the task-owned disposable database
`localhost:5432/phaeno_release_verification_trial_20261002`, migrated from empty.
It is removed after verification. Existing development data is preserved.

## Checks and results

| Check | Result | Evidence |
| --- | --- | --- |
| Backend solution build | Pass, zero warnings/errors | Isolated output under `tmp/crm-trial-opportunity-build` |
| Broad backend solution test run | 1,200 passed, three failed, two skipped | `tmp/crm-trial-backend-tests.log` |
| Focused backend retest after corrections | 78 passed, zero failed/skipped | `tmp/crm-trial-backend-final.log` |
| Full frontend unit suite | 1,355 passed, zero failed | `tmp/crm-trial-frontend-tests.json` |
| Frontend lint and TypeScript | Pass | `tmp/crm-trial-lint.log`, `tmp/crm-trial-typecheck.log` |
| Combined desktop/mobile Chromium slice | 22 passed, zero failed | `tmp/crm-trial-final-browser.log` |
| Generated help consistency | Pass | `pnpm run docs:check` |
| EF model/migration consistency | Pass | `migrations has-pending-model-changes` |
| Whitespace and local documentation links | Pass | `git diff --check` and touched-document path review |

The broad backend failures were a rollback-message assertion, duplicate default
Department setup in the new fixture, and a session fixture missing an active
Department selection. The migration now retains the established rollback guard
wording; fixtures reuse the constructor-created General Department and arrange
the ready organization/Department session. All three cases and their surrounding
regressions pass in the focused run. The unchanged broad suite was not rerun in
full after these corrections. The two broad-suite skips are the existing linked
file-area check and opt-in investigation backup/restore check.

The final backend filter covers Trial, CRM commercial access, governed download
commit, session access and user endpoints. Coverage includes role revocation,
capability separation, direct creation without CRM parents, idempotency,
Department validation/persistence, historical scope privacy, scope decisions,
Prospect acceptance, sample processing, result access and rollback guarding.

The final combined browser run passes all 22 cases in 1.2 minutes: 12 Trial cases,
eight existing CRM cases and two new Opportunity cases, each split across desktop
and mobile Chromium. `tmp/crm-trial-final-browser.log` records this successful run
after all corrections. Earlier focused retests are retained as supporting logs;
repeated cases are not counted as additional coverage.

Browser coverage includes required Department focus before any write, exact saved
scope, successful detail navigation, one contextual Actions menu/indicator,
keyboard opening and focus return, accessible discard body/cancel focus, retained
entries, dark theme, reduced motion and WCAG 2.2 AA scans. Desktop Company and
Pipeline controls align within one pixel. Reviewed screenshots are retained under
`tmp/crm-trial-final-browser-evidence`, `tmp/crm-trial-browser-evidence` and
`tmp/crm-opportunity-browser-evidence`.

Two behavior fixes surfaced during browser verification: creation waits for
default pipeline URL initialization so the modal cannot be remounted closed;
Trial menu actions defer dialog opening until menu focus return is complete.
Incomplete Opportunity activity/task response fixtures were corrected to return
the paged API shape. No production records or scientific work were created.

## Delivery boundary

Phaeno and Prospect guides, authorization/CRM/Trial plans, architecture, complete
ERD and all three living test plans are updated. Generated help is current.
Temporary isolated build output and the disposable test database are removed
after use; normal Debug outputs and existing development sessions are preserved.

This change remains uncommitted in the workspace. No push, hosted migration,
Portal API deployment or frontend publication is part of this local checkpoint.
Existing deployment holds and hosted database release requirements still apply.
Synthetic browser and local PostgreSQL checks establish software behavior; they
do not establish live identity-provider, provider, physical/scientific or final
business acceptance.
