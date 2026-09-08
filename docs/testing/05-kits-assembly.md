# 05 — Partner Kits and included Assembly

Use [shared prerequisites](TEST-DATA.md). Track original purchase, physical unit, included case, input request/revisions and original shipment billing reference separately.

## KIT-01 — Negotiated Kit draft, review and one purchase

**Setup:** KIT-ORDER, active Partner entitlement/offering/profile/address; K-DEPT/K-ADMIN.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create Kit order as Department admin, add two units, save incomplete draft and reopen. | Lines/delivery/PO draft persist; incomplete draft need not place an order. |
| 2 | Test fractional, below-minimum/above-maximum/increment-invalid quantity, unavailable offering and missing PO/address variants. | Placement blocked with explicit relevant errors; no units/cases created. |
| 3 | Complete details and Review PSeq Kit order. Try placing as K-DEPT, then K-ADMIN. | Only Organization admin commits; review shows two included cases, frozen profile/version, prices and delivery facts. |
| 4 | Refresh/retry after controlled interrupted response. | Exactly one purchase, two original units and two cases; no duplicate entitlement or sale. |
| 5 | Change negotiated price/profile while another draft review is open. | Stale terms require refresh/save/review; accepted order remains unchanged. |

**Handoff:** Keep two-case main order for KIT-02; preserve old standalone fixture for KIT-06.

## KIT-02 — Commercial acceptance, split shipments and billing lineage

**Setup:** Placed two-unit order; Commercial and Lab fulfillment staff; actual test lot/expiration/tracking facts.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open in Lab before Commercial acceptance, then accept from Order operations → PSeq kits. | Lab fulfillment waits for Commercial acceptance; Open Lab work retains same order identity. |
| 2 | Ship one unit with labeled expiration; inspect shipped/remaining quantities and case. | One unit shipped/one remaining; first case deadline is labeled expiration + 90 days; original shipment source recorded once. |
| 3 | Ship second unit with no expiration using the approved fixture. | Second case deadline is shipment + 12 months; source rows/allocations distinguish both shipments. |
| 4 | Attempt over-shipment and replay a completed shipment action. | Accepted quantity cannot be exceeded; no duplicated shipped facts or accounting source. |
| 5 | Inspect external order after all physical units ship but before outputs. | Summary distinguishes Kit fulfilled / assembly pending; scientific cases remain independent. |

**Handoff:** Both cases available for input preparation; record immutable shipment billing references.

## KIT-03 — Substitution, replacement, deadlines and cancellation

**Setup:** Disposable accepted unshipped unit for substitution; shipped case for replacement; unused case near deadline.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Request substitution with original/proposed product and price effect; decline as Partner admin. | Original facts preserved; staff cannot silently ship an unapproved alternative. |
| 2 | On separate variant approve required substitution/price increase before acceptance/fulfillment. | Explicit eligible Partner approval and retained commercial history precede changed work. |
| 3 | Replace shipped Kit with actual test replacement lot/ship date/carrier/tracking and reason. | Same case moves to replacement unit; original purchase/billing and submitted-input-unit history remain; no extra case or sale. |
| 4 | Extend an eligible case deadline with reason, then try unauthorized/stale action variants. | Current deadline/history update once; original facts retained; invalid authority/version fails. |
| 5 | Cancel an eligible unused case; test expired fixture and lifecycle processing separately. | No automatic refund or erased purchase. Expired submission is denied; automatic status processing is Blocked unless explicitly enabled in this test environment. |

**Cleanup:** Retain replacement/cancellation lineage. Do not enable the production lifecycle worker as part of testing.

## KIT-04 — Included input preparation and interrupted upload recovery

**Setup:** Shipped case, approved input files and known limits, K-DEPT/K-ADMIN; test scanner and controlled upload interruption.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open intended case → Prepare inputs; inspect label, lot, deadline and profile. | Case belongs to purchasing Partner/Department; included profile/output contract is read-only and frozen. |
| 2 | Enter reference/metadata and save draft with allowed files. | Same case/request retains uploaded file identities and scan states; no downstream-customer identity requested. |
| 3 | Interrupt remaining upload or final submit, then use Open saved draft/retry. | Successful uploads remain; remaining work resumes same request without duplicate case/draft creation. |
| 4 | Test unsupported file, over-limit file/total, pending/failed scan, missing required metadata and expired case variants. | Invalid submission blocked; no immutable accepted revision or processing work created prematurely. |
| 5 | Complete clean uploads, affirm prohibited-data statement and submit for intake validation. | One immutable input revision is created against frozen purchased scope. |

**Handoff:** Record case/request/revision/file IDs for KIT-05; keep file contents out of run evidence.

## KIT-05 — Intake correction, processing and original-purchase release gate

**Setup:** Submitted included case, Lab Assembly staff, K-ADMIN, approved outputs; original Kit billing/credit fixtures with and without release eligibility.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Staff requests field/file-specific corrections; Partner edits, removes wrong input and submits replacement revision. | Same request/case; previous submitted revision/files retained as history. |
| 2 | Accept valid included intake and proceed through processing/output review using approved test inputs. | Work queues without a second quote/purchase; output ties to exact accepted revision/profile. |
| 3 | Scientifically approve complete clean output with neither original Kit payment nor Assembly credit eligible. | Output is ready but held from external download; no second invoice/source/sale created at approval. |
| 4 | Use a separately authorized recorded original-payment or approved-credit fixture and supported release processing. | Original Kit billing context controls availability; available output has immutable manifest/checksums. If required processing is disabled, mark dependent step Blocked. |
| 5 | Repeat with operational hold or pending cancellation despite satisfied payment. | Commercial payment eligibility does not bypass operational hold/cancellation decision. |
| 6 | Download as K-MEMBER and attempt another Partner/Department's case. | Authorized released outputs accessible; wrong scope denied. Follow DAT-04 for completed-transfer evidence. |

**Handoff:** Preserve source counts before/after approval to prove no second billing; finish sibling case in KIT-06.

## KIT-06 — Independent case completion and historical compatibility

**Setup:** Two-case main order with first output released, second pending; genuine historical standalone request and non-bundle reagent order.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Inspect main order while one included case remains pending. | One finished case does not finish sibling case or whole bundle. |
| 2 | Finish/release second case, or formally close its unused entitlement through allowed action. | Parent completion derives from all cases released, expired unused or formally cancelled as applicable. |
| 3 | Open historical standalone Assembly quote/history and historical reagent order. | Existing original terms/actions remain; no inferred Kit link or fabricated included case. |
| 4 | Open Assembly cases list and attempt new standalone purchase through ordinary navigation. | New preparation starts from purchased case; list retains historical records without selling standalone Assembly. |
| 5 | Create a new draft from a prior Kit order. | Current availability/pricing is reviewed afresh; prior immutable terms are not silently reused. |

**Cleanup:** Preserve issued, shipped and released history; cancel only fresh disposable drafts.

**Sources:** [Partner Kit guide](../../frontend/src/content/docs/en-US/partner/reagent-orders.mdx), [Assembly guide](../../frontend/src/content/docs/en-US/partner/data-assembly.mdx), [bundle service](../../backend/app/Features/OrderManagement/Services/KitBundleService.cs), [lifecycle worker](../../backend/app/Features/OrderManagement/Services/KitCaseLifecycleWorker.cs), [bundle database tests](../../backend/test/KitBundlePostgresTests.cs), [browser cases](../../frontend/e2e/bundled-orders.spec.ts).
