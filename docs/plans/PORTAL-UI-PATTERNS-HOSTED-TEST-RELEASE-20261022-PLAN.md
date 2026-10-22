# Portal UI patterns preserving hosted-test release — October 22, 2026

The Owner requested committing, pushing and deploying the completed UI consistency
follow-ups: shared page/record/list patterns, closer notification badge, six-area
control/format/status/pagination/detail standardization, fifteen-section gallery,
reviewed image baselines, automated guards and matched audience documentation.
The [implementation plan](UI-PATTERN-COMPLETENESS-PLAN.md) records local evidence.

## Target, preservation and release boundaries

Use the existing hosted-test Portal Green API at `/opt/phaeno.portal-green`,
PostgreSQL 18.6 database `phaeno_portal_green` and frontend project
`prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R`, team `cadexgenomics`, root `frontend`,
canonical `https://portal.phaenobiotech.com`. Baseline API/frontend source is
`0baf3adf57ae07b67d6f1497a01523774f98f7f9`; baseline frontend deployment is
`dpl_GHYkzK17enR3DSGiQTzbbriSrKRX`. Verify actual identities before activation.

No persisted model/migration, authentication contract, provider/storage setting,
scientific workflow transition or dependency changes are included. The only
backend change is generated help corpus content. Migrations and identity cutover
remain **false**. Preserve 29 migrations, all schemas and complete records,
identities/memberships, audit/research/laboratory/commercial history, runtime
settings, documents, Local files and S3 objects/versions. Explicitly preserve
`website.web_contacts` and `website.web_orders`, including IDs, complete contents,
dates, language/actors and unsubscribed/completed history. No reset/purge,
business writes, historical email replay or test-data insertion is authorized.

Public Website frontend projects and OCIA services/data are excluded. Retain
Portal/Website Vercel Git deployment holds, orphan-run quarantine, hosted-test
populated-S3 recovery deferral and disabled backup timer. Keep DPS mutual TLS
18883, the Simulated recipe and existing worker/scanner configuration unchanged.

## Recovery gate and preparation

Capture a fresh baseline of images/releases, all table fingerprints, migrations,
active assemblies, runtime flags, document/Local file hashes and modes, unrelated
service identities and frontend aliases/settings. Require zero active assemblies.
Under the deployment lock, archive database/runtime/documents/Local recovery,
compare archives to source and restore the database in an isolated PostgreSQL
18.6 container without live mounts/network. Verify all 250 table fingerprints,
migrations and complete Website intake records. Encrypt recovery, collect it
off-server and independently verify decryption, restore receipt, archive file
hashes/modes and Website contents. Retain previous image, compose/manifest/current
link and frontend deployment for rollback. No replacement database is needed:
this is an in-place application release with the existing database preserved.

## Release sequence

1. Review the scoped staged/worktree changes and existing local evidence; build
   the backend Release solution. Commit/push main and verify the remote exact SHA.
   Create/hash a Git archive from that commit; never package the mutable worktree.
2. Recheck orphan `39056745064`, its zero jobs and exact root-only `QUARANTINED`
   release fence. While this condition persists, keep `Deploy Portal Green`
   disabled and do not dispatch/rerun it. Follow the preceding authorized release
   path: exact-source protected `deploy-release.sh`, deployment lock and guards.
3. Run exact-source UI quality CI, including the new Windows image comparisons.
   Stage a production-environment frontend from the pushed SHA with custom-domain
   assignment disabled. Verify project/source, READY and protected root/assets.
4. After recovery and verification pass, activate the checksum-verified API with
   migrations/identity cutover false. Restart only the existing DPS tunnel to
   follow the replacement API namespace. Verify actual TLS discovery, health,
   unchanged settings, migrations, complete table/file fingerprints, matching
   help corpus/index and unrelated service identities before frontend promotion.
5. Promote the same staged production frontend without rebuilding. Retire prior
   document pins using the established skew boundary while preserving maximum
   age. Verify canonical/prior-pin asset hashes, public health/database ping,
   authorization denial, representative read-only signed-in UI/help if the
   available session permits, and bounded API/browser errors. Execute no saves,
   laboratory actions, account changes or file downloads with side effects.
6. Record exact source/image/deployment, CI, recovery, preservation and smoke
   evidence; publish a documentation-only receipt without another deployment.
   Verify holds/quarantine/unrelated services and clean only task-owned temporary
   packages/helpers, retaining encrypted recovery and rollback material.

## Rollback and acceptance limits

Preparation failure leaves the current release active. If API activation fails,
use the protected script's previous-image recovery and captured compose/manifest/
current-link, restart its existing tunnel and verify health/settings. Keep the
prior frontend active until API acceptance; restore its exact deployment if
post-promotion smoke fails. Never restore an older database over newer activity,
downgrade schema, remove quarantine or discard preserved records.

Gallery images and feature fixtures are representative checks, not every
authenticated journey, full assistive-technology/WCAG certification, scientific/
physical/provider acceptance or commercial activation. Remote CI and hosted
acceptance must be recorded separately from the completed local evidence.
