# Portal vendor sequencing release — October 5, 2026

The owner authorized documentation updates, successful tests, commit/push and
deployment including EF changes. The [hosted release plan](../plans/PORTAL-WORKFLOW-RELEASE-20261005-PLAN.md)
preserves application data, scientific facts, private files and runtime settings.
Local demonstration data and scientific/provider acceptance remain separate.

## Preparation

The hosted API/UI baseline is application
`58f2af34e989c3b7187b39d542174444c2985896`, API image
`phaeno-portal-green-api:sha-58f2af34e989-run-37246241157-1` and UI
`dpl_F2eTLxgsiU6ydnyYRrXNR6ztPLwY`. Eighteen migrations, runtime hashes,
private mounts and all-schema application table counts were inventoried.

Both additive migrations passed twice on a disposable fresh hosted copy.
Twenty migrations were recorded; 231 existing application table counts match
except the reviewed one-row built-in Sequencing service addition. SQL SHA-256:
`0d5299c03af9a3972c41d8fc7229a615a0899187d6f516c9eb81150d3b8613fa`.
Disposable database and unencrypted dump cleanup passed.

Frontend unit verification: 1,448 passed in 225 files, zero failed and three
intentional skips for suppressed Customer specimen holds. The suppression
regression passes. Final lint, TypeScript and help checks pass (56 guides,
corpus `1fcbe16fb9a6`). The generated ERD contains 234 model tables, 3,471
fields and 560 foreign keys, plus the public migration-history table.
The clean desktop/mobile suite passes 212 cases with two intentional mobile print
skips and no retries. The complete connected backend run passes 1,261 cases with
two intentional environment skips, zero failures and verified disposable-database
cleanup. All 63 focused repair cases also pass. The full Release build has zero
warnings/errors and EF model drift is absent. The seven intentional suite skips
are the three suppressed Customer hold cases, two mobile print cases, the Windows
linked-directory case and opt-in investigation attachment restore scenario.

## Recovery

[Protected backup run 37376489067](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/37376489067)
passed from maintenance source `b09b7935b44bde93f025fbd193d95e0e108382c2`.
Snapshot `snapshot-20261005T213232Z-a005ef08-c0fd-48cb-8493-d021aade6bf0`
passed isolated database migration/file-reference restoration, populated
synthetic restoration, encryption round trip, cleanup and API resume.
Referenced private files contain zero files/bytes. The workflow is disabled
again; the existing host timer remains configured as before.

Encrypted off-server artifact `11371237948` is retained for 35 days, digest
`85959098123a7d3fec122502f00428c9bb51f87d0ed6881579a2b55de4997a1b`.
The local encrypted recovery copy matches its manifest:

| File | SHA-256 |
| --- | --- |
| `snapshot.tar.enc` | `ddd3dacd1cee2fa249f45c3e6ec109fe04bc0ce6c927f8a56241c921cd98ffd7` |
| `snapshot.key.enc` | `cd6bd1795bea778f4c39ec9617d83d937ee1ed103d6752c7151597b04c7d1283` |
| `receipt.env` | `558b7782da3e33ea3014f4fbe3140a7d939187b8c1ea521d9309c09fcb4e1269` |

## Activation

Application source `c781988630ddfdb07f0d76dd7c3bb9753c15d660` is committed and
pushed to `codex/portal-documentation-search-release`.
[Protected deployment run 37380436791](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/37380436791)
succeeded from that exact source with migrations enabled, storage/scanning/bootstrap
**Preserve** and Clerk cutover false. The running healthy API uses image
`phaeno-portal-green-api:sha-c781988630dd-run-37380436791-1`, image ID
`sha256:18642a967aa9500563bf2332e3939e4025ba7cca15c85b150ab506bcd3848e92`.

The hosted history contains all twenty migrations, including
`20261005163942_VendorSequencingResults` and
`20261005182306_SequencingVendorCatalog`. All 231 existing application table
counts are unchanged except the intentional single Sequencing service seed.
The three new tables are empty and all fourteen new sendout fields are nullable.
Database/Portal runtime hashes and private mounts match the baseline; Compose
changes only the release image/source identity. Database and managed scanner are
healthy, independent OCIA services remain running, and bounded API logs contain
zero failure lines. No reset, backfill, local fixture copy or Clerk cutover occurred.

The production-configured UI was built from an isolated copy matching all 1,056
frontend source files. Mock sessions are disabled, production Clerk is configured
and `/api` uses the existing public proxy. Staged deployment
`dpl_EeQv4SD3AgZkL8fKGw2DMHyxcDS2` passed protected-root verification before
promotion. Vercel's source metadata and canonical domain alias confirm that
[Portal](https://portal.phaenobiotech.com) now serves this same application commit.

Live checks pass: health 200, database ping 204, accession and vendor catalog
access 401 both directly and through the Portal proxy, Website search/root 200
and Portal root 200. Actual production Clerk sign-in controls render with zero
browser warnings/errors. Both protected workflows are disabled again and both
Vercel Git deployment holds remain enabled. Physical/scientific/provider and
authenticated operator acceptance remain separate.

## Final pre-migration recovery

The coordinated database/private-file snapshot pauses and resumes API writes.
The API deployer separately holds the exclusive deployment lock and takes a
consistent PostgreSQL dump while the old API remains available; it does not
provide another write freeze. The reviewed migrations are additive and the
post-deployment preservation checks pass. This corrects the initial plan wording
to match the actual protected procedure.

The deployment produced and restore-verified
`pre-migration-20261005T221124Z-c781988630dd` at the eighteen-migration baseline.
Encrypted database and key files were exported off-server and checksum-verified:

| File | SHA-256 |
| --- | --- |
| `.dump.enc` | `0f2b5bed5b3a521ce6c1c588a84fa7f24721020c99d945e8fb8ec8ba91e2f9d7` |
| `.key.enc` | `c1a4f005e550621adac2a07965c9314e8b352b3f438ba2d2d0f7f2f5d0d369df` |

Recovery, test reports, migration SQL, inventories and live smoke evidence are
retained under ignored `artifacts/portal-release-20261005`. Temporary isolated
backend builds and frontend source/dependency/configuration copies are removed.
The final documentation checkpoint records this completed activation; the
application deployment remains pinned to `c781988630ddfdb07f0d76dd7c3bb9753c15d660`.
