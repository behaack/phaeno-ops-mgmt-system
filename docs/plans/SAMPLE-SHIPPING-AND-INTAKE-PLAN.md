# Sample Shipping and Intake Plan

Keep this file updated as external sample-shipping, printable packet, and
pre-receipt intake requirements are supplied and decisions are made.

Do not execute this plan unless implementation is explicitly requested. This
plan does not authorize a dependency, schema, migration, authentication,
deployment, production activation, carrier integration, or physical laboratory
procedure change.

## Status

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
  adoption. It deliberately does not create an approved Trial Project or
  Customer promotional order: those parent aggregates remain owned by their
  separate plans, so no real external shipment is issued until one of those
  workflows creates an authorized shared shipment.
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
- `HUBSPOT-PORTAL-LIFECYCLE-PLAN.md` owns the Trial Project request arriving
  from HubSpot and relationship-safe commercial visibility.
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

- Sales requests the Trial Project from HubSpot.
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

1. Phaeno assembles the outbound return kit and scans every permanent supplier
   tube barcode into the kit record. A tube may belong to only one active kit,
   shipment, or expected sample assignment.
2. The external organization opens its accepted Trial Project or placed
   Customer freebie and reviews the approved sample allowance.
3. The organization administrator declares each sample using the allowed
   sample types and required metadata. The Customer sample identifier is unique
   within the owning authorization and must not contain a patient name, medical
   record number, date of birth, or other prohibited PHI.
4. The Portal validates allowance, submission window, sample facts,
   destination eligibility, and instruction compatibility.
5. For each expected sample, the administrator scans the side barcode on one
   Phaeno-supplied tube or enters its complete human-readable value. The Portal
   verifies that the tube belongs to the active kit, is unused, and is not
   assigned to another sample, then displays the resulting Customer sample
   identifier-to-tube barcode crosswalk for explicit review.
   For a Trial Project, shipment confirmation also requires the current
   versioned RUO/no-PHI affirmation.
6. The Portal groups compatible samples into one or more proposed shipments.
   The user reviews the samples, destination, and detailed instructions before
   confirming each shipment.
7. Confirmation freezes the destination, sample-type versions, resolved
   instructions, expected sample list, tube-to-sample crosswalk, and
   authorization reference in an immutable packet revision.
8. POMS allocates one unique, checksummed, Code 39-safe packet barcode and a
   human-readable packet number. The packet barcode is never reassigned.
9. The user prints or downloads a retained customer copy of the crosswalk and
   shipping packet, follows the instructions, places the submission manifest
   inside the package, applies the ship-to label, and adds the carrier's
   postage/tracking label separately. The normal workflow requires no
   customer-printed or handwritten tube label.
10. The user may record carrier, tracking number, and ship date. These facts do
   not change the frozen instructions or expected contents.
11. At Phaeno, an operator scans or manually enters the packet barcode. The scan
   resolves the exact authorization, organization, destination, expected
   samples, registered tube barcodes, packet status, and existing Lab work order
   without changing state.
12. The operator confirms the physical package, scans each tube, and compares
    the physical contents with the frozen crosswalk before recording receipt.
    An unknown, duplicate, missing, unexpected, unreadable, or mismatched tube
    stops automatic intake and opens the approved exception path.
13. Accession creates the authoritative submitted-container record and
    accession number while adopting the registered supplier barcode as that
    tube's authoritative physical identity. The operator verifies the scan under
    the approved bench procedure; no second barcode label is added in the
    normal submitted-tube path. Derived containers continue to receive
    POMS-generated barcodes.

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
  barcode to the outbound kit, presenting the assignment workflow, enforcing a
  one-tube-to-one-sample mapping, preserving the crosswalk, and returning a
  durable copy to the external organization.
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
- One registered tube maps to no more than one active expected sample, and one
  expected sample maps to no more than one active submitted tube.
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

### Phaeno Intake

- Order Intake distinguishes HubSpot handoffs, planned sample shipments, and
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

- approved HubSpot-originated Trial Project through Prospect acceptance,
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
