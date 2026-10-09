# Scientific storage and progress release review — October 9, 2026

The Owner requested edge-case review, user documentation, full test suites,
commit, push and a preserving matched Portal release. This review includes the
staged laboratory navigation/specimen/sequencing work connected to storage and
progress. Credentials, temporary tools, previews, caches and logs are excluded.

## Review corrections

- Original S3 raw files could supply sequencing evidence for another library/run.
  Registration now checks the exact sample/library/purchased-run branch. Supporting
  documents retain sample scope. Regression cases reject mismatched identities
  and assembly-output paths, including repeated sample/library labels nested
  inside another library's raw folder.
- Empty multipart initiation identities fail before parts or verified receipts.
  Existing abort cleanup remains enforced.
- The S3 chooser wraps its callback so the selected object is its only argument.
  Selection, unavailable-source and oversized-source cases are covered.
- Report headings no longer skip a level below History & investigation; axe
  checks cover the rendered view.
- Fixtures use current laboratory/hold contracts and exact native-file selectors.
  The quote fixture no longer expires with the calendar. Five-tube accession has
  a bounded timeout appropriate to its complete scan/save journey.

## Verification and release boundaries

Lint, TypeScript, generated documentation consistency (56 guides, corpus
`539395971271`) and production frontend build pass. Final verification:

- Backend full suite: 1,285 passed, zero failed, two skipped, 1,287 cases.
  The opt-in database/private-file restore test subsequently passed with the
  installed PostgreSQL tools. Six final S3 regressions pass, including the new
  missing-multipart-identity case. Across full and supplementary runs, 1,287
  distinct cases pass; the Unix filesystem-link case remains skipped on Windows.
  Temporary PostgreSQL has commit tracking enabled independently of the owner's
  normal server; fixture writes stay in task-owned databases.
- Frontend: all 234 files pass; 1,483 tests pass and three Customer-hold tests
  remain intentionally skipped while that Owner-disabled feature stays off.
- Browser: the complete 214-case desktop/mobile suite ran. Its four remaining
  failures were a shared fixture's default view and a Trial action loading race.
  All 24 affected cases pass after correction. Across full and corrective runs,
  all 212 runnable cases have passing evidence; two physical-print cases skip
  mobile Chrome. No runnable failures remain.

The EF model has no pending changes and no new migration is included. Earlier
compilation-only checkpoints are superseded by these results.

Hosted preflight confirms 25 migrations, Local storage and ClamAV. A fresh
coordinated backup passed populated isolated restore, cleanup and encrypted
off-server collection. The backup hold is restored. Detailed recovery evidence
stays private. No live database reset/replacement or business/scientific smoke
write occurred.

Follow the [preserving source release plan](../../plans/PORTAL-S3-PROGRESS-RELEASE-20261009-PLAN.md).
S3 conversion still requires retained-file conversion, versioned originals and
S3-aware recovery under its separate cutover plan. Automated tests do not establish
real DPS processing or independent scientific acceptance. Hosting access was
restored with Owner-authorized official CLI authentication. Matched source
`0fbfa87c` is now active on the API and public Portal frontend. A second fresh
recovery point passed restore/cleanup and off-server verification before release.
Live checks confirm API/Portal/help/Website rendering (HTTP 200), sign-in markup,
direct and proxied anonymous laboratory rejection (HTTP 401), the exact API image
revision and public frontend alias. Storage/scanning and 25 migrations remain
unchanged. Workflow and Vercel Git holds are restored.

Browser-control initialization failed, so live verification used authenticated
Vercel HTTP checks and independent API/server metadata. Interactive signed-in
scientific acceptance was not exercised; its automated cases and the real DPS/S3
activation boundaries remain distinct. See the [release summary](../../operations/portal-scientific-storage-progress-release-20261009.md).
