# Customer onboarding how-to: hosted-test release — October 15, 2026

The requested [How to onboard a Customer](https://portal.phaenobiotech.com/docs/phaeno/how-to-onboard-customer)
is live in Phaeno documentation under CRM and the How-to guides cards. Its 13
workflow steps include 15 screenshots and 73 numbered callouts with matching
written explanations. It covers Company/Department preparation, online-access
request and approval, administrator invitation and acceptance, separate service
approval, readiness, billing/tax and Finance approval, and both request outcomes.

Screenshots render actual application components with explicitly fictional
demonstration records. No invitation, email, acceptance, access, billing or
operational record was created or changed to produce them. These illustrations
are instructions, not evidence of live provider or operational acceptance.

The Owner explicitly authorized GitHub commit/push and UI deployment. The
[preserving plan](../plans/CUSTOMER-ONBOARDING-HOWTO-TEST-RELEASE-20261015-PLAN.md)
includes the matching generated API documentation index; no business logic,
authentication, dependency, model or migration changes are included.

## Exact release

- Source: `a88cc73853fd6f9dd446ee6b082422e1cecf13bb`, pushed normally to main
  and independently matched against GitHub before deployment.
- Committed source archive SHA-256:
  `e18b5d8c47ceb1542b4d457b75c7e552e3fe1a15bb5ad5cde548add66f433965`.
- [API run 38829715412](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/38829715412)
  passed, with migrations disabled and provider/bootstrap settings preserved.
  Image `phaeno-portal-green-api:sha-a88cc73853fd-run-38829715412-1`, its revision
  label and current release directory identify the same full source SHA.
- Frontend: `dpl_GVgngTrETWtYjxV8HXcjKnz9uzDT`, built from that exact SHA in
  Cadexgenomics project `prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R`, root `frontend`.
  The production-target build was staged without custom-domain assignment,
  checked READY and promoted without rebuilding. The canonical Portal alias
  independently resolves to this deployment.
- Skew boundary: `1792105798062` → `1792110534065`, the new build's creation
  time. Maximum age remains `43200`. Clean and previous-pin requests serve the
  same 16 staged assets, including `/assets/index-DsJnVraZ.js`; all return 200.
- Matching packaged API corpus, current Lucene generation and UI version:
  **60 guides**, hash
  `4f0652813a53325d7aeed83f16416a040dcf811a02d210d9b4d090fd5f7f3a51`.

The prior API image `sha-8c4ec7d73560-run-38821899163-1` and frontend
`dpl_E57hvRrJB1WeTWmVHGBSDZopLeZd` remain the compatible rollback pair. No
schema downgrade or database restore that discards later writes is authorized.

## Preservation and recovery

Fresh preflight and postflight full-row fingerprints match across **all 245
database tables**, including EF migration history. The latest migration remains
`20261015215237_AddPSeqKitLotTraceability`. All 12 `website.web_contacts` and six
`website.web_orders` retain their complete contents and history. Their respective
fingerprints remain `ef77bd28975f174e0fefaf39931bd25f` and
`95aa679ef04abf2b672f77ee6b9f6222`. No reset, conversion or deletion occurs.

A fresh full database backup was restored successfully into an isolated
PostgreSQL 18.6 container without live mounts; restore verification and cleanup
both report PASS. Runtime and retained Local archives were compared against
their sources. Encrypted combined recovery passed decryption/checksum checks,
was copied off-server and independently verified in the existing owner/SYSTEM-only
recovery directory. Server evidence is retained privately under
`/var/backups/phaeno-portal-deploy/onboarding-howto-20261015`; local release,
browser and recovery evidence remains outside Git in the ignored task directories.

| Encrypted recovery artifact | SHA-256 |
| --- | --- |
| `recovery.tar.gz.enc` | `db0a3c7ba60310744b5fce283b22eaa27722d283f172072b1228cb0d56ae2005` |
| `recovery.key.enc` | `2940fa04d90e517012b0e9e2992113a2ce66baf7dd8ed28801b3753d915f4dc2` |

Runtime/provider/identity/DPS configuration hashes remain unchanged; only image
metadata and the release manifest advance. Managed/configuration file references
and retained Local files remain zero. Existing S3 settings/object versions and
the hosted-test populated-S3 recovery deferral are preserved; no backup timer or
storage/identity cutover is activated.

## Verification and limits

- Guide links/assets, corpus generation/check, TypeScript, touched-source lint
  and client/server production build pass. Existing registry/navigation regression
  expectations and living test plans are updated. **Automated suites were not
  run for this documentation addition**, following the repository's request-only
  test rule. Earlier PSeq test evidence belongs to its separate release receipt.
- All original captures were visually checked for fictional-only content.
  Local full-help desktop, 390px dark and 320px reflow checks pass. Numbered
  annotations stay within bounds and do not overlap down to a 256px image width;
  the original System theme and viewport are restored.
- Actual authenticated hosted Phaeno browser review confirms the fourth How-to
  card, CRM-parented guide and all 13 steps, 15 loaded images and 73 markers.
  Search for “onboard a Customer” returns this guide first and opens it correctly.
  There is no horizontal overflow at the browser's existing viewport and no
  captured console errors. A screenshot of the published annotated guide is saved.
- Every hosted JPEG matches its committed source bytes. API health returns 200,
  database ping 204, and anonymous documentation search 401. The bounded API
  failure and frontend runtime-error scans are empty. Deployment scanner smoke
  and Website-intake preservation checks pass.
- Browser acceptance covers documentation/search. Actual customer invitations,
  identity/MFA/provider delivery, commercial/billing writes and request processing
  were not exercised on hosted records; scientific/physical and final business
  acceptance remain separate.

`Deploy Portal Green` was disabled immediately after dispatch and is verified
`disabled_manually`. Portal and Website Vercel Git `deploymentEnabled` settings
remain false. The public Website frontend, OCIA, DNS, identity/provider settings,
retention switches and commercial activation remain unchanged. Temporary owned
preview servers and their task-only files are removed after verification.
