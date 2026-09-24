# SYS-05 — Connected interface acceptance

**SYS-05 Pass for isolated software acceptance. The ledger now has 36 of 81 closed cases (44.4%); 45 remain with named dependencies.** This does not waive their required steps or establish final release signoff.

## Baseline and scope

The connected Portal is `https://localhost:3016`, API `https://localhost:7116`, and isolated database `127.0.0.1:5436/phaeno_ops_lab06_uat`. Source starts at `7df0ccbef62252732ceae877abb4fe7bb9a721dc` plus this run's local UI, test and documentation changes. The retained API binary SHA-256 is `4B5929455CCB972970742E47D0525FE1E2965B2CB217E49049F49026362EDB50`. Existing approved UAT identities signed in through the development identity provider in separate browser contexts.

This is connected software acceptance. No real invitation, provider message, physical shipment, scientific approval, publication, payment, migration, deployment or Git mutation was performed. Browser save failures are intercepted before reaching the server. Application evidence is kept separate from mocked regression checks and the explicitly synthetic prerequisite below.

## Step crosswalk

| SYS-05 step | Evidence and outcome |
| --- | --- |
| 1 — Keyboard discovery, detail and return | Populated Company list/detail/edit, Trial scope, quote, sample roster, Kit input, Finance, protocol and help surfaces were inspected. Company edit returns focus to its invoker. The actual Partner filters its Assembly list, opens the primary identifier with Enter and uses the record's breadcrumb to return with the filter retained. Prior completed CRM, Trial, roster and Finance crosswalks retain their paging, record ownership and saved-state evidence; no successful business writes were replayed. |
| 2 — Searchable choices and draft recovery | Actual Company contact association uses ArrowDown/Enter to select; the first Escape closes results and retains focus and entries. Declining discard retains the draft; accepting discard closes it and restores the invoker. The invitation's Keep editing/Discard changes actions and the Kit form's declined/accepted navigation prompt also pass. |
| 3 — Validation, failed save and list recovery | A Member invitation with no Department allows submission for validation, focuses Department access and produces no request. Kit required errors focus the first field and reference existing error descriptions. A pre-server 503 on one Kit draft update retains entered values; saved request version/content remain identical. A filtered Assembly list distinguishes a failed request from no matching records; keyboard retry restores the result and preserves the filter. Loading/status/error semantics are present in the captured accessibility trees and live regions. |
| 4 — Responsive layout and enlargement | Twelve representative surfaces each have 1440, 768, 390 and 320 CSS-pixel checks in light and dark: 96 combinations without page overflow in final evidence. Modal actions remain reachable. Native Chromium zoom is independently confirmed at 100%, 200% and 400% on the connected Kit input form, with CSS widths 1440, 720 and 360 respectively; the form separately passes 320-pixel reflow. CSS enlargement captures for all twelve surfaces are supplementary and are not relabeled native browser zoom. |
| 5 — Focus, naming, contrast and announcements | Actual keyboard focus, choice semantics, field/error associations, required markers, file-input focus and live regions are checked. Twenty-four initial axe scans found no automatic violations but flagged gradient contrast and missing Trial error references for review. Trial references are corrected; gradient endpoints and partially overlapping modal text are assessed separately below. This is representative WCAG 2.2 AA acceptance evidence, not a claim of complete assistive-technology or product-wide conformance. |

The representative surfaces are Company discovery, Company detail, Company edit, Trial scope, Customer sample roster, staff quote review, Partner Kit input, Finance allocation, protocol execution, protocol hold form, invitation and help. See SYS-05 for the original requirements.

## Defects corrected locally

- **Invitation validation:** an empty or stale Department selection no longer disables the action solely because the selection is invalid. Submitting explains the problem and focuses the Department field. Missing configuration, lookup failures and pending requests still prevent sending. Existing role intent and backend authorization are unchanged.
- **Partner tablet navigation:** the desktop toolbar overflowed at 768 pixels. Workspace navigation now moves to the user menu below 1024 pixels, with the toolbar/menu sharing that boundary and focus returning after Escape. Connected Partner checks and desktop/mobile browser regressions verify one visible navigation location.
- **Assembly empty-state guidance:** removed the instruction to use the unavailable standalone Request data assembly action. It now directs the Partner to PSeq Kit orders.
- **Assembly form accessibility:** required markers stay with their labels, field errors are associated with their controls, the prohibited-data confirmation exposes required/error semantics, and the file chooser has a visible outline when focused.
- **Trial accessibility descriptions:** untouched controls no longer reference error elements that do not exist. Error descriptions are connected when their messages are rendered.

The corresponding Customer, Partner, Prospect and Phaeno access guides and Partner Assembly guide were updated. The regenerated 56-guide corpus is `c77002923d66…`. Navigation and validation mechanics changed; no business permission or scientific rule changed.

## Contrast review completion

All 48 scans of the twelve surfaces against both gradient endpoints in both themes finish with zero automatic violations after the rendered theme is settled. Early scans captured mixed colors during theme changes; the final run waits for the resolved theme and captures the rendered page before scanning. Trial missing-description review items are resolved. Eight remaining modal text observations (four text items in each theme) were checked using rendered foreground/background colors and visual inspection; contrast ranges from 6.86:1 to 18.49:1 against the required 4.5:1. Scrolling brings the described modal text into view. Their scanner review flags concern overlapping dialog regions, not an unreviewed low-contrast result. These checks supplement the original gradient screenshots without changing product colors.

## Synthetic Kit input prerequisite and conservation

The actual KIT-01 purchase had two AwaitingShipment cases and no editable Assembly requests in the selected Partner Department. A separate `TEST-ONLY-SYS05-UI-20260915` fixture provides one editable input form using the existing approved test profile, organization and Department. Its purchase/shipment prerequisite is explicitly synthetic. Its carrier, tracking and lot fields state that no physical event occurred. It establishes no KIT-02/04, delivery, scientific, payment or provider acceptance.

The isolated helper creates one parent, line, Kit unit, included case and input draft in a transaction. An initial circular insertion dependency rolled back; the corrected helper saves the mutually linked records in dependency order within the transaction. The existing fixture is detected on continuation and must not be recreated.

The final draft remains Draft/version 1, with no files or submitted input revision. Actual authenticated before/after request data compare identically after validation and the intercepted failure. Independent PostgreSQL readback confirms this state. The original KIT-01 order remains UnderReview/version 6 with two AwaitingShipment cases. HS5Y7DB7 and the independent scientific-review checkpoint were not targeted. Preserve the fixture for continuation; no account grants or operational flags need restoration.

## Verification and evidence

- Five invitation component checks, nine existing bundled-order checks and four Trial-scope checks pass: 18 distinct checks.
- Four invitation and four navigation desktop/mobile browser checks pass. The two new navigation checks initially ran before hydration and passed after waiting for the interactive application; the established menu checks passed initially.
- TypeScript, scoped lint and documentation generation/check pass. The documentation generator needed approved filesystem escalation after Windows rejected the normal artifact write.
- The isolated API was restarted with its existing launcher and unchanged binary/settings to load the regenerated help corpus. Authenticated search initially returned the expected stale-corpus 409; after restart it returned 200 with the exact new corpus hash and the revised guide rendered. `sys05-docs-runtime.json` records that match. No shared service or deployment was changed.
- Browser helper failures were corrected without repeating committed operations: dynamic checkbox indices, an incorrect Finance route/action name, API-envelope metadata equality, normal list retry timing, and selecting the global navigation link before the detail breadcrumb had rendered. Retained journals distinguish those helper failures from the reproduced product defects.

Ignored artifacts are under `tmp/uat-closure/`: `sys05-connected.json`, `sys05-invitation.json`, `sys05-finance.json`, `sys05-final.json`, `sys05-input-fixture.json`, `sys05-native-zoom.json`, `sys05-contrast.json`, `sys05-modal-contrast.json` and `sys05-*.png`. Initial and focused regression artifacts are under `tmp/sys05-*-browser` and `tmp/sys05-navigation-retest`. Connected scripts are under `tmp/uat-closure-identities`; the transactional prerequisite helper is under `tmp/uat-resources-fixture`. The native zoom helper uses a temporary isolated Chromium extension, not the user's browser profile.

## Remaining case dependencies

The controlling ledger retains all 45 other open cases and their exact required steps. They include missing implemented scope-change/Job-completion paths, controlled independent scientific output and provider lineage, physical kit/print/scanner observations, authorized recipient/sign-in/delivery journeys, disposable files with working scanning/retention enforcement, and coordinated restore plus scheduled/off-server backup evidence. A software fixture or green regression check cannot close those dependencies. No exclusion or acceptance waiver has been inferred.

Final reconciliation verifies 81 unique case rows: 36 Pass, zero R and 45 B. All 320 checked document links resolve and the final whitespace check passes. Test browser contexts are closed; the isolated application remains available with the updated help corpus.
