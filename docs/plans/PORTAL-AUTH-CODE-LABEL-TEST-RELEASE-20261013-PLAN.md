# Sign-in code source hosted-test release - October 13, 2026

The Owner requested submit, push and deploy for the reviewed authenticator-code
label and help update. Release the matching Portal API/help corpus and frontend
to the existing hosted test environment. The standing bounded Deploy Portal
Green enable/run/disable authorization applies. Commercial activation and
automatic deployments remain held.

## Target and preservation

Reuse Portal Green at `/opt/phaeno.portal-green`, API
`https://api.phaenobiotech.com` and Portal `https://portal.phaenobiotech.com`.
The protected deployment verifies PostgreSQL 18, container
`phaeno-portal-green-db`, database `phaeno_portal_green` and volume
`phaeno-portal-green-postgres18-data`. The verified Vercel target is
Cadexgenomics project `phaeno-ops-mgmt-system`, ID
`prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R`, team
`team_DbkKTfQmQz9atu435ZBugMDD`, root `frontend`. Its production-named hosting
is the existing test environment.

Preserve all accounts, memberships, configuration, Commercial/Lab/scientific/
Finance records, audit history, identity mappings, S3 objects and versions,
retained Local bytes, ClamAV and runtime/worker/bootstrap settings. Explicitly
preserve every record and field in `website.web_contacts` and
`website.web_orders`, including completed/unsubscribed history and actor references.
The prior release retained 12 contacts and six requests; require unchanged actual
before/after counts in this release. No data transfer, reset, replacement,
local fixture import, notification replay, subscription reactivation or request
reopening occurs. No migration, identity/provider/storage cutover or public
Website frontend release is authorized or required.

The [completed replacement plan](HOSTED-CLEAN-DATABASE-20260929-PLAN.md) records
the existing replacement database's preparation, cutover and retained recovery.
This release reuses that database. The
[preceding preserving release](PORTAL-REVIEW-CLOSURE-TEST-RELEASE-20261012-PLAN.md)
and [Website recovery receipt](../operations/website-intake-recovery-20261012.md)
remain applicable. Do not activate the Local-only backup timer against S3 or
claim current coordinated S3 recovery; the Owner's hosted-test deferral remains.

## Pre-release evidence and source

- TypeScript, scoped frontend lint, Customer message references, help generation/
  check and whitespace validation pass. The generated API/UI corpus contains
  56 guides and has version `a08fd5a07767`. No test suite was requested or run.
- Fresh API Release solution compilation passes with zero warnings/errors.
  Fresh EF comparison reports no model change since the last migration.
- [Retained recovery inspection](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/38497862677)
  succeeds: the closed pre-reset database exists and both encrypted recovery
  files match their verified hashes. This proves availability/integrity of the
  retained restore-verified recovery, not a fresh restore or S3 backup.
- The current canonical Portal deployment is verified as ready production build
  `dpl_57PDBLQLtv4ofyo3cGet91PWNoRs`, matching the preceding release. Retain it
  for rollback. The protected deployment pins the actual current API image.

Commit and push only the reviewed label/help sources and this plan on main.
Verify ordinary remote equality, freeze the full application SHA and hash its
exact `git archive`. Build/deploy from that task-owned extracted archive, which
excludes ignored credentials, runtime configuration, local data and build outputs.
Record the source SHA and archive hash as deployment metadata.

## Cutover and rollback

1. Stage an exact-source production frontend on the verified project/team with
   `--skip-domain`, retaining the canonical alias on the prior deployment.
   Require a ready client/SSR/function build, matching source/corpus metadata,
   rendered sign-in, proxied health and anonymous protected-route rejection.
2. Temporarily enable Deploy Portal Green and dispatch the verified source on
   main. Storage/scanner/bootstrap inputs are Preserve; migration, Clerk identity
   cutover and hosted-test S3 configuration are false. Disable the workflow once
   the run is underway and verify the hold is restored.
3. Require successful API/source/image/scanner checks and unchanged Website
   counts before promoting the staged frontend without rebuilding. Independently
   verify the canonical alias resolves to that exact deployment.

The no-migration deployment script restores the pinned previous API image on
health failure. For a later failure, restore the prior matched API and Vercel
build while preserving newer data, audit and object versions. Retain both releases
and all recovery copies. An old database must not overwrite new activity without
a separately authorized reconciliation decision.

## Acceptance and evidence boundaries

Verify exact source, corpus and label/instruction in the served frontend; API
health 200, database ping 204, Portal/help/public Website rendering, scanner smoke,
anonymous protected-route rejection and bounded API/frontend errors. Preserve
both Vercel Git holds and the disabled manual deployment workflow after release.
Use read-only checks; do not reset MFA, revoke user sessions, create users or
change provider settings to manufacture a verification-step browser session.
Actual provider MFA, keyboard/responsive verification of the challenge and
recovery acceptance remain unperformed unless a suitable user session is available.

Record application/deployment/run identities, outcomes and retained holds in a
completion receipt after verification. The MFA recovery answer is informational;
this release adds no self-service reset workflow.

## Completed release

Matched API and frontend source `60b176f0c7cdac308531efe3713d667942381ea5`
is committed, pushed and live. Protected run `38499219507` succeeds; production
deployment `dpl_HZEfxqABvABTUp1kusHQu5RaT7Z1` is promoted after API verification,
and the canonical alias independently matches it. Final staging uses Vercel's
existing GitHub connection pinned to the full SHA after local upload attempts
created no deployment. Automatic domain assignment remains disabled until the
explicit promotion. The archived-source hash is retained as metadata/evidence.

Website counts remain `12,6`; no migration ran. Health, rendering, scanner,
anonymous authorization, exact live/staged asset hashes and bounded frontend
errors pass. The restored workflow/Git holds and actual MFA acceptance limits
are recorded in the [completion receipt](../operations/portal-auth-code-label-test-release-20261013.md).
