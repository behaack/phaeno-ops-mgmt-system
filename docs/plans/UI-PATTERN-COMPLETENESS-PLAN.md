# Portal UI pattern completeness

Owner authorization: October 22, 2026. Address all five opportunities from the
gallery review, including the inconsistent sequencing input/assembly list titles.

## Product scope and acceptance

Users are Portal users finding records, reviewing details and completing bounded
forms, plus engineers reviewing the gallery. Repeated patterns must communicate
the same purpose with the same visual hierarchy and keyboard behavior. Existing
permissions, destinations, URL state, scientific statuses, draft guards and save
semantics remain authoritative. Success is demonstrable reuse in the app and
gallery, protected by focused source and browser checks.

1. **Headers:** introduce shared page title/header composition with wrapping
   identity, contextual description/status and separate Actions. Adopt consistent
   title styling across Portal feature pages and the shared header in record and
   workspace headers. Preserve IDs, refs and focus targets.
2. **Lists/tables:** enforce one record-link appearance across existing record
   destinations; share flat divided rows, toolbars and table containment. Align
   the two sequencing lists while retaining their distinct metadata, progress
   and sole Start action. Demonstrate filters, no matches, mobile records and
   real pagination without altering each feature's query/state rules.
3. **Form dialogs:** demonstrate the actual guarded form and Portal discard
   confirmation with required footer, pristine/dirty/pending, failed save and
   retained input. Preserve existing workflow-specific validation and concurrency.
4. **Feedback:** supply shared loading/refresh, empty/no-match/setup/permission
   and retry presentations. Reuse them in the sequencing and research surfaces;
   show existing upload/workflow progress with textual meaning and both themes.
5. **Controls/navigation:** add missing checkbox, multi-select, pill toggle,
   button variant/size/icon, searchable-selection states and actual sidebar/
   navigation examples. Use fictional data and local providers only; no live API
   or authentication. Keep the gallery isolated from production routes/assets.

## Engineering and verification

Reuse installed dependencies and semantic tokens. Shared components own recurring
visual treatment; feature code owns labels, domain meaning, permissions and
destinations. Inventory and preserve routing/event props during conversions.
Extend bounded AST rules for recognizable record links and page titles without
inventing allowances. Add focused tests for new behavior and gallery coverage;
run the requested guard/browser checks, lint, TypeScript, docs consistency and
production build at a logical checkpoint. Update the UI guide, affected Phaeno
help if needed, and living frontend/E2E plans with actual evidence and limits.

This phase does not introduce dependencies, authentication, API/model changes,
migrations, Website changes, business data writes or a new deployment. Snapshot
baselines may supplement geometry/interaction checks only when generated in a
reproducible browser environment; never claim screenshots alone establish all
feature or accessibility acceptance.

## Completed implementation and verification

- Standardized 89 screen-heading declarations using `PageTitle`/`PageHeader` and 155
  record-link call sites across Portal features/routes. Research headers and
  Company/assembly headers use shared composition. Authentication/invitation,
  documentation article and print hierarchies remain separate. Whole-card
  Company opportunity, Dataset and source-sample links now place their existing
  destination on the record title, preserving the metadata as view-only context.
  The shipping packet's marked `data-print-document` article retains its native
  document heading and existing print typography/color inheritance; applying a
  screen-heading foreground there would interfere with its black-on-white print
  treatment. This document role is recognized explicitly by the source guard.
- Sequencing inputs and assembly jobs share `RecordListItem`, including title
  style, divided rows, metadata and wrapping trailing status/actions. Search
  uses the common toolbar/field spacing. Existing Start guards remain; unavailable
  processing and active work have visible reasons. Failed availability checks
  have a named retry instead of remaining indistinguishable from loading.
- Common table/toolbar adoption includes Research and commercial list filters.
  Existing URL-backed feature state and distinct scientific/commercial statuses
  remain unchanged. Shared loading/content states are adopted by sequencing and
  Research. Original asynchronous and permission rules remain feature-owned.
- The gallery now has 13 sections covering all five areas. It mounts the actual
  guarded form and Portal discard dialog with local Query/Router providers,
  including pristine/dirty/pending/save-error/conflict examples. Remaining
  controls, semantic tokens, upload/workflow progress and actual desktop/mobile/
  sidebar navigation use fictional data. Navigation destinations remain local
  to the gallery. No authentication or API is connected.
- Extended source guards without expanding the two scanner-step allowances.
  Portal CSS scanning is explicitly scoped to app sources; gallery CSS includes
  its own examples. `ui:build:check` and UI quality CI verify separate build
  outputs, catching both JS and CSS leakage. Automated browser verification uses
  port 4319 so the interactive gallery on 4318 stays available.
- Navigation screenshot review identified a closed-tab overlap with the leading
  return arrow on narrow layouts. A stable, screen-only 36 px gutter below
  1252 px clears that control without changing position when the rail opens or
  closes. Wide-screen centering, pinning, focus behavior and print remain
  separate. The navigation browser case verifies non-overlap and stable return
  position through open/Escape close.

| Verification | Result |
| --- | --- |
| AST guard regressions | 23/23 pass |
| Source guard | Pass: 745 files, unchanged two exact scanner exceptions |
| Focused feature/navigation components | 18/18 pass across AssemblyJobs, UserMenu and WorkspaceSidebar |
| Gallery browser suite | 60/60 pass: desktop/phone, light/dark, 320 px containment |
| Automated accessibility | No violations in four gallery and two open mobile-tray scans |
| API/browser isolation | Expanded browser cases observe no API traffic or page errors |
| Routing/focus preservation | All 337 Link prop sets and four heading targets preserved in 132 touched source files |
| TypeScript and full lint | Pass, zero lint warnings |
| Production and gallery builds | Pass; gallery's local-only 1.1 MB bundle retains an advisory chunk warning |
| Build isolation | Pass: 837 production text artifacts exclude gallery markers; three separate gallery artifacts retain them |
| Help consistency | Existing 62-guide corpus unchanged and matching at `89e4a753a7d9` |

The first expanded checks found an overlong demonstration badge; its compact
status and separate scientific-review explanation now wrap correctly. Older
gallery assertions were scoped to their owning example as coverage expanded.
Radio-group verification holds the arrow key through Radix's deferred focus,
then releases it, matching physical keyboard sequencing.

The React review checks composition, hook order, explicit control names,
focus/disabled behavior, data ownership and stable source imports. Shared
components add no server state, dependencies or authorization decisions. User
guides were reviewed: primary-identifier navigation and sequencing actions are
already documented; their workflow instructions and search corpus need no change.
Screenshot review and final housekeeping are recorded before handoff below.

Final visual review inspected neutral sequencing-list titles side by side,
narrow dark headers with a long identifier, a dark failed-save dialog with its
required/action footer, and narrow navigation after the edge-tab clearance fix.
Controls wrap and the return arrow remains visible. Updated navigation tests
pass in all four theme/viewport projects after that fix; the full 60-case pass
and four neutral-title captures remain recorded separately. Selected review PNGs
are retained in the chat's visualization folder. Temporary conversion copies,
isolated gallery build and browser output are cleaned after their evidence is
retained; the running interactive gallery cache and standard app build remain.

These are local changes and verification. No new Git publication, deployment,
database migration, hosted data write or Website change has occurred. Gallery
fixtures are not whole-app authenticated or full screen-reader/WCAG acceptance;
scientific/provider/commercial qualification remains outside this UI work.

## Notification badge follow-up — October 22, 2026

The Owner requested a closer badge placement and continued review of remaining
standardization opportunities. The badge presentation is shared with the gallery
through `WorkBellButton`: the icon stays 20 px, the button stays 44 px, and the
badge sits at the bell's upper-right with a 2 px inset from the button edges.
This moves numeric badges 4 px left/down from the previous button-edge anchor.
The gallery demonstrates zero, `1`, `12`, `99+`, unavailable and header-context
states. The live count, localized name, live-region announcement and existing
dialog/focus behavior remain owned by `WorkBell`.

The additional review is read-only outside this badge/gallery/checks change.
The code findings below were the review's proposed work. The subsequent
six-area authorization and completion below supersede that original boundary.

Verification: 12/12 focused gallery cases pass on the normal checked-in
configuration (desktop/phone, light/dark), including count geometry/containment,
44 px targets, keyboard activation, 320 px reflow and four whole-gallery axe
scans. The four navigation cases pass again after the local example dialog
received a body description; its four open-dialog axe scans report no
violations. The existing work-attention fixture suite passes 10/10 cases,
including full/capped/unknown counts, Customer pseudolocalization, scope,
completion refresh, dialog focus and recovery. Targeted ESLint, TypeScript,
the source guard (746 files, same two exceptions) and standalone gallery build
pass. Numeric badge and narrow dark navigation captures were visually reviewed.
The full expanded gallery and authenticated app acceptance were not rerun.

The initial nested package-runner gallery startup timed out. Using the direct
Vite executable, as in the main E2E configuration, passes on the normal test port
and avoids that local launcher delay. A temporary fallback configuration was
removed. The test process points explicitly at the existing local browser
installation; no browser/dependency was installed and CI setup is unchanged.
Scoped whitespace checks pass. The pre-existing staged snapshot has whitespace
diagnostics outside this follow-up; it and all Git staging remain untouched.
Selected screenshots remain in the chat visualization folder; task-owned build
and browser output are cleaned after review. No commit or deployment occurred.

## Further standardization review — October 22, 2026

The following opportunities are verified in current source. This is a bounded
review, not a claim that every page or permission-specific state was rendered.
The existing primitives and thirteen gallery sections are implemented; remaining
adoption and page-level checks are distinct from gallery completeness.

| Priority | Opportunity and current evidence | Recommended scope |
| --- | --- | --- |
| 1 | **Complete form-control adoption.** `CrmAdministrationPage.tsx` still defines a 36 px category select beside shared 32 px inputs; `LabManufacturingPage.tsx` has a local 36 px status select and label margins. `InviteUserForm.tsx` has a raw role select and literal required asterisk. | Adopt `Field`, `NativeSelect`, shared required/error treatment and checkbox primitives in bounded form families. Preserve permissions, validation, submission and draft guards; compare rendered alignment at narrow widths. |
| 2 | **Data formatting and units.** `DatasetDetailPage.tsx` and `SourceSampleWorkspace.tsx` divide bytes by 1024 but label them KB/MB; `ResearchNotebook.tsx` uses KiB. Date/time helpers mix browser locale and US English with different precision. | Share byte and date/time display policies, including visible units and timezone context where consequential. Retain exact byte evidence, scientific precision, Customer locale behavior and date-only semantics (`calendar-date.ts` already preserves the recorded day). These differences do not establish a timestamp conversion defect. |
| 3 | **Status presentation.** `OrderStatusBadge.tsx` chooses variants through substring matching; provisioning and governance each define local status-to-variant functions. The shared `Badge` owns shape, not domain meaning. | Define a semantic status presentation vocabulary and explicit domain mappings. Keep simulated/physical, scientific/release, cancelled/failed and warning/error meanings distinct; preserve status labels and transitions. |
| 4 | **List controls and feedback adoption.** CRM's `CrmListPagination` uses a separate small-button paginator, retained releases use a count-free Previous/Page/Next footer, and clear controls vary between `Clear all` and `Clear filters`. Provisioning still defines local `EmptyState`/`QueryError` presentations. | Share footer/button/clear-label presentation and adopt existing content states. Preserve URL state, debounce, return position and feature retry behavior. Count-free feeds must remain count-free unless their API already supplies totals; do not invent totals or change list contracts for appearance. |
| 5 | **Read-only detail fields and section hierarchy.** Company detail defines local boxed `Info` and unboxed `Meta`; Assembly input revisions define their own inline definition-list fields. | Add a small detail-field/summary pattern for labels, value spacing, long identifiers, missing values and metadata. Allow meaningful hierarchy and scientific comparison layouts rather than forcing every field into a box. |
| 6 | **Page-level visual coverage.** Current gallery screenshots are review artifacts; focused geometry and interaction tests cover shared patterns, with no approved pixel baselines for assembled pages. | Add reproducible visual baselines for representative list/detail/modal pages in both themes and narrow/desktop layouts. Include long identifiers and Customer pseudolocalization. Keep authenticated acceptance, screen-reader review and intentional scientific exceptions explicit. |

The original recommendation was to begin with priorities 1 and 2: they address visible
control drift and ambiguous file-size labels. Follow with explicit status
mapping and measured adoption of the existing list/feedback patterns. No wider
refactor, dependency, authentication, API, data-model or deployment change is
authorized by that review alone. The Owner subsequently authorized all six.

## Six-area implementation - October 22, 2026

Owner authorization now covers all six findings and their gallery/automated
checks. Users, workflows and acceptance remain those recorded above. Implement
shared native-select/checkbox and field presentation without changing form
events, validation, draft or permission rules; shared byte/date/number display
without changing recorded values, calendar days or scientific precision;
semantic status tones with explicit feature mappings; counted/count-free
pagination and clear/feedback presentation preserving each query contract;
accessible read-only detail fields; and reviewed page-image baselines.

Pixel comparisons use a dedicated Windows Chromium configuration and Windows
CI job, with bundled fonts, fixed locale/timezone/motion/viewport and fictional
data. Geometry, interaction and axe checks remain cross-platform. Baselines are
reviewed images, never generated automatically during CI; they cover assembled
list/detail/modal pages, long identifiers and expanded Customer text. This
avoids comparing Windows-generated baselines against Linux rasterization.
No dependency, auth, API, data model, migration, Git publication or deployment
change is included. Verification is requested: batch source invariants, focused
behavior and browser checks, lint/type/docs, builds and visual comparisons.

### Implemented scope

All six items are implemented locally. Their success criteria are shared
presentation across adopted call sites, preserved workflow behavior and data
meaning, inspectable gallery examples, and checks that detect future drift.

1. **Controls and validation:** 54 native selects and 80 native checkboxes now
   use the shared primitives; 275 compatible field groups use `Field`. Removed
   local height/chrome constants and required-marker/legend variants. Native
   props, registration, callbacks, refs and disabled/permission rules remain.
   The existing 44 px invitation challenge input uses the explicit touch size.
   Reserved error space prevents blur validation moving a pending Save action.
2. **Data presentation:** shared date, timestamp, number, currency and byte
   formatters replace 47 local implementations across 36 files. Calendar days
   do not shift with timezone; timestamps show timezone context. Binary sizes
   use B/KiB/MiB/GiB, while exact byte evidence remains available. Precise small
   decimals, zero, false, missing values and Customer locale remain distinct.
3. **Status meaning:** `StatusBadge` supplies six semantic tones, including new
   light/dark success tokens. Commercial status mappings are explicit and
   checked against current backend enums; provisioning/governance use typed
   exhaustive maps. Unknown statuses stay neutral. No transitions or scientific
   release qualification changed.
4. **List controls and recovery:** shared counted/count-free footers and
   `ClearFiltersButton` align paging and reset controls. CRM retains its query
   contract; retained releases retain zero-based URL pages and 50-record API
   offsets without invented totals. Provisioning/governance/manufacturing use
   shared loading, empty and retry states, preserving permissions and reset
   scope. Organization-specific retry queries require a selected organization.
5. **Detail hierarchy:** `DetailSummary`, `DetailField` and `DetailHeading` are
   adopted in Company, Dataset and Assembly input-revision summaries/sections.
   They use semantic definition lists, wrap long identifiers, allow plain/boxed
   hierarchy and render zero/false/missing values accurately.
6. **Page-image coverage:** 24 manually inspected Windows Chromium baselines
   cover list/detail/modal pages, normal/expanded Customer text, long identifiers,
   desktop/phone widths and light/dark themes. Bundled font, locale, timezone,
   motion and viewport are fixed. Normal runs never update images. A reviewed
   manifest pins their hashes/dimensions and browser/font versions; a dedicated
   Windows CI job compares them. The ordinary geometry/interaction suite remains
   cross-platform. No dependencies were added.

The gallery now has fifteen sections with actual native form registration,
conditional confirmation focus, status/data/detail examples and assembled page
previews. Production source/build checks exclude both gallery routes and styles.
The source guard now rejects raw select/checkbox controls, local sizing/chrome
overrides, duplicate format implementations and required/clear drift; its two
scanner-step exceptions are unchanged.

### Interaction corrections found during verification

R&D's narrow section table is contained within the editor so it cannot overlap
Save. Per-field blur validation remains progressive; the global summary appears
on invalid submission and receives focus after rendering. The fixture test now
explicitly serves its HTML rather than accidentally testing the app catch-all.

Shared dialogs distinguish their own closing content from a newly opened overlay
and restore focus to a surviving trigger after conditional menu items disappear.
Menus retain opening feedback and dismiss immediately. Their former closing
layer could consume a rapid menu reopen after Cancel; immediate dismissal removes
that race. Queued menu/dialog focus restoration preserves the next overlay.
The completion/Cancel/reopen flow passes three consecutive runs on both desktop
and phone; final R&D business-interaction checks also pass.

### Verification and limits

- Full frontend suite: **257 files, 1,572 passed, three existing skips**. Final
  small menu/focus/retry/byte refinements are covered by a subsequent **27/27**
  targeted component/dialog/R&D checks (including the 15 standardization tests).
- Final gallery: **84/84** across desktop/phone and both themes, including
  native validation, 320 px containment, keyboard/focus, guarded drafts and axe.
- Final reviewed page-image comparison: **24/24**, with updates disabled.
- Actual feature fixtures: **22/22** across desktop/phone for provisioning,
  R&D validation/dialogs/drafts and CRM unavailable/recovery behavior.
- Fourteen audience-specific guides and registry metadata are updated for reset
  labels, time/calendar meaning and binary units. Generated help corpus:
  **62 guides, `33311a4e2057`**; Customer message references and corpus check pass.
- Final lint, TypeScript, source regressions, production/gallery builds,
  build isolation and property-conservation evidence are recorded in the local
  task verification logs. The living frontend/E2E plans track these checks.
  The guard scans **750 sources** and its **26 regressions pass**. Build isolation
  checks **843 production artifacts and three gallery artifacts**. AST comparison
  of **196 changed original TSX files** preserves **314 native-control property
  sets and 266 typed router-Link property sets**, with no conservation failures.

The GitHub workflow is configured locally, including backend status-enum path
triggers; this expanded phase has not been pushed or run remotely. These are
representative visual/fixture checks, not every authenticated page, a full
assistive-technology audit, scientific/provider acceptance or commercial sign-off.
No Git publication, deployment, migration, hosted write or Website change occurred.

### Subsequent authorized release

The Owner subsequently requested commit/push/deployment of these changes. Source
`669b9336` is now live in both Portal API and frontend, with exact-source CI
passing both jobs, 84 gallery cases and 24 reviewed image comparisons. The initial
Windows CI run exposed small light-theme glyph-edge color differences; threshold
0.15 retains the 80-pixel budget and reviewed images, passes CI, and still rejects
a deliberate 1 px layout shift. Signed-in bell/filter/list/detail/Actions/help
smoke and full data/file preservation pass. The gallery remains engineering-only.
See the [preserving release receipt](../operations/portal-ui-patterns-test-release-20261022.md).
