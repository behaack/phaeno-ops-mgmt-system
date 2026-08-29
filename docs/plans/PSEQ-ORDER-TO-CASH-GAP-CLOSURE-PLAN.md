# PSeq Order-to-Cash Gap-Closure Plan

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

- Local implementation is complete behind additive feature flags. Local
  verification is complete to the boundary described below; restored-database
  and dedicated-staging acceptance remain open activation gates.
- Commit, push, migration, and production deployment are authorized for this
  additive, disabled-by-default release. Feature activation remains a separate
  controlled rollout decision.
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
  dispatcher claims and sends queued attempts, correlates Postmark message
  metadata, applies bounded retry, and surfaces terminal attention.
- Accept idempotent Postmark delivery and bounce events. Postmark webhook events
  may retry and are not signed, so the endpoint requires configured Basic Auth
  or configured custom secret headers and deduplicates provider event identity.
- Production readiness rejects missing or invalid Postmark token, sender,
  Portal base URL, or webhook credentials. Logging delivery is limited to
  Development and Test.
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
  entitlement, and offering are still required. Quote issuance and customer
  commitment require full readiness and an active administrator/approver.
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
- Finance approval of the tax decision is required before quote issuance.
  POMS calculates and snapshots tax without a tax engine.
- Freeze billing, tax, and payment terms in every issued PSeq quote.
- Add `Invoice` and `InvoiceLine` with `Issued`, `PartiallyPaid`, `Paid`,
  `Voided`, and `WrittenOff`; append-only `InvoiceAdjustment`; `PaymentReceipt`
  with `Unapplied`, `PartiallyApplied`, `Applied`, and `Reversed`;
  `PaymentAllocation`; `PaymentImportBatch`; and `ReconciliationBatch`.
- Job completion idempotently issues a numbered invoice from the accepted quote
  when billing configuration is valid. Due date is completion date plus the
  snapshotted payment terms. Generate an immutable invoice PDF visible to
  Finance and the Customer.
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
- [x] Implement durable invitation delivery and secured Postmark webhooks.
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
- Full backend solution: 169 passed, 10 opt-in PostgreSQL tests skipped, no
  failures.
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
  acceptance, provider-backed Postmark/object-storage/scanner checks, or the
  dedicated-staging operator script and cross-functional signoffs.

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

## Production Activation Boundary

Fresh authorization has been received for the additive production release and
migration. The deployment must still produce encrypted pre-migration backup
evidence, exact frontend/API source-SHA alignment, migration and runtime probes,
and authenticated smoke evidence where the available production session allows
it. The new order-to-cash flags and dual-control enforcement remain off until
the restored-database, dedicated-staging, provider, staffing, security, and
accessibility gates are satisfied. Local builds and tests do not satisfy those
activation gates.
