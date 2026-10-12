# Work dashboard and notifications

Prepared: October 11, 2026.
Status: implemented and locally regression-tested October 11, 2026. No deployment
or hosted acceptance is claimed. The source/actor matrix below remains the
representative operational acceptance contract.
Owning review: [System gap closure](SYSTEM-GAP-CLOSURE-PLAN.md), GAP-06.

October 12 navigation follow-up: **More → Website operations** owns the full
platform-administrator Website tools. **Mailing list** and **Demo requests** are
shared-sidebar queues; **Email delivery** remains a separate recovery section.
Old home bookmarks redirect and client work links select the exact intake or
delivery in its matching queue. This replaces the retained home-only entry point;
the work dashboard and bell remain the shared attention surface. Scope and
verification are recorded in [Website API consolidation](WEBSITE-API-CONSOLIDATION-PLAN.md#website-operations-workspace--october-12-2026).

## October 11 local implementation

The post-closure review corrects out-of-range page feedback and independent
summary failure/retry. **Retry work** refreshes both reads; successful filtered
rows do not hide an unavailable summary. The existing Available priority can be
selected. Staff summary counts/bell remain personal even in Team/Unassigned views;
list totals/pages describe the selected view. Guides now state that distinction.
See the [review receipt](../testing/runs/2026-10-11-gap-review.md).

Final local closure includes connected Department/actor isolation, exact counts
beyond 1,000, shipping readiness and trigger/clearance, retained discovery, strict
scientific prerequisite exclusion and command-equivalent read assessment. The
[final receipt](../testing/runs/2026-10-11-system-gap-closure-final.md) supersedes
earlier local no-execution statements and counts. Production client/SSR/Nitro
build and Customer-only UI regressions are recorded there. Operational-user
usefulness, real Clerk/provider journeys and populated strict-scientific evidence
cost remain acceptance work; no fixed query budget is claimed for every scientific
candidate. Normal startup excludes Lab Operations, the barcode encoder and the
retired dashboard panels; platform Web Operations still loads on demand.

The next shipping continuation batches the scoped Jobs/phases, shipments,
requests, selections, stock/tubes, claims and pair counts. Per-Job and per-Trial
replacement queries are removed. Physical readiness shares the existing command
predicate for receipt, completed tube assembly and usable/expiry evidence.
Allocation or a Received request alone cannot create preparation attention.
Usable stock permits preparation during an outstanding partial request; member
responsibility and pending cancellation remain waiting. Current-phase ordering
continues to use the shared sequence function. This closes that physical-stock
predicate discrepancy; broader request/catalog and authenticated actor acceptance
remain tracked separately.

Requested verification continuation: recovery obligations now use failed source
facts instead of saved attention summaries, and exact source links select the
authorized recovery workspace. PostgreSQL tests cover counts above 1,000,
tenant/capability scoping and failure discovery/clearance without a saved summary.
Browser fixtures cover exact links, mutation invalidation, organization changes,
unknown counts/retry, focus, Customer-only pseudolocale and phone reflow. See the
[continuation receipt](../testing/runs/2026-10-11-system-gap-closure-verification.md)
for actual results. The next continuation applies the shared command lineage,
scientific-profile, input currency, performance review and exact-package QC and
artifact checks before review/release counts. Scientific review also shares
whole-work and exact-sample attempt readiness. The assessment runs without
command locks or tracked writes inside the caller's consistent read snapshot.
Invalid release configuration disables the release source just as it blocks
the command. Local rollback evidence covers eligibility and missing-profile
exclusion without writes; full authenticated trigger/clearance acceptance,
external supply prerequisite parity and populated-tenant cost remain open.

`Features/WorkAttention` and `features/work-attention` now own the shared
feed/dashboard/bell. The default home no longer selects placeholder business
panels. Existing Web Operations remains accessible to platform administrators;
existing recovery actions moved to `/operations-recovery` with exact-item links.
CRM task, demo-request and email-delivery filters retain the linked record.

Staff queries count all authorized obligations before stable paging. Personal
counts exclude work assigned to other people; permitted team views retain
source capabilities. Scientific review excludes enforced contributor conflicts,
blocking exceptions, incomplete executions and an ineligible work stage.
Completed vendor handoffs clear. Receipt and accession are separate obligations;
Finance includes billing/tax setup, unapplied cash, overdue invoices and eligible
independent reconciliation. External shipping uses the existing current-phase
sequence, physical dispatch/receipt and preparation facts; already-shipped
phases do not remain customer actions. Trial samples require the approved scope,
submission window and remaining allowance/replacement authority.

Successful mutations invalidate work; active pages also refresh every 30 seconds
and on focus/reconnect. Bell and default home share the canonical summary query.
Opening the bell never completes work. Failures report unknown counts; disabled
sources are disclosed. Customer pseudolocalization is development-only and other
audiences remain English.

See the [implementation receipt](../testing/runs/2026-10-11-system-gap-closure.md).
Compilation and a read-only synthetic preview are not source-matrix acceptance.
Authenticated permission revocation, trigger -> clear, full prerequisite coverage,
operational-summary freshness, load, screen-reader and operational-user acceptance
remain open. The original matrix below remains the contract until those checks
are recorded; no release or hosted readiness is implied.

## Product problem and approved outcome

Users currently inspect several workspaces to discover what needs doing. The
home page mixes summaries, navigation cards and separate internal panels; it
does not supply one complete prioritized work list or a global attention cue.

The Owner chose a useful work dashboard plus a header bell. Phaeno staff default
to **My work + eligible unassigned work**, with a separate authorized team view.
Keep the dashboard and replace its present experience; do not retain it as a
placeholder or remove its route while these work surfaces are being delivered.

At sign-in and from any workspace, users must be able to answer:

1. What do I need to do, and what is most urgent?
2. What can I take from the unassigned queue?
3. What is blocked, who owns the next action and where do I resolve it?
4. What has become available, without mistaking an update for required work?

## Review baseline source evidence (before this implementation)

- `DashboardPage.tsx` selects an internal panel dashboard or external home.
  `DashboardPanelSelector.tsx` has mock-only sample panels and connected
  summaries. The plan must not claim those mock counts are production totals.
- `NeedsAttentionSummary.tsx` summarizes operational recovery and CRM sale
  summary failures; it omits ordinary pending work across several domains and
  mostly offers a generic View all rather than an exact action destination.
- `OrderOperationsSummary.tsx` gives some non-administrator staff workspace
  links instead of a populated work summary. Lab summaries read a capped list
  and emphasize recently updated work rather than the user's next action.
- `CustomerLabDashboardService.cs` and Customer dashboard components already
  supply live scoped requests and result availability. Reuse their authoritative
  predicates/retention facts, but refine coarse statuses into actual next actions.
- CRM tasks/attention filters, Jobs/deadlines, scientific-review queues,
  release eligibility, kit/shipment queues, Finance readiness/reconciliation,
  invitations/Company requests and Web email recovery already contain source
  facts. They need an authorized aggregate, not a duplicate task workflow.
- `/dashboard/attention` currently renders the narrower Operations attention
  workspace. Preserve its recovery actions while broadening the work list.

## Audience, scope and default ownership

| Audience | Default scope | Ownership behavior |
| --- | --- | --- |
| Phaeno staff | Selected Phaeno membership, current roles and applicable work scope. | Assigned to me plus unassigned actions I am eligible to perform. Team view includes only work my existing permissions allow; no implicit wider access. |
| Customer | Selected organization and Department, internal user and current capabilities. | Show actions this user can perform. Distinguish administrator-required work in a separate **Waiting on your administrator** group; its informational rows do not inflate the user's actionable badge. |
| Partner | Selected organization/Department and current permitted workflows. | Same actionable versus administrator/waiting distinction for existing Kit and Lab workflows; US English is sufficient. |
| Prospect | Selected organization/Department and approved Trial/data/access scope. | Same distinction for scope acceptance, authorized sample submission and safe updates; US English is sufficient. |

Customer-visible shared controls, notices, errors and help are localized. Phaeno,
Partner and Prospect implementations do not acquire a translation obligation.
No cross-organization aggregation is included. Switching scope clears previous
rows/counts immediately, respects draft guards and waits for confirmed access.

Assignment is responsibility, not permission. Existing source assignments are
authoritative. A work type without a genuine user assignment is explicitly
role-eligible and unassigned; do not infer an owner from the last editor or
invent a generic assignment table. Any needed new ownership workflow requires
an explicit feature slice, business meaning, audit and ERD/migration review.

## Work-item and count rules

- One stable item identifies source type, exact record/revision where relevant,
  and outstanding action/condition. Repeated refresh or multiple underlying
  notices cannot multiply the same obligation.
- Rows show safe identity, action, why it is needed, responsible party/role,
  priority, relevant due/expiry time and a link to the exact owning workspace.
  Do not expose specimens, file paths, provider errors or confidential payloads
  in global previews; authorized record pages retain the detailed context.
- Multiple actions on one record appear as one record group with explicit
  obligations. Counts refer to outstanding obligations, not record groups;
  show both clearly when a Job contains several independent sample/phase actions.
- Admission and counts require both scope and action authorization. Read-only
  updates and "waiting on Phaeno/administrator" rows are separate from work the
  actor can perform. Counts are not computed from total orders or broad statuses.
- An item clears only when its authoritative condition is resolved, superseded,
  cancelled or no longer authorized. Opening the bell/record does not resolve
  it. Do not add generic Complete, dismiss, snooze or mark-all-read controls
  that can hide an outstanding scientific or commercial obligation.
- Recheck current scope, permission, revision and prerequisites when an action
  runs. A stale preview cannot bypass domain commands or use an earlier quote,
  protocol, package, phase or invoice as the current record.
- A source failure/disabled feature has an explicit unavailable state. Unknown
  counts are not zero and partial results never say "All caught up."

The bell is a **work notification** surface in version 1. Its badge is the
number of unresolved actionable obligations in the user's default scope,
including eligible unassigned work for staff. It is not an unread-email or
unread-event count. The full dashboard offers updates separately; adding a
durable personal notification history/read-state is later scope if needed.

## Source matrix and completion authority

Each source adapter must document its exact predicate, permitted actor, source
owner, stable identity, priority/date and disappearance condition before coding
the UI. The matrix below is the required first-version coverage, not a claim
that every broad status is actionable.

| Work source | What should surface / to whom | Clear or transition when |
| --- | --- | --- |
| Commercial Lab intake | Assigned/eligible Commercial staff: submitted request awaiting review/pricing, requested changes, quote-extension/negotiation decision, actionable cancellation or hold decision. | Current request/decision is completed, withdrawn or superseded through the owning workflow. |
| Customer Lab actions | Authorized Customer: resumable incomplete request, requested correction, current quote decision, actual next sample/kit/shipping step. Current phase/prerequisites decide the action, not PlacedAwaitingSamples alone. | Exact next step completes or becomes another party's responsibility. |
| Trial Projects | Authorized staff: scope/leadership decision and existing follow-up; Prospect: scope acceptance or authorized samples within the submission window. | Exact approval/acceptance/submission obligation resolves; a held or closed Trial does not offer invalid actions. |
| Receipt and accession | Eligible Lab staff: arrivals requiring receipt, expected tube decisions and unresolved intake/custody discrepancies. | The applicable receipt/intake decision is saved; missing tubes remain explicit outstanding scope. |
| Preparation and QC | Assigned/eligible Lab staff: next executable preparation step, output identity, QC hold or required correction. | Current step/evidence/identity obligation resolves; do not create a task for every future protocol step. |
| Sequencing/vendor handoff | Eligible Lab staff: current batch/sendout/custody/report/verified-file intake action from implemented workflows. | Current stage's requirement completes. Existing processing attention may link to its owning work; no new data assembly contract is included. |
| Scientific review and release | Scientific Reviewer or Result Release Manager independently: exact eligible package awaiting their action. | That action completes or prerequisite/permission changes. Approval never implies publication. |
| Kits and fulfillment | Eligible Lab/fulfillment staff: current request needing preparation/registration/dispatch; eligible external administrator: receipt/shipping decision. | Physical confirmation/fulfillment is recorded, not merely planned. |
| Jobs, deadlines and exceptions | Responsible/eligible staff: due-soon/overdue work, actionable blocker, missing-calendar/deadline correction. | Blocker resolves or delivery/approved date/forecast changes the source condition. Reuse existing thresholds; do not invent a deadline. |
| CRM | Authorized CRM staff: their open tasks/reminders, eligible unassigned tasks, missing next action and existing stale-opportunity follow-up where an actual action is supported. | Source task/follow-up condition resolves. Keep completed/cancelled occurrences out; recurring tasks keep exact occurrence identity. |
| Finance | Authorized Billing/Cash/Reconciliation staff: readiness blocking a real invoice, unmatched/unapplied cash requiring review, submitted reconciliation awaiting eligible approval, recoverable failures. | Owning Finance decision completes. An unpaid invoice is not itself evidence that a lab result must be held. |
| Company access and invitations | Authorized administrators: pending Company/access decisions, actionable invitation failure/expiry and readiness blocking an actual next action. | Existing request/access/delivery workflow resolves; creating a Company alone is not a to-do obligation. |
| Operational recovery | Existing authorized staff: invitation/order/retention notice failures, CRM summary recovery and other implemented attention sources. | Actual source recovery succeeds; merely resolving a duplicate summary cannot mask a still-failing source. |
| Web Operations | Platform administrators: unfinished demo follow-up and failed/expired email-delivery work. | Demo completion or successful authorized recovery. Mailing-list membership is not unfinished work; provider acceptance is not inbox delivery. |
| Results and data updates | Authorized external user: currently available released results or assigned curated data, with existing cutoff/download facts. | Availability changes; recorded full downloads affect only the existing download projection. These are updates unless an actual warning/required action applies. Viewing never records download success. |

Excluded sources remain visibly documented with an owner and reason; they
cannot silently disappear from acceptance. No new workflow, generic approval
right, email channel or scientific outcome is introduced by an adapter.

## Dashboard and header experience

### Dashboard

- Keep `/` as the role-aware dashboard and the existing Dashboard navigation
  entry. Replace the large introductory/permission badges and navigation-heavy
  panel experience with a compact identity/scope header and useful work.
- Put **My work**, **Unassigned work I can take**, and **Blocked/overdue** first
  for staff, with a clearly labeled authorized **Team work** view. Category
  filters cover the owning domains without requiring users to switch between
  several miniature dashboards. Do not count a row twice because it is both
  assigned and overdue.
- Customer home puts **Your next actions**, **Waiting on your administrator /
  Phaeno**, **Active Jobs** and **Available results** in that order. Retain useful
  existing live Job/result summaries, but distinguish required work from updates.
  Partner/Prospect home follows the same behavior for their permitted workflows.
- Show the highest-priority ten obligations with complete counts and View all;
  the paged list preserves scope/filter/sort/scroll across record navigation.
  Prioritize actionable blockers, overdue, due soon, then ordinary ready work;
  use source dates, oldest outstanding action and stable identity as tie-breaks.
- No decorative totals, example customers, generic security claims or capped
  list lengths stand in for live work. Remove unused production placeholder
  components after their live replacements and mock regression fixtures are ready.
- Separate Web Operations' full administrative tools from the home preview.
  Provide a dedicated authorized workspace before removing its existing panel;
  preserve demo, mailing-list and email-recovery actions and old deep links.

### Bell

- Render one labeled bell beside the user/menu controls at every viewport,
  including narrow layouts. Keep primary navigation in its existing desktop/menu
  placement. Hide the bell before an authenticated organization context exists.
- Show no numeric badge at a confirmed zero; show a capped visual **99+** with
  the exact accessible count for large totals. Unknown/stale/partial state has
  a distinct explanation instead of a trustworthy-looking zero.
- Accessible name: **Notifications, N items need attention** in the Customer
  locale or US English for the other audiences. The popup is a named list of
  links, not an application menu of actions unless its semantics require that.
- Opening shows at most five priority obligations from the same default list,
  a freshness/error message and **View all work**. Clicking a row opens the exact
  record/current action section. No destructive or scientific action executes
  directly from the preview.
- Preserve keyboard operation, Escape, focus return, page position, touch target,
  reduced motion, light/dark contrast and phone containment. Count refresh does
  not move focus; announce meaningful changes politely without continual noise.

### Full work list and routes

Broaden `/dashboard/attention` into the complete authorized work list with
My/default, Team, domain, priority and ownership filters. Keep existing recovery
assignment/retry actions in their owning records/queues. If a row has several
permitted contextual actions, use shared ActionMenu; one action stays labeled.
Retain old dashboard-section bookmarks by mapping them to the relevant domain
filter or Web Operations workspace, preserving their validated context.

Finance-only, release-only and other narrow roles must receive their actual work
without issuing unauthorized general-Lab, CRM or administrator queries. Deep
record links and existing protected landing redirects remain safe; the new home
must no longer require broad administrative access to be useful.

## Engineering contract

Add a feature-owned authenticated aggregate reader with domain source adapters.
Reuse current query/domain predicates and permission services rather than
calling capped controller lists or duplicating state machines in React.
Refactor source readers where necessary so summary, list and source workspace
share the same condition. No new dependency, authentication provider or generic
task persistence is needed for version 1.

Proposed same-app read contract: `GET /api/work-attention` with view, domain,
priority, ownership, page and pageSize. Preserve the API envelope. Return scoped
summary counts, paged items, evaluatedAtUtc and source availability/freshness.
An item supplies stable key/source identity, message identity/parameters, safe
record label, exact destination, owner/eligible role, priority, applicable date
and reason. The server permits only known destinations and never emits arbitrary
external URLs. Customer messages are localized at the delivery surface.

The bell requests the first five and dashboard/list use the same query model;
all use one scoped TanStack Query family. Count the complete authorized dataset
before limiting previews. Use bounded projections/server paging and efficient
aggregate counts; no all-record browser downloads or per-row request waterfalls.
Deduplicate overlapping source adapters by the stable obligation identity.

Default freshness: refresh immediately after owning mutations/scope changes,
on focus/reconnect and every 30 seconds while the page is visible. Pause polling
while hidden/offline; explain stale state and offer retry. Reads do not create
or resolve attention records as a polling side effect. Time-based due/expiry
conditions are evaluated even when no record is edited. Concurrent commands
remain authoritative; an obsolete item explains changed state and refreshes.

Persisted model changes, if a later slice proves necessary, need an explicit
updated plan, EF migration and complete ERD update. Current-model development
rules apply; do not add compatibility scaffolding or infer historical actions.

## Delivery sequence

1. Freeze the source/action/permission matrix and inventory current predicates,
   assignments and capped endpoints. Create scenario fixtures without altering
   operational data. Mark any real product decision before implementing its adapter.
2. Complete source paging/counts and the shared guard foundation from GAP-03/04.
   Implement the aggregate for Customer commercial/shipping work and staff
   commercial/CRM/recovery as the first vertical slice.
3. Extend to Lab receipt/preparation/QC/review/release, kit fulfillment,
   deadlines and Finance; add Partner/Prospect and Web Operations coverage.
   Each slice includes its restricted-role and unavailable-source cases.
4. Deliver dashboard, full list and bell together against the complete scoped
   feed; migrate old panel/deep-link destinations and remove placeholders.
5. Update each implemented audience guide, registry/corpus and living test
   plans. Verify representative signed-in journeys and source/count parity.
   Release remains separately authorized; retain deployment holds.

## Acceptance and success measures

| Scenario / measure | Required result |
| --- | --- |
| Find work | Each intended actor can identify the highest-priority action from home and open it with one record selection; from another workspace, bell -> record takes at most two activations. |
| Coverage | Every included matrix source has trigger/authorized-user/clearance evidence. No enabled source is a link-only placeholder. |
| Count meaning | Bell and default dashboard agree for the same scope/evaluation; counts are obligations, independent of preview size and read state. Multiple obligations/grouping is clearly labeled. |
| Ownership | Staff default contains assigned plus eligible unassigned work, excluding work owned by others; Team view never widens permission. Taking an item uses only a supported source assignment command. |
| Customer roles | Administrator-action rows are actionable only for eligible administrators. Members see honest waiting context; new results and Phaeno's pending actions do not inflate personal tasks. |
| Isolation | Different organization/Department, peer user, revoked role/membership and mid-request scope changes disclose no unauthorized rows/counts. URLs reauthorize on open. |
| Scientific/Finance separation | Review, approval, release, physical confirmation, payment and download retain their independent meanings. Bell interactions cause no domain transition. |
| Deduplication and volume | Overlapping notices/refreshes produce one obligation; pagination finds fixtures beyond 250/1,000. Counts and ordering do not rely on old endpoint caps. |
| Freshness | Own changes refresh immediately; other-actor changes become visible within 30 seconds on an active connected page. Offline/error/disabled/partial cases never show a false all-clear. |
| Accessibility | Header/popup/queue/record return work by keyboard; names/statuses/focus are verified with a screen reader, 320px reflow, zoom, both themes and reduced motion. |
| Localization | Customer shell, task/error text, count plurals, dates, accessible names and guides pass pseudolocale/long-text checks. Other audiences stay US English. |
| Operational usefulness | Representative Commercial, Lab, Finance and Customer users perform a short find -> act -> confirm-clear exercise; record time/confusion/missed items and close defects before acceptance. |

Extend the backend test plan with source predicates, exact counts, permission
and overlapping/concurrent state coverage; frontend with bell/list/draft/freshness
behavior; E2E with the complete role/tenant journeys above. Automated execution
remains request-only. Builds, mocks and anonymous health checks do not establish
signed-in operational acceptance. Monitor aggregate latency and bounded query
cost during the populated rehearsal; tune before release instead of hiding rows.

## Boundaries and future decisions

No email/push subscriptions, durable unread-event history, mobile push, generic
task creation, snooze, notification preferences or user-custom dashboard builder
is included. Existing email channels and incident monitoring remain independent.
The Owner's production recovery deferral and deployment holds stay in effect.
New product obligations, cross-role assignment powers, escalation promises or
notification delivery guarantees require their own product decision.
