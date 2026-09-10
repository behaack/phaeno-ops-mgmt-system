# Transportation kits as Customer location inventory

## Status and decision — September 9, 2026

Product direction confirmed and implemented in the local working tree. This plan
supersedes the September 8 requirement that Customer containers must have been
ordered and fulfilled for the same Lab Job. The currently deployed implementation
still enforces that older requirement. Local verification and migration evidence
are recorded below; this correction has not been deployed to production.

The owner identified the failure in that model: cancelling the originating Job
must not strand physical containers already delivered to the Customer. Phaeno
supplies containers to a Customer/Department delivery location. A physical
container becomes assigned to a Job and shipment during Customer preparation,
using its permanent container barcode.

This continues the [shipping plan](SAMPLE-SHIPPING-AND-INTAKE-PLAN.md). The
[local run](../testing/runs/2026-09-08-hs5y7db7-local-walkthrough.md) is retained
before container assignment and successful tube scanning. Its one acknowledged
TRANS-20 remains unused and unbound for the next guided preparation step.

## Product rules

- Every physical container has one permanent, unique barcode. Reuse the existing
  unique kit number as that identity; show and print both readable text and its
  barcode. Container type, SKU, capacity and registered tube identities remain
  attached to that physical container.
- Fulfillment identifies the Customer, Department and delivery location. The kit
  request may retain an originating Job as ordering and commercial history; that
  reference does not limit which eligible Job can later use unused stock.
- Dispatch adds **On the way** inventory. Customer acknowledgement changes only
  the acknowledged containers to **Available**. A carrier timestamp alone does
  not establish receipt. Included kit and outbound-delivery pricing is unchanged.
- Available stock is received, compatible stock at the selected Customer location,
  with no current reservation or use. Another Customer, Department or location's
  stock must not become selectable through an identifier or URL change. Inventory
  transfers between locations are outside this change.
- The Customer scans each physical container's barcode during preparation. Review
  its size, capacity and tube allocation, then confirm the selected containers.
  Confirmation atomically reserves those exact containers to the Job's shipments.
  Scanning a barcode into an unsaved form does not silently consume inventory.
- Display **Assigned to [Job]** for a reserved container. Tube scanning accepts
  only its registered tubes. The first successful tube scan changes it to **In
  use** and preserves the existing permanent-tube lineage and reset lock.
- Before any tube scan, resetting a configuration releases its reservations to
  location inventory and preserves the prior configuration as history. After
  tube scanning starts, normal reset/reassignment remains prohibited. Cancelling
  a Job must not silently make a scanned/used container available for another Job.
- Cancelling a Job leaves delivered, unused, unassigned containers available.
  Unscanned reservations must be released through the cancellation/reset rules.
  This is reuse of unused supplies, not a policy for reusing containers or tubes
  already used for samples.
- Kit receipt and location inventory remain accessible even if the originating
  Job or its former shipment is cancelled. Keep fulfillment history, tracking,
  acknowledgement and subsequent assignment as separate facts.
- Recommendations use compatible available stock. Preserve alternative sizes and
  quantities, partial preparation and Smart Add. Avoid redundant containers;
  unavoidable spare slots are valid. For example, three tubes with an available
  5-tube kit should not suggest an available 10 or 20. A new catalog revision must
  not invalidate physical stock solely because its revision ID changed; actual
  compatibility withdrawals still require a clear block and recovery path.

## One outstanding product decision

If the originating Lab Job is cancelled before kit dispatch, should its unshipped
kit request also be cancelled? Recommendation: cancel the unshipped quantities;
preserve any dispatched quantities, their receipt workflow and available stock.
The owner has been asked. Do not implement this recommendation as an approved
cancellation rule until the answer arrives. Partial dispatch must be considered
explicitly; existing all-or-nothing request cancellation is insufficient for a
rule that cancels only an unshipped remainder.

## Customer and Phaeno workflow

1. **Phaeno stock:** prepare a standard container, register its complete permanent
   tube roster and print its container barcode. Stock is not assigned to a Job.
2. **Need and ordering:** show received and in-transit stock for the selected
   location. Offer the included-cost, confirmed kit order for shortages. Keep a
   simple recommended order, with an optional compatible-size adjustment rather
   than forcing all Customers through a configuration form.
3. **Fulfillment:** notify the responsible staff, fulfill the request to its
   frozen delivery address and record tracking. All dispatch entry points must
   update the same request and inventory facts exactly once. Do not require a
   destination sample-shipment ID to establish ownership of the supplies.
4. **Location receipt:** from the Customer location or contextual Job panel,
   acknowledge arrived containers. This action remains available after the
   originating Job is cancelled. Partial deliveries leave the rest On the way.
5. **Preparation:** choose the departure location, review recommended sizes, scan
   each container barcode and review tube allocation. Confirm exact containers
   atomically. Show the barcode beside every selected container.
6. **Tube matching:** work down the sample list and scan registered tubes belonging
   to the selected container. Show saved barcode identities, progress and restart
   recovery. The first successful tube scan locks reset.
7. **Manifest and return:** retain order, shipment, sample and tube barcodes and
   include the physical container barcode. Preserve split-sample references and
   separate shipment/receipt progress for each container.

## Agreed recovery presentation — September 9

Retain the ability to release and revise unused container reservations before
the first saved tube scan. The owner accepted presenting this as a secondary
**Change containers** action, with explicit whole-Job scope and affected
container/tube counts. Preserve finalized samples, delivery/receipt history,
retired configurations and the existing post-scan lock. The interface currently
still says **Reset container configuration**; the label refinement is planned,
not implemented by this manual testing checkpoint.

## Implementation work

### Inventory and persistence

- Remove originating-Job filtering from available location inventory and scan
  eligibility. Preserve the request association as provenance, not assignment.
- Persist a departure delivery-location ID on Customer sample shipments; do not
  infer it from whichever kit request happens to be newest.
- Separate reversible reservation from existing irreversible tube adoption:
  nullable reserved shipment, reservation time and actor on physical stock;
  retain the existing bound-shipment identity for tube use. Use uniqueness,
  concurrency and transactions to prevent two Jobs claiming the same container.
- Expose tenant-scoped location inventory and request/receipt reads independently
  of an originating Job. Return On the way, Available, Assigned and In use states,
  readable/barcode identity and relevant assignment/provenance separately.
- Confirm exact container IDs/versions with packing; validate ownership, receipt,
  compatibility, location, quantity and capacity on the server. A losing concurrent
  claim must retain the Customer draft and explain which container changed.
- Add reviewed EF migrations, update the complete ERD and verify/apply locally
  during authorized implementation. Shared/production migrations require separate
  explicit approval. Do not alter the running production schema for this plan.

### Customer and staff screens

- Add reusable inventory and receipt access to the Customer delivery-location
  detail. Reuse it contextually from Job preparation.
- Update supply panels, container configuration, barcode assignment, scanner and
  reset behavior to use received location inventory. Preserve Member read-only
  inventory/tube history while restricting mutations to authorized administrators.
- Keep open forms mounted when inventory refresh fails; disable affected writes
  with feedback instead of discarding drafts through a parent unmount.
- Separate retired configurations from active shipment links. Explain a reset
  as a replaced configuration and offer the current preparation entry point;
  do not present a historical zero-tube shipment as current work.
- Update Phaeno list/detail/dispatch views to distinguish requested-for history,
  delivery location, receipt and actual Customer assignment. Replace the current
  Preparing/Fulfilled/Bound-only presentation with the useful inventory states.
- Review all Customer/Phaeno guides after implementation; preserve audience and
  locale boundaries. Existing user help must describe deployed/current behavior,
  with proposed behavior kept in this plan until implemented.

### Existing records and rollout

No direct data patch is needed for the current walkthrough. The acknowledged,
unbound TRANS-20 can qualify as location stock using its existing receipt and
location facts, while retaining original dispatch and request history. Existing
bound/scanned shipments keep their lineage. Records without verified location or
receipt need an explicit recovery path, not assumed availability. Scope any data
repair separately and preserve the audit trail.

## Acceptance before resuming the full walkthrough

- Kits requested for Job A can be received after A is cancelled and assigned to
  eligible Job B at the same location, without a second order or dispatch.
- Confirmed receipt and inventory counts agree between POMS and Portal after
  refresh; duplicate/retried receipt or assignment does not increment twice.
- In-transit, wrong-Customer/Department/location, incompatible and already-used
  containers cannot be claimed. Compatible older stock revisions remain usable.
- Two simultaneous claims yield one reservation. Failure preserves the other
  draft and explains the unavailable barcode.
- Reset before the first tube scan restores availability; after a successful
  tube scan, reset/reassignment remains blocked, including after scan correction.
- The wrong container's tube cannot match. A correct scan persists the selected
  container/Job/shipment identity, printable barcodes and exact sample lineage.
- Partial receipt and multiple containers preserve available, assigned and
  unallocated counts; unused capacity is not presented as missing samples.
- Members retain read-only history; retired configurations do not look like
  cancelled Jobs; an inventory refresh failure does not discard an open form.

Track focused backend, frontend and manual/E2E results in their living plans.
Production release checks, synthetic acceptance and physical scanner/material
qualification remain separate evidence.

## Implementation and verification checkpoint — September 9

Implemented location-owned inventory and receipt; departure-location selection;
atomic physical-container reservations; first-tube binding; reset and effective
cancellation release; compatible historical-stock handling; independent request
history; Customer/Member and Phaeno screen updates; and frozen/printable container
barcodes. Origin request, delivery and receipt records are preserved. Phaeno
location pages link to staff inventory and do not offer Customer receipt actions.

- Backend build: zero warnings/errors; isolated PostgreSQL checkpoint **76/76**.
- Customer component checkpoint: **108/108**; final staff-location correction
  passed its two affected suites **13/13** (overlapping counts).
- Staff component checkpoint: **47 passed**; packet/barcode checkpoint **8/8**.
- Full frontend TypeScript and scoped lint: passed.
- Customer actual-component browser suite: **8/8** desktop/mobile; staff dialog
  review: **6/6** desktop/mobile/dark/short-height. Barcode PDF: one page.
- Help corpus regenerated and checked: **56 guides**, version `e1df452ece0e`.

Migration `20260909153238_AddTransportationKitLocationReservations` is additive:
four nullable fields, four indexes and three restrictive foreign keys. The ERD
contains 172 tables, 2,592 fields and 395 foreign keys after regeneration. Local
application and the preserved walkthrough state are recorded in the run handoff.
No shared/production migration, data patch, Git operation or deployment is part
of this implementation checkpoint.

The additive migration is applied to verified local `localhost/phaeno_ops`.
The new API runs from `artifacts/location-inventory-runtime` with health HTTP 200.
All six saved-fixture before/after hashes match; evidence is in
`artifacts/location-inventory-tests/local-preservation.json`. Connected Portal
location inventory shows Available 1 / On the way 0 / Assigned 0 / In use 0.
The current pool recommends the existing TRANS-20 for 18 tubes with two spare
slots. Connected POMS independently shows Available, Main laboratory, Not assigned,
the original request/dispatch/receipt and all 20 registered tube identities.
