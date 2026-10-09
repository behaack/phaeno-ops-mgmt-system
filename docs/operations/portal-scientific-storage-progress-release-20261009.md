# Portal scientific storage and progress release — October 9, 2026

The matched Portal API/frontend source
[0fbfa87c](https://github.com/behaack/phaeno-ops-mgmt-system/commit/0fbfa87c7232f1b2b9751ba1c581a187608a976f)
is deployed. It includes the reviewed Customer/Job/sample/library/sequencing
capture hierarchy, original S3 access support, streamed S3 writes, reviewed ZIP
inspection/extraction, upload/assembly progress and connected laboratory screens
with matching user help.

Review corrected original-file library/run scope, nested-folder scope bypass,
missing multipart initiation identity, chooser callbacks, accessibility and stale
browser fixtures. [Verification](../testing/runs/2026-10-09-scientific-storage-release-review.md)
covers 1,287 distinct backend cases, 1,483 frontend tests and all 212 runnable
browser cases, with documented platform/disabled-feature skips. Lint, types,
production builds and all 56 generated guides pass.

The release preserved the existing hosted database and persistent file volume,
Local storage, ClamAV, authentication and worker configuration. There are still
25 applied migrations; no new EF migration or reset was required. Fresh coordinated
encrypted recovery passed isolated restore, cleanup and verified off-server
collection before activation. Private recovery identifiers and infrastructure
receipts remain outside public source.

The frontend was built from an isolated archive of the reviewed commit. Its
deployment metadata records that source and archive fingerprint. The public
Portal domain remained on the prior build until independent API image/source
and health checks passed; the staged Production build was then promoted without
rebuilding. Live Portal/help/API/Website checks return HTTP 200, sign-in renders,
and direct/proxied anonymous laboratory access returns HTTP 401. The public alias
and API image revision independently identify the released source.

Backup/API workflow holds are restored and Vercel Git automatic deployment stays
disabled. Smoke saved no business or scientific records. Browser control was
unavailable, so live checks used the authenticated Vercel CLI and independent
HTTP/server metadata; interactive signed-in scientific acceptance remains separate.

This source release preserves the current storage provider. S3 activation still
requires the [hosted cutover plan](../plans/S3-HOSTED-CUTOVER-PLAN.md): referenced
Local-file conversion, versioned originals and S3-aware coordinated recovery.
Real DPS execution and scientific QC/publication acceptance remain separate.
