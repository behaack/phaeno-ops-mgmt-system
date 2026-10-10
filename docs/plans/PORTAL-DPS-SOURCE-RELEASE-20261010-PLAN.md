# Portal DPS source and laboratory UI release — October 10, 2026

## Authorized scope and target

The Owner requested deployment after consolidating the current source into main.
Release the matching Portal API, Portal frontend and help corpus, including the
POMS-side DPS adapter and laboratory UI recovery changes. This is a bounded update
of the existing production-hosted test environment, not commercial activation.
DPS connection, dispatch and real output acceptance remain disabled pending Chris
Yourch's service validation. Do not copy local mock Customers, orders or FASTQs.

Target the existing Portal Green runtime at `/opt/phaeno.portal-green`, PostgreSQL
18 in `phaeno-portal-green-db`, canonical database `phaeno_portal_green`, API
`https://api.phaenobiotech.com`, and Portal UI `https://portal.phaenobiotech.com`.
The Vercel target is Cadexgenomics / `phaeno-ops-mgmt-system`
(`prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R`), production environment, frontend build root.
The Website frontend, other applications, DNS and Nginx routes are outside scope.

Preserve all hosted accounts, Clerk mappings, memberships, configuration, business
and laboratory records, scientific receipts, audit history and private file bytes.
No reset, replacement database, data conversion, EF migration or identity cutover
is required. The September 29 hosted replacement is complete; do not repeat it or
apply the initial migration to a populated database. Pin the live database,
migration baseline, API image/source and frontend deployment immediately before
activation. Historical receipts alone do not prove the current target.

## Recovery and storage boundary

Preserve the hosted-test S3 provider, exact versioned scientific objects, ClamAV,
private mounts, existing processing flags and protected runtime configuration.
Retain all existing encrypted database/Local-file recovery copies and release
images. Verify the existing recovery receipts and rollback revision before
activation; preserve their private identifiers outside public source.

The Owner's [S3 testing cutover waiver](S3-HOSTED-CUTOVER-PLAN.md) remains applicable:
S3-aware backup, off-server protection and populated S3 restore are deferred until
commercial production readiness. Do not run the Local-only coordinated backup
against S3 or represent its historical archives as current S3 coverage. Preserve
the disabled Local-only timer and explicit testing-backup deferral. This release
neither removes existing recovery nor fulfills the production recovery gate.

No replacement database is prepared because this release preserves the active
database and model. If preflight reveals a pending migration, changed target or
required data transformation, stop before activation and revise the scope.

## Preparation and cutover

1. Fix release-blocking compilation failures and regenerate matching API/UI help
   artifacts. Build the full API solution and frontend production output; check
   TypeScript. Full regression and real DPS acceptance remain deferred unless
   separately requested. Record actual checks, never infer passing tests.
2. Commit the release preparation on main and pin its exact SHA. Stage a Vercel
   Production deployment from an isolated archive of that SHA with live domains
   unassigned. Verify its source metadata, rendering and sign-in.
3. Verify the actual hosted target and retain the prior API/image/UI checkpoint.
   Confirm no DPS runtime activation and no scientific writes are planned.
4. Temporarily enable the protected manual Deploy Portal Green workflow and run
   that pinned source with storage/scanning/bootstrap Preserve, migrations false,
   Clerk identity cutover false, and hosted-test S3 configuration false. Keep the
   Vercel Git deployment holds unchanged. Restore the workflow hold after the run.
5. Require successful API/image/source and database health verification before
   promoting the matching staged Portal UI without rebuilding.

## Rollback and acceptance

The existing non-migration API release script restores the prior API image when
its health checks fail. Retain the prior release path and protected settings. If
later acceptance fails, restore the matched previous API and Vercel frontend.
Preserve all new records and file versions; do not restore an old database over
new activity without a separate reconciliation decision. No bucket, object,
volume or historical database deletion is part of rollback or cleanup.

Require matched deployed source identities, unchanged database/migrations and
storage/scanner/worker selections, API/database health, Portal/help/sign-in
rendering, direct and proxied anonymous protected-route rejection, public Website
dial tone, and review of new runtime errors. Read-only authenticated organization
and laboratory navigation checks require a suitable session. No smoke action may
create orders, run DPS, upload outputs or approve/publish scientific results.

Preparation checkpoint: API Release build initially found a missing namespace
import in DPS output scanning; after correction the full solution builds with
zero warnings/errors. Frontend TypeScript and production build pass. Regeneration
corrected a stale help-corpus hash; the API corpus must be generated alongside it.
Hosted preflight, staged/live acceptance and deployment are not yet complete.

The first protected release run, 38076718961, passed compilation, packaged-help
checks and hosted file-service preflight, then stopped during container publish:
the new embedded contract schema was absent from both the deployment archive and
Docker build stage. No running API image was replaced, and the staged frontend
was not promoted. Package the exact canonical schema in both paths and retry the
bounded release. Docker Desktop is not running locally; the protected container
build must verify this packaging correction before activation. The workflow hold
was restored and independently read back as disabled_manually.

## Completed preserving release

Corrected application source `a1d3fbb01747e409a67b99ede1a3ca33063010ab` is active
on both API and Portal frontend. Protected run 38077216862 succeeded, including
container publish, scanner checks, API/database and Website smoke. The exact-source
staged frontend was promoted only after API health/source verification; Vercel
production metadata confirms the match. No migration, reset, storage conversion,
identity cutover or DPS activation occurred. Post-release health/rendering and
anonymous authorization checks pass; the live sign-in form renders. The bounded
frontend error query returned no entries. The workflow hold and Vercel Git holds
are restored. Existing encrypted off-server recovery remains available with the
same verified digest; current S3 recovery remains explicitly deferred for testing.
See the [completed release receipt](../operations/portal-dps-source-release-20261010.md)
for evidence and the separate regression, authenticated and real-DPS boundaries.
