# Portal gap-closure hosted-test release — October 11, 2026

## Authorization, target and preservation

The Owner requested deployment to the test server, with EF migration if needed.
This authorizes a bounded matched API/Portal UI release to the existing hosted
test environment. It supersedes the prior task's deployment hold for this release;
automatic deployment and commercial activation remain held. Customer-only i18n
and en-US alone published remain. Website frontend, other applications, DNS,
Clerk identities, provider activation and destructive data operations are outside scope.

Target: Portal Green at `/opt/phaeno.portal-green`, PostgreSQL 18 in
`phaeno-portal-green-db`, canonical `phaeno_portal_green`, API
`https://api.phaenobiotech.com`, frontend `https://portal.phaenobiotech.com`.
Vercel: Cadexgenomics, project `phaeno-ops-mgmt-system`,
`prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R`, team `team_DbkKTfQmQz9atu435ZBugMDD`,
production environment with build root `frontend`. Here “production” names the
existing hosted test runtime; it is not commercial launch approval.

Preserve every hosted account/membership, configuration, CRM/commercial/Lab row,
scientific receipt, audit record and file/object version. Do not copy local test
data. Preserve S3, its private/versioned originals, ClamAV, worker/bootstrap flags,
runtime secrets, retained Local bytes and encrypted recovery copies. No reset or
replacement database is prepared: the September 29 replacement is complete, and
this release updates that preserved target. Never rerun the clean baseline on a
populated database or rewrite migration history.

## Recovery and migration gates

The [hosted replacement plan](HOSTED-CLEAN-DATABASE-20260929-PLAN.md) records the
completed replacement and preservation/recovery boundary. The
[October 10 preserving release](PORTAL-DPS-SOURCE-RELEASE-20261010-PLAN.md) is the
established release path for the current target. The Owner's
[S3 testing recovery deferral](S3-HOSTED-CUTOVER-PLAN.md) remains applicable: retain
and verify existing encrypted recovery; do not run Local-only coordinated backup
against S3 or claim historical Local backup protects current S3 objects. S3-aware
recovery remains required before commercial production activation.

Preflight confirms the retained October 9 off-server recovery artifact is unexpired
through November 13 and its recorded archive digest is available for comparison.
Keep private artifact/server identifiers outside public source. Before activation,
pin the current API image/release and exact Vercel deployment, confirm PostgreSQL
18/volume/database identity, read migration history and preserve runtime/file mounts.
Validate retained recovery receipt/digest and rollback availability. Current public
health (200), database ping (204), Portal and Website rendering (200) pass; these
checks do not substitute for host inventory or authenticated acceptance.

No migration or snapshot files differ from the prior release source. The current
EF model check reports no changes since the last migration. Default release input
is `apply_migrations=false`. If host history reveals genuinely pending migrations,
inspect exact SQL first; apply only reviewed non-destructive migrations within the
Owner's stated scope after fresh encrypted, restore-verified database recovery.
Any reset, destructive transformation, target drift or incompatible old baseline
stops activation for a revised preservation/remedy decision. Do not infer reset
authorization from “run EF migration.”

## Exact source and cutover

1. The release comprises the approved gap-closure/review changes and matching help
   corpus, with current verification in the
   [closure receipt](../testing/runs/2026-10-11-system-gap-closure-final.md) and
   [review receipt](../testing/runs/2026-10-11-gap-review.md). Freeze an exact source
   commit and archive digest; exclude credentials, test output and local datasets.
   The current base/default branch is `6527b6dfb71bba2ed77a2baec7aeed3a7bfe47e8`.
2. Existing source changes are staged but uncommitted. The Owner explicitly added
   commit and push authorization on October 11. Commit/push the reviewed release
   and this plan, then deploy its real full Git SHA. Do not deploy the old base
   while claiming the new changes are present.
3. Stage an exact-archive Vercel production deployment with live domains unassigned.
   Confirm owner/project/root, source and archive metadata, rendering/sign-in and
   proxy behavior. Leave Vercel Git deployment holds unchanged.
4. Enable the protected manual Deploy Portal Green workflow only for the pinned
   source. Use storage, scanning and bootstrap Preserve; Clerk identity cutover
   false; hosted-test S3 configuration false; migrations false unless the gate
   above establishes a need. Run its host/file/scanner preflight and current-target
   checks before replacing the API. Restore the workflow hold after the run.
5. Verify API/image/source and database health before promoting the matching staged
   frontend without rebuilding. API startup loads the new documentation corpus/index.
   Record run/deployment/image IDs, migration disposition, recovery and actual smoke.

## Rollback and acceptance

Prior matched application source is `a1d3fbb01747e409a67b99ede1a3ca33063010ab`;
current Vercel production deployment is `dpl_5GLDquYCWMKTVBPUA7ZLE9oGz6R8`.
Pin the actual current API image/release immediately before cutover rather than
assuming historical records are current. The non-migration release script restores
the old image on failed health. Later rollback restores the matched API and Vercel
deployment while preserving all new records/object versions. No old database is
restored over new activity without a separate reconciliation decision. After any
migration, require the verified restore/forward-fix decision before image rollback.

Acceptance: matched source metadata; unchanged database identity/migrations and
storage/scanner/worker selections; API health/database ping; Portal, help, sign-in
and public Website dial tone; direct and proxied anonymous protected-route rejection;
scanner health and bounded runtime errors. Perform read-only authenticated scope,
work discovery and guide/search checks when a suitable session is available. Do
not create orders, upload scientific files, run DPS or approve/release results as
smoke tests. Restore manual/Git holds and retain exact recovery/proof identifiers.

## Preparation status

Vercel connector lacks project access; the existing authenticated CLI independently
verified the correct owner/project/root and rollback deployment. GitHub browser
session can access the protected workflow, currently disabled manually. Direct SSH
by API hostname lacks a trusted host-key mapping; use the established protected
workflow connection rather than weakening host verification. No server setting,
workflow hold, source commit or live application has been changed during preflight.
The Owner's explicit commit/push authorization is recorded. Release activation
awaits the pinned source, remaining host preflight and staged deployment checks.
The final API Release solution build passes with zero warnings/errors.

## Completed release

Application source `97da7807c1de86f6d60492a1d2ad825ee533eb7c` is active on both
API and Portal frontend. Protected run `38206214665` succeeds; staged deployment
`dpl_JB7682hbDJvSkCvZjCDCjafAWo7x` was promoted only after API source/health checks.
No migration, reset, identity/storage/provider activation or local data import
occurred. Post-release health/authorization and authenticated Phaeno work, Lab
navigation and refreshed help/search pass. The manual workflow is disabled again.
The Owner explicitly approved this bounded enable/run/disable sequence for future
requested deploys. See the [completed release receipt](../operations/portal-gap-closure-test-release-20261011.md).
