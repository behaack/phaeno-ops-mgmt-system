# Portal gap-closure hosted-test release — October 11, 2026

Matched Portal API and frontend source
[`97da7807`](https://github.com/behaack/phaeno-ops-mgmt-system/commit/97da7807c1de86f6d60492a1d2ad825ee533eb7c)
is live under the [preserving release plan](../plans/PORTAL-GAP-CLOSURE-TEST-RELEASE-20261011-PLAN.md).
The Owner explicitly authorized commit/push and the temporary protected-workflow
enable/run/disable sequence, including that sequence for future requested deploys.
Automatic deployments and commercial activation remain held.

[Deploy Portal Green #102](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/38206214665)
succeeded on the pinned commit. API image tag:
`sha-97da7807c1de-run-38206214665-1`. Vercel production deployment:
`dpl_JB7682hbDJvSkCvZjCDCjafAWo7x`. The exact-source frontend was staged first;
the canonical Portal domain retained the preceding deployment until API success,
source/health verification and promotion of the already-built staged deployment.
Vercel source metadata and the API release output independently match the SHA.

The immutable source archive digest is
`6a94fd2a584106e80f5e5d22a9408c0f7d163f39565f91c8904113443a878907`.
The first push was rejected by GitHub's private-email protection. Only the
unpublished release commit was amended to the repository's existing noreply
identity; source content stayed identical and the ordinary push succeeded.
No account privacy setting or forced remote-history change was made.

## Preservation and migration disposition

This updates the existing production-hosted test environment. Hosted accounts,
memberships, configuration, commercial/Lab/scientific records, audit history and
file/object versions are preserved. No database reset/replacement, local dataset
import, identity cutover, S3 conversion or DPS/worker activation occurred.
S3 and ClamAV remain selected; the Local-only backup hold and existing Owner
testing recovery deferral remain. Retained encrypted recovery is unexpired and
its archive digest matches the prior verified private receipt. It is historical
database/Local recovery, not a claim of current S3-aware backup coverage.

No migration/snapshot files changed. EF reports no model changes since the last
migration; the protected release used `apply_migrations=false`. No EF migration
ran. PostgreSQL 18/volume safeguards and file-service preflight passed. The
release recorded Website table counts `0,1`, preserving the prior dial tone.

## Verification and limits

- Full local API Release solution builds with zero warnings/errors. The protected
  workflow also builds successfully and validates matching packaged help.
- The previous complete closure and focused review test checkpoints remain
  recorded in their [closure](../testing/runs/2026-10-11-system-gap-closure-final.md)
  and [review](../testing/runs/2026-10-11-gap-review.md) receipts; they are not
  recounted as new deployment test runs.
- Staged rendering and proxied API health return 200 using existing native Vercel
  protection access. The root's same-host canonical work-search redirect is
  followed normally. Protected laboratory API remains 401 without Clerk auth.
  Deployment Protection settings were not weakened.
- Hosted scanner clean, EICAR, encrypted, oversized and health checks pass.
  Post-release API health is 200, database ping 204, Portal/help/Website rendering
  200, and direct/proxied anonymous Lab/work-attention requests 401.
- An existing authenticated Phaeno session loads the new work dashboard and bell
  with the same one-item count/record. Lab Operations loads its authorized list.
  Phaeno guide navigation, lazy guide body and documentation search work; updated
  scope/governance instructions appear in the rebuilt corpus. Captured browser
  error entries are empty. No order, file upload, scientific approval/release or
  provider execution was performed as smoke.
- A bounded promoted-frontend runtime query (last 30 minutes, maximum 25 error
  entries) returns zero entries. This is a bounded observation, not an uptime promise.

The protected workflow is restored to disabled_manually. Frontend/Website Git
deployment holds remain; the Website frontend was not released. Customer-only
i18n and en-US alone published remain. Representative Customer/Partner/Prospect
and populated strict-scientific performance, provider, coordinated S3 recovery,
bench/training and commercial acceptance remain separate gates.

Local private evidence and screenshots are retained under
`output/test-release-20261011/`. Task-created archive/extraction/build intermediates
are cleaned after verification; release logs, source/alias metadata, smoke receipts
and images remain. The final documentation-only follow-up records the completion
and future deployment authorization without changing application source.
