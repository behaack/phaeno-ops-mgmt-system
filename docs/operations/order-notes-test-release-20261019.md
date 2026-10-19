# Order notes and R&D hosted-test release — completed October 19, 2026

The Owner approved the preserving hosted note conversion and requested resolution
of the stale dispatch and completion of the release. The existing hosted-test
API and canonical Portal frontend now serve the same source. This receipt
supersedes the incomplete October 17 R&D release checkpoint; the public Website
frontend and OCIA were not deployed.

## Released identity

- Source: `390341dd9ba913f6f5a416de827ad4de99c8f380`, pushed to main; implementation
  commit `027350783d07a443a0c0b5869d9527fc04fe0a75` is included.
- Git archive SHA-256: `d7274471f3e12476a33d1a95ca8990164658d0b719b34054f0b31d282e46c33f`.
- API image: `phaeno-portal-green-api:sha-390341dd9ba9-manual-20261019-1`.
- Host release: `/opt/phaeno.portal-green/releases/390341dd9ba913f6f5a416de827ad4de99c8f380-manual-20261019-1`.
- Frontend: `dpl_AdCQwmiXcNz8LXAhcs2wU8K8y4zL`, production-target staged from
  that GitHub SHA with custom-domain assignment disabled, verified READY and
  promoted without rebuilding to `https://portal.phaenobiotech.com`.
- Skew boundary: `1792418319676`; maximum age remains `43200`.
- Applied migrations: `20261016204013_AddResearchNotebook` and
  `20261017190934_SplitInternalOrderNotes` (EF runtime `10.0.10`).
- Packaged and active help index: 62 guides,
  `06ed7be7d7912a2d77b695896e1ab6e14d674c7d02c6533fbe18df729e5513c7`.

## Stale dispatch containment and execution

GitHub still reports run `39056745064` queued, with no jobs or pending approvals.
Normal/force cancellation return HTTP 409; deletion returns HTTP 403. No new
Actions dispatch was issued. The exact old workflow source was inspected: its
extraction step uses `set -Eeuo pipefail` and requires its release path not to
exist before any runtime installers, migrations or deployment can execute.

A root-only quarantine directory occupies the exact stale attempt's release
path, `e5c0804c90dfcf68931cc2f3d48525964ea6b419-39056745064-1`, under the release
root. It contains a quarantine marker and no executable deployment tree. The
absence check is verified to fail. Retain this fence while the orphan remains
queued; do not rerun that old source or remove the fence. GitHub's queue display
is unresolved; the stale attempt cannot deploy through its reviewed workflow.

The approved current source was transferred as a checksum-verified Git archive
and executed directly through the repository's protected `deploy-release.sh`.
Its deployment lock, API pause, fresh encrypted backup, isolated restore,
scanner/file-service checks, migration, intake preservation and health guards
all ran successfully. There is no successful Actions run for this release.
No identity, provider, bootstrap, email or storage configuration installers ran.

## Recovery and preservation

Fresh preflight recovery reproduced all 245 baseline tables in isolated
PostgreSQL 18.6 with no live mounts. Both pending migrations then passed on a
separate isolated recovery copy. The preview identified two internal orders
with non-null note inputs. The expected converted state changed only
`commercial_ops.lab_service_orders`, `commercial_ops.order_idempotency_records`
and migration history, and added the five empty research tables.

The live post-migration fingerprints for **all 250 tables exactly equal the
isolated conversion result**, including the converted orders/replay records,
unchanged stored revision audits and unrelated data. This was checked again
after initial signed-in read-only smoke. Website intake retains all 12 contacts
and six Demo requests with complete-record fingerprints
`ef77bd28975f174e0fefaf39931bd25f` and
`95aa679ef04abf2b672f77ee6b9f6222`. No history was reset, test data inserted,
notifications replayed or business records edited during acceptance checks.

Runtime files retain their hashes except expected release metadata in
`compose.env` and `deployment-manifest.txt`. Local file recovery contains zero
files; retained runtime/Local archives were compared against source. S3 settings
and bytes were not changed. The populated hosted-test S3 recovery deferral and
disabled backup timer remain; no S3 recovery qualification is claimed.

The protected script paused the old API before its fresh migration backup and
successfully rehearsed restoring that backup before migration. Both preflight
and paused-API recovery copies were collected off-server, checksum-verified and
independently decrypted. The preflight archive and restore evidence were
inspected; the paused-API dump has the PostgreSQL custom-format signature.

| Recovery artifact | SHA-256 |
| --- | --- |
| Preflight `recovery.tar.gz.enc` | `e238917c9854ebadf24efb367a3deb5a29ea214107432d15f5967f019ed0646b` |
| Preflight `recovery.key.enc` | `974648cf67410e77ab7b0e1e7dc98321c81a6f1aa17f5f3b6e6b4b1a8cab5437` |
| `pre-migration-20261019T140320Z-390341dd9ba9.dump.enc` | `2a4c8f865c9fba45496dc6828b2111aba575d456f68944beac239baea659fc17` |
| Corresponding `key.enc` | `c577e6adc42808575a7893d8fb919fc9c519289389956ab6880cc034105118dd` |

Private evidence is retained under
`/var/backups/phaeno-portal-deploy/order-notes-20261019` and ignored
`.artifacts/order-notes-release-20261019` (local access limited to the current
Owner and SYSTEM). Isolated rehearsal containers and
unencrypted rehearsal dumps were removed. The prior API/UI pair remains
retained, but an old internal-note writer must not resume against this model.
Prefer a preserving forward repair; database downgrade or restoration over
subsequent writes requires separate review and authorization.

## Verification and limits

Backend Release solution build passed with zero warnings/errors. Frontend
typecheck, generated-help consistency and whitespace checks pass. Automated
regression suites were not requested or run. The staged production build is
READY; all 16 linked assets returned authenticated HTTP 200. Canonical root
and prior-pin requests identify those same assets, and all 16 public asset
hashes match staging. All 14 R&D guide screenshot files match the deployed Git
revision byte for byte. An older preparation screenshot manifest had one stale
hash; verification used the actual released Git objects.

Independent public probes pass: health 200, database ping 204, anonymous
research and platform-order reads 401. API and scanner report healthy, and
the bounded new-API failure/critical scan is empty. Vercel's error-level runtime
query for the released deployment over the last 20 minutes returns no entries.

Actual signed-in Edge smoke confirms Order operations list/detail reads, both
rich-text note editors and visibility guidance in the existing Draft editor,
cancel navigation without saving, and the empty R&D projects list. Help
navigation and the rendered illustrated R&D guide load; live search for
`private notes` returns the
updated order guide and new R&D guides. No order save/submission, Customer-role
privacy journey, research creation/file upload, scientific validation or full
business acceptance was performed. Order how-to screenshots still predate the
two-editor layout, as already tracked in the owning plan.

Manual API deployment remains `disabled_manually`; Portal and Website Vercel
Git holds remain false. Commercial activation and the existing provider,
physical/scientific and recovery qualification gates are unchanged.
