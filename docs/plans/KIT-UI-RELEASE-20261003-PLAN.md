# Kit receipt and cancellation UI release — October 3, 2026

## Scope and target

The owner authorized documentation, successful tests, commit/push and deployment for this chat's changes: hide Record kit receipt until Phaeno dispatches a kit awaiting receipt; keep Customer/Partner Job and phase cancellations inside neutral Actions menus with destructive items and confirmations; rename Kit shipments to Fulfilled requests. Queue contents, shipment completion behavior, permissions and persisted data remain unchanged. Unrelated pending navigation, CRM, Trial, schema and user-management changes are excluded through an isolated managed worktree.

Target the production-hosted test Portal at portal.phaenobiotech.com and api.phaenobiotech.com, PostgreSQL 18.6 database phaeno_portal_green under /opt/phaeno.portal-green. Preserve every current row, identity, file, runtime/storage setting and all fourteen applied migrations. No migration, reset, data repair, Clerk cutover, Website frontend or OCIA change is authorized or necessary. The September 29 hosted clean-database plan and October 2 controlled release provide the verified replacement preparation and matched recovery method.

## Verification and preparation

Run the full connected backend suite on a freshly migrated disposable loopback database, all frontend unit tests, lint, TypeScript, documentation generation/check, production build and isolated desktop/mobile Playwright. Correct failures and rerun failed gates; record intentional platform/environment skips. Freeze the tested source and review staged scope, whitespace and credentials before commit/push. Preserve concurrent work.

Baseline API source is 66240861c32c49af1b85ac4fa4c0dcf9f6fcd5c7, image phaeno-portal-green-api:sha-66240861c32c-run-37077429646-1 and UI dpl_V8im1BDmMvdceQhNsnbSgdaxeo21. Recheck live identity, all migration IDs, table counts, runtime hashes and private mounts. Take a fresh coordinated encrypted database/private-file snapshot through the protected backup workflow, require isolated restore/checksum/encryption/cleanup and off-server export, then disable the workflow. Retain older recovery points.

## Activation and rollback

Stage the production-configured Vercel UI from the tested commit without domain promotion. Keep automatic Vercel Git controls false. Temporarily enable Deploy Portal Green solely for the exact manual release dispatch, with apply_migrations=false, storage/scanning/bootstrap Preserve and Clerk cutover false. Require its health gates, then immediately disable it again. Confirm source/image identity, unchanged migration history, table counts/runtime hashes and private mounts before promoting the matching UI.

Verify Portal/API root and health, database ping, proxy authorization boundaries, public Website API and production sign-in rendering. Record exact source, workflow, backup and Vercel identities. Authenticated operator, real-provider and physical/scientific acceptance remain separate. If activation fails, restore the prior API image/runtime and UI as a matched set; database and files remain untouched by this release. After any new writes, preserve them and assess recovery before restoring an earlier snapshot. No destructive down migration or hosted data repair is included.

## Status

Verification passed: backend Release build has zero warnings/errors; the full connected suite passed 1,201 cases with two intentional environment skips; all 1,363 frontend unit cases and 198 desktop/mobile browser cases passed, with two existing mobile print skips. Lint, TypeScript, production build, documentation generation/check (56 guides, corpus 3fe25a14288c), EF model drift, whitespace and staged credential checks pass. The disposable loopback reference database was removed. Initial naming/selector/resource issues were corrected or superseded by clean complete runs. Activation evidence will be recorded in the release receipt.
