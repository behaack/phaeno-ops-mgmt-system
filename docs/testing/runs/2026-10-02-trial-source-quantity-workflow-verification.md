# Trial source quantities and order workflow verification

Date: October 2, 2026. Scope: local implementation and focused verification.

## Result

Trials use one current extracted-RNA sample type and the order **Source / quantity**
format during creation and scope editing. Any number of distinct biological source
rows can be added, each with a positive whole-number sample quantity. The total
sample allowance is calculated from these rows. Name, Objective / Description,
Company/Department and date-only inclusive submission window remain required.
Initial details save atomically into the shared staff draft; saving does not
approve scope or authorize samples.

Submitted scope freezes the type identity/version, quantity unit/limits and source
quantities. Scope review shows those values. Sample submission uses the approved
type and only approved source choices, checks type currency, and enforces both
per-source original quantities and the overall allowance across submissions.
Source slots cannot be reassigned without a revised approved and accepted scope.
Amendments preserve sources/counts of submitted originals; a replacement keeps the
failed original's source and the existing one-time replacement authorization.
Actual sample metadata is still collected at submission.

Trial-specific Commercial approval and Prospect acceptance remain unchanged.
Business Development requires leadership review; Commercial leadership and
Platform administrators approve a completed scope when submitting it. Trials use
the shared shipment, physical-receipt, laboratory and governed result-release
capabilities and do not create paid orders or billing gates. This refinement does
not replace the existing Trial operational parent or create a duplicate order.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Isolated backend project build | Pass, zero warnings/errors | `tmp/trial-sources-build-final.log` |
| Final Trial, CRM access and session tests | 85 passed, zero failed/skipped | `tmp/trial-sources-backend-test.log` |
| Final frontend regression slice | 60 passed, nine files | `tmp/trial-sources-unit-final.log` |
| Desktop/mobile Trial browsers | 18 passed, zero failed | `tmp/trial-sources-browser.log` |
| TypeScript and touched ESLint | Pass | `tmp/trial-sources-typecheck-final.log`, `tmp/trial-sources-lint.log` |
| EF model comparison | No pending changes | `tmp/trial-sources-model-check.log` |
| Generated help consistency | Pass, 56 guides | `tmp/trial-sources-docs-check.log` |
| Whitespace and local document links | Pass | `tmp/trial-sources-diff-check.log`, local path review |
| Refreshed local API | Healthy successful envelope | `tmp/trial-sources-local-api-runtime.log` |

Backend coverage verifies creation validation and atomic draft persistence, frozen
type/source visibility, rejection of unapproved/changed type and source, per-source
overflow before Lab authorization, canonical source labels, shared authorization
and shipment, and unchanged paid-order count. Domain coverage checks amendment and
replacement source lineage. Existing approval/acceptance, hold, preparation,
release/readiness, retention and closeout regressions remain in the slice.

Frontend coverage includes variable source rows, duplicate normalization,
nonpositive quantities, total calculation, retry/idempotency preservation,
resumed drafts, partial draft saving, type/source roster validation, date round
trips, conflict/reload behavior, Company search, navigation and settings.
Browser fixtures include WCAG 2.2 AA scans, desktop/mobile containment,
dark/reduced-motion behavior, modal/menu keyboard and focus behavior. Source rows
and date fields were visually reviewed in the creation screenshots under
`tmp/trial-sources-browser-evidence`; desktop control edges and labels align,
and mobile controls stack within the scrollable body and fixed footer.

The first backend build caught a test using the wrong shipment parent property;
it was corrected to `AuthorizationSourceId`. TypeScript caught an unsupported
Testing Library role option; its exact name now uses a regular expression. Final
build/typecheck and complete focused suites pass after corrections.

## Runtime and data boundary

The configured local database contained zero Trial projects, drafts and scopes
before implementation. The refinement changes the existing draft/scope JSON
contracts without adding mapped EF entities, columns or relationships; no new EF
migration is required. Existing migrations were applied to the fresh task-owned
reference database before testing. The owning plan and database ERD now describe
the JSON contract. No development Trial records were converted or reset.

The verified build and regenerated help corpus were copied to
`tmp/trial-sources-local-api` and activated in the existing local Portal IIS site
on port 44399 (PID 35504). Its health endpoint returned a healthy successful
envelope at 20:48 Pacific. Keep this runtime directory while the site runs;
ordinary Debug output remains separate from this copy. The user's open form was
preserved and no real Trial was submitted. An initial restart guard stopped before
changing the process because of path separators; resolving the exact IIS path
allowed the intended local refresh.

The task-owned reference database
`phaeno_release_verification_trial_sources_20261002` and isolated
`TrialSourcesVerify` build directories were removed after verification. Test logs
and browser evidence remain for review. Audience guides, generated help and all
three living test plans were updated. This receipt supersedes the separate
planned-count creation field in the previous creation-details receipt.

Browser fixtures and synthetic database tests establish software behavior. They
do not establish a live scientific/physical acceptance journey or hosted release.
Pre-existing staging was preserved; this follow-up does not stage, commit, push or
deploy. Any later hosted release must inspect existing Trial JSON data and address
the separate deployment gate before activation.
