# PSeq kit lots and remaining UI: hosted-test release — October 15, 2026

The requested release is live at [Portal](https://portal.phaenobiotech.com).
Partners can record a shipped kit's lot independently before assembly, then reuse
it when submitting data with the actual kit-use date. Recall/expiry assessments
are rechecked and retained with submitted inputs and the processing attempt.
The final UI includes the remaining illustrated Phaeno guides/navigation,
protocol-card summary and pending user-card release documentation.

The production-named hosting remains the existing hosted test environment.
The [preserving plan](../plans/PSEQ-KIT-LOT-HOSTED-TEST-RELEASE-20261015-PLAN.md)
records the original scope and the Owner's later remaining-changes expansion.

## Exact deployed source

- Lot implementation: `5b6e10a4c98c88891638481c9c75d0c94097d191`, pushed normally
  to main. [API run 38821018032](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/38821018032)
  passed with the additive migration enabled.
- Final remaining-work source: `8c4ec7d73560b3062bf87b45d7d757ffa86e223b`, pushed
  normally and independently matched against remote main before deployment.
  [API run 38821899163](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/38821899163)
  passed with migrations disabled. Its only backend change is the generated help
  corpus, keeping search compatible with the final UI.
- Current API image:
  `phaeno-portal-green-api:sha-8c4ec7d73560-run-38821899163-1`. Its image revision
  and versioned release directory match the final source.
- Current UI: `dpl_E57hvRrJB1WeTWmVHGBSDZopLeZd`, built from that full SHA in
  verified Cadexgenomics project `prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R`, root
  `frontend`. The production-target build was staged without domain assignment,
  checked READY and promoted without rebuilding. The canonical alias independently
  resolves to this deployment.
- Final committed source archive SHA-256:
  `853157e6c6e8f7ddaf3e6d353f2528bd6bcd8b81d06c7d8a6210f714a8f4358a`.
  Lot-only source archive:
  `64b67a3487b703e02f1ce1759c2a5df1145995b1b2416c49d54a231ccab6d0c7`.

The earlier lot-only ready UI `dpl_F9zgAQceyNo92kkxwRw5t5xmJZen` was retained
without promotion. Previous canonical UI `dpl_4vQvdkHuFwKzQsyjhdZPFhssEewL` and
both prior API images remain available. Recovery must use a compatible API/UI
pair; no schema downgrade or destructive database restore is authorized.

## Data and recovery evidence

The target remains Portal Green's PostgreSQL 18.6 database `phaeno_portal_green`
and existing volume. Hosted preflight found no shipment allocations, purchased
kit units or submitted kit-input revisions requiring conversion. Migration
`20261015215237_AddPSeqKitLotTraceability` applied with its refusal guard intact.
Both new lot tables are present and empty; the shipped-kit lot constraint is
validated. No historical kit facts, lots or use dates were fabricated.

After both deployments, all **242 baseline application tables** retain identical
row counts and full-row fingerprints. Only EF migration history changes, alongside
the two new empty tables. All 12 `website.web_contacts` and six
`website.web_orders` retain their full contents and history. The deployment's
own intake fingerprint checks also pass. No reset, conversion or deletion occurs.

The first protected run paused only the Portal API, took a fresh custom-format
database backup and restored it successfully in an isolated PostgreSQL container
without live mounts. Migration/row verification and rehearsal cleanup report
PASS. The encrypted database package and verified runtime/Local recovery package
were collected off-server, with matching SHA-256 checksums and owner/SYSTEM-only
local access. Private evidence is retained outside Git under the task's ignored
release directory; server evidence is under
`/var/backups/phaeno-portal-deploy/pseq-kit-lots-20261015`.

Encrypted recovery identities:

| Artifact | SHA-256 |
| --- | --- |
| `pre-migration-20261015T230602Z-5b6e10a4c98c.dump.enc` | `daf818be41d80ce4f29851de18a5cdf040c9db7df6fe8820c95d171bbc054547` |
| Matching `.key.enc` | `e99edf4f065db2df054f0e89073762808c5a6b8d5cdf211faad15f12aabece8c` |
| `runtime-local.tar.gz.enc` | `8c9317afbf80826666d2c000fc5200e5fc141cd24e791802763e6ed3d32cce3d` |
| `runtime-local.key.enc` | `e6487003f912ea8fc0f8a23b30da333951a0f42a2c417f33884a9d63b144789c` |

Provider, database, identity, tunnel and retained configuration hashes are
unchanged. Only compose image metadata and the deployment manifest advance.
Managed/configuration file references and retained Local files remain empty.
Existing S3 settings/versions and the hosted-test populated-S3 recovery deferral
are preserved; this is not S3 recovery qualification or backup-timer activation.

## Verification and limits

- The lot checkpoint has 25 passing backend regressions, 25 component cases and
  four connected desktop/mobile lot-to-assembly scenarios, plus the separate
  intercepted-API Partner preparation regression. See the
  [verification report](../testing/runs/2026-10-15-pseq-kit-lots-verification.md).
- The remaining-work checkpoint passes eight documentation/protocol component
  cases and all 12 desktop/mobile documentation browser cases. Type checking,
  touched-source lint, generated-help consistency and the final client/server
  production build pass. Both hosted API builds pass.
- The packaged API corpus and current Lucene generation both identify 59 guides,
  corpus `50b53bdc8aa1e909c2102835bcfd05aa4fac86287c098506493543d0acad0b14`.
  Index publication is confirmed in the API log. No version guard is bypassed.
- Canonical clean and previous-pin requests both serve all 16 matching staged
  asset references, including `/assets/index-BfQ5jW6G.js`. All referenced assets
  return 200; the new guide illustration matches its committed bytes.
- The skew boundary advances from `1792072282074` to the final deployment's
  creation time `1792105798062`, retaining maximum age `43200`. Existing browser
  pins no longer keep the prior UI active.
- Public API health returns 200; database ping returns 204; anonymous lot catalog
  and Partner lot submission return 401. Clean/EICAR/encrypted/oversize/scanner
  health checks pass. Bounded final API failure and UI runtime-error scans are empty.
- The available hosted browser is signed out. Reload loads the final entry and
  the sign-in screen without captured console errors. Authenticated hosted guide
  search and Partner mutations are not claimed. Connected local acceptance uses
  real controllers/domain/EF/PostgreSQL with synthetic identities/session,
  scanner and byte storage. Physical kits, real scientific processing/output
  qualification, live provider/Clerk acceptance and business sign-off remain separate.

Both manual workflow dispatches restored `Deploy Portal Green` to
`disabled_manually` immediately afterward. Portal and Website Vercel Git
`deploymentEnabled` settings remain false. Runtime providers, identity, retention switches, public Website
frontend, DNS, OCIA and commercial activation are unchanged. No hosted operational
fixtures were created for this release.
