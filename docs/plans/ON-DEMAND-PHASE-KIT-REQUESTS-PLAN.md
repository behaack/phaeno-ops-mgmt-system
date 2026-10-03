# On-demand transportation kits and phase shipping

Owner-authorized implementation, October 1, 2026. Applies to every Customer or
Partner Lab Job, including one-phase Jobs. No Git publication or deployment.

## Quiet cancellation action exception — October 3, 2026

Owner-approved exception to the ordinary sole-action rule: Customer/Partner
Job and phase cancellation requests remain in a neutral **Actions** dropdown,
even when they are the only eligible action. Both cancellation menu items are
red, and their confirmation actions use destructive styling. This keeps an
exceptional operation available without emphasizing it in the ordinary workflow.
Use the shared ActionMenu's explicit documented-exception option, including
the phase-card presentation. Ordinary single actions retain direct buttons.
Eligibility, pending-state guards, reason entry, review and backend writes remain
unchanged. Record the exception in UI policy and AGENTS.md, update external
guides and preserve menu keyboard behavior, focus return and disabled metadata.

Local verification: TypeScript, scoped ESLint, regenerated/checkable 56-guide
help corpus and scoped diff checks pass. Manual actual-component preview with
synthetic records verifies neutral sole-cancellation menus, one indicator,
destructive Job/phase items and phase confirmation, keyboard opening and focus
return, disabled guards and ordinary direct View results. At 390 px in dark
mode the phase menu fits with no page overflow. Evidence:
[Job menu](../../output/cancellation-menu-evidence/job-menu.png) and
[phase menu](../../output/cancellation-menu-evidence/phase-menu.png).
Temporary preview files/cache are removed; no cancellation or other saved write,
automated suite, Git publication or deployment was performed.

## Receipt action dispatch prerequisite — October 3, 2026

Owner-requested correction: Customer and Partner administrators must not see
**Record kit receipt** before Phaeno sends a physical kit. While none of the
current request's dispatched kits awaits receipt, **Next step** shows **Wait for
Phaeno to send kits** and an explanation, with no next-step action. The saved
request stays available through **View kit order** beside the shipping heading.
After dispatch, receipt is offered only when the server reports receipt
permission. Partial dispatch allows receipt of sent kits; receiving all sent
kits returns to waiting if more kits remain unsent. Preparation still requires
complete receipt or sufficient previously received stock.

This is a presentation correction using existing dispatch records and permission
flags. No API, persistence, authorization or historical-data change is required.
Focused component regressions cover pending one/multiple-phase Jobs, partial
dispatch, remaining unsent kits, and receipt permissions; execution is
request-only. Customer, Partner and Phaeno guides are updated together.

Local verification: TypeScript, scoped ESLint, help generation/check (56 guides)
and scoped diff whitespace checks pass. Manual actual-component browser review
uses synthetic records with all saved writes prevented: pending, partial/sent,
remaining dispatch, Member, complete receipt and existing stock behave as above.
Keyboard kit-order opening/closing restores focus. At 390 px in dark mode, the
page has no horizontal overflow and pending/sent states respectively have zero
and one receipt buttons. Evidence: [pending desktop](../../output/kit-receipt-dispatch-evidence/pending-desktop.png)
and [pending dark phone](../../output/kit-receipt-dispatch-evidence/pending-mobile-dark.png).
Automated suites were not run; no Git publication, deployment or data writes.

## Release verification corrections — October 2, 2026

The owner subsequently authorized documentation, complete tests, commit/push,
deployment and required migrations under the October 2 hosted release plan.
An accepted Change quote opens preparation only for its new unprepared phase;
the original finalized roster timestamp does not block that pending addition.
Existing prepared phases, kit ownership and preceding-phase dispatch remain
locked. The connected change-quote regression retains the original sample and
receipt, appends a real sample/tube/run crosswalk and verifies incremental work
authorization and invoicing. The cancellation fixture now finalizes and records
explicit simulated dispatch for phase one before preparing phase two.

Closing a kit-request dialog returns focus to its surviving invoking control.
The opener lookup excludes the dialog's auto-focused Cancel control and falls
back to the current shipping action if a supply refresh remounted the button.

## Acceptance transition correction — October 2, 2026

Customer/Partner quote acceptance must close its confirmation, open Progress,
and release pending-action locks so an eligible shipping action works without
a refresh. Acceptance still creates no kit request. The successful acceptance
navigation uses the existing `afterSave` contract; ordinary unsaved decisions
retain their discard/navigation guard. Previously, navigation from the success
callback could hit the still-mounted dirty guard and leave the mutation pending.

`lab-quote-acceptance.spec.ts` uses the actual detail page and router blockers
with in-memory records. It covers successful navigation, opening the kit request
without submitting one, and retaining unsaved confirmation entries. Browser
inspection reproduced the original warning and verifies the correction with
synthetic records only; no saved orders were accepted or kit requests submitted.
Automated suites remain unexecuted under the request-only rule.

## Order detail organization refinement — October 1, 2026

Single-phase refinement (owner approved): the first supporting tab is **Progress**
for every Job. A single-phase Job shows its summary, timing, samples, shipments
and holds directly, without a Phase 1 heading or expander. Shipping uses
`Shipping (1 sample)` / `Shipping (N samples)` and order-based instructions in
the request and preparation dialogs. Only Jobs with multiple phases show the
ordered phase list, phase shipping heading and phase sequencing instructions.
Receipt totals appear once expected tubes/containers exist; before then show
`Awaiting sample shipment`. The single-order TAT reads `N business days after
all required samples are received`. Existing phase IDs, URL selections,
permissions, cancellation, kit allocation and processing rules stay unchanged.
The internal URL value `phases` is retained for the renamed Progress tab.
After all required shipments are sent, single-phase shipping retains its sample
count and directs the user to Progress instead of suggesting another kit request.
This supersedes the Phases tab name in the earlier organization notes below.

The owner approved consolidating the Customer/Partner Job workspace. Keep the
current task above four supporting tabs: Phases, Files and results, Order and
billing, and History. Accepted Jobs default to Phases; unaccepted requests
default to their commercial review. Preserve URL tab/phase selection, keyboard
navigation, dirty-work guards, modal focus and narrow/light/dark layouts.

Phases is one ordered list containing planned, current, sent and cancelled
phases. Expand one phase for its exact samples, shipments, receipt, laboratory
stages, TAT and holds. Remove the separate Sent phases and After you send
summaries. Preparation/shipment controls belong immediately beneath the current
task and appear only at the relevant step. The Send workspace omits the completed
paired-preparation form and kit-delivery panel; receipt stays in the shipping task. Results remain independently
discoverable, with an exact sample-to-phase filter. Active holds/customer actions
remain prominent; their detail/actions belong with the affected phase.

Retain unique job-wide timing facts in a compact disclosure in Phases and merge
timing changes into History. Preserve commercial/phase cancellation decisions,
request snapshots, QC disclosures, invoice/download permissions and governed
result availability. This supersedes the previous collapsed Phases/billing and
Sent phases presentation, without changing shipping or laboratory business rules.
The existing hold read projection adds its submitted sample identity so phase
filtering uses IDs; no name inference, model migration or data conversion.

Acceptance: only one phase-tracking surface, no preparation form at Request or
Receive, direct Send modal commands preserved, Phase 2 Request after full Phase 1
dispatch, accurate partial/result/hold states, and each supporting task reachable
by its tab. Verification includes scoped builds/typecheck/lint/docs checks and
manual synthetic UI review; automated tests remain request-only.

## Product decisions and acceptance

- Accept pricing once for the Job. Acceptance confirms the Sample type and
  commercial work; it creates no transportation-kit request.
- Each active phase repeats Request transportation kits, Receive kits, Prepare
  sample shipment, and Send and record shipments. Request when ready, including
  months after acceptance. Request, preparation and shipping follow phase order.
  The next shipping phase opens after every required shipment from the preceding
  phase is recorded as sent. Kit ordering stays on demand; result delivery is not
  a shipping prerequisite. Laboratory processing retains its separate
  preceding-phase result-delivery gate. Approved cancelled/superseded phases are skipped.
  Full physical sample receipt starts TAT.
- Calculate compatible kit capacity independently for each phase's physical
  sample requirement, not sequencing-run quantity. Each phase uses distinct
  physical kits. Received compatible stock can cover demand; request only the
  shortage. Kit supply remains included in the order price. When allocated,
  already-received stock covers the whole phase, show **Existing kits allocated**
  and **Received · existing stock** on the completed steps and explain that no new
  delivery is needed. Do not infer receipt from allocation alone or advance on
  insufficient capacity. An outstanding outbound request stays at Receive.
  The Receive step shows **Request received**, **Sent**, **Received**, or an
  explicit partial dispatch/receipt status beneath its label.
- Request only the current phase, with a separate fulfillment record per phase
  and a confirmed Department delivery address at request time.
- Finalize one phase's exact source/sample/run crosswalk without naming future
  cohorts. Authorize those specimens and create shipments only for its kits.
- Keep physical receipt, dispatch, barcode membership, compatibility, expiry,
  tenant authorization, concurrency, and duplicate-use checks authoritative.
  Preparation and stock allocation accept the current completed-assembly,
  exact-product/namespace tube-roster rule used by dispatch. A second tube
  rescan is optional under the current domain/controllers and their existing
  regression coverage; older prose suggesting a mandatory rescan is superseded
  for this path. Do not fabricate a rescan marker or change received-kit data.
- Cancelled/superseded phases cannot receive new kit requests or preparation.
  Pending requests must be reconciled after scope changes; dispatched history
  remains immutable. Replacements remain explicit requests for uncovered demand.

## Engineering scope

Persist phase attribution on fulfillment requests and physical preparation kit
selections, and per-phase preparation completion. Replace the Job-wide open
request constraint with a phase-scoped constraint. Use the existing idempotency,
tenant scope, physical stock locking, and Lab authorization amendment contract.
Store preparation mode explicitly rather than infer it from a delivery address.
The address belongs to the kit request and the selected physical kit.

Before acceptance, show **Review and Accept Order** with order scope, quote
pricing and the existing Actions menu. Omit the confirmation/shipping step strip
and its next-step card. Keep exceptional order-status feedback and permission,
expiry and decision guards. After acceptance, the Customer workspace automatically shows the earliest unfinished phase's
four shipping steps under **Shipping: Phase name (X samples)** after acceptance.
Use the current phase's name and physical sample count in the heading; remove
the repeated phase identity below it, the phase picker and status overview. A Next step
card names the action and offers a trailing button to perform it or navigate to
preparation, shipments or phase progress.

Keep **Send and record shipments** as the next-step title. Its trailing action
comes from the selected shipment, using the existing command and dialog owner:
**Review and confirm shipment contents** opens that shipment's confirmation
modal directly. The owner's simplicity refinement keeps one direct command:
confirm contents, then Print shipping insert, then Record shipment after the
current insert is explicitly printed and packed. View shipping instructions and
reprinting remain in Actions. The Job header cannot offer Record before this
acknowledgement. Preserve permission, loading, modal, concurrency and exact-insert
guards. Shipment selection remains explicit when several containers exist.

Show the selected insert's frozen packing instructions inside **Confirm printed
and packed**, expanded initially and collapsible in that same dialog. Keep its
shipment/revision identity and explicit acknowledgement footer visible; no nested
instructions modal or extra completion field is introduced. Do not substitute
instructions from a different revision. Instructions remain available in Actions.

The accepted Job's Phases (or Delivery scope for one phase) disclosure starts
collapsed. Its aligned indicator and label expand the full phase workspace;
**View phase progress** opens the disclosure before scrolling and focusing it.
Advance shipping only on confirmed preparation, exact full sample membership,
complete shipment coverage and recorded dispatch of every active container.
Preparation, partial shipment, results alone and cancelled containers do not
substitute for full dispatch. Shared backend guards reject out-of-sequence kit
requests, pairing/finalization and carrier handoff, including direct API calls.
The earliest unshipped phase becomes current automatically (Phase 2 / Request
transportation kits after Phase 1 is sent). Show a persistent Sent phases summary
with physical receipt, customer-safe Lab stages and available result counts, plus
one View phase progress action opening the existing disclosure. Keep that button
and the accepted quote Download quote PDF button at the same default height and
176 px width, within the available narrow-screen width. Shipping completion is
separate from result delivery. No persisted-model change or migration is needed.
Pending phase cancellation blocks preparation/shipping; historical kit receipt
remains a physical fact and saved kit orders remain reviewable. Bounded kit requests use a shared Dialog with separate
header/body/footer; contextual commands use one shared Actions menu. Preserve
the existing kit-order receipt modal, history, keyboard/focus, responsive, and
theme behavior. PDF presentation is outside this change.

## Existing data

The additive local migration preserves orders, issued/accepted quotes, kits,
addresses, dispatches, receipts, and pairs. No phase/request/kit history is converted automatically. A read-only local review found only two placed Jobs (M9DE75F7 and NQL359KT), both already using paired preparation and with no samples, pairs or selected kits. The additive migration carries only their existing preparation-mode marker forward using guarded record IDs; original scopes and kit requests remain unchanged. Ambiguous whole-Job requests remain visible
as unassigned history; physical kits require an explicit phase selection before
preparation. Do not guess phase attribution or rewrite dispatch history.

Alternatives reviewed: a one-time audited assignment/conversion, or deletion and
reseeding of affected development Jobs and kits. Reset loses operational history
and requires separate destructive authorization. Automatic approval review rejected broad historical conversion; the narrowed two-record marker carry-over and additive schema were approved. Other environments require a separate data review and release authorization, including any historical reconciliation. Preserve history by default.

## Verification and documentation

Author focused backend/frontend coverage for no automatic request, independent
capacity and stock allocation, cross-phase kit rejection, duplicate requests,
partial receipt, phase finalization/amendment, cancellation, stale versions,
tenant isolation, and modal focus. Automated execution is request-only under
AGENTS.md. Batch compilation, TypeScript, scoped lint, help generation, migration
verification, and manual UI checks at the implementation checkpoint. Update ERD,
owning plans, and separate Customer, Partner, and Phaeno guides in the same change.

Implementation checkpoint: complete locally. Acceptance/standard placement no
longer creates kit requests or asks for their delivery address. The phase supply
and request APIs, independent preparation/finalization and authorization
amendments, Customer/Partner phase workspace, request/receipt/cancellation
dialogs, and POMS phase identity are implemented. Kit orders for cancelled or
replaced phases remain accessible in history. Unusable stock does not count as
coverage, and expired stock at an earlier address does not prevent replacement.

Success criteria: zero automatic acceptance-time requests; each physical kit
belongs to exactly one phase; kit capacity follows physical samples; preparing
one phase requires zero future-phase Sample IDs; retries create zero duplicate
requests. Automated acceptance of these criteria remains request-only.

Validation: normal API and test assemblies compile without warnings/errors;
TypeScript, scoped lint, generated help, EF model alignment and diff checks pass.
The local additive migration is applied, the full ERD is current, and read-only
data review confirms preserved Job/request history. Actual-component offline
browser review passes request/retry/cancel, phase isolation, modal regions,
keyboard/focus, themes and narrow bounds. See
[the checkpoint](../testing/runs/2026-10-01-on-demand-phase-kits.md) for evidence
and pending connected/physical acceptance. No automated tests, Git publication,
deployment or production database changes were performed.

Ordered-phase refinement checkpoint: current-phase-only shipping, the Next step
action, dynamic Shipping heading and direct API guards are complete locally.
See [the refinement evidence](../testing/runs/2026-10-01-ordered-phase-shipping.md)
for compilation, browser preview coverage and the remaining connected acceptance
boundary. The earlier checkpoint's bulk request selection is superseded.

## October 2 release corrections

Saved quote acceptance now awaits the transition to Progress with the explicit
after-save path, so the still-mounted acceptance form cannot trigger a false
discard prompt or leave kit requests disabled. Ordinary unsaved navigation stays
guarded. Accepted Change quote additions can prepare and finalize new sample/tube
pairs after the original roster is finalized; their provider amendment retains
the accepted-additional-scope reason when original work has already started.
Original pairs, phase-order gates and physical kit exclusivity remain enforced.
The full component and synthetic browser suites passed as recorded in the
[October 2 release plan](PORTAL-WORKFLOW-RELEASE-20261002-PLAN.md). Connected backend
results and exact hosted activation evidence belong to that release checkpoint.
