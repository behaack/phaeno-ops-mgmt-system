# Portal UI adoption and illustrated-help release — October 22, 2026

The five UI consistency priorities are committed, pushed and live at
`https://portal.phaenobiotech.com`: shared shaded panel/table headers, domain
status and date displays, feedback/dialog adoption, actual-feature gallery
coverage, and 32 refreshed guide screenshots with 137 callouts. Gallery, fixtures
and capture provenance remain outside the deployed Portal. This is an update to
the existing hosted test environment; no migration or business write occurred.

## Release identity

| Item | Identity |
| --- | --- |
| Deployed API/frontend source | `9d869522352dd77e4be009238259398696ff8d41` |
| Exact Git archive SHA-256 | `555c5598f0d317fb4122b7f1ca1caa8c91430194a950b17610eb02f83d2b9b8d` |
| API image | `phaeno-portal-green-api:sha-9d869522352d-manual-20261022-3` |
| API image ID | `sha256:15350d94b6959d7b088ff34ee5d45f97a9b7d9869b584911bbd64973a059ba33` |
| API release | `/opt/phaeno.portal-green/releases/9d869522352dd77e4be009238259398696ff8d41-manual-20261022-3` |
| Frontend deployment | `dpl_5af3Yf6gAF2ostMxprkrNGGLUA3B` |
| Frontend build | `phaeno-ops-mgmt-system-q5lfggluc-cadexgenomics.vercel.app` |
| Matching 62-guide corpus/index | `9628fc1e68c15d0b4950a62a702d976fc36a27445c90a5cbfe2e38953b9d7439` |

Vercel project/team/root were verified before staging. The production-environment
build used the exact pushed SHA with custom-domain assignment disabled. Protected
root and all 15 referenced assets returned 200. After API acceptance, the same
READY build was promoted without rebuilding. Canonical and previous-pin roots
serve exactly the staged asset list, and all 15 asset hashes match. Every one of
the 32 live guide images also matches the released Git object and reviewed
capture manifest. The skew boundary is `1792706635970`; maximum age remains
43,200 seconds. Portal and both Website Git deployment holds remain unchanged.

The protected host script retained its lock, exact-source verification and
guards, with migrations and identity cutover false. Only the existing DPS tunnel
restarted to follow the replacement API namespace. Actual API discovery succeeds
over TLS on 18883; Simulated recipe, worker, storage/scanning and runtime settings
remain unchanged. Prior API image
`sha256:e5554bd93004290ddffd88d370c06d896d0cc191804c117926d71dc49de12aa0`
and frontend `dpl_CJsvwcBncLwbV1U4St51D3dEA7yy` remain rollback targets.

## Recovery and preservation

Fresh recovery is retained at
`/var/backups/phaeno-portal-deploy/ui-adoption-20261022`, with encrypted copies
collected off-server. Isolated PostgreSQL 18.6 restoration reproduces all 250
table fingerprints. Independent off-server decryption verifies the dump signature,
restore receipt, complete table fingerprints and all 117 archived runtime,
document and Local file hashes/modes. Decrypted verification stays in memory;
temporary plaintext packages/passphrase were removed. Encrypted artifact hashes:

| Artifact | SHA-256 |
| --- | --- |
| `recovery.tar.gz.enc` | `f2f3ae2016150188cb9431f0761360ce05b1fdcc4f2504f5bb7edb6ecbbfeeb0` |
| `recovery.key.enc` | `f3b0a905832456ee62595a52cc40993825ae4cfe1c2ea3c2afbba630d04dff9b` |

Final readback at 22:14 UTC after signed-in UI/help reads preserves every one of
the 250 table fingerprints, all 29 migrations through
`20261017190934_SplitInternalOrderNotes`, and 115 unchanged files with modes.
Only the two expected deployment metadata files changed. Managed Local files
remain empty. Complete Website intake history is preserved:

| Table | Rows | Complete-record fingerprint |
| --- | --- | --- |
| `website.web_contacts` | 12 | `5f3ea93049675de27b8ed65e6e1379c7` |
| `website.web_orders` | 6 | `bae6f8340cfa604030cb6d18b6dba630` |

No record, role, account setting or scientific outcome was changed. Zero
assemblies are active. OCIA image/start identities are unchanged; Website
frontends were not deployed. No S3 object migration/write was performed. Existing
hosted-test populated-S3 recovery deferral and disabled backup timer remain.

## Verification

- Exact-source [UI quality run 39862006889](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/39862006889)
  passes both jobs: 31 source/capture regressions, focused components, lint,
  758-source guard with two unchanged scanner exceptions, TypeScript, matching
  help, screenshot freshness, Portal/gallery builds and isolation, 128 browser
  cases and all 48 Windows image comparisons. Image updates are disabled; the
  reviewed references and 0.15 color/80-pixel tolerance are unchanged.
- Local implementation evidence remains 1,576 frontend passes with three existing
  skips, targeted follow-ups and 128 gallery/48 image checks. Release backend
  solution build has zero warnings/errors. Backend tests were not rerun for this
  display/generated-help release.
- Actual signed-in Edge reload receives the updated build. Sequencing inputs and
  assembly jobs both have `oklch(0.95 0.012 245)` header backgrounds and 1 px
  dividers, with no horizontal overflow. Assembly timestamps show seconds/PDT;
  simulated completion stays explicitly labelled.
- Phaeno onboarding help displays its October 22 review date, 15 images and 73
  numbered callouts, descriptive alternatives and captions without overflow. The
  first two images load in the initial viewport; remaining images use lazy
  loading. Independent HTTP checks verify all 32 refreshed images. Actual help
  search for `onboard` returns four guides including the refreshed how-to.
- API/database/scanner are healthy; public health is 200 and database ping 204.
  Anonymous assembly/research reads remain 401. Bounded API failures/5xx and
  browser errors are zero. The public Website remains HTTP 200.

The workflow remains `disabled_manually`. Orphan `39056745064` still has zero
jobs and its October 17 queued state; its root-only exact-path quarantine fence
remains intact. It was not dispatched, rerun or cancelled again. The verified
temporary host source package and recovery helper were removed; encrypted
recovery and operational rollback material remain.

## Acceptance limits

Actual hosted checks are read-only. CI phone/theme and gallery fixtures are
representative engineering evidence, not every permission-dependent workflow or
complete accessibility certification. This release does not claim new provider,
physical/scientific, populated-S3 recovery or commercial acceptance. Later
documentation-only completion commits do not change the deployed source above.
