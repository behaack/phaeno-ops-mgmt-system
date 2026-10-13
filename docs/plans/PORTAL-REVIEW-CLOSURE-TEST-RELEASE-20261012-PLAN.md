# Review closure hosted-test release — October 12, 2026

The Owner requested commit, push and deploy for the completed review/deficiency
closure. This authorizes a matched Portal API/frontend release to the existing
hosted test environment, including the standing bounded Deploy Portal Green
enable/run/disable authorization. Automatic deployments and commercial activation
remain held. The recovery/physical acceptance packet remains separate scope.

## Target and preserved data

Reuse Portal Green at `/opt/phaeno.portal-green`, API
`https://api.phaenobiotech.com` and Portal `https://portal.phaenobiotech.com`.
The protected workflow verifies PostgreSQL 18, container
`phaeno-portal-green-db`, database `phaeno_portal_green` and volume
`phaeno-portal-green-postgres18-data`. Vercel target is Cadexgenomics project
`phaeno-ops-mgmt-system`, ID `prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R`, team
`team_DbkKTfQmQz9atu435ZBugMDD`, root `frontend`. Its production environment
names the existing hosted test runtime; this is not commercial activation.

Preserve accounts, memberships, configuration, Commercial/Lab/scientific/Finance
records, audit history, S3 objects and their versions, retained Local bytes,
ClamAV, identity mappings, runtime secrets and worker/bootstrap settings.
Explicitly preserve all `website.web_contacts` and `website.web_orders` records,
including completed/unsubscribed history, IDs, original content, timestamps,
language metadata and recorded actors. The October 12 recovery restored 12
contacts and five historical requests while preserving the current request,
giving 12 contacts and six completed requests; verify current counts again.
Do not replay historical emails, reactivate subscriptions or reopen requests.

No reset, replacement, local test-data import, identity/storage/provider cutover,
S3 backup activation, scientific write or public Website frontend release is
authorized. The [hosted replacement plan](HOSTED-CLEAN-DATABASE-20260929-PLAN.md)
records the already completed replacement preparation; reuse its preserved
database and current migration history.

## Recovery and model gate

Use the [preceding preserving release](PORTAL-WEBSITE-OPERATIONS-TEST-RELEASE-20261012-PLAN.md)
and [Website recovery receipt](../operations/website-intake-recovery-20261012.md).
Retain the verified encrypted database/Local recovery and off-server copies,
the closed pre-reset database and both encrypted September 29 backup files.
The separately verified October 12 encrypted current-table copy plus the retained
source cover the recovered intake. Inspect retained-copy availability and hashes
again using the existing read-only protected workflow. Keep private artifact,
host and filesystem details in the private release receipt.

The Owner's [hosted-test S3 recovery deferral](S3-HOSTED-CUTOVER-PLAN.md) remains:
do not enable the Local-only timer against S3 or claim it protects current S3
objects. Historical recovery is retained; live coordinated S3 recovery and the
one-hour/four-hour commercial targets remain unaccepted operational gates.

The review changes read predicates, shared domain approval assessment, forms,
work discovery and documentation. No persisted model, migration or snapshot
change is planned. Fresh API Release compilation and EF model comparison must
pass. Use `apply_migrations=false`. The protected workflow pins the actual prior
API image/release, current database engine/mount, preserved file/scanner services
and Website table counts before/after. Unexpected model/history/target drift
stops activation; deployment does not authorize a destructive remedy.

## Exact source and cutover

1. Review the pending closure sources, tests, guides, recovery/preservation
   documentation and this plan. Commit and push main; verify remote equality.
   Freeze the full SHA and SHA-256 of its exact `git archive`. Exclude ignored
   credentials, runtime settings, local datasets and build/helper artifacts.
2. Confirm the Vercel project/team/root and current canonical alias. Current
   prior frontend is `dpl_753tSeojqisXXoP8dhn3GYXFDaYg`, application source
   `dedae5d23909fdf540dff2786bfdad308a8ae261`; verify these current pointers.
3. Extract only the exact committed archive into a task-owned directory. Stage
   its production frontend with `--skip-domain` and explicit project/team/source
   metadata. Verify build/corpus/rendering and proxied health/authorization
   through existing Vercel protection access. Retain the prior canonical alias.
4. Temporarily enable Deploy Portal Green and dispatch the verified main SHA.
   Storage/scanner/bootstrap inputs are Preserve; migration, Clerk identity
   cutover and hosted-test S3 configuration are false. Restore the workflow hold
   once the scoped run is underway and verify it remains disabled.
5. Require successful protected API/scanner checks, matching source/image and
   health before promoting the staged frontend without rebuilding. Verify the
   canonical alias points to that exact ready deployment.

## Rollback

The no-migration release script restores the prior API image if health fails.
For a later failure, restore the pinned prior matched API and Vercel build while
preserving newer rows, audit and object versions. Retain both application releases
and all recovery copies. Never restore an old database over new activity without
an explicitly scoped reconciliation decision. Recheck health, source, file
services, authorization, Website intake and holds after rollback.

## Acceptance and limits

Pre-release checkpoint: API Release build passes with zero warnings/errors;
fresh EF comparison reports no model changes since the last migration. Vercel
CLI verifies the documented project/team/root and existing production deployment.
API health (200), database ping (204), Portal and Website rendering (200) pass.
[Retained recovery inspection #2](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/38329932224)
passes: the retained database remains closed and both encrypted backup files
match their verified hashes. This verifies availability/integrity, not a fresh
restore or coordinated S3 backup. The Deploy Portal Green and Local-only backup
workflows remain disabled before the bounded release.

The [closure receipt](../testing/runs/2026-10-12-deficiency-closure.md) records
local passing evidence: 1,532 frontend tests with three existing skips, all 16
distinct affected backend cases through batch/follow-up, 39 browser cases,
strict-scientific measurements and the final quote/localization follow-up.
Release preparation adds fresh API Release/model/help/source/whitespace checks.
Vercel provides the production client/SSR/function build.

Post-release verify source/corpus metadata (`24626584a60b`, 56 guides), health
(200), database ping (204), Portal/help/public Website rendering, scanner smoke,
anonymous protected-route rejection and bounded frontend/API errors. When the
existing authenticated session is available, inspect Phaeno work discovery,
Website mailing-list paging and both guide/work destinations read-only. Do not
unsubscribe, complete intake, resend email, create orders, approve Finance or
change scientific state as smoke. Count preservation and prior full-record
recovery evidence are distinct from a new transfer; this release transfers no
application data. Record actual IDs, outcomes, retained recovery and restored
manual/Vercel Git holds in the completion receipt.
