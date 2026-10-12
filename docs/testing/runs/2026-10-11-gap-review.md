# Application error, gap and edge-case review

Date: October 11, 2026. The Owner requested one post-closure pass. Scope: inspect
the completed authorization/scientific/counting/paging, scope/draft, menu/focus,
Customer locale and help paths; fix concrete defects and verify affected behavior.
Customer-only i18n/en-US and the deployment hold remain. No dependency, auth
configuration, domain/persisted model, provider processing or Git mutation changes.

## Findings corrected

| Finding | Correction and evidence |
| --- | --- |
| Department selection called the scope setter directly, bypassing draft/pending-save guards. | Organization and Department changes both navigate through current guards before applying scope. The phone menu closes before the discard confirmation. Dirty and pending-save cases pass at both viewports. |
| An organization switch already on Dashboard could bypass a blocker or mistake the unchanged path for an approved transition. | Each attempt has distinct history state; scope changes only after that exact, latest attempt commits. Cancelled/blocked navigation does not lock later attempts. |
| Empty out-of-range work pages reported no outstanding actions even when the matching total was positive. | Feedback identifies the empty page and existing pagination offers First page. The populated page-99 regression returns to the first ten items. |
| Successful filtered rows hid summary failure and its retry action. | Summary failure remains visible with unknown counts; Retry work refreshes both summary and selected list, sharing requests when their keys match. The independent-error regression recovers the bell/counts without losing the selected filter. |
| The route/API supported Available priority but the select omitted it. | The select now includes the existing value 4; no API or business-rule change. |
| Help contradicted organization switching and still described retired dashboard metrics/panels. | Customer/Partner/Prospect access guides and all four audience overviews now describe current scope guards, action/waiting/update categories and recovery. Phaeno guidance explains personal summary versus Team/Unassigned list totals. Customer metadata/messages and the search corpus are regenerated. |

The backend paths inspected retain scoping before counts, independent scientific
review/release, current-input/exact-QC validation and read-only assessment.
No additional confirmed backend defect was identified in this pass. Strict
scientific per-package evidence query cost and representative hosted/operational
acceptance remain known gates, not newly closed by this review.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Focused frontend | 6 files; 50 passed, 0 skipped/failed | [Log](../../../output/gap-review-20261011/frontend-last.log) |
| Relevant desktop/phone browser | 40 passed, 0 skipped/failed | [Log](../../../output/gap-review-20261011/browser-last.log) |
| TypeScript / scoped ESLint | Pass | [Types](../../../output/gap-review-20261011/types-last.log), [Lint](../../../output/gap-review-20261011/lint-last.log) |
| Documentation publication / corpus | 5 checks pass; 56 guides, corpus `1e888ad8f680` | [Publication](../../../output/gap-review-20261011/docs-tests.log), [Corpus](../../../output/gap-review-20261011/docs-check.log) |
| Customer message references | Pass; 5,780 current English entries | [Log](../../../output/gap-review-20261011/customer-messages.log) |
| Isolated production client / SSR / Nitro build | Pass | [Log](../../../output/gap-review-20261011/build.log) |
| API solution / packaged help corpus | Pass; 0 warnings/errors | [Log](../../../output/gap-review-20261011/backend-build.log) |

The first scope fixture was incorrectly served through the application fallback;
it now uses the same deterministic HTML interception as other component fixtures.
The new real-router tests then exposed pending cancelled-navigation promises and
the phone Department menu remaining open; both corrections are exercised in the
passing final batch. Assertions for scope, retained draft, pending save, safe focus,
accessible confirmation and recovery remain. The full suites from the prior
closure are not recounted as new executions.

Guide metadata/body changes regenerate the API's packaged search corpus. The
solution build verifies the new resource; the running API/index is not restarted
or rebuilt by this review. Its existing authorized documentation-index rebuild
action, or normal API startup, must load the updated corpus before connected help
searches use the new version. No hosted/deployment acceptance is claimed.

Final link/whitespace checks and task-created temporary build/helper cleanup are
completed before handoff. Logs and test evidence are retained; the running Portal
output and development sessions are preserved. No operational data was changed.
