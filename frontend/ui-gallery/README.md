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

## Automated checks

| Command | Coverage |
| --- | --- |
| `pnpm ui:check` | Syntax-aware source guard across Portal application and gallery sources |
| `pnpm ui:test` | Guard detection/false-positive fixtures and exact exception handling |
| `pnpm ui:test:browser` | Actual gallery controls at desktop/phone widths in both themes, including 320 px reflow and axe |
| `pnpm ui:gallery:build` | Standalone gallery compilation into `frontend/dist/ui-gallery` |

`pnpm lint` and `pnpm lint:ci` also run the source guard. The independent
`Portal UI quality` workflow runs the targeted checks for frontend pull requests
and pushes to main. It does not deploy anything or use production credentials.
GitHub branch-protection requirements are an administrator setting and are not
changed by adding this workflow.

Source rules require the canonical shared `BackLink`, prohibit back-link visual
overrides/extra arrows, require `ActionMenu` for recognizable contextual Actions,
reject manual menu chevrons and shared-tab typography/height/padding overrides,
reject `window.confirm`/`globalThis.confirm`, and prevent production source from
importing or linking the engineering gallery. Named imports, aliases, static
conditional/template classes and Customer message IDs are inspected. These
bounded rules do not understand every arbitrary wrapper, dynamically assembled
class or runtime permission condition.

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

When changing a shared pattern, update its gallery examples, relevant assertions,
the [UI/UX guide](../../docs/ui-ux-principles.md) and
[owning plan](../../docs/plans/UI-DESIGN-SYSTEM-GUARDRAILS-PLAN.md) together.
