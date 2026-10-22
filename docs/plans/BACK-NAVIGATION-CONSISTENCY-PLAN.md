# Portal back-navigation consistency

Owner request: October 22, 2026.

## Product need and scope

All Portal audiences need a recognizable way to return from a page to its list,
parent record or originating workflow. CRM Company detail is the visual reference:
a compact, neutral back control with a left arrow and a named destination.
Before this change, Assembly detail used an underlined text link without an
arrow, while other features independently chose typography, spacing and button
variants. That baseline conflicted with the reuse principle in
[UI/UX principles](../ui-ux-principles.md).

Standardize existing page-return controls across the Portal frontend using
`frontend/src/components/ui/back-link.tsx`. Preserve destinations, typed route
parameters, URL search/hash state, localization, disabled states and draft guards.
Include return controls in unavailable/error states and contextual return links.
Keep pagination, previous/next guide navigation, form Cancel and multi-step modal
controls in their existing roles. Public Website design is separate scope.

## Implementation and acceptance

- One shared `BackLink` owns the decorative ArrowLeft, compact typography,
  neutral ghost treatment, padding, icon gap, pointer cursor and visible focus.
  Long destination text wraps within the page rather than overflowing.
- Compose typed router Links or anchors with `asChild`; use its native button
  form only for an existing guarded return callback. Do not add browser-history
  assumptions or change unsaved-draft protection.
- Use the same control across CRM, Lab operations/settings, R&D, commercial
  workspaces, shipping/settings, delivery locations, Data Library/provisioning,
  and Documentation. Remove feature-owned return-link style constants.
- Keep return navigation above the page heading, separated from record Actions.
  Contextual return destinations remain distinct navigation choices.
- The durable style guide is `docs/ui-ux-principles.md`; add a concrete component
  reference and usage contract there and in the repository agent guide.
- Success: no independently styled page-return controls remain in the source
  inventory; both reported pages use the same component. Retained URL context
  and accessible keyboard operation remain acceptance requirements.

## Verification and documentation

Use TypeScript, touched-source lint, source inventory and whitespace checks at
the completed-change checkpoint. Automated test execution is deferred under
the repository's request-only rule. Inspect representative desktop/narrow,
light/dark, long-label and keyboard-focus states where a local browser is
available; distinguish direct shared-control inspection from whole-app flows.

Review audience guides against retained labels/destinations. This presentation
change does not alter workflow instructions, permissions or business rules.
Record any guide changes or justified unchanged review at completion.

No dependencies, authentication, API/database changes, Git publishing or
deployment are included.

## Completed local implementation — October 22, 2026

- Converted 86 return-control call sites across 59 feature components, including
  both reported pages, loading/unavailable/error returns, page-header parent
  links and Documentation's guide/search returns. Removed both feature-local
  settings return-style constants. Kept modal step controls, scanner return-to-
  active-tube controls, invitation completion and previous/next controls in
  their distinct roles.
- The shared control follows Company detail: 12.8 px medium-weight text, 14 px
  decorative arrow, 4 px icon gap, 4 px vertical/6 px horizontal padding, a
  minimum 28 px target and neutral semantic foreground/hover/focus tokens.
  The arrow aligns with the first line when long labels wrap.
- Company and Trial contextual return choices share a wrapping row. Standalone
  Portal access detail now places its return above the heading; its two existing
  header commands use the required shared Actions menu.
- Expanded the durable UI guide with a shared-component reference table and
  page-return contract; added the rule to `AGENTS.md`. Updated each audience's
  Getting started guide and review date; regenerated the matched 62-guide API/UI
  corpus, version `89e4a753a7d9`.

Source comparison confirms all 208 existing router-Link/anchor destination,
parameter, search, hash and event props across the 59 modified feature components
are preserved. Source inventory found no independently styled page-return links;
the retained Back/Return controls belong to the distinct roles listed above.
TypeScript, scoped ESLint with zero warnings, documentation consistency and
whitespace checks pass. All component paths referenced by the style guide exist.

Direct Edge inspection used an isolated preview of the actual shared component,
application CSS and TanStack Link. It confirmed equal typography/padding/gap,
one decorative arrow, semantic anchors/buttons, long-label wrapping in a 320 px
container, light/dark presentation, no page/control overflow at a measured 433 px
narrow viewport, visible 3 px keyboard-focus ring, skipped disabled returns,
Enter activation with list filters/hash retained, and guarded callback activation.
The bounded browser error log was empty. Temporary preview files/server/cache
were removed and the browser viewport was restored.

This is component-level browser evidence, not authenticated whole-page acceptance
of every workspace, a dirty-form walkthrough, a 320 px whole-page pass, or a
screen-reader/WCAG conformance claim. Automated suites remain unrun because the
Owner did not request them. Changes remain local, uncommitted and undeployed.
