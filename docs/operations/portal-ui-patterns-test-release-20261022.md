# Portal UI patterns hosted-test release — October 22, 2026

The UI consistency follow-ups are committed, pushed and live at
`https://portal.phaenobiotech.com`. They include shared page/list/record patterns,
the closer notification badge, standardized controls/data/status/pagination/detail
presentation, fifteen gallery sections, 24 reviewed page images and drift checks.
The engineering gallery remains outside deployed Portal routes/assets/navigation.
The existing hosted-test environment and all data are preserved; no migration ran.

## Release identity

| Item | Identity |
| --- | --- |
| UI implementation commit | `45136e60f7f38e4ebd90f81c7af08ce1c697a7d1` |
| Deployed API/frontend source, including CI renderer correction | `669b93365ca02db58ce8f55dcb14651059c75ee6` |
| Exact Git archive SHA-256 | `45c4b4799093f21b92aa0c0d144ce3ecea90fbb50bde7f68dbc51cd34613ca8c` |
| API image | `phaeno-portal-green-api:sha-669b93365ca0-manual-20261022-2` |
| API image ID | `sha256:e5554bd93004290ddffd88d370c06d896d0cc191804c117926d71dc49de12aa0` |
| API release | `/opt/phaeno.portal-green/releases/669b93365ca02db58ce8f55dcb14651059c75ee6-manual-20261022-2` |
| Frontend deployment | `dpl_CJsvwcBncLwbV1U4St51D3dEA7yy` |
| Frontend build | `phaeno-ops-mgmt-system-ctcxz2e6r-cadexgenomics.vercel.app` |
| Matching 62-guide corpus/index | `33311a4e20573316a08111ef3b445998e07735320dd7e70fba214d4376328f58` |

The frontend was built from the pushed SHA with production settings and custom
domain assignment disabled. Protected root and all 16 referenced assets returned
200. After API acceptance, that same READY build was promoted without rebuilding.
Canonical and previous-pinned roots serve the staged asset list; all 16 asset
hashes match. The established skew boundary is now `1792698815765`, with its
43,200-second maximum age unchanged. Vercel project Git-provider options remain
unchanged for Portal and both Website projects.

The protected exact-source host deployment retained its lock and safety checks,
with migrations/identity cutover false. Only the existing DPS tunnel restarted to
follow the replacement API namespace. Actual API TLS discovery succeeds on 18883;
the Simulated recipe, worker, S3/ClamAV and runtime settings remain unchanged.
Prior API image `sha256:4d48899298c17c9d6944fb585acee472b721183b14de90e6e8956fb40d8e19a8`
and frontend `dpl_GHYkzK17enR3DSGiQTzbbriSrKRX` remain rollback targets.

## Recovery and preservation

Fresh recovery is retained at
`/var/backups/phaeno-portal-deploy/ui-patterns-20261022`, with encrypted copies
collected off-server. Isolated PostgreSQL 18.6 restore passes all 250 table
fingerprints. Independent off-server decryption verifies the database signature,
restore receipt, all table fingerprints and all 117 runtime/document/Local file
hashes and modes. Temporary plaintext packages/keys were removed. Encrypted hashes:

| Artifact | SHA-256 |
| --- | --- |
| `recovery.tar.gz.enc` | `1b410f2144201e89314330776c81c35e57bebee47362e934f606fb08ba9f93b4` |
| `recovery.key.enc` | `72d436f760d3f2111f58faeb9e327e4b9bb242c8656d7dbe8e248d9ead3649ce` |

Final readback at 20:06 UTC, after the signed-in smoke, preserves all 250 complete
table fingerprints, 29 migrations through `20261017190934_SplitInternalOrderNotes`
and 115 unrelated runtime/document files with modes. Only two expected deployment
metadata files changed. Managed Local files remain empty. Website intake retains
all 12 contacts and six demo requests, including complete history:

| Table | Complete-record fingerprint |
| --- | --- |
| `website.web_contacts` | `5f3ea93049675de27b8ed65e6e1379c7` |
| `website.web_orders` | `bae6f8340cfa604030cb6d18b6dba630` |

No records, roles, account settings or scientific outcomes changed. Zero assemblies
are active. OCIA container image/start identities are unchanged. Website frontend
projects were not deployed. S3 objects were not migrated or modified by this work.

## Verification

- Exact-source [UI quality run 39844011970](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/39844011970)
  passes both jobs: 26 source regressions, 15 focused component tests, lint/750-source
  guard with two unchanged scanner exceptions, TypeScript, help consistency,
  production/gallery builds, isolation across 843/three text artifacts, 84 gallery
  browser checks and 24 Windows page-image comparisons. Snapshot updates are disabled.
- Initial run 39843262156 passed the ordinary UI job but rejected eight light-theme
  list/detail frames because of workstation/server glyph-edge smoothing. Inspection
  and comparator analysis showed 6–30 residual pixels at color threshold 0.15 and
  zero at Playwright's default 0.2. The correction retains all reviewed PNGs, the
  80-pixel budget and a stricter-than-default threshold. A deliberate 1 px layout
  shift fails with 7,665 differing pixels. Initial candidate
  `dpl_6HtuVtzZwmP31FfToPwwqneHT9Pk` was never promoted.
- Local prior implementation verification: 1,572 frontend tests pass with three
  existing skips; 27 subsequent focused unit checks, 22 selected feature fixture
  cases, 84 gallery cases and 24 image comparisons pass. Release backend solution
  build has zero warnings/errors. No backend test suite was rerun for this UI/
  generated-help-only release.
- Actual signed-in Edge: bell button 44 px, icon 20 px, numeric badge 2 px inside
  the upper-right button edges. Three dashboard native filters are all 32 px;
  Company text/select controls are 32 px and its checkbox is 16 px.
- Two sequencing input identifiers and eight assembly identifiers have matching
  14 px/500-weight/primary-color/no-underline-at-rest computed styles. Assembly
  timestamps visibly include seconds and PDT. Its detail return has one arrow,
  12.8 px text and 4 px gap. No inspected page has horizontal overflow.
- Company detail renders eleven shared definition-list fields and two shared
  section headings. Its return has one arrow and Actions has one indicator.
  Arrow Down opens the menu at its first item; Escape closes it and restores
  focus to the same Actions trigger. No action item was executed.
- Phaeno help search for KiB finds the two updated guides. Data provisioning shows
  the October 22 review date and binary-unit/calendar/timestamp/zero/missing-value
  guidance. The deployed matching 62-guide index was freshly published.
- API/database/scanner healthy; health 200, database ping 204, anonymous assembly/
  research routes 401, public Website 200. The bounded API error scan from actual
  activation and browser warning/error scan are empty. Original input-tab URL/
  search state is restored. No saves, downloads or laboratory actions ran.

Temporary host source package and recovery verifier were removed. Encrypted
recovery, operational rollback material and compact receipts remain. Task-owned
local browser output and temporary source/debug helpers are cleaned after review;
the standard app build, running interactive gallery and reviewed PNGs are retained.

## Retained boundaries

`Deploy Portal Green` remains `disabled_manually`. Orphan `39056745064` remains
queued with zero jobs and retains its exact root-only `QUARANTINED` release-path
fence, without a deployment directory. No competing dispatch/rerun/cancellation
occurred. Portal/Website `git.deploymentEnabled` holds remain false. The hosted-test
populated-S3 recovery deferral and disabled backup timer remain.

The signed-in smoke covers representative Phaeno screens, not every Customer/
Partner/Prospect journey, dirty-form path or assistive technology. Full WCAG,
physical/scientific/provider acceptance and commercial activation remain separate.
See the [preserving plan](../plans/PORTAL-UI-PATTERNS-HOSTED-TEST-RELEASE-20261022-PLAN.md).
The later documentation-only receipt commit does not change deployed source.
