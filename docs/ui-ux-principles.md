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
- Render navigation once per viewport: inline when wide and in the menu when narrow.
- Preserve information and functionality during zoom and reflow. Allow two-dimensional scrolling only where the content genuinely requires it, such as a complex data table or scientific visualization.

## Information architecture and navigation

Use task-oriented entry points with record-centered workspaces.

- The home experience should answer, "What needs my attention?"
- The POMS home uses the shared far-left sidebar as one **Order Operations / Lab
  Operations / Accounts / Web Operations** panel selector so internal users can
  move among the two primary operational queues, Customer, Partner, and Prospect
  account administration, and public Website intake without stacking the
  dashboards. Show one panel at a time, emphasize attention or intake counts
  and representative priority work, and route users to the full owning
  workspace when one exists. Web Operations keeps mailing-list signups and demo
  requests read-only on the dashboard and is visible only to Phaeno platform
  administrators. External organization dashboards do not expose this internal
  selector.
- Work queues surface pending tasks, exceptions, recent activity, and important status changes.
- Primary navigation uses recognizable business and scientific areas rather than technical modules.
- Do not expose an organization-context search or act-as switcher in the user
  menu. Phaeno users manage external organizations through the Accounts
  workspace, while external users remain in the organization context
  established by their authenticated session.
- Present Accounts as a HubSpot-originated intake and POMS review surface. Do
  not place direct account creation or manual intake actions on the standard
  Accounts list or detail page; show the disconnected integration state
  honestly until automated intake is operational.
- Multi-section workspaces use one shared sidebar anchored to the far-left viewport edge beneath the primary toolbar. On wide screens it may remain pinned; when unpinned or narrow, hovering at the pointer edge previews the same rail and the persistent edge tab provides keyboard and click access.
- The unpinned rail is non-modal: it does not add a backdrop, trap focus, blur the page, or move content. A pinned rail preserves the normal centered page position when it fits in the available left margin and reflows the page only when the rail would otherwise overlap it.
- Remember the sidebar pin preference as a low-risk presentation setting, and show pin controls only on wide layouts. Keep section selection, keyboard focus, Escape behavior, and accessible names intact across pinned and unpinned states, and do not render duplicate navigation for one viewport.
- Searchable lists provide access to core records.
- Selecting a major record opens a dedicated detail workspace with stable identity, status, actions, and related information.
- Returning from a record preserves list filters, sorting, pagination, and scroll position.
- Keep related records in the primary record's context when that supports the user's workflow.

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

Use tables by default for structured scientific and business records that users compare across common attributes.

- Make the primary identifier a clear link to the detail workspace; avoid ambiguous whole-row clicking.
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
- Show one dominant primary action; place secondary actions in an `Actions` menu.
- Present high-value summary information first.
- Group related information by meaningful user tasks rather than database structure.
- Use tabs only for substantial areas; keep a small number of fields on the main page.
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
- Modal headers, close controls, and action footers remain visible while long bodies scroll.
- When a modal dialog or application menu is open, lock the underlying page at
  its current position. Only the active overlay may scroll, and closing it
  restores the page without a position jump.
- Warn before closing or navigating away from a dirty form.

## Forms and controls

Prioritize clarity and error prevention over maximum visual compactness.

- Use a single-column reading flow by default.
- Use two columns only for short, naturally paired fields such as start/end dates.
- Place persistent labels above controls; placeholders never replace labels.
- Group fields by the user's mental model and workflow, not the data model.
- Use concise helper text only when it prevents a likely mistake.
- Mark genuinely required controls with actual required validation, the established ruby-red `*`, and a required-field legend.
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

Validation is progressive:

- While typing, do not introduce new errors. If a field already has an error, revalidate as the user corrects it.
- On blur, validate the interacted field's required, format, range, and basic business rules.
- On submit, validate the complete form, including cross-field rules.
- Treat server validation as authoritative and map failures to fields whenever possible.
- Long forms show an error summary with a count and links or focus movement to affected fields.
- Concurrency conflicts preserve the user's work and provide a safe review or reload path.

## Actions and safeguards

Each page, modal, or workflow has one visually dominant primary action.

- Use specific labels such as `Create project`, `Save changes`, or `Archive sample`, not `Submit` or `OK`.
- Use quieter styling for secondary actions and move infrequent actions into an `Actions` menu.
- Hide actions the user is never authorized to perform.
- Disable a temporarily unavailable action only when knowing it exists is useful, and explain the blocking condition.
- Use destructive styling only for the action that causes harm, not for Cancel or ordinary navigation.
- Confirm destructive, irreversible, externally visible, or consequential workflow-transition actions.
- Name the affected record and consequence in confirmation text.
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

Internationalization is enabled with `en-US` as the only initially supported locale.

- System-owner-only surfaces may remain US English and do not require translation catalogs.
- Prospect-, customer-, and partner-facing surfaces are fully internationalization-enabled even while `en-US` is their only translation.
- If any external role can access a surface, treat the entire surface as internationalized.
- Components shared between internal and external surfaces are internationalized.
- External labels, validation, errors, toasts, accessibility text, notifications, reports, and exports are included.
- Server failures use stable identities and parameters that external UIs map to localized messages.
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
