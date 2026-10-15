# Phaeno user card hosted-test release - October 14, 2026

The Owner requested deployment of the latest commit/push. Portal frontend source
[`0b0903cff9d714575e803511906b675f6e1dbd25`](https://github.com/behaack/phaeno-ops-mgmt-system/commit/0b0903cff9d714575e803511906b675f6e1dbd25)
is live at [User management](https://portal.phaenobiotech.com/phaeno-users) under
the [preserving plan](../plans/PORTAL-USER-CARD-TEST-RELEASE-20261014-PLAN.md).
The production-named hosting remains the existing hosted test environment.

Phaeno account cards reserve the top-right first-row column for status and
commands at every viewport width. Names wrap in the leading column; email and
roles use the full width below. Multiple-action triggers say Actions with the
shared single chevron. Sole Edit and Reactivate commands remain directly labeled.
Pending-invitation triggers also say Actions and retain their distinct delivery
layout. Permissions, self-deactivation protection, confirmations and writes are
unchanged.

## Exact release and preservation

- Local HEAD and ordinary remote main both resolve to the full source SHA.
- Ready production deployment `dpl_9tuoG5YUr8ngaN93dPepB15UYmaj` has matching
  Git source/archive metadata, verified Cadexgenomics project/team and root
  `frontend`. Build duration is 35.025 seconds. Custom-domain assignment is
  disabled during staging.
- Promotion uses that build without rebuilding. The canonical Portal alias
  independently resolves to it afterward. Prior ready frontend
  `dpl_AKJSis2at4cnTNYoovRLyb1sVQnn` remains the rollback target.
- Committed archive SHA-256 is
  `84372f1d906e09426ca03a1d727e27a0f19974fbb9ab6cab3df91d2dbc5ed0fb`.
  Staging uses the existing GitHub connection pinned to the full SHA; no ignored
  credentials, local data or runtime configuration are uploaded.

This frontend-only release leaves the API at source
`60b176f0c7cdac308531efe3713d667942381ea5` from run `38499219507`. The help
corpus remains `a08fd5a07767`. No API deployment, database write, migration,
reset, identity/provider/storage change or public Website frontend release
occurs. All records/history, object versions, Local bytes, runtime settings,
retained recovery and the hosted-test S3 recovery deferral remain untouched.

## Actual verification and limits

- Targeted lint, TypeScript and whitespace checks pass. A manual preview of the
  actual component with fictional cached accounts confirms 320px light, 390px
  dark and 1280px dark layouts, including long names/roles and no horizontal
  overflow. Badges/buttons precede details and align with the card's right edge.
- The actual shared Actions menu has one chevron, opens with Arrow Down,
  exposes Edit/Deactivate, closes with Escape and returns focus after its close
  transition. Direct Edit/Reactivate remain. No account mutation or automated
  suite is performed; task-owned preview/server/cache files are removed.
- Protected staging returns Portal 200, proxied API health 200 and anonymous
  work attention 401. Its User management asset contains the new first-row
  grid, non-wrapping control group, full-width details and two Actions labels.
- After promotion, API health is 200, database ping 204, Portal/User management/
  signed-out documentation/public Website routes return 200, and direct/proxied
  anonymous work attention returns 401. Live entry, stylesheet and User
  management asset hashes exactly match staging. Card asset SHA-256 is
  `1a706f70aadf5b39acb6bc2c76ceccefdff7bd99226397e5d85d039e90463d33`.
- The deployment-scoped 30-minute error scan, bounded to 25 records, returns
  zero entries. Canonical browser rendering is checked while signed out.

At initial release, hosted authenticated User management rendering was not
exercised. The correction below now verifies the actual signed-in page.
Account-action acceptance remains separate. No user creation, role write,
deactivation, reactivation, MFA reset or identity-provider change is performed.

Deploy Portal Green remains `disabled_manually`; both Vercel Git configurations
retain `git.deploymentEnabled=false`. Commercial activation, current S3
recovery and physical/scientific acceptance remain separate. Local evidence
is retained under `output/user-card-release-20261014/`; the archive is removed
after its hash and exact Git source are recorded.

## Existing-session routing correction

The Owner reported the old card layout even after a full refresh. The connected
Edge tab confirmed old entry `/assets/index-DbFBtDAd.js` and card asset
`/assets/phaeno-users-g7Ij27FE.js`, an ellipsis caption and the former stacked
card classes. A direct browser reload still loaded that entry, while clean
requests to the same canonical URL loaded the new entry. There is no active
rolling release.

The existing Nitro Vercel preset emits the HttpOnly `__vdpl` document cookie
when platform skew protection is enabled. This pins full-page navigations to
the previous deployment, as documented in
[Vercel's long-lived session behavior](https://vercel.com/docs/skew-protection).
HTTP checks reproduce both versions using only the non-authentication deployment
ID: the prior pin serves the old entry; the current pin serves the new entry.
The earlier refresh advice could not clear this server-side version pin.

The authorized release is completed by setting only the verified project's
`skewProtectionBoundaryAt` to `1791994479939`, the current deployment's exact
creation timestamp. The previous boundary was absent (equivalent restoration
value zero). Current skew protection remains enabled with its 43200-second age;
identity-provider and deployment-protection settings are unchanged. Afterward,
the previous pin resolves to `/assets/index-uX540aJs.js`.

The actual authenticated Edge tab is reloaded and verified on the new entry.
William Agnew's card visibly shows Actions with one chevron; its badge/button
group sits in the first-row trailing column, before the full-width email/roles.
At the user's 516px viewport, the control group is top 372.5px/right 471px,
with details beginning 408.5px; horizontal overflow is absent. The user's own
Edit action remains direct and the remaining account cards retain the same
layout. No account command is selected, no session is revoked and no login is
reset. Visual proof is saved locally as
`output/user-card-release-20261014/authenticated-user-cards.jpg`.

Future Portal releases include previous-pin and actual-browser checks. Advancing
the version boundary follows matching-source/API compatibility and preservation
verification; it does not enable automatic deployments or replace rollback data.
