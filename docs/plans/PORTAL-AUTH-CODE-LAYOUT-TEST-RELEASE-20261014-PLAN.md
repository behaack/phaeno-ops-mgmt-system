# Authenticator instruction layout hosted-test release - October 14, 2026

The Owner requested deployment of the latest push, source
`43622eae11f6c229acf60a79d6b7fbd54baed104` on main. The reviewed change places
the existing localized authenticator instruction beneath the code entry,
centered and constrained to the same width. Release the Portal frontend only.
The API, help corpus, persisted model, migrations and provider contracts are
unchanged from the preceding deployed source.

## Target and preservation

Use Cadexgenomics project `phaeno-ops-mgmt-system`, ID
`prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R`, team
`team_DbkKTfQmQz9atu435ZBugMDD`, root `frontend`, and canonical Portal
`https://portal.phaenobiotech.com`. Verify the live target and prior deployment
before staging. The production-named hosting remains the existing test
environment; commercial activation is separate.

The [preceding preserving plan](PORTAL-AUTH-CODE-LABEL-TEST-RELEASE-20261013-PLAN.md)
and [completed hosted replacement plan](HOSTED-CLEAN-DATABASE-20260929-PLAN.md)
remain applicable. The existing Portal Green database, all accounts and
memberships, Website contacts/requests and their history, Commercial/Lab/
scientific/Finance records, audit, identity mappings, S3 objects/versions,
Local bytes, ClamAV and runtime configuration remain untouched. No API
deployment, database mutation, migration, reset, backup-timer activation,
identity/provider/storage cutover or public Website frontend release occurs.
Retained recovery and the Owner's hosted-test S3 recovery deferral are unchanged.

## Exact source, cutover and rollback

Require local HEAD and ordinary remote main equality. Freeze the full SHA and
hash its committed archive. Stage a production frontend from the existing
GitHub connection pinned to that SHA, with automatic custom-domain assignment
disabled. Require ready client/SSR/function build, exact Git source, unchanged
help corpus, served layout stylesheet, initial sign-in rendering, proxied API
health and anonymous protected-route rejection before promotion.

Promote that verified production deployment without rebuilding. Independently
verify the canonical alias and served stylesheet/assets match the staged build.
If these checks fail, restore the prior ready frontend; the existing API and
database require no cutover or restore. Retain the prior build and recovery.
Both Vercel Git deployment holds and the disabled Deploy Portal Green workflow
remain in place throughout.

## Verification and evidence limits

The same reviewed layout passed targeted lint, TypeScript and whitespace checks.
Representative Clerk markup confirmed desktop/phone widths, both themes,
field-error placement and keyboard progression. No automated suite was requested
or run. The provider-owned DOM and authentication are unchanged.

After release check Portal/help rendering, API health 200, database ping 204,
anonymous protected-route rejection, unchanged public Website rendering and
bounded frontend errors. A signed-out browser and served-source inspection do
not establish live TOTP or recovery acceptance. Do not reset MFA, revoke sessions,
create users or change provider settings to manufacture a challenge session.
Record actual source/deployment, checks, rollback target and retained holds in
a completion receipt. Source artifacts and evidence stay local under
`output/auth-layout-release-20261014/`; remove only task-owned intermediates.

## Completed release

Frontend source `43622eae11f6c229acf60a79d6b7fbd54baed104` is live as ready
production deployment `dpl_AKJSis2at4cnTNYoovRLyb1sVQnn`, promoted without
rebuilding after the staged HTTP/source checks. The canonical alias and exact
CSS/client asset hashes match. The staged browser is Vercel-protected; actual
canonical sign-in rendering is verified after promotion. API health, database
ping, Portal/documentation/public Website rendering and anonymous authorization
checks pass, and the bounded frontend error scan is empty. The API/database
are untouched and all deployment holds remain. Live MFA acceptance is separate.
See the [completion receipt](../operations/portal-auth-code-layout-test-release-20261014.md).
