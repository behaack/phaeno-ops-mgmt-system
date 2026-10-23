# Portal UI workflow consistency release — October 22, 2026

The six UI priorities are committed, pushed and live at
`https://portal.phaenobiotech.com`: shared titled panels and feedback states, actual
workflow gallery coverage, required drift checks, reflow/cross-browser checks,
and 43 reviewed guide images with 169 callouts across nine guides/four audiences.
This is an update to the existing hosted test environment. No migration or
business write occurred.

## Release identity

| Item | Identity |
| --- | --- |
| API/frontend source | `531d13fa58c22f01bc40824ce5d61be8acf19dbf` |
| Exact Git archive SHA-256 | `b789847dddab4b7d3d2156d39988a866970529bc76e9a433b6ff460c12ddc884` |
| API image | `phaeno-portal-green-api:sha-531d13fa58c2-manual-20261022-4` |
| API image ID | `sha256:1303f1c5047dbabb11859c5ffad1c64d013d05b894c1e39858a80f0c4dfe0acb` |
| API release | `/opt/phaeno.portal-green/releases/531d13fa58c22f01bc40824ce5d61be8acf19dbf-manual-20261022-4` |
| Frontend deployment | `dpl_3HTYkVX5HfKrxvg4JXSNfJKbgzrD` |
| Frontend build | `phaeno-ops-mgmt-system-kk9lpxupl-cadexgenomics.vercel.app` |
| Matching 62-guide corpus/index | `538ebc79bacda685310e80918e20097e6454e50543800c1f22236abd2c8be940` |

The UI implementation and CI follow-up passed the protected PR path. All three
required jobs also passed for this exact merged source before activation:
[UI quality run 39880615224](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/39880615224).
The first merged candidate was blocked twice by Ubuntu dependency download
timeouts before its browser tests ran. The final Firefox/WebKit job uses the
official matching Playwright 1.59.1 Noble image pinned by digest, checks the
package version and aligns only the temporary CI home directory ownership.
All 42 browser cases pass in PR and exact-source main validation. Required check names, coverage,
time limits and strict Windows image comparisons remain unchanged.

The production-environment frontend was staged from the exact merged SHA with
custom-domain assignment disabled, then promoted without rebuilding after API
acceptance. Protected staging root and 15 assets returned 200. Canonical and
previous-pin roots serve exactly the staged asset list; all 15 byte hashes match.
All 43 live guide images match both released Git objects and the reviewed capture
manifest. The skew boundary is `1792716735118`; maximum age remains 43,200 seconds.
Portal and both Website Git deployment holds remain unchanged. Gallery fixtures
and capture provenance remain outside deployed Portal assets.

## Recovery and preservation

Fresh recovery is retained at
`/var/backups/phaeno-portal-deploy/ui-workflow-20261022`, with encrypted copies
collected off-server. Isolated PostgreSQL 18.6 restoration reproduces all 250
table fingerprints. Independent off-server decryption verifies the dump
signature, restore receipt, complete table fingerprints and every one of the
117 archived runtime/document/Local file hashes and modes. Decrypted verification
stays in memory; temporary plaintext packages and passphrase were removed.

| Encrypted artifact | SHA-256 |
| --- | --- |
| `recovery.tar.gz.enc` | `5ace66e0f147db0e2bc10a2640f14c0b11e0b60b817dd88e594977709ce36b83` |
| `recovery.key.enc` | `9f29982eacb6e5cd2e4dcada96169e4cc176cf75a0e8f1857a83e1a5059fec1c` |

Complete Website intake history remains unchanged:

| Table | Rows | Complete-record fingerprint |
| --- | --- | --- |
| `website.web_contacts` | 12 | `5f3ea93049675de27b8ed65e6e1379c7` |
| `website.web_orders` | 6 | `bae6f8340cfa604030cb6d18b6dba630` |

Activation rechecked all data/files before cutover. Final readback after the
signed-in UI/help reads at 01:06 UTC on October 23 preserves all 250 table
fingerprints, 29 migrations through `20261017190934_SplitInternalOrderNotes`,
115 unrelated files and their modes. Only the two expected deployment metadata
files changed. Local files remain empty; zero assemblies are active. Runtime
flags and OCIA image/start identities are unchanged. The protected deployment
retained its lock, exact-source gate and guards with migrations/identity cutover
false. Only the existing DPS tunnel restarted to follow the replacement API
namespace; actual API TLS discovery succeeds on 18883 with Simulated mode retained.

No model, migration, identity, provider setting, S3 object write, business save
or laboratory action changed. Website frontends were not deployed. Hosted-test
populated-S3 recovery deferral and disabled backup timer remain applicable.

Prior API image
`sha256:15350d94b6959d7b088ff34ee5d45f97a9b7d9869b584911bbd64973a059ba33`
and frontend `dpl_5af3Yf6gAF2ostMxprkrNGGLUA3B` remain rollback targets.

## Verification and acceptance limits

Local implementation evidence is recorded in
[the review record](ui-workflow-coverage-20261022.md): 1,578 frontend passes with
three existing feature-flag skips, 244 Chromium browser cases, 42 Firefox/WebKit
cases, 35 source/capture regressions, three release-gate regressions, lint/types,
matching corpus/capture freshness, independent builds/isolation and a clean
backend solution build. Backend tests were not rerun for this display/generated
help release. The final visual inventory has 94 frames in 84 test cases; complete
long Trial pages use contiguous sections at the unchanged 0.15/80-pixel limits.

- Exact-source main CI passes 35 source/capture regressions, three gate tests,
  focused components, lint/types, corpus/capture freshness, both independent
  builds and isolation, all 244 Chromium cases, 42 Firefox/WebKit cases and
  84 Windows visual cases covering 94 references. Image updates are disabled.
- Actual signed-in Edge reload receives the released main bundle. Sequencing
  inputs and assembly jobs both have `oklch(0.95 0.012 245)` header backgrounds,
  1 px dividers and no horizontal overflow. Assembly jobs settle successfully;
  timestamp seconds/PDT, Simulated labels and historical dispositions remain.
- The protocol how-to displays its October 22 review date, three images, nine
  callouts, descriptive alternatives and captions without overflow. The first
  image loads near the initial viewport; the remaining two are lazy-loaded.
  Actual help search for `protocol` returns 13 guides including this refreshed
  guide. Browser errors are zero. The original inputs view was restored.
- API/database/scanner are healthy; public health/database ping return 200/204,
  anonymous assembly/research reads remain 401, bounded API failures are zero,
  and the public Website returns 200.

`Deploy Portal Green` remains `disabled_manually`. Orphan `39056745064` remains
queued with zero jobs and unchanged October 17 update time; its root-only exact
quarantine fence remains intact. Strict required checks retain all three names,
Actions app 15368 and administrator enforcement. The orphan was not dispatched,
rerun or cancelled again. The verified temporary host source package and recovery
helper were removed; encrypted recovery and operational rollback material remain.

Local fictional browser coverage and read-only hosted smoke do not certify every
route/permission, native browser zoom, full assistive-technology use, provider,
physical/scientific, populated-S3 recovery or commercial acceptance. Additional
external guide illustrations cover en-US; other Customer locales retain their
existing prose. Later documentation-only completion commits do not change the
deployed source recorded above.
