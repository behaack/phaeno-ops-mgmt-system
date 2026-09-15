# Shipping recovery and long workflows — September 15, 2026

**SHP-14 now passes isolated software acceptance. Whole-case progress is 34/81 (42.0%); 47 remain: two primarily remote cases and 45 named-gate cases.** This closes one complete case, including retained access/stale-review evidence and the new larger connected journey. It does not establish physical, provider or final release acceptance.

## Complete SHP-14 crosswalk

| Required step | Evidence and result |
| --- | --- |
| 1 — Role and tenant/Department scope | The [access run](2026-09-15-policy-history-and-shipping-access-uat.md) proves 13 denied writes, seven distinct denied reads, Member read-only UI, foreign unavailable-record UI and unchanged authorized readbacks. Foreign Member write denials establish role restriction; the separate authorized administrator's other-Department checks establish administrator scope denial. |
| 2 — Stale form | The [shipping recovery run](2026-09-15-shipping-recovery-uat.md) proves saved location and shipment changes while review is open return recoverable conflicts without overwriting history. This meets the case's change-saved-version alternative; access was not revoked again. |
| 3 — Recommendation, order, dispatch, receipt and scan failures/delays | Current recommendation failure retains the chosen location and prevents confirmation; delayed retry shows checking state until usable supply returns. Prior order committed-response loss/retry and second-session conflict prove one logical request. Current dispatch, Customer receipt and tube-save checks each inject a 503 before server execution, verify the persisted DTO is unchanged and retain the draft. Each delayed retry disables conflicting actions/Escape until its single successful response. Refresh confirms two dispatched/received kits and one first tube assignment, followed by 29 distinct remaining assignments. No duplicate request, stock increment, tube assignment or notice. |
| 4 — Keyboard, responsive, themes and recovery | Actual Customer and fulfillment administrator sessions exercise order review, dispatch, receipt, container selection, tube scan, queues and full manifest. Each representative surface passes at 1440×1000, 390×844 and 390×480 in light/dark themes with reduced motion. Keyboard activation, checkbox/option selection, required-field errors, retained dirty drafts, pending-action guards and scan announcements/autofocus pass. An additional unsaved Prepare standard kit draft verifies keyboard size selection, declined dismissal and confirmed discard with the entire stock DTO unchanged. Modal footers stay within the short viewport; lists have no horizontal overflow. Short-height dispatch, receipt and manifest screenshots were visually inspected. |
| 5 — Long groups, samples, kits, requests and manifest | Two groups contain 30 uniquely coded samples, including a long source label. Samples page 10/10/10 and retain the page after refresh; tube pages show 8/8/4 and sibling navigation stays within the Job. Fourteen matching kits page 12/2; 13 matching request histories page 12/1. Opening a record and returning preserves page/filter. The 20-sample manifest now pages 8/8/4; all 20 identities are reachable exactly once, totals stay 20 samples/20 tubes, and the full frozen API packet remains identical before/after navigation. Print-media inspection retains the receiving summary and excludes the full-detail list. |

The older Step 5 phrase “multipage manifest” was reconciled with the owner's already approved September 10 minimal-receiving-sheet decision in the [shipping plan](../../plans/SAMPLE-SHIPPING-AND-INTAKE-PLAN.md#minimal-receiving-insert---september-10-2026). The case now names a long Portal manifest and its receiving sheet. This preserves the long-content requirement without reinstating superseded full-manifest printing. Physical paper output and scanner observations remain their separate gates.

## Two defects fixed and retested

1. **Full manifest was unbounded.** Before the fix, 20 sample barcode blocks rendered together and the short-phone document extended to 14,700 pixels. The Portal now displays eight samples per page with named Previous/Next controls and an announced range. Shipment/revision changes reset the page. Totals, CSV and immutable manifest contents continue to represent the complete container. The focused regression fails before the fix and passes afterward, including revision replacement and print invocation.
2. **Fulfillment queues depended on a denied laboratory dashboard.** An actual configuration administrator could open a request and dispatch its kits but the parent queue failed with “This action requires an assigned Phaeno laboratory role.” Receipt/fulfillment now loads its independently authorized queues without waiting for that unrelated dashboard. Workspace Refresh invalidates the relevant receipt/kit queries. The same unchanged administrator session now completes both populated queues and return navigation. The regression fails before the fix and passes afterward. No backend authorization or account role changed.

Customer shipping and Phaeno receipt guides were updated. React review found no new request waterfall, dependency or effect-driven state synchronization; the manifest page is revision-scoped UI state and existing server query ownership is preserved.

## Saved evidence and bounded setup

The isolated fixture created **TEST14-LARGE-0915**, order `17dfdbe9-04f8-493f-aa80-55df1168ea71`, location `1b5cdb0d-43f8-4d21-ac31-ba10e68407e7`, 30 sample prerequisites, 14 fully registered synthetic kits and 12 explicitly Cancelled request-history prerequisites for paging. The manual accepted quote, products, tube barcodes and dispatch facts are expressly TEST ONLY; no purchase, physical material or actual carrier handoff is asserted. The 12 staged histories are not counted as exercised cancellation journeys.

Supported connected actions created request `68fa5ac7-bc05-4c2f-9be2-80119bec4869`, sent/received its 20- and 10-tube kits, allocated two containers, matched 30 unique permanent tubes and issued one revision per container. Both remain ReadyToShip. The original packing pool is Cancelled through the supported allocation flow.

Independent read-only PostgreSQL assertions confirm:

- One actual Received request and the 12 staged Cancelled histories; exactly three actual workflow events (Created, Dispatched, CustomerReceived).
- Two logical notification rows, processed by the logging-only sender. This proves retained software notice identity, not external delivery.
- Two bound/Customer-received kits, with the other 12 new kits unbound and unreceived.
- Thirty assigned slots with 30 distinct registered tube identities; two unvoided revision-1 packets.
- No invoice and no specimen-shipment dispatch or laboratory receipt from this fixture.

Active container shipments: `809c78b9-7bb2-4fda-84c5-0c65449af5cb` and `72e247a0-06d9-4562-bf80-8ab0b68c93a9`. Retain their history. The owner's HS5Y7DB7 walkthrough and the prior LAB-09 attempt were not targeted. No role/configuration cleanup is needed; no role or runtime setting changed.

## Verification and continuation

Seven focused component tests pass across the manifest and Lab workspace files. TypeScript and scoped ESLint pass. Documentation generation/check passes for 56 guides, corpus hash `d3f992bc70c039ee8c7ae4bc0d292dfe3fd38a3d2791b85c45d72ac0e9761b62`. No broad regression batch was repeated. Current UI source runs at `https://localhost:3016`; API remains `https://localhost:7116` on binary SHA-256 `4B5929455CCB972970742E47D0525FE1E2965B2CB217E49049F49026362EDB50`; database is `127.0.0.1:5436/phaeno_ops_lab06_uat`. Generated help source is current; the already-running API's cached help corpus was not restarted or claimed refreshed. No deployment, shared migration or Git mutation.

Ignored evidence is retained under `tmp/uat-closure/`: `shipping-large-fixture.json`, `shipping-large-order.json`, `shipping-large-dispatch-receipt.json`, `shipping-large-packing-scan.json`, `shipping-large-usability.json`, `shipping-large-draft.json`, `shipping-large-readback.sql/.json`, and `shp14-*.png`. Connected scripts are under `tmp/uat-closure-identities/`; fixture source is `tmp/uat-resources-fixture/ShippingLargeFixture.cs`. All successful writes are journaled; resume from these records without replaying them.

Next remote cases are **SHP-09** (remaining packing/reset variants) and **SYS-05** (remaining representative form/accessibility variants and the invitation-policy discrepancy). LAB-09 still needs only the positive independent scientific approval shared with LAB-06. The 45 named-gate cases remain distinct from these two remote cases.

Final checks: all report links resolve; whitespace check passes; the 81-row ledger independently reconciles to 34 Pass, 2 R and 45 B. The additional discarded preparation draft returns focus to Prepare standard kit and leaves stock unchanged. All browser test contexts are closed.
