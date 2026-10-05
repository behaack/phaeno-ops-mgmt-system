# Sequencing vendors and shipment addresses

## Product discovery — October 5, 2026

Phaeno purchasing administrators maintain sequencing vendors; laboratory operators
prepare and track their sequencing shipments. Reuse Purchasing's Suppliers and
Products, with a built-in **Sequencing service** product type and one or more named
shipment addresses for a vendor offering active sequencing services. Do not create
a second vendor identity. Existing laboratory material and transportation workflows
retain their catalog identities.

Shipment preparation selects an active vendor, its sequencing service product and
one of its active addresses. Show the full selected address for review. Require
explicit selections; changing vendor clears the dependent service/address choices.
Retain optional carrier, tracking, vendor reference, ETA and notes. After preparation,
the vendor/service are fixed. An address can be changed explicitly before dispatch,
with evidence; after dispatch it is fixed. Catalog edits never rewrite saved
shipment names, service names, address text or manifest/custody evidence.

## Engineering scope

- Add an audited, versioned supplier-address child record (label, recipient,
  street lines, city, region, postal code, country, optional phone/instructions,
  active state). Use add/edit modals and one Actions menu for edit/retirement;
  preserve inactive addresses. Address summaries are bounded child configuration,
  rather than independent major record workspaces.
- Sequencing service is a stable built-in type. Its products do not require
  physical inventory units or expiration and are unavailable as kit components
  or inventory materials. An active sequencing vendor must retain an active
  address; require addresses before activating its service products.
- Catalog administration keeps existing administrator permissions. Add a narrow
  laboratory-authorized vendor/service/address lookup for shipment selectors;
  do not expose general catalog-management writes to operators.
- Replace free-text vendor/destination input in new shipment preparation with
  reviewed catalog IDs and versions. Validate relationships, eligibility and
  stale selections on the backend. Save supplier/product/address lineage and
  readable snapshots on the sendout and prepared manifest. Retargeting an address
  before dispatch is an explicit versioned command recorded in custody history.
- Use additive nullable sendout lineage fields for historical records with no
  recorded catalog association. Existing demo sendouts retain their observed
  provider/destination/history; do not invent catalog links or create vendors
  from demo labels. No reset or data conversion is needed or authorized.
- Create/review an additive EF migration, update the complete ERD and apply only
  to the verified configured local development database. No Git mutation,
  deployment, dependency or authentication change is authorized here.

## Acceptance

- Purchasing can manage multiple addresses and sequencing service products for
  one vendor; inactive records remain readable and unavailable for new selections.
- Vendor changes clear dependent selections; address preview is readable on
  desktop and phone layouts. Required fields, shared controls, modal regions,
  keyboard behavior and focus return follow Portal policy.
- Reject wrong-vendor addresses/products, inactive records, stale selections and
  any post-dispatch address change. Retain original snapshots after catalog edits.
- Existing demo batches, material balances and custody facts remain unchanged.
- Update the Phaeno guides and backend/frontend/E2E plans. Batch build/type/lint,
  migration and read-only browser verification at a logical checkpoint. Automated
  suites and operational fixture writes remain request-only.

Status: implemented locally. Migration `20261005182306_SequencingVendorCatalog`
is applied to localhost / `phaeno_ops_clean_20260919`; the complete ERD is current.
The solution builds with zero warnings/errors, TypeScript/scoped lint and help
corpus checks pass, and EF reports no model drift. Read-only connected browser
inspection confirms required fields, service inventory exclusion, empty catalog
setup guidance, three shipment selectors, 320 px reflow and modal/focus behavior.
Existing demo batch/sendout/tube fingerprints match before and after the migration.

The manifest also freezes the vendor service description. The last required
address has a disabled retirement action with an explanation, backed by the API
invariant. Automated regressions were authored and compiled but not executed;
complete configured-vendor shipment acceptance and physical/provider/scientific
proof remain pending. No real vendor information was invented and no operational
fixture was written. See [local evidence](../testing/runs/2026-10-05-sequencing-vendor-catalog.md).

Success metrics: every new preparation uses an owned, reviewed vendor/service/address
selection; operators can distinguish destinations before saving; catalog corrections
retain the earlier shipment evidence; services never become physical inventory.


## October 5 controlled release verification

The owner separately authorized full tests, commit/push, deployment and the two
preserving EF migrations under [the hosted release plan](PORTAL-WORKFLOW-RELEASE-20261005-PLAN.md).
Final results and hosted activation are recorded in [the release receipt](../operations/portal-workflow-release-20261005.md).
This supersedes request-only execution statements in the earlier local checkpoints;
physical/scientific/provider and authenticated operator acceptance remain separate.
