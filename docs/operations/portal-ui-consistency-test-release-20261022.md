# Portal UI consistency hosted-test release — October 22, 2026

The shared page-return controls and UI consistency guardrails are committed,
pushed and active at `https://portal.phaenobiotech.com`. The standalone visual
gallery remains a local engineering tool outside Portal routes and navigation.
The existing hosted test environment is preserved; no migration was required.

## Release identity

| Item | Identity |
| --- | --- |
| API and frontend source | `0baf3adf57ae07b67d6f1497a01523774f98f7f9` |
| Exact API Git archive SHA-256 | `d47936f06d1af89d4bd4b622ba5765c2765a627656d915c879c1fba602e9f3bd` |
| API image | `phaeno-portal-green-api:sha-0baf3adf57ae-manual-20261022-1` |
| API image ID | `sha256:4d48899298c17c9d6944fb585acee472b721183b14de90e6e8956fb40d8e19a8` |
| API release | `/opt/phaeno.portal-green/releases/0baf3adf57ae07b67d6f1497a01523774f98f7f9-manual-20261022-1` |
| Frontend deployment | `dpl_GHYkzK17enR3DSGiQTzbbriSrKRX` |
| Frontend build | `phaeno-ops-mgmt-system-3m5tuski5-cadexgenomics.vercel.app` |
| Matching 62-guide corpus | `89e4a753a7d9226a3fa59d37bf082987ef2bc956014e9e05db82da24283a3a59` |

The frontend was built with production settings and custom-domain assignment
disabled. Protected staged root and all 16 referenced assets returned 200.
After API acceptance, that same READY build was promoted without rebuilding.
Canonical and prior-pinned root asset lists match the staged release; all 16
canonical asset hashes match. The established skew boundary now equals
`1792684739024`; its 43,200-second maximum age is unchanged.

The protected exact-source host script ran directly with deployment locking,
migrations false and identity cutover false. The existing DPS tunnel was restarted
to follow the replacement API network namespace. The actual API confirms TLS
discovery on **18883**; the Simulated recipe, worker, S3/ClamAV and protected
runtime settings are unchanged. The previous API image
`sha256:3ced49a630f3596d79c1ddc31810dbca966bc617159a97c205b33b96cb101127`
and frontend deployment `dpl_AdCQwmiXcNz8LXAhcs2wU8K8y4zL` remain available
for rollback, together with protected compose/manifest/settings recovery.

## Recovery and preservation

Fresh recovery is retained under
`/var/backups/phaeno-portal-deploy/ui-consistency-20261022`, with encrypted copies
collected off-server. Isolated PostgreSQL 18.6 restore passes all 250 table
fingerprints. Independent off-server decryption verifies the database signature,
restore receipt, all table fingerprints and all 117 file hashes/permissions in
the runtime/document/Local archives. Plaintext temporary backup packages and keys
were removed. Encrypted recovery hashes:

| Artifact | SHA-256 |
| --- | --- |
| `recovery.tar.gz.enc` | `233b578de3652e05221511f6428c197685f8181eab190696cb9c3c46723b3fb7` |
| `recovery.key.enc` | `46547525d5e25f6ba154ead8498abd45bab916fb09b86cc742ddff6535de10dc` |

Final readback at 16:07 UTC preserves all 250 live table fingerprints, 29
migrations through `20261017190934_SplitInternalOrderNotes`, and 115 unrelated
runtime/document files with permissions. Only the two expected deployment
metadata files changed. Local managed files remain empty. Website intake keeps
all **12 contacts and six Demo requests**, including complete historical records:

| Table | Complete-record fingerprint |
| --- | --- |
| `website.web_contacts` | `5f3ea93049675de27b8ed65e6e1379c7` |
| `website.web_orders` | `bae6f8340cfa604030cb6d18b6dba630` |

These aggregate fingerprints sort by row hash; older receipts used a different
ordering. No records, roles, authentication settings or scientific outcomes were
changed. Zero active assemblies remain. OCIA container image/start identities
are unchanged, and Website frontend projects/configuration were not deployed.

## Verification

- [Portal UI quality run 39809567603](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/39809567603)
  passes against the exact release SHA: 18 guard regressions, lint/source guard
  over 739 files with two documented scanner-step exceptions, TypeScript,
  62-guide consistency, gallery build and 24 browser cases. Gallery projects
  cover desktop/phone light/dark, 320 px reflow and axe with no violations.
  Branch protection is unchanged.
- Local production frontend build and backend Release solution build pass;
  backend compilation reports zero warnings/errors. No full application E2E or
  backend test suite was run for this UI/generated-corpus release.
- Actual signed-in Company and sequencing-assembly returns each have one arrow,
  12.8 px text, 4 px gap, 28 px minimum height, 4/6 px padding and no underline.
  Neither inspected page has horizontal overflow. Assembly return preserves
  its originating assembly tab and existing URL search state.
- Company Actions has one chevron. Arrow Down opens it at the first item;
  Escape closes it and returns focus. No menu action was executed.
- Phaeno help search for `Back` finds 16 guides. The updated getting-started
  navigation paragraph and October 22 review date render. The packaged corpus
  and freshly published index contain the matching 62-guide version.
- API/database/scanner healthy; API health 200, database ping 204, anonymous
  assembly/research routes 401, public Website 200. The bounded browser warning/
  error scan and API failure scan after 16:02:26 UTC are empty. The original
  assembly browser page is restored; no business workflow or file action ran.

Temporary host source package and recovery-verifier helper were removed;
encrypted recovery, rollback material and receipts remain. The local gallery
preview stays available for the Owner's review.

## Retained boundaries

`Deploy Portal Green` remains `disabled_manually`. Orphan run `39056745064` is
still queued with zero jobs and retains its root-only `QUARANTINED` release-path
fence with no deployment directory. No competing dispatch or cancellation was
attempted. Portal and Website `git.deploymentEnabled` holds remain false;
Vercel project Git-provider options are unchanged. The hosted-test populated-S3
recovery deferral and disabled backup timer remain.

Gallery and two-page signed-in smoke do not establish every permission-dependent
workflow, dirty-form path, screen-reader behavior or complete WCAG conformance.
Customer/Partner/Prospect search sessions, physical/scientific acceptance and
commercial activation were not exercised. See the
[preserving plan](../plans/PORTAL-UI-CONSISTENCY-HOSTED-TEST-RELEASE-20261022-PLAN.md).
