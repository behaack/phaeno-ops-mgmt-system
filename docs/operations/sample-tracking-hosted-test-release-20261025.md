# Sample-tracking hosted-test release — October 25, 2026

The approved sample-tracking API, Portal frontend and matching help are live at
<https://portal.phaenobiotech.com>. Both named preserving migrations are applied
to the existing hosted-test database. Writers reopened at **11:17:55 UTC** after
paired technical acceptance. No synthetic hosted record, laboratory action,
assembly, provider change, identity cutover or public Website deployment occurred.

The Owner explicitly approved completing deployment, including the protected
merge, two migrations and paired activation. The
[preserving release plan](../plans/SAMPLE-TRACKING-HOSTED-TEST-RELEASE-20261024-PLAN.md)
defines the release and recovery boundary. Fresh authenticated hosted acceptance
remains **not run**: the available browser is signed out and requires the Owner's
normal sign-in/MFA. Exact-source isolated capture and permission checks passed;
they do not substitute for that hosted walkthrough or scientific acceptance.

## Release identity

| Item | Verified identity |
| --- | --- |
| Qualified/deployed source | `9ca7faf614bea5d6bee7a9c57e6af98ea12bfa3b` |
| Protected merge | [PR #8](https://github.com/behaack/phaeno-ops-mgmt-system/pull/8), merged `1655f4cc9515bb690101c4b97d7700736201d445` at 10:59:53 UTC |
| Source and merge tree | `671d584bd736804f568429fe62f8d53c6a7fcb2e` for both commits |
| Source archive SHA-256 | `a3d17b8cc6d3deed92a73f1d5a92cd9a296b714c919e7d796d0faa753b265e76` |
| API image tag | `phaeno-portal-green-api:sha-9ca7faf614be-manual-20261025-sample-tracking` |
| Activated API image ID | `sha256:a973793474cedd41b3cc723aaceec15a8f5b5271fc51ac7f5d3db97433b90e4f` |
| API release directory | `/opt/phaeno.portal-green/releases/9ca7faf614bea5d6bee7a9c57e6af98ea12bfa3b-manual-20261025-sample-tracking` |
| Frontend deployment | `dpl_3tBnEe1zgnfJaQJFRpksJqERkfc7` |
| Frontend build | `phaeno-ops-mgmt-system-k2jbssg2l-cadexgenomics.vercel.app` |
| Matching guide corpus/index | `a09e0c7aefa9f46daac35aac3c0e05651cab1df84ca9bf7a57f119ba2ae9f278` |
| Migration SQL SHA-256 | `5f703393d3a578eefc640368afcfb01556e8e870d157324380ba0578e1b4ae81` |

The activated image and rehearsed image
`sha256:f6f8b01e4862ed48b8641bd26d39fb2c583a7cdaecada791d0bfa7b3f797e45e`
have identical RootFS layers and runtime environment, entrypoint, command, user,
working directory and ports. Only Compose image labels differ. The deployed
corpus equals the Git JSON and matches after newline normalization; pretty-print
CRLF/LF differences do not change the corpus/index.

The production-environment frontend was staged with custom-domain assignment
disabled, verified READY, then promoted without rebuilding after API checks.
All **58** public asset hashes match staging: 15 root assets and 43 reviewed guide
images. Canonical and previous-pin root asset sets match. The skew boundary is
`1792926763514`; maximum age remains 43,200 seconds. Original project
`autoAssignCustomDomains=true` was restored. Both Vercel Git deployments remain disabled.

## Database and preservation

The existing `phaeno_portal_green` database, PostgreSQL 18.6 image and
`phaeno-portal-green-postgres18-data` volume remain in place. Only these pending
migrations were applied:

- `20261024192049_FreezeLabIngredientWithdrawalEvidence`
- `20261024203101_AddLabPhysicalLifecycle`

Migration history grows from 29 to 31 entries and the table inventory from 250
to 254. Sorted full-record comparisons preserve **all 250 existing tables**,
excluding only the two new migration-history entries and removing the five new
nullable fields from comparison. All five added fields remain null, all four new
tables are empty, and no historical conditions, locations or participants were
invented. The same comparison passes after writer reopening.

| Preserved Website intake | Rows | Full-record SHA-256 |
| --- | --- | --- |
| `website.web_contacts` | 12 | `8e444b0731a2bca7e563ab6eaf9a0f18551d62b8d03bf8aa0f93d89288aa3588` |
| `website.web_orders` | 6 | `49008fcef419cf576ec56f411350f359a23428c6ca7f7f3de7a1daf2d59460df` |

The comparison includes IDs, contents, timestamps, language, actor references and
completed/unsubscribed history. Nothing was replayed, reactivated or reset.
Of 117 captured runtime/document/retained Local file records, 115 are identical
including ownership/modes. The only expected changes are `runtime/compose.env`
and `runtime/deployment-manifest.txt`; environment differences are limited to the
release image tag and source revision. Storage/scanning/provider/identity flags
are preserved.

## Recovery and maintenance

Preparation and fresh final recovery independently restore into owned isolated
PostgreSQL 18.6 targets and reproduce every old table record and all 117 archived
file hashes/modes/ownership. The final database snapshot was captured at
**11:07:42 UTC**, after the original API stopped at 11:07:38. It contains 1,729
rows across 250 tables; measured final isolated database restoration was 0.977
seconds. This measurement does not establish a full service recovery objective.

Final encrypted recovery and its wrapped key are retained on the host under
`/var/backups/phaeno-portal-deploy/sample-tracking-20261025/final` and collected
off-server. Independent off-server decryption verifies all included dump/file
hashes without retaining plaintext locally.

| Final encrypted artifact | SHA-256 |
| --- | --- |
| `recovery.tar.gz.enc` | `4ee044bfe510d2a406054b66d178bc0e9390a6d62dca6b3ed3dfdc0a8b074b98` |
| `recovery.key.enc` | `30d0c2b315cbf956461f2b816a55dc324ce10e3819e2e2e3814bb5370aaf3572` |

The isolated actual-image migration rehearsal took 4.498 seconds. It verified
preserving migration, fresh-connection write refusal, old/candidate read-only
startup and independently restored a synthetic post-write containment checkpoint.
All fault/mutation probes used disposable isolated data.

During activation the deployment lock, API method fence and database read-only
default contained writes. The migration process was the only permitted writer.
Zero active assembly/execution/upload work and drained queues were confirmed.
After technical pairing passed, the same candidate image restarted with the
temporary database setting reset. Fresh connections are writable, API health is
200 and database ping is 204. Original Nginx bytes were restored with SHA-256
`8ec310fb058f819205dc11ef0da75e4a84cd5e0ae67445875b07eb336a7ec670`.

After writer reopening, recovery must preserve new activity. Neither Down
migration nor restoring the pre-release database over later evidence is an
operational rollback. Prefer containment and a preserving forward repair;
coordinate any recovery through new isolated targets and explicit cutover scope.
Previous API image
`sha256:054aef2236ed787ab6665bc5e82bead2670c96e8802f1b6c0fdf60f7d5a93ef6`
and frontend `dpl_AKHhdm8Dww2KS6yyP8q7vy5jEQwz` remain retained.

## Verification, observation and remaining acceptance

- All three required exact-source checks passed on PR and push: six successful
  jobs across [PR run 40154884916](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/40154884916)
  and [push run 40154861138](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/40154861138).
  The identical-tree main merge also passes
  [run 40187028391](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/40187028391).
- Release backend build passes with zero warnings/errors; 42 focused
  backend/recovery cases, 87 frontend cases and all 16 connected browser variants
  pass. The browser matrix covers four phases, desktop/320px phone and light/dark,
  without final failures, skips or flaky retries.
- Hosted API source/image, schema, preserved records/files, asset hashes,
  matching help corpus and anonymous 401 denials pass. The denied endpoints cover
  documentation search, specimen investigation and physical retention.
- The full **11:17:55–11:32:55 UTC** post-reopening observation passes: zero API
  error/fatal markers, zero frontend runtime error/fatal records and zero frontend
  5xx request records. Both Vercel queries cover all 900 seconds with no excluded
  interval or remaining page. All 16 health/database probe pairs return 200/204.
- Fresh signed-in hosted investigation/capture/permission walkthrough is **not
  run**. Normal Owner sign-in/MFA is required. No authentication bypass or hosted
  synthetic data was used to close this gap. First legitimate new activity also
  remains unobserved; no event was fabricated for acceptance.

Physical bench/instrument/scanner acceptance, scientific/SOP/business approval,
real producer/provider execution and populated-S3/scheduled recovery remain
separate gates. The established hosted-test S3 recovery deferral and disabled
Local-only backup timer remain; this database/document/Local/runtime verification
does not establish complete scientific-file disaster recovery or commercial
activation.

## Retained controls and unrelated systems

`Deploy Portal Green` remains `disabled_manually`; no workflow enablement was
needed for the protected direct-host path. Portal and Website Vercel
`git.deploymentEnabled=false` holds remain. Orphan run `39056745064` and its
`QUARANTINED` release remain untouched.

Only the Portal-owned DPS tunnel restarted to follow the replacement API network
namespace. Remote DPS remains at source
`c68e584f29a0e8faa2a9a6537075d356de1929fc`, worker stopped, with unchanged ledger
SHA-256 `be97b1c7563d07958c15a92d0ca093797f856dacf6ff21fd27699621c9d60e70`.
No DPS source/configuration/process/job or assembly changed. OCIA API/database
image and start identities remain identical. The Portal scanner is healthy with
the same image. Unrelated local billing work remains outside the release.

Encrypted recovery, wrapped keys, old releases/images and compact receipts are
retained. After independent verification, the task-owned final restore container
and internal network were removed. Its database used tmpfs; no persistent volume
was removed. Redundant plaintext dump/schema/runtime/file/source archives were
removed from the protected final-backup directory; encrypted package hashes
remain unchanged. Task-owned local compilation cache was removed. Running local
dependencies, the release source worktree and unrelated work were preserved.
