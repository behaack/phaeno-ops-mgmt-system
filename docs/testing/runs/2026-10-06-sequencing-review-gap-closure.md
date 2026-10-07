# Sequencing review gap closure

The Owner authorized fixes for all six reviewed findings: file admission/sealing
race, correction of published results, queued superseded inputs, stale-draft
recovery, ZIP reselection and unnecessary invalidation of unchanged libraries.

## Implemented behavior

- Final capture holds the same ordered file-set locks used by admission/import
  until commit. Pending coverage and saved-set admission remain rejected.
- Unchanged sets retain sequencing output identities when actual job reference
  and times are unchanged. Notes and unrelated failed libraries preserve valid
  downstream input links. Scientific changes retain correction history.
- Changes affecting approved/published results require explicit withdrawal under
  existing release permissions. Active processing inputs cannot be changed in
  place. Previously published withdrawn packages remain replacement targets.
- Current input checks participate in approval/publication transactions and run
  again before dispatch, completed-analysis capture and QC.
- Explicit Restart draft preserves entered metadata and complete, owned evidence
  for review. Reserved recovery metadata is server-owned. Incomplete staging is
  not silently rebound. The replaced draft cannot reappear or accept new writes;
  exact restart retries reuse the new draft.
- ZIP reselection retains attribution, exclusions and retry identities. Completed
  server receipts restore their original identities when returning to an archive.
  Changed attribution creates fresh commands rather than overwriting receipts.

## Verification

The focused backend slice passed 25 tests against an isolated loopback database
copied from the configured local database. The combined synthetic journey uses
actual local ZIP and FASTQ bytes, scan failure/retry, stored checksums, partial
coverage, exact replay/conflicts, independent-connection admission locking,
immutable revisions, draft recovery, superseded queued dispatch denial, QC
Fail/Hold/Pass and withdrawal before correction. The affected journey was rerun
after the replacement-draft selection and restart replay guards were added.

Existing PostgreSQL regressions passed for concurrent package registration,
independent scientific approval, separate purchased runs, assembly recovery and
governed Customer transfer completion/cancellation/failure/cutoff. The focused
frontend workspace/ZIP slice passed nine tests, including confirmation structure,
initial focus, restart focus return, current entries and reviewed ZIP recovery.

Build, TypeScript, scoped lint, generated-documentation checks and diff checks are
recorded at the final checkpoint. Documentation generation produced 56 guides,
corpus prefix `a452d71113d2`. No model or migration changed. Existing local batch
results/evidence are preserved; tests did not write to the configured database.
No production, Git, auth, dependency or provider activation is included.

These are synthetic application checks. They do not establish real DPS access,
scientific validity, real independent laboratory approval or hosted acceptance.
The application still uses the unavailable processing adapter. The previous
browser file-chooser limitation is not claimed resolved by API tests.

Final checkpoint: complete Debug solution build passed with zero warnings/errors;
TypeScript, scoped ESLint, nine frontend tests, the affected PostgreSQL replay/
recovery journey and documentation/diff checks passed. The local IIS preview was
restored using its configured Development launch profile and returned HTTP 200 at
`/api/health`. The target still has two saved result versions; the configured
database has zero managed FASTQ sets and zero assembly QC records. The isolated
verification database and its temporary snapshot were removed. Active local
runtime logs are retained for the running preview.
