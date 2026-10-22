# Portal UI gallery and drift prevention

Owner authorization: October 22, 2026, following the shared back-link conversion.

## Product discovery and acceptance

Users: the Product Owner and engineers reviewing Portal UI. The problem is
independently implemented controls drifting from the approved design. The
existing [UI/UX guide](../ui-ux-principles.md) remains authoritative.

Provide a local visual gallery using the actual shared components and theme
tokens, with fictional content and no connected application data. Reviewers can
inspect both themes, narrow layouts, disabled/error states, keyboard navigation,
Actions menus and three-region dialogs. Keep this engineering tool outside the
Portal route tree, customer menus, help corpus and production build.

Add automatically enforced source checks for independently authored page returns,
back-link appearance overrides/duplicate arrows, contextual Actions bypasses or
hand-authored menu chevrons, shared-tab sizing overrides, and native browser
confirmations. Use syntax-aware checks and localized message lookup, not broad
text searches. Inventory pre-existing violations with exact fingerprints and
reasons. Normal checks cannot add allowances; new/changed violations and stale
allowances fail. Keep unrelated workflow repairs outside this change.

Acceptance: one documented launch command; representative shared controls render
and interact in the gallery; focused checker fixtures prove detection and avoid
known false positives; browser checks exercise themes, desktop/narrow reflow,
equal field geometry, return-link semantics/focus, Actions indicators, tabs and
dialog structure/focus. Source checks run with frontend lint and an independent
UI quality CI workflow. CI has no deployment or production credentials.

## Implementation decisions

- Reuse installed React, Vite, Tailwind, TypeScript, Node test runner and
  Playwright/axe. No new dependencies, authentication or API/database contracts.
- Use a standalone Vite root under `frontend/ui-gallery`, its own loopback port
  and cache, and the real `frontend/src/styles.css` and component imports.
- Browser assertions target layout and accessibility contracts; retain screenshots
  as review artifacts rather than accepting platform-specific pixels as a universal
  visual baseline. Source checks cover the whole Portal source tree; gallery
  browser evidence covers the demonstrated shared patterns.
- Existing documentation claiming all E2E tests use a production preview disagrees
  with the current Playwright configuration, which runs the development server.
  Correct that engineering documentation while adding the separate gallery flow.

## Verification scope

The request authorizes implementing and running the targeted automated checks.
Run their focused tests, full source guard, gallery browser checks, TypeScript,
lint, production gallery build/isolation checks and whitespace checks. Update the
frontend/E2E plans with actual results and retained limits. Customer/Phaeno help
instructions remain as delivered by the prior back-link task; this engineering
tool does not change audience workflows.

No Git publishing, deployment, migrations or live data writes are authorized.

## Completed local implementation and evidence — October 22, 2026

- Added the standalone gallery, seven pattern sections, light/dark controls,
  320/390 px content constraints, example validation, direct/multiple/cancellation
  Actions and the shared confirmation. All data remain in memory; no API calls.
- Added source guards and exact scanner-step allowances. The initial scan found
  14 hand-authored Actions chevrons and one local specimen-tab padding override;
  removed those presentation overrides instead of grandfathering them. The only
  remaining allowances are the two non-page active-tube scanner steps.
- Added lint integration and the independent read-only `Portal UI quality`
  workflow for frontend pull requests/pushes to main. Its exact-source GitHub
  run 39809567603 passes, including all 18 guard and 24 browser cases.
  Branch-protection settings are unchanged.
- Updated engineering instructions and the durable UI guide. Corrected the
  frontend README's stale production-preview E2E claim and its conflicting
  blanket-test instruction to match current code and the repository policy.

Verification completed:

| Check | Result |
| --- | --- |
| Source guard | Pass: 739 source files, two exact scanner-step exceptions |
| Guard regressions | 18/18 pass, including detection, aliases/localization, correct TS/TSX parsing, false positives and stale/expanded allowances |
| Gallery browser suite | 24/24 pass across 1280 px desktop and 390 px phone projects, both themes; includes 320 px reflow |
| Accessibility scans | No axe violations in the four gallery theme/viewport projects |
| TypeScript and full frontend lint | Pass; lint runs the source guard and permits zero warnings |
| Standalone gallery build | Pass; a local-only 795 kB bundle produces Vite's advisory chunk-size warning |
| Existing help corpus | Check passes: 62 guides, `89e4a753a7d9`; no new customer/Phaeno workflow content |
| Visual inspection | Desktop light and phone dark captures reviewed; controls, wrapping and containment are consistent |

The browser suite required execution outside the local sandbox so its browser
could reach the loopback-only gallery. No production service or credentials were
used. The source guard verifies recognized syntax and gallery isolation; gallery
browser checks establish the demonstrated component contracts. They do not
establish every feature's permission-dependent layout, dirty-form journey,
screen-reader behavior, scientific acceptance or complete WCAG conformance.

Committed/pushed source `0baf3adf` is deployed to the existing hosted test Portal.
Signed-in Company/assembly/Actions/help smoke and preserving release checks pass;
see the [release receipt](../operations/portal-ui-consistency-test-release-20261022.md).
Deployment holds and release controls remain in place. Review screenshots are
retained separately from disposable build and test output.
