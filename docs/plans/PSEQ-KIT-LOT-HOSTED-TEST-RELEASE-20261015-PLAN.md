# PSeq kit lot traceability: preserving hosted-test release

The Owner requested commit, push and deployment of the PSeq kit lot changes to the existing hosted test environment on October 15, 2026. Release only the approved [lot workflow](PSEQ-KIT-LOT-TRACEABILITY-PLAN.md), its migration, regression evidence and audience-specific help. Preserve concurrent Lab summary and illustrated-help work outside this release. This request authorizes the matched API/frontend release and its necessary preserving additive lot migration; it does not authorize resetting, deleting or inventing historical kit facts, commercial activation, or identity/storage/provider changes.

## Verified target and baseline

Use the existing Portal Green host, PostgreSQL 18.6 container `phaeno-portal-green-db`, database `phaeno_portal_green` and volume `phaeno-portal-green-postgres18-data`. Current API image is `phaeno-portal-green-api:sha-573843a1e3cb-run-38668224349-1`; retain that image and its release/runtime metadata.

Frontend target is Cadexgenomics project `phaeno-ops-mgmt-system`, ID `prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R`, team `team_DbkKTfQmQz9atu435ZBugMDD`, root `frontend`, canonical `https://portal.phaenobiotech.com`. Current frontend is `dpl_4vQvdkHuFwKzQsyjhdZPFhssEewL`, source `010109b837b2db21192574bd17126091e928a2eb`; existing skew boundary is `1792072282074`, maximum age `43200`. Verify identities again before cutover.

The only new model migration is `20261015215237_AddPSeqKitLotTraceability`. Read-only hosted preflight finds zero reagent shipment lines, zero purchased kit units and zero submitted kit input revisions. Therefore no existing kit evidence needs conversion. The migration guard must remain intact and refuse a newly populated affected collection. Historical standalone assembly remains supported without fabricated kit lineage.

## Preservation and recovery preparation

Preserve every existing account, membership, Department, commercial/scientific/Lab/Finance/audit record, procedure revision and work pin. Explicitly preserve all 12 `website.web_contacts` and all 6 `website.web_orders`, including original IDs, complete contents, actors, timestamps, locales, unsubscribe/completion history. Compare full-record fingerprints before and after; do not replay email or change completion/subscription state.

Retain private baseline table fingerprints, schema/migration identity, API deployment metadata, runtime configuration and unchanged retained Local bytes under `/var/backups/phaeno-portal-deploy/pseq-kit-lots-20261015`. Encrypt private recovery archives with the existing backup public key, verify archive/checksum integrity and collect the encrypted package off-server. Never publish plaintext configuration or intake exports.

The protected deploy creates a fresh encrypted custom-format database backup after pausing the API and successfully rehearses restoration in an isolated PostgreSQL container without live mounts. This is the replacement-database preparation check; no live database replacement or rebase is needed. The release adds two tables, seven columns, restrictive relationships/indexes and a shipped-kit constraint; it drops or rewrites no records.

Preserve S3 bucket/prefix/credentials/versions, the retained Local file volume, ClamAV, DPS tunnel/recipe, retention/notification switches and bootstrap/identity settings. Inventory file references/bytes before release and retain matching recovery evidence. No file migration/deletion is part of this release. The Owner-approved hosted-test S3 recovery deferral remains; no populated S3 recovery qualification or backup-timer activation is implied. Emmaus/OCIA, public Website frontend, DNS and unrelated host services are excluded.

## Source preparation and cutover

1. Stage only the owned changes, selecting lot-related hunks in shared plans/catalog/guides. Generate matching API/UI help from that isolated staged source. Build/check the exact release copy, record its tree/archive identity, then commit and push normally to main; require ordinary remote equality.
2. Stage a production-target frontend from the existing GitHub connection pinned to the full release SHA with custom-domain assignment disabled. Verify ready state and matching source/archive metadata. Keep the old canonical frontend serving until the API is verified.
3. Temporarily enable `Deploy Portal Green`, dispatch the exact main source with `apply_migrations=true`, all provider/bootstrap inputs `Preserve`, identity cutover and S3 reconfiguration false, then disable the workflow again. Preserve both Vercel Git holds. This bounded manual sequence is covered by the Owner's standing October 11 authorization.
4. Build before pausing. The deploy stops only the old Portal API, captures/rehearses/encrypts the recovery database, applies the guarded lot migration, then starts the matching API. The recovery rehearsal contributes to the pause; do not promise a fixed outage duration.
5. Verify exact API source/image, migration identity/tables/constraints, Website full-record fingerprints, unaffected data, health/scanner/storage checks, anonymous lot/Partner authorization and packaged documentation version. Investigate any unexpected data difference before promotion.
6. Promote the verified production frontend without rebuilding. Advance the existing skew boundary to that deployment's creation time only after API compatibility/preservation checks. Verify clean and previous-pin document requests serve the current assets, canonical routes and release source. Inspect the available signed-in browser without creating hosted operational fixtures.

## Rollback and acceptance

Before migration starts, a failed preparation leaves the old UI in place and the guarded deploy resumes the old API. The additive schema is designed to retain prior rows; after migration starts, inspect actual state before any recovery. Prefer a preserving forward fix and compatible API/UI pair. Do not drop new lot records or run an EF downgrade to recover. A database restoration that could discard subsequent writes needs a separately reviewed manifest and Owner authorization; backups alone do not authorize destructive rollback.

The prior API/frontend and encrypted backups remain available. Retain the previous skew boundary for a coordinated routing rollback. Verify controls are restored even on failure, with no permanently enabled auto-deployment.

Local evidence already covers 25 backend regressions, 25 frontend tests and four connected desktop/mobile journeys through analysis start. Repeat only checks justified by the isolated release source and any new defect. Sign-in/scanning/storage in those acceptance fixtures are synthetic. Hosted health/assets/authorization and read-only signed-in rendering are separate evidence; physical kit handling, real scientific assembly, output qualification and final business acceptance remain unclaimed.

Record final commit, workflow run, API image, migration, frontend deployment, recovery hashes, data comparisons, routing checks, controls and remaining gates in the completion receipt. Keep private operational artifacts outside Git.

## Owner scope expansion: remaining changes and final UI

The Owner subsequently requested committing/pushing all remaining changes and
redeploying the UI. Include the illustrated Phaeno help/navigation, protocol-card
summary, associated regression sources and pending user-card release records in
a separate source commit. These changes add no dependencies, authentication
changes or persisted model changes. The final matched help corpus is 59 guides,
`50b53bdc8aa1`.

The lot API release already completed successfully from `5b6e10a4c98c` in run
`38821018032`, including the guarded additive migration, encrypted backup and
isolated restore rehearsal. All 242 baseline application tables retain identical
row counts and full-record fingerprints; only migration history changes, with two
new empty lot tables. The 12 Mailing-list and six Demo-request records are intact.

Stage the expanded source as a new production-target frontend without assigning
the canonical domain. Because documentation search rejects mismatched corpus
versions, also publish that exact source's generated API help using the same
bounded manual API workflow, with `apply_migrations=false` and all runtime inputs
preserved. Verify the packaged 59-guide API corpus and index before promoting the
final UI. Retain both prior frontend deployments and API images for coordinated,
preserving recovery. No additional database migration, data reset or operational
fixture is authorized or needed. Recheck preservation, health and release holds
after this final matched deployment.

## Prepared release checkpoint

The isolated staged source excludes the concurrent illustrated guides and Lab summary changes. Its matched API/UI help has 56 published guides, corpus `1570388119bb`; the earlier 59-guide working-tree verification remains recorded separately. The isolated Release API build has zero warnings/errors; frontend type checking, 25 relevant component tests and production client/server build pass. The staged lot-related hunks are checked independently of the remaining working-tree changes.

Hosted preflight confirms latest migration `20261014234438_ProtocolFirstLabProcedures`, no affected kit history, unchanged Website counts and full-record fingerprints, no managed/configuration file references and an empty retained Local volume. Private runtime/Local archives pass content comparison, encryption round trip and matching off-server checksums. The protected deployment still must perform its fresh database recovery rehearsal under the API pause before applying the one pending lot migration.
