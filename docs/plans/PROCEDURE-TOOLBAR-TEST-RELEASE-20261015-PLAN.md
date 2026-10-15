# Procedure toolbar: preserving UI-only hosted-test release

The Owner requested commit, push and UI deployment on October 15, 2026. Scope is
the [procedure toolbar refinement](LAB-SETUP-VISUAL-AUTHORING-PLAN.md): grouped
Revision, Presentation and Paper size controls, with Actions in its own area.
Existing commands, authorization and revision navigation are unchanged. This is
the existing hosted test environment, not commercial activation.

## Target and preservation

Use Vercel team `cadexgenomics`, Portal project
`prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R`, root `frontend`, production target and
canonical `https://portal.phaenobiotech.com`. Verified baseline frontend is
`dpl_72xTuemmuELHyQeujcZhJPqU9KDy`, source
`573843a1e3cb40bbc207c865aace4c8d7debf727`, version boundary `1792029304727`.

The API remains at that same source, run `38668224349`, with migration
`20261014234438_ProtocolFirstLabProcedures`. No API deployment, migration,
replacement database, reset, data conversion or file write is required. Preserve
all accounts, scientific/Commercial/Lab/Finance data, audit and procedure pins.
Explicitly retain all `website.web_contacts` and `website.web_orders` records,
including completed/unsubscribed history and original identities/contents.
No historical email replay or reactivation is in scope.

Retain the [previous preserving release recovery evidence](../operations/lab-authoring-hosted-test-release-20261014.md):
isolated database restore rehearsal and checksummed encrypted/off-server recovery
archive `pre-migration-20261015T015919Z-573843a1e3cb`, encrypted dump SHA-256
`28546df1aeeb58dfa1e1a0b692c7d7a99d32b9bee37290b655eba2a7eb81f5eb`, plus
the private runtime archive. This UI release does not replace or restore the
database, so no new database snapshot/cutover is required. Preserve PostgreSQL 18
volume `phaeno-portal-green-postgres18-data`, S3 provider, retained Local bytes,
objects/versions and the existing hosted-test S3 recovery deferral. No populated
S3 recovery qualification is claimed. UI rollback needs no data/file restoration.

The existing Phaeno help guide remains accurate and was reviewed without changing
its text/version. Keep corpus `1d0e7cb954a3` (56 guides); deployed API corpus file
SHA-256 verifies as `ac4c3d5bdce4ff3981789db7f5a5b7bcab221b53056a95e954be024e579a6527`.
This avoids a mismatched UI/API help-search contract in a UI-only release.

## Preparation, cutover and rollback

Commit only the two toolbar components and owning/release/verification documents.
Exclude the concurrent user-card documents and their readiness changes. Verify
remote equality and freeze a SHA-256 archive of committed source. Stage that exact
GitHub commit as production with automatic domain assignment disabled. Require a
ready build and matching project/source identities. Verify staged procedure route,
root/assets, API health and anonymous authorization through protected access.

Promote the exact staged build without rebuilding. Keep skew protection enabled;
advance only its existing version boundary to this compatible build's creation
time so an older browser document pin does not retain the previous toolbar.
Verify canonical alias, clean and previous-pin entry assets, then actual signed-in
procedure rendering, view/paper selection and keyboard menu behavior. Use read-only
smoke checks without procedure saves, approvals or hosted operational fixtures.

If staging fails, leave the current alias untouched. If promoted behavior fails,
promote retained compatible baseline `dpl_72xTuemmuELHyQeujcZhJPqU9KDy` and verify
canonical assets/current browser routing. Adjust the version boundary only if
required to route existing browsers to the restored build; preserve protection.
No API or database rollback is needed or authorized.

Keep `Deploy Portal Green` disabled throughout. Preserve both Vercel Git deployment
holds, identity/provider settings and browser security/session permissions. Record
exact source/archive/deployment, build, alias/pin, browser and bounded error evidence
in the completion receipt; commit/push that receipt separately without rebuilding
unchanged application code.

## Verification and qualification limits

Local TypeScript, scoped ESLint, production build, docs generation/check and
whitespace checks pass. Manual local checks cover equal baselines at 1280 CSS
pixels, no overflow at 390 CSS pixels, overview/bench, Letter/A4 and keyboard
Actions opening/Escape focus return. Temporary viewport overrides are restored.
Automated suites are not requested/run for this layout-only change. Invalid browser
screenshots were discarded; do not present them as visual evidence. Native PDF,
touch, 200% zoom, assistive-technology and physical/scientific acceptance remain
separate from this release. Scan bounded hosted UI errors and verify the API/source
identity and deployment holds are unchanged after promotion.
