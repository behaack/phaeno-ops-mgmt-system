# Service workspace navigation restructure

Approved October 3, 2026. The Product Owner approved separating commercial service work by subject domain, moving cross-workflow attention to the Dashboard, and placing release work with the laboratory. The follow-up explicitly requires domain routes for lists and records.

## Final navigation decision

The Product Owner refined the approved structure: retain one **Order Ops** main-menu destination and one **Order operations** sidebar, using the same grouped heading presentation as CRM. **LAB SERVICES** contains **Order intake** and **Trial projects**. **PARTNER SERVICES** contains **PSeq kits** and **Data assembly**. All four sections and record/create/edit pages use routes beneath `/order-operations`. Finance, Legacy integrations, Dashboard attention and Lab result release retain their separately approved placements.

## Finance sidebar refinement — October 3, 2026

The Product Owner requested the five Finance pages in the sidebar instead of the tab control. Use the shared WorkspaceSidebar for Finance lists and records, with sections filtered by the existing Billing/Cash/Reconciliation capabilities. Keep the Finance routes, Customer filters and record return context. Remove the duplicate tab navigation and tab-panel semantics. Verify all five entries for a combined role, role-specific section visibility and retained filters. Automated tests remain unexecuted unless requested.

Local checks pass: scoped ESLint, TypeScript, documentation generation/consistency (56 guides, corpus `1ba680c962a4`) and diff whitespace. Authenticated browser navigation confirmed all five sections, no tab bar, retained Customer search and Customer-record return with the sidebar present. Screenshot capture timed out, so this is browser navigation/semantic evidence without a visual screenshot. Narrow-viewport and automated suites were not run. Added Finance sidebar role/filter regression source and a desktop/narrow E2E scenario; updated existing Finance panel assertions and Phaeno help.

## Lab Ops grouping refinement — October 3, 2026

The Product Owner approved the proposed task-based Lab Ops structure. **Jobs** remains the first, ungrouped overview of open/closed laboratory work, deadlines and samples, and is the default landing section. **SAMPLE PROCESSING** contains **Sample receipt & accession**, **Library prep**, **Sequencing batches**, and **Data assembly**. **RESULTS** contains **Results & scientific review** and separately authorized **Result release**. **LAB PREPARATIONS** contains **Master mixes** and **Reagent manufacturing**. **KITS & FULFILLMENT** contains **Transportation kit requests**, **Transportation kit inventory**, and **PSeq kit fulfillment**. Use the shared CRM-style group headings and responsive sidebar.

Extract the existing Kit requests / Fulfilled requests queues from Receipt & accession into `section=kit-requests`, preserving request/shipment search, status, page, shipment identity, details and return links. Sample receipt retains Receive shipments / Accession samples and defaults to receiving. Saved receipt/inventory bookmarks that select kit requests redirect to the new owning section with filters intact; sample accession and inventory bookmarks continue to select their tasks. All routes remain beneath `/lab-operations`. Data assembly retains both Sequencing runs and Partner Assembly cases. Scientific review, publication, execution permissions and all business actions remain distinct and unchanged. No API, persisted model or EF migration change.

Acceptance: Jobs appears once above the four groups; all twelve authorized destinations are correctly ordered; requests are absent from sample receipt; each queue retains its filters and return context; release-only staff receive only Result release without general Lab queries; keyboard, scrolling and narrow-screen access use the shared sidebar. Update the Phaeno guides and regression source. Automated suites remain unexecuted unless requested; scoped lint, typechecking, documentation consistency and manual local browser review are the checkpoint.

Local verification: TypeScript and scoped ESLint pass; documentation generation and consistency pass for 56 guides, corpus `020eb0a38dec`; diff whitespace passes. An authenticated local browser confirmed Jobs as the landing overview, the four headings and twelve destinations, standalone request/shipment queues, request search retained across queue switching and request-detail return, the saved request bookmark redirect with filters, and receiving selected by default with only receiving/accession task tabs. Desktop screenshot review confirmed the existing sidebar styling and scrollable groups. At 390 × 844, the edge tab opened the grouped rail and selecting Transportation kit requests closed it and opened the correct section; the viewport override was reset. Existing business records were viewed only. Automated suites and role-specific authenticated acceptance were not run; role-isolation regression source is maintained.

The Lab grouping browser review also recorded hydration warnings for an extension-injected `cz-shortcut-listen` body attribute and an extension messaging error. The visible navigation checks passed; this evidence is not a claim of an extension-free clean console.

## Users and workflow

Phaeno commercial staff use **Order ops → LAB SERVICES** for paid lab Order intake and no-charge Trial projects. **Order ops → PARTNER SERVICES** contains the commercial PSeq kit and Assembly queues. Lab operators and Release Managers use **Lab ops**, with separate **Results & scientific review** and **Result release** sections. Finance staff use **More → Finance**. Platform administrators recover legacy connector and delivery failures through **More → Legacy integrations**. **Dashboard → Needs attention** summarizes authorized unresolved work and opens its full assignment/recovery queue through **View all**. Notification read/unread state does not resolve operational work.

External Customer and Partner Lab services and Prospect Trial access retain their existing audience-specific behavior. Trial approval, scientific review, release, billing, tenant scoping, assignment and audit rules remain unchanged. Release-only staff must not load general Lab APIs or receive Lab settings access. Finance-only staff retain a Finance landing destination.

## Routes and retained bookmarks

- `/order-operations/lab-services`: staff Order intake. Existing external `/lab-services` remains audience-specific.
- `/order-operations/lab-services/orders/new`, `/order-operations/lab-services/drafts/$orderId/edit`, `/order-operations/lab-services/intake/$orderId`, `/order-operations/lab-services/orders/$orderId`: staff lab commercial work.
- `/order-operations/lab-services/trials` and its Trial detail/scope routes: Trial work for authorized audiences.
- `/order-operations/partner-services`: commercial queues; `/order-operations/partner-services/pseq-kits/$orderId` and `/order-operations/partner-services/data-assembly/$orderId`: records.
- `/lab-operations/result-release` and `/lab-operations/result-packages/$packageId`: governed release work.
- `/finance` and `/finance/$kind/$recordId`: Finance list and records.
- `/legacy-integrations`: connector and delivery recovery.
- `/dashboard/attention`: complete authorized operational attention and CRM sale-summary recovery.

Old `/order-operations` and `/trial-projects` bookmarks redirect to the appropriate canonical subject route, retaining applicable search state and identifiers. The Order Ops landing route selects an authorized domain section; moved auxiliary bookmarks redirect outside Order Ops. All application links use canonical routes. Existing Customer `/lab-services/$orderId` routes remain unchanged.

## Acceptance and verification

- One visible Order Ops toolbar/menu destination per viewport; Finance and Legacy integrations appear only in More.
- One sidebar uses CRM-style LAB SERVICES and PARTNER SERVICES headings, containing Order intake, Trial projects, PSeq kits and Data assembly. Auxiliary sections are absent.
- Role filtering remains capability-based; each mounted panel enables only authorized queries.
- Result release appears beside Results & scientific review for authorized users; release-only staff see only their section.
- Canonical record links and return paths retain list filters; old bookmarks redirect without creating or modifying records.
- Dashboard attention handles empty, loading, unavailable and disabled-feature states; administrators retain CRM recovery without calling an unauthorized operational-attention API.
- Update affected Phaeno/audience help and documentation registry/corpus; preserve record identifiers and backend contracts. No persistence change or EF migration.
- Add focused navigation, domain-route, role-isolation and browser regression coverage, update living test plans, and run only checks within the requested verification scope.

## Local verification — October 3, 2026

- Scoped ESLint and TypeScript checks pass. Documentation generation and consistency check pass for 56 guides (corpus `671ef4cb0022`). `git diff HEAD --check` passes.
- Authenticated local browser navigation verified LAB SERVICES / PARTNER SERVICES headings, all four canonical sections and a nested Lab order record with its return link. Verified More → Finance and the presence of Legacy integrations, Lab result release, and Dashboard → Needs attention → View all.
- The exact reported Result release bookmark returns HTTP 200 and redirects to `/lab-operations/result-release`. The local frontend was restarted after moving routes to clear a stale Vite route graph; diagnostic frontend instances were stopped.
- Role-isolation and redirect regression tests were added or updated. Automated tests and narrow-viewport acceptance have not been run for this navigation change. Result release is feature-disabled in the current local installation; its unavailable state renders, so release business actions were not exercised.

## Release boundary

Local implementation only. No Git mutation, deployment, migration or production data change is authorized by this navigation approval. Preserve concurrent staged and unstaged changes.

## Pinned sidebar footer correction — October 3, 2026

The shared footer was outside the workspace's pinned-sidebar offset, leaving the copyright beneath the fixed panel. Apply the existing 16rem clearance to the root footer whenever a pinned workspace is present in the 1024–1691px layout range. Wider centered layouts, unpinned rails and narrow drawers retain their current spacing and behavior. This CSS-only correction covers every workspace using the shared sidebar; routes, records and business actions do not change. Reviewed the Phaeno getting-started guide: its navigation instructions remain accurate, so no guide/corpus update is needed.

Authenticated local browser checks pass at actual CSS viewport widths of 1025, 1137, 1422 and 1700px with the sidebar pinned, and at 1422px unpinned. Copyright and Help and documentation stay within the viewport and clear the pinned panel, with no horizontal overflow. At 390 and 320px the footer reflows without a pinned offset or horizontal overflow. Escape dismisses the narrow drawer and returns focus to its edge tab. Restored the original pinned preference and cleared temporary viewport overrides. Automated suites were not run for this layout-only slice.
