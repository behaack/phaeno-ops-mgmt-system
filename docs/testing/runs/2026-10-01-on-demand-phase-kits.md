# On-demand phase kit implementation checkpoint

October 1, 2026. Owner-authorized local implementation of
[on-demand phase transportation kits](../../plans/ON-DEMAND-PHASE-KIT-REQUESTS-PLAN.md).

## Implemented

- Quoted and standard placement confirm commercial scope/Sample type without
  requesting kits or choosing a delivery address.
- A phase-aware request dialog chooses one/several phases and an active
  Department address. Received compatible stock is allocated once; only the
  uncovered physical sample requirement creates included fulfillment requests.
- Physical kits and request snapshots identify their phase. Cross-phase/Job
  selection, stock reservation and tube binding remain guarded on the backend.
- Exact source/sample/run pairs finalize independently per phase. The first
  phase authorizes its specimens and shipments; later phases amend the existing
  authorization. Preparation does not start TAT or bypass sequential processing.
- Phase kit orders, tracking and barcode receipt use the saved request modal.
  An unshipped request can be cancelled with an optional reason. Unsaved entries
  use shared confirmation dialogs; contextual commands use shared Actions.
- Whole-Job and cancelled/replaced-phase requests remain visible as history.
  No historical phase attribution is guessed. Customer, Partner and Phaeno help
  and owning plans are updated. PDF code/presentation is outside this task.

## Local verification

Normal API and isolated test assemblies: build succeeds, zero warnings/errors.
Frontend TypeScript and scoped ESLint: pass. Generated help: 56 guides, matching
frontend/backend corpus hash. EF: no pending model changes. Complete ERD:
231 tables, 3,414 fields and 550 relationships. Diff whitespace check: pass.
The refreshed local API returns 200 healthy at `/api/health`; health alone does
not establish Customer/Partner session or operational acceptance.

`20261001205012_AddOnDemandPhaseKitShipping` is applied to the configured
localhost development database. Before/after read-only review confirms
M9DE75F7 retains two phases, one unassigned whole-Job request and no
samples/pairs/selections; NQL359KT retains one phase and no such records. Only
their already-existing paired-preparation mode is carried into the explicit
marker. No historical request, kit, dispatch, receipt or scope is rewritten.

Manual browser evidence uses real Portal components and an offline Axios adapter
with synthetic data. No actual fulfillment request, cancellation or receipt was
written. Acceptance-empty state shows both phases unrequested. A failed bulk
request retains address and both phase selections; retry keeps the same
idempotency key and creates separate phase request objects. Discard opens a
separate confirmation with Keep reviewing initially focused. Closing restores
the request trigger. Phase-specific pending-order cancellation preserves its
reason when returning from discard review. Cancelling phase one leaves phase
two requested; marking phase one received leaves phase two unrequested in the
independent receipt scenario. Keyboard opening shows one Actions indicator.

Light and dark desktop request dialogs were visually inspected. Saved dark
evidence: [synthetic request dialog](../../../output/phase-kit-evidence/request-dark.jpg).
At a 390 × 844 viewport, page width remains 390 and the dialog measures about
340 px wide, from y=36 to y=808, with visible body/footer and initial Cancel
focus. Escape restores the invoking request button. Responsive screenshot
capture timed out, so mobile evidence is DOM/bounds rather than a saved image.
Temporary preview source/server/cache and build helpers are removed after use.

## Remaining acceptance

Automated tests are authored and compiled, not executed, under AGENTS.md's
request-only policy. Connected Customer/Partner authorization and concurrency,
competing received stock, real partial dispatch/barcode receipt, expiry and
replacement, changed/cancelled scope, actual phase preparation/shipment and
scientific/physical processing need separate acceptance. No commit, push,
deployment, production migration or production data operation is included.
