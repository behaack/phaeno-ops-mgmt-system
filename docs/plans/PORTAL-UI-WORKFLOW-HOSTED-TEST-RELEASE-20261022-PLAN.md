# Portal UI workflow consistency hosted-test release — October 22, 2026

The Owner authorized committing, pushing and deploying the six completed UI
priorities. Publish the shared panels/feedback, actual workflow gallery, browser
and release gates, 43 reviewed guide screenshots and matching 62-guide corpus.

## Target, preservation and authorization

Use the existing Green API at `/opt/phaeno.portal-green`, PostgreSQL 18.6 database
`phaeno_portal_green`, and Portal Vercel project
`prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R`, team `cadexgenomics`, root `frontend`.
Canonical UI: `https://portal.phaenobiotech.com`. Reverify API/UI baseline
`9d869522352dd77e4be009238259398696ff8d41`, frontend
`dpl_5af3Yf6gAF2ostMxprkrNGGLUA3B`, the held workflow and exact orphan fence.

No model, migration, identity, provider or runtime-setting change is included.
Migrations and identity cutover remain false. Preserve every table/record,
membership, scientific/research/audit history, document, Local file and S3 object
and version. Explicitly preserve all history and complete contents of
`website.web_contacts` and `website.web_orders`: original IDs, timestamps,
language/actor references and completed/unsubscribed states. No reset, purge,
test fixture, email replay, operational save or laboratory action is authorized.
The public Website and OCIA are outside this release.

## Release sequence

1. Recheck scope, source/capture freshness, reviewed references and whitespace.
   Commit/push a `codex/` branch and merge through protected main only after
   `ui-quality`, `visual-baselines` and `workflow-behavior` succeed. Require the
   same three successful jobs for the exact merged source before activation.
   Create a hashed Git archive from that immutable source.
2. Preserve disabled `Deploy Portal Green`, queued zero-job orphan `39056745064`
   and its root-only `QUARANTINED` exact release fence. Do not rerun or dispatch
   the orphan. Use the established protected host release path with its lock,
   exact-source gate and safety checks; retain Vercel Git deployment holds.
3. Capture fresh database/runtime/document/Local recovery. Verify file archives,
   restore the database in isolated PostgreSQL 18.6 without live mounts/network,
   and compare all table fingerprints, migrations and complete Website intake.
   Encrypt and collect recovery off-server; independently verify decryption and
   every archived file hash/mode. Preserve the existing populated-S3 recovery
   deferral and disabled timer. No replacement live database is needed for this
   display/generated-help release; the isolated replacement is rehearsal only.
4. Stage an exact-source production-environment Vercel build without assigning
   custom domains. Verify intended project/source, READY and protected assets.
5. After CI/recovery/staging pass, activate the checksum-verified API through
   `deploy-release.sh` with migrations/identity cutover false. Restart only the
   existing DPS tunnel to follow the new API network namespace. Verify actual
   TLS discovery on 18883, health/scanner/database, matching corpus/index,
   unchanged migrations, full table/file preservation and unrelated services.
6. Promote that staged frontend without rebuilding. Retire previous document
   pins at the established skew boundary without changing maximum age. Verify
   canonical/prior-pin asset identity, all 43 guide image hashes, authorization
   denials, bounded diagnostics and available read-only signed-in UI/help.
7. Record exact source, CI, images/deployment, recovery and acceptance in a
   release receipt. Publish the documentation-only receipt through the protected
   path without redeploying. Clean only task-owned temporary helpers/output;
   retain encrypted recovery, operational rollback material and evidence.

## Rollback and acceptance limits

Preparation failure leaves the existing release active. Retain its API image,
compose/manifest/current link and frontend deployment. Activation failure uses
the protected previous-image/runtime recovery and existing DPS tunnel; leave the
old frontend until API acceptance, or restore its exact deployment after a
post-promotion failure. Never restore an older database over newer business data
or remove the orphan fence.

Local implementation verification is recorded in
[the review record](../operations/ui-workflow-coverage-20261022.md): 1,578 frontend
passes/three existing skips, 244 Chromium cases, 42 Firefox/WebKit cases and 84
strict image comparisons. Hosted smoke is separate from CI, full accessibility,
provider, scientific, physical, populated-S3 recovery and commercial acceptance.

## Status

Completed for source `531d13fa58c22f01bc40824ce5d61be8acf19dbf`. All three
required PR/exact-source checks, fresh recovery, protected activation, exact
staging/promotion, live assets/images, signed-in UI/help and final preservation
acceptance pass. No migration or destructive data operation occurred. See the
[release receipt](../operations/portal-ui-workflow-test-release-20261022.md).
Documentation-only completion publication does not change the deployed source.

### Required CI renderer follow-up

The first release branch exposed 125/128 scattered glyph-edge differences on the two light-theme full Trial pages; all other 82 references passed. Layout and content matched. The Trial references now cover the complete page in contiguous 600 px sections with an asserted total section count. The generated inventory has 94 images. Every image retains the original 0.15 color and 80-pixel tolerances; no mask, threshold relaxation or omitted page region is used. New references require local review and exact-source CI before release.

The first merged candidate's Firefox/WebKit preparation twice timed out while
downloading Ubuntu packages before tests. The protected follow-up uses the
official matching Playwright image pinned by digest and checks package alignment;
only the ephemeral CI home ownership is aligned for Firefox. All unchanged
42 browser cases and the other required checks pass on the final merged source.
