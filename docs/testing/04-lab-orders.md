# 04 — Lab orders and sample shipping

Use [shared prerequisites](TEST-DATA.md). Run standard placement for both Customer and entitled Partner; manual sales-assisted intake currently selects Customers.

## ORD-01 — Staged readiness and versioned configuration

**Setup:** P-ADMIN/P-PRICE; Customer Research ready for pricing but lacking online admin/billing; separate approved standard offering fixture.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open Order intake → New Customer order, select Company and Department. | Company remains findable even with setup gaps; pricing, quote and invoice blockers are separate. |
| 2 | Follow a missing service/catalog setup link, complete supported setup, then return. | Company/Department/draft context survives; effective Ready entitlement and exact active `pseq-lab-service` specimen item govern pricing. |
| 3 | Begin pricing with valid minimal prerequisites; attempt quote without active Customer administrator, then invoice without approved billing. | Pricing need not wait for online administrator; later actions stop at their own readiness gate. |
| 4 | Review an inactive/synthetic/future standard offering and an approved active version. | Unavailable or synthetic definitions cannot be purchased; approved current definition is selectable only where all referenced configuration is valid. |
| 5 | Create a new scientific offering version; compare an existing accepted order. | New eligible selections use the applicable version; frozen accepted price/scope/tax is unchanged. |

**Handoff:** Record actual configured IDs and blockers resolved. Do not activate real scientific offerings for this test.

## ORD-02 — Configured standard Lab commitment

**Setup:** LAB-STANDARD with two specimens, approved billing/tax; C-ADMIN/C-DEPT and equivalent entitled Partner sessions.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare Job pricing profile with two specimens and approved source composition; save/reopen. | Draft persists without individual sample IDs or executable Lab work. |
| 2 | Review configured standard terms: offering/version, analyses/outputs, specimen count, unit price, tax, total and turnaround. | With arithmetic fixture: 200.00 subtotal + 20.00 test tax = 220.00 final total; no unexplained second Assembly charge. |
| 3 | Try placement as Department admin, then Organization admin. | Department admin cannot commit; Organization admin can deliberately accept the reviewed terms. |
| 4 | Refresh/retry placement after a controlled delayed response. | One commitment/sale and frozen terms; no duplicate quote, charge or Lab authorization. Samples open only after commitment. |
| 5 | On another draft change the catalog price/scope while review is open; attempt place, then Refresh terms and review again. | Stale review rejected with draft retained; new terms require fresh review/affirmation. |
| 6 | Repeat with entitled Partner using administrator-prepared billing. | Same scientific/tenant gates; Partner Finance UI is not required or promised. |

**Handoff:** Keep accepted Job IDs for ORD-04; record exact accepted totals and version.

## ORD-03 — Manual pricing, immutable quote and Customer acceptance

**Setup:** LAB-MANUAL; P-PRICE, separate reviewer where dual control enabled, C-ADMIN/C-DEPT.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Customer submits Job pricing profile without individual samples; staff requests a specific correction, then Customer submits revision. | Original revision retained; corrected scope is distinguishable and no Lab work exists. |
| 2 | Staff prepares quote with required specimen-priced service line and fixed quantity two; test missing/inactive item variant. | Required line/quantity cannot be removed or substituted with an unrelated fee; invalid catalog blocks issuance. |
| 3 | Review proposed price with independent reviewer where required; issue complete-tax and separate pre-tax quote variants. | Price decision recorded; quote has immutable revision/expiry and explicit tax-included or pre-tax labeling. |
| 4 | Customer administrator reviews/accepts current unexpired quote; test expired/superseded quote and unauthorized member variants. | Only eligible admin accepts current terms; Phaeno cannot accept on Customer's behalf. |
| 5 | Issue a scope increase as a change quote and leave it unaccepted. | Original agreement retained; additional work cannot begin before change acceptance. |

**Handoff:** Accepted main Job continues ORD-04. Preserve issued/accepted quote snapshots for FIN-01.

## ORD-04 — Exact sample roster, CSV preview and finalization

**Execution status:** Not run. Earlier screenshots or automated checks do not complete this updated manual case.

**Setup:** Accepted two-specimen Customer Job; correct shipping rules; SAMPLE-A/B with one/two tubes; accepted source value. Use a separate approved multi-source Job for group-capacity and sorting variants, including coded IDs ending in `2` and `10` entered out of order. Do not change the accepted scientific scope to fit test data.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open **Samples and shipping** before entering samples. Review each biological-source band, its entered/required count and **Add** action; download the CSV template. | Accepted groups appear even when empty. The template contains exactly `customer_sample_id,biological_source,tube_count`; permanent barcodes are entered later during shipping. |
| 2 | Use **Add** in a source band; enter a coded sample ID and tube count. Edit the sample, then cancel a removal confirmation. | Add inherits the selected source without another source selector. Edit allows an eligible source change without counting the current sample twice. Pencil/trash controls have sample-specific names/tooltips; cancelling removal keeps the row. Draft rows omit the routine **Expected** badge. |
| 3 | Fill a source group and inspect other groups. On the separate variant, try a move into a full group, duplicate ID and zero/fractional tube counts; inspect any prepared overfull/unmatched-source fixture. | Full-group **Add** is disabled; other eligible groups remain usable until the total limit. Full targets and invalid input are rejected. Overfull/unmatched groups show red counts and an explanation without deleting data. An exact overall total with the wrong source mix cannot be finalized. |
| 4 | With at least one saved sample, inspect **Import sample list** and its help; download the template again. On a disposable roster, remove all samples through their confirmations before starting import. | Import is disabled while any sample exists, with “Remove all samples before importing a new list.” Template download remains available. Import becomes available only for the empty editable roster; it is not an overwrite shortcut for a populated list. |
| 5 | On the empty roster, preview a valid CSV and inspect saved rows before confirming. Cancel once, then preview again and confirm. | Preview and Cancel leave the saved roster empty. Confirmation saves the reviewed rows atomically. If another action changes the Job or adds samples after preview, stale confirmation cannot silently replace that work; refresh/review before retrying. |
| 6 | Preview duplicate IDs, an extra barcode column, wrong count/source composition and zero/fractional tube counts on empty variants. | Errors identify the affected rows/fields; invalid import/finalization does not partially save rows or authorize extra work. |
| 7 | Complete the exact accepted composition; inspect counts, long group names and the bounded sample list using keyboard and phone layout. | Each complete group has a green check; the overall green check appears only when every accepted count and the total match. Sticky source bands remain readable, long values wrap, and scrolling the sample region keeps surrounding actions accessible. |
| 8 | Open **Review and finalize list**. Check group order, numeric ID ordering, sample/tube summary and no-PHI affirmation; cancel once. Reopen and affirm the exact reviewed list. | Review uses accepted source order and natural sample-ID order (`…2` before `…10`), with no repeated source in each row. The small fixture shows **2 samples · 3 tubes**. Initial focus is on the summary; keyboard scrolling reaches the affirmation while header/footer stay available. Finalize remains disabled until the required affirmation; Cancel authorizes nothing. |
| 9 | Finalize, then refresh/retry after a controlled lost response and attempt ordinary roster editing. | Exactly two samples/three physical tube slots freeze on the small fixture. One linked Lab authorization/work handoff is retained, without duplicate tube slots or initial shipping records. Ordinary editing is unavailable; finalized **Expected** statuses may now appear. Shipping containers are prepared in ORD-05. |
| 10 | On a separate accepted Job remove required shipping readiness before finalization, then restore and retry. | Failure retains the editable roster without partial Lab work; a supported retry completes the same operation. |

**Handoff:** Record Job → authorization → Lab → sample/tube-slot IDs and any initial unallocated shipment for ORD-05/LAB-02. Preserve accepted group counts separately from physical tube counts.

## ORD-05 — Transportation kits, containers, frozen manifests and sample dispatch

**Execution status:** Not run. Previous invitation, roster, quote or shipping screenshots are not a completed kit-order-to-Lab-receipt journey.

**Setup:** Finalized Customer Job from ORD-04; C-ADMIN/C-DEPT and authorized Phaeno fulfillment account; active compatible container revisions, Customer/Department delivery location, approved instructions and controlled physical kit/tube fixtures. The full detailed cases are in [11 — Transportation kits, delivery locations and sample shipping](11-transportation-kits.md) (SHP-01–14). Use that module for setup, permissions, retries, partial supply and negative variants; record its results separately rather than treating this handoff as a pass for every SHP case.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | From **Samples and shipping → Shipping containers**, open **Choose containers** for the unallocated tubes. Review approved receiving/handling context and the transportation-kit recommendation. | Counts refer to physical tubes, not priced samples. Eligible active container revisions match the applicable sample/handling rules; missing configuration has a clear blocker. A missing inventory record is not asserted to be verified zero stock. |
| 2 | Choose **Order transportation kits**, review recommended sizes/quantities and the Department delivery address, then **Confirm kit order**. Use the linked location-management workflow if setup is missing. | One request records the reviewed container revisions and delivery-address snapshot. Kits and outbound delivery are included with the accepted Lab order at no additional charge. No new quote, payment or surcharge is introduced. Reopening/retrying does not place a duplicate request. |
| 3 | As Phaeno, open **Lab operations → Receipt & accession → Kit requests**, then the request record. Prepare/register the required physical stock kits as needed; use **Fulfill request** to select ready kits and record actual controlled dispatch facts. | The request shows its saved Customer/Department address and outstanding quantities. Each stock kit contains its full configured tube capacity before dispatch, even when the Job will use fewer tubes. Only eligible unused kits of the exact requested revision can be dispatched; partial dispatch leaves the remainder outstanding. Follow the SHP cases for notification evidence and duplicate/concurrent attempts. |
| 4 | As the Customer, inspect **On the way**, then use **Confirm kits received** only for kits actually delivered in the controlled fixture. | Outbound dispatch is provisional supply, not Customer receipt. Acknowledged kits become available for preparation; unreceived kits remain outstanding. Customer kit receipt is distinct from the later Lab receipt of sample tubes. |
| 5 | Prepare containers using received eligible kits. Review the recommended combination and a valid alternative on a separate fixture; inspect spare capacity, allocation and any residual tubes. | Container choice does not change accepted sample counts or pricing. Each nonempty container gets its own shipment. Spare slots do not require extra samples/tubes; unallocated tubes remain explicit. Sample tubes may span containers. Detailed custom-allocation and partial-capacity checks use the SHP module. |
| 6 | Open each physical shipment and work through **Scan tubes into this shipment** using registered permanent tube barcodes. Leave/reopen after a saved scan; try wrong-kit/duplicate/unknown variants. | Every successful scan saves the exact identity, updates progress and advances focus. The first eligible scan binds the physical kit to that return container; later tubes use that same kit. Invalid scans retain the current tube/value and do not advance. Reopening resumes saved progress. |
| 7 | Review all declared tubes, **Review and confirm packet**, then **View packet** and print the current manifest for each container. Reopen/retry and compare a later configuration revision or controlled packet correction. | Each frozen revision retains container name/SKU/capacity, destination/instructions and only that container's physical crosswalk. Job, shipment, sample and permanent-tube barcodes remain distinct. Split-sample references identify other shipments/unallocated tubes separately. Configuration changes do not rewrite issued facts; a correction voids the old packet and requires its replacement. |
| 8 | After controlled physical carrier handoff, record sample dispatch separately for each container. Open the Job's related shipments and return links. | Carrier/tracking/time belong to the correct sample shipment. Job and shipment progress retain partial completion; dispatching one container does not dispatch another or mark all sample tubes received. **Back to lab job** returns to the owning Job. |
| 9 | At Lab, use the printed Job/sample/shipment identity to find the appropriate manifest, then compare its permanent tube barcode and choose **Continue to receipt and accession**. | Lookup identifies the correct shipment, sample and Lab work. Job/sample lookup can offer multiple manifests. Comparison alone records no custody or receipt; wrong/current-voided packet or wrong tube is rejected, while connection failure offers a distinct retry. Continue LAB-02 with the matched context. |

**Trial and legacy branch:** On a separate authorized Trial or existing shipment-specific-kit fixture, use its supported parent, **Kits sent** or existing fulfilled-kit path and current packet/scanning safeguards. Do not create a Customer kit request, reprice a Trial, require a new Customer charge, or replace a frozen legacy kit merely to exercise this new journey. Record that branch separately; it does not prove the new request/location inventory workflow. Entitled Partner order placement in ORD-02 does not establish support for Customer-only kit ordering.

**Handoff:** Continue LAB-02 with Job/request/location snapshot → physical stock kits → return shipments → current packet revisions → sample/permanent-tube crosswalk IDs. Mark physical dispatch, printer/scanner and delivery assertions Blocked unless the accountable operator supplies actual evidence; simulated provider or browser evidence remains labeled.

## ORD-06 — Custom work, sales-assisted intake, timing and cancellation

**Setup:** Separate custom request, known Customer Opportunity, accepted Job and unaccepted draft; P-PRICE, C-ADMIN, Lab operator.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Organization admin requests custom work from eligible Job; refresh CRM. | Sales reference links immutable original request, Company/Department and origin; no new accepted price or order. |
| 2 | For Customer sales-assisted work use the approved Opportunity handoff, then New Customer order and Start pricing. | Customer-owned Job/request revision opens Quote in preparation; no Customer notice before actual quote issuance. Partner auto-conversion is not inferred. |
| 3 | After Lab receipt and scientific acceptance inspect turnaround. Change expected completion later with controlled reason, then earlier. | Clock starts at scientific acceptance; original target retained; later date queues safe notice, earlier change updates Portal without a new delay notice. |
| 4 | Cancel eligible unaccepted variant; request cancellation on accepted/partially worked variant. | Accepted work requires reviewed decision; request alone does not erase Lab custody or force cancellation. |
| 5 | Staff approves/partially approves/declines according to known work-state variants. | Safe outcome and retained reasons visible; shipped/consumed work remains, invoice corrections use Finance adjustments. |

**Cleanup:** Close disposable drafts; retain accepted-order and notice evidence.

## ORD-07 — Customer laboratory stages and mixed sample progress

**Execution status:** Not run as a complete manual case. The [local checkpoint](runs/2026-09-10-customer-laboratory-stages.md) covers a Customer desktop Received view only; unit/database fixtures do not pass the remaining connected journey.

**Setup:** Dedicated Customer and entitled Partner Jobs with at least three finalized samples; one sample split across containers, and a separate multi-library specimen variant. Use external administrator/member sessions, P-LAB and independent reviewer/release roles from [TEST-DATA.md](TEST-DATA.md). Record expected sample/tube counts and scoped IDs. Prepare approved execution, sequencing, data-processing and release fixtures. Missing prerequisites are Blocked. Never advance the owner's corrected Jobs to create evidence.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Before receipt, open the Customer Job list and detail; repeat the journey for an entitled Partner. | Pre-order/awaiting-sample states remain truthful. Missing progress is unavailable, not fabricated zero counts. |
| 2 | Follow LAB-02 to receive the first container; refresh external list/detail and Phaeno Work. | Customer stage and Lab Work show Received; Commercial lifecycle remains InProgress. Arrival alone does not accession all tubes, accept samples or start turnaround. Outstanding samples remain explicit. |
| 3 | Accession a subset, including one tube of the split sample; reopen the Job. Finish the remaining tubes later. | Actual tube receipt counts are correct; sample Accessioned requires every expected tube across active shipments. Laboratory stage stays Received until further activity. Completed containers leave accession; the Job remains in Work. |
| 4 | Start approved preparation for one sample while another remains Received. | The affected sample shows Library Prep. Counts show mixed stages; the Job does not jump ahead of its earliest unfinished sample. View sample stages names the correct samples. |
| 5 | Batch prepared libraries; record provider Shipped and ReceivedByProvider, then actual Sequencing on controlled evidence. | Shipping/provider arrival alone does not show Sequencing. Actual sequencing affects linked samples. On the multi-library variant, only some libraries sequencing must not advance the whole sample. |
| 6 | Record sample data processing or a controlled output-upload/scanning fixture; keep another sample earlier. | The affected sample shows Data Assembly with accurate mixed counts; processing/upload does not make results available. |
| 7 | Move output into review, then scientific approval/ready for release without releasing it. | Quality Review remains distinct from Results Available; approved but unreleased files stay unavailable. |
| 8 | Release one sample through the authorized release workflow; inspect counts and Files and results. Later finish/release all eligible samples. | Partial release shows its count and permitted output without claiming whole-Job completion. Whole-Job Results Available requires all eligible samples released; Completed/cancellation lifecycle labels retain precedence. |
| 9 | On a separate fixture record Job-wide activity while individual samples share an earlier stage; also inspect mixed stages. | The page explains Job-wide activity separately without fabricating individual counts or historical completion checkmarks. |
| 10 | Inspect held, rejected, cancellation-requested, cancelled and completed variants, plus withdrawn/unreleased output. | Holds/attention remain visible. Order hold/cancellation/terminal labels override normal stages in list/header. Withdrawn or merely ready output is not a new release. Receipt/accession/storage history is preserved. |
| 11 | Filter Order status = In Progress; return from details. Repeat as a member and in another Department/organization. | Lifecycle filtering still finds active Jobs and preserves list context. Progress exposes only the authorized roster, without internal storage, provider details or private QC; peer records are inaccessible. |
| 12 | Open/close sample and approved-QC disclosures using Enter/Space and touch. Check 320/375 px, desktop, 200% zoom and both themes. | Names/counts remain readable without progression-induced page overflow; visible focus and text/accessibility state identify the current stage. Sample names sort numerically where applicable. |

**Evidence:** Record list/header status, per-stage sample and tube counts, relevant activity/release references, actor and viewport. Separate simulated provider/API evidence from actual provider/physical acceptance. A missing prerequisite is Blocked with an owner and next action.

**Cleanup/handoff:** Preserve accepted-fixture audit and result history. Restore only approved isolated setup. Existing Jobs 69SJN4PA and HS5Y7DB7 may be checked read-only: both list rows should show Received; 7- and 9-sample details are separate assertions. Do not repeat the earlier data correction.

**Sources:** [Customer Lab guide](../../frontend/src/content/docs/en-US/customer/lab-services.mdx), [Customer shipping guide](../../frontend/src/content/docs/en-US/customer/sample-shipping.mdx), [authorization guide](../../frontend/src/content/docs/phaeno/order-customer-lab-authorization.mdx), [sample roster](../../frontend/src/features/orders/LabJobSamplesPanel.tsx), [standard controller](../../backend/app/Features/OrderManagement/Controllers/LabServiceOrdersController.Standard.cs), [configured database tests](../../backend/test/ConfiguredLabServicePostgresTests.cs), [shipping tests](../../backend/test/SampleShippingPostgresTests.cs), [container/split-shipment tests](../../backend/test/SampleShippingPackingPostgresTests.cs).
