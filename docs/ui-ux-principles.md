# Phaeno Portal UI/UX principles

Status: approved product policy.

This document is the durable source of truth for user-interface and user-experience decisions in Phaeno Portal. Its shared principles are intentionally aligned with the Clinical Diagnostics Platform. The product-specific profile at the end controls where the scientific portal genuinely differs.

These principles describe product behavior and outcomes. Codex owns the engineering implementation unless a choice materially changes product behavior, scientific meaning, business outcomes, regulatory obligations, cost, brand, or customer experience.

## Decision authority

The owner supplies the user, problem, workflow, scientific and business rules, risks, priorities, and acceptance criteria. Codex autonomously decides layout, component choice, spacing, responsive behavior, modal versus page implementation, validation mechanics, focus behavior, error presentation, loading states, accessibility mechanics, and detailed visual treatment within the established brand.

- Reuse an established pattern before introducing a new one.
- Do not ask the owner to choose among technical or visual alternatives unless the choice creates a true product tradeoff.
- When principles conflict, prioritize data integrity and safety, then accessibility, task clarity, consistency, speed, and visual polish.
- Record significant new patterns or exceptions. An exception requires a product or domain reason, not implementation preference.
- Detailed design authority does not expand task scope or override repository rules for plans, dependencies, authentication, migrations, deployment, or Git operations.

## Shared component style guide

Use this document for product-wide style and interaction decisions and the
shared frontend components for their implementation. Reuse these components
before choosing local sizes, colors, spacing or interaction behavior:

| Pattern | Shared implementation under `frontend/src/components/` |
| --- | --- |
| Page return navigation | `ui/back-link.tsx` — `BackLink`; see [page return navigation](#page-return-navigation) |
| Page identity and header | `ui/page-header.tsx` — `PageTitle` and `PageHeader` |
| Primary record identifiers | `ui/record-link.tsx` — `RecordLink` composed with the existing typed link |
| Lists, filters and tables | `ui/record-list.tsx` — `RecordList`, `RecordListItem`, `ListToolbar`, `RecordTable`; `RecordPagination.tsx`, `ui/pagination-footer.tsx`, `ui/clear-filters-button.tsx` |
| Loading, unavailable data and recovery | `ui/content-state.tsx` — `LoadingState`, `EmptyState`, `ErrorState` |
| Buttons and action emphasis | `ui/button.tsx` — `Button` and its existing variants/sizes |
| Contextual record actions | `ui/dropdown-menu.tsx` — `ActionMenu` with one labeled trigger |
| Form grouping, validation and required fields | `ui/field.tsx` — `Field`, `FieldError`, required-name/legend/footer patterns |
| Single-line fields and native checkboxes | `ui/input.tsx`, `ui/native-select.tsx`, `ui/native-checkbox.tsx`; shared sizing and focus |
| Status meaning and appearance | `ui/status-badge.tsx` — `StatusBadge` with explicit feature-owned tone maps |
| Read-only values and section titles | `ui/detail-summary.tsx` — `DetailSummary`, `DetailField`, `DetailHeading` |
| Modal layout and focus | `ui/dialog.tsx` — `Dialog`, header, meaningful body and footer |
| Record tabs | `ui/tabs.tsx` — shared sizing and selected/focus states |

Semantic theme tokens are defined in `frontend/src/styles.css`. Keep light and
dark treatments together. Feature pages own content and arrangement; shared
components own the recurring control's typography, padding, icons and states.
Document a new shared pattern here rather than creating independent variants
across features. The sections below define behavior, accessibility and permitted
exceptions; this table does not replace those requirements.

### Visual reference and automated enforcement

The [local component gallery](../frontend/ui-gallery/README.md) renders the
actual shared controls and theme tokens with fictional data. Use it to inspect
light/dark states, constrained content, keyboard behavior, validation and modal
regions. Run `pnpm ui:gallery` from `frontend/`. Keep examples and their focused
browser assertions aligned when an approved shared pattern changes.

`pnpm ui:check`, also included in frontend lint, checks recognizable page returns,
back-link overrides/arrows, contextual Actions, menu indicators, tab-control
sizing, native confirmations and gallery isolation. The independent UI quality
workflow runs the source guard, its regression fixtures and the gallery browser
suite. Findings include source locations and the applicable shared pattern.

Prefer fixing an inconsistency to granting an exception. Existing non-page
scanner returns have exact, reasoned allowances; stale or expanded allowances
fail. Syntax-aware checks are deliberately bounded and complement visual and
workflow review. They do not certify every page or replace acceptance criteria.

The gallery also demonstrates page headers, matched record rows/table links,
real pagination/filtering, the actual guarded form/Portal discard dialog, save
failure/conflict states, upload/workflow progress and remaining selection/button
controls. Its isolated navigation page uses the actual desktop menu, narrow user
tray and workspace sidebar with fictional props. No authenticated session or API
is connected. The [pattern-completeness plan](plans/UI-PATTERN-COMPLETENESS-PLAN.md)
records adoption and verification. Source guards additionally enforce shared
page titles, recognizable record identifiers and their visual ownership. They
also reject raw select/checkbox controls, local control-size overrides, duplicated
display-format implementations and inconsistent clear/required treatments.

The fifteen gallery sections now include real native form validation, date/time,
byte/number/currency display, semantic statuses, counted/count-free pagination,
detail summaries and assembled list/detail/edit pages. Dedicated Windows
Chromium comparisons cover 24 reviewed page images: desktop/phone, both themes,
and ordinary/expanded Customer text with long identifiers. These use bundled
fonts and fixed locale, timezone and motion settings. Normal checks never update
images; a deliberate image review and manifest update accompany visual changes.
This bounded page set complements interaction, geometry and axe checks; it does
not certify all application journeys or every assistive technology.

Use `frontend/src/lib/display-format.ts` for presentation of dates, timestamps,
numbers, currencies and bytes. Calendar-only values retain the recorded day;
timestamps show timezone context. Customer-facing formatting uses the Customer
locale through `useDisplayFormatters`. Binary file sizes use B/KiB/MiB/GiB,
not decimal unit names for powers of 1024. Preserve scientific precision, exact
byte evidence, zero and false. Missing data has an explicit label rather than
being converted to zero. These helpers format values without changing storage.

Status tones are neutral, info, pending, success, warning and error. Feature
maps choose the tone for each domain status; never infer it from fragments of
the label. Cancellation and failure remain distinct. Unknown statuses remain
neutral. A status badge never changes the workflow or release qualification.

Counted and count-free feeds share footer geometry while preserving their own
query contracts. Do not invent totals. Use `ClearFiltersButton` with the common
`Clear all` label unless a documented scope needs a more specific label. Retain
the existing reset scope, URL state and feature-specific retry callback.

Use `DetailSummary`/`DetailField` for recurring label/value presentation and
`DetailHeading` for section hierarchy. Allow plain or boxed summaries as the
information hierarchy requires. Long identifiers wrap, missing values remain
explicit, and meaningful zero/false values remain visible.
The bell examples use `features/work-attention/WorkBellButton.tsx` and include
zero, one-digit, two-digit, capped `99+` and unavailable
counts. Anchor the badge to the bell icon's upper-right corner; keep it inside
the 44 px button with a small inset. Count growth must not move the bell or its
click target. The full count stays in the localized accessible button name.

## Experience posture

Design for trained professionals who use the product repeatedly while keeping standard workflows understandable without formal training.

- Use **POMS** as the application name when the selected organization is
  Phaeno; it expands to **Phaeno Operations Management System**. Use
  **Portal** in Prospect, Customer, and Partner contexts and before an external
  organization is selected. Keep the browser title, application chrome,
  accessible home name, dashboard, and audience-specific help aligned with the
  current context. The footer uses the legal ownership line **Copyright ©
  [current year] Phaeno Inc.** in every context.
- Favor a balanced expert-first experience rather than consumer-style oversimplification or an intimidating power-user interface.
- Use moderate-to-high functional density. Whitespace should clarify grouping and hierarchy, not serve as decoration.
- Provide efficient repeat workflows, keyboard-friendly behavior, and progressive disclosure of advanced options.
- Use guided steps only when sequence, safety, scientific validity, or business rules require them.

## Devices and responsive behavior

Phaeno Portal is desktop-first and fully responsive.

- Optimize complex creation, editing, analysis, and record management for laptops and desktops.
- Keep tablets fully functional.
- On phones, prioritize lookup, status review, notifications, and simple actions instead of compressing complex tables and long forms into unusable replicas.
- Render primary navigation once per viewport: inline when wide and in the menu when narrow. Documentation stays in the user menu at every screen size. On narrow screens, that menu is a full-width tray sliding in from the right, with a fixed title and visible Close action, a scrolling body, modal focus containment, Escape dismissal, and focus return to its trigger. Respect reduced motion. Keep the mobile header divider full width, center the logo and menu control vertically, and keep the hamburger at the toolbar edge with an 8 px inset and a 44 px touch target.
- Preserve information and functionality during zoom and reflow. Allow two-dimensional scrolling only where the content genuinely requires it, such as a complex data table or scientific visualization.

## Information architecture and navigation

Use task-oriented entry points with record-centered workspaces.

- User dropdown labels use sentence case: capitalize only the first word, preserving acronyms and product names such as CRM and PSeq (for example, Order settings, Sample shipping settings, and Sign out).

- The home experience should answer, "What needs my attention?"
- Owner-approved direction, October 11, 2026: replace the current dashboard
  panel experience with a useful role-aware work dashboard and a header bell
  backed by the same authorized work list. Phaeno staff default to assigned
  work plus eligible unassigned work, with a separate authorized team view.
  The bell counts unresolved actionable obligations; viewing an item does not
  complete it. Keep available results and other informational updates distinct
  from required actions. Customer home distinguishes the user's actions from
  work awaiting their administrator or Phaeno. Complete counts, exact record
  links, priority, ownership, freshness and unavailable states are required.
  This direction supersedes the former four-panel home policy; implementation
  is tracked in [Work dashboard and notifications](plans/WORK-DASHBOARD-AND-NOTIFICATIONS-PLAN.md), including local implementation and remaining acceptance.
- Preserve Website operations' platform-administrator-only mailing-list, demo and
  email-recovery workflows when moving their full management tools out of the
  home preview. Intake remains view-first; bounded unsubscribe, completion and
  resend actions require explicit confirmation identifying the recipient or
  intake. Show queued work, provider acceptance and failed attempts distinctly;
  provider acceptance does not establish inbox delivery.
- Work queues surface pending tasks, exceptions, recent activity, and important status changes.
- **Lab ops** keeps **Jobs** first as the ungrouped work overview. Use CRM-style **SAMPLE PROCESSING**, **RESULTS**, **LAB PREPARATIONS**, and **KITS & FULFILLMENT** headings. Sample receipt and accession contain incoming work; transportation kit requests are a separate destination beside kit inventory. Keep Results & scientific review separate from permission-controlled Result release, and label physical PSeq work **PSeq kit fulfillment**.
- Primary navigation uses recognizable business and scientific areas rather than technical modules. Phaeno **Order Ops** retains one sidebar with CRM-style **LAB SERVICES** and **PARTNER SERVICES** group headings. The first contains **Order intake** and **Trial projects**; the second contains **PSeq kits** and **Data assembly**. These section and record routes remain beneath `/order-operations`, with subject-domain segments. **Lab ops** owns execution, scientific review and a separately authorized Result release section. **Dashboard → Needs attention** summarizes cross-workflow blockers and opens their full queue through View all. Finance and Legacy integrations belong in More. Routes and record links reflect these subject domains; retained bookmarks redirect to the canonical destination.
- Phaeno's wide-screen toolbar places secondary workspaces under **More**, ordered **Finance**, **Purchasing**, **Equipment**, **Data provisioning**, **Website operations**, then **Legacy integrations**. On narrow screens, show these links inside a collapsible **More** row in the user tray. Put available configuration links inside a collapsible **Settings** row. Workspace links appear directly without a Workspace heading. Both sections start collapsed on each menu opening, expand within the menu width, and allow only one section open at a time. Preserve Enter/Space toggling, Up/Down movement among visible items, Escape dismissal, and accessible expanded state. Preserve destination permissions, active-route indication, and one visible entry per viewport; hide More when none of its destinations are available. Expanded section headers remain neutral. Indent text-only child links beside a subtle vertical guide and reserve the selection background for the current destination. When collapsed, emphasize a section title if it contains the current destination.
- Place **Documentation** in the user menu for Prospect, Customer, Partner, and Phaeno users at every screen size. It opens the guides for the current organization and retains the existing audience access rules. Customer organization administrators reach user management through **Customer settings → People and access**; for other authorized audiences, place **User management** directly beneath Documentation. Keep section dividers without visible Display, Administration, or Resources headings; theme choices retain their accessible group name.
- When a signed-in user has more than one active organization membership, show
  an organization select beside an organization icon in the desktop user menu
  and narrow-screen tray. Omit its visible label and retain **Organization** as
  its accessible name. Offer only
  that user's existing session memberships. Switching returns to Dashboard,
  respects dirty-page navigation guards, resets Department context and scoped
  workspace state, and retains backend authorization. Hide the selector for one
  membership. This Owner-approved October 10, 2026 decision supersedes the earlier
  prohibition on membership switching. It does not introduce organization search,
  impersonation, or access through a Phaeno administrative role alone.
  Organization and Department changes both return to Dashboard only after the
  current draft guards permit navigation, including when Dashboard is already
  open. Keeping a draft retains the current scope; pending saves block switching.
  Cancelling or blocking an attempt must still permit a later attempt. The
  narrow-screen menu closes before a scope-discard confirmation opens.
- Present CRM as a first-class POMS workspace for Companies, Contacts, Leads,
  Opportunities, Activities, Tasks, relationship reporting, and Company
  requests.
  The CRM Company is the canonical Customer, Partner, or Prospect record; keep
  Portal users and tenant-scoped operational data distinct from that Company.
- Present **Company requests** as a CRM section and as part of Company detail,
  not as a separate account directory or customer entity. Online access is one
  possible request outcome alongside product and service, relationship, and
  work outcomes. Creating or editing the Company alone grants no access,
  readiness, service entitlement, or executable work.
- Multi-section workspaces use one shared sidebar anchored to the far-left viewport edge beneath the primary toolbar. On wide screens it may remain pinned; when unpinned, a fine pointer may preview the same rail from the viewport edge. The persistent edge tab provides keyboard, click, and touch access. On narrow or coarse-pointer layouts, the rail stays open until the user selects a section, toggles the tab, or presses Escape. On narrow screens, clicking or tapping outside the sidebar also closes it and allows the clicked page control to work normally.
- The unpinned rail is non-modal: it does not add a backdrop, trap focus, blur the page, or move content. A pinned rail preserves the normal centered page position when it fits in the available left margin and reflows the page only when the rail would otherwise overlap it. Apply the same clearance to the shared footer so its copyright and help link remain visible.
- Where the normal page margin cannot clear the closed sidebar tab, reserve a
  stable 36 px screen gutter for the unpinned rail. The return link and other
  controls must remain visible and clickable. Opening/closing the rail keeps
  the same content position; sufficiently wide screens keep normal centering,
  and printed document layout does not inherit this screen clearance.
- Remember the sidebar pin preference as a low-risk presentation setting, and show pin controls only on wide layouts. Keep section selection, keyboard focus, Escape behavior, and accessible names intact across pinned and unpinned states, and do not render duplicate navigation for one viewport.
- **R&D** is a first-class Phaeno workspace beside Lab ops, with **Projects** and **Experiments** sidebar items. Its standalone notebooks are shared by authorized researchers; entry editing uses a dedicated page for flexible sections, tables, uploads and resumability. The owning [R&D plan](plans/RD-NOTEBOOK-PLAN.md) records the scope and acceptance.
- Searchable lists provide access to core records.
- Selecting a major record opens a dedicated detail workspace with stable identity, status, actions, and related information.
- Returning from a record preserves list filters, sorting, pagination, and scroll position.
- Keep related records in the primary record's context when that supports the user's workflow.

### Page return navigation

Use `BackLink` from `frontend/src/components/ui/back-link.tsx` for every Portal
page-return control, including unavailable/error states and contextual returns
to an originating workflow. CRM Company detail is the visual reference: one
decorative left arrow, a compact neutral label, no permanent underline or
outlined/filled button border, consistent padding and icon gap, subtle hover
surface, and a visible keyboard-focus ring in both themes. Long labels wrap.

- Place return navigation at the start of the page content, above its heading
  and separate from record Actions. When several return destinations apply,
  group them in one wrapping row with an 8 px gap.
- Name the destination, normally `Back to [destination]`; preserve existing
  localized labels. Do not use an unlabeled arrow or browser-history guessing.
- Compose the shared control as `<BackLink asChild><Link ...>Back to companies</Link></BackLink>`.
  The inner typed Link owns its destination, parameters, search and hash; keep
  filters, pagination, originating tabs and draft-navigation guards intact.
  A real anchor is supported for existing workflow URLs. Use the native button
  form only when returning already requires a guarded callback.
- The shared component owns appearance and the arrow. Do not add icons,
  feature-local style constants, button wrappers or visual class overrides.
- Pagination, previous/next guide cards, form Cancel and steps inside a modal
  retain their own established controls; they are different navigation roles.

This document is the Portal style guide. Keep reusable visual patterns enforced
in shared components, and record their use here before introducing alternatives.
The [back-navigation plan](plans/BACK-NAVIGATION-CONSISTENCY-PLAN.md) records the
October 22, 2026 application-wide conversion and verification boundaries.

## Standard record-management flow

Use the same list, create, view, and edit flow for major records throughout the application unless a documented product or domain constraint requires an exception.

1. **List:** the index page is for finding, comparing, filtering, and selecting records. It does not contain a create or edit form.
2. **Create:** the primary create action opens a modal when creating one bounded record. Use a dedicated creation page only when the task meets the complexity criteria below.
3. **View:** selecting the record's primary identifier opens a dedicated, stable detail route. A modal, drawer, expanded row, or inline panel does not replace the detail workspace for a major record.
4. **Edit:** an explicit action from either the list or detail workspace opens a modal for a bounded one-record edit. Use a dedicated edit page when editing has several meaningful sections or steps, requires extensive context, or must be resumable.
5. **Return:** closing a modal restores focus to its invoking action. Returning from details restores the user's list context, including filters, sorting, pagination, and scroll position.

Detail workspaces are view-first. Do not mount a full edit form permanently beside a list or as the default state of a detail page. Related child-record collections inside a detail workspace follow the same rule: list or summary first, modal create/edit, and a dedicated detail route when the child is itself a major record.

This is the application-wide default for new work and for touched existing workflows. Record an exception in the owning plan with the product, scientific, safety, or workflow reason; implementation convenience is not a valid exception.

## Lists and tables

For records with numbered content revisions, follow the application-wide [revision strategy](revision-strategy.md). The main list line must identify the revision whose status and values it displays; link a newer pending revision separately and block another successor until that pending revision is resolved.

Use tables by default for structured scientific and business records that users compare across common attributes.

- Make the primary identifier a clear link to the detail workspace; avoid ambiguous whole-row clicking.
- Style primary record links consistently across Portal lists and summaries:
  14 px medium-weight primary-color text, no resting underline, an underline on
  hover or keyboard focus, and a visible focus outline. Compose `RecordLink
  asChild` with the typed router Link, preserving all route/event props. The
  component owns appearance; put layout classes on a non-interactive wrapper.
  `recordLinkClassName` remains the shared treatment for ordinary browse links.
- Use `RecordList` and `RecordListItem` for flat record rows: the same 16 px
  vertical spacing, wrapping title/metadata and separate trailing status/action
  region. Use dividers between rows. Inputs and assembly attempts retain their
  distinct context and actions while sharing their title and row presentation.
  A row is not an ambiguous whole-row click target; its identifier is the link.
- Use `ListToolbar` for shared field/action alignment and `RecordTable` for
  table containment and header/cell spacing. Preserve captions, column headers,
  feature-specific filters and URL state. On narrow screens, use record rows
  when they convey the same information; allow local table scrolling when the
  scientific comparison needs it. `RecordPagination` owns the common paginator.
- Put search, filters, sorting, and the primary create action in a predictable toolbar.
- Place secondary row actions in a consistent overflow menu.
- Keep active filters visible and provide a clear `Clear all` action.
- Simple filters apply immediately. Complex or expensive filter groups may use an explicit `Apply filters` action.
- Search updates after a short pause and does not require Enter.
- Support bulk selection only when meaningful bulk operations exist.
- Prioritize essential columns as width decreases, then use compact record cards when a usable table no longer fits.
- Distinguish no records, no search results, missing setup, insufficient permission, loading, and failure.

## Record-detail workspaces

Use one coherent, view-first workspace for a major record.

- A compact header shows identity, status, essential context, and actions.
- Use `PageHeader` to compose these regions. `PageTitle` owns the 24 px,
  semibold, tight-line-height page heading and long-identifier wrapping; retain
  existing heading IDs, refs and focus targets. Existing feature-specific
  arrangements may compose `PageTitle` without changing their workflow. A
  barcode identifier may retain a monospace font. Authentication panels,
  documentation article headings and printable documents have their own
  semantic hierarchy. Page header controls wrap without overlapping the title.
- When a record or version has multiple action options, group them in one `Actions` dropdown. Keep page-level creation and form Save/Cancel controls separate.
- Present high-value summary information first.
- Group related information by meaningful user tasks rather than database structure.
- Use tabs only for substantial areas; keep a small number of fields on the main page.
- Use the shared Portal tab components for consistent sizing and states: 36 px minimum tab height, 12 px horizontal and 6 px vertical padding, 14 px text with 20 px line height, 3 px list inset and 4 px gaps. A single-line tab strip is 42 px tall. Keep the same rounded corners, selected surface, disabled treatment and visible keyboard focus across workspaces. Let long labels and responsive grids grow without clipping; pages may arrange tabs but must not override their control height, typography or padding. Respect reduced-motion preferences.
- Use simple rows and dividers for related records instead of layers of nested cards.
- Keep record identity and essential status visible while users move among related information.
- Editing is an intentional action. Do not make every field permanently editable.
- Do not place the record's full edit form on the detail page by default; open the bounded edit modal or navigate to a justified dedicated edit route.

## Modals, pages, drawers, and inline editing

Use a modal for a bounded task that creates or edits one clearly defined record, has one main purpose, and benefits from preserving current context.

Use a dedicated page when a task has several meaningful sections or steps, needs extensive context, comparison, uploads, or review, changes multiple related records, has significant consequences, or needs resumability and a stable URL.

- Do not place data-entry forms inline in lists.
- Do not use a modal or drawer as the primary detail workspace for a major record.
- Use drawers for supplemental viewing and quick context, not primary data entry.
- Avoid nested modals. One controlled exception is allowed when a user must create a missing related record without abandoning the parent workflow.
- Modal headers, close controls, and action footers remain fixed. Only the body
  between the header and footer scrolls when content exceeds the available height.
  The shared modal header and footer use a subtle muted surface with bottom and
  top dividers respectively, distinguishing fixed context and actions from
  scrolling content in both themes.
  The shared scroll body retains a bottom inset so the final control and its
  focus ring remain fully visible above the fixed footer.
- General save, permission, network, and server feedback in a modal uses the
  shared feedback region inside the shaded fixed header. Direct destructive
  alerts inherit this placement automatically. Field-level validation remains
  beside the affected control.
- Modals require an explicit dismissal. Clicking the backdrop or elsewhere outside the modal never closes it; users close with the visible close control, a named cancel action, or the Escape key.
- When a modal dialog or application menu is open, lock the underlying page at
  its current position. Only the active overlay may scroll, and closing it
  restores the page without a position jump.
- Warn before closing or navigating away from a dirty form.

## Forms and controls

Prioritize clarity and error prevention over maximum visual compactness.

- Use a single-column reading flow by default.
- Use two columns only for short, naturally paired fields such as start/end dates.
- Place persistent labels above controls; placeholders never replace labels.
- Keep single-line text, search and select controls the same height within a form. Use shared `Field` spacing and `NativeSelect`/`Input` sizing rather than per-screen height and margin overrides. Adjacent fields must align at their control edges with the same label-to-control gap.
- Standard single-line controls are 32 px. Use the owned `Input controlSize="touch"`
  variant for an intentional 44 px touch control; do not recreate it with local
  height classes. `NativeCheckbox` retains native input events and registration.
- Group fields by the user's mental model and workflow, not the data model.
- Use concise helper text only when it prevents a likely mistake.
- Place helper text immediately below its field label and before the control.
  Place validation text tightly below the control, use the same compact type
  size as helper text, and retain the destructive color and alert semantics.
  Use the shared field-description, field-error, and control primitives so this
  structure and spacing do not drift between forms.
- Use `FieldError reserveSpace` where blur validation could move a pending Save
  or other action. Reserve a compact error line without announcing an empty
  error. Long-form summaries appear on submission, while individual field
  validation remains progressive.
- Mark genuinely required controls with actual required validation and the
  established ruby-red `*`. Keep the marker visually adjacent to its label,
  without the standard label-to-control gap. Required markers flow inline with the label and stay attached to its final word when it wraps; do not place the marker in a separate flex column. Long checkbox labels use readable line spacing and keep the checkbox aligned with the first line. Every form with required controls
  includes a visible `* Required` legend. In modal forms, place that legend in
  the modal footer before the action group in reading order.
- Prepopulate safe defaults from known context, but never assume consequential scientific or business values silently.
- Use radio buttons for a small exclusive set, checkboxes for independent choices, and searchable selectors for large record sets.
- Use switches only for settings that take effect immediately; use checkboxes for values saved with a form.
- Use multi-select sparingly and keep selected values readable and removable.
- Date and time controls support keyboard entry and a picker.
- Disabled controls explain why they are unavailable when that information helps the user proceed.
- Every control is keyboard accessible, visibly focused, and comfortably clickable.

## Saving and validation

Use explicit saving for scientific and business records. Limit autosave to low-risk preferences, filters, or explicitly identified drafts.

- Edit forms use `Save changes`; create forms use a specific label such as `Create project`.
- Disable `Save changes` when the form is pristine or a save is in progress.
- Do not disable submission solely because validation errors exist. Submission should validate, block the request, explain the problems, and focus the first issue.
- Do not disable a create action merely because an untouched new form is pristine.
- Prevent duplicate submissions and show a clear saving state in the initiating action.
- A form becomes pristine again when the user restores every value to its original state.
- Preserve entered values when validation or saving fails.
- Use the existing `GuardedFormDialog` for bounded forms needing shared dirty/
  pending dismissal protection. It works with `PortalConfirmation`; the owning
  form still owns validation, version review and successful-save/reset behavior.
  Use `RequiredDialogFooter` for the required legend before Cancel/Save controls.
  The gallery's failed-save/conflict outcomes are local demonstrations of these
  states, not an alternative server-concurrency implementation.

Validation is progressive:

- While typing, do not introduce new errors. If a field already has an error, revalidate as the user corrects it.
- On blur, validate the interacted field's required, format, range, and basic business rules.
- On submit, validate the complete form, including cross-field rules.
- Treat server validation as authoritative and map failures to fields whenever possible.
- Long forms show an error summary with a count and links or focus movement to affected fields.
- Concurrency conflicts automatically load the latest record while preserving
  the user's entered values. A save may retry once only when the editable server
  state is unchanged; otherwise the fixed modal feedback region explains that
  the refreshed values must be reviewed before saving again. Never silently
  discard entered values or overwrite another user's editable changes.

## Actions and safeguards

Each page, modal, or workflow has one visually dominant primary action.

- Use specific labels such as `Create project`, `Save changes`, or `Archive sample`, not `Submit` or `OK`.
- Put a card-scoped action in the card header at the far right of the title row.
  Keep it compact to its label; do not stretch it beneath the title or
  description. Reserve a full-width card action for a deliberately prominent
  call to action whose width communicates hierarchy rather than compensating
  for layout.
- Group multiple record or version actions in an `Actions` dropdown, including status transitions. When exactly one action is shown, surface it as a directly labeled button; do not hide it in an Actions dropdown. Preserve its disabled state when prerequisites are unmet. Keep menus wide enough for clear labels and aligned to the trailing edge of the record or version row.
- Owner-approved exception: Customer/Partner Lab Job and phase cancellation requests remain inside a neutral **Actions** dropdown even when cancellation is the only available action. Cancellation is an exceptional task and must not dominate the ordinary Job/phase workflow. Use a red destructive menu item and destructive confirmation action; keep the Actions trigger neutral. Use the shared `ActionMenu` with `keepSingleActionInMenu` for this documented exception. Other sole actions remain directly labeled buttons.
- Every labeled Actions dropdown shows one trailing down-chevron. The shared `ActionMenu` owns this cue so screens do not have to supply it. A direct action has no dropdown chevron. Keep the icon decorative so it does not change the button's accessible name.
- Menus dismiss immediately when an item is chosen or the menu closes, so a
  closing layer cannot block a quickly reopened menu. A menu's queued focus
  restoration must not steal focus from the dialog or menu opened by its action.
  Confirmation dialogs restore focus to the surviving invoking control; use
  `DialogReturnFocus` when a selected menu item will disappear. Preserve focus
  in a newly opened overlay during a conditional dialog handoff.
- Hide actions the user is never authorized to perform.
- Disable a temporarily unavailable action only when knowing it exists is useful, and explain the blocking condition.
- Use destructive styling only for the action that causes harm, not for Cancel or ordinary navigation.
- Confirm destructive, irreversible, externally visible, or consequential workflow-transition actions.
- Name the affected record and consequence in confirmation text.
- Use a Portal HTML dialog for in-page confirmations, with initial focus on the cancel action and focus return to the invoking control or a surviving adjacent control. Do not use browser system confirmations for these actions; browser-required unload prompts remain browser-managed.
- Confirmation dialogs have a title header, a visible body explaining affected scope and consequences, and an action footer. Explanations belong in the body; do not render a header and footer with no meaningful body between them.
- Require typed confirmation only for exceptionally consequential bulk or irreversible operations.
- Prefer undo over confirmation when an action is safely reversible.
- Reserve icon-only controls for universally familiar actions and provide accessible names and tooltips.

## Feedback, errors, jobs, and toasts

Feedback is immediate, contextual, and durable.

- Acknowledge every user action visibly.
- Show button-level progress in the initiating action and prevent duplicate activation.
- Use skeletons for initial content loading and local indicators for refreshes or background updates.
- Keep existing data visible during refresh when it remains trustworthy.
- Do not block an entire page for an operation affecting one section.
- Errors remain visible until dismissed or resolved.
- Use amber for warnings and pending prerequisites, and red for errors and failed actions. State the condition and its consequence in text; color alone must not convey severity.
- Use plain language and an actionable next step; never present raw server messages or stack traces.
- Long-running jobs show a named status, current stage, start time, and available next action. Users may leave without cancelling the job.
- Status indicators combine text with color or iconography; color never carries meaning alone.
- Use consistent domain status language across lists, details, filters, notifications, and reports.

Toasts are a secondary signal, never the sole location of an actionable error.

- Field errors appear inline; long forms also show a durable error summary.
- A toast may say `Please correct 3 fields` and offer `Review errors`, which moves to the summary or first invalid field.
- General save, permission, network, or server failures also appear as persistent contextual alerts.
- Error toasts remain until dismissed or acted upon; success toasts may disappear automatically.
- Consolidate repeated events and limit stacking.
- Background completion or failure toasts link to durable job or activity details.
- Announce toast and status content accessibly without unexpectedly moving keyboard focus.

Use `LoadingState` for initial skeleton/status or a compact refresh indicator;
refreshing must not replace trustworthy loaded content with a blank state. Use
`EmptyState` with a truthful empty/no-results/setup/permission explanation and
next step. Show these states only when their condition is established, never as
a substitute for a failed read. `ErrorState` supplies a durable contextual alert
with a named retry action. Domain statuses, actual measured progress and
scientific completion remain owned by their workflows; reuse `FileUploadProgress`
and `WorkflowProgress` without equating transfer completion with scientific success.

## Accessibility compliance

WCAG 2.2 Level AA is part of the definition of done for complete user journeys, not a design aspiration. Do not claim conformance without evidence for the complete page and its responsive variations. See the [W3C WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/).

- Use semantic HTML and native controls whenever practical.
- Provide complete keyboard operation, logical focus order, no keyboard traps, and focus indicators that are never obscured.
- Dialogs manage initial focus, trapping, Escape behavior, and focus restoration correctly.
- Programmatically associate labels, instructions, required states, descriptions, and errors.
- Announce saves, failures, loading changes, jobs, and other status messages without requiring focus.
- Meet text, component, focus, chart, and status contrast requirements; never communicate meaning through color alone.
- Support text enlargement, 200% zoom, 400% reflow, reduced motion, and appropriate pointer target sizes.
- Provide accessible session-expiration warnings and authentication that works with password managers and paste.
- Give scientific charts and visualizations meaningful text, summaries, or accessible tabular data.

Verification includes automated accessibility checks, manual keyboard testing for every changed workflow, and screen-reader testing for critical journeys. Test zoom, reflow, contrast, responsive behavior, reduced motion, focus, errors, and dynamic announcements. Automated checks alone do not prove conformance.

When a customer or procurement context adds requirements such as U.S. Section 508 evidence, verify the current official standard and produce the required testing or conformance artifact. Do not infer legal compliance from a generic automated scan.

## Internationalization

Owner clarification, October 11, 2026: internationalization applies only to the
Customer portal. This supersedes the former all-external-audience requirement.
`en-US` is the only initially supported Customer locale. Full implementation
coverage is tracked in [System gap closure](plans/SYSTEM-GAP-CLOSURE-PLAN.md);
the policy is not a claim that every Customer surface already meets it.

- Phaeno POMS, Prospect and Partner surfaces may remain US English and do not
  require translation catalogs. Public Website localization is separate scope.
- Every Customer-accessible surface is in scope, including shared controls,
  authentication/access feedback, work dashboard/bell, forms and help.
- Shared components localize their Customer-facing presentation; other
  audience presentations may use US English.
- Customer labels, validation, errors, toasts, accessibility text,
  notifications, reports and exports are included.
- Server failures use stable identities and parameters that the Customer UI
  maps to localized messages.
- Hide the language selector until a second locale is supported.
- Do not advertise a locale until its critical workflows are completely translated, reviewed, and tested.
- Support grammatical pluralization, parameterized messages, locale-aware dates, times, numbers, currency, and units.
- Design for text expansion and logical layout direction; do not claim right-to-left support until tested.
- Use pseudolocalization and long-text testing to find clipping and hard-coded strings.
- Product names, identifiers, gene symbols, accession numbers, standardized units, and user-entered content are not translated.
- Scientific, clinical, financial, and regulatory translations require human review before becoming authoritative product content.

## Visual language and consistency

Phaeno Portal and Clinical Diagnostics share an interaction language while retaining distinct branding and domain components.

- Keep navigation, tables, filters, record details, forms, modal behavior, actions, saving, errors, feedback, accessibility, and responsive behavior consistent in meaning.
- Use a calm, precise, professional visual character.
- Use restrained color, clear hierarchy, semantic tokens, limited card nesting, and minimal decorative effects.
- Support light and dark themes.
- Reserve semantic colors for meaning and use brand accents intentionally.
- Allow product-specific scientific visualizations and information density where the work genuinely differs.
- Shared behavior does not require shared code; code reuse is an engineering decision.

## Privacy and data minimization

Show only the sensitive or confidential information needed for the current task.

- Keep customer-confidential and proprietary scientific information out of URLs, browser titles, toasts, analytics, and client-side diagnostic logs.
- Global search, recent items, notifications, and work queues expose less information than an authorized record workspace.
- Use intentional reveal or copy actions when full values do not need routine visibility.
- Make exports and downloads explicit, scoped, and clearly labeled.
- Avoid confidential detail in external notifications unless the channel and workflow explicitly permit it.
- Mirror permissions in the UI while treating server authorization as authoritative.

## Phaeno Portal scientific profile

Phaeno Portal applies standard traceability and strong scientific lineage without treating ordinary scientific records as patient records.

- Important records show status, responsible party when relevant, last-updated information, and source.
- Material changes and consequential workflow transitions remain available in history.
- Scientific results identify relevant inputs, analysis or pipeline version, processing status, and generated time.
- Distinguish manually entered, imported, calculated, and system-generated values when source affects interpretation.
- Corrections preserve prior state when scientific interpretation or customer trust depends on it.
- Reports and exports contain enough record, project, sample, analysis, locale, and timezone context to stand alone.
- Apply data minimization to customer-confidential samples, analyses, results, and intellectual property.
- Add access-level auditing only where a future contract, workflow, or risk requires it; do not automatically impose patient-record controls.

## Definition of done for UI work

User-interface work is not complete until the rendered workflow has been checked in proportion to its risk.

- Verify the primary happy path and relevant loading, empty, error, permission, success, dirty, and concurrency states.
- Verify desktop and the applicable tablet and phone behaviors.
- Verify light and dark themes when the surface supports them.
- Verify keyboard operation, visible focus, names, errors, announcements, and modal focus behavior.
- For record-management work, verify the complete list-to-create, list-to-detail, list/detail-to-edit, close/focus-return, and detail-to-list-state-restoration flow, or document why a product-approved exception applies.
- Use automated tests for stable behavior, but do not substitute unit or build success for browser verification of visual, responsive, focus, or navigation behavior.
- Update this document when a genuinely reusable product pattern changes.
