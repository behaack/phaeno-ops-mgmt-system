# Sequencing vendor catalog — local implementation evidence

Date: October 5, 2026. Scope: Purchasing supplier addresses, Sequencing service
products and reviewed catalog selections during external sequencing preparation.

## Delivered behavior

- Purchasing → Suppliers remains the vendor directory. External suppliers can
  hold multiple named, structured shipment addresses; inactive addresses remain
  readable. An active sequencing vendor must keep at least one active address.
- The built-in Sequencing service product type has no inventory unit or expiry
  and cannot be selected as a physical material or transportation-kit component.
- Shipment preparation selects Vendor → Sequencing service → Shipment address,
  previews the complete address and submits the reviewed catalog versions.
  Changing vendor clears both dependent choices. Background refresh cannot
  silently replace an already reviewed selection.
- The API checks ownership, active state and concurrency. Vendor/service/address
  names, the service description and the full destination are frozen in the
  manifest. Catalog corrections do not rewrite earlier shipment evidence.
- Vendor/service remain fixed after preparation. A same-vendor address change
  requires explicit review and evidence before dispatch; dispatch freezes it.
- Existing catalog administration permissions are preserved. Laboratory users
  receive a narrow vendor-selection lookup; Customer access remains denied.

## Build, model and documentation receipts

- `dotnet build backend/PSeq.Operations.slnx --no-restore`: passed, zero warnings
  and zero errors, including compilation of the authored backend regressions.
- Frontend TypeScript: passed. Scoped ESLint on the touched feature/API/test
  files: passed. No full automated test suites were executed; repository policy
  makes those request-only.
- Additive migration `20261005182306_SequencingVendorCatalog` applied only to the
  verified configured local database: localhost / `phaeno_ops_clean_20260919`.
  It adds addresses, the service type and nullable catalog lineage for sendouts.
  No historical catalog associations or operational data were invented.
- EF pending-model check: no model changes. The complete generated ERD contains
  234 model tables, 3,471 fields and 560 foreign keys.
- Phaeno material/equipment and sequencing guides updated and reviewed
  October 5. Documentation generation/check passed: 56 guides, corpus/version
  `4993a3cf665d`. Owning plan and backend/frontend/E2E test plans updated.
- Working-tree whitespace check passed. No staging, commit, push or deployment.

## Connected browser inspection

Inspected the authenticated local application using the existing user session,
without saving catalog records or operational fixtures.

- Purchasing supplier search and summaries expose service/address configuration.
- Supplier detail shows Shipment addresses, New address and inactive history.
- Empty address Save exposes the required label/street/city/country errors.
  Modal header/body/footer are present; Cancel returns focus to New address.
- Selecting Sequencing service in the product form removes inventory-unit and
  expiry inputs and explains the active-address prerequisite. Unsaved changes
  use the shared discard confirmation with a meaningful body and safe focus.
- The supplier Actions trigger has one visible dropdown indicator.
- Shipment preparation exposes three required catalog selectors and disables
  Save when no eligible vendor exists, with explicit Purchasing setup guidance.
- At 320 CSS pixels, page width remains 320, the shipment modal width is 288,
  and header/body/footer fit the viewport. The body scrolls independently,
  Save/Cancel remain visible, and Cancel initially receives focus. Address
  creation was also inspected at 320 pixels without horizontal overflow.
- Cancelling preparation returns focus to the batch Actions trigger. Local
  sign-in and batch detail load after the API rebuild; no operational command
  was submitted.

The connected catalog has no configured real sequencing vendor yet. Populated
vendor/address review, shipment saving and physical/provider/scientific acceptance
remain pending. Regression cases for ownership, stale choices, last-address
protection, address snapshots, vendor-change clearing and catalog-refresh recovery
were authored, but automated execution has not been requested.

## Local data preservation

Read-only PostgreSQL probes before/after the migration and after browser reads
returned matching row fingerprints. Sendout hashing excludes the six newly added
nullable lineage columns so it compares the original facts.

| Record | ID | Matching fingerprint |
| --- | --- | --- |
| Completed demo batch | `63aab01e-e550-4eee-8df7-63e25d08e14c` | `1d702a23e3421821158046d27bac02fa` |
| Existing six-library batch | `8e80e870-684c-4abd-9502-1e380da4783b` | `2bd4dce1bb66ccf5bb9a32c36b684861` |
| Existing demo sendout | `b4fcae4d-6179-4811-a8fa-3dabc337b603` | `556e97fd277745319b8019bc72241959` |
| Demo sequencing tube | `7902ed64-acff-49c4-ad16-f0b15579b8c3` | `7b2caf29e7b14b5c5b24382f5ea70219` |
| Demo source library | `929f32db-8868-479a-820f-d6386ca6f608` | `2814c2eec77597be71e546bb2bcf2b73` |

Biological material transfers remained at 8. The six-library batch was already
InProgress (started October 5 at 10:52:18 AM) in the initial fingerprint; this
feature work did not start it, allocate tubes, transfer material or create a
sendout. The temporary read-only probe is removed after verification.
