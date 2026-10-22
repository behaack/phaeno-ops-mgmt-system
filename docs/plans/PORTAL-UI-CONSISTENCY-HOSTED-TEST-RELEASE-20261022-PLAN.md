# Portal UI consistency preserving hosted-test release — October 22, 2026

The Owner requested committing/pushing the UI consistency changes and deploying
the Portal updates. Release the shared back-link conversion, UI style guide,
audience guide updates and matched generated help, component gallery, source
guards, regression sources and independent UI quality CI workflow. The gallery
is an engineering tool and must remain outside deployed Portal navigation/assets.

## Targets and fixed boundaries

- Existing Portal Green API at `/opt/phaeno.portal-green` and PostgreSQL 18.6
  database `phaeno_portal_green`; Portal frontend Vercel project
  `prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R`, team `cadexgenomics`, root `frontend`,
  canonical `https://portal.phaenobiotech.com`.
- API baseline source is `79b0338f5f96b3a5fcbea24b86db89906e922f84`; inspect live
  image/release, frontend alias, 29 migrations, active work and settings before
  cutover. Record the exact release commit and image/deployment in the receipt.
- No persisted-model change or migration. Use migrations and Clerk cutover
  **false**. Preserve every existing runtime/provider/storage/security setting,
  DPS mutual TLS 18883 and the existing Simulated recipe. No test-data insertion,
  business workflow mutation, historical email replay or scientific activation.
- The public Website frontend and all OCIA services/data are excluded. Preserve
  both Vercel Git deployment holds and the hosted-test populated-S3 recovery
  deferral; keep its existing backup timer state.

## Recovery and preservation gate

Preserve all schemas and complete records, identity/memberships, CRM/commercial,
laboratory/research/audit history, private documents, Local files and all S3
objects/versions. Explicitly include **`website.web_contacts` and
`website.web_orders`** in the preservation manifest: IDs, contents, timestamps,
language, actor references and completed/unsubscribed history. No reset or purge.

Before activation, capture fresh database, protected runtime, documents and Local
file recovery. Verify archives against their source; restore the database in an
isolated PostgreSQL 18.6 container with no live mounts/network, verify schema,
migrations and data. Collect encrypted recovery off-server and independently
verify decryption, archive contents and complete Website table fingerprints.
Retain baseline full-table fingerprints and file hashes/modes; compare after
activation and explain any normal background changes rather than deleting or
rewriting history. Preserve the previous image, compose/manifest and current-link
metadata for rollback.

## Release sequence

1. Review only this UI release, run appropriate compilation/static checks and
   use the existing 18 guard/24 gallery browser passes as focused evidence.
   Commit/push main, verify remote SHA, then create/hash an exact Git archive.
   The independent UI quality workflow may run; do not conflate it with deploy.
2. Recheck orphaned deployment run `39056745064` and its exact root-only
   `QUARANTINED` release-path fence. It is still queued with zero jobs at preflight.
   Follow the established October 19–21 recovery path: keep `Deploy Portal Green`
   disabled, do not dispatch/rerun it, and invoke the exact-source protected
   `deploy-release.sh` directly with its deployment lock and safety checks.
3. Stage a production-environment Vercel build from the exact pushed SHA with
   custom-domain assignment disabled. Verify READY, exact project/source and
   protected root/assets before promotion.
4. Activate the API from the checksum-verified archive with migration/identity
   cutovers false. Restart only the existing DPS tunnel as required to follow
   the replacement API network namespace. Verify fresh actual TLS discovery,
   API/database/scanner health, corpus/index readiness, migrations and preserved
   data/files/settings before promoting the staged frontend without rebuilding.
5. Verify canonical/prior-pin frontend asset identity, API health/database ping,
   anonymous protected-route denial, current shared back-link/Actions rendering,
   help search/version and bounded errors. Use read-only signed-in browser smoke
   where the available session permits it; do not save or trigger laboratory work.
6. Record exact source/image/deployment, recovery, preservation and acceptance
   evidence, and commit/push that documentation-only receipt without redeploying.
   Confirm all deployment holds, quarantine and unrelated services remain intact.

## Rollback

Preparation failure leaves the previous release active. For failed non-migration
API activation, retain the protected script's prior-image recovery and restore
the captured compose/manifest/current-link if needed; restart the existing tunnel
against that API and verify health/configuration. Keep the prior frontend until
API verification passes, or restore its exact deployment if post-promotion smoke
fails. Do not restore an older database over newer activity. Data loss or a
database downgrade is not authorized. The orphan-run fence must never be removed.

## Evidence limits

Gallery checks establish shared control contracts, not every permission-dependent
workflow or complete WCAG/screen-reader conformance. No physical/scientific,
provider, commercial activation or populated-S3 disaster-recovery qualification
is implied by this release.
