# Authenticator instruction layout hosted-test release - October 14, 2026

The Owner requested deployment of the latest push. Portal frontend source
[`43622eae11f6c229acf60a79d6b7fbd54baed104`](https://github.com/behaack/phaeno-ops-mgmt-system/commit/43622eae11f6c229acf60a79d6b7fbd54baed104)
is live at [Portal](https://portal.phaenobiotech.com) under the
[preserving frontend-only plan](../plans/PORTAL-AUTH-CODE-LAYOUT-TEST-RELEASE-20261014-PLAN.md).
The production-named hosting remains the existing hosted test environment.

The existing authenticator instruction now follows the code entry and field
feedback before Continue. It is centered in the code control's grid column,
uses the same width, and wraps naturally. Clerk-owned DOM, authentication,
localization, code entry and error feedback are preserved.

## Exact release and rollback

- Local HEAD and ordinary remote main both resolve to the full source SHA.
- Vercel deployment `dpl_AKJSis2at4cnTNYoovRLyb1sVQnn` is ready production,
  with matching `gitSource.sha`, source/archive metadata, the verified
  Cadexgenomics project/team and root `frontend`. The Git-connected build takes
  23.182 seconds. Custom-domain assignment is disabled during staging.
- The canonical alias stays on `dpl_HZEfxqABvABTUp1kusHQu5RaT7Z1` throughout
  staging, then independently resolves to the new deployment after promotion
  without rebuilding. The previous ready deployment remains the rollback target.
- Committed archive SHA-256 is
  `fe25ac0db051896eaaf4572716778f9913e864f56c706e8507d0440a4e1a59c3`.
  Deployment uses the existing GitHub connection pinned to the full SHA, with
  no local runtime configuration or ignored files uploaded.

This is a frontend-only release. The Portal Green API remains on source
`60b176f0c7cdac308531efe3713d667942381ea5`, previously deployed by protected
run `38499219507`. No API deployment, database write, migration, reset,
identity/provider/storage change or public Website frontend release is performed.
All database records and history, object versions, Local bytes, runtime settings,
retained recovery and the hosted-test S3 recovery deferral remain untouched.
The existing help corpus remains `a08fd5a07767`.

## Actual verification and limits

- The reviewed source passed targeted lint, TypeScript and whitespace checks.
  Representative Clerk markup verified desktop/phone geometry, both themes,
  field-error wrapping and keyboard progression. No automated suite was run.
- Protected staging returns Portal HTTP 200 and proxied API health 200;
  anonymous work attention returns 401. Served CSS contains all nine scoped
  TOTP rules, including control order 1, helper order 2, shared column,
  centered text and full-width helper. The compiled client retains the exact
  instruction and unchanged help corpus.
- The staged browser reaches Vercel protection, so staging browser rendering
  is not claimed. Existing CLI authentication supplies bounded HTTP/source
  checks without changing protection settings. Canonical rendering is checked
  after promotion.
- After promotion, API health is 200, database ping 204, Portal and signed-out
  documentation route return 200, public Website returns 200, and direct/proxied
  anonymous work attention returns 401. Canonical CSS/client hashes exactly
  match the staged build. CSS SHA-256 is
  `45a35800fd9f1b972a2deb78ee9de17aeff89dfded8296e760c3301890410724`.
- The live browser renders one visible Sign in heading, its existing description,
  email entry and Continue. The layout stylesheet is loaded with nine TOTP
  rules. No Portal browser error is captured. A deployment-scoped 30-minute
  frontend error scan, bounded to 25 records, returns zero entries.

The live authenticator challenge and provider recovery journey are untested;
served CSS and the signed-out page do not replace that acceptance. No MFA
reset, session revocation, user creation or provider-setting change is performed.

Deploy Portal Green remains `disabled_manually`; both Portal and Website
configurations retain `git.deploymentEnabled=false`. Commercial activation,
live S3 recovery and physical/scientific acceptance remain separate.
Local evidence is retained under `output/auth-layout-release-20261014/`;
the task-owned archive is removed after its hash and exact Git source are recorded.
