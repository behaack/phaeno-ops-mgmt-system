# Sample Shipping and Intake Plan

## Current direction — location inventory and container barcode assignment

The September 9 Product Owner correction supersedes the same-Job kit requirement
below. Ship containers to Customer locations; keep unused received stock usable
after an originating Job is cancelled. Assign a physical container to a Job and
shipment during Customer preparation using its permanent barcode. The
[location-inventory plan](TRANSPORTATION-KIT-LOCATION-INVENTORY-PLAN.md) records
the workflow, reservation/reset rules, implementation work and acceptance gates.
The correction is implemented locally, with focused verification tracked in the
linked plan. It has not been deployed to production. The saved local walkthrough
remains after successful simulated kit receipt, before container/tube assignment.

## September 9 receipt feedback correction

The local Customer walkthrough completed simulated receipt of the one TRANS-20
kit for HS5Y7DB7. A cancelled predecessor container page still displayed the
generic instruction to confirm arrival, despite showing **Kits received**.
The delivery panel now renders only a specific server-provided preparation
reason; absence of a preparation action is not treated as missing receipt.
Existing receipt and preparation permissions are unchanged. Continue the local
walkthrough using **Tubes awaiting containers** in the shipment selector; the
cancelled predecessor remains available as history. See the
[current run record](../testing/runs/2026-09-08-hs5y7db7-local-walkthrough.md).

## September 9 production release and next acceptance step

The shipping implementation is deployed on matching API/UI source `f06f4530`,
including all four reviewed additive migrations. Backup/restore verification,
deployment identities and passing public health checks are recorded in the
[release record](PORTAL-SHIPPING-RELEASE-2026-09-08.md#september-9-production-release--completed).
Production configuration and signed-in/physical acceptance remain separate from
deployment. Resume the local HS5Y7DB7 walkthrough at Customer receipt for Request
D20018AA; no test records or receipt acknowledgement were imported into production.

## End-of-day acceptance handoff — September 8, 2026

The [local walkthrough handoff](../testing/runs/2026-09-08-hs5y7db7-local-walkthrough.md#end-of-day-handoff--resume-september-9-2026)
is the precise September 9 resume point: Customer Job **HS5Y7DB7**, Request
**D20018AA**, **Dispatched, 1 sent, 0 received**. Its one TRANS-20 kit has all
20 synthetic barcodes; its original FedEx dispatch is unchanged and now linked
to the request. Next, acknowledge that test kit as Customer, then verify only
received same-Job supply enables container configuration and scanning.
Successful scans, packets, split-shipment variants and physical acceptance
remain pending. Do not reorder or redispatch the existing kit. Local test
fixtures and acceptance evidence are separate from production rollout evidence.

## 2026-09-08 active walkthrough incident: dispatched kit missing from its request

At the incident checkpoint, the owner recorded dispatch from the standard kit
detail page. That page showed **Sent to customer**, while Request D20018AA still
showed **Pending, 0 of 1 sent**. Read-only verification confirmed the kit had the
correct Job and saved dispatch facts but no transportation-kit request line or
delivery-location link. This was a synchronization defect between two dispatch
entry points, not an unsubmitted dispatch or a reason to send another kit.

Required correction:

- Dispatching a kit for an accepted Customer Job must fulfill the compatible
  open transportation-kit request in the same transaction, whichever dispatch
  entry point was used. Validate requested revision/quantity, ownership and
  location; keep request, kit and customer supply views consistent.
- An already-recorded, unused dispatch may be linked to its matching request
  through a guarded reconciliation. Preserve its original carrier, tracking
  number, dispatch time, barcode roster and kit identity. Do not record a second
  physical dispatch or acknowledge Customer receipt.
- Reject ambiguous, mismatched, excess, already-bound or conflicting links and
  make retries idempotent. Refresh the stock, request and supply views after
  either entry point succeeds.
- Retain the requirement for a Job-specific order and later Customer receipt;
  preparation/registration alone is not fulfillment. Record focused evidence and
  the local walkthrough repair separately from physical delivery acceptance.

Implemented and reconciled locally through **Update kit request** on the saved
kit. Request D20018AA now shows **Dispatched: 1 requested, 1 sent, 0 received**.
Read-only comparison confirms the original dispatch facts and all 20 permanent
tube identities/barcodes are unchanged. The kit now links to the request line
and its delivery location; Customer receipt and sample-shipment binding remain
unset. One dispatch event and one logical Customer dispatch notification were
recorded. See the [local run record](../testing/runs/2026-09-08-hs5y7db7-local-walkthrough.md).
Focused verification passed 68 backend cases, 28 staff component cases and
7 responsive recovery-dialog cases. No migration or direct database patch was
needed. Customer delivery acknowledgement and physical acceptance remain pending.

## 2026-09-08 product correction: require kits ordered for the Customer Job

The owner confirmed that Customer container configuration must use transportation
kits ordered for that Job. The current dispatch model associates physical stock
with its originating Job; general customer stock is therefore not an alternative
entry point. This decision supersedes the earlier **I already have kits** action
and the no-request preparation allowance. Cross-Job inventory reuse remains
deferred.

Customer workflow and acceptance criteria:

- With no active kit order, show **Order transportation kits**, its recommended
  sizes and the included-cost confirmation. Do not expose **I already have kits**
  or let the Customer configure containers using assumed stock.
- Pending and in-transit orders show fulfillment/receipt progress. Received kits
  ordered for the same Job and delivery location unlock preparation, limited to
  the compatible quantities actually available. Partial receipt unlocks only
  that received supply.
- Enforce the same prerequisites on the server, including direct requests,
  cancelled orders and unbound containers created before this correction. Keep
  ordering recommendations available before receipt so ordering has no circular
  dependency on container preparation.
- Existing unbound container links provide an ordering or delivery-status path
  instead of exposing the scanner prematurely. Already-bound historical
  shipments retain their recorded lineage and supported completion flow.
- Phaeno continues preparing standard kits into unassigned stock and fulfilling
  requests from that stock. This change concerns Customer preparation; it does
  not introduce new Trial or Partner ordering policy, database fields, commercial
  charges or physical inventory movements.

Implemented locally. Focused verification passed 62 Customer component cases
and 28 responsive actual-component browser cases, plus backend supply-guard
coverage in the 68-case checkpoint above. Build, full frontend typecheck and
scoped lint passed. Customer and Phaeno guides and the generated 56-guide corpus
are current (`e81c712bcb04`). The owning test plans distinguish this automated
evidence from remaining connected Customer receipt/preparation acceptance.

## 2026-09-08 active walkthrough incident: kit-order save failure

SHP-03-001 is resolved locally; the connected Customer retry saved one Pending
TRANS-20 request, corroborated by the signed-in staff queue and read-only data.
The owner attempted Order transportation kits; the screenshot shows Kit order
could not be saved / An unexpected error occurred. The API's fulfillment routing
queried an active Phaeno organization with `SingleOrDefault`, encountered multiple
matches and rolled back the transaction. The 20:53:42 PDT read-only check found
no Job request/notification, corroborated by the empty staff queue. This is not
evidence of a different user action. Routing now uses the exact active Phaeno
organization named in the existing bootstrap configuration; other Phaeno
organizations are excluded, and missing/ambiguous routing fails with a controlled
message. The modal's error aligns with the form width and replaces generic
unexpected errors with retry guidance. Seven isolated backend cases, 25 frontend
cases and seven synthetic responsive dialog cases passed, plus build/typecheck
and scoped lint. The local API was reloaded successfully. The
[local run record](../testing/runs/2026-09-08-hs5y7db7-local-walkthrough.md)
retains the chronology and successful retry evidence. Exactly one logical
notification is recorded Sent; inbox receipt and physical fulfillment remain
to be checked.

## 2026-09-08 local implementation: Shipping container selector

A full-width native **Shipping container** selector sits at the top of shipment
detail, above the kit/preparation/scanning area. Options identify each active
sibling by container name/identifier, tube count and status, including pools with
remaining unallocated tubes. Cancelled siblings and empty pools are excluded.
Selection navigates directly within the same Job or Trial and replaces the
repeated bottom related-shipment list only on shipment detail; the owning
Lab/Trial lists retain their existing layout.

The scanner's route guard asks before discarding an unsaved barcode and blocks
navigation during a save. **Reset container configuration** is likewise disabled while local
barcode input is unsaved or saving, so reset cannot precede resolution of that
input. Discarding an unsaved entry is distinct from clearing a persisted scan:
historical scans continue to lock the whole plan.

Five focused selector cases passed. Final synthetic detail review passed six
viewport/theme cases in `artifacts/container-controls-review/review.json`,
including guarded switching and reset-to-pool navigation. These are not signed-in
Customer results. SHP-09 remains Not run.

## 2026-09-08 local implementation: Reset container configuration before scanning

Status: locally implemented and checked; connected manual acceptance Not run.
An organization or selected-Department administrator may use **Reset container configuration**
to return the entire order's prepared container plan to selection before scanning
starts. This is an order-wide reset, not removal of an isolated shipment.
The action sits beside the top **Shipping container** selector. Customer and Partner Lab
Jobs and authorized Trial shipment plans share this workflow. Eligibility is
read from the server; confirmation submits the reviewed shipment-family versions
and returns to the appropriate packing pool after success.

Acceptance criteria:

- Confirmation identifies the order and the number of affected containers and
  tubes, explains that the full plan returns to selection, and permits dismissal
  without changing anything.
- Finalized sample identities, total tube counts and global tube ordinals remain
  intact. Existing prepared shipments are retained as cancelled audit history;
  their tubes return to the unallocated selection without duplication or loss.
  Destination and handling separation remain intact across the resulting pools.
- No quote, accepted price, sample authorization, kit request or physical
  inventory movement is changed by resetting the plan.
- Any scan, physical-kit binding, packet, dispatch or receipt anywhere in the
  order's shipment family blocks the whole reset. Historical immutable scan
  events and ReturnKit/physical-kit links also block it even after current scan
  fields are cleared. Once scanning has started it cannot be undone to regain
  this action. The server enforces the rule as well
  as the UI, including work that starts after confirmation was opened.
- Stale versions and concurrent reset/scan/packing attempts cannot partly reset
  the order, duplicate tubes or replace a newer plan. Failure keeps the current
  state reviewable and provides a clear refresh/recovery message.
- Local unsaved barcode input or an in-flight scan disables Reset container configuration
  before any reset mutation can start. A saved scan permanently invokes the
  family-wide lock; clearing local input cannot undo its historical evidence.
- Test both the successful pre-scan reset and each blocking milestone on
  separate fixtures. The current walkthrough must not lose its prepared plan
  merely to demonstrate a negative case. SHP-09's reset variant remains Not run.

Customer, Partner and Prospect guides describe the supported entry points and
lock conditions. The focused backend checkpoint passed 61/61, including eight
reset cases. Reset UI 12 and detail 5 passed again after the final label/layout;
scanner 6, selector 5 and kit-panel 22 also passed their focused checkpoints.
Six synthetic detail browser cases verified guarded navigation and one reset
POST returning to the pool. No successful live Customer reset or physical workflow
is claimed; no schema change or EF migration was planned for this workflow.

### Kit ordering versus container scanning

The general **Transportation kits** ordering card belongs to unallocated
pool/preparation pages. Physical container pages show **Kit delivery** for an
outstanding Pending, PartiallyDispatched or Dispatched request, with tracking
and permitted receipt actions. Once delivery is resolved and preparation is
allowed, that card is hidden. Loading/error or blocked preparation still provides
an explanation/retry path; hiding the general ordering card never bypasses
receipt/scanning gates. Direct physical-container links do not reopen ordering.

## 2026-09-08 implementation: Customer transportation-kit ordering

The owner approved a short ordering flow from an accepted Customer Lab Job:
when no usable kits are recorded, Order transportation kits is the primary
action. It opens a confirmation prefilled with the recommended SKU/common name
and quantities plus the Customer/Department delivery location. Kits and outbound
delivery are included with the accepted laboratory order at no additional
charge. Confirmation creates a durable Job-scoped order in Phaeno fulfillment;
retries, multiple tabs and sibling sample shipments must not create duplicates.

The original implementation placed Order transportation kits and I already have
kits on one action row. The product correction above removes that existing-stock
alternative: kits must be ordered for this Job before preparation. Earlier
screenshots and verification counts describe the preceding implementation.

Delivery locations are Customer/Department-owned records managed from the
Customer/Department workspace, with bounded create/edit modals and a default
location. The order freezes the confirmed address and container revisions.
Missing address setup must be explicit; the general CRM address and Phaeno's
inbound sample destinations must not be silently substituted.

Customer helper text addresses the reader directly: "Phaeno will send your
department’s transportation kits to this address." The Phaeno staff view keeps
its operational description.

The location detail remains view-first. The page header keeps the **Actions**
menu, including **Edit location** and deactivation. The **Delivery address**
card spans the available content width. Permissions, bounded edit dialogs and
frozen request addresses are unchanged. SHP-02 records this layout check; it
remains Not run and does not alter prior verification results.

The confirmed fulfillment sequence is:

1. A new kit order queues one notification to the responsible Phaeno fulfillment
   recipient. A successful retry does not queue another notice.
2. Staff fulfill from registered compatible physical stock, using the order's
   frozen delivery address, and record carrier/tracking. Partial dispatch is
   supported and does not imply completion of every requested line.
3. Dispatched kits provisionally increase the Customer's recorded inventory as
   On the way. They do not count as usable stock yet.
4. The Customer acknowledges the kits actually received. Those kits become
   Available; receipt unlocks sample preparation and shipment using those kits.
   Partial receipt never makes undelivered kits available.

New request-linked kits enforce the receipt prerequisite on the server as well
as the screen. Existing legacy shipping data keeps its established workflow.
Unknown physical stock is distinguished from verified zero; duplicate ordering
is suppressed while the Job already has outstanding kit supply. Initial support
is scoped to accepted Customer Lab Jobs; no new Trial/Partner commercial terms
are inferred. General inventory corrections, cross-Job reuse, replenishment
thresholds and warehouse reservations remain in the broader scope below.

The ordering/dispatch/receipt slice is implemented locally. Initial fulfillment
notifications use the existing Phaeno administrator recipient routing; the
owner has not named a separate fulfillment recipient. Customer and Phaeno help
guides describe the implemented flow, and the 56-guide generated corpus is
current. General inventory functionality listed below remains separate.

The backend checkpoint passed 53 focused cases, including authorization and
Department isolation, frozen snapshots, duplicate/concurrent ordering and
notifications, partial dispatch/receipt, receipt-gated packing/scanning and
location-specific residual capacity. The solution builds without warnings or
errors. Customer/staff actual-component browser review passed 48 desktop/phone
and light/dark cases; focused component evidence is recorded in the frontend
test plan. No external delivery was exercised by those tests.

Migration `20260909013740_AddCustomerTransportationKitOrdering` was applied to
localhost `phaeno_ops` after isolated PostgreSQL verification. The generated ERD
is current and EF reports no model drift. Exact before/after evidence preserves
HS5Y7DB7's order state, nine samples, 18 tubes and existing shipment identities
and versions. The updated local API returns health 200, and signed-in Phaeno
Receipt & accession displays the new empty Kit requests queue alongside this
Job. No kit requests, customer addresses or stock records were invented for the
walkthrough. The next Customer acceptance step is to save a real Department
delivery location, return to the shipment and review the included-cost kit
order before confirming it. Mailbox and physical delivery/receipt acceptance
remain outstanding; no production deployment occurred.

### Test-plan coverage and walkthrough handoff

The [transportation-kit manual module](../testing/11-transportation-kits.md)
defines SHP-01–14 for this full sequence. The current local walkthrough resumes
at SHP-02 (Department delivery location) then SHP-03 (included-cost confirmation)
without changing HS5Y7DB7's finalized roster. Separate prepared fixtures cover
30 tubes, alternate sizes, partial supply, split samples, replay/conflict and
unauthorized operations. The [E2E plan](E2E-TEST-PLAN.md) links those role handoffs;
the [backend](BACKEND-TEST-PLAN.md) and [frontend](FRONTEND-TEST-PLAN.md) matrices
map current assertions and explicit gaps. All newly authored manual cases are
Not run; implementation checkpoint totals are not their acceptance results.
The [run template](../testing/RUN-RECORD.md) retains request, location, physical
kit, quantity, shipment and manifest evidence at each handoff. This documentation
update changes no implementation, test result, database or runtime.

## 2026-09-08 additional planning scope: transportation-kit inventory and fulfillment

Status after the Job-order correction: deferred inventory expansion. The
location balances and cross-Job reservation/reuse proposals in this section do
not authorize Customers to use general stock in the current workflow. Current
Customer orders require their own request, fulfillment and acknowledged receipt.
Revisit this deferred scope explicitly before replacing that product rule.

The owner requested this addition during implementation of container selection
and scanning. The ordering slice above supplies Job-scoped location records and
dispatch/receipt evidence. This section tracks the broader inventory scope:
cross-Job customer-location balances, reservations, corrections and automatic
order-driven replenishment are not supplied by standard-stock registration or
the initial transportation-kit ordering flow alone.

### Required product outcome

Phaeno must know which transportation kits it holds and which kits are available
at each customer location. When an order arrives, the workflow should identify
whether the customer needs kits and what Phaeno needs to fulfill. Inventory is
identified by container SKU/common name, with the physical kit and enclosed
permanent tube identities retained where registered.

### Inventory and movement requirements

- Track separate Phaeno stock locations and customer receiving/storage
  locations, within the appropriate organization and Department access scope.
  Do not treat one customer's stock as available to another location by default.
- Manage customer kit-delivery locations from the Customer workspace, owned by
  that Customer and linked to the applicable Department. Keep these distinct
  from the Phaeno receiving destinations used for inbound sample shipments.
- Distinguish available, reserved, outbound/in transit, received at the customer,
  consumed in a sample-return shipment, damaged/lost and adjusted quantities.
  Quantities in transit are expected supply, not confirmed stock on hand.
- Retain who recorded each movement, when, its source and destination,
  kit/SKU quantities and the related fulfillment/order references. Correct
  discrepancies through explained adjustments rather than rewriting history.
- Retain customer confirmation or the relevant evidence of receipt. Show the
  last confirmed balance and whether it needs reconciliation; unknown inventory
  is not zero and must not be presented as verified available stock.
- Reserve stock for a packing/fulfillment plan to prevent two orders from
  relying on the same kit. Release unused reservations when plans change or
  orders are cancelled. A partly filled returned container consumes that
  physical container; remaining unused tubes are a separate supply balance.
- Keep standardized kit definitions, assembled physical kits, individual tube
  supplies and physical shipping containers distinct. Record any split or
  reassembly of a kit explicitly so its original enclosed barcode roster is
  not mistaken for its current contents.

### Order readiness and fulfillment

1. At order intake, compare the anticipated transport need with compatible,
   unreserved stock at the customer's selected location. If exact tube counts
   are not yet known, label the check preliminary; quoted sample count is not
   automatically the final physical tube count.
2. Recheck when sample entry/finalization establishes the exact tube count and
   when destination, handling, available stock or packing selection changes.
3. Show a clear outcome: kits available, kits needed, kits on the way, or stock
   confirmation needed. Show required, available, reserved and shortfall
   quantities by SKU with links to the supporting inventory/fulfillment records.
4. Use the customer's usable stock to recommend a packing combination. When
   additional kits are required, determine the shortage and create or update
   one linked fulfillment work item rather than duplicate requests on refresh.
5. Phaeno reserves/picks registered kits, confirms the destination and records
   dispatch/tracking. Customer receipt moves supply into available stock at
   that location; the order readiness view reflects the same movement history.
6. Link later sample-return use to the supplied/reserved kit and decrement the
   correct inventory once. Preserve partial-order and multiple-shipment progress.

### Decisions and acceptance work for this scope

Define the supported customer-location model, who confirms customer balances
and adjustments, reconciliation rules and reservation expiry before this scope
is implemented. Do not infer a new kit charge, reorder fee, automatic outbound
shipment or transport policy from an inventory shortage.

Acceptance must cover stock at multiple customer locations, insufficient or
unknown stock, in-transit supply, simultaneous orders competing for stock,
partial dispatch/receipt, cancellations and released reservations, lost or
damaged materials, customer balance corrections and duplicate readiness checks.
Order-intake estimates must visibly become confirmed needs after exact tube
counts are available. Extend audience guides and living test plans alongside
implementation of these behaviors.

## 2026-09-08 product direction: container configuration and guided packing

Status: implemented locally on September 8, 2026. This section supersedes the
earlier requirement to prepare a separate kit from scratch for every order.
Phaeno may prepare standard stock in advance; Customers must still order the
kits for each Job under the product correction at the top of this plan.
Production release and a physical scanner/printer walkthrough remain separate
acceptance steps. Broader cross-Job location inventory and automatic
replenishment remain the additional planning scope above; the newer ordering
slice records only supply and receipt associated with the selected Job.

### Implementation checkpoint

The subsequent container-editor layout review aligns paired controls while
preserving helper text before inputs, groups dates/activation under Availability,
and places optional product details in Supplier and packing. Populated details
and validation errors open that section automatically. Twelve focused tests
and six desktop/phone/theme browser cases passed; the signed-in form was also
reviewed without changing the approved draft definitions.

Container row action menus size to their option text, with a viewport width
limit, so Preview recommendation remains readable without a cramped menu.

The approved **Adjust containers** editor replaces the all-size quantity fields
and separate allocation list with **Containers to use**, prepopulated as one
editable row per recommended container. Each row has a compatible size selector,
SKU/capacity, tube count and targeted Remove action. Size choices include the
smaller compatible sizes and the smallest size that covers the remaining need,
calculated from total tubes minus the capacities of the other selected rows.
If no size covers that need, consider all compatible sizes. Also exclude any
choice that makes an existing row redundant. **Add container** chooses the
smallest permitted fitting size, or the largest permitted size when none fits,
and is disabled once selected capacity covers the tube total. Three remaining
tubes offer only a 5 when sizes are 5/10/20. For 30 tubes with 10+5 already
selected, Add chooses 10, then 5; adding 20 would make the existing 5 redundant.
Changing or removing one row preserves the others' entered counts.
**Use recommendation** explicitly rebuilds the rows and their counts.

There are no manual availability fields or disclosure. Recorded-stock and kit
receipt guards remain automatic. A single compact **Summary** totals grid stays
in place during recalculation, with **Updating** inside the grid and confirmation
blocked until the current preview returns. Do not repeat its explanation,
container breakdown or capacity totals elsewhere in the dialog. Each container
remains one row on desktop and phone. Whole-number, capacity, total-allocation,
partial-supply and empty-shipment validation remain. The shared editor serves Customer, Partner
Lab and authorized Trial shipments without changing audience permissions or
commercial terms. This replacement passed 20 focused packing tests, TypeScript,
scoped ESLint and six synthetic viewport/theme cases. The final review is in
`artifacts/smart-container-review/review.json`; aligned inputs, no overflow and
0px pending-to-resolved Summary reflow were verified without real Customer
writes. SHP-09 remains Not run; these results do not verify the new order-wide
Reset container configuration reset.

- Phaeno can configure versioned container types with immutable unique SKUs,
  common names, usable tube capacities and controlled compatibility rules;
  preview recommendations; and explicitly deactivate future use.
- Standard stock kits can be prepared, registered with permanent tube barcodes
  and dispatched for an authorized Job. The first Customer scan binds the
  dispatched physical kit to a compatible return shipment, using the existing
  fulfillment safeguards. Required ownership relationships remain intact.
- Preparation recommends the fewest containers and then the least unused
  capacity. The current editor permits smaller needed sizes, such as six 5s
  or three 10s for 30 tubes, while filtering oversized/redundant additions.
  The earlier backend checkpoint also exercised 15+15 in two 20s; that remains
  historical API evidence, not a current editor option with 5/10/20 configured.
  No API contract changes with this UI restriction. Empty containers create no
  shipments; a shortfall stays in an explicit packing pool.
- Physical tube identities and sample ordinals survive allocation across
  shipments. Inline scans save before advancing, retain errors on the current
  tube, and show readable values with Code 128 graphics. One stock kit cannot
  bind to two shipments and a registered tube cannot be reused or duplicated.
- Each immutable manifest includes order, shipment, sample and physical tube
  barcodes, its selected container facts, and separate references/counts for
  tubes in other shipments or still unallocated. Packet corrections retain
  the prior voided revision. Receipt resolves the current shipment manifest
  and records each physical tube independently, with shipment and order totals.
- Existing fulfilled kits remain usable. Repacking after a kit is bound or
  a tube is assigned is blocked; existing explicit tube-correction safeguards
  remain available before physical receipt. Unused tubes from a partly filled
  returned kit are not yet a reusable customer inventory balance.

Verification: 44 focused backend cases passed, including real PostgreSQL
transactions, concurrent packing and kit binding, invalid/cross-scope scans,
custom allocations, current/void manifest lookup and partial tube receipt.
Source-specific lists retain all 261 packages in the large-order regression.
Completing a residual pool preserves earlier container identities. Complete
physical receipt reconciles shipment status even when Customer dispatch was
not recorded, without inventing carrier facts. Legacy whole-sample endpoints
redirect Lab-owned shipping samples to the authoritative Lab workflow while
preserving their existing behavior for unowned legacy samples.
The additive migration
`20260908234930_AddSampleShippingContainerPackingAndStock` was applied only to
the verified local `phaeno_ops` database. Before/after evidence confirms the
walkthrough Job HS5Y7DB7 retains exactly its original 9 samples, 18 tubes,
IDs, versions and Preparing shipment. Temporary test databases were removed
and synthetic notification counts were zero. See the living backend, frontend
and E2E test plans for detailed evidence and remaining acceptance boundaries.

Initial implementation seeded no container sizes, stock kits or Customer
shipments. In the subsequent September 8 walkthrough, the owner explicitly
requested three sizes and approved these internal SKUs/common names:

| SKU | Common name | Tube capacity | Local state |
| --- | --- | --- | --- |
| TRANS-20 | 20-tube transportation kit | 20 | Active, revision 2; original draft retained |
| TRANS-10 | 10-tube transportation kit | 10 | Active, revision 2; original draft retained |
| TRANS-05 | 5-tube transportation kit | 5 | Active, revision 2; original draft retained |

All three were saved through the signed-in configuration screen against the
existing Reference extracted RNA / Reference receiving rule. The continued
local walkthrough encountered no eligible sizes because they were drafts;
active revision 2 was then created for each size, preserving revision 1.
Supplier details and additional packing instructions remain unspecified.
These are local test definitions, not physical stock or an assertion that
materials/scanners have been qualified. Stock preparation remains a later
walkthrough step; the owner's Job and sample records were not changed by
configuration.
The signed-in Phaeno preview for 18 tubes and the Reference handling context
returned one TRANS-20 container, 18 assigned tubes and 2 unused slots. Customer
screen refresh/review remains the next acceptance step; the connected Phaeno
session cannot enter the Customer shipment workspace directly.

### Confirmed product requirements

- Supply standard kits with permanently barcoded tubes instead of configuring
  the contents of every outbound kit from scratch for each order.
- Support multiple shipping-container sizes. Phaeno maintains those sizes and
  their usable tube capacities in a configuration screen. Customer preparation
  recommends a size or combination of sizes for the tubes being shipped.
- Every container type has a required SKU number and common name. Identify the
  recommended/selected physical kit using both values, together with capacity.
- Container recommendations are advisory. Customers can select the compatible
  sizes and quantities they actually have, including more containers or more
  spare capacity than the default recommendation. A valid alternative needs no
  exception approval or justification.
- An order can require multiple shipments according to tube count, container
  capacity and applicable handling requirements. Each physical shipping
  container has its own shipment identity and manifest.
- The Customer works down the sample list, scanning each physical tube. Each
  successful assignment displays the exact scanned value with its barcode
  graphic beside it. A sample with several tubes has several tube assignments.
- Print an order barcode, a shipment barcode and a barcode identifying each
  sample in that shipment. Preserve the distinct permanent identity of every
  tube; a sample identifier does not replace its individual tube barcodes.
- Tubes from the same sample MAY occupy different shipping containers. Sample
  co-location is not a packing requirement or a reason to reject a valid plan.
  This supersedes the earlier discussion recommendation to keep them together.
- A split-sample manifest identifies the sample's total tube count, the tubes
  inside this container and the other shipment references/counts. References
  to other containers are separate from this manifest's physical contents.

### Configuration screen

Extend POMS **Order configuration > Sample shipping** with **Container sizes**.
Use a discovery list, a dedicated view-first record and bounded create/edit
dialogs following the shared record-management policy. Restrict management to
the existing authorized Phaeno configuration users.

Each container definition records:

- required unique SKU number, preserved as an identifier rather than a numeric
  quantity (including any leading zeros, letters or separators);
- required common name used as the primary customer-facing label;
- positive whole-number usable tube capacity for the supported tube/packing
  configuration, accounting for the required packing materials;
- compatible tube/sample definitions and handling profiles, reusing the
  controlled shipping rules rather than relying on free-text matching;
- supplier/product reference and packing instructions where applicable;
- active/effective revision and display order.

Actual names, capacities and compatible packing configurations are operational
inputs supplied by Phaeno. Do not seed invented capacities or infer usable
capacity from exterior dimensions. New definitions default to inactive.
SKU uniqueness applies to the container type across its revisions; the SKU is
distinct from an optional supplier's product number. Display common name, SKU
and capacity in the configuration list, packing recommendation and selection.
Include the chosen container's common name and SKU on its manifest.
Version changes must not rewrite the container facts frozen on an existing
confirmed shipment or printed manifest. A standard definition, a physical kit
and a Customer's sample-return shipment remain distinct records/concepts.

Include a **Preview recommendation** action so Phaeno can enter a tube count
and applicable sample/handling context, optionally limit the available quantity
of each size, then see the recommended containers, allocation, spare capacity
and explanation before activating a definition.
Preview is read-only; it does not create kits, reserve stock or create shipments.

### Preparation and recommendation behavior

The recommendation policy below is the implemented default, not a claim that
package count is a proxy for shipping cost:

1. Resolve the unallocated physical tubes for the selected dispatch. Count
   tubes, not unique samples, and honor destination/handling separation rules.
2. Consider only active, effective, compatible container definitions. Capacity
   alone cannot make an incompatible container eligible. Apply recorded-stock
   and kit-receipt guards automatically; the editor has no manual availability
   inputs. Selected rows do not establish unrecorded inventory or change global
   configuration.
3. Prefer the fewest containers that accommodate those tubes; among equally
   sized sets, prefer the least unused tube capacity and use a stable tie-breaker.
   Do not claim a cheapest option without a separately defined cost model.
   Recorded stock is not a requirement to use every container on hand.
4. Explain the recommendation in plain language, showing each container's size,
   assigned tubes and capacity. **Adjust containers** opens individual rows with
   compatible size selectors and tube counts. **Add container** and each row's
   Remove action change the selected containers without resetting other rows.
   Filter choices and Add by the remaining-capacity and existing-row rules above.
   **Use recommendation** explicitly rebuilds the rows. Another permitted plan
   needs no separate approval. Show tubes, containers, usable capacity, unused
   slots and unallocated tubes once in the stable Summary grid. Recalculate on
   change, keep an in-grid Updating indicator, and require the latest preview
   before confirmation. Capacity, stock and duplicate-allocation guards remain.
5. After the user confirms the actual containers, scan through the sample/tube
   rows in the active shipment. Save successful scans before advancing focus;
   keep failures on the current row with an actionable message. Show progress
   per shipment and across the order without requiring a modal for every tube.
6. Review and confirm each shipment's contents before printing its manifest.
   A partly filled container is valid when its declared contents are complete;
   unused slots do not create expected samples or expected returns.

The owner's example is 30 tubes with configured compatible container sizes of
20, 10 and 5. Current editor examples are:

| Containers selected | Example tube allocation | Unused capacity |
| --- | --- | --- |
| One 20 and one 10 | 20 + 10 | 0 |
| Three 10s | 10 + 10 + 10 | 0 |
| Six 5s | 5 + 5 + 5 + 5 + 5 + 5 | 0 |

The first is the default recommendation. Smaller needed sizes remain selectable,
including six 5s. With all three sizes configured, two 20s for 30 tubes is
superseded: a 10 covers the remaining need after the first 20. The earlier
15+15 alternative remains historical backend/print evidence only. These are
acceptance examples, not seeded product records.
Unused capacity means empty permitted slots, not missing sample tubes; it is
also distinct from any actual unused supply tubes remaining in a physical kit.

If the chosen compatible containers cannot hold every tube selected for this
dispatch, show the exact shortfall and leave the plan incomplete. Do not invent
additional available containers or silently omit tubes. A container whose own
declared contents are complete can be prepared independently; outstanding
tubes remain explicit on the order and in applicable split-sample references.
Unused or empty selected containers do not become empty shipments/manifests.

Configuration revisions or a changed recommendation must not silently move
already assigned tubes, alter a dispatched shipment or change accepted sample
counts/pricing. Repacking before dispatch must explicitly reconcile affected
assignments and invalidate/reissue affected manifest revisions as appropriate.

### Manifest and receiving acceptance criteria

- Each physical tube is allocated to at most one active shipment. Duplicate,
  unknown, ineligible and already-used barcodes cannot advance scanning.
- Order, shipment, sample and tube identities remain distinct and unambiguous.
  Scanning a printed identifier resolves its context; it is not proof that the
  corresponding physical material arrived.
- Each manifest lists only its container's contents, with readable identifiers
  and scannable graphics. A sample spanning shipments shows, for example,
  "2 of 4 tubes in this shipment" and references the remaining allocations.
- If remaining tubes are not yet assigned to a shipment, communicate that
  explicitly instead of inventing a shipment reference. The printed statement
  reflects the confirmed manifest revision; the Portal shows current progress.
- Sample and order receipt summaries aggregate physical tubes across shipments
  without treating the first package received as receipt of the entire sample.
  This does not define a new scientific rule for when laboratory work may start.
- Scanning is keyboard-friendly and resumable, with visible focus, accessible
  success/error feedback and usable desktop/mobile layouts. Test long sample
  lists, multiple tubes per sample and multiple containers without page growth.
- Before implementation is declared complete, cover exact fit, partial fill,
  mixed sizes, user-selected alternatives, limited/zero availability, an exact
  capacity shortfall, no eligible container, inactive/revised definitions,
  concurrent assignment, split samples, partial receipt and stale/reissued
  printouts in the owning automated and manual verification plans.

### Remaining operational inputs and acceptance

Customer finalization retains a single unallocated roster initially; guided
packing allocates its physical tubes into separate container shipments. The
legacy return-kit ownership model remains intact, with standard stock recorded
separately and bound through the existing fulfillment rules. Printed manifests
now include the requested distinct order, shipment, sample and tube graphics.

Actual container specifications and the policy for customers holding unused
kits/tubes for future orders remain operational inputs. The inventory and
fulfillment scope above will add confirmed location balances, reservations and
order-driven shortages. Current availability entries are user-supplied planning
limits only. Sample splitting is settled and must not be reopened as a
mandatory co-location rule. Customer, Prospect, Partner and Phaeno guides
describe the implemented workflow; physical packing, representative barcode
scanners/printers and the real materials still need operational acceptance.

## 2026-09-07 follow-up consistency review

Packet confirmation distinguishes unique samples from tube slots. Packet issue
failures remain visible inside the confirmation dialog with entered values
preserved; opening a fresh attempt clears the earlier failure. Tube corrections,
packet replacement and shipment updates invalidate the retained packet preview.
The print page verifies the current revision on entry and withholds printable
content while loading, offline or failed. It labels the confirmed revision and
offers return/retry recovery. Shipment detail also links to the authorized list.
Focused regression source covers those cache, count and failure cases; automated
suites and physical packet/scanner acceptance were not run in this review.

Keep this file updated as external sample-shipping, printable packet, and
pre-receipt intake requirements are supplied and decisions are made.

Do not execute this plan unless implementation is explicitly requested. This
plan does not authorize a dependency, schema, migration, authentication,
deployment, production activation, carrier integration, or physical laboratory
procedure change.

## Status

- Customer sample shipping was placed inside the owning Lab service job UI on
  2026-08-20. Customer primary navigation and dashboard no longer present it as
  a peer workspace; Prospect shipping is linked from the Trial Project detail
  workspace and retains its shared packet routes. The shared shipment records, packet routes,
  and authorization boundaries remain separate underneath.
- Product direction was approved for planning on 2026-08-17.
- Phase 1 shared configuration and packet foundation was implemented on
  2026-08-17. It includes versioned destination, sample-type, and instruction
  records; compatibility preview; shipment and immutable packet persistence;
  checksummed packet barcodes; a read-only scan lookup tied to the stable Lab
  work reference; and Phaeno configuration and Order Intake surfaces.
- Migration `20260817192259_AddSampleShippingFoundation` was generated and
  applied to the confirmed local development database. No shared, staging, or
  production database was changed.
- The supplier-barcode workflow was implemented on 2026-08-18. POMS now stores
  return-kit product and outbound tracking facts, globally unique registered
  supplier tubes, tenant-scoped tube-to-sample assignments and append-only
  correction history, packet-frozen crosswalks, retained CSV/print views,
  read-only packet-plus-tube comparison scans, and submitted-container adoption
  of the registered supplier barcode without printing a second tube label.
  Derived containers continue to receive POMS-generated barcodes.
- Migration `20260818221045_AddRegisteredSampleTubeWorkflow` was generated and
  applied only to the confirmed local `phaeno_ops` development database. No
  shared, staging, or production database was changed.
- Phase 1 intentionally seeds no real destination or scientific shipping
  instruction. New configuration defaults to inactive, and production use
  still requires the Phase 0 operational content and physical validation gates.
- The immediate product need is a Prospect Trial Project: after the approved
  Trial Project is accepted, the Prospect must be able to prepare samples,
  print a detailed shipping packet with a barcode, include the submission
  manifest in the package, and ship the package to Phaeno. Phaeno must be able
  to scan the packet barcode and identify the exact authorized work before
  recording receipt.
- The same operational shipping and intake capability must also support a
  future Customer promotional no-charge order, informally called a freebie.
  The shared operational capability does not collapse the two parent workflows:
  a Customer freebie remains an order, while a Prospect Trial Project remains a
  separately approved project and is not an order, quote, or invoice.
- Multiple active Phaeno ship-to destinations and multiple controlled sample
  types are in scope from the beginning. One Trial Project or freebie may
  therefore produce more than one physical shipment packet when destinations
  or handling requirements are incompatible.
- Current software provides the distinct pre-receipt packet barcode, external
  printable packet and retained crosswalk, immutable packet-issuance service,
  and read-only Order Intake packet-plus-tube comparison. No owning Trial
  Project or Customer promotional workflow creates an authorized shared
  shipment yet, so those parent authorization and issuance paths remain later
  phases.
- Product direction was refined on 2026-08-18: the initial return kit should use
  Phaeno-supplied tubes with permanent manufacturer barcodes. Phaeno registers
  the tubes to the outbound kit, and the external organization must associate
  each tube barcode with its own non-PHI Customer sample identifier in the
  Portal before shipment. Phaeno owns preserving and returning that crosswalk;
  the external organization owns the scientific meaning of its identifier in
  its own records.
- Product direction was extended on 2026-08-22 to normal paid Customer Lab
  Service jobs. Pricing and acceptance precede all sample entry. A finalized
  post-acceptance roster creates the initial specimen-specific Lab
  authorization and shared shipment. One declared specimen may use multiple
  submitted tubes; each physical tube receives its own registered supplier
  barcode assignment while retaining one specimen identity and accession.
- Product direction was confirmed on 2026-08-27 that physical receipt before
  quote acceptance and exact roster finalization is not a supported Customer
  order path. An unexpected package is quarantined and escalated under an
  approved laboratory receiving and custody procedure without creating or
  attaching to a Job receipt, accession, billable event, or executable work.
  POMS reconciliation of unmatched material is deferred until a separately
  approved unmatched-receipt workflow exists.
- Trial Project work is RUO and accepts no PHI. Trial instructions, manifests,
  shipment confirmation, and retained crosswalks use only non-PHI identifiers
  and preserve the versioned RUO/no-PHI affirmation required by the owning
  Trial Project.
- Trial residual-material return is not a reuse of the inbound shipping packet.
  When return was approved before the first sample shipment, the Trial Project
  freezes the return destination, handling requirements, and shipping payer;
  Lab Operations owns the later physical return and disposition record.
- The preferred pilot tube candidate is the Corning 2 mL external-thread vial
  `8676` with a permanent side 1D barcode (Fisher `07-200-963`). Corning `8671`
  (Fisher `07-200-961`) adds a synchronized bottom 2D barcode and remains the
  automation-oriented alternative. The Therapak `37806` frozen shipper (Fisher
  `22-130-029`) remains the preferred pilot package. These are procurement and
  bench-validation candidates, not approved production materials; availability,
  exact fit, returned RNA volume, seal, scanning, freezing, and dry-ice handling
  must be confirmed with representative units.
- The shared software now implements supplier-tube registration, external
  assignment and correction, retained crosswalks, comparison scanning, and Lab
  adoption. The 2026-09-05 Trial integration now creates authorized shipments
  from accepted, in-scope Trial sample submissions. Customer promotional order
  issuance remains owned by its separate plan. First-destination and physical
  acceptance remain activation gates.
- The 2026-08-18 completion pass added atomic pre-shipment correction after
  packet confirmation: POMS requires a correction reason, voids the prior
  packet, and issues a new immutable packet revision with the corrected frozen
  crosswalk. Backend, frontend, production-build, and mock-session browser
  regression gates pass. Authenticated parent-workflow, database-backed HTTP,
  and physical bench acceptance remain intentionally open below.
- The 2026-08-18 database/controller integration pass now exercises the shared
  configuration, return-kit, registered-tube, assignment/correction, immutable
  packet, comparison-scan, tenant-isolation, concurrent-issue, and Lab
  supplier-barcode-adoption path against the local PostgreSQL development
  database. It also corrected EF persistence state for newly registered tubes
  and packet revisions by explicitly adding those UUID-keyed records. The
  three new PostgreSQL reference journeys pass. Real ASP.NET middleware/JWT
  acceptance remains tied to an implemented parent authorization workflow.
- The existing physical printer, scanner, label-stock, and degraded-mode
  validation gate remains binding. Planning or browser rendering alone cannot
  authorize production use.
- The current public Irvine address and general Phaeno email were verified on
  2026-08-18 and recorded in `docs/sample-shipping-operational-content.md` as
  an inactive destination candidate with an appointment-only control. The
  public evidence does not establish specimen-receiving authorization, a
  receiving contact, or receiving hours, so the candidate is not seeded or
  active and cannot appear on a customer packet.

## Related Documents

- `PROSPECT-TRIAL-PROJECT-PLAN.md` owns Prospect qualification, dual approval,
  Prospect acceptance, frozen trial scope, access, conversion, and Trial
  Project lifecycle.
- `ORDER-MANAGEMENT-PLAN.md` owns Customer promotional and ordinary commercial
  orders, pricing treatment, commercial snapshots, and Customer-visible order
  history.
- `LAB-OPERATIONS-PLAN.md` owns physical receipt, accessioning, authoritative
  container barcodes, physical lineage, execution, and scientific approval.
- `FILE-MANAGEMENT-PLAN.md` owns the released-package receipt that carries the
  frozen non-PHI Customer sample identifier, original submitted-tube barcode,
  and Phaeno accession mapping forward to each applicable result file.
- `LAB-OPERATIONS-CONTRACT.md` owns the existing provider-neutral authorization
  boundary for a Commercial order or approved Trial Project.
- `LAB-OPERATIONS-BENCH-VALIDATION.md` owns physical printer, scanner, stock,
  label, degraded-mode, and operator acceptance evidence.
- `CRM-PLAN.md` and `STANDALONE-COMMERCIAL-LIFECYCLE-PLAN.md` own the
  first-party CRM Trial Project request and relationship-safe commercial
  visibility. `HUBSPOT-PORTAL-LIFECYCLE-PLAN.md` is a deferred historical
  adapter reference.
- `BACKEND-TEST-PLAN.md`, `FRONTEND-TEST-PLAN.md`, and `E2E-TEST-PLAN.md` track
  deferred verification coverage.

## Purpose

Provide one safe, repeatable operational flow from an approved external
sample-submission authorization to physical receipt:

1. resolve the permitted sample types, destinations, and detailed instructions
2. group expected samples into compatible physical shipments
3. freeze one versioned instruction and destination snapshot per shipment
4. print a carrier-agnostic ship-to label and internal submission manifest
5. identify the shipment with one human-readable, scanner-safe Phaeno packet
   barcode
6. register each Phaeno-supplied tube barcode and associate it with exactly one
   expected Customer sample identifier before shipment
7. scan the package at Phaeno and resolve it to the exact Trial Project or
   Customer freebie plus its existing Lab work authorization
8. scan and match each registered tube, accession it, and adopt its permanent
   supplier barcode as the authoritative physical identity of that submitted
   container; POMS continues to allocate its own barcodes for derived containers

The barcode on the shipping packet identifies the physical package and its
expected contents. It is not a specimen accession, container barcode, carrier
postage label, result identifier, or substitute for matching each physical
sample safely.

## Product Terminology

| Term | Meaning |
| --- | --- |
| Customer promotional no-charge order | A true Customer order placed under an explicit Phaeno promotional authorization. It remains an order even though nothing is due. |
| Prospect Trial Project | A no-charge, approved, closed-ended Prospect project. It is not an order, quote, invoice, or general Prospect ordering permission. |
| Submission authorization | The owning Customer freebie order or accepted Trial Project that permits the listed samples to be shipped and processed. |
| Sample return kit | The empty shipper, registered pre-barcoded tubes, instructions, and related materials Phaeno supplies before sample return. Its outbound fulfillment and tracking are distinct from the later sample shipment back to Phaeno. |
| Sample shipment | One planned physical package sent by one organization to one snapshotted Phaeno destination under one compatible handling profile. |
| Shipping packet | The printable output for one sample shipment: the outward-facing ship-to label/instruction page plus the internal submission manifest. |
| Ship-to label | A carrier-agnostic destination label produced by the Portal. It does not purchase postage or replace a carrier's tracking label. |
| Submission manifest | The sheet placed inside the physical package. It lists the packet identity and expected, non-PHI sample facts needed for intake. |
| Packet barcode | The unique Phaeno barcode for one sample shipment. It opens the intake context but does not itself record custody. |
| Customer sample identifier | The external organization's human-readable identifier for one expected sample. It remains a reference rather than Phaeno's physical identity. |
| Registered supplier tube barcode | The permanent manufacturer-applied barcode on a Phaeno-supplied return tube. Phaeno registers it to an outbound kit before use; the external organization then maps it to one expected sample. |
| Tube-to-sample crosswalk | The durable mapping between one registered supplier tube barcode and one Customer sample identifier. Phaeno preserves it in Portal history and the packet manifest so the customer and Phaeno can reconcile the same physical tube without exposing PHI. |
| Phaeno container barcode | The authoritative physical barcode POMS assigns or adopts for a container at accession. A registered supplier barcode is adopted for its submitted tube; POMS-generated barcodes remain the default for aliquots, libraries, and other derived containers. |

## Authorization Sources

### Prospect Trial Project

- Sales requests the Trial Project from the first-party POMS CRM.
- The required commercial and scientific/operations approvals freeze the trial
  package, sample-type allowances, per-type and total sample limits, submission
  window, eligible destination rules, analyses, deliverables, and access term.
- The Prospect organization administrator explicitly accepts the no-charge
  Trial Project terms before any shipment can be made ready to print.
- The Prospect submits only samples allowed by the accepted, active Trial
  Project. Submission never grants normal order placement or another trial.
- There is no quote, invoice, payment gate, or QuickBooks transaction by
  default. Estimated retail value and anticipated internal cost remain on the
  Trial Project for approval and conversion analysis.
- The accepted Trial Project authorizes work through the existing Lab Operations
  provider instead of creating a second laboratory execution path.

### Customer Promotional No-Charge Order

- Phaeno grants a named Customer an explicit, bounded promotional authorization.
  It is not a public coupon, an organization-wide permanent free-order option,
  or a price field the Customer may edit.
- The grant freezes the permitted service, analyses, sample-type allowances,
  per-type and total sample limits, submission window, eligible destination
  rules, sponsor/campaign, estimated retail value, and anticipated internal
  cost.
- A Customer organization administrator completes the permitted sample facts,
  reviews **No charge - sponsored by Phaeno**, and places the order. Placement
  consumes the grant exactly once and atomically authorizes the Lab work.
- The order records a zero amount due and has no payment release gate. Whether
  Finance requires a zero-dollar QuickBooks representation remains a separate
  product decision; the Portal must not manufacture an invoice merely to make
  the workflow look commercial.
- Ordinary paid Customer orders do not enter this promotional path merely
  because a line price is zero.

## System Ownership

### Commercial Operations Owns

- Trial Project and Customer freebie authorization state
- externally visible expected-sample declarations
- controlled sample-type and sample-shipping configuration
- Phaeno ship-to destinations and their versioned operational instructions
- outbound return-kit fulfillment, registered supplier tube inventory, and the
  externally reviewed tube-to-sample crosswalk
- shipment planning, packet allocation, instruction resolution, and immutable
  packet snapshots
- external print, shipment, carrier, tracking, and Customer/Prospect-safe status
- mapping a packet to its authorization source and Lab work order
- Customer/Prospect-visible exception wording and notification

### Lab Operations Owns

- confirmation of physical receipt and custody
- matching the physical contents to the expected shipment items
- unexpected, missing, damaged, unsafe, or ambiguous intake disposition
- accession identity, initial physical container creation, adoption of a
  qualified registered supplier barcode for its submitted tube, and allocation
  of Phaeno barcodes for derived or replacement containers
- container, aliquot, and derived-material lineage
- internal location, operator, bench notes, execution, and scientific decisions
- residual-material retention, exhaustion, return, destruction, and actual
  operator-confirmed disposition

The scan handoff may open the existing Lab work order, but Commercial must not
write Lab receipt or accession records and Lab must not rewrite a Trial Project,
freebie order, return-kit membership, customer-reviewed tube crosswalk,
destination, instruction, or packet snapshot.

An approved residual-material return is a separate Phaeno-to-Prospect shipment.
It must not reuse the inbound packet number, packet barcode, carrier facts, or
custody events. The Trial Project supplies the frozen destination, handling,
and payer terms; Lab Operations records the outbound material, custody,
tracking, and final return disposition. Exact return packaging and carrier
instructions remain part of production Lab activation.

## Shipping Configuration

Add **Sample shipping** to the Phaeno-only Order Configuration workspace. The
setup is structured and versioned; it must not be another opaque JSON or one
global free-text instruction field.

Phase 1 treats these small configuration dictionaries as bounded records inside
one Order Configuration subject: form-free current-revision lists, expandable
read-only revision history, and create/revise modals. This is a recorded
exception to a dedicated route because each revision has no workflow beyond its
effective state and linked combination rule. If audit, approval, or linked-rule
complexity grows, promote the record to the standard dedicated detail workspace
without changing its API identity. The existing
`CanManageOrderConfiguration`/platform-administrator boundary remains the
initial management authority. Every create, revision, activation, and
retirement is audited and concurrency protected.

### Ship-To Destinations

Each destination records:

- stable system identifier and human-readable name/code
- recipient or department and optional attention line
- organization/laboratory name
- address lines, city, region, postal code, and country
- receiving phone and operational email when required
- receiving days/hours, timezone, closure/holiday notes, and appointment rules
- carrier/service restrictions and delivery instructions
- supported regions/countries and international-shipping posture
- supported sample types and handling capabilities
- safety, hazardous-material, dry-ice, and temperature capabilities
- customer-visible arrival contact and exception instructions
- effective dates, active/retired state, version, and audit history

Destinations are Phaeno-controlled. A Prospect or Customer may select only from
destinations made eligible by the frozen authorization and current shipment
rules; external users cannot type an arbitrary Phaeno ship-to address.

### Sample Type Definitions

Each controlled sample type records:

- stable system identifier, name, description, and active/retired state
- material class and customer-facing terminology
- permitted primary container and closure requirements
- minimum/maximum quantity or volume and unit rules
- concentration or other intake facts when scientifically required
- ambient, refrigerated, frozen, or other temperature requirements
- stabilizer/preservative requirements
- primary, secondary, leakproof, absorbent, and outer-packaging steps
- dry-ice, cold-pack, or other pack-out requirements
- tube labeling requirements and prohibited identifiers
- biohazard/safety declaration and prohibited-material rules
- allowed destinations, geographic restrictions, and carrier constraints
- expected transit window and dispatch/delivery timing rules
- sample-type-specific rejection and support guidance
- version and audit history

The initial Trial Project may still allow only extracted RNA, but the model and
setup must support multiple controlled sample types without a schema redesign.
Adding a type does not make it eligible for an existing Trial Project or
freebie; the owning authorization must explicitly include it.

### Destination and Sample-Type Instruction Rules

A versioned instruction rule joins a destination to one or more compatible
sample types and records:

- detailed step-by-step packing instructions
- destination-specific variations from the sample-type defaults
- temperature and pack-out instructions
- label placement and package-marking instructions
- approved carrier/service guidance and prohibited services
- dispatch-day, transit-time, and delivery-window guidance
- required supporting documents and declarations
- international/customs wording when approved
- contact and recovery instructions for delays, damage, or temperature events
- incompatibility and mandatory split-shipment rules
- effective dates, priority, active/retired state, and audit history

Instruction resolution uses this order:

1. frozen Trial Project or Customer freebie scope
2. selected destination version
3. each selected sample-type version
4. the active destination/sample-type combination rule
5. an explicitly approved authorization- or shipment-specific override

The resolver must produce one unambiguous instruction set. It blocks packet
generation when required facts are missing or selected sample types conflict.
It never silently chooses between incompatible temperature, destination,
carrier, hazardous-material, or timing rules.

## Multiple Destinations and Sample Types

- One submission authorization may contain multiple sample types and multiple
  sample shipments.
- One sample shipment has exactly one ship-to destination, one instruction
  snapshot, and one packet barcode.
- Compatible sample types may share one shipment only when the resolved rule
  explicitly permits the same destination, temperature, packaging, carrier,
  timing, and safety treatment.
- Incompatible samples must be split into separate shipment groups. The Portal
  explains the conflict and creates a separate packet for each permitted group;
  it does not ask the external user to guess how to combine them.
- One expected sample belongs to only one active shipment at a time. Moving it
  before shipment voids the old packet revision and issues a new one; moving or
  deleting it after receipt is prohibited.
- A Trial Project or freebie may restrict the eligible destination more tightly
  than the general sample-type setup.
- Configuration changes never rewrite an approved scope, planned shipment, or
  printed packet. A material change uses an audited amendment and, when
  necessary, a newly issued packet barcode.

## Shared Shipment Workflow

1. The external organization opens its accepted Trial Project, placed Customer
   promotional order, or price-accepted Customer Lab Service job and reviews
   the approved sample allowance.
2. The organization administrator declares each sample using the allowed
   sample types and required metadata. The Customer sample identifier is unique
   within the owning authorization and must not contain a patient name, medical
   record number, date of birth, or other prohibited PHI. A normal paid Lab
   Service job supports manual entry or validated CSV import only after price
   acceptance.
3. The Portal validates allowance, submission window, sample facts,
   destination eligibility, and instruction compatibility.
4. Finalizing the roster freezes its declared specimen and tube counts, creates
   or confirms the specimen-specific Lab authorization, and creates the
   compatible planned shipment groups. One tube slot is created for each
   physical tube declared by a sample.
5. Phaeno assembles each outbound return kit and scans every permanent supplier
   tube barcode into the kit record. The required tube count is derived from
   the shipment's tube slots and cannot be manually changed. A tube may belong
   to only one active kit, shipment, or expected tube-slot assignment.
6. For each tube slot, the administrator scans the side barcode on one Phaeno-
   supplied tube or enters its complete human-readable value. The Portal
   verifies that the tube belongs to the active kit, is unused, and is not
   assigned to another slot, then displays the resulting Customer sample
   identifier-and-slot-to-tube barcode crosswalk for explicit review.
   For a Trial Project, shipment confirmation also requires the current
   versioned RUO/no-PHI affirmation.
7. The Portal groups compatible samples into one or more proposed shipments.
   The user reviews the samples, destination, and detailed instructions before
   confirming each shipment.
8. Confirmation freezes the destination, sample-type versions, resolved
   instructions, expected sample list, tube-to-sample crosswalk, and
   authorization reference in an immutable packet revision.
9. POMS allocates one unique, checksummed, Code 39-safe packet barcode and a
   human-readable packet number. The packet barcode is never reassigned.
10. The user prints or downloads a retained customer copy of the crosswalk and
   shipping packet, follows the instructions, places the submission manifest
   inside the package, applies the ship-to label, and adds the carrier's
   postage/tracking label separately. The normal workflow requires no
   customer-printed or handwritten tube label.
11. The user may record carrier, tracking number, and ship date. These facts do
   not change the frozen instructions or expected contents.
12. At Phaeno, an operator scans or manually enters the packet barcode. The scan
   resolves the exact authorization, organization, destination, expected
   samples, registered tube barcodes, packet status, and existing Lab work order
   without changing state.
13. The operator confirms the physical package, scans each tube, and compares
    the physical contents with the frozen crosswalk before recording receipt.
    An unknown, duplicate, missing, unexpected, unreadable, or mismatched tube
    stops automatic intake and opens the approved exception path.
14. Accession creates one authoritative specimen accession and one submitted-
    container record for each received physical tube. Every container adopts
    its registered supplier barcode as its authoritative physical identity and
    links to the same specimen when multiple tubes contain that specimen. The
    operator verifies each scan under the approved bench procedure; no second
    barcode label is added in the normal submitted-tube path. Derived containers
    continue to receive POMS-generated barcodes.

## Printable Shipping Packet

The initial print action produces a full-page, carrier-agnostic shipping packet
suitable for ordinary US Letter or A4 printing. A future 4-by-6-inch or direct
carrier-label format requires separate printer and layout validation.

### Ship-To Label and Detailed Instruction Page

The outward-facing page includes:

- Phaeno name and approved branding
- complete snapshotted ship-to name, attention line, address, and receiving
  contact details
- large packet barcode and human-readable packet number
- parent authorization type and safe reference: **Prospect Trial Project** or
  **Customer promotional order**
- prominent temperature, time-sensitive, orientation, fragile, dry-ice,
  hazardous-material, or other approved handling callouts
- the resolved detailed packing and shipping instructions, including container,
  secondary packaging, absorbent, temperature, carrier/service, dispatch day,
  delivery window, and exception-contact requirements
- a statement that Phaeno's label is not postage and that the sender must apply
  the carrier's tracking label
- issue/version date and page numbering

The detailed instructions may continue below a detachable address area rather
than being compressed into an unreadable carrier-label box. The packet barcode
and destination repeat on every printed page.

### Internal Submission Manifest

The sheet placed inside the package includes:

- packet number and barcode
- Trial Project or Customer freebie number and name/reference
- submitting organization and permitted operational contact
- ship-to destination and resolved instruction version
- expected sample rows with Customer sample identifier, controlled sample type,
  registered supplier tube barcode plus human-readable value, declared
  quantity/unit, required temperature/handling, and package count
- safety declaration and a packing checklist
- carrier, tracking, and ship date when recorded before printing
- a clear statement that the packet barcode identifies the shipment, not an
  individual specimen or accession
- instructions to stop and contact Phaeno when a sample, label, package, or
  condition does not match the manifest

The outward-facing label excludes sample identifiers, analyses, detailed
scientific metadata, and unnecessary organization-confidential facts. The
internal manifest includes only the tenant-safe, non-PHI facts required to
match and receive the expected samples. Patient identifiers and unnecessary
personal or health data remain prohibited everywhere in this workflow.
For a Trial Project, the manifest and instructions state **For Research Use
Only. Not for use in diagnostic procedures.** Suspected PHI or a direct patient
identifier stops the affected sample or shipment and places it in the Trial
Project's restricted disposition workflow before receipt progression,
processing, or result release can continue.
The Portal also provides a customer-retained printable and downloadable copy of
the tube-to-sample crosswalk. That copy is part of the organization's shipment
history; it is not a substitute for the organization's own scientific records
and does not require Phaeno to know the identity represented by its non-PHI
Customer sample identifier.
At result release, File Management snapshots the applicable crosswalk and
accession facts into file-to-sample lineage for the permanent package receipt.
Sample-scoped files identify the non-PHI Customer sample ID, original submitted-
tube supplier barcode, and Phaeno accession. Combined/project-level files list
their included Customer sample IDs and never pretend to represent only one
sample. Internal derived-container barcodes remain in Lab Operations rather
than the tenant receipt.

### Print, Reprint, Correction, and Void Rules

- Printing or reprinting the current packet preserves the same barcode,
  destination snapshot, instructions, expected contents, and frozen
  tube-to-sample crosswalk.
- Print/download events are auditable. A routine external reprint does not
  require a reason because it does not allocate a new identity or prove a
  physical print succeeded.
- A correction that changes destination, sample membership, tube assignment,
  sample type, handling, or safety facts creates a new packet revision before
  shipment. If identity or routing could be ambiguous, the prior barcode is
  voided and a new barcode is allocated.
- Scanning a voided packet returns its safe replacement or recovery instruction
  and never opens a different package silently.
- After any sample in the packet is received, the frozen packet cannot be
  rewritten. Differences are handled through receipt exceptions, missing or
  unexpected sample outcomes, and replacement lineage.
- For a Trial Project, every replacement requires explicit Phaeno approval and
  lineage to the original sample. A Phaeno-caused processing failure restores
  one replacement slot. A submitting-organization-supplied sample problem does
  not restore a slot automatically; Phaeno may approve a recorded exception.
  Original and replacement history never silently changes the project's frozen
  approved sample allowance.

## Scan-First Intake

Add **Scan shipment packet** to the existing Phaeno Order Intake workspace.

- The scan field supports a keyboard-wedge scanner and complete manual entry.
- A successful lookup displays packet number, authorization type and number,
  organization, destination, carrier/tracking when known, expected sample
  count, frozen tube-to-sample crosswalk, receipt state, and the linked Lab work
  order.
- Lookup is read-only. It never records receipt, acceptance, accession,
  cancellation, or a sample match merely because a barcode was scanned.
- After packet lookup, an operator may scan each physical supplier tube into the
  displayed expected list. These comparison scans remain read-only until the
  operator explicitly confirms receipt and continues through Lab accession.
- The operator must confirm the displayed organization, package, expected
  contents, and physical condition before recording custody.
- Unknown, malformed, checksum-failed, voided, cancelled, expired, duplicate,
  already-received, wrong-destination, and unauthorized scans produce distinct,
  recoverable outcomes without leaking another tenant's information or opening
  the wrong record.
- A partially received packet remains resolvable and clearly lists received,
  missing, unexpected, held, and rejected items.
- A repeated scan after complete receipt shows the existing receipt context and
  does not create duplicate custody or accession records.
- Operators may continue to search by the human-readable packet number when a
  scanner is unavailable. The degraded-mode procedure and later reconciliation
  still require physical bench approval.

## Phaeno-Supplied Pre-Barcoded Tubes

Phaeno-supplied tubes with permanent manufacturer barcodes are the preferred
initial return-kit direction. The barcode is already applied by the tube
manufacturer; Phaeno and the external organization do not print or attach a
second tube label in the normal workflow.

### Responsibility Boundary

- Phaeno owns selecting and qualifying the tube, registering each physical tube
  barcode to the outbound kit, presenting the assignment workflow, enforcing
  that each tube maps to exactly one sample tube slot, preserving the crosswalk,
  and returning a durable copy to the external organization.
- The external organization owns the scientific meaning and internal records
  behind its Customer sample identifier. It selects an expected sample and
  scans or completely enters the barcode of the Phaeno-supplied tube into which
  it places that sample.
- Phaeno does not treat that boundary as permission to collect patient identity.
  The Customer sample identifier and manifest remain non-PHI.
- The customer can retrieve the final crosswalk from Portal shipment history as
  a printable PDF and CSV download. The copy included inside the shipper
  and the retained customer copy show the same frozen mapping.

### Assignment and Correction Rules

- Phaeno registers each tube barcode before the kit leaves its custody. Unknown
  or foreign barcodes cannot be assigned merely because they are well formed.
- The customer-facing assignment step supports scanner input and complete
  human-readable manual entry; owning a scanner is not a condition of service.
- One registered tube maps to no more than one active expected tube slot. One
  expected sample owns one or more tube slots according to its finalized tube
  count, and every slot maps to no more than one active submitted tube.
- Before packet confirmation, the customer may explicitly remove and replace an
  incorrect tube assignment. The history retains the prior value and actor.
- Packet confirmation freezes the crosswalk. A later correction or replacement
  follows the packet revision and void rules rather than silently rewriting the
  manifest.
- Duplicate, already-used, wrong-kit, wrong-organization, unreadable, damaged,
  missing, unexpected, and mismatched barcodes produce distinct recoverable
  outcomes. Ambiguity never selects the most likely sample.

### Accession and Physical Identity

- The packet barcode continues to identify the package rather than any tube.
- At intake, the operator scans the packet first and then each physical tube.
  POMS compares every tube against the frozen crosswalk before custody or
  accession is recorded.
- At accession, POMS creates its internal submitted-container record and
  accession number and adopts the registered supplier barcode as the permanent
  physical barcode of that submitted tube. The supplier barcode is not the
  accession number and is never reassigned to a different container.
- No second Phaeno barcode label is applied to a successfully registered and
  readable submitted tube. POMS continues to allocate checksummed Phaeno
  barcodes for aliquots, libraries, replacement containers, and other derived
  material.
- If the permanent supplier barcode cannot be read or its physical tube cannot
  be accepted, the operator places the material on hold and follows an approved
  exception/replacement procedure. The original barcode and crosswalk remain in
  history.

### Pilot Materials and Validation

- Preferred tube candidate: Corning `8676`, 2 mL external-thread, sterile,
  RNase-/DNase-free, permanent side 1D barcode and human-readable value; Fisher
  catalog `07-200-963`.
- Automation alternative: Corning `8671`, the same general tube format with a
  synchronized side 1D and bottom 2D barcode; Fisher catalog `07-200-961`.
- Preferred shipper candidate: Therapak `37806`, frozen Category B medium
  canister shipper for up to six tubes; Fisher catalog `22-130-029`.
- Activation requires supplier availability and lot documentation, scientific
  approval of usable RNA volume and material contact, confirmed six-tube fit in
  the segmented pouch and canister, closure/leak performance, barcode character
  capture, dry-ice and freeze/thaw readability, human-readable fallback,
  scanner compatibility, and operator-observed receipt/accession evidence.
- The supplier identity remains distinct from barcode symbology so a later tube
  or 2D-reader change does not rewrite scientific or commercial history.

## Lifecycle and Data Direction

Recommended shared records are:

- `SampleShippingDestination`
- `SampleTypeDefinition`
- `SampleShippingInstructionRule`
- `SampleReturnKit`
- `SampleShipment`
- `SampleShipmentItem`
- `RegisteredSampleTube`
- `SampleShippingPacketRevision`
- `SampleShipmentEvent`

A sample shipment references exactly one authorization source kind and ID:

- `CustomerPromotionalOrder`
- `ProspectTrialProject`
- `CustomerLabServiceOrder`

The concrete implementation may refine names, but it must preserve source
separation, organization ownership, immutable packet revisions, one active
shipment assignment per expected sample, unique and non-reassignable supplier
tube identity, durable tube-to-sample crosswalk history,
destination/instruction snapshots, unique packet identity, optimistic
concurrency, audit stamping, and normal soft-deactivation/history rules.

Recommended shipment states are:

`Draft` -> `Ready to print` -> `Shipped` -> `Partially received` -> `Received`

Controlled alternatives are:

- `Changes required`
- `Shipping exception`
- `Cancelled`
- `Voided and replaced`
- `Closed incomplete`

Receipt and accession states remain Lab-owned; a shipment state summarizes the
physical package and must not replace specimen disposition or container state.
The return-kit record separately retains outbound fulfillment, registered tube
membership, supplier/product/lot facts, and outbound carrier/tracking history;
it is not reused as the later sample-shipment or packet record.

## API Direction

The exact route names may follow implementation conventions, but the boundary
must provide:

- Phaeno-authorized CRUD, activation, versioning, and history for destinations,
  sample types, and instruction rules
- authorization-scoped discovery of eligible sample types and destinations
- shipment drafting, grouping, compatibility validation, confirmation,
  immutable packet rendering, print audit, correction, void, shipment facts,
  and tenant-safe status
- Phaeno-only outbound-kit tube registration plus authorization-scoped external
  tube assignment, reassignment-before-confirmation, frozen crosswalk rendering,
  printable/structured customer download, and non-disclosing validation
- a Phaeno-only exact packet-barcode resolver that returns safe intake context
  and the linked Lab work-order identifier
- a Phaeno-only exact registered-tube resolver that verifies packet membership
  and hands the immutable tube-to-sample mapping to Lab accession
- explicit receipt handoff to existing Lab Operations commands
- server-side authorization, organization isolation, last-read version checks,
  idempotency for consequential commands, and non-disclosing not-found behavior

The public/external packet endpoint never accepts an arbitrary organization,
Trial Project, order, Lab work order, destination, or sample identifier from the
client without validating the selected tenant and frozen authorization scope.

## User Experience Direction

### Phaeno Configuration

- Add **Sample shipping** to Order Configuration.
- Provide separate form-free lists for destinations, sample types, and
  destination/type instruction rules.
- Selecting the primary identifier opens a view-first detail workspace with
  current status, effective dates, linked rules, version, and audit context.
- Bounded create/edit/activate/retire actions use modals. Multi-section rule
  authoring may use a dedicated resumable page when the final instruction model
  warrants it.
- Preview the resolved printable instructions with synthetic sample facts before
  a rule may be activated.

### Phaeno Kit Fulfillment

- A Phaeno operator opens the authorized return-kit record, confirms the
  approved tube and shipper profile, and scans every permanent supplier tube
  barcode while assembling the outbound kit.
- The workspace shows the required versus registered tube count, supplier,
  product, lot, outbound destination, and carrier/tracking facts and blocks
  fulfillment for duplicate, previously used, retired, or wrong-profile tubes.
- Completing fulfillment freezes the tube membership delivered to the external
  organization while preserving an exception path for a lost, damaged, or
  replaced outbound kit.

### Prospect Trial Project

- The Trial Project detail workspace includes **Samples and shipping** after
  Prospect acceptance.
- It shows the approved allowance, submission window, permitted sample types,
  shipment groups, destination, detailed instructions, packet status, tracking,
  and Customer-safe receipt outcomes.
- **Match tubes to samples** presents the declared samples and Phaeno-supplied
  tubes as a guided review step. Each row accepts a scanner value or complete
  human-readable barcode, immediately rejects duplicate or wrong-kit tubes, and
  shows the retained crosswalk without exposing PHI.
- The customer can print or download the confirmed tube-to-sample crosswalk from
  shipment history for its own records.
- **Review and print shipping packet** is the dominant action only when the
  shipment passes every scope and compatibility rule and every expected sample
  has exactly one valid tube assignment.

### Customer Promotional Order

- The Customer lab-service workspace shows the promotional grant and no-charge
  treatment before placement.
- After placement, it uses the same **Samples and shipping** experience and
  packet behavior as a Trial Project while retaining order terminology and
  commercial history.
- Customer primary navigation does not expose a separate **Samples and
  shipping** destination. The Lab service job is the starting point and every
  Customer shipment detail returns to that job.

### Phaeno Intake

- Order Intake distinguishes CRM handoffs, planned sample shipments, and
  already-authorized work awaiting specimens.
- The scan result identifies **Trial Project** or **Customer promotional order**
  visibly so operators do not infer the wrong commercial workflow.
- The result shows the frozen Customer sample identifier-to-tube barcode
  crosswalk and accepts comparison scans for each received tube before the
  operator confirms custody or opens Lab accession.
- Manual lookup remains available, and focus returns to the scan field after a
  resolved or recoverable scan outcome.

All surfaces meet WCAG 2.2 AA, support keyboard operation and visible focus,
use text in addition to color/status icons, preserve errors until resolved, and
remain readable at zoom/reflow sizes. The print view has semantic reading order,
high contrast, human-readable identifiers, page numbers, and no barcode-only
instructions.

## Notifications and History

External notifications are tenant-safe and may cover:

- shipment ready to prepare
- packet issued or replaced
- shipment facts recorded
- package received or partially received
- missing, unexpected, damaged, temperature, safety, or routing exception
- replacement sample authorized
- submission window nearing expiration

The acting organization administrator receives the workflow notice. Other
active administrators receive high-impact exception, cancellation, or receipt
notices with duplicate recipients suppressed. Internal Phaeno notes, another
organization's data, internal locations, and scientific investigation details
never enter external email or packet content.

History retains authorization source, outbound-kit and registered-tube facts,
tube-to-sample assignments and corrections, packet revisions, barcodes, print
and download events, destination and instruction versions, expected sample
membership, shipment facts, scan/receipt outcomes, exceptions, replacements,
actors, and timestamps.
Normal cancellation, voiding, retirement, or reprinting never hard-deletes this
record.

## Acceptance Scenarios

1. An approved and accepted Prospect Trial Project permits its administrator to
   declare up to the frozen allowance, group compatible extracted-RNA samples,
   review the detailed destination instructions, and print one packet. A
   Prospect without an accepted active project cannot create a shipment.
2. A named Customer administrator places a no-charge promotional order exactly
   once under an eligible grant. The order has no payment gate, and another
   Customer cannot discover or consume the grant.
3. Phaeno activates two destinations and multiple sample types. The owning
   authorization exposes only its permitted choices; a retired, unsupported, or
   wrong-region destination is rejected.
4. Compatible sample types produce one packet. Incompatible temperature or
   destination rules produce clearly explained separate shipment groups rather
   than one ambiguous instruction set.
5. The printed ship-to page contains the exact snapshotted destination and
   detailed packing/shipping instructions. The internal manifest contains the
   expected non-PHI sample facts and frozen Customer sample identifier-to-tube
   barcode crosswalk, the customer can retain the same mapping from shipment
   history, and every page contains the same packet number and barcode.
6. Reprinting preserves the packet identity and content. A pre-shipment routing
   correction creates an immutable new revision and, when ambiguity warrants,
   voids the old barcode in favor of a new one.
7. Scanning a valid packet opens the correct authorization and existing Lab
   work context without recording receipt. The operator confirms the package
   before custody changes.
8. Malformed, unknown, checksum-failed, voided, cancelled, wrong-state, and
   repeated scans cannot open or mutate another package. A repeated scan after
   receipt shows the prior receipt instead of duplicating it.
9. A packet containing three expected samples may be partially received. POMS
   preserves received, missing, unexpected, held, and rejected outcomes
   independently and does not mark missing material as received.
10. Phaeno registers six distinct supplier-barcoded tubes to one authorized
    outbound kit. Before packet confirmation, a Customer administrator assigns
    each declared sample exactly one of those tubes by scanning or entering its
    complete human-readable barcode. Duplicate, wrong-kit, foreign,
    already-used, and incomplete values are rejected without changing another
    assignment.
11. At intake, the operator scans the packet and then each tube. A tube missing
    from or mismatched with the frozen crosswalk stops intake. Accession adopts
    the registered supplier barcode as the submitted tube's permanent physical
    identity without applying a second barcode label; the packet barcode never
    becomes a tube or accession identity.
12. POMS allocates its own checksummed barcode for a derived aliquot or library
    and preserves its lineage to the supplier-barcoded submitted tube.
13. Editing a destination, sample type, or instruction rule after packet issue
    does not change the printed packet. A newly planned shipment uses the new
    active version.
14. Cross-tenant list, detail, print, scan, and download attempts fail without
    leaking packet, project, order, destination, or sample existence.
15. A Trial Project with pre-shipment return approval creates a separate
    Phaeno-to-Prospect material-return record after processing. It does not
    repurpose the original inbound shipment packet or barcode. A Trial without
    that frozen approval follows its configured destruction disposition.

## Verification Plan

### Backend

- instruction versioning, activation, retirement, and audited concurrency
- authorization-source and organization isolation
- sample allowance, per-type allowance, submission-window, and destination
  eligibility validation
- deterministic compatibility grouping and explicit conflict rejection
- immutable destination/instruction/sample snapshots
- unique supplier-tube registration, kit membership, customer assignment,
  reassignment history, packet freeze, and cross-tenant rejection
- unique checksummed packet allocation and normalization
- idempotent confirmation, correction, void, shipment, and receipt handoff
- Trial Project versus Customer freebie lifecycle separation
- read-only scan resolution, repeated scans, partial receipt, and negative paths
- adoption of a registered supplier barcode for the submitted container while
  preserving Lab authorization, receipt/accession ownership, internal accession
  identity, derived-container barcode allocation, and lineage
- denial of residual return when it was not frozen before the first shipment,
  and separation of any approved outbound return from the inbound packet

### Frontend

- configuration list/detail/modal flows for destinations, sample types, and
  instruction rules
- instruction preview, conflict, missing setup, inactive record, and stale-write
  states
- Prospect and Customer sample/shipping workflows with correct terminology
- tube-to-sample scanner/manual assignment, explicit review, correction,
  complete-assignment gate, customer-retained PDF/structured download, and
  accessible error recovery
- multi-shipment grouping, review, print, reprint, correction, and void behavior
- scan-first intake success, partial, repeated, malformed, unknown, voided, and
  unauthorized outcomes
- clear read-only presentation of the frozen residual disposition and return-
  shipping responsibility without presenting the inbound packet as reusable
- printable US Letter/A4 layout, page breaks, repeated identity, barcode
  rendering, high contrast, zoom/reflow, keyboard, focus, and screen-reader text

### End To End

- approved first-party CRM-originated Trial Project through Prospect acceptance,
  outbound tube registration, customer tube-to-sample assignment, retained
  crosswalk, shipment preparation, packet print, packet-and-tube scan, receipt,
  accession without relabeling the submitted tube, derived-container labeling,
  processing, result release, and either operator-confirmed destruction or a
  separately tracked pre-approved residual-material return
- Customer promotional grant through one-time placement and the same shared
  shipping/intake path without a payment gate
- multiple destinations and compatible/incompatible sample types
- two-tenant isolation across configuration projection, packet, scan, Lab work,
  and status history
- correction/replacement and network/scanner interruption recovery

### Physical Bench

- printed packet barcode scans reliably from representative office printers and
  folded/handled paperwork
- detailed instructions remain readable and operationally usable
- the outward label fits the real package and does not expose unnecessary facts
- the scanner returns the exact packet value with the approved prefix/suffix and
  terminator configuration
- every candidate tube barcode is unique and remains readable from the side
  after representative handling, dry ice, condensation, freezing, thawing, and
  storage; its human-readable value remains usable as fallback
- six candidate tubes fit and remain protected in the Therapak `37806` pouch
  and 95 kPa canister under the approved pack-out
- outbound tube registration, customer crosswalk, package scan, tube scans,
  specimen match, accession without a second submitted-tube label,
  derived-container label print, and verification scan work as one
  operator-observed flow
- degraded-mode worksheet, duplicate/voided packet handling, and reconciliation
  are approved and retested

## Phased Delivery

### Phase 0 - Operational Content and Print Prototype

- [x] verify the current public Phaeno address and general contact, and record
  them as an inactive destination candidate with an explicit no-ship control
- [ ] obtain Laboratory Operations approval for the exact recipient, specimen-
  receiving authorization, receiving channel/phone, days/hours, closure
  procedure, and missed-delivery escalation
- confirm the first real destination, extracted-RNA instructions, package type,
  temperature, carrier/service guidance, receiving hours, contacts, and
  exception procedure
- procure representative Corning `8676` tubes and a Therapak `37806` shipper,
  confirm supplier lead time and lot documentation, and validate the selected
  scanner before committing to production quantities
- inventory anticipated additional destinations and sample types so the first
  rules do not encode one-address or one-type assumptions
- prototype the full-page ship-to/instruction page and internal manifest with
  synthetic facts
- run an operator review and preliminary scanner/office-printer check

### Phase 1 - Shared Configuration and Packet Foundation

**Status: implemented in the application and local development database on
2026-08-17. The 2026-08-18 completion pass verified the full backend and
frontend suites, production frontend build, and existing desktop/mobile
mock-session browser suite.**

- [x] implement versioned destinations, sample types, instruction rules, previews,
  compatibility resolution, shipment records, packet revisions, and barcodes
- [x] add Phaeno configuration and scan-first intake surfaces
- [x] connect packet resolution to the existing provider-neutral Lab work reference
  without changing receipt/accession ownership

### Phase 2 - Prospect Trial Project Integration

- [ ] implement the owning Trial Project workflow and frozen shipping scope
- [x] add shared outbound kit/tube registration, tenant-scoped tube-to-sample
  assignment and correction history, retained CSV/print crosswalk, packet
  confirmation, shipment facts, and packet-plus-tube intake comparison
- [x] extend Lab accession to adopt a validated registered supplier barcode for
  a submitted tube while retaining POMS-generated barcodes for derived containers
- [x] execute the shared authenticated-controller/PostgreSQL journey, including
  revision and overlap controls, global tube uniqueness, frozen packet/crosswalk
  replacement, tenant non-discovery, scan outcomes, concurrent packet issue,
  and exact/repeated Lab accession behavior
- [ ] connect Prospect sample declarations and grouped-shipment creation to the
  shared contract after the Trial Project aggregate is implemented
- [ ] execute the owning Trial Project through the real ASP.NET authentication
  middleware/API envelope and complete representative physical acceptance

The shared software portion of this phase is complete. The unchecked parent
and acceptance items cannot be completed by the shared layer: they require the
Trial Project product decisions in its owning plan, an authenticated parent
workflow, approved operational content, and representative physical materials.

### Phase 3 - Customer Freebie Integration

- implement bounded Customer promotional grants and one-time no-charge placement
- reuse the shared configuration, shipment, packet, scan, and Lab intake path
- add promotional value/cost reporting and make the explicit Finance decision
  about any QuickBooks representation

### Phase 4 - Controlled Expansion

- activate additional approved destinations and sample types through configuration
- evaluate additional tube vendors, bottom-2D scanning, rack automation, and
  custom Phaeno-coded tubes only after the initial supplier-barcode workflow and
  recovery procedures are approved
- consider paid Customer orders only through an explicit extension that
  preserves their commercial and payment behavior

## Open Product and Operational Decisions

- the first real Phaeno ship-to destination and receiving contacts/hours
- the approved extracted-RNA container, volume/quantity, temperature, pack-out,
  carrier/service, dispatch-day, transit, and exception instructions
- the physical destruction method and any approved residual-return packaging,
  carrier, and custody instructions; the 30-day configurable Trial retention
  policy and pre-shipment return decision are settled in the Trial Project plan
- confirmed availability, lead time, lot documentation, and representative
  samples for the preferred Corning `8676` and Therapak `37806` pilot materials
- which future sample types and destinations should be represented in the first
  configuration fixtures
- whether the authorization always assigns a destination or may permit the
  external organization to choose among several eligible destinations
- how unexpected, missing, damaged, delayed, temperature-excursion, or unsafe
  material affects the Trial Project submission window and operational
  disposition; these conditions do not restore a replacement slot
  automatically unless the confirmed Trial Project replacement policy permits
  it or Phaeno approves and records an exception
- whether Finance requires a future Customer freebie to appear in QuickBooks
  despite having no amount due; Trial Projects are settled as POMS-only internal
  value/cost reporting with no QuickBooks transaction
- whether a 4-by-6-inch ship-to layout is needed in addition to the initial
  full-page packet
- whether international shipping, customs documents, dry ice, or regulated
  hazardous-material workflows are part of the first production activation

## Definition of Ready for Implementation

- the shared Trial Project/freebie ownership boundary remains approved
- the first destination and extracted-RNA instruction content are approved by
  actual Phaeno scientific/operations owners
- multiple-destination, multiple-sample-type, compatibility, and split-shipment
  rules are accepted
- the full-page ship-to/instruction and internal-manifest prototype is accepted
- Trial Project approval, acceptance, allowance, and submission-window decisions
  in `PROSPECT-TRIAL-PROJECT-PLAN.md` are complete
- the Customer freebie grant rules are approved before its later phase begins
- packet scan, receipt confirmation, accession, and container-label recovery
  procedures are operationally assigned
- the supplier tube barcode, customer crosswalk, correction, unreadable-code,
  relabel/recontainer, and derived-container procedures are operationally
  assigned and reconciled with the Lab Operations plan
- backend, frontend, E2E, migration, documentation, rollout, and physical bench
  scope is explicitly requested

## Deferred Scope

- purchasing carrier postage, calculating rates, booking pickup, or retrieving
  carrier-native labels
- carrier delivery confirmation or claims automation
- automatic international customs, dangerous-goods, dry-ice, or export document
  generation unless separately activated
- customer-generated authoritative Phaeno container/accession barcodes
- customer-printed per-tube labels before printer/stock/environment validation
- custom Phaeno-printed or manufacturer-customized tube codes
- bottom-2D rack automation beyond the validated initial handheld-scan workflow
- offline barcode allocation without an approved degraded-mode reconciliation
  procedure
- ordinary paid-order migration to the shared packet flow
- external LIMS or carrier-system integration
