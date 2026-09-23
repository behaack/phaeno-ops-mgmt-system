# Company request work and progress

Status: implemented; local verification complete, including automatic online-access completion. Requested September 19, 2026.
Owner: [CRM plan](CRM-PLAN.md).

## September 22 follow-up — Completion feedback and optional notes

For Phaeno staff completing approved Company requests, the owner requested clear
all-done feedback and removal of the mandatory Completed work narrative. When all
checklist items are done, the message says so; Needs review instructions appear
only when review items exist. The instruction **Actions → Complete request to
record the completed work.** is bold.

The completion dialog labels **Completed work (optional)**. The existing completion
endpoint accepts omitted, null or blank notes and stores them as null; supplied
notes are trimmed and limited to 2,000 characters. Completion still rechecks current
readiness, authorization and request version, and retains actor/time. Manual review
obligations remain: submitting completion confirms that the work is done. This also
applies to the existing relationship-change completion action. No persisted-model
or migration change is needed. The owner explicitly confirmed that **Cancel request**
must require a reason; cancellation and decline keep their required fields and
server validation. Invalid cancellation reasons must leave the decision unchanged.

Success: an eligible request can be completed without typing a note; an incomplete
request remains blocked; cancellation rejects blank reasons; the all-done message
does not refer to nonexistent review items. Regression sources cover these cases.
Automated execution and signed-in verification remain deferred. This change does
not start or stop local servers. User help and living test plans are updated.

Verification: frontend typecheck and scoped lint passed; regenerated help passes
the consistency check (56 guides, corpus `7a2c3fa4b5dc`); whitespace checks passed.
The backend solution and regression sources compile with zero warnings/errors in
an isolated artifacts folder. The normal build output was locked by Visual Studio
and IIS Express, so no running process was interrupted. Tests were not executed.

## September 19 follow-up — Department-led administration

Owner-approved scope: an organization administrator is optional. Access-only onboarding and
ordinary evaluation complete with active Company access and accepted active organization-admin
or active-department-admin membership. Pending unexpired department-admin invitations count as
waiting; inactive users, memberships, departments, revoked/expired invitations and ordinary
members do not satisfy the rule. The summary, readiness check, acceptance transaction and
reconciliation must agree. Existing ready requests reconcile without another invitation.
Company-wide setup stays with authorized Phaeno staff when no organization admin exists.
Readiness for a specific Department must require an admin of that Department or an organization
admin, never an unrelated Department. No schema or authentication changes are needed.

The owner explicitly approved organization and assigned-department administrators placing
standard/Kit purchases, accepting or declining changed prices, requesting custom work, and
accepting Trial terms within their assigned Department. Preserve tenant/Department predicates,
current role rechecks, reviewed revisions, confirmations and audit actor identity. Ordinary
members remain unable to commit. Company-wide access/settings are not delegated.
Update regression sources and help, compile and inspect local UI. Automated suites remain
unexecuted unless requested.

### Department-led verification

Backend solution and regression sources compile with zero warnings/errors using temporary
artifacts; frontend typecheck and scoped lint pass. Automated suites were not run. Updated
Customer, Partner, Prospect and Phaeno guides and generated help are consistent.
After the owner rebuilt/restarted the local API, the existing approved Johns Hopkins
onboarding request automatically moved to Completed with department-aware completion notes.
Read-only People inspection confirmed Joe remains a Member at Company scope, a Cardiology
Department administrator, and has no General access. No invitation or role change was made.
Services shows Administrator Active. General retains the administrator quote-readiness blocker;
selecting Cardiology removes that blocker (six versus five later quote requirements). The
remaining service/configuration/finance setup blockers remain intact. No browser errors were
observed. No live purchases, quote acceptances, Trial acceptance or provider delivery were
performed; those new permission paths have compiled regression coverage and code review only.

## September 19 follow-up — Expandable, explicit work instructions

Every work item has a keyboard-accessible, independently expandable native disclosure, collapsed by default: Instructions for action/review, Waiting details for waiting, and Completion details for done. Progress refresh preserves an open disclosure while its step remains mounted. Service work now says Enable the named service for the approved company or department and
shows numbered steps with the actual Company → Services → Entitlements path, Add entitlement/
Edit actions, field labels, this request's reference, and save buttons. Existing linked
permissions have edit instructions; completed and future-dated permissions keep concise
Done/Waiting explanations. A visible chevron points down while collapsed and up while expanded;
keyboard activation and visible focus use the native summary control without a duplicate marker.

Expanded guidance covers each known readiness blocker with the responsible team, actual
navigation, field names, save/approval action, and clearing condition. It distinguishes shared
Phaeno settings from Company billing, explains inactive/future definitions and revision links,
and preserves Finance approval and scientific review. Access, Trial, relationship, offboarding,
and order-handoff instructions also describe their own steps. Completed items retain their
saved-state explanation. Unknown blockers retain the server's next action.
The redundant completion-blocker list below Work needed is replaced with: “Complete the remaining Work needed items above to finish this request.” Completion gating, loading/error messages, and automatic completion remain unchanged. The existing manual-completion regression source checks the new message and absence of the duplicate blocker.
No service permissions, API rules or records change in this slice.

Verification: TypeScript, scoped ESLint, generated-help consistency, and whitespace checks
passed. Signed-in local browser inspection confirmed all 11 current readiness blockers have
numbered guidance. Mouse/Enter expansion, Space collapse, independent open items, chevron
rotation, retained keyboard focus with a visible focus ring, and open-state persistence across
normal progress refresh were verified. The expanded page had no horizontal overflow at the
current 681px viewport and no browser error logs. Missing-service guidance was checked against
source and types; the current saved service permission was already Done, so no record was
changed to manufacture that state. Automated suites were not run, per repository policy.


## Product outcome

Platform administrators can see each approved Company's required work, verified progress,
waiting states, and owning actions. The list refreshes from saved state as work happens.
The Product Owner additionally requested that completion stay disabled until minimum
requirements are met.

## Implemented scope

- Onboarding and evaluation: active Company access, an administrator invitation, and
  active administrator membership. Access-only requests do not require services or orders.
- Trial Project requests are distinguished from ordinary evaluations by their exact CRM
  handoff. Track Trial creation, current scope, both approvals and Prospect acceptance.
- Service changes: current Ready entitlements linked to this request, plus the existing
  Customer PSeq operational-readiness requirements. Unrelated entitlements do not prove
  completion. Future-effective entitlements show Waiting.
- Relationship changes: show the requested relationship and preserve the existing atomic
  Prospect conversion/completion action; do not require the conversion before enabling it.
- Customer PSeq order requests: show existing order-start blockers and exact source-linked
  order creation. Starting the order remains the action that completes the request.
  Other custom work retains explicit manual scope/fulfillment review.
- Offboarding: review ongoing work, billing, files and retention; verify inactive Company
  access. Submitting completion confirms that the manual reviews are done; notes are optional.
- Queries refresh every 15 seconds while visible and on mount/focus/reconnect. Read failures
  disable completion and expose retry; cached success does not conceal a refresh failure.
- Actions use the shared contextual menu. Request progress is descriptive, not editable
  checkboxes. Changing the checklist never grants access or performs operational work.

## Server minimum requirements

The additive administrator-only GET
`/api/platform/relationships/requests/{requestId}/completion-readiness` evaluates the
existing records. The existing completion POST runs the same evaluator again and rejects
unfinished work with a 409 and specific blockers. The existing request version remains
required; completion notes are optional.

Minimums: approved request with linked active access (inactive for offboarding); an active
administrator for onboarding/evaluation; effective Ready source-linked requested entitlements
at Company or active Department scope; existing Customer PSeq readiness; supported relationship
conversion; current approved-and-accepted Trial scope for Trial handoffs; exact Customer order
creation for order handoffs. Manual obligations must be reviewed before confirming completion.
Access-only onboarding and ordinary Portal evaluation now close automatically under the approved follow-up below. No schema migration, new permission, or identity-lifecycle change.

## Acceptance and verification

- [x] Every supported request type has instructions and owning destinations.
- [x] Onboarding separates enabled access, invitation, and active administrator.
- [x] Source-linked service/order/Trial identity and current scope revision are used.
- [x] Completion is disabled while loading, on failed verification, and with unmet minimums.
- [x] Backend completion repeats minimum checks, including stale-client scenarios.
- [x] Focused frontend and PostgreSQL regression sources added/updated.
- [x] Desktop/narrow browser, keyboard/focus and live local readback.
- [x] Final TypeScript, scoped lint, backend build, generated-help and whitespace checks.

Automated suites are not executed without an explicit request, per repository policy.
Production, invitation delivery/acceptance, and live operational writes are separate checks.
## Verification evidence - September 19, 2026

- Backend solution build passed with zero warnings and errors after the local API file lock
  was released. TypeScript, scoped ESLint, generated-documentation checks and whitespace
  checks passed. Regression test sources were added and compile; suites were not run.
- Signed-in local browser readback after the API restart verified the existing onboarding
  request has active Company access, no administrator invitation, 1 of 3 verified, a specific
  administrator-acceptance blocker, and disabled Complete request in Actions. No records
  or invitations were changed.
- Desktop and narrow layouts were inspected; the long request reference wraps without
  clipping. Keyboard opening, Escape dismissal and return focus were verified. Full-width
  tabs remain readable at both sizes.
- An isolated preview using the actual card and query hook with synthetic read responses
  verified missing, invited/waiting and active states (1/3, 2/3 and 3/3), enabled completion
  after minimums, and failed-refresh blocking/retry. This is simulated browser evidence,
  not real invitation delivery or recipient acceptance. The temporary preview was removed.
## Approved automatic access completion follow-up

The owner agreed to remove the administrative completion click for access-only onboarding.
Apply the same rule to ordinary Portal evaluation access requests; exclude Trial Project,
requested services, relationship changes, custom work and offboarding. Require approved
first-party CRM access requests, active Company access and an active organization or active-Department administrator (updated by the September 19 department-led decision above).
The successful invitation-acceptance transaction records automatic completion with its actor,
time and explanatory notes. Approval/access recovery can immediately finish an already-ready
request. An idempotent administrator-only reconciliation command handles older ready requests
when the queue refreshes; read endpoints stay read-only. No permission, invitation-validation,
schema or provider behavior changes. The card explains automatic completion, shows Waiting for
acceptance when invited, and removes its redundant Complete request action. Other request types
retain the verified minimum gate and manual review. Update focused regression sources and help;
repeat compilation, lint, documentation and simulated browser checks, without running suites.

### Automatic completion verification

- The full backend solution compiled to a temporary output directory with zero warnings
  and errors, including the new acceptance and reconciliation regression sources. Full
  frontend TypeScript, scoped ESLint and documentation checks passed. The current 56-guide
  corpus hash begins `7a1a46d14f68`.
- After the owner rebuilt/restarted the API, signed-in local readback confirmed automatic
  completion guidance and no Complete request item on the real access-only request. Its
  existing Company access and missing administrator invitation were preserved.
- An isolated browser preview using the actual card/hook verified missing invitation,
  Waiting for acceptance at 2/3, automatic transition to Completed / history and explanatory
  notes, failed-closeout recovery, failed-progress blocking, and the manual-service completion
  gate. Narrow rendering and request-reference wrapping were inspected. Temporary viewport
  settings, preview files and the preview server were removed after verification.
- Regression suites were not executed under the repository's requested-test policy. Actual
  external invitation delivery/acceptance, production release and multi-user concurrency
  execution remain separate verification boundaries. No real invitation was sent or accepted
  for these checks. The owner withdrew the unrelated dropdown-width request; no Department
  menu was modified.
