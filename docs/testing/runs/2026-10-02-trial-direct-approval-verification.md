# Trial creation and approval on submission

Date: October 2, 2026. Scope: local implementation and focused software verification.

The owner permits Business Development, Commercial leadership and Platform
administrators to create Trials directly. A Platform administrator or Commercial
leadership user submitting complete scope also approves that revision, without
a separate decision. Business Development alone still submits scope for leadership
review. The capability is determined from the submitting user's current access;
it is not a permanent exemption attached to the Trial's creator.

Creation and Save draft remain unapproved. Direct submission preserves active
Prospect access and Department selection, production workflow and versioned
analysis/deliverable checks, hold restrictions, concurrency, actor-bound
idempotency and scientific/release separation. One ordinary Commercial approval
decision, audit/event and ready-for-acceptance notification are recorded in the
same mutation. Prospect acceptance is still required before sample submission.

The scope action is **Approve and submit scope** for authorized direct approvers
and **Submit scope for approval** for other staff. A held Trial disables direct
approval with an explanation while Save draft remains available. The creation
capability is expanded in both the ready session and server creation gate; no
additional role assignment is required for an existing Platform administrator.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Backend solution build | Pass, zero warnings/errors | `tmp/trial-direct-create-build.log` |
| Trial, CRM access and session PostgreSQL/domain slice | 79 passed, zero failed/skipped | `tmp/trial-direct-create-backend-final.log` |
| Trial component suite | 20 passed, zero failed | `tmp/trial-direct-create-unit.log` |
| Trial desktop/mobile browser suite | 16 passed, zero failed | `tmp/trial-direct-create-browser.log` |
| Touched frontend lint | Pass | `tmp/trial-direct-create-lint.log` |
| Frontend TypeScript | Pass | `tmp/trial-direct-create-typecheck.log` |
| Generated help consistency | Pass, 56 guides | Corpus prefix `0701f765e1c8` |
| Whitespace and new documentation links | Pass | Configured `git diff HEAD --check` and local path review |

The first focused backend run passed 78 cases and failed one outdated wording
assertion after the obsolete "both approvals" blocker was corrected to Commercial
approval. The assertion now checks the current business meaning. The final 79-case retest passes after rebuilding the corrected assertion. No broad suite is rerun for this bounded follow-up.

Backend regressions cover all three creation permissions, ordinary-role and
Prospect denial, leadership removal, direct approval by each privileged submitter
without Business Development, one decision/event, incomplete draft behavior,
held/invalid Department denial and continued Prospect acceptance. Existing Trial
scope history, amendments, sample authorization and governed result tests remain
included. Session checks verify creation access without widening the two business
roles' billing, cash, administration, laboratory or result-release permissions.

Browser cases include both direct-approval roles on desktop/light and mobile/dark,
one scope POST with no decision POST, successful AwaitingAcceptance navigation,
WCAG 2.2 AA scans, reduced motion and no horizontal overflow. Existing ordinary
leadership review, scope conflict/reload, amended acceptance, result availability
and draft discard cases all remain passing. Desktop and mobile screenshots were
reviewed under `tmp/trial-direct-create-browser-evidence`.

## Data and delivery boundary

No new persisted model or EF migration is needed. The configured development
database retains the earlier additive migration. Backend verification uses only
the task-owned disposable local database
`phaeno_release_verification_trial_direct_20261002`, migrated from empty;
normal development data and running Debug applications are preserved. Temporary
isolated build output and the disposable database are removed after testing.

Current Phaeno/Prospect guides, generated help, authorization/Trial plans,
architecture and living test plans are updated. This local change remains
uncommitted and is not pushed, deployed or applied to a hosted database.
Existing deployment holds and hosted release requirements remain in force.
Synthetic browser and local PostgreSQL checks do not establish production,
provider, physical/scientific or final business acceptance.
