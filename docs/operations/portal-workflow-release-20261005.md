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

Commit/push, matched API/UI deployment and live acceptance checks are pending.
