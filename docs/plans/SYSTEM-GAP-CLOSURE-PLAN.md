# System gap closure

Prepared: October 11, 2026.
Status: implementation authorized October 11, 2026, in the proposed order.
Customer-only i18n remains; automatic deployment and operational activation holds
remain explicit constraints. The Owner subsequently authorized the preserving
hosted-test release on October 11: API/Portal source `97da7807` is deployed under
the [release plan](PORTAL-GAP-CLOSURE-TEST-RELEASE-20261011-PLAN.md). Remaining
operational/commercial acceptance stays open.
Implementation and verification evidence is recorded below; operational gates
are not closed by source changes.
Product owner: repository Owner. Engineering owner: Codex.

## Outcome and confirmed direction

Close the correctness, record-discovery, UI consistency, documentation and
operational-readiness gaps identified in the October 11 review, independently
of the data assembly implementation. Make pending work discoverable without
requiring users to inspect every workspace.

The Owner confirmed:

- Internationalization applies only to the Customer portal. Phaeno POMS,
  Prospect and Partner surfaces may remain US English. The public Website is
  outside this localization scope.
- Replace the current dashboard experience with a useful work dashboard and
  add a header bell. Both use the same authorized work list.
- Phaeno staff default to their assigned work plus eligible unassigned work;
  provide a separate authorized team view.

The [work dashboard and notifications plan](WORK-DASHBOARD-AND-NOTIFICATIONS-PLAN.md)
owns the connected product, scope, count, routing and acceptance contract.
These choices supersede older dashboard and broader Portal-localization
requirements where they conflict. Existing scientific, commercial and access
rules continue to own the underlying actions.

## Users, problem and success

Phaeno Commercial, Laboratory, scientific review/release, Finance, CRM and
platform staff need to identify the next authorized action and who owns it.
Customers need to distinguish their own actions, administrator actions,
Phaeno's work and available results. Partner and Prospect users need the same
clarity for their existing workflows, without a new localization obligation.

Success means no approved action is hidden by a capped list, no fresh measured
yield is mislabeled as historical, a deadline form edits the chosen phase's
date, and users can find the highest-priority action from any workspace.
Scientific evidence, tenant isolation, approvals, billing and retention facts
must retain their meaning throughout these changes.

## Closure register

### Remaining-deficiency closure execution — October 12, 2026

The Owner authorized closing the remaining deficiencies, including regression
execution, and accepted the proposed commercial recovery targets: at most one
hour of data loss and restoration within four hours. These are acceptance targets,
not claims of achieved recovery. A named Operations responder and observed Lab
supervisor bench/training acceptance remain required; do not replace them with
synthetic evidence or mark physical qualification complete without observation.

Engineering work: add PSeq Kit intake/commercial decisions and laboratory
fulfillment to the same work feed using current endpoint authority, assignments,
stage rules and canonical destinations. Prove source clearance, permissions,
counts and an actual two-phase shipping journey. Execute the affected frontend,
PostgreSQL and browser regressions, repair failures, and measure read-only
scientific eligibility on populated strict-evidence fixtures. Prepare recovery,
monitoring and bench acceptance against the approved objectives while preserving
the current runtime, Website intake and existing recovery copies. No blanket
deployment, Git mutation, destructive data operation, provider cutover or
commercial activation is implied. Scope any installation/maintenance separately
once target, resource bounds and preserving recovery evidence are reviewable.

Status: software source coverage and authorized local regression execution are
complete. The [execution receipt](../testing/runs/2026-10-12-deficiency-closure.md)
records passing evidence and the scientific measurement's limits. The
[commercial acceptance packet](../operations/COMMERCIAL-ACCEPTANCE-20261012.md)
is ready; live coordinated S3 recovery/scheduling/monitoring, named responders
and observed Lab/training acceptance remain open. The Owner was asked for the
target, alert destination and named participants. No live/physical signoff is
inferred from code or synthetic tests.

### Final code-review repairs — October 12, 2026

The Owner authorized updating this plan and implementing the nine findings from
the final code review. This reopens the affected application checks; October 11
verification remains historical evidence, not verification of these repairs.
Customers/Partners need every current decision and later-phase shipping action
in their work list. Finance staff need command-equivalent independent approval
eligibility. Phaeno configuration and scientific operators need one consistent
draft/pending-save boundary and honest completion feedback.

| ID | Authorized repair and acceptance | Status |
| --- | --- | --- |
| REVIEW-01 | Include active InProgress Jobs in phase shipping attention; first-phase receipt must not hide unfinished later phases. Preserve phase sequencing, scope and physical readiness. | Implemented; affected local regressions passed |
| REVIEW-02 | Project current additional-scope quote and Partner substitution decisions before counts/paging; expired, resolved, held or unauthorized decisions must not become user actions. Members see the administrator responsibility as waiting. | Implemented; affected local regressions passed |
| REVIEW-03 | Share reconciliation contributor eligibility with approval, including receipt actors and retained draft editors under enforced dual control. | Implemented; affected local regressions passed |
| REVIEW-04 | Activate modal guards only while the corresponding form is open; explicit discard clears its draft and closed forms do not block unrelated navigation. | Implemented; affected local regressions passed |
| REVIEW-05 | Guard Change quote issuance and decisions across Cancel, close, Escape, navigation, scope switching and pending saves. Preserve entered values on failure and focus on return. | Implemented; affected local regressions passed |
| REVIEW-06 | Guard dataset assignment, upgrade, revocation, version creation and eligibility removal; pending access-changing requests cannot be dismissed. Keep confirmations' header/body/footer and Cancel focus. | Implemented; affected local regressions passed |
| REVIEW-07 | Confirmed library output creation clears the draft; Done closes without claiming saved quantities are unsaved. Uncertain failures retain the original request. | Implemented; affected local regressions passed |
| REVIEW-08 | Group touched Change quote, Finance and data-provisioning contextual actions through shared ActionMenu; preserve permissions, destructive treatment, explanations and single-action behavior. | Implemented; affected local regressions passed |
| REVIEW-09 | Separate elevated action priority from actual deadline labels; undated priority-2 work says Needs review rather than Due soon. | Implemented; affected local regressions passed |

Engineering scope: existing API work-item envelope with additional same-app
source/message values, current command/domain rules and shared Portal controls.
No persisted model, migration, dependency, authentication change, Website change,
Git mutation or deployment. Customer localization remains en-US only. No new
commercial, scientific or access authority is introduced.

Add focused regression sources for the changed behavioral boundaries and update
the living test plans. Execution was initially deferred under the request-only
policy; the subsequent Owner request authorized the local checkpoint below.
Batch backend build, frontend types/scoped lint, documentation generation and
consistency/whitespace checks after implementation. Record actual checks and
limits here; hosted/provider, operational-user, performance, recovery and bench
acceptance gates remain open. Owning work-feed detail is in
[Work dashboard and notifications](WORK-DASHBOARD-AND-NOTIFICATIONS-PLAN.md).

Implementation and the actual static/compilation checkpoint are recorded in the
[October 12 repair receipt](../testing/runs/2026-10-12-final-review-repairs.md).
All nine repairs are implemented. The later
[closure execution receipt](../testing/runs/2026-10-12-deficiency-closure.md)
supersedes the earlier no-execution state for the affected local checks.

### Post-closure error and edge-case review — October 11, 2026

The Owner requested one further review pass. Correct Department switching that
bypassed draft guards, cancelled same-Dashboard organization changes and later
retry after cancellation. Verify both menus with real router/confirmation context,
dirty drafts, pending saves and Keep editing/Discard changes. Recover work summary
failure even when a filtered list succeeds; distinguish an out-of-range empty page
from no outstanding work and expose the already-supported Available priority.
Reconcile old organization-switching and dashboard instructions across the
audience guides. Scope remains frontend/documentation only, Customer-only i18n,
no additional locale, dependency, auth/model change or deployment. The
[review receipt](../testing/runs/2026-10-11-gap-review.md) records findings and checks.

### Final application closure pass — October 11, 2026

Current closeout: remaining assembly/read ceilings, Trial list return, closed-modal
draft blockers, governance dismissal/focus, contextual ActionMenu consistency,
Customer message extraction and current English document sources are implemented.
The final local checkpoint and its limitations are recorded in the
[final receipt](../testing/runs/2026-10-11-system-gap-closure-final.md).
The [Customer inventory](CUSTOMER-LOCALIZATION-INVENTORY.md) classifies UI,
validation/errors, all eight Customer guide sources, notices and generated/printed
documents. No additional language is published. Earlier continuation paragraphs
below are historical checkpoints; the final receipt supersedes their open local
implementation/test counts without converting them into hosted acceptance.

Local implementation is ready for review; there is no further numbered application
slice scheduled by this plan. Real Clerk/provider and representative operational
user acceptance, populated strict-scientific performance, recovery/monitoring,
bench/training and the hosted-test database release plan remain explicit acceptance
gates. Per-package strict lineage assessment still performs evidence queries;
shipping's fixed-query synthetic measurement is not proof of strict-scientific
tenant latency. GAP-08/GAP-09 and production release remain open.

The Owner requested finishing the remaining application work and its verification.
Close the remaining read ceilings, list-return and modal-draft discrepancies;
complete the inventory and extraction boundary for Customer-facing current-English
UI/errors/help/email/documents; run the relevant complete frontend/browser and
expanded local actor/scientific/record matrix. Keep en-US alone published. Existing
locale-qualified Customer Markdown and invitation templates are localized sources,
not missing translations. Other audiences retain English. Record measured local
performance and separate software acceptance from real Clerk-provider, hosted,
mailbox, recovery and physical laboratory evidence. No new dependency, persisted
model, authentication configuration, provider activation or deployment is included.

### Next application slice — October 11, 2026

Users and acceptance: Customer administrators must see the actual current-phase
kit/shipping step; ordinary members see responsibility as waiting. Physical
receipt, complete usable stock and phase ordering govern preparation rather than
a broad request status. Reuse existing shipping readiness rules and scope every
read to the selected organization/Department. Verify inconsistent allocated stock,
ready stock, active requests, cancellation, source clearance and read-side effects.

Performance scope: profile the client bundle, separate pure route validation from
workspace UI imports, then compare the same isolated build before and after.
Initial profiling shows Purchasing route validation importing the whole Lab
Operations workspace through MaterialList; dashboard validation also imports the
retired panel workspace. Preserve route values and rendered workflows. No
dependency, model, authentication, cross-application contract or deployment change.
Relevant tests remain authorized under the requested continuation.

Delivered and verified in this slice: shared physical-kit readiness, scoped batch
shipping/Trial replacement reads, and pure route validation separated from UI.
The 1,005-Job synthetic fixture uses 10 queries, unchanged from one Job, with
selected physical/cancellation/prepared-phase journeys passing. Main client output
falls from 2,065.14 KB to 1,159.61 KB; the normal startup graph excludes Lab
Operations, the barcode encoder and retired/Web Operations panels. Web Operations
loads only when its authorized view is selected. Evidence and limits are in the
[next-slice receipt](../testing/runs/2026-10-11-shipping-startup-gap-closure.md).

At that checkpoint, three application workstreams remained: Customer sources,
discovery/return/draft guards, and local actor/scientific verification. The final
closure pass above records their implementation and verification. Representative
hosted/operational actor and strict-scientific load acceptance remain gates.

This is the execution register for this review. Owning feature plans retain
their detailed contracts and historical evidence. Rows start Planned and record actual progress;
completion requires the evidence stated here, not a checked box copied from an
older release. Record implementation source and local/hosted acceptance separately.

| ID | Gap and deliverable | Priority / dependency | Owning plan and closure evidence |
| --- | --- | --- | --- |
| GAP-01 | Initialize and edit the exact selected phase deadline; protect its draft and recover version conflicts. | First correctness slice. | [Job deadlines](LAB-JOB-DEADLINE-TRACKING-PLAN.md). Different-phase-date regression, connected phase selection/save/notification verification, dirty dismissal and preserved original targets. |
| GAP-02 | Record newly created prepared-library yields with the correct measured basis and evidence. | First correctness slice; no historical backfill by inference. | [Material transfers](SAMPLE-MATERIAL-TRANSFER-PLAN.md). Both generated-output and already-assigned-tube paths retain measured provenance, correct balances and inspectable history. |
| GAP-03 | Replace silent list ceilings with complete server search, filters, paging and exact counts. | Before aggregate dashboard counts are accepted. | [Lab Operations](LAB-OPERATIONS-PLAN.md), [Trials](PROSPECT-TRIAL-PROJECT-PLAN.md), [receivables](PSEQ-ACCOUNTS-RECEIVABLE-PLAN.md). Records beyond current caps remain discoverable and export scope remains explicit. |
| GAP-04 | Replace in-page browser confirmations and close gaps in draft, focus, form and contextual-action behavior. | Shared foundation before new dashboard interactions. | [UI principles](../ui-ux-principles.md), [October 10 follow-ups](UI-WORKFLOW-REVIEW-20261010.md). Audited workflow inventory, reusable guard, rendered recovery/accessibility checks and no in-page window.confirm in accepted scope. |
| GAP-05 | Reconcile authoritative current-state summaries, release boundaries and active versus historical plans. | Begin first; close with each slice. | README, [architecture](../architecture.md), [readiness](../feature-readiness.md), [operations](../operations-readiness.md), [roadmap](../roadmap.md), ai/README.md and owning plans agree on current evidence. |
| GAP-06 | Implement the work dashboard, full work list and header bell. | After source/permission discovery and GAP-03/GAP-04 foundations. | [Work dashboard](WORK-DASHBOARD-AND-NOTIFICATIONS-PLAN.md). Source matrix, role/tenant acceptance, complete counts, real next actions and freshness/error recovery. |
| GAP-07 | Complete Customer-only localization readiness across the connected Customer journey. | Deliver alongside touched Customer UI; full inventory closes the slice. | [UI principles](../ui-ux-principles.md), [user documentation](../user-documentation.md). Customer labels/errors/notifications/help/exports use catalogs and pass pseudolocale coverage; en-US remains the only advertised locale. |
| GAP-08 | Prepare and prove production S3 recovery, monitoring and operational response. | Commercial production launch gate; existing testing deferral remains. | [S3 hosted cutover](S3-HOSTED-CUTOVER-PLAN.md), [backup runbook](../../deployment/hetzner/green/BACKUP-RUNBOOK.md), [operations](../operations-readiness.md). Approved objectives, populated isolated recovery, scheduled off-server evidence, alerts and accepted response ownership. |
| GAP-09 | Align physical acceptance with current barcodes/workflows, approve outage procedures and perform trainer/operator acceptance. | Operational laboratory launch gate. | [Bench validation](LAB-OPERATIONS-BENCH-VALIDATION.md), [training](LAB-TRAINING-PLAN.md). Current hardware/procedure matrix, observed bench session, teach-back and signed acceptance. |

## October 11 requested verification continuation

Further continuation authorized by the Owner: scientific eligibility, retained
list discovery, Customer localization and performance. Engineering scope:
reuse command evidence validation without writes before work/review counts;
share specimen readiness; add paged reagent/data-history endpoints and matched
Portal consumers with exact totals, scoped pages and stable order; retain complete
all-record methods for existing bounded-record/export consumers. No persisted
model or cross-application contract changes. Load guide bodies on demand, catalog
Customer help/shared message dictionaries, and measure production bundle changes.
Relevant scientific/PostgreSQL, component, browser and static checks are required.
Deployment and non-Customer localization scope remain unchanged.

This continuation now delivers shared read-only scientific eligibility before
review/release counts, complete paged reagent and data histories, and the older
Trial timeline. Customer help metadata/search, Department message dictionaries,
touched API errors and data-history dates use the Customer catalog/locale;
scientific and entered values remain unchanged. Guide bodies load on demand with
loading and recoverable failure feedback. The help/search chunk falls from
928.78 KB to 60.83 KB (uncompressed build output); the main chunk remains about
2.065 MB and populated-tenant latency acceptance is still open.

The [remaining-gap receipt](../testing/runs/2026-10-11-system-gap-closure-remaining.md)
records the local evidence and supersedes current-scope no-execution statements.
Scientific/release predicate implementation is advanced, while complete
authenticated actor/source acceptance remains open. Retained history paging is
verified beyond the former caps; the remaining discovery/return inventory stays
open. Customer-only coverage is now 2,756 catalog entries, with full server-error,
validation, body, email and generated-document inventory still outstanding.
Application and operational closure are not declared complete.

The Owner requested continued application closure and relevant tests. The
initial checkpoint below is historical; automated execution is now authorized.
The [continuation receipt](../testing/runs/2026-10-11-system-gap-closure-verification.md)
records the actual outcomes and remaining boundaries.

- GAP-03: Customer shipment discovery now has tenant-scoped search, status
  filters, stable paging and exact totals; per-source shipment discovery no
  longer silently stops at 250. Shipment detail can return to its saved list.
- GAP-04: regressions use real Router/Query contexts and awaited Portal
  confirmation. Nested discard focus returns to the invoking action. Department
  member actions use one labeled Actions menu; successful access changes clear
  the lookup draft. Finance contextual links retain correct menu semantics.
- GAP-06: recovery obligations read failed notification/package/invitation source
  facts directly. Opening the recovery workspace or manually resolving its
  saved summary is no longer required to discover a failure or clear a repaired
  source. Exact source links filter the authorized recovery workspace.
- GAP-07: packing-reset messages retain whole sentences and parameterized counts;
  work messages share the Customer locale boundary and preserve identifiers.
  Customer-only pseudolocale is exercised in desktop/mobile acceptance fixtures.

Full scientific/release prerequisite parity, external shipping supply readiness,
remaining secondary record caps, complete Customer message inventory and
authenticated source/role acceptance remain application work. GAP-08/GAP-09
require their separate operational evidence. No deployment, migration, new
language, provider activation, Git mutation or historical-data repair is part
of this continuation.

## October 11 initial implementation checkpoint

The authorized order has been followed for the local application changes.
This is an implementation checkpoint, **not full gap closure**. The
[verification receipt](../testing/runs/2026-10-11-system-gap-closure.md) distinguishes
compilation, synthetic UI checks, authored regressions and outstanding acceptance.
The initial receipt did not include automated suite execution, deployment,
migration, historical-data repair, live recovery, provider activation or a
physical laboratory exercise. The continuation above records subsequent testing.

| Gap | Current state | Delivered / still required |
| --- | --- | --- |
| GAP-01 | Implemented; connected verification pending | Exact selected-phase initialization, undated-phase handling, preserved timestamp precision, draft protection and explicit conflict review. Regression sources and synthetic phase-selection/dismissal evidence exist; real save/conflict/notice acceptance remains. |
| GAP-02 | Implemented; connected verification pending | Newly generated output captures measured yield through existing quantity history without source re-consumption or premature label acceptance. Exact measurement history is displayed. Historical records remain unchanged; real preparation/output acceptance remains. |
| GAP-03 | Primary queues and retained histories implemented; inventory follow-up open | Preparation, Trials, scientific review/release, Finance, recovery and Customer shipment discovery have exact counts/paging. Reconciliation drafts discover receipts across pages. Continued verification reaches 261 shipments, 1,005 scoped work items, 262 reagent runs, 505 scoped data histories and 120 older Trial events. Reagent/shipment detail retains page/filters. Remaining discovery/return and large-volume actor acceptance stays open. |
| GAP-04 | Shared migration implemented; workflow acceptance open | Native in-page confirmations replaced with awaited Portal dialogs; dirty state subscriptions and modal/navigation guards added; touched native selects and contextual menus improved; preparation has one capture entry point. Broad migration still requires representative saved/uncertain-save, scope-switch and accessibility acceptance. |
| GAP-05 | Current summaries reconciled; historical evidence audit open | Architecture, feature/operations readiness, roadmap, audience guides and owning plans distinguish local changes, hosted state and launch gates. Missing historical artifact links must not be counted as fresh verification. |
| GAP-06 | Work surfaces and scientific predicate sharing implemented; complete matrix acceptance open | Shared authorized feed, personal/eligible-unassigned/team views, waiting/updates, exact counts/links and refresh behavior. Recovery reads failure source facts. Scientific review/release use shared command evidence assessment without read-side writes, and invalid release configuration disables its source. Selected PostgreSQL and browser evidence passes. Full authenticated source/actor and external supply prerequisite acceptance remain open. |
| GAP-07 | Customer-only coverage advanced; full inventory open | 2,756 catalog entries, scoped provider, whole packing-reset sentences, shipment labels/counts, shared help metadata/search and Department dictionaries, touched error feedback and data-history dates. Parameter preservation and Customer-only pseudolocale are verified; guide bodies load individually with recoverable feedback. Phaeno/Partner/Prospect remain English; en-US alone is published. Complete module/validation/server-error/body/email/generated-document coverage and scientific/financial language review remain open. |
| GAP-08 | Recovery preparation implemented; operational gate open | Read-only manifest planning, exact-version capture tool, integrity verification and coordinated recovery runbook prepared. No live capture/restore/schedule/collector/alert destination is activated. Approved objectives/responders and populated isolated recovery remain required. |
| GAP-09 | Acceptance materials prepared; physical gate open | DataMatrix/supplier qualification matrix, management manual and outage worksheet reconciled. Lab management must approve procedures, qualify hardware, observe the bench journey and sign trainer/operator teach-back. |

Engineering decisions: aggregate existing obligations rather than add generic
tasks or read-state storage; keep staff counts/paging in one database snapshot;
evaluate scoped external phase/Trial domain rules before counts/paging instead
of treating broad order status as a next action; share the default query between
home and bell. External domain evaluation currently reads every scoped candidate;
measure its cost with a populated tenant before release. No new persisted model,
dependency or authentication provider is introduced.

## Slice 1: current truth and correctness

### GAP-05: reconcile documentation

- Inventory active product plans and distinguish implementation, local
  verification, hosted-test activation, commercial production readiness and
  Owner-deferred scope. Do not promote one state to another.
- Replace stale current-state statements about Trials, configured sales,
  Kit bundles, storage, scanning, schemas and deployment with source and latest
  release evidence. Preserve dated historical receipts as history.
- Give each active plan a short current-status block with its owning scope,
  next action, dependency, accountable role and acceptance evidence. Retire
  superseded recommendations explicitly rather than appending another
  contradictory "current" checkpoint.
- Check evidence links as well as documentation links. Some existing living
  test-plan links point to absent local artifacts. Identify the retained evidence
  location or mark it unavailable; do not present a missing artifact as fresh
  verification or remove the historical result without an explanation.
- Keep feature-readiness as the current capability summary and operations
  readiness as the environment/activation summary. This register links them;
  it does not create another independently maintained capability inventory.
- Record the Customer-only localization correction now. Update audience guides
  and generated help only when their implemented behavior changes.

### GAP-01: exact phase deadline editing

Initialize phase and date from the same phase record, never from a holistic
Job risk summary. Changing the phase loads its current date and makes any draft
replacement explicit. Do not silently discard a changed date/reason. Use shared
Field/NativeSelect presentation, required-field semantics and a pristine Save.

Preserve version checks, original targets, adjustment history, closed-phase
denials and existing Customer-safe notice delivery. On conflict, fetch the
latest record while preserving entered values, identify the changed phase/date,
and require renewed review before retrying. Changing a forecast remains separate.

Verify two unfinished phases with different dates where the dashboard's risk
driver is not the first phase; changing selection; undated and closed phases;
concurrent adjustment; failure/retry; Cancel/Escape; and the exact notice scope.

### GAP-02: measured prepared-library evidence

Unify new-output capture with the measured-yield meaning already used for an
assigned library tube. Retain exact quantity/unit, performer/recorder, time,
preparation context and traceable evidence. Prepared yield is not a second
withdrawal from the source specimen and is not necessarily its initial
transferred quantity. Preserve these distinctions in display/history.
Use the existing performed-versus-recorded attribution rules; never infer that
the person recording a measurement performed the physical work.

Existing records with absent provenance remain honestly unknown. Inventory
affected development/test records; offer a reasoned, evidence-backed one-time
repair where reliable observations exist, or an explicitly authorized reset of
synthetic records. Do not infer provenance or erase histories. Any persisted
model change needs its owning migration and complete ERD update; destructive
repair and non-local migrations require separate authorization.

## Slice 2: complete discovery and consistent interactions

### GAP-03: list completeness

Start with preparation, Trials, scientific-review queues, Finance invoices/
receipts/reconciliations and operational attention. Inventory the other capped
record/discovery endpoints found in the review; distinguish valid worker batches
from truncated user-facing lists. Do not remove bounded worker processing.

Apply authorization and user filters before counts and paging; use stable sort
and tie-break identity. Return exact totalCount/page/pageSize and distinguish no
records, no matches and an out-of-range page. Offer search/status/owner filters
where relevant, active/closed preparation views, and filter/scroll restoration
on detail return. Preserve retained-record lookup and exact-record endpoints.

Finance aging and exports must disclose and enforce their scope; a paged UI must
not limit an export or reinterpret an all-Customer aging total as filtered.
Coordinate API consumers in one feature slice; do not add compatibility adapters.
Use fixtures beyond 250/1,000, not just the small working dataset.

### GAP-04: shared interaction closure

Inventory native confirmations and forms without dismissal/navigation guards.
Build one shared asynchronous Portal discard flow covering modal close,
Escape, internal navigation and organization/Department switching. Pending
mutations cannot be discarded; browser unload prompts remain browser-managed.
Preserve retry identities and uncertain-save recovery.

Migrate by owning workflow: deadline and commercial drafts first, then Trials,
shipping/kit forms, CRM, Finance and provisioning. Each slice includes field
spacing/required semantics, Save/pristine behavior, persistent errors,
concurrency recovery, initial Cancel focus, three dialog regions and focus
return. Standardize touched contextual menus through ActionMenu, retaining the
sole-cancellation exception. Resolve duplicate preparation capture entry points
without losing the guided next-step capability.

Acceptance includes desktop/phone, light/dark, keyboard, reflow, reduced motion
and critical screen-reader paths. Static searches identify remaining scope;
they do not establish rendered acceptance.

## Slice 3: actionable home and notifications

Execute [WORK-DASHBOARD-AND-NOTIFICATIONS-PLAN.md](WORK-DASHBOARD-AND-NOTIFICATIONS-PLAN.md).
Deliver a vertical slice for each actor/source, including source predicates,
count, preview, full queue, record link, underlying completion and failure states.
Do not ship an attractive shell before the selected source matrix is complete.

## Slice 4: Customer-only localization

Inventory all Customer-accessible routes and shared components, including
authentication/access feedback, home/bell, Jobs, quotes, samples/shipping,
results, retention, billing/invoices, organization administration, help and
support feedback. Include server-error mapping, validation, accessible names,
emails and generated Customer-facing documents/exports.

Extract Customer-visible strings into locale catalogs, parameterize messages
and pluralization, and use the selected Customer locale for formatting.
Shared components accept Customer-localized messages while other audiences
may use US English. Keep existing Prospect/Partner locale-qualified help paths
and scaffolding; neither moving them nor translating them is required.
Scientific names, identifiers, units and entered content retain their meaning.

Verify long text and a pseudolocale across the full Customer journey. Keep the
language selector hidden and publish no new language without separate market
selection, complete translation, scientific/financial content review and release
authorization. Website localization remains separately proposed scope.

## Slice 5: operational acceptance and commercial launch preparation

### GAP-08: recovery and monitoring

Before commercial launch, the Owner confirms acceptable data loss and outage
in business terms; Operations accepts named backup/recovery, security and
incident-response responsibilities. Engineering then records measurable RPO/RTO,
backup frequency, capacity, retention, credentials/key recovery, object-version
protection and the exact production target in the owning runbook. These are
explicit prelaunch decisions, not invented commitments for the current test host.

Implement database plus exact-version S3 recovery for managed files and admitted
original objects. Rehearse with populated scientific and Finance evidence in an
isolated destination, verifying references, full integrity, authorization and
application use within the approved objectives. Prove scheduled off-server
protection and a recovery drill after activation; manual receipts alone do not
close scheduling. Preserve existing recovery copies and hosted-test deferral.

Configure real collection and alert destinations for backup age/failure,
storage capacity, scanner health, dispatch backlog/expired leases, projection
failure and retention recovery. Exercise failure and clearance with accepted
responders and escalation. The in-app bell supplements these alerts; nobody
having the Portal open must not be a prerequisite for incident detection.

Prepare any production cutover separately with target/preserved data, verified
backups, replacement preparation, cutover, rollback and acceptance. Keep all
existing deployment holds until the Owner authorizes the specific release.

### GAP-09: bench and training

Reconcile the bench matrix against current DataMatrix and supported supplier
labels; historical Code 39/QR proof does not qualify current hardware. Name
the printer/stock/scanner/workstation and representative tubes/conditions.
Lab management approves a degraded-mode worksheet and recovery procedure for
network/scanner/printer interruption, custody discrepancies and duplicate
identity. No offline software capability is implied.

Observe receipt, label/scanning, transfer/preparation, QC/corrections and actual
vendor custody. Record mismatches, accountable roles and retests. Reconcile the
management manual with current navigation/roles, conduct the 60-minute session
and teach-back, name the first trainer, and perform the receipt/accession lesson.
Scientific/SOP acceptance belongs to Lab management; synthetic software
journeys do not substitute for it.

## Scope explicitly classified for later decisions

| Scope | Treatment in this closure |
| --- | --- |
| Customer promotional no-charge ordering | Existing [shipping plan](SAMPLE-SHIPPING-AND-INTAKE-PLAN.md) Phase 3 remains unimplemented. Before scheduling, confirm eligibility, one-time use, promotional cost/value and Finance treatment; then deliver grant -> placement -> shipping -> Lab -> release acceptance. Not automatically a current-offering blocker. |
| General folder management and inherited file policies | [File Management](FILE-MANAGEMENT-PLAN.md) general model/CRUD remains unstarted. Establish the actual user need and governance boundary before implementation; do not broaden governed scientific custody into a general drive incidentally. |
| Multiple services per order | [Multi-phase Jobs](MULTI-PHASE-LAB-JOBS-PLAN.md) records future intent. Service-specific quantities, sample/run/output attribution, cross-phase rules and billing need product discovery before scheduling. Current one-service rules remain. |
| Connected CRM email/calendar, QBO, new Website languages | Separate deferred scopes. They are not prerequisites for useful work discovery. |
| Data assembly/provider execution | Separate active work. Surface existing authoritative attention facts when appropriate, but no processing, messaging or provider contract change is included here. |

## Verification, documentation and release discipline

- Update the backend, frontend and E2E living test plans when regression sources
  are added/changed or execution is deferred. This planning change runs no suites.
- Correctness slices need focused meaningful regressions; aggregate lists need
  large-volume and cross-connection/permission evidence; the dashboard plan
  defines complete role/tenant journeys. Batch execution at logical checkpoints
  only when requested.
- Keep audience guides current with implemented behavior; update registry review
  dates and generated corpus in the same feature change. Proposed dashboard/bell
  behavior stays in the plan until delivered.
- Planning-only verification is links/paths and git diff --check. No build,
  database operation, dependency, authentication change, Git mutation or release.
- Track each GAP row as Planned -> In progress -> Implemented -> Verified,
  with applicable hosted/bench/production acceptance recorded separately.
  Deferred rows state the Owner decision and reopening condition; deferral does
  not close a gap. Application closure requires GAP-01 through GAP-07 verified.
  Full operational closure additionally requires GAP-08 and GAP-09 accepted.
  Do not report the entire closure complete while included launch gates remain.
