# Website operations hosted-test release — October 12, 2026

Matched API and Portal frontend source
[`dedae5d2`](https://github.com/behaack/phaeno-ops-mgmt-system/commit/dedae5d23909fdf540dff2786bfdad308a8ae261)
is live at [Website operations](https://portal.phaenobiotech.com/website-operations)
under the [preserving release plan](../plans/PORTAL-WEBSITE-OPERATIONS-TEST-RELEASE-20261012-PLAN.md).
The Owner requested commit, push and deploy; the established bounded manual
workflow authorization applies. Automatic deployments and commercial activation
remain held.

[Deploy Portal Green #103](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/38255085546)
completed successfully on the pinned commit. API image:
`sha-dedae5d23909-run-38255085546-1`. Vercel deployment:
`dpl_753tSeojqisXXoP8dhn3GYXFDaYg`. The exact-source frontend was staged with
the canonical Portal alias retained on `dpl_JB7682hbDJvSkCvZjCDCjafAWo7x`, then
promoted without rebuilding after API success, source/image and health checks.
The live alias independently resolves to the new deployment.

Source archive SHA-256:
`d7d082a33b32cd5140d5b5af4c87101b35c1febfec26085b8ca179c91689f0d0`.
The first ordinary push encountered a GitHub ref-update server error; retry
succeeded and the remote main SHA was verified before dispatch. GitHub also
returned a server error after the disable action; a fresh read confirmed that
the hold was applied. Final state is disabled_manually with #103 successful.
No forced history change, authentication change or weakened protection was used.

## Preservation and migration

All hosted data, identity mappings, configuration, private file/object versions,
retained Local copies, S3, ClamAV and worker/bootstrap settings are preserved.
There is no reset, replacement, local data import, identity/storage conversion,
provider activation or scientific write. The protected release verifies Website
table counts before/after and records the same `0,1` raw counts. Both active
intake queues are empty during authenticated post-release inspection; retained
history is distinct from the active queues.

No migration/snapshot or persisted-model change occurred. The freshly built
Release model check reports no changes since the last migration. Deployment uses
`apply_migrations=false`; no EF migration ran. PostgreSQL 18/database-volume and
file-service guards pass. Retained encrypted database/Local recovery remains
unexpired and its current artifact digest matches the restore-verified private
receipt. The Owner's hosted-test S3 recovery deferral remains: this is not a claim
of current coordinated S3 backup coverage.

## Actual verification

- Local API Release solution build: zero warnings/errors. Protected CI also
  builds and validates the packaged help corpus. Vercel client/SSR/function
  build succeeds. Both builds contain 56 guides with corpus `f798930331ad`.
- Staged Website operations rendering and proxied API health return 200 using
  existing Vercel protection access; anonymous Website queue API returns 401.
- Hosted clean, EICAR, encrypted, oversized and scanner-health checks pass.
  API health is 200 and database ping 204 before promotion and after release.
- Portal Website operations, help and public Website rendering return 200.
  Direct and proxied anonymous Website queue APIs return 401.
- An existing authenticated Phaeno session shows **More → Website operations**,
  **Mailing list** and **Demo requests** in the sidebar, authorized queue reads
  and correct independent empty states. Keyboard selection opens Demo requests;
  no duplicate tab strip is mounted. Captured browser errors are empty. No real
  unsubscribe, completion, resend or worker mutation is performed as smoke.
- A bounded new-deployment runtime error query (30 minutes, maximum 25 entries)
  returns zero entries; this does not establish general uptime.

The [initial slice receipt](../testing/runs/2026-10-12-website-operations.md) records
local types/lint/help/Customer-reference and desktop/phone checks. Automated
regression suites remain unrun under the request-only policy; CI/scanner smoke
and authenticated release inspection are separate evidence. Broader populated
queue, actor/tenant, email-provider and commercial acceptance remain distinct.

Vercel Git holds for Portal/Website and the protected manual workflow hold remain.
The public Website frontend is not released; its shared API dial tone passes.
Customer-only i18n and en-US alone published are unchanged. Local release evidence
is retained in `output/website-operations-release-20261012/`; task-created archive
and extraction intermediates are cleaned after verification.
