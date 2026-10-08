# Combined vendor results — local checkpoint, October 6, 2026

The approved workflow now ends in one Results received stage. Record results
captures the vendor job reference, distinct run start/completion and receipt
times, library default/exception outcomes and optional permanent data locations.
The Next step row uses the Owner's requested wording and a trailing Record
results button. The header does not duplicate that action while the next-step
button is present. This supersedes the earlier separate final-outcome and storage
checkpoint, including its local API activation limitation.

## Verification

| Check | Result |
| --- | --- |
| Complete backend solution compilation, including test sources | Passed; zero warnings/errors |
| Frontend TypeScript and scoped ESLint | Passed |
| User-help generation | Passed; 56 guides, corpus `37b2c261c1a3` |
| Additive local migration | Applied to `localhost:5432/phaeno_ops_clean_20260919`; only two nullable columns, no data conversion/reset |
| Database ERD | Regenerated from the current complete snapshot |
| Local API activation | Updated API serves HTTPS port 44399; health and authenticated batch views work |
| List/detail stage presentation | Four stages; old completion without receipt remains Results not recorded; recorded receipt displays Results received independently of library outcomes |
| Next step control | Revised prose, one trailing direct button, no duplicate header item, modal opens and clean close returns focus to that button |
| Responsive layout | At 850px, description wraps to two lines beside the button; at 320px, page and modal have no horizontal overflow |
| Combined form | Vendor reference, separate run/receipt fields, explicit default outcome, reasoned library exceptions and optional scope toggle present |
| Unperformed failed run | Run fields disappear; missing reason blocks submission and focuses the reason field |
| Existing recorded results | Existing start/receipt and outcomes are read-only; missing run completion remains editable; six-library exception history retained |

The connected browser review used the two existing, explicitly simulated demo
batches. Invalid form submission was blocked before an API write. Draft entries
were discarded, and no results, locations, outcomes, shipment or scientific facts
were saved. Temporary viewport overrides were reset. Desktop screenshots are
saved in the chat's visualization folder as `record-results-next-step.png` and
`record-results-next-step-wrapped.png`.

## Boundaries

Automated backend, component and E2E suites were not executed under the repository's
request-only policy. Added and updated regression sources compile; this is not an
automated pass or database-backed results-save acceptance claim. A valid combined
save, replay/concurrency journey and provider/physical/scientific acceptance await
their appropriate requested checkpoint. No production migration, publishing,
deployment or Git mutation was performed by this implementation.

The updated local API runs from `backend/app/bin/CodexResults/net10.0` with logs
in `.tmp/combined-vendor-results-api.*.log`. Preserve these files while it runs.
