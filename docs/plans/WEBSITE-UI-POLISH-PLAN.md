# Website UI polish

## Clarity follow-up — 2026-09-06

The Product Owner authorized the six presentation improvements in
[Website clarity and polish](WEBSITE-CLARITY-AND-POLISH-PLAN.md). This follow-up
was implemented, verified locally, and deployed to Website production after
explicit authorization. Its release and rollback record is in the linked follow-up plan;
the historical API release authorization below does not apply to it.

- Mobile homepage cards size to their content with reduced padding; desktop
  retains two columns.
- Technology pages use smaller phone headings, explicit heading/copy spacing,
  and non-sticky section navigation. PSeq links to the published platform
  white paper; White Papers precedes Blog in the active header and footer.
- The updates form names the optional technical brief and reflects its
  selection in the submit label. Demo links use “Request a demo”.
- Existing preliminary-data and RUO qualifications appear alongside the
  performance highlights; a link leads to comparison notes. Pending validation
  uses neutral text. Filled orange actions are reserved for demo requests.
- Website README documents the delivered presentation. Build (17 pages),
  responsive checks at 1440/768/390/320px, 200% text checks, keyboard links and
  forms, and comparison expansion/no-JavaScript behavior passed locally.
  Enlarged layouts also correct intrinsic-width constraints in the header,
  footer, contact bands, and science cards; anchor scrolling respects reduced
  motion. Detailed evidence and local-preview limitations are recorded in the
  follow-up plan. Scientific copy, numerical values, public routes, and
  publication boundaries are preserved. The subsequent Website release uses a
  retained production deployment and source tag as its rollback checkpoint.
  Public verification passed for all 16 sitemap routes and 25 responsive
  cases, plus keyboard/contact and publication-boundary checks. The released
  application commit is `a0d8a96`; the linked plan records exact deployment
  identifiers and the rollback command. Portal production remains unchanged.

## Status

Implemented and reviewed locally on 2026-09-04. The owner lifted the release
hold and explicitly authorized commit, push, Website UI deployment, and API
redeployment with required EF migrations. Release preflight is complete;
production completion requires deployment and public verification below.

## Scope and acceptance

The Product Owner authorized the seven improvements from the Website review
on 2026-09-04. The audience is prospective research teams and readers of
Phaeno's technical material. The goal is quicker scanning and clearer actions
on desktop and phones, retaining the current scientific claims, public routes,
form requirements, and publication boundaries.

- Keep the homepage headline readable at 320px and 390px without awkward
  breaks within “isoform-resolved” or horizontal overflow.
- Reduce inner-page banner height while allowing long titles to grow naturally.
- On phones, show three key comparison metrics and a keyboard-operable control
  for all 14. Desktop and no-JavaScript views retain the full table. Preserve
  all comparison content and make its qualifications easier to read.
- Mark required fields in both contact forms, expose required/error state to
  assistive technology, and place a visible required legend before the actions.
- Use the existing orange accent and pill shape for demo actions.
- Reduce white-paper thumbnail dominance and label the numbered parts; point
  readers of the empty Blog page to published white papers and signup.
- Correct the footer email action to use `mailto:`.

## Implementation decisions

Use the existing Astro components, semantic tokens, and React Hook Form/Zod
validation. Enhance the existing comparison table rather than duplicate its
scientific content. Derive publication part labels from existing numbered
slugs, without altering the content schema or publication metadata.

The Website implementation adds no dependency, API, authentication, database,
or publication-contract changes. Portal audience guides are unaffected;
Website README guidance describes the public-site presentation changes.

The required markers exposed an existing global `label > span::before`
checkbox rule. The selector now requires an adjacent checkbox input, removing
boxes from ordinary labels while preserving the technical-brief opt-in.

## Verification

- Final Website build passed after the checkbox selector correction (17 pages,
  10.81 seconds). `git diff --check` passed. Existing empty Blog/Jobs collection
  warnings remain.
- Desktop homepage retains 14 comparison rows and all three orange demo
  links. Phone comparison expands from 3 to 14 rows and collapses with Space,
  retaining visible keyboard focus.
- Homepage at 320px/390px fits without horizontal overflow or splitting
  “isoform-resolved”. The 390px hero is about 651px tall versus 844px before.
- White-paper desktop banner is about 205px versus 304px before. Titles now
  appear in the first 1280x720 viewport. All four part labels render; filtering
  “Part 3” returns only PSeq Data Pipeline. Phone cards fit without overflow.
- Long technology title fits its banner at 320px. Empty Blog navigation offers
  white papers and updates. Footer links use `mailto:`.
- Empty forms show all 5 demo / 4 signup errors with associated descriptions
  and focus the first invalid control. All 9 markers have no checkbox
  pseudo-element; the actual opt-in checkbox toggles. No valid form was sent.
- No browser console errors were captured during focused inspection.
- No-JavaScript fallback was reviewed in source: rows collapse only after
  script initialization. A JavaScript-disabled browser was not exercised.
- Broad suites, real form delivery, and full accessibility certification were
  not performed for this bounded presentation change.

## Authorized release

- Commit the reviewed Website changes and their documentation, then push
  `main`. Existing Git integration triggers the linked Vercel applications;
  verify the production Website deployment against the pushed SHA.
- Redeploy the API using `Deploy Portal Green` with `apply_migrations=true`
  and Clerk identity cutover disabled. The last successful API release was
  `409903850083a7de7ab74c7b43cd3472a9bf504f` (run `33822480070`).
- The current committed API includes `20260904171125_AddPeopleAndDepartmentAccess`,
  `20260904172710_ScopeServiceEntitlementsByDepartment`, and
  `20260904173717_ScopeDatasetGrantsByDepartment`. Existing records and access
  are backfilled into each organization's General department; nullable
  entitlement and dataset-grant scopes preserve organization-wide grants.
- Release solution build passed with zero warnings/errors. EF reports no
  pending model changes. The installed EF tool is 10.0.4 versus runtime
  10.0.10; its advisory did not prevent inspection.
- Use the workflow's verified encrypted database backup before applying
  pending migrations. Confirm applied migration IDs, successful workflow,
  deployed source SHA, HTTP 200 API health, and HTTP 204 database ping.
- Verify live Website desktop/mobile rendering, required-marker correction,
  comparison expansion, and publication-card presentation. Deployment health
  does not replace signed-in multi-department acceptance or real form delivery.
