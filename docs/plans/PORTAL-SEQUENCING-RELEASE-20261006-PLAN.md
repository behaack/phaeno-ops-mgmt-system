# Portal sequencing results and FASTQ release — October 6, 2026

## Scope and authorization

The Owner requested an initial commit/push without deployment, then updated user
guides, tests to success, a second commit/push, and deployment including EF
migrations. The initial checkpoint is `70643766` on
`codex/portal-documentation-search-release`; no deployment occurred with that push.

Release the versioned vendor results, batch ZIP/individual FASTQ intake, reviewed
draft recovery, complete-input assembly guards, immutable assembly QC and existing
Customer release handoff. Actual DPS execution/access/output integration remains
unconfigured. Tentative upload limits remain bounded by the existing scanner.
No scientific threshold or provider connection is activated by this release.

Target the existing Portal green stack at `/opt/phaeno.portal-green`, PostgreSQL
18 database `phaeno_portal_green`, `api.phaenobiotech.com` and the linked Vercel
project `cadexgenomics/phaeno-ops-mgmt-system` (`prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R`),
canonical domain `portal.phaenobiotech.com`. Preserve all existing rows, users,
memberships, scientific facts, private files and runtime/storage/scanning/bootstrap
settings. Public Website deployment, OCIA, reset, legacy backfill, local fixture
copy, Clerk cutover and physical deletion are outside scope. Verify the
Portal-owned Website API and existing private services remain available.

This separate hosted plan uses the completed September 29 hosted replacement and
October 5 preserving release procedures; it satisfies the repository's hosted
database planning gate for one explicitly authorized manual release. Both Vercel
Git holds remain enabled. Temporarily enable the protected backup and deployment
workflows only for their manual runs, then restore their disabled states.

## Database and compatibility

The verified baseline is API `c781988630ddfdb07f0d76dd7c3bb9753c15d660` with twenty
applied migrations. The five reviewed forward changes preserve existing facts:

1. `20261006184613_CombinedVendorResultsReceipt`: nullable run-not-performed and
   actual run-completion fields.
2. `20261006211609_VendorResultsVersions`: immutable numbered result snapshots.
3. `20261006231728_FastqIntakeAndAssemblyQc`: drafts, file sets, uploads and QC.
4. `20261007000144_BatchFastqArchives`: archive staging and nullable import origin.
5. `20261007025545_VersionedVendorLibraryExceptions`: required result-version
   attribution and a version/member unique index. The migration refuses a populated
   exception table rather than guessing historical attribution. Both the configured
   local and hosted exception tables were verified empty. Result edits append
   exceptions, preserve prior versions and retain the deletion-protection guard.

Require twenty-five migrations after activation, six new empty tables at cutover,
unchanged existing application row counts and the complete 240-table ERD. No
historical locations are converted into bytes, no outcomes/times are guessed and
no missing result version is manufactured. Historical saved facts stay readable;
new successful result capture requires verified uploads. Inventory existing
completed sendouts before applying these stricter capture rules. Any destructive
remedy or incompatible live baseline requires separate Owner authorization.

## Preparation and recovery

1. Update the affected Phaeno guides, review metadata, generated corpus, owning
   plans and living test plans. Require successful full backend connected suite,
   frontend lint/type/unit and desktop/mobile browser suite, Release build, EF
   model consistency and credential/whitespace checks. Record intentional
   environment skips and synthetic evidence separately.
2. Inventory API/UI identities, runtime hashes, private mounts, scanner health,
   migrations, completed sendouts and all application table counts. Export a fresh
   hosted dump to a disposable local replacement/rehearsal database. Apply the
   exact idempotent migration SQL twice, require 25 migrations and unchanged
   existing data/counts. Verify cleanup of the temporary database/plain dump.
3. Commit/push the tested second checkpoint. Build an isolated production-
   configured Portal UI from that exact SHA, with production Clerk, mock sessions
   disabled and the existing API proxy. Stage with public domains unassigned.
4. Run the protected coordinated encrypted database/private-file backup using
   the existing backup-and-collect operation. Require isolated database/file
   restore, populated synthetic restore, encryption round trip, checksums,
   off-server recovery copy and API resume. Retain prior recovery sets.
5. Recheck the live baseline. Dispatch the protected API workflow for the exact
   application SHA with `apply_migrations=true`; storage, scanning and bootstrap
   remain Preserve and Clerk cutover remains false. The deployer also creates and
   restore-verifies its encrypted consistent-database pre-migration backup. The
   coordinated snapshot pauses API writes; additive deployment migration itself
   runs while the old API remains available and is not a second write freeze.
6. Verify the running API/source/image, 25 migrations, preservation counts,
   runtime invariants, private mounts and scanner/database health. Promote the
   same staged UI only after those checks. Verify health, Website ping/search,
   direct/proxied authorization, actual Clerk sign-in rendering, alias/source
   identity and bounded runtime errors.
7. Disable both protected workflows again, retain Vercel Git holds and record
   exact application, UI, workflow, backup and verification identities in the
   release receipt. Remove only task-created temporary verification outputs;
   preserve running local preview output and encrypted recovery evidence.

## Rollback and acceptance

Before database changes, revert the API image/runtime and public UI to their
inventoried baseline if release verification fails. After migrations or new facts,
prefer a reviewed forward fix. Coordinated recovery requires a write freeze,
restoration of the verified matching database/private-file snapshot, prior API
and UI, and preservation/accounting of facts written after that snapshot. Never
use migration Down to discard new FASTQ, result or QC history.

The automated flow is marked synthetic. Physical lineage, representative vendor
files, actual assembly/DPS access, independent scientific validity and signed-in
Customer/operator acceptance remain distinct from deployment smoke and test proof.

## Preparation evidence

The live baseline is healthy at API source `c781988630ddfdb07f0d76dd7c3bb9753c15d660`
with 20 migrations. Hosted sendouts, sequencing outputs and scientific-file rows
are empty, so no completed historical capture needs conversion for this release.
The preserving hosted-copy rehearsal passed twice: 234 existing table counts are
unchanged, all six new tables are empty, 240 tables and 24 migrations are present.
Migration SQL SHA-256:
`590b5ff481725d594a10fd230a1350710f1879c4ace271a3dd0efe2995c4364d`.
The disposable rehearsal database was removed. Full-suite verification and the
fresh coordinated recovery gates remain required before public activation.

Frontend verification now passes 1,457 tests across 228 files, with the three
previously suppressed Customer-hold cases intentionally skipped. The desktop/
mobile suite passes 212 cases with the two existing mobile-print skips and no
retries. Stable-source reruns resolved development hot-reload interference in
two mobile fixtures; the product behavior and their assertions were preserved.

The final five-migration rehearsal supersedes the initial SQL above. It passed
twice with 234 existing table counts preserved, all six new tables empty and
25 migrations. Final SQL SHA-256:
`8ef3c6e19da2e2ead0de72498475fc74611a45bf41a54f965011a9655928f691`.
The new version-attribution guard was applied only after verifying the local
exception table is empty; the hosted sendout/exception area is also empty. The
complete ERD is 240 tables, 3,548 fields and 583 foreign keys. The focused repair
checkpoint passes 13 cases, including the full operator journey and continued
denial of deleting recorded exceptions. The final full backend rerun follows.

Final verification: the complete connected backend suite passes 1,280 tests with
one Windows linked-directory fixture skip; frontend unit passes 1,457 with three
previously suppressed hold cases, and desktop/mobile browser passes 212 with the
two existing mobile-print skips and no retries. Complete Release/Debug builds,
full lint, TypeScript, ERD coverage, generated documentation and EF model consistency
pass. The 56-guide corpus is `2720e5faf305`. Source tests preserve all history,
scope, concurrency, permission and focus assertions. Deployment remains gated on
fresh coordinated recovery and exact-SHA API/UI activation below.

Final verification: the complete connected backend suite passes 1,280 tests with
one Windows linked-directory fixture skip; frontend unit passes 1,457 with three
previously suppressed hold cases, and desktop/mobile browser passes 212 with the
two existing mobile-print skips and no retries. Complete Release/Debug builds,
full lint, TypeScript, ERD coverage, generated documentation and EF model consistency
pass. The 56-guide corpus is `2720e5faf305`. Source tests preserve all history,
scope, concurrency, permission and focus assertions. Deployment remains gated on
fresh coordinated recovery and exact-SHA API/UI activation below.
