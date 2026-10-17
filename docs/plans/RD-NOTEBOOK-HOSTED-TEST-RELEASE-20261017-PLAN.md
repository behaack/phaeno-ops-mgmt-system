# R&D notebooks and illustrated how-to: preserving hosted-test release

The Owner requested updated user documentation, an annotated R&D how-to, commit/push to GitHub and deployment on October 17, 2026. Release the R&D module, its six review corrections, research attachment recovery enumeration, Phaeno-only help and regression sources together. This request includes the necessary preserving additive R&D migration. It authorizes no reset, history rewrite, identity/storage/provider cutover, external collaborator access or commercial/scientific activation.

## Verified baseline and target

Use the existing Portal Green host, PostgreSQL 18.6 container `phaeno-portal-green-db`, database `phaeno_portal_green` and volume `phaeno-portal-green-postgres18-data`. Read-only host verification identifies healthy API image `phaeno-portal-green-api:sha-a88cc73853fd-run-38829715412-1` and its matching release directory. Retain that image, runtime metadata and frontend as the rollback pair. OCIA and the public Website frontend are outside this deployment.

Frontend target is Cadexgenomics project `phaeno-ops-mgmt-system`, ID `prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R`, root `frontend`, canonical `https://portal.phaenobiotech.com`. Verified current production deployment is `dpl_GVgngTrETWtYjxV8HXcjKnz9uzDT`, source `a88cc73853fd6f9dd446ee6b082422e1cecf13bb`, skew boundary `1792110534065`, maximum age `43200`. Both checked-in Vercel Git deployment holds remain false. Remote main matches local baseline `7b9a2903e9893eb7238ea30251c15a62e785080d`; the deploy workflow is disabled manually.

The only new migration is `20261016204013_AddResearchNotebook`: a new research schema and five new tables with scope keys/indexes. It drops, converts, resets or reseeds no existing data. Verify hosted migration history and absence of unexpected pending migrations before dispatch. Review fixes and illustrated help add no further model changes or dependencies.

## Preservation, preparation and recovery

Preserve every existing schema and row: accounts, memberships, Departments, approved procedures and pins, commercial/Lab/scientific/Finance history and audit. Explicitly preserve all `website.web_contacts` and `website.web_orders` records, including original IDs, complete contents, actor references, locales, timestamps, subscription/unsubscribe and completion history. Capture and compare full-table/full-record fingerprints, not counts alone. Do not replay email or create hosted demonstration records.

Private preflight/postflight evidence lives outside Git under `/var/backups/phaeno-portal-deploy/research-20261017` and the ignored local release directory. Capture current runtime/file manifests, verify the retained Local archive against its source, encrypt with the existing recovery public key and collect checksummed encrypted recovery off-server. Preserve all S3 configuration, credentials, object versions and existing bytes. The hosted-test populated-S3 recovery deferral and disabled backup timer remain; no populated S3 qualification is claimed.

The protected deploy builds first, pauses only the Portal API, creates a fresh encrypted custom-format database backup and successfully rehearses its restoration in an isolated PostgreSQL 18.6 container without live mounts before applying the migration. This rehearsal is replacement-database preparation; the live database is retained and no replacement/reset/cutover is needed. Retain encrypted database recovery off-server and verify its checksum/decryption before frontend promotion. Do not promise a fixed API outage duration.

Research attachment receipts, including uploads detached from a current entry, now participate in private recovery reference enumeration. Restore verification checks all five research table counts when the schema exists. Historical pre-R&D recovery archives remain readable. These changes do not enable the backup timer or change storage selection.

## Documentation and exact-source release

1. Capture actual local components with explicitly fictional in-memory data. Keep original screenshot pixels, overlay numbered callouts in the shared renderer, and place matching explanations/alt text in portable MDX. No backend records, real scientific data, identities or credentials are captured. Review all images and desktop/narrow light/dark guide rendering.
2. Update Phaeno guide/navigation/registry and generate matching API/UI help. Build/check the exact scoped source and regression compilation; automated suites remain request-only. Keep unrelated changes, private evidence and temporary preview output outside the commit.
3. Commit and push normally to main, verify remote equality, and record source/archive identity. Stage a production-target frontend from the exact GitHub SHA with custom-domain assignment disabled. Verify target, source and READY state.
4. Temporarily enable `Deploy Portal Green`, dispatch the exact main source with `apply_migrations=true`, provider/bootstrap inputs Preserve, identity cutover false and S3 reconfiguration false, then disable it again. The bounded enable/run/disable sequence follows standing October 11 authorization. Preserve both Vercel Git holds.
5. Verify API source/image, database/migration, five research tables, healthy database/storage/scanner, unauthorized research rejection, packaged/active help corpus and unchanged preexisting fingerprints/intake contents. Investigate unexpected differences before promotion.
6. Promote the verified staged frontend without rebuilding; advance the existing skew boundary to its creation time, preserving maximum age. Verify canonical and previous-pin assets, new routes, screenshot byte hashes and available browser documentation/search. Keep local simulated UI evidence distinct from authenticated hosted and live scientific/provider acceptance.
7. Record exact commit, run, image, frontend deployment, recovery evidence, preservation comparisons, controls and remaining acceptance in a completion receipt, then commit/push that documentation-only receipt.

## Failure and rollback

Keep the prior canonical frontend until API migration and preservation checks pass. Preparation failure resumes the existing API under the guarded workflow. After migration begins, inspect actual state; prefer a preserving forward correction or a compatible retained API/UI pair. Do not drop research records, run EF downgrade or restore a database over subsequent writes. Destructive recovery needs a separately reviewed manifest and Owner authorization. Restore all release holds even on failure.

## Pre-release checkpoint

Local Release solution build passed with zero warnings/errors, including all new regression sources; TypeScript, scoped ESLint, matching documentation generation/check (62 guides, digest `8c6701d4675a`), client/SSR build and diff whitespace checks passed. No automated test suite ran. All 14 originals were visually reviewed. The rendered guide has 53 numbered written equivalents, no overflow at 320/390px, no overlapping markers at 288px rendered width and geometric separation at 256px image width. Dark 390px and desktop rendering were reviewed. These UI interactions use fictional local transport and do not prove live backend/provider or scientific acceptance.

Fresh preflight confirms latest hosted migration `20261015215237_AddPSeqKitLotTraceability`, 245 existing tables, zero retained Local files, and unchanged full Website-intake fingerprints: 12 contacts `ef77bd28975f174e0fefaf39931bd25f`; six orders `95aa679ef04abf2b672f77ee6b9f6222`. Full database/runtime/Local recovery restored in isolated PostgreSQL 18.6 and passed archive comparisons and encryption round trip. The encrypted copy was collected into an owner/SYSTEM-only local directory and independently passed checksum, private-key decryption and archive/restore-evidence verification. The changed restore script passed Linux Bash syntax checking. The backup timer remains disabled. Exact release identities and postflight results will be recorded in the completion receipt.
