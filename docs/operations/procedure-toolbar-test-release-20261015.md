# Procedure toolbar hosted-test UI release

The Owner requested commit, push and UI deployment. The
[preserving UI-only plan](../plans/PROCEDURE-TOOLBAR-TEST-RELEASE-20261015-PLAN.md)
owns preparation, preservation and rollback. This release groups Revision,
Presentation and Paper size and separates procedure Actions with its own divider.
The contextual menu retains its existing edit, print and preview commands.

## Source and deployment

Reviewed source `010109b837b2db21192574bd17126091e928a2eb` was committed and
pushed to main, with ordinary remote equality verified. The committed archive
SHA-256 is `505c9322bf5a80af0701e8e11666262312e98c1197da91e597723b047c2c8532`.
Concurrent user-card working files and their readiness paragraph are excluded.

Vercel team `cadexgenomics`, Portal project `prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R`,
root `frontend`, built the exact GitHub commit as a staged production deployment:
`dpl_4vQvdkHuFwKzQsyjhdZPFhssEewL` at
`phaeno-ops-mgmt-system-8ixpa740q-cadexgenomics.vercel.app`. Build readiness was
reached in approximately 22 seconds. Automatic domain assignment was disabled
during staging. The ready build was promoted without rebuilding; independent
alias and project lookups confirm [the hosted test UI](https://portal.phaenobiotech.com/lab-configuration)
now serves that deployment and source.

Skew protection remains enabled. Its existing version boundary advances from
`1792029304727` to `1792072282074`, the new build creation time, so previous
document pins receive the compatible toolbar. Staged, canonical and previous-pin
requests all load `/assets/index-D4wVSgE-.js`. The preceding compatible UI
`dpl_72xTuemmuELHyQeujcZhJPqU9KDy` remains the rollback target.

## Verification and preserved boundaries

Local TypeScript, scoped ESLint, final production build, documentation check and
whitespace checks pass. Existing manual local coverage verifies equal control
baselines at 1280 CSS pixels and no toolbar/page overflow at 390 CSS pixels.
No automated suite was requested/run for the layout-only refinement.

Protected staging and canonical root/procedure routes return 200, proxied API
health returns 200 and anonymous work-attention access returns 401. The actual
signed-in hosted browser loads the new entry and retained approved mock kit
revision. It shows labeled settings in one group and Actions after a separate
divider. At the observed 1912 CSS-pixel viewport, all four controls are 32 pixels
high on the same baseline and the page has no horizontal overflow.

Overview/bench and Letter/A4 selection work. Arrow Down opens the single Actions
menu with edit and both print commands; Escape closes it and restores focus to
Actions after the closing animation. The default overview/Letter view is restored.
No save, approval, scientific recording or native print is performed. A valid
hosted screenshot is retained privately as `hosted-toolbar.png`; earlier invalid
local captures were discarded. The deployment-scoped UI error scan is empty
(30-minute window, at most 25 records).

API manifest remains at source `573843a1e3cb40bbc207c865aace4c8d7debf727`,
run `38668224349`, with the same deployment timestamp/image. The reviewed Phaeno
guide remains accurate, so its layout-only rewording was omitted to keep the
UI/API corpus at `1d0e7cb954a3` (56 guides). API corpus file SHA-256 still equals
`ac4c3d5bdce4ff3981789db7f5a5b7bcab221b53056a95e954be024e579a6527`.

There is no API deployment, migration, replacement database, data conversion or
storage/identity change. All application data, Website contact/demo history,
procedure pins, file objects/versions, prior encrypted recovery and the hosted-test
S3 recovery deferral are preserved. This UI release does not qualify populated
S3 recovery or change commercial activation. `Deploy Portal Green` stays
`disabled_manually`; both Vercel Git deployment holds remain false. Authentication,
browser sessions and browser security permissions are unchanged.

The receipt is committed/pushed separately without rebuilding unchanged
application code. Native PDF/print pagination, touch, 200% zoom, assistive
technology and physical/scientific/business acceptance remain separate.
