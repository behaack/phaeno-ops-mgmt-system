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

**Setup:** Accepted two-specimen Job; correct shipping rules; SAMPLE-A/B with one/two tubes; permitted source value.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open Samples and shipping; add/edit/remove draft samples and download CSV template. | Controls follow accepted scope; template has exactly the three documented columns, no barcode input. |
| 2 | Preview valid CSV; inspect roster before confirming. | Preview does not change saved roster. Confirm replaces the editable draft atomically. |
| 3 | Try duplicate IDs, extra barcode column, wrong count/source composition and zero/fractional tube counts on variants. | Invalid input/finalization is rejected without partial replacement or extra authorization. |
| 4 | Review and finalize exact list with no-PHI affirmation. | Exactly two samples/three tube slots freeze; one linked Lab authorization/work/shipment handoff exists. |
| 5 | Refresh and retry after controlled lost response; attempt ordinary roster editing. | No duplicate authorization/shipment; finalized roster cannot be silently rewritten. |
| 6 | On separate accepted Job remove required shipping readiness before finalization, then restore and retry. | Failure retains editable roster without partial Lab work; supported retry completes same operation. |

**Handoff:** Record Job → authorization → Lab → shipment → sample/tube-slot IDs for ORD-05/LAB-02.

## ORD-05 — Return kit, frozen packet and sample shipment

**Setup:** Authorized order or Trial shipment with three tube slots; Lab shipping operator; registered unused tubes and approved instructions.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Preview exact destination/type instructions; test missing rule or incompatible combined sample-type variant. | Correct approved receiving/packing guidance resolves; incompatible grouping is blocked or requires separate packages. |
| 2 | Fulfill return kit in Lab Ops, recording actual test shipper/lot facts, three registered tubes and outbound tracking. | Each slot gets the intended unique tube; duplicate/already-assigned inventory fails without partial allocation. |
| 3 | Issue/open packet, inspect one sample with two tubes and repeat packet issue. | Packet/crosswalk is frozen; tube 1/2 of N map correctly; repeated operation does not create competing first packets. |
| 4 | Revise instruction configuration on a separate test revision and reopen issued packet. | Existing packet preserves its original revision/address/instructions. |
| 5 | As external admin review tube mapping and record shipment after controlled physical dispatch. | One carrier/tracking record connects included samples; Back to lab job/Trial returns to correct parent. |
| 6 | At Lab scan packet plus tube and select Continue to receipt and accession. | Correct expected sample/work identified; scan itself does not record receipt. Wrong packet/tube fails; network error offers retry distinct from mismatch. |

**Handoff:** Continue LAB-02. Mark physical dispatch/scanner assertions Blocked unless an operator supplied actual evidence.

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

**Sources:** [Customer Lab guide](../../frontend/src/content/docs/en-US/customer/lab-services.mdx), [authorization guide](../../frontend/src/content/docs/phaeno/order-customer-lab-authorization.mdx), [standard controller](../../backend/app/Features/OrderManagement/Controllers/LabServiceOrdersController.Standard.cs), [configured database tests](../../backend/test/ConfiguredLabServicePostgresTests.cs), [shipping tests](../../backend/test/SampleShippingPostgresTests.cs).
