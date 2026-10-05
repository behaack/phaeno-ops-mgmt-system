# Vendor sequencing workflow — local implementation evidence

Date: October 5, 2026. Scope: Phaeno laboratory shipment preparation, vendor
tracking, final batch Success/Failure with library exceptions, and external result
storage references. No deployment, Git mutation, vendor message, physical shipment
or scientific sequencing is part of this checkpoint.

## Implemented

- Prepare shipment → Shipped → Vendor received (required ETA) → Sequencing →
  Results received → Success / Failure. Required dispatch destination/carrier/tracking,
  actual UTC times, evidence and separate recorded-entry/operator facts.
- Frozen physical tube/member/transfer manifest, destination freeze after dispatch,
  audited tracking/ETA updates, overdue ETA and CSV manifest export action.
- Final outcome defaults to all members, with one opposite-outcome exception and
  required reason per selected member. Finalization completes the batch atomically;
  the generic completion endpoint cannot bypass vendor outcome recording.
- Batch/member external file/folder/manifest references with label, notes, actor
  and entry time. Immutable references, stable request IDs, version checks and
  unchanged/changed replay handling. References remain unverified and do not register
  scientific outputs. Additions after finalization are allowed and missing successful
  library handoffs remain visible.
- View-first batch workspace, stage/outcome filters, library exception counts,
  bounded forms and a single contextual Actions menu. Updated Phaeno guide, search
  metadata, feature/test plans and complete generated database ERD.

## Verified locally

- Backend solution builds with zero warnings/errors, including authored tests.
- Frontend TypeScript check and scoped ESLint pass.
- Documentation generation/check: 56 guides, corpus prefix `56fff772e234`.
- API restarted with updated build; `/api/health` returns HTTP 200.
- Migration `20261005163942_VendorSequencingResults` adds eight nullable sendout
  columns and two new tables; its forward operation contains no deletion/conversion.
  Applied only to configured `localhost / phaeno_ops_clean_20260919`.
- Before/after database comparison retained 2 batches and 1 sendout. Fingerprints
  matched for batch rows (`d21bb2f9abe62a3436eb372ce37a6e11`), members
  (`ffd6ffd69df82bf5f3dfeb952a10edf7`), containers
  (`c5e5934053cdd880a4f54dd1a2a45cc3`), transfers
  (`1814725fa0b9209bb70555f6c6abd262`) and existing manifest/sendout fields
  (`46838c803a348c67d026a663dbc8d0e5`). No vendor outcomes were backfilled.
- Signed-in browser shows exact stage filters; historical outcome-unrecorded filter
  returns only the old completed demo. Its tube pair, 5 µL transfer and 15 µL remaining
  library balance remain visible. Existing absent shipment/result facts stay unrecorded.
- Manifest export saved `C:/Users/bhaac/Downloads/PH-BAT-20261005-JJFW5SJD-tube-manifest.csv`
  (369 bytes). Inspected header and sole data row: correct batch/provider, library and
  sequencing tube barcodes, 5 µL transfer, Catalog v5 and 5 µL minimum. Historical absent
  destination/carrier/tracking remain blank. The browser connector's download-event
  notification timed out, but the actual file and contents were verified independently.
- Final database inspection still matched every historical fingerprint; new references,
  library exceptions and outcomes all remained zero. Removed only the task's temporary
  SQL/fingerprint verification folder after recording this evidence.
- Actions opens by keyboard; one batch Actions chevron. Storage-reference modal has
  header, meaningful body and footer, initially focuses Cancel, validates empty required
  fields and returns focus to the batch Actions trigger after cancellation. No save occurred.
- Narrow page: `innerWidth = clientWidth = scrollWidth = 390` CSS pixels. In the
  inspected narrow reference form, input/select widths, left edges and heights align.
  Temporary viewport override reset. Semantic theme tokens reviewed; live dark-theme
  acceptance was not performed.
- Screenshot: `C:/Users/bhaac/.codex/visualizations/2026/10/05/01a10a62-1fae-7602-993d-1cef04d1c4e6/vendor-sequencing-workflow.png`.

## Batch-card placement follow-up

The initial first-row status placement crowded the name on mobile despite having
no horizontal overflow. The Owner clarified the narrow-layout requirement:
below 640 CSS pixels, keep Actions at the top-right beside the name, give the
description the full width below that row, and place the status pill below the
description. Wider cards retain status and Actions at the top-right while their
details wrap in the remaining column. This supersedes the initial mobile layout.

Manual inspection confirmed matching title/Actions top coordinates and status
below the description on both existing cards at 320 and 390 CSS pixels. At 640
and 1200 CSS pixels, title/status/Actions share their top coordinates. No card or
page horizontal overflow occurred. The Owner's current 427 CSS-pixel view shows
the names clearly with the status beneath the descriptions. Temporary viewport
overrides were reset to that original view. Keyboard Enter opens the unchanged
Actions menu; the trigger retains one chevron. Earlier Escape/focus-return
verification remains recorded above.
Scoped ESLint and whitespace checks passed; no automated suite or operational
write was performed. The existing user guide's batch Actions instructions remain
accurate and need no content change for this placement adjustment.

Screenshot: `C:/Users/bhaac/.codex/visualizations/2026/10/05/01a10a62-1fae-7602-993d-1cef04d1c4e6/sequencing-card-mobile-status.png`.

## Acceptance boundary

### Batch-number title and optional name

The Owner confirmed the batch number should be the primary title, with a distinct
user-entered optional name retained in secondary detail. The demo label is the
current record's optional name, not a legacy identifier. The other record's name
equals its batch number and is therefore not repeated.

Both linked list-card titles and dedicated workspace headings now use the batch
number. Read-only browser inspection confirmed both existing records and their
secondary text. At 320 and 390 CSS pixels, Actions remained on the first row,
status remained below the description, and neither card nor page overflowed.
The viewport was restored after inspection. Scoped ESLint, TypeScript and
documentation checks passed; the refreshed 56-guide corpus is `991c1d5477c0`.
The Phaeno guide and owning/E2E plans describe the final identity presentation.
No stored names, quantities or operational state were changed; no automated
suite was executed for this follow-up.

Screenshot: `C:/Users/bhaac/.codex/visualizations/2026/10/05/01a10a62-1fae-7602-993d-1cef04d1c4e6/sequencing-batch-number-titles.png`.

### Remaining workflow acceptance

Automated suites were not executed under the repository's request-only rule.
Authored domain/controller/UI regressions cover stage/time guards, ETA, destination
freeze, member exceptions, invalid reference locations and replay behavior. New
prepare-to-final-outcome writes, mixed-outcome finalization,
failure and overdue scenarios still need an end-to-end acceptance run. Read-only
browser inspection does not establish those results. Existing demo records were
preserved, rather than repurposed for new transitions.

Actual carrier/vendor, physical bench, storage access/byte verification, scientific
QC, Customer release and production acceptance remain separate. The Portal release
hold remains in force; no staging, commit, push or deployment was performed here.
