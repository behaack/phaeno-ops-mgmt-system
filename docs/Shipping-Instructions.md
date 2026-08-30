# Pilot Sample-Shipping Materials and Barcode Workflow

## Receiving Destination Status

The current Phaeno public address has been documented as an **inactive
candidate**, not an approved sample-receiving destination. No customer should
ship material to the public address until Phaeno confirms the arrival in
writing. The proposed fields, appointment-only control, and activation
checklist are in `docs/sample-shipping-operational-content.md`.

## Recommended pilot products

Use these as procurement and physical-validation candidates, not as approved production materials:

| Component | Manufacturer | Manufacturer product | Fisher Scientific catalog | Barcode status |
| --- | --- | --- | --- | --- |
| 2 mL external-thread cryogenic vial | Corning | `8676` | `07-200-963` | Permanent manufacturer-applied side 1D barcode and human-readable value |
| Frozen Category B medium canister shipper | Therapak | `37806` | `22-130-029` | The shipper is not the source of the tube barcodes and does not include pre-barcoded tubes |

Corning `8671` / Fisher `07-200-961`, with synchronized side 1D and bottom 2D codes, is the automation-oriented tube alternative.

Before production purchase or use, confirm current availability and product specifications with the vendor and validate representative units for returned RNA volume, tube fit in the Therapak canister and pouch, closure/leak performance, freezing, dry-ice handling, and scanner readability. The application deliberately records the actual supplier, product number, and tube lot used for each return kit.

## Tube and sample association

The Therapak `37806` is a shipper, not a pre-barcoded-tube kit. Phaeno supplies separate Corning `8676` tubes and scans every permanent manufacturer barcode into the outbound return-kit record before the kit is sent.

The customer does not need to print or attach another barcode label. In **Samples & shipping**, the customer's organization administrator selects the expected sample and scans or manually enters the barcode already on the tube. POMS enforces one tube per expected sample and one expected sample per tube.

The Customer sample identifier must be a stable, non-PHI value that the customer can connect to its own laboratory record. The customer owns the scientific meaning of that identifier. Phaeno owns preserving the association between that identifier and the supplier tube barcode.

For example:

| Customer's record | Portal crosswalk | Physical tube |
| --- | --- | --- |
| Internal sample record `RNA-2026-014` | Customer sample ID `RNA-2026-014` -> supplier barcode `ABC12345` | Corning tube permanently marked `ABC12345` |

Before shipment, the administrator reviews and confirms the entire crosswalk. POMS freezes it into the shipment packet. The customer can print the packet or retain the CSV so its records contain the same tube association Phaeno uses at intake. A correction requires a reason and remains in assignment history. If the packet was already confirmed but the return shipment has not been recorded as shipped, saving a tube correction atomically voids the old packet and issues a corrected packet revision. The customer must destroy any unused copy of the voided packet and print the replacement.

## Phaeno intake and accession

The packet barcode identifies the package; it is not a tube barcode or accession number. At intake, Phaeno scans the packet and then each physical supplier tube. POMS compares the tube with the frozen expected-sample crosswalk without recording receipt merely because it was scanned.

During accession, POMS validates the same packet, specimen, and tube association and adopts the permanent supplier barcode as the authoritative identity of that submitted tube. Phaeno does not add a second barcode label to a successfully qualified supplier-barcoded tube. Aliquots, libraries, and other derived containers continue to receive POMS-generated barcodes.

If a barcode is unknown, duplicated, damaged, unreadable, assigned to another sample, or not expected in the scanned packet, stop and follow the approved exception procedure. Never guess the association or cover the permanent barcode.

## Current implementation boundary

The shared return-kit, registered-tube inventory, external crosswalk, printable packet/CSV, comparison scan, and Lab accession-adoption workflow is implemented. The separate Prospect Trial Project and Customer promotional-order parent workflows are not yet implemented, so they do not yet create a real authorized shipment. Production activation also remains blocked on approved destination/scientific instructions, physical material and scanner validation, operational procedures, automated authenticated workflow testing, and deployment approval.
