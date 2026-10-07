# Portal sequencing release — October 6, 2026

The Owner requested initial commit/push without deployment, then updated guides,
tests to success, second commit/push and preserving API/Portal deployment with EF
migrations. The [hosted plan](../plans/PORTAL-SEQUENCING-RELEASE-20261006-PLAN.md)
records target, compatibility, recovery, cutover and rollback boundaries.

## Verification and source

First checkpoint `70643766` was pushed without deployment. Tested application
`49a90f77b41ceacd42c54d5d0b709c262f797e89` is the second committed/pushed checkpoint.
Full connected backend: 1,280 passed, zero failed, one Windows linked-directory
skip. Frontend unit: 1,457 passed with three previously suppressed Customer-hold
skips. Desktop/mobile browser: 212 passed with two existing mobile-print skips and
no retries. Complete builds have zero warnings/errors; full lint, TypeScript,
generated help and EF model consistency pass. ERD: 240 tables, 3,548 fields, 583
foreign keys. The 56-guide corpus is `2720e5faf305`.

Result editing now appends immutable version-linked library exceptions; current
readers use the latest version and direct deletion remains forbidden. The fifth
migration rejects unexpected historical rows rather than inventing attribution.
Local and hosted exception tables were verified empty. All five migrations passed
twice on a hosted copy: 20 to 25 migrations, 234 existing table counts preserved,
six new tables empty. SQL SHA-256:
`8ef3c6e19da2e2ead0de72498475fc74611a45bf41a54f965011a9655928f691`.

## Recovery

[Backup run 37566195680](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/37566195680)
succeeded from exact maintenance source `49a90f77b41ceacd42c54d5d0b709c262f797e89`.
Snapshot `snapshot-20261007T031934Z-91c1cee1-518a-4480-b211-47f2020b13d7` captures
the previous baseline and zero referenced files/bytes. Isolated database/file
restore, encryption round trip, cleanup and API resume pass. Off-server encrypted
artifact `11459215215`, digest
`6f04ce5dc8c4f93b1bc074dcc1a0db1d8957d1d2db46ed9d9d2bf2ccddc10c30`,
is retained; the local encrypted copy matches every manifest checksum.

The deployer also restored and verified its final encrypted pre-migration backup.
Retained off-server files match their host checksums:

| File | SHA-256 |
| --- | --- |
| `pre-migration-20261007T032935Z-49a90f77b41c.dump.enc` | `834adbd0b565e7b18297fb15e0363f2cfb51967c5580b8b3b362326ee1340cfc` |
| `pre-migration-20261007T032935Z-49a90f77b41c.key.enc` | `9a52d20592ea32b5d53b6124c1341cb4ddda7c3f794cfccf26dd8688fc13faf5` |

## Activation

[Deployment run 37566708677](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/37566708677)
succeeded from the tested SHA with migrations enabled, storage/scanning/bootstrap
Preserve and Clerk cutover false. The healthy API uses image
`phaeno-portal-green-api:sha-49a90f77b41c-run-37566708677-1`, image ID
`sha256:019898055eaec208474a379cd46e788fd78f9005ef9d7453382a4d165baabac5`.
All 25 migrations are recorded, including `20261007025545_VersionedVendorLibraryExceptions`.
All 234 existing table counts are preserved; the six new tables are empty.
Database/Portal runtime hashes, private mounts and scanner/database health match
the baseline. Independent OCIA services remain running.

The exact production-configured UI was staged without custom-domain assignment,
protected-root verified and promoted after API checks. Deployment
`dpl_PLcuDhNJSwjMLbHJeizLqE7ya6Qn`, URL
`https://phaeno-ops-mgmt-system-f022jjyrn-cadexgenomics.vercel.app`, serves
[Portal](https://portal.phaenobiotech.com). Source metadata and canonical alias
confirm the same application SHA as the API. Production sign-in controls render
without browser warnings/errors. Nine public health/proxy/authorization/Website
checks pass; bounded API failure lines are zero.

Both protected workflows are disabled again and both Vercel Git holds remain.
No reset, fixture copy, backfill, identity cutover or provider activation occurs.
Evidence and encrypted recovery are retained under ignored
`artifacts/portal-release-20261006`. Disposable databases/plaintext rehearsal
snapshots are removed; prior recovery and active local preview output are preserved.
Real DPS execution/access/output integration, physical/scientific validity and
authenticated operator/Customer acceptance remain separate.
