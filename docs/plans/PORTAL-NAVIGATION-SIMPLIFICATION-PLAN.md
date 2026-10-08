# Portal navigation simplification

## Product need

Phaeno users need a shorter user dropdown and predictable access to operational workspaces. The Product Owner authorized the first slice on September 28, 2026: add **More** with **Purchasing**, **Equipment**, and **Data provisioning**, in that order.

## Implemented scope

- The wide-screen toolbar shows More after the available primary workspace links. Its dropdown opens the existing Purchasing, Equipment, and Data provisioning routes.
- Narrow screens use a full-width modal tray sliding in from the right, with a fixed Menu header and visible Close action, a scrolling body, reduced-motion support, and a 44 px hamburger at an 8 px toolbar edge inset. Workspace links appear without a Workspace heading. More and Settings are disclosure rows inside the tray: they expand in place, keep links within the menu width, start collapsed on each opening, and allow one open section at a time. Destination order, permissions, and active-route indication are retained. Enter or Space toggles each section, Up and Down move among visible navigation items, and Tab/Shift+Tab move among the tray controls. Escape or Close dismisses the tray and restores its trigger. Choosing a destination also closes it. Crossing the desktop breakpoint closes the user menu so focus cannot remain on a hidden mobile link.
- Navigation reuses each destination's existing organization and capability predicates. More is omitted when no destination is available.
- The More trigger shows the active workspace state for all three destinations and their detail routes. Dropdown items identify the current page. Up and Down arrow keys move among destinations. From any menu item, Tab closes More and moves to the next toolbar tab stop; Shift+Tab closes it and moves to the previous toolbar tab stop. Escape immediately removes the menu and returns focus to More. Closed content is removed immediately so an exit transition cannot retain the focus trap. Switching to a narrow layout closes the desktop dropdown.
- Purchasing, Equipment, and Data provisioning are grouped under More. The user dropdown omits the Display, Administration, and Resources headings while retaining section dividers and accessible theme names. Documentation remains available to all audiences, with authorized User management immediately beneath it. Settings retain their existing order and permissions.
- No route, backend, authentication, dependency, or database changes are needed.

The proposed settings landing page and further regrouping of account controls remain outside this slice.

## Acceptance and verification

Existing navigation-unit and home-browser expectations are updated for this scope; automated suites remain request-only.

September 28 local checkpoint:

- Scoped ESLint and TypeScript compilation passed. Documentation generation and verification passed for all 56 guides (corpus `679d4336e968`). The diff whitespace check passed.
- The real signed-in local Chrome session showed the three ordered links, opened Purchasing, Equipment, and Data provisioning, and identified each current destination with `aria-current="page"`.
- The initial keyboard observations covered Enter, arrow keys, internal Tab movement, and Escape. The Product Owner subsequently clarified that Tab and Shift+Tab must exit directly from any item. Internal Tab movement and backward exit to More are superseded by the implemented behavior above; Escape still returns to More. No business record was changed.
- At CSS widths 1440, 768, and 392, the layout used the intended desktop or narrow placement. Resizing with More open closed it; narrow menus showed each destination once, in order, without horizontal page overflow. The normal viewport was restored and the temporary review tab was closed.
- Permission-filtered and empty states were reviewed in the reused predicates and updated unit assertions. Light-theme rendering was observed; dark-theme semantic tokens were reviewed without changing the user's saved display preference. Screenshot capture timed out in the browser connection, so no screenshot artifact is claimed.
- No automated application suite, Git mutation, deployment, or migration was performed for this slice.

## Clarified keyboard behavior verified

September 28 follow-up: the signed-in local Chrome review confirmed Down to Equipment, Up to Purchasing, immediate Tab dismissal with focus on the user-menu button, immediate Shift+Tab dismissal with focus on Lab ops, and Escape dismissal with focus on More. The temporary review tab was closed. Scoped ESLint, TypeScript, and the 56-guide documentation generation/check passed (corpus `8a1cca24f28c`). Existing browser expectations now cover both Tab directions from each menu item; no automated suite was run.

## User dropdown refinement verified

September 28 refinement: removed the visible Display, Administration, and Resources headings and moved permission-filtered User management immediately beneath Documentation in the same group. Section dividers, settings order, and the accessible Display theme radio-group name remain in place. Updated guide paths omit the removed headings for all affected audiences, and the existing home-browser expectations check their absence and the adjacent Documentation / User management order.

The signed-in local Chrome menu showed the requested order and no removed headings. Down from Documentation focused User management; Escape closed the menu and returned focus to its trigger. The review tab was closed. Scoped ESLint, TypeScript, the 56-guide documentation generation/check (corpus `dab3357c820b`), and the diff whitespace check passed. No automated suite, Git mutation, deployment, or migration was performed.

## Mobile tray verified

The Product Owner subsequently authorized a full-width tray sliding in from the right. This supersedes the earlier narrow-screen dropdown presentation. The tray reuses the existing Dialog primitive for focus containment, background scroll locking, Escape, and focus restoration. It has a fixed Menu header and visible Close action; only its body scrolls. Preferences use native radio and Department controls, and navigation uses links with the existing capability predicates. More and Settings remain collapsible, one at a time, and reset on dismissal. Desktop retains its dropdown.

The former header applied both outer padding and a narrowed page container. Mobile now uses the full available toolbar width, an 8 px edge inset, and a 44 px hamburger target. Desktop keeps its prior centered width.

September 28 signed-in local Chrome evidence:

- At CSS width 392, the hamburger measured 44 px wide with an 8 px edge gap. The tray began at x/y 0 and filled the viewport; its body scrolled while the page remained locked. Its entrance translation was 100% from the right. The Workspace label was absent, and Documentation immediately preceded authorized User management.
- Click opened More with Purchasing, Equipment, and Data provisioning in order. Down reached Purchasing; Tab reached Equipment and Shift+Tab returned to Purchasing. Opening Settings collapsed More and retained focus on Settings. Escape restored the hamburger; reopening reset both sections, and the visible Close action restored the same trigger.
- At CSS width 768, the tray was 768 px wide with no horizontal page overflow. Choosing Purchasing closed the tray and opened its existing route. At CSS width 1440, the compact desktop dropdown retained the theme choices, settings order, Documentation, and User management.
- Semantic light/dark styling and reduced-motion suppression were reviewed in source; the user's saved System theme was preserved. The temporary viewport was reset and the review tab closed.
- Scoped ESLint, TypeScript, the 56-guide documentation generation/check (corpus `7cf67b564151`), and diff whitespace verification passed. Existing home and Documentation browser expectations were updated, including a 1 px tolerance for fractional viewport height. Automated suites remain request-only. No Git mutation, deployment, database change, or build output was produced.

## Expanded section styling refinement

September 28: removed the duplicate parent/destination selection fills shown in the Settings screenshot. Expanded More and Settings headers use neutral medium-weight labels; a collapsed section containing the current route emphasizes its title. Child links omit repeated decorative icons, align beside a thin vertical guide, and retain one selection fill for the current destination. The shared change preserves accessible names, 44 px targets, section toggling, and keyboard focus outlines.

Signed-in Chrome review at CSS width 392 showed only Order settings selected, no child icons, a thin guide, no horizontal overflow, and 44 px child rows. Down from Settings still focused Order settings. The revised appearance was visually inspected in a browser screenshot. Scoped ESLint and TypeScript passed. The existing navigation guide remains accurate; no user-documentation text or generated corpus change is needed for this presentation-only refinement. No automated suite, Git mutation, deployment, or build output was produced.

## Mobile header spacing and divider

September 28: moved the narrow toolbar's 8 px inset inside the full-width header, reduced its primary row from 84 to 72 px, and removed the logo wrapper's extra inline baseline and label spacing. The logo and 44 px hamburger share the vertical center. Desktop retains its existing centered toolbar and larger branding.

The reported right-hand gap also reproduced on longer pages: Windows reserved a 20 px document scrollbar gutter, leaving the header short of the viewport and the hamburger 28 px from its edge. Narrow layouts now suppress the document scrollbar gutter with `scrollbar-width: none`; page scrolling remains enabled, and scrollbars inside the navigation tray and other bounded regions retain their existing styling. The desktop document scrollbar is unchanged.

Signed-in local Chrome checks at CSS widths 320, 392, and 768 confirmed a divider from x=0 to the viewport's right edge, a 72 px primary toolbar, a 44 px hamburger, and an 8 px right inset. The settled 320 px Lab operations page had no horizontal overflow; Page Down scrolled it while the header stayed at y=0. A 1440 px check retained desktop navigation and centered branding. Scoped ESLint, TypeScript, and the whitespace check passed. Audience navigation guides remain accurate; no guide or generated corpus update is needed for this visual change. No automated suite, Git mutation, deployment, database change, or build output was produced.

## Mobile workspace sidebar dismissal

September 28: the Product Owner requested outside-click dismissal for the shared left sidebar on narrow screens. A capture-phase pointer handler closes an open narrow sidebar when a surface outside the rail and its edge tab is pressed. Clicks within the rail remain active; outside controls receive their normal action and focus. If focus was inside the rail and the user presses a plain surface, focus returns to the persistent edge tab. Section selection, tab toggling, and Escape retain their existing behavior; the desktop pin and hover rules are unchanged. Updated all four audience getting-started guides and regenerated the 56-guide corpus (`3de70eda8b76`).

Signed-in local Chrome review at CSS width 420 confirmed that clicking the rail header keeps it open, pressing an empty header surface closes it, and pressing the hamburger closes the rail while opening the user tray. A Tab-focused rail item returned focus to the edge tab after outside dismissal; Escape also closed the rail and returned focus. Scoped ESLint, TypeScript, documentation generation/check, and whitespace verification passed. No automated suite, Git mutation, deployment, database change, or build output was produced. The Product Owner confirmed the earlier mobile header was correct; its accepted implementation is retained.

## Customer settings consolidation — September 29, 2026

The Product Owner subsequently authorized the settings landing page that was
outside the September 28 slice. In a Customer context, the user menu opens
**Customer settings** at the existing `/departments` route. Tabs separate
Transportation-kit delivery, Departments, organization-administrator-only
Organization defaults, and organization-administrator-only People and access.
The delivery tab filters saved locations by an active Department within the
administrator's scope and opens bounded create and view-first detail flows.
The selected Department remains in the URL when returning from location detail.
Customer user management reuses its existing panel in People and access; prior
`/phaeno-users` links remain functional. Other audiences keep their existing
menu entry and route. Backend access rules, authentication, and data contracts
are unchanged. Automated suites and signed-in browser acceptance remain
request-only; the living frontend and E2E plans track those checks.
