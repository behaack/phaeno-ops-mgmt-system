# Website operations navigation — October 12, 2026

Implemented **More → Website operations** at `/website-operations` for Phaeno
platform administrators. **Mailing list** and **Demo requests** are independent
shared-sidebar queues; **Email delivery** is retained as a separate recovery
section. Existing intake components/APIs, page size 10, confirmed soft lifecycle
actions, recipient review and history are reused. URL selections and queue pages
remain independent. Sidebar selection replaces the old tab strip. Old home
bookmarks redirect; notification destinations open their matching queue and ID.
Email rows with multiple actions use the shared Actions menu, with one indicator;
the sole history action stays directly visible. Resend confirmation has distinct
header, body and footer regions.

Actual checks:

- TypeScript passes after the final component and regression-source edits.
- Scoped ESLint passes across changed navigation, queue, route and regression
  files, including a final focused pass after the menu updates.
- Documentation generation/check passes with 56 guides and corpus
  `f798930331ad`; Phaeno guide review date is October 12.
- Customer message references remain valid at 5,780 English entries. This
  Phaeno workspace does not extend localization beyond Customer.
- `git diff --check` passes.
- Browser inspection uses the real local application and existing mock session.
  Desktop keyboard opening reveals the menu entry and reaches Mailing list;
  sidebar selection opens Demo requests without mounting a duplicate tab strip.
  At 390 × 844, the user tray contains the same entry, the edge tab opens the
  sidebar, Enter selects the queue and closes the rail, and document width
  remains 390 px. The page has zero tab controls.
- An old `dashboardSection=webOps` link with a valid request UUID redirects to
  Website operations and selects Demo requests with View all demo requests.
- Selecting a Customer organization removes internal navigation; opening the
  workspace directly after session hydration displays the access message and
  omits the queue/sidebar. The original local Phaeno context is restored.
- A fresh page after restarting the task's preview reports zero browser errors.
  The earlier hot update from an h3 queue heading to h2 caused a development
  hydration mismatch; it is absent on the final fresh load.

Screenshots are retained locally in
`output/website-operations-20261012/desktop-mailing-list.png` and
`output/website-operations-20261012/phone-demo-requests.png`.

Automated regression execution is deferred under the repository's request-only
policy. Added/updated sources cover menu permissions, direct-route denial without
queue reads, validated bookmarks, matching notification destinations, independent
pages, sidebar-only rendering, and email recovery menus. Browser inspection with
mock data does not establish connected API, real Clerk, email-provider or hosted
acceptance. No real intake completion, unsubscribe, email send, worker change,
model/migration, Git mutation or deployment occurs in the initial implementation
checkpoint.

## Subsequent requested release

The Owner then requested commit, push and deploy. Source `dedae5d2` and matching
API/frontend are live under the
[release receipt](../../operations/portal-website-operations-test-release-20261012.md).
Release builds, no-change EF check, protected scanner smoke, health, authorization,
source/alias metadata and authenticated Phaeno menu/both queues pass. Regression
suite execution is not claimed by that release verification.
