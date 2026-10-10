# UI workflow review October 10 2026

Scope: the Owner's local synthetic single-phase order 739XKNR4, two samples,
laboratory processing through sequencing completion, and ten FASTQ files per
sample. Application records are created and advanced through the UI. Synthetic
data do not establish physical laboratory, supplier, shipment or scientific
acceptance evidence for actual work.

## Confirmed issues and fixes

| Issue | Evidence | Resolution |
| --- | --- | --- |
| An account with multiple memberships cannot choose its own organization | The Owner's Phaeno account accepted mock Customer membership, but no UI selector existed; an accepted invitation could not be reopened to change context. | Owner approved membership switching and superseded the earlier prohibition. Desktop and mobile now show a native select beside an organization icon, with accessible name Organization and no visible label. Only existing session memberships are offered. Switching routes through Dashboard and resets Department scope using the existing provider. |
| Kit packing offers a lot inconsistent with its saved tube lot | A same-product, released lot was selectable, then completion failed with the backend's tube-lot identity mismatch. | Filter eligible tube lots by the kit's saved lot number, matching the existing backend case-insensitive check, and show the required identity beside the picker. Backend stock, QC and identity checks remain authoritative. |
| Closing a dirty kit packing form uses a browser confirmation | Source used window.confirm; the current journey encountered blocked native dialog interaction while recovering the form. | Replace the local dismissal with the shared three-region Dialog. Keep editing preserves entries and restores focus; discard leaves saved kit, tube and consumption records intact. The existing page-navigation guard is a separate follow-up below. |
| An earlier printed label cannot have its outcome recorded after the dialog state is lost | The Owner completed PDF printing, but returning to the tube page left the label pending and the outcome form unavailable. | Add Actions -> Record an earlier print to the label dialog. This requires an explicit outcome and the same exact barcode for success; it neither opens another print dialog nor infers successful printing. Printing and recovery choices share ActionMenu. |
| Completed uploads still show data handoff outstanding | Results v1 saved two successful libraries and ten verified FASTQs per library, but batch detail counted only external location strings. | Read the existing exact current results snapshot, show per-library verified file counts/run/layout and its identity link, and count those file sets toward handoff. Keep external references explicitly optional and unverified. Loading/error states do not infer missing data. No file or result is rewritten. |

## Items for follow-up review

- The shared useOrderDraftGuard still uses window.confirm for page navigation.
  This is confirmed by source inspection; replacing it across owning forms needs
  shared navigation-dialog coverage. Browser-required unload prompts remain
  browser-managed. The kit modal's own close confirmation is fixed separately.
- Preparation renders Record step in both Next step and the active protocol
  card. Both were visible during this journey, sometimes with differing loading
  states. Review whether one active entry point would be clearer; do not remove
  a usable capture action without verifying the guided workflow.
- The new mock prepared-library container displays a historical amount basis
  and unknown initial amount despite a recorded 20 microliter output. This is
  confirmed in the UI. Review the output-capture path against current material
  lineage rules before changing scientific attribution; no historical evidence
  or amount basis is inferred or rewritten by this task.
- ZIP proposals recognize R1/R2 but default every part to 1, even for filenames
  ending in 001 through 005. The operator must correct each part manually. Review
  recognizable split-part suggestions and a compact group-level mapping flow;
  explicit review and authoritative completeness checks must remain.

## Verification boundary

Organization selection has successful local Phaeno/Customer context changes,
390px layout inspection, keyboard focus movement and return, TypeScript, scoped
lint and UI documentation generation. Unit/E2E regression sources are updated;
automated suites remain request-only. TypeScript and scoped lint pass for all
touched UI, including the label/kit fixes and sequencing summary. Connected label recovery
rejects a mismatched scan and accepts the correct barcode; both output identities
are confirmed. The batch summary is verified against saved Results v1: two
libraries, ten verified files each, and no incorrect outstanding-handoff warning.
Automated suites have not run, per the repository's request-only rule.

## Mock journey completed

Order 739XKNR4 has one phase and two samples, UI-20261010-01 and UI-20261010-02.
It is assigned to the signed-in Bill Haack account through Order intake.
Both passed the synthetic preparation workflow and were assigned to batch
PH-BAT-20261010-N2YN6WU2. Both sequencing tube transfers record 5 microliters,
leaving 15 microliters in each library. The synthetic vendor workflow is 4/4
complete, with Results v1 and Success for both libraries. Each saved file set
contains five R1/R2 pairs (ten files), group 1 and consecutive parts 1-5, purchased
run 1 and new preparation. Every file has 100 synthetic 150-base reads and passed
managed-storage/FASTQ verification through the UI. No actual vendor run,
physical shipment, scientific approval, assembly or Customer release is claimed.

No dependency, authentication-provider change, new backend authorization rule,
database migration, Git mutation or deployment is included.
