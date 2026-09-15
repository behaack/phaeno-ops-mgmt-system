# Shipping ordering and recovery acceptance — September 15, 2026

**SHP-03 and SHP-04 Pass for isolated software acceptance. Overall: 31/81 (38.3%); 50 remain (6 primarily remote, 44 named-gate cases).** Every required step and variant below has connected evidence. This follows the [ten-case batch](2026-09-14-ten-case-execution.md); its 29 closures are preserved.

## Baseline and evidence boundaries

Actual Clerk-authenticated C-ADMIN, C-DEPT and P-ADMIN sessions used the existing Portal at `https://localhost:3016`, API at `https://localhost:7116`, and PostgreSQL `127.0.0.1:5436/phaeno_ops_lab06_uat`. Source HEAD remains `6208b7f459a0da10d1c359d1221616df5db11080` with the preceding batch's local changes. API remains the shipping build, SHA-256 `4B5929455CCB972970742E47D0525FE1E2965B2CB217E49049F49026362EDB50`; DerivedReadiness remains enabled. No application source, deployment, Git state, authentication grants or schema changed in this slice.

The user's continuing testing request and existing approval cover bounded TEST ONLY setup. Two new Jobs were genuinely created, priced, accepted and finalized through supported scoped APIs. The main Job contains two coded specimens, nine tubes each. A temporary existing test offering, new time-bounded Customer/Research entitlement and test order defaults supplied missing purchase prerequisites; all were restored after setup. No scientific definition or original walkthrough was altered.

Four explicitly synthetic stock records supply received, in-transit, wrong-location and ready-to-dispatch preconditions. These are not observations of physical materials or shipment. Each has 20 unique TEST-prefixed tube identities and conspicuous synthetic product facts. The later supported dispatch and preparation calls exercise software only. They do not close SHP-06/07/08 or any physical/provider gate. Source-state preparation and exact fixture identities are retained in the ignored run journals.

## Complete step crosswalk

| Case / step | Connected observation and saved-state proof |
| --- | --- |
| SHP-03 / 1 | No-stock location offers ordering; received unused stock at A belongs to the other accepted Job and covers all 18 tubes without a new request. Actual UI disables redundant ordering and enables Adjust containers. B's in-transit kit contributes no available capacity. C's received kit is excluded from A's inventory; a direct attempt to claim it for A returns the scoped 404 and leaves the shipment unchanged. Location setup recovery is retained from the complete SHP-02 run. |
| SHP-03 / 2 | At B, review shows exactly one TRANS-20 for 18 tubes with two spare slots, the selected frozen address, and included kits/outbound delivery with no additional charge. No fee or payment action appears. |
| SHP-03 / 3 | Keep reviewing closes without creating a request. Reopening and confirming saves one request. While the committed response is delayed, ordering, dismissal and the setup link are protected; Escape cannot close the saving dialog. Only the successful response is dropped. Error feedback retains the selection; deliberate retry recovers that exact request. |
| SHP-03 / 4 | Refresh displays Kits ordered and the same request. Complete main Job DTO and shipment DTO equal their before-order snapshots, preserving both specimens, 18 tube rows, accepted 220 USD quote, scientific authorization and owning scope. Independent database readback has one accepted quote per new Job and zero invoices. The ordered desktop workspace was visually inspected. |
| SHP-04 / 1 | A separately signed-in Department administrator opens the same review before the first save; after the committed-loss recovery, its confirmation returns the same request ID. Different new details return 409. Independent readback shows exactly one Created event and one logical requested notice for that first order. |
| SHP-04 / 2, address | On the cancelled-request fixture, one session opens an unsubmitted review and the Department administrator edits the selected location. Submission with the reviewed old address version returns 409; selected location remains and no new request appears. Keep reviewing, refresh and reopen show the changed instructions. Deliberate new confirmation saves the current version and frozen address. |
| SHP-04 / 2, shipment | On the separate origin Job, a second session confirms an eligible received container while the first has a kit-order review open. The old shipment-version submission returns 409, retaining its review. Reopening shows the current preparation; zero kit requests exist for that Job. Accepted quotes and sample records remain equal. |
| SHP-04 / 3 | Dismissing Cancel kit order leaves the first request Pending. Confirming with a test reason retains Cancelled history and allows a subsequent eligible order. Complete main Job/sample DTO is unchanged. The second request has its own intentional identity; it is not a retry duplicate. |
| SHP-04 / 4 | Open a cancellation dialog while the second request is pending. P-ADMIN records the explicitly simulated dispatch of the separate synthetic ready kit. Stale cancellation returns 409. Refresh removes the cancellation action; another call using the fresh version also returns 409 specifically because dispatch exists. Request, dispatch facts and main Job remain unchanged after denial. |

## Retained identities and continuation point

- Main Job **2C4M9TFX**, `9b7965c2-04c0-47ec-b912-0de54c10b0ca`: two specimens, 18 tubes; still awaiting physical samples. Original software request `22331762-1fad-471b-809c-c631e52a47f8` is Cancelled. Deliberate replacement `b2af89b7-95c6-4ed5-983d-75e670c67dfc` is Dispatched with simulated tracking; no Customer receipt is recorded for its kit.
- Separate origin Job **35JNLQF4**, `a8ea34bf-a295-4bea-befa-9c49d480ee57`: two specimens/two tubes; one synthetic received container reserved to prepared shipment `65c64628-ebf1-4dde-8186-9d858636d6c8`. No tube is scanned or bound. Zero transportation-kit requests were created by its stale order review. Preserve this state for future preparation/reset variants.
- Three new TEST ONLY SEP15 locations retain test inventory history. B's temporary instructions were restored; the second request's frozen reviewed address remains unchanged. Existing Customer Research default/location, the two original Received requests, and the earlier XJ2AA49M Job compare exactly to their captured baseline.

Do not repeat acceptance, finalization, dispatch or reservation to resume. The original HS5Y7DB7 and subsequent walkthrough remain untouched.

## Verification and cleanup

Independent PostgreSQL assertions at 2026-09-15T10:40Z confirm two deliberately created request histories (Cancelled and Dispatched), one Created event and one requested notice each, one dispatch notice, zero origin requests, two accepted 220 USD quotes, zero invoices, four new synthetic kits, one reservation and zero bound kits. These supplement actual UI recovery; disabled controls alone are not the duplicate-prevention evidence.

Notification rows say Sent because this isolated API uses `LoggingOrderNotificationSender`. Runtime logs explicitly say the notices **would be sent**. There is no Mailgun/provider/inbox delivery proof and no external message was sent. SHP-05 remains open.

The test offering is inactive again, the temporary entitlement is ended, and all original system defaults are restored exactly. Restoration uses the existing bounded fixture cleanup for the legacy empty JSON defaults, which the current API would not accept as new operational configuration. Semantic JSON comparison and expected version prevent overwriting unrelated changes. No roles were added. Test histories and stock remain intentionally retained.

No new application defect was found in these two cases. Setup initially encountered the correct missing-readiness denial, then completed after the approved prerequisite was supplied. Harness assumptions about a nested configuration response and the wrong-location response status were corrected against actual responses; no product behavior was weakened. Focused connected scripts and independent saved-state assertions passed. No broad application regression suite was repeated.

Exact supporting journals/scripts: `tmp/uat-closure/shipping-recovery-baseline.json`, `shipping-recovery-setup.json`, `shipping-recovery-stock-fixture.json`, `shipping-recovery-connected.json`, `shipping-cancellation-connected.json`, `shipping-recovery-cleanup.json`, `shipping-recovery-readback.sql/.json`, `shipping-recovery-verified.json`, `verify-shipping-recovery.mjs`; connected scripts are under `tmp/uat-closure-identities/`. These ignored artifacts preserve requests, actors, statuses, versions and complete before/after records. This durable crosswalk is the case-closure record.
