# 11 — Transportation kits and sample shipping

Use [shared prerequisites](TEST-DATA.md) and record each case in the
[run record](RUN-RECORD.md). These 14 manual cases start **Not run**. Historical
component, browser and PostgreSQL checks are supporting evidence, not a result
for a connected run of these scripts.

The primary users are the Customer organization/Department administrator,
Phaeno fulfillment administrator and laboratory receiving operator. The
workflow must provide kits without an additional charge, retain their delivery
and tube identities, and allow sample shipment only with acknowledged kits.
For this implemented slice, recorded supply belongs to a **Job and delivery
location**. It is not a general balance of every kit at the customer site.

## Resume the current local walkthrough

The September 8 checkpoint for **HS5Y7DB7** has nine finalized samples, 18 tubes
and accepted quote revision 1 at USD900 pre-tax. The approved TRANS-20/10/05
definitions have active revision 2. The 18-tube recommendation is one TRANS-20,
with two spare slots. No Customer delivery location, kit request or physical
stock was created by the implementation verification.

Start with **SHP-02**, save the actual Department delivery location, return to
the shipment and run **SHP-03**. Continue SHP-05–08 with the fulfillment and
Customer testers, then SHP-09–13. Preserve the existing Job and sample list.
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
| 2 | Add the real test delivery address, exercising required-field errors, then save. | Errors identify the field; valid save opens the location detail. Required legend, default selection and address are clear. |
| 3 | Use Return to shipment. Repeat with multiple locations and no default. | Kit-order confirmation reopens without submitting. A saved default is selected; otherwise explicit location selection is required. |
| 4 | Edit/change the default and deactivate a separate location; test stale edits from another tab. | One active default remains; stale writes fail without silently replacing saved data. Inactive addresses stay in history and leave new-order choices. |
| 5 | Attempt other-Customer/Department access and member writes. | No unauthorized location data or mutation. Phaeno administration and Customer/Department management retain their intended scope. |

**Handoff:** Record location ID/version/default and owning Department. Retain a
second location for isolation checks; do not copy address details into public evidence.

## SHP-03 — Included-cost kit order and confirmation

**Setup:** Finalized accepted LAB-SHIP-18, C-ADMIN or C-DEPT, approved location and
compatible catalog; no usable recorded kits or open request.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open Choose containers from the Job. | Transportation kits is the primary ordering area. Unknown inventory is described as unconfirmed, not verified zero or available physical stock. |
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
| 2 | Register permanent tube barcodes until the selected capacity is complete. | A TRANS-20 requires 20 registered tubes even when the intended sample shipment contains only 18. |
| 3 | Exercise duplicate, already-used, excess and missing-tube variants. | Invalid registration cannot make incomplete or conflicting stock eligible for fulfillment. Valid saved registration survives refresh. |
| 4 | Open the pending request's Fulfill request dialog. | Only fully registered, compatible, matching requested-size revisions are offered. A shortage is explicit; no dispatch is invented. |

**Handoff:** Record physical kit IDs, SKU/revision and barcode roster for SHP-07.
Use Fulfill request for the new Customer order; the legacy direct dispatch action
does not establish request-linked delivery-location inventory.

## SHP-07 — Dispatch and provisional customer inventory

**Setup:** Main one-kit request and separate LAB-SHIP-30 request for one TRANS-20
plus one TRANS-10; ready matching stock; P-ADMIN; controlled dispatch evidence.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open Fulfill request, review the frozen address, select kits and record observed carrier/tracking/dispatch time. | Required fields and requested quantity caps apply. Each dispatched kit links to this request, Job and delivery location. |
| 2 | For the 30-tube variant dispatch only TRANS-20. | Staff state is Partially dispatched; one TRANS-10 is still owed. Customer sees the sent kit On the way. |
| 3 | Refresh both sessions and attempt sample preparation with that unacknowledged kit. | Dispatch increases provisional supply only; no usable capacity, scan, packet or shipment bypass is granted. |
| 4 | Retry dispatch and attempt a wrong-size/already-sent kit; change the saved address separately and reopen the request. | No double dispatch, reassignment or excess fulfillment; the original confirmed delivery address remains frozen. |

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

**Handoff:** Record receipt actor/time and available, in-transit and allocated
counts by SKU/location. Customer kit receipt does not record laboratory sample receipt.

## SHP-09 — Available sizes, alternate packing and residual supply

**Setup:** LAB-SHIP-18 and separate 30-tube fixtures with acknowledged supply for
20+10, two 20s, or six 5s. Prepare each supply lineage independently; do not
pretend unreceived kits are available to reach an alternate plan.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Select Prepare samples and inspect the default packing recommendation. | 18 uses one 20 with two spare slots. 30 uses 20+10 when those kits are available; recommendations respect acknowledged supply. |
| 2 | Use Adjust containers with two available 20s and separately six available 5s; preview custom 15+15 allocation for the two 20s. | Both alternatives are valid without an exception request. Tube totals and per-container capacities are exact. |
| 3 | Enter zero/insufficient availability or an over-capacity allocation; then prepare only valid available containers. | Invalid counts are rejected; partial capacity leaves explicit unallocated tubes. Empty extras do not create shipments. |
| 4 | Refresh and finish the residual pool after more supply arrives. On a separate completed-request fixture with uncovered tubes, order additional kits. | Existing container IDs and assignments persist; no kit is double allocated. Received request history remains visible; a new order is offered only when the server permits it, and Pending suppresses duplicates again. |

**Handoff:** Record one shipment per nonempty container, exact tube allocation and
any residual pool for SHP-10/11. Spare slots are not missing samples or reusable stock.

## SHP-10 — Scan tubes and retain exact identities

**Setup:** Prepared containers, received request-linked physical kits, Customer
administrator and scanner or clearly labeled keyboard simulation.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Scan the displayed sample's next tube and save. | Exact saved number and barcode graphic appear beside its sample/tube ordinal; advancement occurs only after a successful save. |
| 2 | Refresh midway and navigate a long list. | Saved assignments remain; the next unmatched tube is reachable with paging, without expanding the whole page. |
| 3 | Try unknown, duplicate, wrong-Job, unreceived-kit and another-kit barcodes; delay/reject a save. | The bad scan remains available to correct; progress does not advance or create a second assignment. One physical kit cannot bind to two containers. |
| 4 | Correct a pre-dispatch assignment using the supported action and a reason. | History is retained; changed assignments do not silently rewrite a confirmed packet. Repacking a bound/scanned container is rejected. |

**Handoff:** Save the complete crosswalk and kit-to-container binding for SHP-11.
Physical barcode readability requires actual hardware evidence.

## SHP-11 — Branded manifests and samples split across containers

**Setup:** Fully matched main container plus a separate split-sample fixture;
printer/PDF viewer; long-manifest and correction variants.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Review and confirm each container's packet; inspect printable output. | Phaeno branding, Job/order, shipment and sample barcodes, permanent tube numbers/barcodes, selected container facts and applicable frozen instructions are legible. |
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

## Planned inventory coverage outside this implemented slice

Keep these as **planned product/implementation gaps**, not failed assertions
against the current Job-specific supply model or already-passed tests:

| Future scenario | Required eventual acceptance |
| --- | --- |
| Cross-Job customer and Phaeno location balances | Correct on-hand, reserved, in-transit and consumed stock per SKU/location across Jobs. |
| Competing orders and replenishment | No double reservation; preliminary order-intake need becomes exact after final tube counts; shortage processing creates no duplicate fulfillment. |
| Reservation release, loss, damage and corrections | Explained, audited movements and reconciliation; cancellation releases only eligible reservations. |
| Spare tubes and kit reassembly | Explicit tube versus container balances and barcode lineage; no automatic reuse of spare slots or partially returned kit contents. |

See the [shipping implementation plan](../plans/SAMPLE-SHIPPING-AND-INTAKE-PLAN.md)
for those decisions. Expand these scripts when the related behavior is implemented.

**Sources:** [Customer shipping guide](../../frontend/src/content/docs/en-US/customer/sample-shipping.mdx),
[Phaeno fulfillment/receipt guide](../../frontend/src/content/docs/phaeno/lab-receipt-accession.mdx),
[backend coverage](../plans/BACKEND-TEST-PLAN.md), [frontend coverage](../plans/FRONTEND-TEST-PLAN.md),
and [browser evidence](../plans/E2E-TEST-PLAN.md).
