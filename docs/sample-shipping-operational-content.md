# Sample-Shipping Operational Content

This document is the reviewable source for the first proposed Phaeno sample-
receiving destination. It is operational content, not proof that the location
has been approved for specimen receipt.

## Destination Candidate

**Status:** Inactive. Do not expose this destination on a customer packet or
use it to authorize a shipment.

| Field | Proposed value |
| --- | --- |
| Configuration code | `PHAENO-IRVINE-DRAFT` |
| Name | Phaeno Irvine - sample receiving candidate |
| Recipient | Phaeno Inc. |
| Address | 5270 California Avenue, Suite 300, Irvine, CA 92617, USA |
| General contact | `info@phaenobiotech.com` |
| Receiving phone | Not approved |
| Receiving hours | No standing receiving hours; delivery by prior written appointment only |
| Time zone | `America/Los_Angeles` |
| International shipping | Not approved |

The address and general email are published by Phaeno on its current contact
page and in this repository's public Website. The public source does not state
that the address is approved for frozen RNA receipt and does not publish
receiving hours. Source reviewed 2026-08-18:
<https://www.phaenobiotech.com/contact>.

## Proposed Delivery Control

Until the activation checklist is approved, use this text only as a draft for
the destination configuration:

> Do not ship until Phaeno confirms sample eligibility, the planned arrival
> date, and the receiving instructions in writing. The published business
> address alone does not authorize a shipment. Do not schedule weekend or
> holiday arrival. Retain carrier tracking with the shipment record.

This control deliberately does not prescribe a carrier, service level,
temperature, dry-ice quantity, package marking, or transit limit. Those facts
must come from the scientific and laboratory owners after representative
materials are validated.

## Activation Checklist

- [ ] Laboratory Operations confirms that this exact address and recipient line
  may receive the proposed extracted-RNA packages.
- [ ] Laboratory Operations supplies a receiving contact or approved shared
  channel, phone if required, receiving days/hours, holiday closure procedure,
  and missed-delivery escalation.
- [ ] Scientific Operations approves sample quantity, concentration, container,
  temperature, stabilization, pack-out, dispatch-day, transit-time, and
  rejection instructions.
- [ ] Representative Corning `8676` tubes, Therapak `37806` shipper, closure,
  scanner, freezing, leakage, and dry-ice handling pass the physical validation
  plan.
- [ ] Phaeno approves the customer-facing packet wording and emergency contact
  path.
- [ ] A Phaeno administrator creates the destination and instruction revision in
  Order Configuration as inactive, reviews its preview, and activates it only
  after every preceding item is complete.

No database seed or migration should create or activate this operational
record. It belongs in controlled configuration so its approval, revision,
effective period, and actor remain auditable.
