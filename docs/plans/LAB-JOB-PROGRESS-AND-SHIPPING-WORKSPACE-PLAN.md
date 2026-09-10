# Lab Job progress and shipping workspace

Status: implemented locally, September 10, 2026, following the Product Owner's
"Okay, let's execute" approval. The follow-up direction is a **horizontal,
iconic step sequence** with six short labels, completion checks and the current step
highlighted. Each icon explains its step in a detailed hover/focus panel; only the
next-step button performs the required action or opens its work area. Shipping insert preparation is included in
**Send**. These changes are uncommitted
and undeployed. The separately accepted receipt-row and retired-configuration
refinements remain included in the [shipping plan](SAMPLE-SHIPPING-AND-INTAKE-PLAN.md).

## Product need and scope

Customer and entitled Partner users should be able to see where their Lab Job
stands, what happens next, who must act, and complete its shipping work from the
Job details page. Members retain their existing read-only access; each action
continues to follow the current organization, Department and role permissions.

The Product Owner clarified the priority: split the experience into **Ordering
and shipping** and **After you send**. Bring clarity first to the work the
customer is responsible for completing. This supersedes the earlier proposal
for one equally detailed end-to-end checklist with three groups.

Before this change, **Laboratory progress** showed only one customer-safe laboratory milestone.
The Job has the sample roster, quote, timing and results, but preparing containers,
matching tubes, issuing/printing the shipping insert and recording dispatch open
a separate shipment page. This splits one customer task across two workspaces.

The implemented outcome is one Job workspace with two clearly labeled parts.
**Ordering and shipping** is the prominent, actionable checklist, with the
full-width shipping work hosted beneath it. **After you send** is a separate
tracking area for receipt, laboratory progress and results. The checklist reports
recorded facts automatically; it is not a set of checkboxes the user can mark
complete. Existing scientific, commercial, shipping and permission rules remain
authoritative.

Initial scope is the Customer/Partner Lab Job route. Trial shipping and Phaeno
receiving retain their current entry points and permissions. Sharing the shipping
components must not turn a Trial into a Lab Job or redirect all shipment sources
to the Lab Job page.

## Stage-relevant ordering and tracking

Product Owner follow-up, September 10, 2026: during ordering and quote review,
Order details and billing stays expanded with a static heading. Place the
permission-aware Accept quote and Decline quote buttons at the right end of that
heading row, wrapping only when necessary on narrow screens. Reuse the existing
confirmation dialogs, purchase-order requirements, expiry, version, failure and
pending-write guards. Keep PDF download and other eligible commands in the Job
header. Quote and billing includes the total ordered sample count and a table of
biological-source types and their counts, plus the order description when present.
These are order-scope facts; they do not change the issued price or quote revision.

Before commitment, hide Sample submission and Samples and shipping. Reveal them
when the order is placed/accepted or sample entry is authorized. Retain existing
sample records for historical review or legacy repair. Order details can collapse
after commitment unless another quote decision is pending.

After you send stays hidden during quote review, sample entry, packing and
ReadyToShip preparation. Show it when an active shipment has recorded dispatch or
actual receipt, a sample has shipment/receipt/accession evidence, a substantive
laboratory milestone is available, or results have been released. AwaitingSpecimens
and a prepared insert alone are insufficient. A partial dispatch reveals tracking
while the remaining sample preparation remains available. Existing customer-safe
action notices stay prominent regardless of section visibility.

## Part 1 — Ordering and shipping

Show six compact, horizontally arranged steps with distinct icons and short
labels: **Confirm order**, **Samples**, **Container supply**, **Assign containers**, **Match tubes**,
and **Send**. Completed steps have a checkmark and the current step is highlighted.
Distribute the six steps evenly across the full available width, without a
leftover seventh column. Future steps are visually muted and are not workflow
links; their informational panel remains available by hover, focus and touch.
The strip shows the short labels without a second row of Complete/Waiting state
text. State remains in each accessible name and in the detailed information panel.
Hovering or focusing an icon opens that panel with its full step name, recorded
state, purpose and current evidence. Unfinished steps also identify who must act;
completed steps do not imply who performed the work. Touch users can open the
same information from the icon. Escape, leaving keyboard focus or tapping outside
closes the panel; the pointer can move into it to read. Icons for
completed, current and future steps are informational: they never navigate to a
work area or perform a command. Below the sequence, **Your next step** gives the
action, prerequisite or wait and responsibility. Only its action button performs
the next command or opens the relevant work area from the sequence. Existing **Actions** commands and workspace
controls remain available under their existing rules. On narrow screens the step
strip scrolls horizontally to keep the current step visible without scrolling
the page. Opening a task keeps the user on the Job details page.
Use the helper **Complete these steps to prepare and send your samples.**

Responsibility is explicit. Show **You**, **Your administrator**, **Phaeno** or
**Carrier** as applicable. A Member who cannot accept an order sees which
administrator must act; do not show an impossible personal task. Waiting for a
quote or kit delivery is a visible dependency, not an unexplained disabled
button or a task the customer is expected to finish themselves. Later steps
must not compete with the one currently available next action.

A step may be **Not started**, **Complete**, **In progress**, **Waiting for you**,
**Waiting for your administrator**, **Waiting for Phaeno**, **Waiting for delivery**,
or **Needs attention**. Unknown data has an explicit unavailable state. Steps
that do not apply are omitted or labeled as such, never falsely completed.

| Customer step | Evidence and completion rule | Action or dependency |
| --- | --- | --- |
| Review and confirm the order | Configured order placement or acceptance of the applicable manual quote. A submitted pricing request is not acceptance. | Review scope/price and confirm under existing role rules. For manual pricing, show Submit for pricing when needed, then Waiting for Phaeno, then Accept quote when available. |
| Enter and finalize samples | Saved `sampleRosterFinalizedAt`; entered counts alone do not complete the step. | Main sample roster and existing finalization review. |
| Have transportation kits ready | Compatible received stock at the selected departure location sufficient for the proposed allocation, or the subsequently assigned containers. Availability must be current and remains provisional until assignment. | Use existing received stock, or order kits and confirm arrival. If kits are already available, do not require another order. Distinguish Phaeno fulfillment from carrier delivery and customer acknowledgement. |
| Assign containers | Every required tube allocated to an active compatible physical container; no unallocated tubes remain. | Scan each physical container's barcode, review tube allocation and confirm. |
| Match tubes | All required active tube slots have saved registered tube matches. | Scan the tubes for the selected container. Show remaining tube counts and resume where the user stopped. |
| Send and record shipments | Dispatch recorded for every required active shipment. A current nonvoid insert remains a prerequisite for each shipment; confirming or printing an insert alone does not complete Send. Display partial shipment counts. | Review and confirm the shipping insert, print its current revision, follow the packing instructions and put the insert inside the correct container. Hand each package to the carrier, then Record shipment with carrier, tracking number and shipment time. This records the customer's report of handoff. |

After matching, **Send** identifies any missing current insert confirmation before
printing and handoff. A recorded insert or partial dispatch makes Send **In
progress**. It becomes **Complete** only after every required dispatch is recorded.

### Direct next-step printing and packing acknowledgement

When **Send** is current and the selected eligible shipment has a current shipping
insert, **Your next step** offers **Print shipping insert** directly. It uses the
existing current-revision print flow and keeps the Job, selected container, page,
saved matches and focus context intact. Missing insert confirmation continues to
use the existing review/confirm action and its prerequisites.

After the print dialog returns, ask the user explicitly whether the current insert
was successfully printed and placed inside the correct container. Do not infer
success from opening, closing or cancelling the browser print dialog. Dismissing
this acknowledgement, cancelling printing, or a print/validation error must not
record it. Confirm only after the physical printing and packing work was done.

An explicit acknowledgement switches the next-step button to **Record shipment**;
its instructions still require carrier handoff before recording carrier, tracking
and shipment time. The existing shipment command and server permissions/version
checks remain authoritative. Reprinting the current insert remains available in
**Actions**. The acknowledgement neither issues a new revision nor records dispatch,
receipt, a server print event or completion of Send.

Remember this acknowledgement only in the browser tab, scoped to the signed-in
user, active organization, selected shipment, current insert ID and revision.
Refreshing that tab may retain it for the same scope; it is not shared across
tabs or devices. A different current insert or revision requires a new
acknowledgement. A different user, organization or shipment cannot inherit it.
If the scope cannot be established or retained, keep the print action available
without inventing acknowledgement. This is a user-reported workflow reminder,
not independent evidence that printing or packing occurred.

With several shipments, act only on the deliberately selected current container.
Do not silently choose the first remaining shipment for printing, acknowledgement
or dispatch. A sole eligible container can retain its existing automatic selection.
Each required shipment keeps its own revision-specific acknowledgement and must
still have dispatch recorded before Send can complete.

### Single and multiple shipments

Once the complete tube allocation proves there is exactly one shipment, show
**Send and record your shipment**, with singular instructions inside **Send** for
reviewing and confirming the shipping insert, printing, packing and carrier handoff. Do not show an
unnecessary zero-of-one shipment counter. Once recorded, show **Your shipment is
recorded — track progress below**.

For multiple shipments, retain **Send and record shipments**, recorded/required
counts and instructions inside **Send** for preparing each container's insert and
recording each handoff. A single
prepared container with an unallocated pool or incomplete family data is not yet
a confirmed single-shipment order; keep its final shipment count explicitly
unconfirmed rather than hiding the remaining work.

### Handoff between the two parts

**Send and record shipments** is the boundary. Once all required active shipments
have recorded dispatch, show **All shipments recorded — track progress below**.
Keep completed customer work available for review, but give **After you send**
the primary attention. Do not call the order complete or promise that the
customer will never need to act again.

Use shipment-level handoffs for split shipments: one package may be in transit
or received while the customer is still preparing another. Keep **Ordering and
shipping** active for the remaining package and show the sent package under
**After you send**. Neither the first dispatch nor the first receipt completes
the customer's whole shipping responsibility.

## Customer laboratory stages — September 10, 2026

The owner approved **Received → Library Prep → Sequencing → Data Assembly → Quality Review → Results Available**, shown in the Customer/Partner Job list, header and After you send. Users need to know where their work is and see sample counts when progress differs. This supersedes the initial single-milestone presentation below. Success means the two received Jobs display Received, recorded execution/sendout/data/review events produce truthful stages, and partial release never implies that the entire Job is finished.

Implementation adds an optional customer-safe progress summary to existing Lab list/detail responses. A Lab-owned read service resolves only the already-authorized Commercial orders, their matching organization/authorization/work, and scoped sample facts; it exposes stage keys and sample counts/IDs only. Reads are batched for the list page. It changes no persisted status, provider command, permission, dependency, or schema. This additive API/UI scope is part of the approved customer-status work.

Recorded started laboratory preparation/execution and prepared libraries establish Library Prep. Batch membership alone or sendout Preparing/Shipped/ReceivedByProvider never establishes Sequencing; the provider must record Sequencing or Complete. Data Assembly follows sample data-processing or output-upload evidence, or a recorded work-wide DataProcessing milestone when no sample has finer downstream evidence. Quality Review follows reviewable output or the explicit scientific-review milestone. Results Available requires an actually released result for each counted sample; readiness for release is insufficient. Work-wide milestones provide a clearly labeled Job stage when sample-level attribution is unavailable; they do not assign that stage to every sample. Pending receipt, sample holds, rejected/cancelled specimens and released subsets remain explicit. Customer-visible order holds/cancellation/terminal states take precedence over stage labels.

The progression shows **current** sample counts, not inferred historical completion checkmarks. For mixed attributed stages, the earliest unfinished sample stage represents the Job; outstanding receipt prevents the last released sample from making the whole Job appear complete. Detailed sample rows identify their recorded stages. Existing commercial lifecycle filters remain labeled Order status.

## Part 2 — After you send

This is primarily a progress and results area, not another customer to-do list.
Show sent shipments/tracking, actual received counts, current laboratory status,
expected completion and released results. Keep it concise until those facts
become relevant. Before recorded dispatch or other substantive tracking evidence, this area is hidden.

For the first delivery, reuse the existing receipt, timing, laboratory milestone
and results information in this separate area. A detailed scientific-stage
checklist is secondary and must not delay the customer ordering/shipping work.
The following remain distinct outcomes, with completion only where evidence
supports it; they need not all become separate checked steps in the initial UI.

| Progress after send | Evidence and completion rule | Responsibility |
| --- | --- | --- |
| In transit | Recorded dispatch and tracking; do not infer carrier delivery or laboratory receipt without that evidence. | Carrier; customer can review tracking. |
| Samples received | Actual unique received-tube counts reach the expected active total. Show partial counts per sample and shipment. | Phaeno records receipt; the customer watches progress here. |
| Samples accepted | Authoritative scientific acceptance facts for the applicable scope. First receipt or an accession identifier alone is insufficient. | Phaeno; show any customer action needed. |
| Laboratory work | Customer-safe laboratory milestones, with processing, sequencing when applicable, and data processing underneath. Completion must follow confirmed applicable work, not the numeric order of status names. | Phaeno; approved schedule and customer action summaries remain visible. |
| Scientific review | Recorded scientific completion/ready-for-release evidence for the applicable scope. | Phaeno. |
| Results available | Actual released sample packages/files. Show partial releases and current download availability. | Existing Files and results area. |

If Phaeno needs clarification, replacement material or another customer response
after dispatch, surface **Action needed from you** prominently above both parts
with the specific request and permitted action. Preserve the completed shipment
history; any replacement preparation is clearly identified and does not reset
the original order or silently reopen its completed shipping tasks. Downloading
available results is an explicit customer action in this area, not a laboratory
processing milestone or evidence that the files have already been downloaded.
Recorded dispatch continues to lock tube assignment/corrections on that sent
shipment. A post-send request must follow its permitted response or replacement
workflow rather than reopening the original scanner.

## Evidence and business rules shared by both parts

Shipping insert review, confirmation, printing and packing remain customer work
within **Send**, with the existing commands and backend prerequisites. There is
no separate shipping insert icon or completion step. Opening or cancelling a
print dialog does not establish a physical print. The Product Owner separately
authorized the explicit printed-and-packed acknowledgement described above to
advance the next-step guidance; it is local to that browser tab and current insert,
and does not create a server completion or physical-proof claim.

Kits can already be available at the departure location, including stock from
another Job. **Order a kit** is therefore conditional help under container
preparation, not a mandatory step in every order. A shipped outbound kit is
also different from samples being sent back to Phaeno. Customer kit receipt
requires physical arrival and the existing acknowledgement; carrier tracking
alone cannot complete that customer step.

Orders and samples can progress in parallel. Partial receipts/releases display
counts and do not give the entire Job a completion check. Holds, corrections,
rejected material, replacements, cancellation and withdrawal appear explicitly;
they are not happy-path completions. A tube correction automatically issues a
new insert revision under the existing workflow; the insert-confirmation fact
remains complete, with a reminder to review and reprint that shipment's updated
insert. The previous printed-and-packed acknowledgement no longer applies to the
new revision. Do not add another server confirmation flag or mutation. A cancelled record does not inflate active
shipment/tube totals. Confirmed earlier facts remain visible during a hold.

Keep expected completion and schedule health in **After you send**, using the
existing timing facts and customer-safe reasons. Scientific acceptance starts
the published turnaround; first receipt remains a separate date. Billing remains
accessible on the Job but is not drawn as a gate to scientific approval or PSeq
result release. Historical release completion and current download availability
must remain distinct when retention expires or access is closed.

## Shipping on the Job details page

1. Keep the Job identity and **Ordering and shipping** checklist above a
   full-width work area. **After you send** is a separately labeled tracking area.
   Move shipping out of the current narrow left column; avoid nesting the
   shipment page's header, main landmark and card layout inside that column.
2. Retain one grouped sample roster, including actual received-tube counts and
   separate laboratory status. A compact container summary below shows each
   shipment's identity, tube counts, destination and status. Expand the existing
   **Samples and shipping** area and paginate its list instead of requiring an
   inner scrollbar. Use the unified sample list described below in this same area.
3. Selecting a container opens its shipping workspace in the same Job page.
   With one container, use it directly. With several, make the selected container
   unmistakable and keep a compact chooser. Preserve unallocated pools and
   destination/handling splits; do not combine all containers into one shipment.
4. Keep the default workspace view-first. **Prepare containers** or **Match
   tubes** intentionally opens the current task. While scanning, give the scanner
   the available width; summarize kit/container details in compact supporting
   rows or a disclosure. Avoid a second always-expanded copy of the sample list.
5. Bring order and shipment commands onto the Job page using the **Actions**
   menu described below. Reuse existing bounded dialogs for confirmation, tube
   correction, cancellation and dispatch. **Print shipping insert** prints in
   place and preserves the Job URL, selected container, scroll position and focus.
6. Completed work remains reviewable. **Done** or closing the active task returns
   focus to its invoker on the Job. Each successful scan stays saved and resuming
   returns to the next unmatched tube, as today.

### Actions available from the order page

The owner identified the current imbalance: **Request cancellation** is visible
on the Job, while normal shipping actions require another page. The Job
header gathers eligible commands in one **Actions** menu, with clearly labeled
**This order** and **Selected shipment** groups when both apply. **Request
cancellation** remains available under its existing rules and confirmation; it
is a secondary order command, not the prominent next customer task.

Order commands include existing edit, pricing, withdrawal and cancellation
actions as applicable. Shipment commands include prepare/select containers,
start/resume scanning, review and confirm the shipping insert, print the insert,
download the tube list and record shipment as applicable. These invoke the same
Job work area or existing dialogs, without normal navigation to shipment details.
When there is more than one eligible command, use the agreed dropdown; one
eligible command can appear directly. **Your next step** names the next task and
the matching command is prominent in the menu. Form submit buttons, row-specific
correction controls and pagination remain with their respective work.

Show the selected shipment/container identity beside the work area's toolbar and
in the shipment action group. If several shipments exist, require a deliberate
selection before a shipment-specific command; do not silently act on the first
shipment or apply a command to every container. A single eligible container can
be selected automatically with its identity clearly visible.

Action gates remain based on the complete selected shipment and verified supply:
confirm only when all its saved tube slots are matched, record dispatch only
while permitted for ReadyToShip, and print/download only when an appropriate
insert exists. Authorized readers retain print/download access. Neither one
fully matched page nor another container's completion enables these actions.

### One sample list with integrated tube matching

Approved September 10, 2026: replace the Samples / Scan tubes switch with one
biological-source-grouped sample list throughout entry, finalization, matching
and review. This supersedes the earlier two-view design. Success means the user
can identify, match and review each tube without switching rosters, while whole-Job
sample progress and the selected physical container remain distinct.

Keep ten samples per page, natural sample-ID order, continued source headings,
accepted counts and the existing bounded entry/import/finalization dialogs.
Expand a sample to see its individual saved tube slots, barcodes, container
identity and permitted corrections. Keep sample match totals Job-wide, including
samples split across containers. Unmapped saved slots remain explicitly visible
under Tubes needing sample review; never silently drop them. Retired selected
containers retain labeled read-only history without inflating active match totals.

Match tubes intentionally opens one scan field above that same list. Its target
identifies the container, sample and saved tube number. Start at the next unmatched
tube; each successful save reveals its successor's sample/page and restores field
focus. Failed saves retain the barcode and target. Reviewing another sample or
page cannot retarget an entered scan. Return to active tube restores its expanded
sample and focus. Paging and dismissal are disabled during a pending save;
Done scanning confirms before discarding a dirty entry. The final saved match
closes the field and retains the sample list for review.

With multiple containers, require a deliberate selection and show each tube's
container within the expanded sample. Correction actions belong only to the
selected eligible container; other containers' tubes remain reviewable. Preserve
backend checks, registered-container requirements, stale-data guards, permissions
and post-dispatch locking. Existing URL parameters continue to open preparation,
but no longer replace the sample list with another view.

Keep routine Expected status and zero receipt hidden before dispatch in this
combined list. Show receipt and laboratory facts when dispatch, actual receipt,
accession or non-routine status makes them relevant; customer-safe exceptions
remain visible. Scanning never establishes laboratory receipt.

Use a single page scroll, readable barcodes and stacked narrow-screen rows.
Standalone shipment and Trial scanners retain their eight-slot pagination;
this change is scoped to the Customer/entitled Partner Lab Job workspace.


## Engineering design and evidence gaps

Extract a shared shipment workspace from `SampleShippingDetailPage.tsx`, leaving
route identity and page shell in its hosts. Reuse `ShippingContainerSelector`,
`SampleShipmentPackingPanel`, `SampleShipmentResetPacking`, `SampleTubeScanner`,
`TransportationKitsPanel`, `ShippingInsertPrintFrame` and existing mutations.
Parameterize host navigation where packing/reset success, container selection,
kit-order intent and location-inventory return currently target shipment routes.
Use one keyed scanner instance; route or container changes must pass the same
dirty/pending-input guard before unmounting it. Do not steal scanner focus when
background receipt/progress queries refresh.

Share organization/Department/source-scoped shipment queries between roster,
container summary and progress. Successful edits must invalidate all affected
Job, shipment, receipt and insert queries. Preserve server permissions,
optimistic versions, idempotency, physical-container ownership checks, first-scan
reset locking, correction audit and current-insert revision checks. The hosting
refactor needs no new dependency, authentication change or persisted model.

The current Job DTO provides placement, quote acceptance, finalization, timing,
sample status, one `labMilestone`, customer actions, `labReadyForRelease`, and
released files/packages. The shipping DTO provides active allocations, matches,
insert revisions, dispatch and received counts. These support the preparation
steps directly. The current laboratory milestone is a snapshot, not a complete
history of every sample's scientific workflow.

The initial delivery does not expand the laboratory checklist. Before any later
implementation of laboratory checkmarks, verify the exact coverage of
`timing.acceptedAtUtc`, `labReadyForRelease` and the existing customer-safe
projection for mixed samples and workflows. Do not infer all-stage completion
from an ordinal comparison or parse free-text timeline reasons. If the exposed
facts cannot support a stage check honestly, add a scoped read-only progress
projection from existing persisted scientific evidence, following review of
that API/contract scope. Keep the snapshot stage visible until the evidence is
available; no invented timestamps or completion states. Internal laboratory
notes and raw investigation details must not enter the customer roadmap.

## Implementation sequence and acceptance

1. Define and verify the customer checklist and responsibility mapping, including
   standard/manual pricing, administrator actions, kit availability/arrival,
   partial sends and the dispatch boundary. Add meaningful mapping tests.
2. Add the two-part presentation, emphasizing **Ordering and shipping** with
   **Your next step**. Reuse current tracking, timing and results information in
   **After you send**, without adding a granular scientific checklist.
3. Extract the shared shipment workspace without changing behavior, then host
   it in the expanded Lab Job **Samples and shipping** area using stable selection
   and guarded navigation. Add the combined action menu and paginated sample/tube
   views, preserving the current 8-tube scan advancement behavior.
4. Update affected Customer/Partner help and living frontend/E2E plans. Verify
   the real workflow at a single logical checkpoint after authorization.

Acceptance criteria:

- Users can identify the current step, the next action and who must act without
  opening another page. Customer tasks, administrator actions, Phaeno waits and
  carrier waits are explicit. Applicable completed stages reflect recorded facts.
- The sequence has six informational icons. Hover, keyboard focus and touch
  expose the detailed step explanation without navigating or changing data.
  Completed icons do not reopen work. Only the next-step action invokes work from
  the sequence, while the Job's existing commands remain available.
- **Send** includes shipping insert review, confirmation, printing, packing,
  carrier handoff and dispatch recording. It completes only after every required
  active shipment is recorded as sent; neither insert confirmation nor printing
  alone completes it.
- A ready current insert gives **Your next step** a direct **Print shipping insert**
  action. Only an explicit printed-and-packed acknowledgement changes it to
  **Record shipment**. Cancellation, dismissal, error or a changed insert revision
  cannot acknowledge the work; reprint stays in Actions. Tab/user/organization/
  shipment/insert scope and deliberate multi-container selection prevent reuse
  for the wrong package. No acknowledgement writes a server dispatch or receipt.
- The page provides **Ordering and shipping** and reveals **After you send**
  only when substantive tracking or result evidence makes it relevant. Customer work is prominent until every required dispatch
  is recorded; partial sends can have active work in both parts.
- After dispatch, a new customer action cannot be hidden in laboratory details.
  It appears prominently without erasing completed customer/shipment history.
- Normal container preparation, scan/resume, insert review/print/correction and
  dispatch can finish within the Job details workspace.
- The Job's Actions menu exposes all applicable order/selected-shipment commands;
  cancellation does not displace the next customer task. Menu context and gates
  cannot target the wrong container or treat the visible page as the full scope.
- The expanded list offers sample and tube views with explicit row units,
  pagination and total counts; it does not require nested vertical scrolling.
  Multi-tube samples and source groups retain context across page boundaries.
- Paging for review does not change the active scan target. A successful save
  advances to the correct tube/page once; a failed save preserves the input.
- One and multiple containers, split samples, existing location stock,
  unallocated tubes, partial receipt/release, holds and cancellations remain
  accurate. Retired history does not appear in the routine external summary.
- Stale versions, failed loading, missing capabilities and absent evidence never
  appear as completion or zero receipt. Retry preserves valid work.
- Barcode autosave, Enter behavior, duplicate/wrong-container rejection, dirty
  navigation guards, selected container and focus survive the host change.
- Keyboard and narrow-screen use, both themes, readable state text and focus
  visibility meet the existing accessibility standard; changes are not conveyed
  by color alone. No duplicate scanner IDs or overlapping active editors.
- Opening/cancelling print leaves the same Job and selected shipment intact;
  the Letter/A4 insert layout and frozen identities stay unchanged.
- Existing shipment bookmarks, Trial pages, staff receipt and organization/
  Department boundaries continue to work.

Success is measured first by customer clarity: users can explain what they must
do next, what they are waiting for, and when their shipping work is recorded as
finished. Normal shipping requires no page change, and the manual acceptance journey has
no duplicated operations, lost input or incorrect completion checkmarks. No new
analytics or production data collection is proposed.

The current HS5Y7DB7 walkthrough stays paused at 18/18 matched, ReadyToShip,
insert revision 1. Workspace verification must not create another shipment, issue another
insert, dispatch samples or consume physical receipt/print acceptance. Automated suites remain unrun at this checkpoint; no Git operation, deployment
or migration is included in this execution. Physical print, dispatch and receipt
acceptance remain pending in the saved manual run.


## September 10 implementation checkpoint

- `LabJobOrderProgress` and its pure evidence mapper render the six-icon horizontal
  sequence, with detailed informational panels and shipping insert work included
  in Send. Only the next-step action invokes work from the sequence. Completion uses accepted/placed order facts, finalization and the
  complete active shipment family. Missing data, cancelled configurations and
  partial shipment work cannot produce an all-complete result. Compatible stock
  evidence comes from the existing current kit-supply query, when available.
- `LabJobShippingWorkspace` hosts the shared shipping controller, one grouped
  ten-sample page with expandable tube rows, the active container context and compact
  container summaries. Header commands render in the Job's Actions menu even
  while the sample overview is shown; printing keeps the Job open.
- Validated search stores the selected container, view and sample page. Multiple
  containers require deliberate selection. An invalid or retired selection is
  explicit and has a route to current containers. Dirty scans keep their discard
  guard; pending writes and open shipping tasks lock incompatible navigation.
  Packing/reset success navigates only after the save and family refresh, using
  a narrowly scoped post-save transition. Existing standalone routes remain.
- `LabJobAfterSend` shows recorded dispatch and actual receipt counts; existing
  laboratory status, timing and released results remain separate from customer
  preparation. Customer-safe action requests stay above both parts.
- Focused assertions cover evidence mapping, sample/tube pagination and preserved
  targets, permission/source boundaries, combined commands, navigation/return
  context and print embedding. Direct Send assertions also cover explicit
  printed-and-packed acknowledgement, refreshed current-revision validation,
  tab-scoped persistence, focus return and pending-action locks. They have been
  updated but not executed as suites.
- The earlier signed-in read-only inspection of HS5Y7DB7, before shipping insert
  work was merged into Send, showed both product parts, six preparation steps
  complete, Send waiting for the customer, 18 of 18 saved matches and no recorded
  dispatch. In the six-step presentation, the same evidence supports five completed
  steps and Send awaiting the customer; insert revision 1 remains confirmed. This
  preserves the operational checkpoint without claiming a new physical action.

Final verification evidence is recorded in the saved walkthrough addendum. The
customer clarity and physical acceptance criteria above remain review gates;
local code checks do not complete them.

### Final unified-workspace validation - September 10, 2026

104 tests passed across 10 focused frontend suites; full TypeScript, scoped lint,
documentation freshness (56 guides, corpus `c43fb0c27b35`) and whitespace passed.
Signed-in DOM/accessibility checks confirmed the quote-heading actions and
source counts on 69SJN4PA, the combined 18/18 sample list on HS5Y7DB7, stage-relevant
section visibility, keyboard disclosures, and light/dark narrow-layout bounds.
Screenshot capture timed out; screenshot-based visual review and physical
printing/packing/dispatch/receipt remain separate pending gates. No operational
records, Git state, deployment or database schema was changed by these checks.
See the [walkthrough record](../testing/runs/2026-09-08-hs5y7db7-local-walkthrough.md).

### Sent-shipment insert reprinting — September 10, 2026

Sent shipments with a current nonvoid insert now expose a visible Reprint shipping insert action in the selected shipment workspace. With several containers and no selection, the Actions command and selector helper explicitly explain container selection for reprinting. The existing print frame verifies the current revision; no new insert, dispatch or receipt is created. Focus returns to the reprint button after printing or cancellation. Existing reader access and shipment ownership checks apply. Documentation, TypeScript and scoped lint checks are the verification scope; automated suites and physical printing are not requested.


### Minimal receiving insert - September 10, 2026

The owner replaced the former multi-page packing insert with a minimal receiving
sheet per container. This decision supersedes older full-manifest printing and
top-right barcode descriptions in this plan. The PH-P insert revision barcode
moves into the body under **Scan to receive this shipment**, enlarged to 20 mm
bar height with 0.4 mm nominal modules and preserved quiet zones. The optional
physical container barcode occupies a separate block with 14 mm between blocks.
Order, shipment and individual sample/tube barcodes remain in the Portal's
expandable full manifest, outside printed output. The sheet includes Customer,
Job/Trial and shipment references, frozen container identity, this container's
sample/tube counts, complete deduplicated temperature/safety notes and receiving
contact when configured. Preparation, routing and full instructions stay
available in the Portal before dispatch. No snapshot, barcode value, revision,
receipt/accession rule or schema changes. Unusually long configured safety notes
must flow without clipping; physical printer/scanner acceptance remains required.

Current-revision validation and explicit printed-and-packed acknowledgement stay
in force. Print-frame teardown removes its React portal before disposing its
iframe to avoid stale-document removal errors.


### All Portal-generated graphics use QR codes - September 10, 2026

The owner's subsequent instruction replaces both Code 128 shipping graphics
and Code 39 laboratory labels with QR codes across the Portal. Adopt the pinned
`qrcode.react` 4.2.0 SVG renderer (React peer only) rather than maintaining another
custom encoder. Use one shared IdentifierQrCode with a four-module white quiet
zone, black modules and at least M error correction. Encode the original exact
identifier, including case and punctuation; never a URL or embedded manifest.
Receiving targets are 32 mm square, ordinary record displays 28 mm, and the
existing 50 x 25 mm laboratory label uses an 18 mm square with rearranged context.
The receiving sheet keeps 14 mm between target blocks. This supersedes the
linear dimensions in the preceding entry. Existing scanner normalization,
checksums, saved identifiers, manufacturer labels, authorization and audit rules
remain intact. Reject empty/control-character/overlong display values safely.
No EF migration or production data conversion is needed. Scope includes the
frontend dependency and lockfile, shared renderer, lab label layout, stock-kit
print layout, tube rows, receiving insert, guidance and focused verification.

Physical acceptance requires QR-capable 2D scanners and representative printed
labels; stored identifiers and historical linear labels remain compatible.
