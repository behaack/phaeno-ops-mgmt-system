# KIT-02–06 simulated software acceptance — September 15, 2026

## Approved scope and disposition

After the KIT-04 continuation, the Product Owner answered **Yes** to extending the clearly labeled simulated software acceptance approach beyond the earlier seven cases. This batch applies that approval to **KIT-02, KIT-03, KIT-04, KIT-05 and KIT-06**. All five are **Pass (simulated)**. Real-world acceptance remains open below.

The controlling ledger is now **51/81 software cases closed (63.0%): 39 prior passes and 12 simulated passes; 30 cases remain**. This is not final release signoff. No further waiver is inferred for the other ledger rows.

## Case crosswalk

| Case / required steps | Completed software evidence |
| --- | --- |
| KIT-02, 1 | `SimulatedTwoUnitShipmentRejectsEarlyAndExcessWritesAndKeepsIndependentSources` rejects shipment and Lab processing before Commercial acceptance, then accepts the same order. |
| KIT-02, 2–4 | The same test ships two units separately, checks labeled-expiration + 90 days and shipment + 12 months, rejects over-shipment without another shipment/invoice, and replays the original shipment without duplication. Distinct shipment and billing references remain on the two cases. Existing three-unit split-shipment coverage also passes. |
| KIT-02, 5 | External readback shows all units shipped with `KitFulfilledAssemblyPending` and two independent unused cases. Actual Portal screens render the simulated order and both cases on desktop/mobile. |
| KIT-03, 1–2 | `SimulatedSubstitutionRequiresEligiblePartnerApprovalAndRetainsBothDecisions` proposes a different catalog product with a +25 price effect. Original line facts remain before consent. An ordinary member is denied without changing the proposal; a Department admin declines; a subsequent proposal is approved by an Organization admin. Both decisions remain, and shipment billing uses the approved 125 price with the purchased Assembly profile intact. |
| KIT-03, 3 | `ReplacementRetainsInputHistoryAndIncludedReleaseUsesKitBalanceWithoutSecondInvoice` retains original and replacement Kit unit IDs in successive input revisions, the same case/request and original billing reference, and no second Assembly invoice. Domain coverage rejects replacement across tenants or after release. |
| KIT-03, 4–5 | Extension persists once across replay; stale and external-user extension requests fail. Cancelling an unused case preserves purchase/invoice history. Existing explicit lifecycle processing expires an unused draft once and preserves its request; the KIT-04 expired-input check denies editing/submission. The worker is invoked only inside the disposable test database, without enabling the running service. |
| KIT-04, 1–5 | The [input continuation](2026-09-15-kit-input-continuation.md) supplies frozen scope, draft/file identities, interrupted-upload cleanup/replay, limits, metadata/confirmation, every non-clean scan state, deadline and immutable-revision checks. The new actual-route browser run uploads two simulated inputs, interrupts the second, shows the saved-draft recovery link, retries only the remaining file with its original key, then submits both once. |
| KIT-05, 1–2 | `SimulatedCorrectedKitOutputRetainsInputLineageAndCreditsMemberBytesUnderOriginalInvoice` requests a named-file/reference correction, rejects stale removal, withdraws the original input using its current version, and submits a replacement revision. Original bytes/manifest remain; processing uses the second revision, without another quote. |
| KIT-05, 3–4 | Simulated clean output approval creates a checksummed manifest tied to that revision and stays payment-held. A download is denied. A simulated payment against the original Kit shipment invoice plus explicit test lifecycle processing releases the output; no second Assembly invoice is created. Existing separate Assembly-credit release coverage also passes. |
| KIT-05, 5–6 | Existing paid-output tests keep operational hold/pending cancellation ahead of financial eligibility. The new correction test downloads both a file and ZIP as an ordinary Department member, verifies exact bytes and completion credit, and denies wrong Partner/Department requests. Prior DAT-04 transfer-failure evidence remains supporting coverage. |
| KIT-06, 1–2 | Releasing the first corrected case leaves the sibling awaiting submission and the parent pending. Supported cancellation of the unused sibling completes the parent without modifying the released manifest. A separate two-unused-case test independently confirms aggregation and unchanged original invoice value. |
| KIT-06, 3–5 | A simulated historical standalone Assembly request retains its issued 330 quote, quote-acceptance capability and original output terms without an invented Kit link; a historical non-bundle reagent order stays non-bundle. New standalone creation is denied. Existing component navigation directs preparation to purchased cases. Repeat-draft creation uses the current 140 price, omits the old PO, creates no units/cases, replays to one draft, and rejects unavailable prior offerings while preserving the original placement snapshot. |

## Verification and changes

- **19 distinct backend checks passed, no failures or skips:** 13 PostgreSQL Kit checks and six domain checks. `tmp/kit-input-results/kit-batch-final.trx` records the full run. The substitution check was then strengthened to use a different catalog product and passed again in `kit-substitution-final.trx`; it is not counted twice.
- **20 component checks passed**, no skips: BundledOrders and ExternalOrderDecisionDialogs.
- Actual signed-in Portal routes with intercepted, visibly simulated data passed at **1440/light and 390/dark**: order/case display, frozen input controls, interrupted upload, recovery and successful submission. The recovery screens have zero automated WCAG violations. All simulated writes terminate in the browser response handler; none reaches the API.
- Scoped ESLint and TypeScript passed. Final whitespace and linked-path checks passed.

Four new PostgreSQL checks were added in this batch. The shared Kit fixture now supplies the real download-attempt service for controller response execution and supports a separate member identity. All fixtures create uniquely named disposable databases from the known loopback UAT source, migrate only those databases, and remove them afterward. Storage/scanner/payment/scientific/physical facts remain simulated and labeled.

Visual review found fulfillment column labels and prices splitting across lines. The existing table now keeps those values together, constrains its parent on narrow screens, and provides a named, visibly focusable region for keyboard scrolling. Desktop/mobile verification covers the correction. The Partner guide remains accurate: actions and business meaning are unchanged.

Initial test failures were fixture assumptions: a status denial uses the existing domain error code; platform order responses omit the external placement snapshot; submitted input versions must be refreshed before removal; and current substitution authority includes Department admins. These were corrected and rechecked, without changing authorization or scientific/commercial behavior. The initial table adjustment also exposed narrow-layout overflow; its containing grid item is now constrained, and final browser verification passes.

## Documentation reconciliation

The older Order Management plan said only Organization administrators approve reagent substitutions. Current code and the Partner reagent guide permit Organization **or Department** administrators, while a new Kit purchase still requires an Organization administrator. This batch records the current behavior and tests ordinary-member denial plus both eligible decision roles. No authentication/permission change was made.

## Retained real-world gates and cleanup

These five software passes do not attest to actual products/lots, custody, shipment, replacement, labels, approved scientific input/output, independent scientific review, payment-provider records, external storage/scanner operation or actual recipient delivery. KIT-06 historical records here are arranged historical fixtures, not a live legacy-data migration check. Those original operational/provider acceptance steps remain open.

Final inspection found no `pseq_kit_test_*` databases left. The original KIT-01 purchase and SYS-05 input fixture were not modified. No shared migration, real message, background-worker activation, commit, push or deployment occurred. Existing running API records were not promoted or replaced.

Local evidence: `tmp/kit-input-results/kit-batch-final.trx`, `kit-substitution-final.trx`, and `tmp/uat-closure/kit-batch-simulated-ui.json`; screenshots are `kit-batch-order-*`, `kit-batch-recovery-*` and `kit-batch-submitted-*` for widths 1440 and 390. The live browser runner is `tmp/uat-closure-identities/kit-batch-simulated-ui.mjs`.
