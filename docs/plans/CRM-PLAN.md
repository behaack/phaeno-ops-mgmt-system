# First-Party CRM Plan

Keep this file updated as POMS's standalone customer-relationship-management
capability is discovered, designed, implemented, and verified.

Do not execute this plan unless explicitly requested. Database migrations,
dependencies, authentication changes, external email or calendar connections,
deployment, and test execution retain their normal approval boundaries.

## Status

- Product direction was approved on 2026-08-26: POMS will be developed as a
  standalone application with a full first-party CRM rather than depending on
  HubSpot.
- The standalone CRM v1 implementation was completed locally on 2026-08-26.
  It is the POMS-owned relationship and sales system of record and includes
  Companies, Contacts and effective-dated associations, Leads and conversion,
  Opportunities and configurable pipelines, immutable stage history,
  Activities, Tasks and recurrence, global search, home attention, reporting,
  saved views, typed custom fields, duplicate review, controlled merges,
  previewed/idempotent imports, audited exports, and explicit Portal handoffs
  and account links.
- The CRM and Portal domains retain independent identifiers. CRM-to-Portal
  handoffs create pending, idempotent requests through the existing review
  boundary; intake does not grant membership, enable a service, create
  executable work, or expose scientific data. When an authorized reviewer
  creates a Customer account, a visible **Ordering authorized** choice defaults
  on and may create the existing `Ready` PSeq Lab Service entitlement in the
  same transaction.
- Development-only HubSpot simulation endpoints and controls were removed.
  Historical `HubSpot` source values remain readable so existing audit meaning
  is not erased. The application requires no HubSpot credential, identifier,
  webhook, API call, or availability.
- Additive migrations `20260826145224_AddCrmCompanyFoundation`,
  `20260826155438_CompleteCoreCrm`, and
  `20260826162600_AllowRepeatCrmCompanyContactHistory` define the first-party
  model. They were applied only to the configured local development database;
  no shared database or deployment was changed.
- Connected communications, marketing automation, telephony, service cases,
  and any external CRM adapter remain separately scoped expansions. Deeper
  Trial Project, order, QuickBooks, and operational projections remain owned by
  their existing plans rather than being reimplemented inside CRM.
- Future HubSpot support is deferred. If later approved, it will be an optional
  import, export, or synchronization adapter around provider-neutral CRM
  contracts and stable POMS identifiers.

## Product Purpose

Phaeno needs one application in which commercial staff can manage the complete
relationship lifecycle and hand approved work into Phaeno's scientific and
operational workflows. Staff should not need a separate CRM to understand who
the organization and people are, what has happened, what opportunity is being
pursued, what needs follow-up, what was won or lost, or what Portal and
operational work resulted.

The CRM must be capable enough to stand on its own. It should not be shaped as
a temporary imitation of HubSpot or limited to only the fields needed for one
Portal handoff.

## Primary Users

### Commercial and relationship user

- manages companies, contacts, leads, opportunities, activities, tasks, notes,
  follow-up, and relationship ownership
- advances opportunities through an authorized pipeline
- requests Trial Projects, custom work, or Portal account onboarding without
  re-entering company and contact information
- sees relationship-safe summaries of committed work, delivery, invoicing, and
  payment without seeing scientific or protected data

### Commercial leader

- configures pipelines and stages
- assigns ownership and reviews workload
- monitors pipeline value, conversion, aging, forecasts, follow-up, and won/lost
  outcomes
- manages duplicate resolution, imports, exports, and data-quality exceptions

### Phaeno operational user

- sees the approved commercial context needed to review a handoff
- follows a stable link back to the CRM company, contact, and opportunity
- cannot silently change commercial ownership or pipeline state from an
  operational workflow

### Platform administrator

- manages CRM capabilities, configuration, field definitions, retention,
  integrations, and audited corrective actions
- does not receive automatic access to scientific or tenant-confidential data
  merely from CRM administration

## Product Vocabulary

- **CRM Company:** a commercial or relationship organization record. It may
  exist without Portal access.
- **CRM Contact:** a person associated with one or more CRM Companies. It is not
  a Portal user or organization membership.
- **Lead:** a person or company relationship that has not yet been qualified
  into an opportunity. Lead status does not grant Portal access.
- **Opportunity:** a potential commercial outcome tracked through a pipeline.
  It may be associated with one primary Company and multiple Contacts.
- **Pipeline:** an ordered, configurable set of stages used for one class of
  opportunity.
- **Activity:** a timeline event such as a note, call, meeting, email, status
  change, task completion, or linked POMS business event.
- **Task:** owned follow-up work with status, priority, and due date.
- **Portal Account:** a Prospect, Customer, or Partner organization authorized
  for some form of Portal relationship. It is distinct from a CRM Company.
- **Commercial handoff:** an explicit, audited request from CRM context into a
  Portal account, Trial Project, custom-work, order, relationship-change, or
  offboarding review.

## System Ownership

### CRM domain owns

- CRM Companies and Contacts
- company-contact associations and relationship roles
- leads and qualification state
- opportunities, pipelines, stages, amounts, currencies, probability,
  expected-close dates, win/loss outcomes, and reasons
- relationship and opportunity ownership
- activities, notes, tasks, reminders, and follow-up
- CRM field definitions, tags, lists, saved views, and commercial reporting
- import, export, duplicate detection, merge history, and data-quality review
- future external CRM link and synchronization metadata

### Existing POMS domains continue to own

- Portal organizations, invitations, users, memberships, capabilities, and
  tenant access
- service readiness and entitlements
- Trial Project scientific scope, approvals, acceptance, samples, results,
  retention, and operational closure
- orders, accepted commercial snapshots, laboratory work, files, results, and
  audit
- QuickBooks integration and authoritative approved financial facts

CRM records may link to those records and display relationship-safe summaries.
They do not replace or directly mutate their owning domains.

## Core Product Rules

1. CRM Company, Contact, Lead, and Opportunity records grant no Portal access.
2. CRM and Portal records use stable independent identifiers and explicit
   links. A name or email match never silently creates a link.
3. Every opportunity has one pipeline, one current stage, one Phaeno owner, and
   immutable stage history.
4. Won/lost outcomes and reasons are explicit and audited; changing a closed
   outcome requires a separately authorized correction with history.
5. Activities form one chronological company/contact/opportunity timeline but
   retain their original subject, actor, source, visibility, and linked record.
6. Internal notes are never exposed to external organization users.
7. CRM tasks and reminders do not become operational work orders.
8. A commercial handoff is explicit and idempotent. Retrying it cannot create a
   duplicate Portal account, Trial Project, order, invitation, or entitlement.
   The later account-review action may explicitly create the default-on
   Customer ordering entitlement atomically with the account.
9. Scientific, patient, sample, file, and protected data are excluded from CRM
   records, search indexes, exports, notifications, and future integrations.
10. A future external provider never becomes a prerequisite for first-party CRM
    or operational workflows.

## Functional Scope

### Companies

- create, view, edit, deactivate, reactivate, search, filter, sort, tag, assign,
  and merge Companies
- retain legal/display name, domains, phones, addresses, industry, size,
  lifecycle state, owner, source, tags, and safe custom fields
- show related Contacts, Opportunities, Activities, Tasks, Portal Accounts,
  Trial Projects, orders, and relationship-safe operational summaries
- preserve aliases, merge redirects, external links, and full audit history

### Contacts

- create, view, edit, deactivate, reactivate, search, filter, tag, assign, and
  merge Contacts
- associate one Contact with multiple Companies and retain a relationship role,
  title, primary-company designation, and effective dates
- retain communication preferences and lawful-contact basis independently from
  ordinary profile data
- link a Contact to a Portal user only through an explicit reviewed action

### Leads and qualification

- capture individual or company leads without requiring a Portal Account
- record source, owner, status, qualification facts, disqualification reason,
  next action, and history
- convert a qualified lead into or associate it with a Company, Contact, and
  Opportunity without destroying the original lead history
- detect likely duplicates before conversion and route ambiguous matches to
  review

### Opportunities and pipelines

- support configurable pipelines with ordered active and terminal stages
- track primary Company, associated Contacts, owner, product/service interest,
  amount, currency, probability, expected-close date, next step, competitors,
  and safe internal context
- record every stage transition with actor, time, prior stage, new stage, and
  reason when required
- support won, lost, abandoned, and reopened behavior with explicit rules
- provide Trial Project, custom-work, Portal onboarding, and standard-sale
  handoff actions only when the opportunity and user are eligible

### Activities, communication, and timeline

- support notes, calls, meetings, manually logged emails, status events, task
  events, and linked POMS business events
- provide a unified chronological timeline with subject and type filters
- allow attachments only through the approved file-management boundary and
  never place scientific data into CRM activity storage
- plan optional email and calendar connections as separately authorized
  integrations; the CRM remains usable with manual logging when they are absent

### Tasks, reminders, and productivity

- create owned tasks linked to Companies, Contacts, Leads, or Opportunities
- support due date/time, priority, queue, status, reminder, recurrence, and
  completion history
- surface overdue and due-soon Tasks, Leads needing a next action, stale
  Opportunities, blocked work, and data-quality warnings in the home and Task
  queues
- provide reusable email/activity templates and playbooks only after their
  permissions, localization, and audit needs are defined

### Search, views, and reporting

- global CRM search across authorized Companies, Contacts, Leads, Opportunities,
  and Tasks
- saved personal and shared filters with clear ownership
- pipeline board and table views, forecast, aging, conversion, stage velocity,
  source performance, win/loss, activity, follow-up, and owner workload reports
- exports that honor the same authorization, privacy, field-visibility, and
  audit rules as the interactive UI
- relationship-safe summaries of Portal accounts, committed sales, operational
  schedule health, and high-level QuickBooks state

### Administration and data quality

- configure pipelines, stages, required transition fields, loss reasons,
  sources, tags, and custom fields
- bulk import with preview, mapping, validation, duplicate handling, permission
  attestation, error report, and idempotent re-run
- controlled bulk edit, assignment, export, merge, and archival
- retention, legal hold, audit, and field-level sensitivity classification
- no hard deletion of consequential commercial history through ordinary UI

## Experience Direction

- Add a first-class **CRM** area to Phaeno navigation rather than overloading
  **Accounts**.
- CRM landing answers: what needs attention, which opportunities changed, what
  is overdue, and how the pipeline is performing.
- Companies, Contacts, Leads, Opportunities, and Tasks use the standard
  list-to-detail record-management pattern.
- Opportunity pipeline boards complement, but do not replace, accessible tables.
- Company detail is the relationship workspace: summary, Contacts,
  Opportunities, Activity, Tasks, Portal links, and reporting context.
- Portal Accounts remains the external-tenant administration workspace.
- Every CRM-to-Portal transition previews the consequence and clearly states
  that it does not itself grant access, entitlements, or executable work.
- External organization users do not receive CRM navigation or internal CRM
  data.

## Architecture Direction

- Implement CRM as a feature-owned module within the existing modular monolith.
- Keep domain and pure application policy independent from the API host,
  QuickBooks, HubSpot, email, calendar, and other adapters.
- Use provider-neutral CRM models and POMS-owned identifiers.
- Connect CRM to Accounts, Trial Projects, Orders, and reporting through
  explicit application contracts and post-commit events, not direct
  cross-module persistence mutation.
- Use an outbox for durable cross-domain and future external publication.
- Store external provider links and sync state outside core CRM aggregates.
- Preserve optimistic concurrency, centralized audit stamping, tenant and
  Phaeno authorization, soft deactivation, and API envelopes.
- Add persisted models only through an authorized additive migration and update
  `docs/database-erd.md` in the same slice.

## Delivery Phases

### Phase 0: Product contract and information architecture — completed

- confirm roles/capabilities, sensitive fields, record visibility, initial
  pipeline(s), stages, required transition data, reporting definitions, and
  retention
- inventory reusable Relationship Management and Accounts boundaries
- define CRM-to-Portal commands and relationship-safe summary events
- define migration from development-only HubSpot labels without erasing history

### Phase 1: Company, Contact, ownership, and activity foundation — completed

- implement Company and Contact records, associations, ownership, search,
  lists, details, notes, basic activities, audit, and duplicate warnings
- add CRM navigation and home attention view
- provide explicit CRM Company to Portal account proposal/link flow

### Phase 2: Leads, opportunities, and pipelines — completed

- implement lead qualification, opportunities, configurable pipelines/stages,
  stage history, ownership, outcome rules, table/board views, and basic pipeline
  reporting
- add Trial Project and custom-work commercial handoff commands

### Phase 3: Tasks, communication, and productivity — core completed

- implement tasks, reminders, queues, follow-up, recurring work, and activity
  history
- add manual email/meeting logging
- evaluate email and calendar integrations under separate explicit scope

Activity templates, connected email, and connected calendars remain deferred
because they require sender, consent, retention, and provider decisions.

### Phase 4: Reporting, data quality, and administration — core completed

- implement forecasts, stage aging, conversion, source, win/loss, activity,
  and workload reporting
- implement saved views, custom fields, imports, exports, duplicate review,
  controlled merge, sensitivity, and audited data movement

General-purpose bulk edit, legal hold, and configurable retention policy remain
future governance work; ordinary UI has no hard-delete path for consequential
commercial history.

### Phase 5: Deep POMS lifecycle integration — controlled boundary completed

- create provider-neutral onboarding, evaluation, Trial Project, custom-work,
  service-change, relationship-change, and offboarding review requests
- create and retain explicit CRM-to-Portal account links after approved account
  creation
- keep deeper Trial Project, order, schedule, QuickBooks, reconciliation, and
  exception journeys in their owning implementation plans

### Phase 6: Communication, marketing, and service expansion

- add connected email and calendar capture, templates, sequences, and approved
  automation with explicit sender identity, consent, opt-out, retention, and
  delivery safeguards
- add campaign audiences, campaign activity, forms/web-intake promotion, source
  and attribution reporting, and configurable lead scoring
- add relationship-linked support/case management when the Customer and Phaeno
  service workflow is defined
- evaluate telephony, commission, territory, and advanced forecasting only
  against confirmed operating needs

### Deferred: HubSpot migration or synchronization adapter

- decide later whether the need is one-time migration, outbound visibility,
  inbound request intake, or field-level bidirectional synchronization
- define field ownership and conflict rules before building the adapter
- keep HubSpot models, credentials, webhooks, mapping, rate limits, retries, and
  reconciliation outside the CRM domain

## Acceptance Criteria

- Phaeno staff can manage Companies, Contacts, Leads, Opportunities, pipelines,
  Activities, Tasks, follow-up, and reporting entirely in POMS.
- A CRM record can exist without a Portal Account, and a Portal Account can
  remain usable without an external CRM link.
- CRM-to-Portal handoffs are explicit, authorized, idempotent, and audited.
- No CRM action directly grants membership, service entitlement, Trial Project
  execution, order commitment, or laboratory work.
- CRM search, lists, details, boards, reports, imports, and exports enforce the
  approved field and capability boundaries.
- Duplicate detection and merge preserve identifiers, relationships, history,
  redirects, external links, and audit.
- Commercial staff can see relationship-safe POMS outcomes without scientific,
  patient, file, or protected-data disclosure.
- The full product runs with no HubSpot account, credential, identifier,
  webhook, API call, or availability dependency.
- Future HubSpot adapter work can import or synchronize through provider-neutral
  contracts without redesigning the CRM or operational domains.

## Initial Success Measures

- all active commercial relationships and follow-up can be represented in POMS
- no required parallel CRM data entry for the standalone workflow
- no duplicate Portal records from CRM handoff retries
- zero unauthorized CRM record, field, report, or export access
- zero scientific, patient, or protected-data disclosure through CRM
- measurable pipeline completeness, overdue follow-up, stage aging, conversion,
  and win/loss outcomes from POMS-owned data

## V1 Product Decisions

The v1 implementation uses the following documented defaults until the Product
Owner identifies a different product need.

- One seeded **General Sales** pipeline provides Discovery, Qualified,
  Proposal, Negotiation, Won, Lost, and Abandoned stages. Administrators can
  add pipelines and stages without changing the domain model.
- CRM access uses the existing active Phaeno platform-administrator boundary.
  A future broader commercial role requires an explicit capability decision.
- Required identity and transition fields are enforced by domain and API
  validation; typed custom fields may add required internal metadata.
- Activities are Internal or Restricted. CRM data remains unavailable to
  external organization users.
- Reports use stored opportunity currency and UTC timestamps with local display
  formatting. Counts include every currency; aggregate amount and weighted
  forecast figures are USD-only, so no cross-currency value is represented as
  converted financial value.
- Communication preference and lawful-contact basis are retained on Contacts;
  no bulk outbound communication is sent.
- No email, calendar, or external CRM provider is connected.

## Later CRM Expansion Requiring Owning Decisions

- AI-generated outreach, lead scoring, or automated commercial decisions
- marketing campaign automation and mass outbound messaging
- telephony provider integration
- customer-support ticketing or a knowledge-base replacement
- commission calculation

These capabilities are not rejected from the first-party CRM. They follow the
core CRM and require explicit privacy, consent, authorization, operational, and
provider decisions before implementation. External CRM synchronization remains
a separate optional-adapter decision rather than a first-party CRM phase.
