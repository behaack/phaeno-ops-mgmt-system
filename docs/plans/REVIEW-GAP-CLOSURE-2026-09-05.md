# Review gap closure — 2026-09-05

Status: the combined code is committed, pushed and released to the production API
and Portal UI at `541c8759aceaf95f0fe8e64c2bbfacee3fa7744b`. The three explicitly
approved production migrations completed after encrypted-backup checksum
verification. Independent health probes and a fresh Portal sign-in render passed.
Signed-in operator/Trial/download, provider and inbox acceptance remain unverified;
the separate public Website was not promoted. Earlier local results and the
separate-unit hold remain historical checkpoints.

## Combined production release checkpoint — 2026-09-05

The current authorization covers committing and pushing the combined changes,
deploying the production API, promoting the Portal UI, and applying the three
reviewed production migrations with an encrypted backup. The earlier proposed
A/B separation was a review boundary; no independent artifacts were assembled.
The narrow parent-tab correction and its integrated regression coverage are now
part of the combined release, rather than another broad implementation pass.

- **Parent integration:** Email delivery is now an optional third Radix tab;
  only the selected panel mounts, and the existing two-tab behavior remains when
  no delivery panel is supplied. Labels/counts wrap in equal-width mobile tabs.
  All seven `WebOpsDashboardContent` component cases and scoped lint passed.
  The browser fixture now mounts the actual parent with `WebOpsDeliveryPanel`;
  integrated tab switching, keyboard and recovery are covered by the release
  browser checkpoint: **18 distinct cases passed** across an initial 17/18 run
  and a 1/1 targeted rerun. The remaining desktop pause/resume Axe scan initially
  observed a disabled-to-enabled button transition. The test now waits for the
  enabled state and actual CSS animation completion before scanning; no product
  color change, fixed sleep or rule suppression was used. Rerun evidence is in
  `artifacts/review-gap-closure/release-processing-recheck`. Final desktop/light
  and mobile/dark Web Operations screenshots were visually reviewed: the third
  Email delivery tab shows one selected panel with clean wrapping and no overflow.
- **Local release checks:** the full frontend suite passed **203 tests across
  66 files**; the release-focused backend run passed **59 tests with zero skips**.
  The backend Release build passed with zero warnings/errors, EF reports no
  pending model changes, and the Portal production build passed. Frontend lint
  and typecheck exited successfully. Documentation freshness passed for all
  **55 guides**, fingerprint `3633301d1516`. The dated checkpoints below retain
  their original scope and counts; overlapping checks are not additional tests.
- **Database:** inspected production workflow `33975386749` at commit `ab2df0a`
  records migration through
  `20260905140916_FreezeReleasedDeliverableReceiptLineage`. The approved release
  applied three migrations, in order: `20260905172646_AddTrialProjectIntegration`,
  `20260905213944_AddWebsiteNotificationRecovery`, and
  `20260905222201_AddWebsiteNotificationProcessingControl`. The reviewed
  idempotent SQL is
  `artifacts/review-gap-closure/production-review-migrations.sql`, SHA-256
  `10A12E85A0B0930AA98E5766D3991227B19556E58248FE60D7F33AC1BBC01EA3`.
  The Product Owner explicitly approved applying all three to production with
  an encrypted backup. At `2026-09-05T23:16:41Z`, checksum verification passed for
  `pre-migration-20260905T231641Z-541c8759acea.dump.enc` and its corresponding
  encrypted `.key.enc` file. All three migrations applied at `23:16:45Z`.
  Checksum verification establishes backup-file integrity, not a restore test.
  Earlier local migration evidence remains a separate checkpoint.
- **Git and source identity:** the combined source was committed and pushed as
  `541c8759aceaf95f0fe8e64c2bbfacee3fa7744b`. This is the code release identity;
  a later documentation-only commit must not be substituted for it when recording
  the tested/deployed API or Portal artifact.
- **API deployment completed:** workflow `33998093338` succeeded for
  source commit `541c8759aceaf95f0fe8e64c2bbfacee3fa7744b`, with migrations enabled
  (`migrations=true`) and Clerk identity cutover disabled (`Clerk cutover=false`).
  The deployment reported success at `23:16:56Z`, the matching source revision,
  and `migrations_requested=true`. Independent probes returned API health **200**,
  database ping **204**, and public search **200**. Evidence consists of the
  deployment workflow and independent endpoint health; no separate direct API
  runtime-log inspection was available.
- **Portal deployment completed:** Vercel deployment
  `dpl_52EM3DC2oi4Cr84oN6DbrfHeP6iZ` is **READY**, with `aliasAssigned=true`, at
  the same source SHA. `portal.phaenobiotech.com` is assigned to that deployment;
  its deployment URL is
  `phaeno-ops-mgmt-system-hufj549ht-cadexgenomics.vercel.app`. The target is
  `cadexgenomics/phaeno-ops-mgmt-system`, project
  `prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R`, root directory `frontend`. Independent probes
  returned public Portal **200**, Portal API-proxy health **200**, and **401** for
  anonymous notification-summary and Trial-configuration requests. A fresh
  in-app browser rendered sign-in cleanly, with no console warnings/errors.
  The Vercel release-window error query from `23:17:00Z` returned zero rows;
  this bounded query does not establish the absence of every runtime error.
- **Evidence files:** `artifacts/review-gap-closure/production-api-release.log`,
  `production-api-probes.json`, `production-ui-final.json`,
  `production-ui-probes.json`, and `production-ui-errors.jsonl` retain the release
  results. All timestamps in this release record are UTC on 2026-09-05.
- **Public Website boundary:** the separate Website application was not promoted.
  Its contact-form source changes are in the combined source commit, but updated
  queued-success wording and preserved-entry behavior are not claimed live from
  this API/Portal release.
- **Remaining acceptance boundary:** no signed-in session was available for this
  release check. Operator admission, hosted Trial/sample/download workflows,
  provider acceptance and inbox delivery remain unverified. Production
  pause/recovery behavior and external alert collection/routing are not proved
  by the health or sign-in checks. Provider acceptance is distinct from inbox
  delivery; synthetic tests substitute for neither. The migration/startup and
  rollback constraints in the historical review still apply to this artifact.

## Historical separate review and release units — 2026-09-05

This section records the earlier review decision. Its separate-unit hold was
superseded by the combined release authorization above; its dependencies and
identified integration gap still inform the corrective work and release checks.

The Product Owner authorized closing the remaining selector keyboard gap and
reviewing the UI and Website email work as separate release units. The reviewed
index contains **96 accumulated staged files** at the start of this pass.
The groups below describe intended review and release boundaries; they
have **not** been extracted into separate commits, branches, builds, or deployable
artifacts. This review preserves the index. The keyboard correction and this
planning update are later working-tree changes, not an implicit restaging.

### Unit A — shared UI and Trial/CRM/quote recovery

- Include `frontend/src/components/ui/{dialog,searchable-select}.tsx` and the
  selector regression tests; the CRM recovery components/tests; quote dismissal
  and concurrency recovery; Trial pages, dialogs, hooks, presentation, route
  search state, API client and fixtures. Include the corresponding CRM, quote,
  Trial and audience-specific guide changes.
- The three existing Trial backend files belong here:
  `TrialProjectsController.cs`, `TrialDtos.cs`, and `TrialReader.cs`, together with
  `TrialProjectPostgresTests.cs`. Request lookup, sample requirements and release
  availability are required by the new Trial UI. This unit introduces no
  persisted-model change, but depends on the existing Trial, laboratory and
  retention implementation already present in its release base.
- The bounded review found an uncovered Escape path: option buttons could receive
  Tab focus, while the new dialog guard handled only the expanded input. The
  verified correction now covers the open selector's input and options, closes
  choices and restores input focus without changing the selection, then allows
  a second Escape to reach dialog dismissal. The new regression covers option
  focus and caller callback sequencing; earlier input-only coverage did not.
  The limited Trial read/UI and final keyboard-diff reviews found no additional
  confirmed regression. No help change is needed for this expected keyboard
  behavior; existing UI principles already require Escape/focus handling.
- Existing local evidence includes the Trial PostgreSQL checks, CRM and quote
  component checks, actual People/Sales browser recovery, Trial browser journeys,
  and the full 201-test frontend checkpoint. After busy-scroll corrections, the
  11 focused Trial cases, scoped lint, final typecheck and Portal build passed.
  After the subsequent option-focused Escape correction, **27 component tests
  across five files**, scoped lint, typecheck and the Portal production build
  passed. The build retains its existing large-chunk advisory. **Six distinct browser
  cases** passed across desktop/mobile: sample recovery and exact handoff (four)
  plus the new option-focused Escape journey (two). They cover preserved
  selection, no discard until the second Escape, focus on the closed input,
  pointer/keyboard selection, dark/reduced-motion mobile and Axe checks. The new
  test initially omitted punctuation from an expected message; correcting that
  selector produced a passing 2/2 rerun, not a further product change.
  These results were obtained from the combined working tree. Any extracted
  Unit A artifact still needs its own appropriate build/contract verification;
  the record does not claim that it has already been independently assembled.
- Hosted gates remain current staff/external admission, Company/request return
  context, authoritative stale-record recovery, sample authorization/shipping,
  and downloads through the actual storage/proxy/retention configuration.
  Synthetic fixtures and automated accessibility scans do not replace those
  checks or human assistive-technology acceptance.

### Unit B — Website durable email, recovery and processing

- Include all changed `backend/app/Features/Website` files: transactional intake
  enqueue, sender error propagation, attempts/recovery, processing controls,
  monitoring, endpoints, model configuration and hosted-service registration.
  Include both Website migrations, their designers, the model snapshot and ERD;
  the Website backend tests; `frontend/src/api/web-ops.ts`; dashboard integration,
  delivery/processing components and their tests/fixtures; and the public
  `ContactForm` error helper, preserved-entry behavior and queued-success wording.
  Website README, owning Website plan, operational guidance and corresponding
  help changes travel with this unit.
- **Historical hold: confirmed parent-tab integration blocker.**
  `frontend/src/features/dashboard/WebOpsDashboardContent.tsx:164–180` defines
  only Mailing List and Demo Requests tabs; line 424 renders `notificationPanel`
  after the tabs. `DashboardPanelSelector.tsx:333` supplies that panel in live API
  mode, so Email delivery stacks below either intake list. This conflicts with
  the documented third selectable panel and the one-panel-at-a-time UI rule.
  The browser fixture `frontend/e2e/fixtures/web-ops.tsx` mounts
  `WebOpsDeliveryPanel` alone, so the passing panel tests do not cover this parent
  integration. A bounded parent-tab correction and integrated tab/keyboard/
  responsive test are required before releasing Unit B. No parent-dashboard
  source correction was made in this focused pass.
- Local subsystem evidence remains 27 distinct Website backend checks, four
  WebOps browser cases, the public form's 14 synthetic scenarios and two Node
  cases, successful API/Portal/Website builds, and local migration/no-drift
  checks. The queue review found no additional confirmed backend flaw; it does
  retain consequential rollout conditions below. Passing isolated panel and
  fake-provider tests do not close the integration blocker or hosted gates.
- Apply `20260905213944_AddWebsiteNotificationRecovery` followed by
  `20260905222201_AddWebsiteNotificationProcessingControl` before the new API.
  The seeded control is running (`isPaused=false`), and the registered worker
  starts processing automatically. A launch intended to remain paused must set
  the persisted control before the new worker starts; opening Web Operations
  after startup is not a reliable first-send gate. Intake and recovery still
  require the schema while paused. Hosted release must verify backup/restore
  readiness, actual
  platform-admin admission, provider configuration/acceptance, multi-instance
  pause and recovery, intake retirement races, and deliberate email acceptance
  versus inbox evidence. Configure and verify the external metrics/log collector
  and alert destination separately; emitted local signals do not establish it.

### Shared files, dependencies and rollback coordination

| File or artifact | Required separation work before independent release |
| --- | --- |
| `frontend/src/content/docs/phaeno/getting-started.mdx` | Separate the CRM workspace correction for A from the Web Operations selector/recovery/pause guidance for B. Keep B wording aligned with its corrected parent tabs. |
| `docs/operations-readiness.md` and this closure plan | Preserve current historical/release boundaries while separating CRM/Trial readiness from Website schema, worker, monitoring and rollback guidance. Neither unit inherits another unit's completed release status. |
| `docs/plans/{BACKEND,FRONTEND,E2E}-TEST-PLAN.md` | Keep dated combined checkpoints as prior evidence; attribute cases and open gates to A or B. Do not count focused reruns again or present combined-tree builds as independent-unit builds. |
| `backend/app/Documentation/corpus.json` and frontend `documentation-catalog.json` / `documentation-version.json` | Regenerate from the exact guide set included in each artifact. Do not selectively copy stale generated hunks or ship B help in an A-only release. Keep packaged backend corpus and frontend metadata consistent. |
| EF snapshot, migration designers and `docs/database-erd.md` | The new persisted model belongs to B. Keep both additive migrations and their full model metadata together; regenerate/verify against the extracted model rather than trimming generated text by hand. A must not acquire the new Website model through a combined snapshot. |
| Shared primitives, feature tests and browser fixtures | A owns the Dialog/SearchableSelect correction. B uses the existing dialog interface but does not require the new Trial-specific read contract or selector behavior. Keep feature fixtures with their unit; verify the actual WebOps parent composition as well as its isolated panel. |
| Owning plans and UI policy | CRM, Prospect Trial and order recovery hunks belong to A. Website consolidation and the Web Operations paragraph in `docs/ui-ux-principles.md` belong to B. Preserve unrelated earlier plan history. |

Both units currently build into the same API and Portal artifacts; the public
Website is a separate application. Withholding B while releasing A requires
omitting the entire B source/model/migration/UI/help set, including the intake
outbox switch and sender rethrow behavior. Merely pausing the worker does not
withhold B or remove its schema dependency. Deploy the matching Trial API read
additions before or with A's Portal UI; deploy B's schema and API before its
recovery UI and queued-success Website wording. Independent artifact construction,
Git operations and shared rollout require their own authorized execution.

An A rollback must coordinate its API/UI contract and retain already-recorded
Trial, sample and commercial actions; reverting code does not undo user work.
For B, prefer a forward correction when possible and retain additive tables,
intents, attempts and audit history. Old API binaries bypass the durable pause,
resume synchronous sends on new intake, stop processing the saved queue, and
cannot serve the new recovery UI. A rollback therefore requires coordinated
API/Portal/Website decisions and explicit outbound-delivery containment; the
pause alone is not a rollback barrier and no code rollback can unsend email.
The existing `deployment/hetzner/green/deploy-release.sh` runs authorized
migrations before API startup (lines 254 and 271) and disables automatic image
rollback after a migration (lines 105–106). This is inspected deployment logic,
not evidence that either unit has been deployed or its hosted gates passed.

## Authorized follow-up — 2026-09-05

The Product Owner requested execution of the remaining reload protection,
operations-document reconciliation, and email-processing pause/monitoring work.

- Trial users see **Reloading current Trial…** while explicit recovery runs.
  Editing, saving, repeated reload, closing and navigation are blocked until it
  settles. Failure keeps the draft and allows another deliberate attempt.
- Phaeno platform administrators can **Pause email delivery** or **Resume email
  delivery** from Web Operations, reviewing the effect and entering a reason.
  The setting survives restarts, uses optimistic concurrency, and retains an
  actor/time/reason audit. Pause prevents new claims after acknowledgement;
  an already claimed delivery may finish. Intake and manual recovery continue
  to queue messages while paused, and resume processes the existing queue.
- Email delivery shows processing status, pending/sending/failed counts, oldest
  queued time, expired claims, and **Needs attention** filtering. Monitoring runs
  while paused, emits bounded structured warnings and numerical gauges, and does
  not put contact names, addresses, or intake content in logs or metrics.
- Operational documentation reflects implemented CRM, Website cutover history,
  current schema/migration lineage and background processing, while separating
  local evidence from shared activation and live-provider acceptance.

Engineering scope includes additive `website.web_notification_processing_controls`
with one seeded row; the ERD and local migration accompany it. The authenticated
WebOps contract adds `GET notifications/summary`, `POST notifications/processing`
with version/isPaused/reason, and `attentionOnly` filtering on notification lists.
An `isProcessingExpired` row projection distinguishes interrupted work from
active sending. Retiring intake cancels queued/failed messages while retaining
attempt history; a late failed send or expired final claim also resolves without
leaving retired intake in the attention queue.
No dependency, authentication, anonymous intake contract, or scientific business
rule changes are needed. Shared migrations, Git, deployment, actual messages and
external alert-sink configuration remain separate release actions. Local checks
use fake senders, synthetic browser responses, and isolated PostgreSQL. Acceptance
requires paused queues to retain messages without consuming attempts, resumed
queues to process them, stale updates to preserve reason text, and Trial reloads
to prevent overlapping actions while preserving drafts.

### Follow-up completion and evidence

- Trial form, sample roster and scope reloads now hold a synchronous busy guard,
  protect drafts on failure, and block edits, repeat actions, dismissal and
  navigation while fetching current data. Busy dialog content remains keyboard
  scrollable through a named, visibly focused target; ordinary form tab order is
  unchanged. A changed scope still requires deliberate renewed acceptance.
- Durable email pause/resume, required audited reason, current-version recovery,
  retained queued work, attention filtering and independent monitoring are
  implemented. Interrupted claims are excluded from the UI's **Sending** count.
  Monitoring has bounded logs and numerical gauges; connecting those signals to
  a hosted alert destination is part of the separately authorized rollout.
- Operations readiness, audience-specific help, Website integration notes and
  living test plans are reconciled. Generated documentation is current for
  **55 guides**, fingerprint `3633301d1516`.
- **27 distinct Website backend checks passed, zero skipped:** 11 PostgreSQL
  workflows, one independent-connection pause/in-flight test, one fake Mailgun
  failure test, one monitoring/log/gauge test, and 13 existing Website API cases.
  The Release build passed with zero warnings/errors; EF reports no model drift.
- The full frontend checkpoint passed **201 tests across 66 files**, lint and
  typecheck. After the final busy-scroll accessibility changes, **11 Trial and
  six WebOps focused tests**, scoped lint, TypeScript and production build passed.
  The build retains its existing large-chunk advisory.
- **14 distinct Trial/WebOps browser cases passed** across desktop/light and
  mobile/dark, including reduced motion, preserved reasons, pause/resume, expired
  labels, busy-action protection, and failed reloads. The initial run found
  disabled Trial content lacked keyboard scrolling; the corrected sample journey
  and final email-control journey passed **4/4** targeted reruns, including
  Tab/PageDown and Axe checks. Tested surfaces have no page errors or horizontal
  overflow. Final screenshots were visually inspected.
- Additive migration `20260905222201_AddWebsiteNotificationProcessingControl`
  was inspected and applied to both isolated reference PostgreSQL and configured
  local `phaeno_ops` after backup. The singleton starts running with no actor or
  reason, and the complete ERD now covers **157 tables**. No shared database was
  changed. Backup: `artifacts/review-gap-closure/phaeno-ops-before-processing-control.dump`.
- Frontend/build/browser evidence is retained under
  `artifacts/review-gap-closure/followup-*`; backend test results were captured in
  task output and the no-drift result is in `website-processing-pending-model.log`.

## Initial review scope and completed checkpoint

The Product Owner requested that all nine findings from the renewed code review,
including related Trial form and selector improvements, be addressed. This plan
records the bounded implementation and cross-application contract changes.
The owning CRM, Trial, order, and Website plans continue to govern business rules.

## Product scope and acceptance

Users are public Website visitors, Phaeno commercial/laboratory operators, and
authorized external Trial members and administrators. The work closes interrupted
inquiry, intake, review, download, and recovery paths without changing scientific
approval, tenant authorization, commercial eligibility, or production activation.

| Review item | Required resulting behavior |
| --- | --- |
| 1. Website delivery recovery | Enqueue Website notices durably with intake; record delivery attempts and provider acceptance separately from mailbox delivery; retry temporary failures and allow authorized staff to recover or resend eligible notices. Do not silently claim a technical brief was delivered. |
| 2. Trial concurrency recovery | Reload authoritative Trial state, refresh scope-dependent dialog content and choices, preserve valid entries, and require renewed acceptance of a changed scope before resubmission. |
| 3. Trial sample batches | An administrator prepares a bounded sample roster and submits it atomically, producing one laboratory authorization and shipment for samples sharing the chosen type and destination. |
| 4. Sample requirements | Display the selected type's exact quantity unit and range and the approved analyses' required inputs; validate against those requirements before submission. |
| 5. Result download continuity | Superseded partial archives become historical entries; current release controls show progress, retention closure and actionable failures, and refresh after transfer attempts. |
| 6. Unsaved work | Trial dialogs, scope editing and quote dialogs warn before discarding changed entries and prevent dismissal while a save is pending. |
| 7. CRM query recovery | Contacts, Opportunities and requests distinguish loading, genuine emptiness and failed retrieval, with scoped retry actions. |
| 8. Website form errors | Preserve entries on failure and distinguish API error codes; reset only after successful intake. |
| 9. CRM-to-Trial context | The selected Company's request opens Trial creation with that exact request and a route back to its Company; an already-started request opens its existing Trial. |
| Related polish | Use shared required-field and fixed-header feedback patterns, accessible searchable selectors and server paging for capped Trial request choices. |

Success is measured by completion of these concrete journeys and their recovery
states, with focused regression coverage and proportionate desktop/mobile visual
and accessibility verification. No production conversion or delivery metric is
claimed from local verification.

## Engineering scope

- Preserve the anonymous Website route/envelope and duplicate-contact policy.
  Persist notification intent transactionally, dispatch outside the intake request,
  and expose a platform-administrator recovery surface. Use the existing Mailgun
  provider; add no dependency or identity-provider change. A new additive local
  migration will accompany any delivery model change, with the complete ERD.
- Extend Trial read contracts with sample constraints and result availability;
  retain authoritative backend validation and existing batch submission semantics.
  Add bounded, searchable request lookup so a deep link does not depend on the
  first 250 choices. Keep scientific review and result-release permissions intact.
- Keep feature-owned components and hooks; reuse established modal/field patterns.
  Preserve entered values and focus, and avoid nested ordinary edit dialogs.
- Maintain audience-specific help, owning plans and living test plans. Regenerate
  the documentation corpus after guide edits.

## Delivery boundary

Implementation, local model migration and appropriate local verification are in
scope. Git mutations, deployment, shared-database migrations, real outbound
messages and production storage/retention activation are outside this change.
Tests use synthetic data and fake senders; no real inquiry is submitted.

## Implementation and verification record

### Implemented behavior

- Website intake and notification intent commit together. Worker claims use
  optimistic versions and bounded leases; every attempt is retained. Five failed
  or interrupted attempts move a message to staff attention. Explicit resend and
  legacy technical-brief recovery validate active intake, apply cooldown/version
  checks, and retain immutable actor audit events. Web Operations provides
  **Email delivery**, attempt history, recipient review and controlled recovery.
- Public signup preserves entries on validation, reCAPTCHA, duplicate, throttling,
  network and server failure. A duplicate signup cannot trigger another brief;
  successful intake confirms queued work instead of inbox delivery.
- Trial acceptance and other bounded actions rebuild their visible content,
  choices and payload from the authoritative record on explicit reload. Failed
  reloads retain mounted forms and their entries. Scope editing clears retired
  catalog selections while preserving other draft values. Changed scope requires
  renewed acceptance. Dirty dismissal/navigation is guarded and pending saves
  disable editing and dismissal.
- The sample roster sends multiple samples in one request and creates one
  authorization/shipment. It exposes exact quantity units/ranges and current
  analysis requirements, validates each row and the allowance/replacement set,
  and preserves the roster across conflicts. Required controls use the shared
  legend, field and feedback patterns; large choices support accessible search.
- Result controls use backend availability and retention projections, show
  transfer progress/errors, refresh after attempts, and direct historical partial
  releases to the complete package.
- Company Trial links carry the selected request and Company return context.
  Request search is server-paged and supports exact lookup beyond configuration
  limits. Creation refreshes request and CRM caches and opens the resulting Trial.
- Quote changes require explicit discard and cannot close during issuance or
  recovery. CRM request queries distinguish loading, errors and genuine empty
  results. The final route audit identified separate live People/Sales components;
  both now use the shared recovery feedback, preserve cached rows, and protect
  association/invitation forms while prerequisite queries fail. Open entries are
  preserved during retries. The corresponding guides identify the live tabs.
- Audience-specific guides, review dates, owning plans and living test plans are
  updated. The complete ERD covers both new Website tables and all existing models.

### Local evidence

- Backend Release build: passed, zero warnings/errors. Focused Website API,
  notification, Trial domain/PostgreSQL and persistence tests: **51 passed,
  zero skipped**. The PostgreSQL tests use an isolated local reference cluster
  with commit tracking; email tests use fake senders/HTTP handlers.
- Final frontend suite: **195 tests passed across 65 files**. The earlier
  **47 focused cases** and final **11 CRM cases** also passed. Lint, typecheck and
  production build passed. Documentation freshness passed for all 55 guides.
- Trial browser journeys: **10/10 passed** across desktop Chromium/mobile Chrome;
  subsequent roster and handoff refinements each passed **2/2** targeted checks.
  Web Operations recovery: **2/2 passed**, including recipient review, stale-version
  retry, attempt history and focus restoration. Live Company People/Sales recovery:
  **2/2 passed**, verifying separate retries, no false empty lists, safe association
  gating, keyboard access and preserved data. There are **14 distinct Portal
  browser cases** across these suites; targeted reruns are not counted again.
- Public Website: **14/14 synthetic browser scenarios passed**, six preserved-entry
  failures and one success at each viewport; two Node error-classification tests
  also passed. Separate Website build: **17 pages passed**.
- Tested browser surfaces had no page errors, horizontal overflow, or Axe
  WCAG 2/2.1/2.2 AA violations. Desktop/light and phone/dark Portal screenshots,
  batch-dialog feedback/footer, and Website phone form were visually inspected.
  A scoped dark-theme delivery status contrast correction was rechecked.
- Migration `20260905213944_AddWebsiteNotificationRecovery` was inspected as
  additive, applied to isolated reference PostgreSQL and configured local
  `phaeno_ops` after a backup, and checked for pending model drift: none.
- Evidence, logs and screenshots are retained in ignored
  `artifacts/review-gap-closure/`. Website replay results are in
  `website-browser/report.json`; the synthetic replay script is retained beside
  that directory. Backup: `phaeno-ops-before-email-recovery.dump`.

### Release boundary

No Git mutation, deployment, shared migration, actual Website inquiry, real email
or production file transfer was performed. Shared rollout requires the additive
migration before the new API worker and recovery surface are used. Hosted
identity/admission, provider configuration and acceptance, actual inbox delivery,
production storage/retention, and human assistive-technology acceptance remain
separate release checks. Provider acceptance and local fake-provider success do
not prove inbox delivery. Temporary browser/database helpers are stopped after
verification; evidence and the local development schema remain.
