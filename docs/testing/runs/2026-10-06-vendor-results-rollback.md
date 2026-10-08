# Vendor results rollback and form refinement — October 6, 2026

The Owner authorized removal of legacy-repair code and a local rollback of
PH-BAT-20261004-TAHDCRV5. Subsequent refinements define no-run closure, batch-failure
entry and required successful-library data locations.

## Completed local data patch

Target: `localhost:5432/phaeno_ops_clean_20260919`, verified from the configured
Development connection. Batch `8e80e870-684c-4abd-9502-1e380da4783b` and sendout
`80513bc2-5b83-4586-9a13-918e2431b0db` were guarded by identity, status, version,
known timestamps and exact dependent-row counts. No scientific output referenced
the sendout. One transaction returned the batch to InProgress / Vendor received,
cleared completion/run/receipt/outcome fields, removed three simulated custody
entries, one exception and one storage reference, and appended two audit entries.
Batch/sendout versions advanced from 25/8 to 26/9.

The pre-patch recovery copy is `.tmp/vendor-results-rollback-TAHDCRV5-before.json`,
SHA-256 `A1A406D6DDD9D87B2A20E5912CF91F25D6DF90965EC157EE31D8D73C383943B0`.
The after copy is `.tmp/vendor-results-rollback-TAHDCRV5-after.json`. Comparison
confirmed six memberships, tube-transfer identities, shipment/vendor metadata,
four retained custody entries and shared work-order/projection rows unchanged.
The other batch was not patched. Preserve these recovery copies.

## Current implementation

- Removed retrospective completed-outcome capture, obsolete outcome/storage
  methods/DTOs/clients, the completeness flag and historical recovery presentation.
- Initial results capture requires Vendor received. The Owner subsequently
  authorized editable recorded results with a fresh explanatory note. Each
  correction stores the full previous metadata/exception/completion snapshot,
  current values, note and actor in a new history event. Existing locations remain
  declared history and count toward coverage.
- Run not performed is always visible. It marks all submitted libraries Fail and
  shows only vendor reference, checkbox and required reason. Run and receipt times,
  outcomes, exceptions and locations are hidden and excluded from the command.
- No-run closure displays Run not performed, stores no actual run/receipt time,
  audits the server recording time and does not advance sequencing/data processing.
- Batch outcome replaces Default library outcome. Fail hides exceptions/locations
  and leaves Results notes below the outcome. Success permits Failure exceptions.
- Per-library failed rows retain their identities but disable location input,
  remove required indicators and exclude any retained draft path from validation
  and submission. The API rejects references for failed members.
- Successful-library locations are required, either by one covering batch reference
  or a reference per successful member. The form and API enforce coverage.
  Per-library required markers remain visible despite hidden repetitive labels.
- Desktop modal maximum is 44rem (704px), with shared phone margins/scrolling.

## Verification boundary

Full backend solution compilation, including updated regression sources, passed
with zero warnings/errors. Frontend TypeScript and scoped ESLint passed at the
logical implementation checkpoint. Help generation/checks are refreshed with the
current guide. No automated suites were executed under the request-only policy.
New/updated regression sources cover no-run null times, current progression,
failed-reference rejection and excluded location drafts; compilation is not a
claim that those tests executed.

Connected manual presentation and final freshness checks are recorded below when
complete. No new vendor result is saved during that review. No new migration,
production write, deployment or Git mutation is part of this refinement.

The Owner separately saved a new local test result after the rollback: batch /
sendout versions 27/10, performed run, all-library Failure and no locations. That
user-entered record is preserved. The rollback verification describes its completed
one-time checkpoint, not the current state after the Owner's later save.

## Numbered version activation

The Owner authorized numbered versions. Additive migration
`20261006211609_VendorResultsVersions` creates only the immutable snapshot table,
unique sendout/version index and parent/author FKs. It is applied to the same
verified local database. The full ERD now includes 235 tables, 3,481 fields and
562 FKs. No production schema change or runtime legacy initializer was used.

Recovery copy `.tmp/vendor-results-versioning-v1-before.json` has SHA-256
`07030BB649B133B4380E3019B65DE6C9B8F7EB651FDD82545293A502A28A9A7E`.
A one-time guarded insert preserves the current saved result as v1 with its
original Bill Haack author and October 6, 13:23:30 Pacific entry time. Database
comparison proves the reference, run/receipt times, outcome, note and all six
members match current values. Current batch/sendout versions remain 27/10;
the insert did not change the Owner's current result or custody history.

Every subsequent save now appends the next immutable snapshot in the same
transaction as the current-value projection and correction event. Earlier versions
have exact read-only URLs; science capture pins the available version identity in
its immutable lineage JSON. Snapshot save/read/replay regressions are authored
and compiled, with suites unexecuted under the request-only policy.

Connected local manual read proof passes: current Results v1 badge; Results versions
showing author/time/note; exact `/results/1` navigation displaying the saved
reference, times and six outcomes; Read-only status and no edit controls in that
snapshot. A new v2 operational save is not fabricated for this visual review.

Final connected form proof passes in a separate review tab, preserving the Owner's
open draft: Edit results uses the pencil/menu label and matching title, explains
v1 → v2 creation, has editable reference/dates/outcome and requires a fresh note.
An empty-note submission is blocked in the form and focuses notes. Batch Fail
shows no exception/location controls. In Per library, a failed row has disabled /
not-required input and no marker; a successful row has native/ARIA required and a
visible shared marker. Run not performed shows exactly reference, checkbox and
reason controls; measured desktop maximum is 704px. Temporary changes were
discarded, focus returned to Actions, the review tab closed and viewport overrides
reset. No valid result save was made by the agent.

The exact-version page measured no editable fields and no horizontal overflow at
320px CSS. Browser zoom was accounted for through viewport sizing; the Owner's
zoom preference was preserved. Screenshots are saved in the chat visualization
folder as `results-version-1.png` and `edit-results-no-run-version.png`.

Final static checkpoint: complete backend solution compilation passed with zero
warnings/errors, full frontend TypeScript and scoped ESLint passed, help corpus
`f9b1a1737251` passed freshness checks and whitespace checks passed. New tests are
compiled but unexecuted. Current local API health is 200. Production, Git publishing
and an actual v2 save/replay/concurrency acceptance run remain outside this scope.
