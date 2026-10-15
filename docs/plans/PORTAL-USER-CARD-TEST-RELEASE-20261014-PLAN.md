# Phaeno user card hosted-test release - October 14, 2026

The Owner requested deployment of the latest commit/push after the User
management card update. Freeze source `0b0903cff9d714575e803511906b675f6e1dbd25`
on main after ordinary remote equality. Release the Portal frontend only.
The change keeps account status/actions in the trailing first-row grid column,
places email/roles below across the card, and labels multiple-action triggers
Actions. Sole actions remain directly labeled. Invitation triggers also say Actions.

## Target and preservation

Verify Cadexgenomics project `phaeno-ops-mgmt-system`, ID
`prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R`, team
`team_DbkKTfQmQz9atu435ZBugMDD`, root `frontend`, and canonical
`https://portal.phaenobiotech.com`. This is the existing hosted test environment.
Retain current ready frontend `dpl_AKJSis2at4cnTNYoovRLyb1sVQnn` for rollback.

The [preceding frontend-only release](PORTAL-AUTH-CODE-LAYOUT-TEST-RELEASE-20261014-PLAN.md)
and [completed hosted replacement plan](HOSTED-CLEAN-DATABASE-20260929-PLAN.md)
remain applicable. The API/help corpus, authentication, permissions, model and
migrations are unchanged. All accounts, memberships, Website intake/history,
Commercial/Lab/scientific/Finance records, audit, identity mappings, S3
objects/versions, Local bytes, runtime settings and retained recovery remain
untouched. No database mutation, API deployment, backup-timer activation,
identity/provider/storage cutover or public Website frontend release occurs.
The hosted-test S3 recovery deferral and commercial activation gate remain.

## Build, cutover and rollback

Hash the exact committed archive. Stage a production frontend from the existing
GitHub connection pinned to the full source SHA with automatic custom-domain
assignment disabled. Require ready build, matching source/archive metadata,
served card layout/Actions source, unchanged corpus, Portal HTTP 200, proxied API
health 200 and anonymous work attention 401. Browser protection is preserved;
use existing CLI authentication for staged HTTP/source checks.

Promote the verified production build without rebuilding. Independently verify
the canonical alias, exact served assets, signed-out rendering, API health and
database ping. If these fail, restore the prior frontend without API/database
cutover. Retain both Vercel Git holds and disabled Deploy Portal Green throughout.

## Verification and limits

Targeted lint, TypeScript and whitespace checks pass. Manual preview of the
actual component with fictional cached users passes 320px light, 390px dark and
1280px dark: account badges/actions stay in the first row, names wrap, details
span the card, and there is no horizontal overflow. The shared menu has one
indicator, opens by keyboard, closes on Escape and returns focus; direct Edit
and Reactivate remain. No account or role write is performed and no automated
suite is run. Existing guides describe commands without the old ellipsis or
layout placement and need no corpus change for this presentation update.

Production-named release proof is separate from authenticated User management
acceptance. Do not create accounts, mutate roles, deactivate/reactivate users,
reset MFA or change provider settings for acceptance. Record actual deployment,
asset/health/error checks and retained holds in a completion receipt. Keep local
evidence under `output/user-card-release-20261014/`; clean up only task-owned
preview files and the archived-source intermediate.

## Completed release

Source `0b0903cff9d714575e803511906b675f6e1dbd25` is live as ready production
deployment `dpl_9tuoG5YUr8ngaN93dPepB15UYmaj`. The canonical alias and exact
entry/stylesheet/User management asset hashes match the staged build. Health,
database ping, signed-out routes and anonymous authorization pass; the bounded
frontend error scan is empty. The API/database and deployment holds remain
untouched. Authenticated card/account acceptance remains separate. See the
[completion receipt](../operations/portal-user-card-test-release-20261014.md).

## Existing-browser correction - October 14, 2026

The Owner's authenticated Edge tab continues loading the preceding entry and
card assets after a direct reload. The existing Nitro Vercel preset emits an
HttpOnly `__vdpl` cookie for document requests when platform skew protection is
enabled. A request pinned to `dpl_AKJSis2at4cnTNYoovRLyb1sVQnn` reproduces the
old entry; a request pinned to the current deployment returns the new entry.
Clean HTTP/source checks therefore did not establish release visibility for
existing browsers. No active rolling release exists.

Complete this already authorized frontend release by setting the verified
project's `skewProtectionBoundaryAt` to the current ready deployment's exact
creation time, `1791994479939`. This retires routing pins to older builds while
preserving version protection for the current build and its 43200-second age.
No security/authentication, deployment-protection, runtime secret, database,
API, dependency, automatic-deployment or cookie-clearing change is required.
Previous boundary is absent (equivalent to zero); retain zero as its restoration
value if this routing correction must be reversed alongside frontend rollback.

Read back the boundary, require the previous deployment pin to resolve to the
current entry, and reload the actual signed-in User management tab. Verify the
visible Actions label, first-row card controls and loaded current entry. Do not
exercise account writes or change the user's login/session. Record actual
authenticated rendering evidence separately from account-action acceptance.

Future preserving Portal releases must include an existing-browser routing
check. When retiring older pins is required, advance this boundary only after
the matching source/API compatibility and preservation gates pass, then verify
both clean and previous-pin document requests plus the available user browser.

Correction completed: boundary readback matches, previous-pin HTTP resolves to
the current entry, and the actual signed-in Edge tab visibly renders Actions
and first-row right-aligned card controls without overflow. The current-user
Edit action remains direct. No account write, session reset or API deployment
occurred. The release receipt retains the screenshot and exact routing evidence.
