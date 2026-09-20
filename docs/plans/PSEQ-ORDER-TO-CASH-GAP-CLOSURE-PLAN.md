# PSeq Order-to-Cash Gap-Closure Plan

## Finance list navigation and search — September 19, 2026

Finance uses the shared standard tab bar. Invoice, receipt, and Customer billing lists place a customer-name text search and Clear filter in the shaded, bordered card header. Search matches partial names without case sensitivity and persists in route state across tabs and record navigation. Existing customer-ID links remain supported. Focused regression source covers partial-name filtering, selection and clearing; automated suites remain request-only.

## Billing approval and completion handoff - September 12, 2026

Actual signed-in FIN-01 billing validation, approval, approval reset after a terms change, reapproval and reload passed on the existing marked Customer A. Saved profile is version 4/configuration 3, Net 45 with a synthetic 10% tax rate. All invoice readbacks stayed identical; receipt totals remain 8/$108 unapplied. Settled desktop/390px billing screenshots inspected. FIN-01 remains partial: neither saved InProgress Job has terminal Commercial samples, governed release does not advance those statuses, the current Job UI has no completion action, and this isolated runtime lacks CommercialOperator. No completion, invoice issuance, PDF, role change or production action was performed. [Evidence and next implementation slice](../testing/runs/2026-09-12-lab-production-verification.md#billing-approval-and-completion-handoff---september-12-2026).

## Real scanner and receipt evidence - September 12, 2026

Real ClamAV is now active only for the isolated LAB-06 API. The integration already existed; the earlier missing-integration diagnosis traced only the DevelopmentFixture implementation and was incomplete. Real clean/EICAR/encrypted/oversize/health checks and both injected storage/scanner adapter checks passed. Signed-in Cash upload rejected EICAR with no receipt, retained entries, then saved one $1 receipt after a clean replacement. Exact 83-byte download passed; Billing-only access returned 403 and anonymous access 401. A discovered client filename defect was fixed locally: supported server extensions are retained for receipt evidence, including JSON imports. Nine scanner tests, ten focused frontend tests, TypeScript, scoped lint and documentation checks passed. Existing balances/history remain intact; there are 14 invoices/$645 outstanding and eight receipts/$108 unapplied. [Exact runtime and saved evidence](../testing/runs/2026-09-12-lab-production-verification.md#real-scanner-and-receipt-evidence--september-12-2026). No deployment, migration, auth change or Git mutation. Remaining legitimate issuance/PDF, scientific independence and production/physical/provider gates stay open.

## Finance role separation - September 12, 2026

Owner approved one additional development-only CashOperator + CashReconciler login. Actual signed-in UAT passed second-operator import ownership rejection (preview and direct confirm), with retained input and no receipt created. The combined-role user then imported a separate $7 receipt; a different Cash Operator created/submitted its reconciliation. Approval by the receipt contributor returned 409 and left the batch Submitted/version 2 with no approval/report. This isolates contribution exclusion from creator/submitter exclusion. Existing approved reconciliation and all previous receipt readbacks remained identical. Outstanding invoices remain $645; seven receipts now have $107 unapplied. No product defect, code, production role, provider policy, migration, Git or deployment change. [Evidence and saved records](../testing/runs/2026-09-12-lab-production-verification.md#finance-role-separation--september-12-2026). Scanner-backed upload, legitimate issuance/PDF, and production/physical/provider acceptance remain open.

## Finance aging boundaries - September 12, 2026

Actual signed-in Billing verification passed all eight aging boundaries (0, 1, 30, 31, 60, 61, 90 and 91 days) using separately marked isolated fixtures. At UTC date 2026-09-13, bucket totals are $391 current, $6 at 1-30 days, $24 at 31-60, $96 at 61-90 and $128 over 90: $645 outstanding. Aging CSV has 12 open rows; all-invoice CSV has 14 rows, including Paid and WrittenOff. Customer filtering leaves the labeled all-Customer aging/export scope unchanged. Existing receipts, allocations, adjustments and reconciliations were preserved; unapplied cash remains $100. Desktop and fresh 390px page screenshots inspected. This is synthetic arithmetic/export evidence, not legitimate issuance/PDF or production acceptance. [Saved evidence](../testing/runs/2026-09-12-lab-production-verification.md#finance-aging-boundaries--september-12-2026). No product code or new automated suite changed. Remaining role-combination, scanner, issuance and production gates stay open.

## Finance exceptions and upload correction — September 12, 2026

Live negative, concurrency, split-allocation, cancellation and recovery cases passed. Receipt upload incorrectly serialized FormData as JSON; corrected multipart transport. Automatic validation errors incorrectly carried success=true; corrected to the existing failure envelope with field details. Eight backend and 38 frontend focused tests plus static checks passed. Isolated API restarted with unchanged configuration; actual scanner-unavailable rejection preserves fields and saves no receipt/evidence artifact. No auth/schema/dependency/Git/deployment change. Latest saved totals are $390 outstanding/$100 unapplied; prior approved reconciliation preserved. [Run checkpoint](../testing/runs/2026-09-12-lab-production-verification.md#finance-exceptions-and-upload-correction--september-12-2026) tracks remaining real scanning/issuance, extra role combinations, overdue and production gates.

## Finance closeout and corrections continuation — September 12, 2026

Closeout presentation follow-up is implemented locally: readable validated saved approval plus text download; no new backend contract or authorization. Actual Reconciler and narrow/theme/keyboard checks pass. Cash completed both main allocation reversals and receipt reversal; Billing credit/debit/write-off yielded $90/$115/$0. Main invoice now has $220 outstanding and the reversed receipt has $0 unapplied; preserve this state instead of replaying the preceding checkpoint. Current aging/all-Customer exports reconcile to $625 outstanding and $75 unapplied; Approved $75 reconciliation remains unchanged. Forty-four focused tests, TypeScript, scoped lint and help corpus check pass. Remaining cases are listed in the [latest run record](../testing/runs/2026-09-12-lab-production-verification.md#finance-closeout-and-corrections--september-12-2026); full FIN and production gates remain open. No commit, deployment, migration or account/role change.

## Populated Finance UAT checkpoint — September 12, 2026

Isolated TEST-ONLY-FIN-20260912 fixtures are saved; do not recreate or repurpose laboratory records. Actual Finance sessions passed invoice review/filter return, CSV validation/confirmation/duplicate prevention, allocation arithmetic, one reversal, and approval by the non-contributing Reconciler. Main invoice has $120 outstanding; its receipt has $150 unapplied and one active $100 allocation. Separate $75 reconciliation is Approved. Synthetic invoices have no real PDF or completed lab Job, so FIN-01 remains unverified. Remaining reversals/adjustments, ownership/concurrency/negative API cases, exports and scanner/physical/production gates are in the [run checkpoint](../testing/runs/2026-09-12-lab-production-verification.md#populated-finance-acceptance--september-12-2026). Raw-JSON closeout needs readable/downloadable presentation follow-up. No product code, auth configuration, migration, Git or deployment change in this checkpoint.

## Finance UAT continuation — September 12, 2026

UAT-20260912-05: invoice detail offered Open order to Billing-only users, while the commercial detail API requires platform administration. A new focused regression reproduced the unwanted link. Added an optional existing-capability input to the Finance panel, populated from canManageOrderConfiguration at both callers; Billing-only users retain invoice review/adjustment but do not receive the forbidden commercial link. Administrator commercial access retains it. Backend authorization and roles are unchanged. Updated Phaeno Finance guidance. All 57 focused tests across five Finance/Attention/navigation/result files, TypeScript, scoped lint and documentation check pass (56 guides, 98d5a6df074c). The older panel test mock was updated to retain the real disabled-feature classifier; two missing-export test failures were not product failures.

Live LAB-06 Bill negative checks pass: a Finance bookmark falls back to permitted commercial intake, sidebar has no Finance, and a direct all-zero invoice-ID route renders unavailable without financial controls. This is UI gating evidence, not proof against an existing invoice or a backend bypass test. Read-only active business-role inventory in the isolated database found only the existing ResultReleaseManager assignment; no BillingOperator, CashOperator or CashReconciler accounts are available. That initial identity blocker was resolved by the owner-approved setup below; populated financial workflows remain separate.

### Approved Finance test identities — created and verified locally

Use the configured Clerk development instance only, after verifying it is a development tenant. Prepare three dedicated test sign-ins below, reusing a matching existing test identity only after confirming ownership and scope. Create Phaeno membership and the single stated business role in phaeno_ops_lab06_uat only. No platform administration, Lab/release role, shared/production membership or role changes. Generate credentials at setup time, keep them out of source, and do not send invitation email. Preserve Bill, William and the independent reviewer accounts.

| Test identity | Development sign-in | Isolated role |
| --- | --- | --- |
| UAT Billing | uat.billing+clerk_test@example.com | BillingOperator |
| UAT Cash | uat.cash+clerk_test@example.com | CashOperator |
| UAT Reconciler | uat.reconciler+clerk_test@example.com | CashReconciler |

After setup, verify each account's allowed landing section, unavailable commercial links, Finance section/action boundaries and existing-record access. Keep Cash Reconciler free of contributing activity. Start with read-only navigation and cancellation; no real financial activity, publication or production activation is authorized by this identity setup. Any prerequisite financial fixtures must remain separately identified and isolated under FIN-01–06. The owner authorized this scope with Continue. All three identities were created in verified development instance ins_3EaSONG9skFvfhZDZcWQuSitf9y and linked only to the isolated database. Each is active, has General department membership, and has neither organization/department administration nor Lab/release roles. Credentials are Windows-protected in ignored local test files; no password is recorded in source. No invitation email was sent.

### Role dashboard correction and acceptance — UAT-20260912-06

Actual Billing login exposed a home-dashboard permission error: it mounted the commercial intake summary although the user lacks commercial-administration access. OrderOperationsSummary now preserves that summary for administrators and renders permitted workspace links for other roles using the existing section-capability rules. It never mounts commercial queries for Billing, Cash, Reconciler or release-only users. No backend access or provider policy changed.

Separate real browser sessions passed all three logins with password and Clerk development email code, dashboard access, allowed Finance sections, no administrator/release sidebar entries, and old Intake bookmark fallback to Finance. Billing sees Invoices and aging/Customer billing; Cash sees Receipts/Import receipts/Reconciliation; Reconciler sees only Reconciliation without cash-entry controls. No failed application requests, browser page errors or attempted operational writes. Each dashboard fits 320px; settled Billing dark-theme screenshot was inspected. Browser contexts closed, owner tabs untouched.

Six new dashboard regressions plus existing focused checks pass: 63 tests across six files. TypeScript, scoped lint and 56-guide documentation check pass (ac2efe54ca0b). Phaeno Order operations help updated. Database readback confirms three single-role non-admin accounts; invoices/receipts/reconciliations remain zero before and after. Identity setup and role navigation are complete; populated financial records, invoice commercial-link browser acceptance, dual-control approval, scanner-backed receipt evidence and deployed retest are not claimed.

## Disabled operational capabilities — September 12, 2026

UAT-20260912-04: narrow package-detail continuation found long identifiers overflowing the header, facts and action confirmation. Implemented scoped shrink/wrapping without truncation or workflow changes. Isolated real-component browser acceptance passes 320/390/1440 light/dark, expanded evidence, ready/disabled detail, dialog containment/cancellation/focus and withdrawal reason gating. Twenty-three focused regressions, TypeScript/scoped lint pass. Guide reviewed, no procedural change. Real accounts/records untouched; no release or deployment. Signed-in/full-shell responsive and wider external/role gates remain separate.

Latest acceptance supplement: existing LAB-14 runtime (3014/7114, governed results already disabled) passed signed-in Bill result queue, direct package gate/keyboard return, and disabled Attention dashboard checks. Actual result queue light/dark desktop styles/non-overflow passed; System theme restored. No flag, role or operational record changed. This closes earlier pending local signed-in disabled result/detail/dashboard coverage. Direct-detail narrow layout, role-enforced Finance, populated CRM recovery, production correction retest and external/physical release gates remain open; see the production/local verification run.

Administrator-role supplement: Bill Haack's signed-in local administrator account loads commercial intake, but with business-role enforcement enabled has no operational Attention role. Dashboard queried it regardless and showed Attention unavailable. Correction uses the existing five role capabilities consistently to gate the dashboard request/count/shortcut and operational panel. Administrator Attention navigation separately retains CRM sale-summary recovery. No backend roles or permissions changed; stale cached counts are suppressed for unauthorized roles. The administrator/direct-link/live recovery checks and focused regressions are part of this acceptance checkpoint.

Administrator checkpoint completed locally: six-order dashboard now omits unauthorized Attention feedback and controls; CRM recovery opens its empty state; View commercial order opens the matching ingestion Job without a permission alert. All 23 focused tests, final TypeScript/scoped lint and documentation check pass (68829f5db33f). Original Scanning/Pending package preserved and restored. Populated recovery, Finance-role browser, signed-in disabled results and deployed checks remain open; no operational submission, role change or deployment.

Production acceptance found that Phaeno operators see disabled Attention and Result release capabilities as failures. Approved follow-up: distinguish the existing explicit HTTP 404 `attention_operations_disabled` and `governed_results_disabled` responses from outages, permissions and missing records. Present neutral Not enabled guidance, withhold unusable queue filters and stale rows/actions, and remove the dashboard Attention retry/link when disabled. Keep stable workspace navigation and direct links so the reason is discoverable; CRM sale-summary recovery remains independent. Preserve ordinary error feedback, successful queues, default release state, authorization and deployment flags. No API contract, authentication or production activation changes.

Implemented locally: shared neutral status notice in Attention, result queue and direct result-package links; disabled dashboard retry/shortcut suppressed. Explicit disabled responses take precedence over stale cached results. Workspace routes and independent CRM recovery remain available. The Phaeno guide and generated documentation corpus are updated.

Verification: 12 focused component tests passed across DisabledOperationalCapabilities.test.tsx and ResultReleasePanel.test.tsx; TypeScript and scoped ESLint passed. Coverage includes both disabled responses, stale result rows, direct package return navigation, dashboard outage retry, and distinct 403/404/503 failures. Documentation generation/check passed for 56 guides, corpus bb135a92fbbc. One initial test assertion caught the loading status before the settled response; corrected to await the disabled title, with no product workaround. Browser inspection of the correction in a disabled, authorized session and production retest remain pending. No API/auth/flag changes, operational writes, Git mutation or deployment.

Browser supplement: local William session passed actual disabled Attention presentation, desktop light/dark computed styles, Enter/Escape focus restoration and enabled release queue retention. Narrow viewport, disabled results/dashboard browser checks and deployed retest remain pending. See the production verification run for measured evidence.

Open UAT-20260912-03: reviewer/release-manager navigation offers Order intake and defaults there, but CRM-backed intake queries reject this account. Follow-up should distinguish general operational read access from commercial intake capability and select an available landing section; backend authorization must remain unchanged.

Approved continuation implements capability-aligned navigation using the existing platform-admin-derived canManageOrderConfiguration capability for Intake, PSeq kits, Assembly and Legacy integrations. Current controller reads all call RequirePlatformAdminAsync; canViewAllOperationalOrders includes release/Finance business roles and cannot authorize these queues. This records the discrepancy between older broad role wording and implemented backend access. No backend privilege expansion or authentication/contract changes. Default selection prefers Intake, Results, Finance, Attention, then other available sections; explicit permitted sections remain selected. Supporting organization/integration/notification queries run only for their selected permitted workspace. Phaeno guidance updated; focused role tests and live William acceptance pending.

Correction checkpoint: UAT-20260912-03 is fixed and retested locally. Nineteen tests across role navigation, disabled capability presentation and result workspace passed; TypeScript/scoped ESLint passed. Phaeno guide metadata and 56-guide corpus generated/checked (a5508d7b3533). Live William session on 3016 opens Result release by default, hides administrator-only queue entries, falls back from an old Intake bookmark, and retains explicit Attention navigation. Original ingestion checkpoint restored with no operational submission. Other-role browser coverage and deployed production retest remain pending; no Git mutation/deployment or backend authorization change.

Related-link supplement: live William acceptance reproduced the same permission mismatch through Result package > View commercial order. That link now uses the same administrator-derived capability as its destination; scientific-review access remains independently controlled by laboratory capability. Two focused regression cases cover restricted reviewer/release and administrator links. No access grants or backend changes; Phaeno release guidance updated.

Responsive supplement: actual dashboard/Attention/result queue components with simulated API responses passed separate browser checks at 320/390/1440 in light/dark themes, including full CSS, non-overflow, visible keyboard focus and a genuine-error control. Temporary preview only; no account, runtime feature flag or backend record changes. Screenshot evidence and scope limits are in the production/local verification run. Authenticated disabled-result/dashboard and other-role/live production acceptance remain pending.

## Invitation branding and Mailgun consolidation — 2026-09-08

The owner approved branded invitation email and consolidation of all existing
Mailgun templates under `mg.phaenobiotech.com`. Nine account templates (eight
localized technical-brief variants and the invitation) were backed up with all
versions and moved into the domain, preserving their original names, content,
active version tags, and nonempty headers. Three existing Website domain
templates were retained unchanged. The final inventory is zero account-level
and twelve domain-level templates. Mailgun rejects cross-level duplicate names;
verified temporary domain copies allowed the original names to be preserved.

The domain invitation has a new active `branded-20260908` version with the public
Phaeno PNG logo, navy action, readable fallback URL, and company footer. Its
`initial` version remains available for rollback. The repository HTML is the
reviewable source; Mailgun stores the deployed domain template. The local sender
now selects `organization-invitation.en-us` and sends private template variables
through `t:variables`, with a plain-text fallback and click/open tracking off.
No additional invitation locale is claimed. The Portal explicitly declares its
existing PNG favicon, including on the invitation acceptance route.

The owner explicitly approved disabling Mailgun's automatically appended
unsubscribe footer for the domain. Suppression records and any explicitly
authored template unsubscribe links remain unchanged. Local sending was restored
after the owner added the development network's public IP to Mailgun's allowlist.
Provider acceptance and user-confirmed inbox receipt were verified for the
original invitation; the Portal's legacy delivery label still incorrectly says
Not sent and remains a separate follow-up. Acceptance has not been exercised.

Focused verification: four Mailgun sender/renderer/webhook tests passed, frontend
TypeScript passed, and the API build passed with zero warnings/errors. The local
API restarted healthy and Mailgun accepted and delivered a refreshed branded
invitation at 11:06 AM Pacific; owner inbox appearance review is pending. Mailgun
template/settings changes are live; application changes are local only, with no
Git mutation, deployment, migration, or Gmail sender-logo/BIMI change.

## Intake consolidation - 2026-09-07

Order intake > New Customer order replaces the separate Order staging screen. The same pricing form serves direct creation and CRM handoffs. All active Customers are visible; selected-Department readiness separates pricing blockers from additional quote and invoice requirements. The legacy staging API remains for compatibility but has no frontend entry point. Readiness offering checks now match the canonical specimen service used by order creation, and missing system configuration reports incomplete setup.

This is the approved implementation authority for closing the gaps found in the
2026-08-29 live PSeq Order-to-Cash walkthrough. Keep this plan current as each
slice is implemented and verified.

The Product Owner provided fresh authorization on 2026-08-29 to commit, push,
apply the additive migration through the encrypted-backup deployment workflow,
and deploy this release. That authorization does not enable the additive
order-to-cash feature flags or dual-control enforcement before their dedicated-
staging, staffing, provider, security, and accessibility gates are complete.
The synthetic production records named `SOP-MOCK-OTC-20260829` must eventually
be deactivated after evidence is preserved; this release does not alter them.

## Status

- The additive implementation, migration, and disabled-by-default production
  release are complete. Restored-database and dedicated-staging acceptance
  remain open activation gates.
- Feature activation remains a separate controlled rollout decision; this
  release does not enable governed-result, attention-operations, or dual-
  control enforcement flags.
- Target: PSeq Lab Service in POMS/Phaeno Portal.
- Currency: USD only; no foreign-exchange behavior.
- Financial boundary: POMS owns operational accounts receivable. A future
  accounting adapter may post to a general ledger. Online ACH/card processing
  and QuickBooks integration are not part of this implementation.
- Scientific-file boundary: POMS stores final deliverables only. Raw and
  intermediate pipeline data remain outside POMS.
- Result release is never gated by invoice balance or credit status.
- Partner PSeq Kit and Partner data-assembly payment/release behavior is not
  changed by this plan.
- Local Development enables the native PSeq accounts-receivable path so quote
  issuance is exercised without a QuickBooks Customer link. The base setting
  remains disabled pending the separate shared-environment activation gates.

## Superseded PSeq Lab-Service Assumptions

For PSeq Lab Service, this plan supersedes older statements in
`ORDER-MANAGEMENT-PLAN.md`, `LAB-OPERATIONS-PLAN.md`,
`LAB-OPERATIONS-CONTRACT.md`, `docs/business-rules.md`, and current user guides
that:

- make QuickBooks authoritative for PSeq quotes, invoices, tax, balances, or
  payment state;
- gate PSeq result release on credit approval, invoice synchronization, or
  payment;
- treat manually uploaded `LabResultRelease` records as the active bridge from
  scientific approval to customer publication; or
- leave the final-output package handoff unresolved.

Those statements continue to govern Partner PSeq Kit and Partner data-assembly
work unless their owning plan is separately changed.

## Locked Product Contract

### Invitation reliability

- Persist one or more `InvitationDeliveryAttempt` records for every invitation
  send/resend. States are `Queued`, `Sending`, `Accepted`, `Delivered`,
  `Bounced`, `Failed`, and `NeedsAttention`.
- Invitation creation and resend enqueue delivery transactionally. A hosted
  dispatcher claims and sends queued attempts, correlates Mailgun message
  metadata, applies bounded retry, and surfaces terminal attention.
- Accept idempotent Mailgun delivery and permanent-failure events. Verify every
  event using Mailgun's HMAC-SHA256 timestamp/token signature and deduplicate
  provider event identity because webhook delivery may retry.
- Production readiness rejects missing or invalid Mailgun API configuration,
  sender, Portal base URL, or webhook signing key. Logging delivery is limited
  to Development and Test. Existing production Mailgun delivery is reused.
- Store invitation email content in locale-named embedded templates under
  `backend/app/EmailTemplates`, using the
  `organization-invitation.en-US.{html,txt}` convention and an `en-US`
  fallback for future localized variants.
- The UI keeps access lifecycle separate from delivery lifecycle and shows the
  delivery state, error, attempts, expiry, and allowed resend/revoke actions.
  A hard bounce requires revocation and a new invitation to the corrected
  address. Production never exposes a copy-link or authentication bypass.

### Derived operational readiness and staging

- `OperationalReadiness` is derived as `NeedsSetup`, `Ready`, or `Blocked`.
  Only a deliberate manual Blocked override is authoritative.
- PSeq readiness requires an active Customer relationship, no manual Blocked
  override, an active Customer administrator, a Ready PSeq service
  entitlement, an active catalog offering, complete order/sample/shipping/
  destination/instruction configuration, and complete billing contact/address/
  payment-terms/tax configuration.
- Historical Blocked becomes the manual override. Other historical readiness
  values remain informational and do not authorize a transaction.
- Service-entitlement UI wording is `Service configuration: Ready`.
- Account-request completion returns structured blocker codes until readiness
  is complete. The account detail shows the same readiness checklist.
- Authorized staff may create an internal staged order and prepare a quote
  before a Customer administrator exists, but an active Customer,
  entitlement, and offering are still required. Quote issuance and Customer
  commitment require every non-billing readiness item and an active
  administrator/approver. Billing and tax remain visible readiness blockers,
  but may be completed after acceptance and must be complete before invoice
  issuance.
- Customer selectors show stage-eligible Customers and their blockers instead
  of silently omitting incomplete Customers.

### Roles and dual control

- Add business roles `CommercialOperator`, `ResultReleaseManager`,
  `BillingOperator`, `CashOperator`, and `CashReconciler` to invitation intent,
  user administration, session capabilities, backend authorization, and audit.
- Platform administrators manage configuration and role assignments but do not
  automatically receive business-action capabilities when enforcement is on.
- Lab Operations Administrator manages access/resources only. Bench, protocol,
  and scientific actions require explicit additive Lab roles.
- Protocol author and approver/activator must be different people.
- Anyone who recorded receipt, accession, execution, QC, library, batch, or
  sendout work cannot scientifically approve that same work.
- A Cash Operator cannot approve a reconciliation containing that user's
  receipt, import, allocation, reversal, or adjustment activity.
- Backend actor checks are authoritative even when a user holds overlapping
  roles. Dual control launches in audit-only mode; enforcement requires an
  adequate-staffing readiness check.

### Governed result delivery

- Add immutable `ResultOutputPackage` and `ResultArtifact` records. Package
  states are `Uploading`, `Scanning`, `ReadyForReview`,
  `ScientificallyApproved`, `ReadyForRelease`, `Released`, `Failed`, and
  `Withdrawn`.
- A service-authenticated, provider-neutral pipeline adapter idempotently
  registers manifests and arranges object-storage transfer. Large file bytes do
  not pass through the API.
- Scientific approval requires a complete checksummed malware-clean package
  and pins the package/version. `LabWorkReadyForRelease` carries both the
  approval and package identifiers.
- The Commercial projection creates the release candidate automatically. The
  duplicate manual-upload bridge is retired for PSeq.
- A `ResultReleaseManager` controls customer-visible release. Payment and
  credit never gate PSeq release.
- Release may occur per sample. Corrections create new package, approval, and
  release versions. Withdrawal preserves all history.
- Preserve notification, download, warning, cutoff, grace, deletion, and
  reissue evidence and execute the retention lifecycle automatically.
- Existing PSeq `PaymentHold` releases migrate to
  `CommercialReviewRequired`; they must not auto-release.

### POMS-owned accounts receivable

- Extend the commercial profile with billing contact/address,
  `PaymentTermsDays` (default 30), effective tax decision
  `Taxable`/`Exempt`/`NonTaxable`, approved tax rate or exemption evidence,
  Finance approver/date/notes, and configuration version.
- When a complete Finance-approved billing and tax profile exists at quote
  issuance, POMS calculates and includes tax without a tax engine and freezes
  the billing, tax, and payment terms in the quote. A valid zero-tax result is
  retained for exempt, non-taxable, or zero-rate decisions.
- When tax cannot be calculated at quote issuance, issue an explicitly pre-tax
  quote without a billing/tax/terms snapshot. Require the current complete,
  Finance-approved profile and calculate tax when the invoice is issued.
- Add `Invoice` and `InvoiceLine` with `Issued`, `PartiallyPaid`, `Paid`,
  `Voided`, and `WrittenOff`; append-only `InvoiceAdjustment`; `PaymentReceipt`
  with `Unapplied`, `PartiallyApplied`, `Applied`, and `Reversed`;
  `PaymentAllocation`; `PaymentImportBatch`; and `ReconciliationBatch`.
- Job completion idempotently issues a numbered invoice when billing
  configuration is valid. Use the accepted quote's frozen tax and terms when
  present; otherwise snapshot the then-current approved billing profile and
  calculate tax. Due date is completion date plus the applicable snapshotted
  payment terms. Generate an immutable invoice PDF visible to Finance and the
  Customer.
- Manual Finance receipt entry captures payer, amount, currency, received date,
  method, bank reference, evidence, and external ID. CSV import is preview-only
  before confirmation and requires source, external ID, date, amount, currency,
  payer, reference, and memo.
- Matching may suggest but never apply. Support partial and many-to-many
  allocations, unapplied cash, overpayment, reversals, write-offs, credits, and
  debits. A different actor approves reconciliation and receives an immutable
  closeout report.
- Active reporting is AR aging, open invoice, receipt, unapplied cash,
  reconciliation, and export. Historical manual billing rows stay visible as
  `Legacy billing source - Finance review required` and do not become invoices.
- Retain a provider-neutral `IPaymentProcessorAdapter` and external-link table
  for future payment processing without implementing it now.

### Governed retention continuation (2026-09-04)

The local continuation now implements durable warning/grace checkpoints, one
scheduled outbox record per notice, current Organization-admin recipients, urgent
missing-recipient/delivery recovery, and database-backed response revocation.
`GovernedRetentionProcessing` is a separate default-off flag and also gates
outbox dispatch. The owning `FILE-MANAGEMENT-PLAN.md` records local migration and
104-test backend evidence, independent-connection/MVC cancellation proof, and
actual commit-time boundary/recovery proof. Governed results now require
PostgreSQL commit tracking and retain verified transaction commit evidence.
General Lab/Assembly endpoint enforcement now uses the same policy and commit
evidence behind its own default-off switch. Hosted configuration/recovery
acceptance, general scheduled processing, and provider activation remain gates. This work does not enable a flag or release an environment.

### Attention operations and experience

- Owned attention queues cover invitation failures, readiness blockers, staged
  orders awaiting administrator/approval, projection or scanning failures,
  scientifically approved but unreleased packages, overdue invoices,
  unapplied cash, and reconciliation differences.
- Every item includes owner, age, status, attempts, next action, and resolution.
- Correct misleading workflow labels and provide accessible names plus explicit
  loading, checking, empty, blocked, stale, and failure states meeting WCAG 2.2
  AA.

## Migration and Feature-Flag Sequence

1. Add additive tables, columns, indexes, and flags without removing current
   behavior.
2. Backfill invitation attempts from existing send metadata; preserve access
   state independently.
3. Backfill readiness inputs and map historical `Blocked` to the manual
   override; preserve other legacy values as informational.
4. Backfill PSeq result packages/release candidates without changing Customer
   visibility. Map `PaymentHold` to `CommercialReviewRequired`.
5. Backfill PSeq billing snapshots and mark historical manual billing as legacy;
   do not synthesize issued invoices or paid state.
6. Release additive UI/API slices behind independent flags:
   `InvitationDelivery`, `DerivedReadiness`, `BusinessRoles`,
   `GovernedPSeqResults`, `NativePSeqAccountsReceivable`, and
   `AttentionOperations`.
7. Enable `DualControlAuditOnly`; review violations and staffing. Turn on
   `DualControlEnforced` only after staffing and acceptance evidence.
8. Validate the full migration and forward-fix path against a restored
   production-like database before any shared-environment authorization.

## Implementation Progress

- [x] Add feature-flag/options foundation and production readiness validation.
- [x] Implement durable invitation delivery and signed, deduplicated Mailgun
  webhooks.
- [x] Implement derived readiness, structured blockers, and staged-order rules.
- [x] Add business roles, session capabilities, authorization, audit, and dual
      control in audit-only/enforced modes.
- [x] Implement governed PSeq output packages, pipeline registration, approval,
      release, correction/withdrawal, evidence, and retention processing.
- [x] Implement native PSeq AR, invoice PDF, receipts/import/allocation,
      adjustments/reversal, reconciliation, aging, reports, and future-payment
      seams.
- [x] Implement owned attention queues and accessible UI state coverage.
- [x] Add migration/backfill and update the complete ERD.
- [x] Update Auth, Order, Lab, Commercial/AR, operations-readiness, and user
      documentation.
- [ ] Update and execute proportionate backend, frontend, database, E2E, and
      accessibility verification. Local domain/component/build checks are
      complete; live PostgreSQL, authenticated browser, and dedicated-staging
      acceptance remain open.
- [x] Add the dedicated-staging acceptance script and cross-functional signoff
      checklist. The script has not been run because this task has no authorized
      dedicated-staging environment.

### Local verification evidence (2026-08-29)

- Focused backend order-to-cash tests: 13 passed.
- Full backend solution after the Mailgun correction: 172 passed, 10 opt-in
  PostgreSQL tests skipped, no
  failures.
- Focused Mailgun sender/template/signature/configuration tests: 4 passed.
- Backend Release solution build: passed with zero warnings and zero errors.
- Focused frontend invitation and order-to-cash components: 8 passed.
- Frontend lint, TypeScript validation, and client/SSR/Nitro production build:
  passed.
- EF Core reports no model changes after
  `AddPSeqOrderToCashGapClosure`; the staging acceptance script parses without
  errors; `git diff --check` reports no whitespace errors.
- The full frontend suite has 54 passing tests and four failures confined to
  the unchanged `WebOpsDashboardContent.test.tsx`. Those four reproduce when
  run alone and reflect the existing Radix tab click/test-harness behavior;
  they are not treated as passing evidence and remain recorded in the frontend
  test plan.
- Not executed here: opt-in PostgreSQL suites, migration/backfill against a
  restored production-like database, authenticated browser/accessibility
  acceptance, provider-backed Mailgun/object-storage/scanner checks, or the
  dedicated-staging operator script and cross-functional signoffs.

### Production release attempt evidence (2026-08-29)

- The implementation and two deployment preflight fixes were committed and
  pushed through `0bbc1e87396cfd1ee093c7350aa05d699bdec87f`.
- The authorized deployment built that exact API image and created and verified
  the encrypted pre-migration backup before application startup. The migration
  and API switch did not run because production had no Postmark server token,
  verified sender, or webhook credential; the fail-closed startup validation
  stopped the release as designed.
- The frontend auto-promotion to `0bbc1e8` was rolled back to the prior
  production deployment at `6d1baf1fba10b8f780c047c3e6859cdaba2cd236`,
  restoring frontend/API source alignment while the external Postmark
  dependency remains unresolved. Vercel automatic promotion is paused by the
  rollback.
- At that point, deployment preflight and the server-side atomic runtime
  installer required
  `PORTAL_POSTMARK_SERVER_TOKEN`, a Postmark-verified
  `PORTAL_POSTMARK_FROM_EMAIL`, and a 32-or-more-character
  `PORTAL_POSTMARK_WEBHOOK_SECRET` before another production attempt can reach
  migration or API startup.
- The Product Owner then confirmed that production Mailgun was already the
  approved transactional provider. The implementation was corrected to reuse
  `EmailServiceSettings`; Postmark code and deployment inputs were removed.
  Deployment now validates the existing Mailgun API/sender settings and
  atomically installs the protected signing key and production Portal URL
  before startup. The existing least-privilege domain sending key cannot read
  account settings or administer webhooks, so an authenticated Mailgun operator
  must configure and verify the exact Portal invitation webhook for delivered
  and permanent-failure events and store the account signing key as the
  protected `PORTAL_MAILGUN_WEBHOOK_SIGNING_KEY` environment secret.
  The preceding Postmark release evidence is retained as historical evidence
  of the safely stopped attempt, not as current configuration guidance.
- API deployment run `33279633667` for commit `324280a0c41c3573e9475a5e035af6e3c744e982`
  stopped before backup, migration, or API replacement when the least-privilege
  Mailgun domain sending key correctly returned `404` for the account signing-
  key endpoint. Production remained unchanged; the workflow was corrected to
  preserve that least-privilege boundary instead of broadening the runtime
  credential.
- Mailgun domain webhook delivery and permanent-failure events are now routed
  to the signed Portal endpoint, and the protected account signing key is held
  in the production environment secret. API deployment run `33280548621`
  released commit `22ac1b311d16fad5797828db1228ffaef1a6be59`, applied the
  additive migration, and passed its health and public database probes. The
  matching Vercel artifact was promoted and confirmed current for
  `portal.phaenobiotech.com`.
- The first signed-in production walkthrough then found a frontend response-
  shape regression when opening Order staging: the PSeq client treated the
  standard API envelope as the returned collection; the Customer readiness
  checklist had the same mismatch. The forward fix unwraps every order-to-cash
  JSON read and command plus the derived-readiness response, adds focused
  regression coverage, and must retain exact frontend/API source alignment
  when released. The unrelated legacy HubSpot handoff panel still reports its
  existing provider load failure and is not part of the standalone PSeq
  activation evidence.
- Forward-fix deployment run `33281487167` released product commit
  `808b1f5a12f945b2251abffbe66c5438ae11a61e`; Vercel independently confirmed
  the same commit as the current `portal.phaenobiotech.com` source. Final probes
  returned API health `200`, database ping `204`, Portal `200`, and `401` for an
  unsigned Mailgun webhook. The signed-in read-only smoke confirmed the
  readiness checklist and blockers, distinct invitation access/delivery state,
  stage-eligible Customer selection, native AR empty states, and explicit
  disabled-state errors for governed results and attention operations. It did
  not create, resend, revoke, release, invoice, receive, allocate, reconcile,
  deactivate, or otherwise mutate production records.
- The Account requests read still returns the pre-existing unexpected-error
  response associated with the disconnected legacy HubSpot workflow. Its
  source is now named explicitly in the account workspace instead of appearing
  as a generic account-action failure. This does not block the new standalone
  PSeq readiness, invitation, staging, result, or AR contracts, but it remains
  a separate legacy-integration operations defect.

## Verification and Acceptance Matrix

Required domain coverage includes transitions, immutable snapshots/packages/
invoices, actor separation, decimal arithmetic, allocations, and reconciliation.
Database/integration coverage includes concurrency, idempotency, tenant
isolation, webhook deduplication, invoice-number uniqueness, migration/backfill,
and replay/out-of-order handling.

Invitation scenarios: misconfiguration, provider failure, delivery, bounce,
retry, resend, expiry, revoke, and acceptance.

Result scenarios: incomplete manifest, checksum or scan failure, duplicate
submission, contributor/reviewer conflict, sample-level release, correction,
withdrawal, notification/download evidence, retention warning/cutoff/grace/
deletion, and reissue.

AR scenarios: partial payment, one receipt to many invoices, many receipts to
one invoice, overpayment, unapplied cash, duplicate imports, non-USD rejection,
reversal, immutable adjustments, aging, and reconciliation imbalance plus
different-actor approval.

Frontend coverage includes loading, checking, ready, blocked, empty, failure,
and stale states; keyboard access; focus; names; errors; contrast; zoom/reflow;
and automated accessibility checks.

Dedicated staging must exercise:

```text
CRM -> account -> staged order before administrator -> invitation delivery and
acceptance -> readiness -> quote and acceptance -> samples -> Lab execution ->
output package -> scientific approval -> release and download -> completion and
invoice -> receipt/import/allocation/reconciliation -> Paid
```

The same script covers bounce, failed QC, rejected specimen, corrected result,
notification outage, duplicate commands, partial payment, overpayment,
reversal, and reconciliation mismatch. Dedicated-staging acceptance requires
Commercial, Lab Operations, Scientific, Finance, security, and accessibility
signoff.

## Acceptance preparation refresh (2026-09-04)

The local closeout reran 60 focused Department/order-to-cash/order-domain tests
and nine quote/staff-initiation integration cases, with no skips. These do not
constitute an authenticated end-to-end order-to-cash acceptance run.

`scripts/acceptance/pseq-order-to-cash-staging.ps1` now supports `-PrepareOnly`
without URLs, a token, or network requests. Its 14 checkpoints include restored-
database/recovery evidence and named cross-functional signoff. Live runs require
explicit setup Organization/Department IDs and verify the selected session;
production Portal/API hosts and redirects are refused. PASS requires an artifact
reference, and a complete record is only ready for activation review, never an
authorization to activate. The prepared local run has 14 pending checkpoints.

The 2026-09-04 retention slice unifies new governed releases with the versioned
File Management policy. They freeze global/Organization 30/5/5 values or overrides,
track full-response artifact completion, and use the shared evaluator for usable
conditional grace and deadline denial. Existing four-offset schedules keep their
dates. The old worker is excluded from snapshot-backed schedules.

Local evidence: migration `20260905022605_UnifyGovernedResultRetentionPolicy`
applied to localhost only; zero-warning solution build; 79 focused backend tests,
14 frontend tests, lint/typecheck, and two desktop/mobile rendered browser checks
passed. Automatic snapshot-backed warning/grace outboxes, serialized checkpoints,
active-stream revocation, provider deletion, and dedicated-staging acceptance
remain open. See `FILE-MANAGEMENT-PLAN.md` and `PORTAL-PLAN-CLOSEOUT.md`.

## Production Activation Boundary

Fresh authorization has been received for the additive production release and
migration. The deployment must still produce encrypted pre-migration backup
evidence, exact frontend/API source-SHA alignment, migration and runtime probes,
and authenticated smoke evidence where the available production session allows
it. The new order-to-cash flags and dual-control enforcement remain off until
the restored-database, dedicated-staging, provider, staffing, security, and
accessibility gates are satisfied. Local builds and tests do not satisfy those
activation gates.


## Portal consistency implementation (September 7, 2026)

The Product Owner authorized every finding in `PORTAL-POMS-CONSISTENCY-REVIEW-2026-09-07.md`; detailed delivery tracking is in `PORTAL-POMS-CONSISTENCY-IMPLEMENTATION-PLAN.md`.

Finance now has view-first Invoice, Receipt, Customer and Reconciliation records under `/order-operations/finance/{kind}/{id}`, with bounded actions and preserved list context. Receipt evidence is uploaded and scanned using existing operational storage; new arbitrary evidence-key writes are retired. Historical references remain intact. The old receipt API returns a recovery message rather than accepting an unverified object key. Import review binds Customer, source and file to the confirmed batch; same-operator unconfirmed corrections use concurrency and confirmed retries cannot create duplicate receipts.

Order configuration exposes Service catalog and Sample shipping. Supported sample/result choices serialize into the existing fields in one atomic defaults write. Readiness uses effective sample types and compatible shipping configuration; unsupported historical JSON does not count as ready. Setup links identify the owning configuration or Finance section. No persisted columns or migration are added.

The configured production malware scanner must be available before activating new manual receipt uploads. Static checks and local browser fixtures do not establish provider, shared-database or real financial acceptance.

## September 12, 2026 — Release queue default

Result release now defaults to ReadyForRelease when no valid package-state filter is supplied, and places that option first. Explicit valid filters remain authoritative and are preserved on return/reload. This resolves the UAT discoverability issue where new scientific approvals were hidden by the ScientificallyApproved default. Publication and authorization behavior are unchanged. Phaeno release guide updated; signed-in default-entry and retained-filter checks passed on isolated 3016.

## September 12, 2026 — UAT registration and narrow reflow corrections

UAT-20260912-01 is fixed locally: a PostgreSQL unique conflict during result-package insertion detaches the failed insert and rereads the committed idempotency key. Replay validates manifest hash, organization/order/work/sample/trial scope, correction reference and expected artifact count. Identical requests return the same package using the established replay response; changed requests receive result_idempotency_conflict. A collision without a matching key returns a deliberate result_package_registration_conflict so the caller can retry the unchanged key. Existing unique constraints remain authoritative; no model, migration, dependency or authentication change.

A deterministic disposable-local-PostgreSQL regression covers identical overlap, changed overlap/replay and competing sample versions with retry. The original HTTP race now returns 200/200 and subsequent retry 200 for one persisted package. UAT-20260912-02 is also fixed locally by removing the body's 320px minimum width; signed-in queue/detail/confirmation checks fit the available width at measured 320, 390 and 1440 CSS pixels. The Phaeno release guide remains accurate; the user's workflow and release rules do not change. See the active UAT run for evidence and retained fixtures. These changes are not deployed and do not close scanner, provider, full scientific lineage or production acceptance gates.
