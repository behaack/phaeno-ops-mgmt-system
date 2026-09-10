# 11 — Transportation kits and sample shipping

**September 9 revised workflow:** these scripts cover
[Customer location inventory and container barcode assignment](../plans/TRANSPORTATION-KIT-LOCATION-INVENTORY-PLAN.md).
They supersede earlier same-Job stock restrictions. Revision of a script does
not mark it Pass; record implementation and execution evidence separately.

Use [shared prerequisites](TEST-DATA.md) and record each case in the
[run record](RUN-RECORD.md). These 14 manual cases start **Not run**. Historical
component, browser and PostgreSQL checks are supporting evidence, not a result
for a connected run of these scripts.

The primary users are the Customer organization/Department administrator,
Phaeno fulfillment administrator and laboratory receiving operator. The
workflow must provide kits without an additional charge, retain their delivery
and tube identities. Fulfillment supplies the Customer/Department delivery
location. Customer receipt makes unused stock available there; preparation
assigns the exact scanned physical container to a Job and shipment. An originating
Job reference is provenance, not a restriction on use. Partial receipt permits
only acknowledged stock. Unreceived, wrong-location/owner or already-used stock
cannot be claimed. Trial and Partner supply workflows retain their existing rules.

## Resume the current local walkthrough

**September 9 resume: SHP-09 container barcode assignment**, after the revised
implementation passes its focused checks. The
[local run](runs/2026-09-08-hs5y7db7-local-walkthrough.md)
records Job **HS5Y7DB7**, Request **D20018AA**, **Received: 1 sent, 1 received**,
and one unbound TRANS-20 with 20 registered synthetic tube barcodes. Original
dispatch and tube identities are preserved. Do not repeat ordering, registration,
dispatch, reconciliation or receipt. The active pool contains all 18 tubes.

Verify location stock, scan the physical container barcode and review its
assignment, then continue SHP-09–11 scanning and packets. Complete desired
pre-scan reset checks before the first successful scan. Alternate-size and
split-shipment fixtures remain separate; full SHP-09 and its variants are not
complete. The run's test products/barcodes and simulated receipt are local
acceptance data, not production inventory or physical delivery evidence.

The earlier September 8 implementation checkpoint for **HS5Y7DB7** has nine finalized samples, 18 tubes
and accepted quote revision 1 at USD900 pre-tax. The approved TRANS-20/10/05
definitions have active revision 2. The 18-tube recommendation is one TRANS-20,
with two spare slots. No Customer delivery location, kit request or physical
stock was created by the implementation verification.

For a new independent fixture, start with **SHP-02/03** and continue through
fulfillment and receipt. The existing HS5Y7DB7 run resumes at **SHP-09**, then
SHP-10–13. Preserve its existing Job and sample list.
Run cancellation, alternate-size, split-container and failure variants on
separate fixtures; do not reopen the finalized list to manufacture those states.
Confirm the checkpoint still matches before resuming, and record any later
user changes. Supplier details and physical kit qualification must be supplied
by Phaeno, not inferred from the three catalog sizes.

## SHP-01 — Container sizes and compatible recommendations

**Setup:** P-ADMIN; approved test receiving/sample/handling definitions; TRANS-20,
TRANS-10 and TRANS-05, plus a separate draft/incompatible revision fixture.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open Order configuration → Sample shipping → Container sizes; inspect each size. | Common name, immutable SKU, capacity 20/10/5, effective revision and compatibility are visible. Configuration is separate from physical stock. |
| 2 | Preview 18 and 30 tubes against the approved handling rule. | 18 recommends one 20-tube kit with two spare slots; 30 recommends one 20 plus one 10 with no spare slots. |
| 3 | On separate draft variants test missing name, duplicate SKU, zero/fractional capacity and an incompatible rule. | Invalid setup cannot be saved/activated for ordinary use; draft preview is distinguishable from an effective packing recommendation. |
| 4 | Revise/deactivate a disposable size and review an existing prepared shipment. | Future eligibility changes; frozen existing container facts and original catalog revision remain retained. |

**Handoff:** Record exact definition/rule revisions for SHP-03/06/09. A catalog
pass does not qualify physical packing materials.

## SHP-02 — Customer and Department delivery locations

**Setup:** C-ADMIN, C-DEPT and P-ADMIN; no-location, one-default and multiple-location
variants for the selected Department; separate Customer and Department fixtures.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | From the shipment use Add a delivery location; also locate delivery locations in the Customer/Department workspace. | The destination belongs to the selected Customer and Department. Phaeno's inbound laboratory destination is not substituted. |
| 2 | Add the real test delivery address, exercising required-field errors, then save. | Errors identify the field; valid save opens the view-first location detail. Required legend, default selection and address are clear. The **Delivery address** card spans the available content width; authorized location actions stay in the page header. |
| 3 | Use Return to shipment. Repeat with multiple locations and no default. | Kit-order confirmation reopens without submitting. A saved default is selected; otherwise explicit location selection is required. |
| 4 | In the page header, choose **Actions → Edit location** and change the default; use **Actions → Deactivate location** on a separate location. Test stale edits from another tab. | Editing opens a bounded modal from the page-header menu; the menu and full-width address card remain usable on desktop and phone. One active default remains; stale writes fail without silently replacing saved data. Inactive addresses stay in history and leave new-order choices. |
| 5 | Attempt other-Customer/Department access and member writes. | No unauthorized location data or mutation. Phaeno administration and Customer/Department management retain their intended scope. |

**Handoff:** Record location ID/version/default and owning Department. Retain a
second location for isolation checks; do not copy address details into public evidence.

## SHP-03 — Included-cost kit order and confirmation

**Setup:** Finalized accepted LAB-SHIP-18, C-ADMIN or C-DEPT, approved location and
compatible catalog; no open request. Include separate no-stock, received unused
stock from another Job, in-transit and wrong-location stock variants.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open Choose containers and select a departure location. Repeat with no stock, unused received stock originally requested for another Job, and wrong-location stock. | Shortage offers Order transportation kits and location recovery. Eligible received stock covers demand without another Job-specific order. Wrong-location stock cannot be claimed; no manual inventory bypass is offered. |
| 2 | Select Order transportation kits. Review the recommended quantity/SKU and delivery address. | One TRANS-20 covers 18 tubes. Kits and outbound delivery are included, with no extra quote, invoice, fee or payment action. |
| 3 | Select Keep reviewing; reopen, choose a different valid location if needed, then Confirm kit order. | Cancel leaves no request. Confirmation creates one Job-linked request with the reviewed quantities and address. |
| 4 | Refresh and reopen from the Job. | Kits ordered persists. The same request is visible; the accepted price, sample count, tube roster and scientific authorization are unchanged. |

**Handoff:** Record request ID/version, frozen location/version and line revisions.
Continue SHP-05. Confirm only in the designated test environment.

## SHP-04 — Duplicate prevention, stale review and cancellation

**Setup:** Separate pending request and unsubmitted Job variants; controlled
delayed/lost responses supplied by engineering; C-ADMIN and C-DEPT sessions.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Confirm the same kit order twice after a delayed response; repeat from another tab or sibling shipment. | One open request for the Job and one fulfillment notice. Reopening returns the saved request; conflicting new details require review. |
| 2 | Change the saved location or shipment version while another confirmation is open, then submit the stale review. | Conflicting facts are rejected; refreshing/reviewing current facts is required. No partial or duplicate request is saved. |
| 3 | Cancel a pending disposable request, first dismissing the confirmation and then confirming. | Dismiss leaves it pending; confirmed cancellation is retained and permits a subsequent eligible order. Job and sample list remain open. |
| 4 | Attempt cancellation after any kit has been dispatched. | This cancellation action is unavailable/rejected; dispatched stock and delivery history are preserved. |

**Handoff:** Retain cancellation and replay evidence. Do not cancel the main
walkthrough request or assume cancellation of kit supply cancels laboratory work.

## SHP-05 — Fulfillment notification and request queue

**Setup:** SHP-03 pending request; P-ADMIN acting as fulfillment operator;
approved sender/test inbox and notification processing configured by its owner.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Inspect the new request's notification, then the configured fulfillment inbox. | Initial routing is to Phaeno administrators. Record queued, provider-accepted and inbox-received evidence separately; retrying SHP-04 creates no second logical notice. |
| 2 | Open Lab operations → Receipt & accession → Kit requests. | Pending request is discoverable by Job/Customer, with correct status and kit quantities. |
| 3 | Search/filter/page the queue, including a prepared large-list fixture, then open the request and return. | No record is silently lost after the first page; list context survives. The dedicated detail shows frozen delivery facts and outstanding quantities. |
| 4 | Attempt access as an ordinary Customer or Phaeno identity without the required authority. | Staff fulfillment data/actions remain restricted; no cross-Customer disclosure. |

**Handoff:** Record receipt evidence and request link for SHP-07. Missing sender
or inbox evidence blocks the delivery assertion, not the separate queue inspection.

## SHP-06 — Prepare and register physical stock at Phaeno

**Setup:** P-ADMIN; Phaeno-approved tube/shipper supplier, product and lot facts;
unused permanent barcodes. Do not invent product facts to make a kit ready.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Under Standard kits select Prepare standard kit, choose an approved size and enter its actual test materials. | A physical kit with its own identity is created at Phaeno; it is not already customer inventory. |
| 2 | Register permanent tube barcodes until the selected capacity is complete; inspect the Customer request again. | A TRANS-20 requires 20 registered tubes even when the intended sample shipment contains only 18. Registration makes physical stock ready but does not dispatch it: the request remains Pending with zero dispatched until Fulfill request is completed. |
| 3 | Exercise duplicate, already-used, excess and missing-tube variants. | Invalid registration cannot make incomplete or conflicting stock eligible for fulfillment. Valid saved registration survives refresh. |
| 4 | Open the pending request's Fulfill request dialog; repeat after an ordinary catalog revision. | Fully registered compatible physical stock is offered without stranding preserved revisions solely because an ID changed. A withdrawn incompatible kit remains blocked. A shortage is explicit. |
| 5 | Open Record dispatch from a stock kit. Review the request and frozen address; compare its resulting state with request-based fulfillment. | Customer dispatch targets the request/location, not a selected sample shipment. Both entries update stock and request once. Trial/Partner legacy supply stays separate. |
| 6 | Print the physical container barcode and scan it in a read-only preparation preview. | The unique permanent kit number and barcode identify that physical container; no Job assignment exists until preparation confirmation. |

**Handoff:** Record physical kit IDs, SKU/revision and barcode roster for SHP-07.
Use Fulfill request for the Customer order, or the kit's Record dispatch action
with the reviewed request/location. Either entry retains delivery provenance.

## SHP-07 — Dispatch and provisional customer inventory

**Setup:** Main one-kit request and separate LAB-SHIP-30 request for one TRANS-20
plus one TRANS-10; ready matching stock; P-ADMIN; controlled dispatch evidence.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open Fulfill request, review the frozen address, select kits, enter observed carrier/tracking/dispatch time and select Record dispatch. | Required fields and requested quantity caps apply. Each dispatched kit belongs to the destination location; the request/Job remains provenance, with no consuming Job or sample-shipment assignment. |
| 2 | For the 30-tube variant dispatch only TRANS-20. | Staff state is Partially dispatched; one TRANS-10 is still owed. Customer sees the sent kit On the way. |
| 3 | Refresh both sessions and attempt sample preparation with that unacknowledged kit. | Dispatch increases provisional supply only; no usable capacity, scan, packet or shipment bypass is granted. |
| 4 | Retry dispatch and attempt a wrong-size/already-sent kit; change the saved address separately and reopen the request. | No double dispatch, reassignment or excess fulfillment; the original confirmed delivery address remains frozen. |
| 5 | On separate fixtures, dispatch a registered kit from its detail page; then use Update kit request for an older already-sent kit whose matching request is still pending. Review, cancel, reopen and confirm its original dispatch facts. | Both entry points update requested/dispatched quantities and the kit together. Reconciliation retains the saved Job, carrier, tracking and dispatch time; it does not record a second physical dispatch or imply Customer receipt. Ambiguous, mismatched, full, linked or bound kits have no recovery action. Busy and failed updates retain the review safely. The core saved-dispatch correction is observed in the local run; the new direct-dispatch and remaining negative/retry variants are Not run as connected checks. |

**Handoff:** Record per-SKU requested/dispatched/outstanding counts, kit IDs and
tracking for SHP-08. Keep kit delivery distinct from the later sample-return shipment.

## SHP-08 — Customer receipt and partial availability

**Setup:** C-ADMIN/C-DEPT; dispatched kits with known actual receipt or explicitly
labeled simulated receipt evidence; partial 20/10-tube variant from SHP-07.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open Confirm kits received; submit no selection and then cancel a selected draft. | At least one arrived kit must be selected; cancelling changes no inventory. |
| 2 | Confirm only the received TRANS-20 and refresh. | That kit becomes Available. The unreceived or undispatched TRANS-10 stays unavailable; the overall request is not falsely completed. |
| 3 | Prepare the received capacity, leaving ten tubes pending. Inspect another shipment/pool for the same Job. | The already allocated kit is not counted again. The residual need remains ten tubes; another location's stock does not unlock it. |
| 4 | Dispatch and acknowledge the remaining TRANS-10, then repeat the receipt confirmation after a lost response. | All received request becomes Received; the remaining kit becomes usable exactly once. Replays do not add stock twice. |
| 5 | On a separate fixture, cancel originating Job A after kit dispatch. Open the Customer location, acknowledge receipt, then prepare Job B at that location. | Receipt remains reachable and the unused kit can supply B without a second dispatch. Original request/tracking remains linked as history. No premature physical reuse is claimed. |
| 6 | Try unreceived stock, unverified legacy stock, and received stock at another Customer/Department/location through UI and direct API calls. | Ownership, receipt, compatibility and location are enforced. Known unused stock from another Job at the same authorized location is allowed; undocumented receipt/location is not assumed. |

**Handoff:** Record receipt actor/time and available, in-transit and allocated
counts by SKU/location. Customer kit receipt does not record laboratory sample receipt.

## SHP-09 — Available sizes, alternate packing and residual supply

**Setup:** LAB-SHIP-18 and separate Jobs using registered received location stock.
Provide physical barcoded containers for alternatives 20+10, 10+10+5+5 or six 5s
for 30 tubes and 10+5+5 for 18 tubes. Include stock originally requested for a
cancelled Job. A catalog entry alone does not establish available inventory.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Select the departure location, review Choose shipping containers and open Adjust containers. Scan each physical container barcode and review its row. | 18 recommends an available 20 with two spare slots; 30 recommends available 20+10. Each selected physical container shows its barcode, SKU, capacity and tube allocation. Draft barcode entry makes no stock reservation. |
| 2 | For 30 tubes, select 10+5 and use Add container twice; separately build six 5s. Change or remove a targeted row after entering counts in the others. | Add chooses another 10, then 5. A 20 is excluded because it would make the existing 5 redundant. Smaller needed sizes remain selectable; changes/removal preserve the other rows' counts. Desktop and phone keep one container per row. |
| 3 | For 18 tubes, select 10+5 and inspect choices for three remaining tubes with a 5 available. Separately use 30 tubes where only two 20s are available. | Prefer the available 5 over adding a 10/20. Do not add redundant containers after capacity is covered. Unavoidable spare capacity from actual available sizes is allowed. |
| 4 | Select Use recommendation after a custom selection. Change a row while its preview is delayed and inspect Summary. | Recommendation explicitly rebuilds the rows/counts. One compact Summary grid stays visible with Updating inside it; no repeated capacity prose, container breakdown or empty spacer bands appear. Confirmation waits for the current preview. No manual availability fields/disclosure appear. |
| 5 | Enter fractional/negative tube counts, an over-capacity row or an incorrect total; exercise an automatic recorded-stock rejection and partial supply. | Invalid counts or stock use are rejected with actionable errors. Partial capacity leaves explicit unallocated tubes. Empty rows do not create shipments; valid tube totals and per-container capacities remain exact. |
| 6 | Refresh and finish the residual pool after more supply arrives. On a separate completed-request fixture with uncovered tubes, order additional kits. | Existing container IDs and assignments persist; no kit is double allocated. Received request history remains visible; a new order is offered only when the server permits it, and Pending suppresses duplicates again. |
| 7 | Use Shipping container at the top of shipment detail to switch between siblings and a pool with remaining tubes. Repeat with an unsaved barcode and a delayed scan save. | The full-width selector is above kit/scanning controls, with name/identifier, tube count and status. It excludes cancelled siblings and empty pools; routes remain in the current Job/Trial. An unsaved scan prompts for discard; saving blocks navigation. There is no repeated bottom related-shipment list on detail, while the owning Job/Trial list remains available. |
| 8 | Inspect location inventory and Job preparation with stock from a cancelled originating Job, partial deliveries, unavailable stock and an inventory refresh error. Repeat as a Member. | Unused received location stock is usable independent of origin Job. Receipt actions remain available through the location. Members retain read-only history. Background errors disable affected writes while preserving open drafts. |
| 9 | Confirm exact scanned containers, then have another Job/user attempt the same claim concurrently. | Exactly one reservation succeeds; the losing save retains its draft and identifies changed availability. Stock is Assigned to the successful Job and is not counted again for any other Job. |
| 10 | Follow Job shipping links and an old cancelled container URL after reset. | Active preparation is the normal entry point. Retired configurations appear as history with an explanation and route to current preparation; they do not look like cancelled Jobs. |

**Handoff:** Record one shipment per nonempty container, exact tube allocation and
any residual pool for SHP-10/11. Spare slots are not missing samples or reusable stock.

### SHP-09 variant — Reset container configuration before scanning

**Status: Not run.** Use a separate Customer/Partner Job or authorized Trial with
multiple prepared containers and its original finalized sample/tube evidence.
Repeat with distinct destination/handling groups and a residual packing pool.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | As an organization/Department administrator, open Reset container configuration beside the top Shipping container selector, inspect the affected order/container/tube counts, then dismiss. | Server eligibility controls the action. The confirmation clearly covers the whole order's plan; dismissal preserves every prepared container. |
| 2 | Reopen and confirm with reserved physical containers before any tube scan. Compare the order, finalized samples and tube ordinals before/after. | The full plan returns to the appropriate pool, reservations return to available location inventory, and old configurations remain in history. No tubes are lost/duplicated; quote, original delivery and receipt facts remain unchanged. |
| 3 | On separate fixtures, try after any scan, ReturnKit/physical-kit binding, packet, dispatch or receipt in a sibling shipment; repeat with scan fields cleared after an immutable scan event. | The entire reset stays blocked once such work starts, including historical scans. There is no bypass through another container or member identity. Clearing a scan cannot make reset available again. |
| 4 | Start a scan or change the family while confirmation is open; retry a stale or concurrent reset and simulate a failed response. | Reviewed versions and server rechecks prevent partial resets or overwriting newer work. Pending state prevents duplicate UI submission; failure remains explained and reviewable. |
| 5 | Enter an unsaved barcode and inspect Reset container configuration; discard it before any save. On a separate fixture, delay a scan save and inspect the action again. | Reset is disabled while barcode input is unsaved or saving. Discarding a never-saved entry may restore eligibility; saving a scan locks the plan permanently, even if that scan is later cleared. No reset mutation precedes resolution of the draft/save. |

## SHP-10 — Scan tubes and retain exact identities

**Setup:** Prepared containers explicitly assigned from received Customer location stock,
administrator and scanner or clearly labeled keyboard simulation.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Scan the displayed sample's next tube from the assigned physical container and save. | Exact saved number/barcode appears beside its sample/tube ordinal; advancement follows successful save. The assigned container becomes In use and reset locks. |
| 2 | Refresh midway and navigate a long list. | Saved assignments remain; the next unmatched tube is reachable with paging, without expanding the whole page. |
| 3 | Try unknown, duplicate, unreceived, unassigned, already-used and another-container tube barcodes; delay/reject a save. | Only tubes registered to the explicitly assigned container can match; the originating delivery Job is irrelevant. A failed scan preserves its value, makes no progress and cannot bind a different container implicitly. |
| 4 | Correct a pre-dispatch assignment using the supported action and a reason. | History is retained; changed assignments do not silently rewrite a confirmed packet. Repacking a bound/scanned container is rejected. |

**Handoff:** Save the complete crosswalk and kit-to-container binding for SHP-11.
Physical barcode readability requires actual hardware evidence.

## SHP-11 — Branded manifests and samples split across containers

**Setup:** Fully matched main container plus a separate split-sample fixture;
printer/PDF viewer; long-manifest and correction variants.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Review and confirm each container's packet; inspect printable output. | Phaeno branding, Job/order, shipment, sample and physical container barcodes, permanent tube barcodes, container facts and frozen instructions are legible. The physical container barcode comes from the frozen manifest revision. |
| 2 | Compare both manifests for a sample whose tubes cross a container boundary. | Each lists only its own physical contents and separately identifies the sample's total tubes, other shipment references/counts and any unallocated tubes. |
| 3 | Review a multipage manifest and print/scan representative barcodes. | Rows and barcode captions remain together, pages retain shipment identification, and order/shipment/sample/tube identities are distinguishable. |
| 4 | Repeat first packet confirmation; on a correction variant change a tube with a reason and inspect old/new packet references. | No competing first packet; correction retains the voided prior revision and current crosswalk. Configuration changes do not rewrite issued documents. |

**Handoff:** Keep each manifest with its own package; retain current and voided
references. PDF rendering alone is not physical printer/scanner acceptance.

## SHP-12 — Record each sample-return shipment

**Setup:** SHP-11 confirmed packets; Customer administrator; observed test
dispatch event for each physical container.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Attempt dispatch on a separate unmatched/unconfirmed or unacknowledged-kit variant. | The missing prerequisite prevents sample shipment; viewing or printing alone does not satisfy it. |
| 2 | Record carrier, tracking and dispatch time for one ready container, then refresh. | One persisted shipment event belongs to that container; kit-delivery tracking is not substituted. |
| 3 | Dispatch another container separately and inspect the parent Job. | Distinct shipment identities/tracking and combined tube totals remain accurate. Undispatched containers stay distinguishable. |
| 4 | Follow Back to lab job and reopen each shipment/manifest. | Parent/child navigation is correct; finalized samples and accepted quote remain unchanged. |

**Handoff:** Supply current manifest and tube references to P-LAB for SHP-13/LAB-02.
Record simulated dispatch separately from actual carrier/physical evidence.

## SHP-13 — Laboratory receipt across split shipments

**Setup:** P-LAB; SHP-12 packages; split sample with tubes in two shipments;
current, voided, unrelated and malformed barcode variants.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Look up Job/sample/shipment, then compare the current packet plus a tube. | Correct shipment and expected sample resolve. Lookup/comparison is read-only; it does not record custody or accession. |
| 2 | Use Continue to receipt and accession and record the physically received tube through the Lab workflow. | The saved match is revalidated; the permanent supplier barcode is adopted without a replacement POMS label. |
| 3 | Receive only the first container, then the rest of the split sample in another container. | Per-container and Job tube totals increase once per actual tube. A split sample becomes fully received only after all its expected tubes are recorded. |
| 4 | Retry a receipt; compare wrong/voided packets and a tube from another Job. With engineering support, attempt the legacy whole-sample receipt endpoint. | No double count or unrelated accession. Lab-owned shipping work cannot bypass tube-level receipt through legacy operations. |

**Handoff:** Continue [LAB-02](06-laboratory.md#lab-02--receipt-multi-tube-accession-and-physical-lineage)
for accession/lineage and scientific intake decisions. Laboratory acceptance is
separate from both customer kit receipt and shipment delivery.

## SHP-14 — Access, recovery and usable long workflows

**Setup:** Customer/Department admin and member, another Customer/Department,
non-admin Phaeno session, long names/queues/tube lists, stale tabs and controlled
request failures. Repeat relevant SHP-02–13 actions on disposable variants.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Review as a scoped member; attempt order/receipt/packing/location writes and direct out-of-scope links/API requests with engineering support. | Read-only scope is retained; administrative writes and unrelated data are denied by the API as well as hidden in the UI. |
| 2 | Revoke access or change a saved version while a form is open, then save. | No stale overwrite or unauthorized mutation; the user receives a recoverable explanation. |
| 3 | Fail or delay recommendation, order, dispatch, receipt and scan requests independently; retry and refresh. | Failures retain useful context; one successful action persists once. No false success, duplicate notice, stock increment or shipment appears. |
| 4 | Run keyboard-only at desktop, 390px phone and 390×480 short height, in light/dark themes and reduced motion. | Controls have names/focus, required-field errors identify the fix, dirty dismissal is deliberate, modal actions remain reachable and menus/options fit the viewport. |
| 5 | Use long group names, many samples/kits/requests and a multipage manifest. | Bounded lists/paging preserve context and totals; no clipped content, horizontal overflow or unreachable action. Capture any surface still needing pagination as a defect. |

**Cleanup:** Close disposable drafts/cancel only eligible test requests through
supported actions. Retain dispatch/receipt/audit history and the main walkthrough.
Have the environment owner reconcile test mail and physical stock separately.

## Inventory work outside this implementation

Location inventory, cross-Job use of available containers, atomic reservation,
and release before tube scanning are covered by SHP-08–10 above. The following
remain separate product or implementation work; they are not passed tests:

| Future scenario | Required eventual acceptance |
| --- | --- |
| Preliminary order-intake need and automatic replenishment | Forecast shortages before final tube counts without reserving containers or creating duplicate requests. |
| Transfers, loss, damage and inventory corrections | Explicit, explained and audited movements between locations; no implicit transfer during preparation. |
| Automatic cancellation of an unshipped kit request | Product decision remains pending. Preserve the existing request-cancellation behavior until settled; releasing an unused Job reservation is a separate action. |
| Spare tubes and kit reassembly | Explicit tube versus container balances and barcode lineage; no automatic reuse of spare slots or partially returned kit contents. |

See the [shipping implementation plan](../plans/SAMPLE-SHIPPING-AND-INTAKE-PLAN.md)
and the [location inventory plan](../plans/TRANSPORTATION-KIT-LOCATION-INVENTORY-PLAN.md)
for those decisions. Expand these scripts when the related behavior is implemented.

**Sources:** [Customer shipping guide](../../frontend/src/content/docs/en-US/customer/sample-shipping.mdx),
[Phaeno fulfillment/receipt guide](../../frontend/src/content/docs/phaeno/lab-receipt-accession.mdx),
[backend coverage](../plans/BACKEND-TEST-PLAN.md), [frontend coverage](../plans/FRONTEND-TEST-PLAN.md),
and [browser evidence](../plans/E2E-TEST-PLAN.md).
