# Trial creation details and Order settings verification

Date: October 2, 2026. Scope: local implementation and focused verification.

## Result

Create Trial remains available to Business Development, Commercial leadership and
Platform administrators. Trial configuration now lives under Order settings; the
old bookmark redirects there, and existing Trial staff permissions do not grant
other order configuration access. A stale local IIS session projection was the
cause of the missing administrator creation button.

Creation requires Company, the Department when multiple choices exist, Trial name,
**Objective / Description**, positive whole-number planned sample count and
submission opening/closing dates. These details save atomically as the initial
shared staff scope draft. Creation grants no approval, accepted allowance, Prospect
access or Lab authorization. Resume draft retains the initial details for completion
of scientific requirements. Staff can see the draft name; Prospect cannot see the
unfinished scope draft.

Both creation and scope editing use calendar dates without time inputs. The closing
date is included and same-day windows are allowed. UTC opening and exclusive
closing boundaries remain the API/storage representation; closing is midnight
after the selected day. Display and resume use the selected calendar dates without
viewer-time-zone shifts. No existing records or frozen revisions are rewritten.

Company options render in a bounded portal so the dialog body cannot clip them
behind its footer. Refocusing Company from lower fields scrolls the anchor into the
body; active options scroll only their list. The modal retains separate header,
scrollable body and action footer. Scope controls use shared Field/NativeSelect
spacing. Documentation and the owning/living test plans are updated.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Isolated backend project build | Pass, zero warnings/errors | `tmp/trial-details-backend-build.log` |
| Trial, CRM access and session reference/domain tests | 81 passed, zero failed/skipped | `tmp/trial-details-backend-test.log` |
| Final focused frontend tests | 56 passed, nine files | `tmp/trial-details-unit-verified.log` |
| Final Trial desktop/mobile browser suite | 18 passed, zero failed | `tmp/trial-details-browser-verified.log` |
| Old Trial configuration bookmark | Two passed, desktop/mobile | `tmp/trial-settings-bookmark.log` |
| TypeScript and touched ESLint | Pass | `tmp/trial-details-typecheck-final.log`, `tmp/trial-details-lint-final.log` |
| Generated help consistency | Pass, 56 guides | `tmp/trial-details-docs-check.log` |
| Whitespace and local documentation links | Pass | `git diff HEAD --check`, local path review |
| Local refreshed API | Healthy, current verified API build | `tmp/trial-details-local-api-runtime.log` |

Backend coverage includes required details, atomic draft persistence, staff-only
visibility, malformed-value rejection without new records, creation permissions,
Commercial authority removal, privileged direct approval, ordinary leadership
review, holds, Department/catalog requirements, Prospect acceptance and existing
Trial lifecycle/result behavior. All migrations were applied only to the fresh
disposable reference database before running its tests.

Frontend checks cover validation, same-day/reversed windows, retry-preserved values
and idempotency key, required Department selection, date round trips, leap/month/year
and daylight-saving boundaries, invalid dates, resumed creation drafts, scope
conflicts, session navigation and settings permissions. Browser coverage includes
WCAG 2.2 AA scans, desktop/mobile containment, dark/reduced-motion discard behavior,
Company choice hit testing and accessible modal/menu keyboard/focus behavior.
Screenshots of calendar-only fields were visually reviewed under
`tmp/trial-details-browser-verified-evidence` (`trial-creation-dates.png`).

An early solution build rejected a custom configuration; the isolated test-project
build supports it and passed. A test callback type was corrected. Company search
tests now wait for the intended debounced request. Browser date locators were
corrected for required markers; the mobile anchor-containment failure was fixed in
the component before the final complete suite passed. Earlier short-form discard
interception also remains passing with the complete creation form.

## Runtime and data boundary

The signed-in local administrator was previously checked for a visible Create Trial
button, working Company search and Order settings Trial configuration. The user's
in-progress draft was preserved during later checks; no real Trial was submitted.
The verified API was activated in the existing local IIS site on port 44399 and
returned a successful healthy envelope after refresh (October 2, 19:45 Pacific).
Visual Studio had restarted and locked the ordinary Debug output, so the running
site uses the verified task-owned copy at `tmp/trial-details-local-api` instead of
overwriting locked assemblies. Preserve this folder while that application runs.

The task-owned database `phaeno_release_verification_trial_details_20261002` and
all eight isolated TrialDetailsVerify bin/obj folders were removed after tests.
Configured development data remains intact. Initial creation details use the
existing draft JSON model; this refinement requires no new EF migration.

Browser fixtures are simulated software evidence. This checkpoint does not record
hosted deployment, live Prospect/scientific/physical acceptance, or Git publishing.
Pre-existing staged work was preserved, and these follow-up edits remain unstaged.
The earlier direct-approval receipt remains historical evidence; this receipt
supersedes its smaller initial creation form and settings-navigation behavior.
