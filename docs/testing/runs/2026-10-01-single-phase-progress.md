# Single-phase Job progress — October 1, 2026

Owner-authorized local presentation refinement. The first supporting tab is
Progress for Customer and Partner Jobs. Single-phase details are immediately
visible; multi-phase Jobs retain their ordered expandable list.

## Verification

- Frontend TypeScript, scoped ESLint and generated-help consistency checks pass.
  The help corpus contains 56 guides, hash prefix `dca202afcbbe`.
- Manual browser review uses the actual shipping, progress, preparation and tab
  components with synthetic records and read adapters. Every write adapter rejects
  mutation. No kit request, cancellation, sample confirmation or shipment was saved.
- Single sample: Shipping (1 sample), order-based kit and sample confirmation
  wording, no Phase 1 expander, immediate timing/sample/shipment details and
  Awaiting sample shipment before tube/container identities exist.
- Sent single sample: Shipping finished points to View progress, keeps the sample
  count and shows actual expected tube/container totals plus the saved shipment.
- Multi-phase: Phase 2 Request remains current after Phase 1 dispatch. Expanding
  Phase 1 exposes its exact sample identities and shipment; selecting Phase 2
  closes the first expansion. Laboratory processing guidance remains sequential.
- Keyboard Right selects Files and results. Kit request initially focuses Cancel;
  closing the dialog restores its opener. Request and preparation confirmation
  dialogs retain header/body/footer regions and required-field presentation.
- Desktop at 1280 px and phone at 390 px have no horizontal overflow. Light and
  dark layouts were inspected. No Phase 1 wording appears in single-order dialogs.
- Synthetic expansion initially exposed an incomplete sample fixture. The shared
  fixture now supplies complete sample records and unique Customer Sample IDs;
  the expanded view was rechecked after correction.

Screenshots: [single sample desktop](../../../output/job-detail-evidence/single-phase-desktop.png),
[single sample mobile dark](../../../output/job-detail-evidence/single-phase-mobile-dark.png),
and [expanded multi-phase progress](../../../output/job-detail-evidence/multi-phase-progress.png).
Earlier organization evidence remains historical in its original verification record.

## Cleanup and limits

Removed eight obsolete output files: the old layout preview, generated model
patch, unused confirmation preview and five probe build intermediates. Retained
the previews referenced by existing verification records. The temporary preview
server, source files, Vite cache and browser viewport override were removed/reset.

Automated tests were updated but not executed under the repository's request-only
rule. Coverage includes single-order immediate details, meaningful waiting states,
real receipt totals after shipping, kit dialogs and completion routing. Existing
multi-phase membership and expansion cases remain. No Git publication, deployment,
model migration or operational data change was performed.
