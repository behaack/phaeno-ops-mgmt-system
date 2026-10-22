# Portal UI adoption and illustrated-help hosted-test release — October 22, 2026

The Owner authorized committing/pushing the five completed UI consistency
priorities and deploying the Portal updates. Release the shared shaded panel and
table headers, status/date/feedback adoption, actual-feature gallery and checks,
32 refreshed guide images with 137 callouts, and paired 62-guide corpus. The
engineering gallery and capture provenance remain outside production assets.

## Target and preservation

Use the existing Portal Green API at `/opt/phaeno.portal-green`, PostgreSQL 18.6
database `phaeno_portal_green`, and Vercel Portal project
`prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R` in team `cadexgenomics`, root `frontend`.
The canonical address is `https://portal.phaenobiotech.com`. Verify baseline
source `669b93365ca02db58ce8f55dcb14651059c75ee6` and frontend
`dpl_CJsvwcBncLwbV1U4St51D3dEA7yy` before activation.

There is no persisted-model, migration, authentication, runtime configuration or
provider change. Migrations and identity cutover stay false. Preserve every
schema and complete record, memberships, research/laboratory/audit history,
documents, Local files and S3 objects/versions. Explicitly preserve all records
and states in `website.web_contacts` and `website.web_orders`, including original
IDs, contents, timestamps, language and actors, completed/unsubscribed history.
No reset, purge, email replay, fixture insertion or business/scientific action.
The public Website frontend and OCIA services are outside this release.

## Recovery and release sequence

1. Review the scoped changes and existing verification. Recheck documentation
   freshness, reviewed image manifests, whitespace and backend Release build.
   Commit/push main; verify the remote SHA and create a hashed Git archive from
   that exact commit, never from the mutable worktree. Require exact-source UI
   quality CI, including Linux feature checks and 48 Windows image comparisons.
2. Confirm orphan `39056745064` still has zero jobs and its exact root-only
   `QUARANTINED` release fence is intact. Keep `Deploy Portal Green` disabled;
   do not dispatch/rerun the orphan. Use the established protected host release
   path with its deployment lock, source verification and safety checks.
3. Capture fresh database, runtime, documents and Local recovery. Verify archives
   against their source; restore the dump in isolated PostgreSQL 18.6 without
   live mounts/network. Compare all table fingerprints, migrations and complete
   Website history. Collect encrypted recovery off-server and independently
   verify decryption and every archived file hash/mode. Preserve existing S3
   objects and the hosted-test populated-S3 recovery deferral/disabled timer.
4. Stage the exact pushed SHA as a production-environment Vercel deployment
   without custom-domain assignment. Verify intended project/source, READY and
   protected root/assets. Preserve Portal and both Website Git deployment holds.
5. After recovery and CI pass, activate the checksum-verified API using
   `deploy-release.sh` with migrations/identity cutover false. Restart only the
   existing DPS tunnel to follow the replacement API namespace. Verify actual
   TLS discovery on 18883, health/scanner/database, matching corpus/index,
   29 unchanged migrations, full-table/file preservation and unrelated service
   identities. Preserve all provider/security/storage flags and Simulated mode.
6. Promote the same staged frontend without rebuilding. Retire prior document
   pins at the established skew boundary without changing its maximum age.
   Verify canonical/prior-pin asset identity, all 32 refreshed image bytes,
   authorization denial, bounded diagnostics and available read-only signed-in
   UI/help. No saves, laboratory actions or operational downloads.
7. Record exact source/image/deployment, CI, recovery and acceptance in a release
   receipt; commit/push that documentation-only record without redeploying.
   Recheck holds, fence, data/files, unrelated services and clean task-owned
   temporary source/helpers, retaining encrypted recovery and rollback material.

## Rollback and limits

Preparation failure leaves the prior release active. Retain its API image,
compose/manifest/current-link and frontend deployment. For activation failure,
use protected previous-image recovery, restore captured runtime metadata if
needed, and restart the existing DPS tunnel. Keep the prior frontend until API
acceptance; restore its exact deployment if post-promotion checks fail. Never
overwrite newer business data with an older database or remove the orphan fence.

The implementation plan records local 1,576 frontend passes (three existing
skips), 128 gallery browser checks and 48 strict visual comparisons. These are
separate from remote CI and hosted smoke. Fictional illustrations and simulated
provider health do not establish scientific/physical/provider/business acceptance
or complete per-workflow accessibility certification. No commercial activation.

## Status

Completed. Source `9d869522352dd77e4be009238259398696ff8d41` is committed,
pushed and active in both API and frontend. Both exact-source CI jobs, fresh
isolated/off-server recovery, complete table/file preservation, canonical and
prior-pin assets, all 32 guide image hashes and read-only signed-in UI/help
checks pass. No migration or business write occurred. Holds, orphan fence,
unrelated service identities and S3 recovery deferral remain. See the
[release receipt](../operations/portal-ui-adoption-test-release-20261022.md)
for exact identities, checksums, acceptance and limits, and the
[UI adoption plan](UI-CONSISTENCY-ADOPTION-AND-ILLUSTRATIONS-PLAN.md)
for implementation evidence.
