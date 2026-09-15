# Alternate packing and whole-order reset UAT — September 15, 2026

**SHP-09 passes complete isolated software acceptance. Whole-case progress is 35/81 (43.2%); 46 remain: SYS-05 is the one primarily remote case, and 45 cases retain named dependencies.** The case includes all ten primary steps and all five reset steps below. No application defect was found in this slice. No physical packaging, scanner, carrier delivery or scientific acceptance is inferred from the controlled fixtures.

## Main SHP-09 crosswalk

| Step | Connected result |
| --- | --- |
| 1 — Available sizes and exact containers | Actual Customer UI recommends 20+10 for 30 tubes and one 20 for 18. The 18-tube plan retains two spare slots. Container rows show size, SKU, capacity, allocation and barcode. Draft entry does not reserve stock. Exact barcode confirmation is exercised for the 18-tube, partial-supply and competing-Job variants; the prior [30-tube run](2026-09-15-shipping-large-recovery-uat.md) supplies its exact 20+10 confirmation. |
| 2 — Alternate 30-tube plans | Starting from 10+5, Add container chooses 10 then 5. A redundant 20 is excluded; after capacity is covered Add is disabled. Separately, six 5s are built. Edited counts of 7 and 8 survive removal of a different row. Desktop, phone and short-height layouts retain one row per container and reachable modal actions in both themes/reduced motion. |
| 3 — Small remainder and unavoidable spare | For 18, 10+5 offers a final 5 with three tubes. For 30 with only two received 20s, the UI accepts the unavoidable ten spare slots and assigns 20/10. It does not offer an extra redundant container. |
| 4 — Recommendation and delayed preview | Use recommendation explicitly replaces custom rows/counts with 20+10. During a delayed preview, further size changes are allowed, one Summary stays in place with Updating, and confirmation is disabled. After release, the current 10+5 selection is retained and the current preview governs confirmation. No manual availability field appears. |
| 5 — Validation and recorded supply | Actual UI rejects fractional, negative, over-capacity and incorrect totals while preserving the complete shipment family. An unavailable barcode gives a specific availability/receipt/assignment error. Direct API calls independently reject fractional, negative, over-capacity and an invalid zero-row allocation with 400, and reject spoofed stock availability with 409; all leave the family unchanged and create no empty shipment. Partial stock prepares ten tubes and leaves an explicit 20-tube pool. |
| 6 — More supply and additional order | Refresh and sibling navigation retain the initial ten-tube container. With a staged completed request in history and uncovered tubes, the actual Customer orders one additional kit. Pending then suppresses another request. Actual authenticated dispatch/receipt of the new TEST ONLY kit enables preparation of the remaining 20. The first container ID/crosswalk remains identical; two active containers contain 30 distinct original slots and no residual pool remains. |
| 7 — Sibling/pool navigation and scan guards | The partial plan switches between its physical container and residual pool. An unsaved scan prompts: decline retains the barcode and route; accepted discard permits switching and restores reset eligibility. While a save is delayed, attempted switching stays on the current container and reset/save actions remain blocked. After saving, the plan is permanently locked. Active selectors exclude retired siblings/empty pools; the explicitly opened retired record is labelled history. |
| 8 — Location, cancelled origin, Member and refresh error | Received stock with an explicitly staged Cancelled originating Job remains usable for a different active Job. Four received kits and one in-transit kit show partial availability; the in-transit kit is excluded from preparation until actual location receipt. A Member reads location/history and sees no receipt/packing action. Controlled background inventory failures preserve a checked receipt draft and a scanned packing choice while disabling confirmation. Recovery enables each supported save. The 18-tube container is Assigned to the active Job while retaining its cancelled origin reference. |
| 9 — Competing cross-Job reservation | Two actual Customer sessions open different five-tube Jobs and scan the same received container. Both submit against the reviewed stock version. Exactly one returns 200 and one 409. The losing dialog keeps its barcode and explains changed availability. Independent readback shows one physical container reserved to the winning Job; it is not counted again for the other Job. |
| 10 — Current and retired entry points | A reset's retired container URL displays Retired container configuration, explains the retained history and offers Open current preparation. That action reaches the new pool. Following Back to lab job from the old URL opens the owning Job with current preparation selected, without presenting the Job itself as cancelled. |

## Whole-order reset crosswalk

| Step | Connected result |
| --- | --- |
| 1 — Review and dismiss | Actual Customer reviews two selected containers and 20 tubes. Keep containers dismisses without changing the prepared plan; the later reviewed/readback versions and slots agree. |
| 2 — Successful reset, inventory and grouped residual | After a controlled failure, one delayed successful UI reset returns all 20 original slots to a pool, releases both reservations and retains old container identities as Cancelled history. The full order DTO is identical before/after. A separate historical grouped fixture starts with two physical containers plus a residual pool, a distinct destination and distinct historical handling type. A successful reset keeps three separate ten-tube pools across two destinations, conserves every original slot and releases its two reservations. |
| 3 — Every sibling/history lock | Six separate controlled families stage ReturnKit registration, bound physical stock, an issued packet, dispatch, receipt and an immutable prior scan whose current fields are cleared. For every family, both physical sibling entry points return cannot-reset; actual UI explains the lock and disables reset; both direct writes return 409. All family DTOs remain identical. Separately, a real saved scan locks both siblings, and a Member cannot bypass it (403). These staged milestone fixtures prove software guards, not physical events. |
| 4 — Stale/concurrent/failure protection | A second session saves a real tube assignment while the first session holds a reset review. Its save returns 409 and refreshes the review to a disabled permanent lock. A retired reset review also returns 409. Two concurrent resets of the grouped family produce one 200 and one 409, with no partial merge, duplicate slots or lost pools. A pre-server 503 retains the reset review; a delayed valid retry disables duplicate submission, dismissal and Escape until completion. |
| 5 — Unsaved and pending scans | Entering a never-saved barcode disables reset. Declined navigation retains it; accepted discard restores eligibility. During the delayed save, reset stays disabled and attempted sibling navigation is blocked. After one saved assignment it remains disabled. The separate cleared-history variant proves clearing current fields cannot erase the guard. |

## Fixture and evidence boundaries

The isolated setup contains 15 authorized TEST ONLY Jobs with **248 physical tube slots**, plus one staged Cancelled origin without samples. There are **37 synthetic registered stock kits**. Accepted quotes, received stock and historical milestone prerequisites are expressly simulated; they do not establish customer purchase, biological material, carrier handoff, physical receipt or scientific results.

The grouped reset fixture deliberately uses an existing separate test destination and one newly created **inactive historical sample type**, `TEST09_RESET_GROUP`, confined to that fixture. Existing configuration is unchanged. It exercises safe separation when historical handling does not resolve to today's active catalog; the returned pool is not approved for new packing without a valid configuration. No authorization or original sample roster was rewritten by the reset.

The negative packet/dispatch/receipt histories use explicitly synthetic metadata and stay in isolated test records. They are not eligible evidence for positive custody, packet accuracy or scientific approval. The cleared-history fixture retains its staged assignment/clear events. The real scan-versus-reset fixture retains its one saved assignment. Successful business actions are journaled and must not be replayed on continuation.

A completed request for the initial partial-supply kit and the Cancelled origin were staged prerequisites. Actual supported operations then created one additional request, dispatched/received its extra kit, completed the residual plan and acknowledged one separate location arrival. The two request rows finish Received. Only the new actual request generates the **two logical notice rows**, handled by the existing logging-only sender; no external message was sent.

## Independent conservation checks

Read-only PostgreSQL verifies all 15 authorized Jobs retain their exact expected slot counts, with **248 distinct slots and no duplicate identities**, 37 stock records, two Received request records, two logical notices and zero invoices. Reset and grouped-reset families hold no remaining reservations. Competing reservation/reset outcomes reconcile to one winner each. Three assignment-history rows comprise the one real saved scan and two explicitly staged historical events.

Fresh authenticated order readbacks independently compare all 15 Jobs against their setup baselines: samples, quotes, source groups, request revisions, requested counts, finalization timestamps and tube-use policy are unchanged. The first partial shipment's identity and full crosswalk are unchanged after completing the residual pool. All denial families retain complete before/after equality.

The owner's HS5Y7DB7 walkthrough and the prior independent-review attempt were not targeted. Retain these new fixture histories and remaining unused stock for evidence; no temporary role or runtime configuration needs restoration. Browser contexts are closed.

## Verification, artifacts and continuation

The fixture helper builds with zero warnings/errors. Connected checks and independent saved-record assertions pass. No application source or automated regression suite changed, so no application build or broad test suite was repeated. The short-height six-container and reset layouts were inspected; modal actions remain reachable. Background-failure checks use a controlled browser visibility transition to trigger a real query refresh, with actual API responses interrupted and recovered.

Local UI: `https://localhost:3016`; API: `https://localhost:7116`; database: `127.0.0.1:5436/phaeno_ops_lab06_uat`. HEAD remains `6208b7f459a0da10d1c359d1221616df5db11080` plus retained local changes. API binary SHA-256 remains `4B5929455CCB972970742E47D0525FE1E2965B2CB217E49049F49026362EDB50`. No API restart, deployment, shared migration, Git mutation or account-role change.

Ignored evidence under `tmp/uat-closure/`:

- `shipping-packing-fixture.json`, `shipping-packing-setup.json`, `shipping-packing-choices.json`, `shipping-packing-invalid.json`.
- `shipping-packing-reset.json`, `shipping-packing-race.json`, `shipping-reset-scan-race.json`, `shipping-reset-job-entry.json`.
- `shipping-packing-supplement.json`, `shipping-partial-supply.json`, `shipping-origin-inventory.json`.
- `shipping-packing-negative-fixture.json`, `shipping-packing-negative-setup.json`, `shipping-reset-negative-prepared.json`, `shipping-reset-states.json`, `shipping-reset-negative-checks.json`.
- `shipping-packing-frozen-check.json`, `shipping-packing-readback.sql/.json`, `shipping-packing-readback-verification.json`, and `shp09-*.png`.

Corresponding connected scripts are under `tmp/uat-closure-identities/`; fixture helpers are under `tmp/uat-resources-fixture/`. Harness-only corrections addressed required fixture source-group counts, the command idempotency header, current labels, navigation settling and the background-refetch trigger. No failed helper precondition committed a partial fixture; recorded successful actions were resumed without duplication.

Next: **SYS-05**, the last primarily remote case, covering remaining representative forms/tablet/zoom/status checks and the invitation submit-policy discrepancy. Forty-five cases retain their named implementation, provider, physical, scientific or release dependencies; SHP-09 closure does not waive them.

Final verification: ten connected evidence journals report complete; report links resolve; whitespace checks pass. The dismissed reset's prepared DTOs compare exactly with the subsequent pre-reset readback. The ledger independently reconciles to 81 cases: 35 Pass, 1 R and 45 B.
