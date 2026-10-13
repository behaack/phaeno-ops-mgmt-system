# Review closure hosted-test release — October 12, 2026

Matched API and Portal frontend source
[`c4cdc20f`](https://github.com/behaack/phaeno-ops-mgmt-system/commit/c4cdc20fa9d10e16f28f83958d9d423f6b8cadde)
is live at [POMS](https://portal.phaenobiotech.com) under the
[preserving plan](../plans/PORTAL-REVIEW-CLOSURE-TEST-RELEASE-20261012-PLAN.md).
The Owner requested commit, push and deploy. The existing production-named
hosting remains the hosted test environment; commercial activation is held.

[Deploy Portal Green #104](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/38331174463)
succeeds on the pinned source. API image:
`sha-c4cdc20fa9d1-run-38331174463-1`. Vercel production deployment:
`dpl_57PDBLQLtv4ofyo3cGet91PWNoRs`. The exact committed frontend archive was
staged with the canonical Portal alias retained on
`dpl_753tSeojqisXXoP8dhn3GYXFDaYg`, then promoted without rebuilding after API
success/source/image and fresh health checks. The live alias independently
resolves to the new deployment.

Source archive SHA-256:
`96139bb8069a2606ed1475c23ce71b24e6ac9c5523f0a5adf9b56a5b20bedb06`.
GitHub rejected the initial unpublished commit's private author email. That
local commit was corrected to the repository's established GitHub no-reply
identity; the ordinary push succeeds and remote main was verified before
dispatch. No email privacy protection was disabled and no forced push occurred.

## Preservation and recovery

No migration/snapshot or persisted-model change occurred. Fresh Release model
comparison reports no change; deployment uses `apply_migrations=false` and no
EF migration ran. Storage, scanning and bootstrap choices are Preserve; Clerk
identity cutover and hosted-test S3 configuration are false. The protected release
verifies PostgreSQL 18/current database volume, file services and source image.

Hosted accounts, memberships, configuration, Commercial/Lab/scientific/Finance
records, audit, S3 objects/versions, retained Local copies, identity mappings and
runtime/worker settings are preserved. The actual protected before/after Website
count check passes with `12,6`. All recovered contact and completed-request
history remains covered by the [intake preservation/recovery record](website-intake-recovery-20261012.md).
This release performs no data transfer/reset, local fixture import, historical
email replay, subscription reactivation or request reopening. It does not claim
a new full-record transfer verification where no transfer occurred.

[Retained recovery inspection #2](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/38329932224)
passes before release: the pre-reset database remains closed and both encrypted
backup files match their verified hashes. Retained recovery copies and the
separately verified intake before-table copy are preserved. This proves retained
copy availability/integrity, not a fresh restore or current coordinated S3
protection. The Owner's hosted-test S3 recovery deferral remains applicable.

## Actual verification

- Local API Release solution/test compilation: zero warnings/errors. Fresh EF
  model comparison: no model change. Generated help consistency passes.
- Vercel client/SSR/function build and protected CI packaged-help checks pass:
  56 guides, corpus `24626584a60b`. Stage metadata matches the full source SHA,
  archive digest, intended project/team and production target.
- The staged root normalizes Dashboard search parameters with a 307; its observed
  normalized landing renders 200. Proxied API health is 200 and anonymous work
  attention is 401 through existing Vercel protection access. Protection remains
  enabled. Live sign-in renders within the root application.
- Hosted scanner capacity, clean, EICAR, encrypted, oversized and health checks
  pass. Protected logs record the exact source/image, no migration and conserved
  Website counts. Public routing was not changed.
- After promotion, API health 200, database ping 204, normalized Portal landing,
  Documentation and public Website rendering 200. Direct and proxied anonymous
  work attention return 401. The canonical alias targets the exact staged build.
- A bounded new-deployment runtime-error query (30 minutes, maximum 25 entries)
  returns zero entries. The live Portal sign-in page renders with no captured
  browser errors. This is a bounded check, not general uptime acceptance.
- The available Portal browser is signed out. Authenticated Phaeno work/help/
  Website queue smoke checks were not performed; no production user impersonation
  or real business/scientific/intake mutation was used to substitute for them.

The [local closure receipt](../testing/runs/2026-10-12-deficiency-closure.md) records
the executed frontend/backend/browser regressions and scientific measurement
limits. Those synthetic/connected local checks remain distinct from actual
hosted actor/provider and physical acceptance.

Deploy Portal Green was enabled only for this manual dispatch and is verified
disabled again while #104 completed. Portal/Website Vercel Git holds and the
Local-only backup deferral remain. The public Website frontend is not released.
Customer-only i18n and en-US alone published remain unchanged.

CI emits existing action-runtime/runner migration notices: Node 20 actions are
forced onto Node 24, and `ubuntu-latest` is scheduled to change October 19. The
current run succeeds; review and validate that CI maintenance separately rather
than treating the notices as production acceptance or silently changing this
pinned release.

Private/local release evidence and screenshots are retained under
`output/review-closure-release-20261012/`. Temporary archive/extraction and build/
tool intermediates are removed after verification. The accepted Operations
response/recovery-host/Lab-training defaults are recorded in the
[commercial acceptance packet](COMMERCIAL-ACCEPTANCE-20261012.md); live recovery,
named responders and observed bench/training signoff remain open gates.
