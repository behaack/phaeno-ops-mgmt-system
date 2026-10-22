# Portal component gallery

Run `pnpm ui:gallery` from `frontend/`, then open
[the local gallery](http://127.0.0.1:4318/).

This engineering reference imports the real shared controls and Portal theme
tokens. It uses fictional data, makes no API calls and has no Portal route or
customer navigation entry. Its standalone root, output and dependency cache are
separate from the running Portal. Theme choices affect this page only.

Use **Theme** to inspect light/dark states and **Content width** to constrain the
example area. The example grids respond to that container; use an actual narrow
browser viewport as well to check viewport-based typography and breakpoints.
Tab through controls, activate Actions, validate the example form, and open the
fictional cancellation to inspect its header, body, footer and focus behavior.
Examples remain in memory and reset on reload.

The gallery has fifteen sections covering page headers; lists/tables and
pagination; guarded form dialogs; loading/status/recovery; remaining controls;
application navigation; native field validation; data formatting; explicit
status meaning; detail summaries; and assembled list/detail/edit pages. The
input/assembly examples deliberately use the
same record title/row components with different metadata and trailing controls.
Use the form outcome selector to inspect failed-save retry and conflict review;
Cancel/Escape exercise the real Portal draft guard and safe discard dialog.
Open the full-page navigation example to inspect the actual desktop menu, mobile
user tray and workspace sidebar with fictional local props. Its links stay
within the standalone gallery; no session, API or business data is connected.
The notification examples share the live bell's presentation and show zero,
`1`, `12`, capped `99+`, and unavailable counts. The navigation preview includes
the same bell beside the menu with a fictional local dialog.

The standardization examples use real React Hook Form registration with native
selects and checkboxes, reserved validation space and 32/44 px input variants.
They show calendar days separately from timestamp/timezone display, binary file
units, precise decimals, zero, false and missing values. Count-free pagination
retains its lack of totals. Conditional confirmations exercise safe cancellation
and return focus after their menu item disappears.

Open **Complete page previews** for an assembled list, detail and guarded editor
at `/workspace-preview`. Theme/view and expanded Customer text are URL options;
expanded examples use the actual Customer pseudolocalizer and a long identifier.
Everything remains fictional and in memory, including edits and recovery.

## Automated checks

| Command | Coverage |
| --- | --- |
| `pnpm ui:check` | Syntax-aware source guard across Portal application and gallery sources |
| `pnpm ui:test` | Guard detection/false-positive fixtures and exact exception handling |
| `pnpm ui:test:components` | Native field events, formatting/precision, explicit domain statuses, detail semantics and retained-release paging/retry/permission contracts |
| `pnpm ui:test:browser` | Actual gallery controls at desktop/phone widths in both themes, including 320 px reflow and axe |
| `pnpm ui:visual:check` | Read-only validation of 24 reviewed PNGs, dimensions/hashes and pinned browser/font versions |
| `pnpm ui:test:visual` | Manifest check and Windows Chromium comparisons of complete list/detail/modal pages |
| `pnpm ui:visual:review` | Explicitly record reviewed images in the manifest; prohibited in CI |
| `pnpm ui:gallery:build` | Standalone gallery compilation into `frontend/dist/ui-gallery` |
| `pnpm ui:build:check` | After both builds, verify production JS/CSS/HTML excludes gallery code/styles and the gallery retains its own examples |

`pnpm lint` and `pnpm lint:ci` also run the source guard. The independent
`Portal UI quality` workflow runs the targeted checks for frontend pull requests
and pushes to main. It does not deploy anything or use production credentials.
GitHub branch-protection requirements are an administrator setting and are not
changed by adding this workflow.

Browser verification uses loopback port **4319**, leaving the interactive gallery
on **4318** available for review. Both servers have independent startup lifetimes;
the standalone gallery cache remains separate from the Portal development cache.
Portal Tailwind scanning is scoped to `frontend/src`; the standalone gallery adds
its own source directory. UI quality CI builds both outputs and verifies their
separation, including CSS, without deploying either application.

Source rules require the canonical shared `BackLink`, prohibit back-link visual
overrides/extra arrows, require `ActionMenu` for recognizable contextual Actions,
reject manual menu chevrons and shared-tab typography/height/padding overrides,
reject `window.confirm`/`globalThis.confirm`, and prevent production source from
importing or linking the engineering gallery. Named imports, aliases, static
conditional/template classes and Customer message IDs are inspected. These
bounded rules do not understand every arbitrary wrapper, dynamically assembled
class or runtime permission condition.

The rules also reject raw selects/checkboxes outside their primitives, local
height/chrome overrides (including recognized module class constants), duplicated
formatting helpers, and inconsistent required/clear presentations. Native field
callbacks, form names, refs and permission/disabled rules belong to each feature.

Additional rules enforce Portal `PageTitle` typography and canonical `RecordLink`
composition for recognizable record identifiers. Auth/invitation presentation,
article navigation, ordinary buttons and workflow links retain their own roles.
Page title layout/identifier fonts remain supported; local visual overrides do not.

The shared primitive implementations own their visual classes and are excluded
from call-site checks. Test fixtures and generated route code are excluded.
Two exact **Return to active tube** scanner-step exceptions are recorded in
`frontend/scripts/ui-drift-baseline.json`. Each allowance names the source,
rule, normalized-code fingerprint, occurrence count and domain reason. New or
changed violations fail, as do stale allowances. Fix violations first. A new
exception needs a documented workflow reason and deliberate review; never
regenerate the baseline just to make checks pass. `node scripts/check-ui-drift.mjs
--inventory` prints findings without modifying allowances.

Browser assertions compare control geometry, semantics, states and keyboard
behavior. Screenshots and failure traces are stored under
`frontend/test-results/ui-gallery`; CI retains them for seven days. They support
visual review rather than pretending that one platform's pixels define every
browser. These checks do not establish every feature page's visual consistency,
scientific acceptance, screen-reader coverage or complete WCAG conformance.
Those gallery captures remain review artifacts. A separate, platform-specific
pixel suite has 24 reviewed baselines under `visual-tests/__screenshots__`:
list/detail/modal, ordinary/expanded Customer text, desktop/phone and light/dark.
It uses Windows Chromium, bundled Geist, en-US, UTC, reduced motion and fixed
viewports; a dedicated Windows CI job performs these comparisons. Port **4321**
is isolated from the interactive and ordinary gallery servers. Visual failure
artifacts go to `frontend/test-results/ui-visual`.

For an intentional visual change, run the visual suite on Windows with explicit
`--update-snapshots`, inspect every changed image, then run
`pnpm ui:visual:review` and a normal `pnpm ui:test:visual` comparison. Normal runs
have snapshot updates disabled. Never refresh images just to silence a failure.
The manifest pins Playwright and font versions; changing either requires review.
This page set is representative rather than a screenshot of every real route.
The per-pixel color threshold is 0.15 (stricter than Playwright's 0.2 default),
with at most 80 differing pixels. This tolerates small Windows workstation/server
glyph-edge smoothing differences without accepting layout or content changes.

When changing a shared pattern, update its gallery examples, relevant assertions,
the [UI/UX guide](../../docs/ui-ux-principles.md) and
[owning plan](../../docs/plans/UI-PATTERN-COMPLETENESS-PLAN.md) together.
