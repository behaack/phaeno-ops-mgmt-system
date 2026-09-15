# Policy history and shipping access UAT — September 15, 2026

**LAB-09's remaining remotely executable policy/history variants now pass. Its only remaining requirement is Step 9's positive independent scientific approval of an eligible controlled output.** Shipping access coverage also advances. Whole-case acceptance remains **33/81 (40.7%); 48 remain**, comprising three primarily remote cases and 45 named-gate cases. No partial check is counted as a new whole-case Pass.

## LAB-09 policy and history crosswalk

| Required variant | Connected result |
| --- | --- |
| Step 1: one- and three-tube specimens | Actual Customer administrator reviewed two coded specimens, with one and three tubes. The review showed two samples/four tubes and explained that reserves do not create extra analyses. Finalization produced one V2 authorization, one Lab work order, one shipment, two items and exactly four tube slots. Both specimens carry the run-one/failure-fallback policy, version 1, in the immutable authorization snapshot. |
| Step 1: older unfinalized order | A separate explicitly synthetic older-order prerequisite began with no recorded policy. Finalize was disabled until the Customer checked the explicit instruction. A direct call omitting confirmation returned 409 `tube_policy_confirmation_required` and left the complete order DTO unchanged. Actual UI confirmation then succeeded. Independent PostgreSQL comparison found the original submission and placement snapshots, complete accepted quote row and request-revision rows unchanged. Sample identities/counts also remained unchanged. |
| Step 1: historical V1 replay | The real internal provider processed a separate V1 command whose serialized payload omitted the newer policy fields. Replaying that command returned the identical acknowledgment and retained one authorization version, one provider receipt, one work-authorized event and two specimens. Policy remained null and the stored authorization snapshot/hash stayed unchanged. Reusing that command ID with added policy fields returned `command_id_conflict`; it did not rewrite history. This is provider/database integration evidence, not a Customer UI observation. |
| Step 12: Completed historical execution | A new, explicitly synthetic Completed legacy execution had no attempt/source link. Actual Supervisor UI displayed its Completed record and explained that historical processing is not assigned a tube retrospectively. Policy adoption was unavailable in the UI; the direct attempt returned 409 `legacy_work_review_required`. Full work, attempt-workspace and execution DTOs stayed identical. PostgreSQL independently confirmed zero attempts, null attempt linkage and the retained Completed record. |

The prior [attempt continuation](2026-09-15-lab-attempt-continuation.md) remains the evidence for unstarted adoption, competing selection/start, policy locks, holds, same-attempt QC repeats, retirement between stages, held/cancelled guards and draft recovery. Its earlier policy/replay and Completed-history remainders are now resolved. Do not rerun its successful business actions.

The new historical prerequisites were staged with audited domain models exclusively in the isolated test database. The older manual-quote order has deliberately fictional acceptance facts; they establish a frozen precondition for confirmation testing, not a new customer purchase acceptance result. The Completed record uses the existing expressly simulated protocol and software values. No physical receipt, real output library, resource use or scientific approval is represented.

## SHP-14 access progress

Actual Clerk sessions completed 13 denied writes and seven distinct denied reads, plus scoped read-only and unavailable-record UI checks:

- **Scoped Customer Member:** can read the shipment and kit-request history. Ordering, receipt, packing, location editing and cancellation all return 403. Administrative actions are absent from the rendered shipping workspace.
- **Unrelated Customer:** shipment, supply and kit-request reads return 404. Order/receipt/packing writes return 403 because this account is a Member; these write results establish its role restriction, not an administrator-level cross-tenant write test. The settled direct-link UI displays Shipment unavailable and no target shipment/address data.
- **Different Department:** an actual Customer administrator's requests explicitly scoped to the existing separate test Department receive 404 for shipment, supply and request reads and for order/receipt/packing writes. The Department is in that administrator's authenticated membership; no role or membership was changed.
- **Non-admin Phaeno Sales:** platform request read, dispatch and cancellation return 403.

Complete authorized readbacks of the retained shipment, kit request and delivery location remain unchanged after all denials. The existing [shipping recovery run](2026-09-15-shipping-recovery-uat.md) already supplies stale location/shipment reviews, order-response loss/retry and duplicate prevention. SHP-14 still needs its other delayed/failing shipping actions and full long-list, keyboard, short-height/theme/reduced-motion crosswalk. It is not closed by this access slice.

## Retained records and next work

- Older-order fixture: `e7267d46-ec69-42c4-bce3-c18e39327042`, **TEST09-LEGACY-0915**; quote `45f8d9bf-fd1f-4c41-b9dd-6606ed2c300d`. Its newly authorized work is `5eb62e2e-d4bc-4936-a573-51b594602a0a`; no shipping preparation or execution was started.
- V1 work: `3ee49497-ad61-426b-b275-8041bc341d00`; authorization `0444649e-7f9f-48db-a783-115185c2e50e`; retained payload hash `b200042ddae81ec5a68785819a336e0823f11c4bab20b1f4bb6759371bdbdab2`.
- Completed legacy work: `70474217-4545-4bb4-b485-2a4e2760c876`; specimen `5c2358db-14ff-4c07-bebd-edfbb6a52dc0`; execution `f5d06362-eb1b-4800-81d0-15655ace9ac7`.
- Preserve the prior InProgress attempt `86393a06-c31b-4692-921c-7127dd728a51` with Completed Stage 1 and Stage 2 unassigned. Preserve the owner's HS5Y7DB7 walkthrough and the shipping recovery records.

Next remotely executable cases remain **SHP-09, SHP-14 and SYS-05**. LAB-09 now waits only for the positive independent scientific-approval evidence shared with LAB-06; negative approval checks and simulated QC are not substitutes.

## Verification and environment

Connected checks and independent database assertions passed. No application defect was found in this slice, and no application source or automated regression test changed. The ignored fixture helper built successfully in a separate output directory after the earlier helper output was found locked. Two failed command-journal writes occurred before provider execution; the journal was prepared through the workspace shell, then the provider check completed. Failed helper processes were stopped. Harness assumptions about an omitted DTO property, foreign Member denial status and a page still loading were corrected against observed responses; settled UI verification passed.

UI remains `https://localhost:3016`, API `https://localhost:7116`, database `127.0.0.1:5436/phaeno_ops_lab06_uat`. The API binary hash remains `4B5929455CCB972970742E47D0525FE1E2965B2CB217E49049F49026362EDB50`. No API restart, deployment, shared migration, Git mutation, role grant or external message. Provider restrictions and inactive retention processing remain unchanged. Browser test contexts are closed.

Ignored evidence under `tmp/uat-closure/`: `lab09-legacy-fixture.json`, `lab09-legacy-connected.json`, `lab09-v1-command.json`, `lab09-v1-replay.json`, `lab09-frozen-before.json`, `lab09-frozen-after.json`, `lab09-policy-readback.sql/.json`, `verify-lab09-policy.cjs`, `lab09-completed-historical.png`, `shipping-access-connected.json`, and `shipping-foreign-denied.png`. Corresponding connected scripts are in `tmp/uat-closure-identities/`; fixture source is in `tmp/uat-resources-fixture/Lab09LegacyFixture.cs`. This crosswalk records the durable result; the controlling ledger retains whole-case totals.

Final verification: all linked paths exist; whitespace checks pass; the ledger independently reconciles to 81 rows (33 Pass, 3 R, 45 B). The settled foreign-Customer screenshot was visually inspected. Saved-state checks confirm one V2 authorization/two specimens/four slots and unchanged frozen snapshots; the shipping journal confirms all 13 writes and seven distinct reads were denied with unchanged histories.
