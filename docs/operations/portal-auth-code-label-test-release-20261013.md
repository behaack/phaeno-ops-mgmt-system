# Sign-in code source hosted-test release - October 13, 2026

Matched API/help and Portal frontend source
[`60b176f0`](https://github.com/behaack/phaeno-ops-mgmt-system/commit/60b176f0c7cdac308531efe3713d667942381ea5)
is live at [Portal](https://portal.phaenobiotech.com) under the
[preserving plan](../plans/PORTAL-AUTH-CODE-LABEL-TEST-RELEASE-20261013-PLAN.md).
The Owner requested submit, push and deploy. The production-named hosting remains
the existing hosted test environment; this is not commercial activation.

The authenticator verification field is labeled **Authenticator app code**, with
the instruction **Enter the current 6-digit code from the authenticator app you
linked to your account.** Clerk's later-step source descriptions are visible;
the initial Phaeno sign-in description remains singular. Customer, Prospect,
Partner and Phaeno guides explain the source. MFA requirements, verification,
provider configuration, recovery policy and access rules remain unchanged.

## Exact release and preservation

[Deploy Portal Green #105](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/38499219507)
succeeds on the full source SHA. The deployed API image is
`sha-60b176f0c7cd-run-38499219507-1`. Vercel ready production deployment
`dpl_HZEfxqABvABTUp1kusHQu5RaT7Z1` is promoted without rebuilding after API
source/image, preservation and health checks. The canonical Portal alias
independently resolves to that exact deployment.

The frozen committed archive SHA-256 is
`74c353eaf2f35aaf858b4fc4c0572c78586492ec467d7fccb237559ea1e85d25`.
Final staging uses the existing Vercel GitHub connection pinned to the full
application SHA after two local-upload attempts were stopped before creating a
deployment. Vercel confirms `gitSource.sha` and source/archive metadata, with
`autoAssignCustomDomains=false`; the prior canonical frontend stays on
`dpl_57PDBLQLtv4ofyo3cGet91PWNoRs` until promotion. The remote TanStack Start
client/SSR/function build becomes ready in approximately 33 seconds.

No persisted model or migration changes occur. Fresh EF comparison reports no
model changes; the protected run uses `apply_migrations=false`. Storage,
scanning and bootstrap choices are Preserve. Clerk identity cutover and
hosted-test S3 reconfiguration are false. No reset, transfer, local fixture
import, notification replay, subscription reactivation or request reopening
occurs. Accounts, memberships, Commercial/Lab/scientific/Finance records, audit,
identity mappings, current S3 objects/versions, Local recovery, ClamAV and
runtime/worker settings are preserved. Actual Website counts remain `12,6`.
All contact/request fields and completed/unsubscribed history stay in place.

[Retained recovery inspection](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/38497862677)
succeeds before release: the closed pre-reset database exists and both encrypted
recovery files match the previously verified hashes. This is an availability/
integrity check of retained restore-verified recovery, not a fresh restore or
coordinated current S3 backup. The Owner's hosted-test S3 recovery deferral remains.

## Actual verification and limits

- Local TypeScript, scoped frontend lint, Customer message references, help
  generation/check and whitespace checks pass. Fresh API Release compilation
  passes with zero warnings/errors; EF model comparison reports no change.
  Automated test suites were not requested and were not run.
- Protected CI validates the matching packaged help: 56 guides, corpus version
  `a08fd5a07767`. Vercel verifies the intended Cadexgenomics project/team,
  production target, full Git source and retained alias before cutover.
- Staged Portal rendering and proxied API health return 200. Anonymous work
  attention returns 401. Served assets contain the new label and full instruction.
- After promotion, API health is 200, database ping is 204, Portal and signed-out
  help routes render 200, and the unchanged public Website renders 200. Direct
  and proxied anonymous work attention return 401. Canonical root/entry asset
  hashes exactly match the verified staged assets.
- Hosted scanner capacity, clean, EICAR, encrypted, oversized and health checks
  pass. The protected source/image and Website preservation markers match.
- A bounded frontend error query (30 minutes, maximum 25 entries) returns zero
  entries. The live browser renders one Sign in heading, its existing description,
  email label and Continue action, with no captured browser errors.

The available browser is signed out. The actual MFA challenge, its responsive/
keyboard behavior and provider recovery journey were not exercised; asset/source
proof and initial sign-in rendering do not substitute for those checks. No MFA
reset, session revocation, user creation or provider-setting change was performed
to manufacture acceptance evidence. Authenticated help/search and full user
acceptance remain separate from the signed-out route and packaged-corpus checks.

Deploy Portal Green is verified `disabled_manually` again. The Local-only backup
workflow remains disabled, and both Portal/Website configurations retain
`git.deploymentEnabled=false`.
The public Website frontend is not released. Commercial activation, live S3
recovery and physical/scientific acceptance gates remain separate.

Private/local source metadata, protected release evidence and HTTP/asset checks
are retained under `output/auth-code-release-20261013/`. Task-owned source
extraction/archive and cancelled staging intermediates are removed after
verification. Existing running application outputs and earlier recovery copies
are retained.
