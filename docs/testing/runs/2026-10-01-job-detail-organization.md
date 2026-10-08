# Customer/Partner Job detail organization — October 1, 2026

Owner-approved local implementation: current shipping task above Phases, Files
and results, Order and billing, and History. One ordered phase list replaces the
separate sent-phase and after-shipping summaries. No persisted model change.

## Verification evidence

- API compilation passed with zero warnings/errors. The local IIS Express API
  was restarted; `/api/health` returned 200. This is service-health evidence,
  not an authenticated business acceptance result.
- Frontend TypeScript, scoped ESLint and documentation consistency checks passed. The final
  generated help corpus contains 56 guides, hash prefix `700a52f43d43`.
- Manual browser review used actual components with synthetic Customer data and
  read adapters. All write adapters rejected mutations. No kit request, hold,
  quote decision, shipment confirmation or carrier handoff was submitted.
- Synthetic preview: accepted orders default to Phases; Phase 2 Request remains
  current after Phase 1 dispatch. Receive shows kit dispatch separately from
  specimen dispatch and has no preparation form. Unaccepted orders default to
  Order and billing and show no shipping steps.
- Preparation entries survived supporting-tab changes. Cached query data keeps
  the task mounted during background refresh; authored integration coverage
  exercises this behavior without mirroring the implementation.
- Send retains its title and directly opens Confirm shipment contents. Completed
  paired preparation and kit-delivery panels are omitted from this current task.
- Phase expansion uses exact sample identities and one expanded cohort. Result
  filtering, keyboard tabs, accessible tab/panel relationships, active-hold
  navigation, a meaningful hold-dialog body and initial Cancel focus were checked.
- Desktop at 1280 pixels and phone at 390 pixels reflowed without horizontal
  overflow. Phone dark-theme presentation was inspected. Temporary viewport
  settings, preview tabs/server/files and isolated build artifacts were cleaned up.

Screenshots: `output/job-detail-evidence/desktop.png`,
`mobile-before-acceptance.jpg`, `mobile-dark.jpg`, and `send-confirmation.jpg`.

## Limits and regression sources

Automated tests were not run under the repository's request-only rule. Updated
sources cover phase lists, phase filtering with duplicate sample names, URL
selection, default commercial review, guarded downloads and preservation of
unsaved preparation during tab changes/refetches. Live provider, physical kit,
laboratory and production-release acceptance remain outside this UI review.
