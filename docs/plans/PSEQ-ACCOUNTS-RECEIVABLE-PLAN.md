# PSeq Accounts Receivable Plan

## Billing approval and completion handoff - September 12, 2026

Actual signed-in FIN-01 billing validation, approval, approval reset after a terms change, reapproval and reload passed on the existing marked Customer A. Saved profile is version 4/configuration 3, Net 45 with a synthetic 10% tax rate. All invoice readbacks stayed identical; receipt totals remain 8/$108 unapplied. Settled desktop/390px billing screenshots inspected. FIN-01 remains partial: neither saved InProgress Job has terminal Commercial samples, governed release does not advance those statuses, the current Job UI has no completion action, and this isolated runtime lacks CommercialOperator. No completion, invoice issuance, PDF, role change or production action was performed. [Evidence and next implementation slice](../testing/runs/2026-09-12-lab-production-verification.md#billing-approval-and-completion-handoff---september-12-2026).

## Real scanner and receipt evidence - September 12, 2026

Real ClamAV is now active only for the isolated LAB-06 API. The integration already existed; the earlier missing-integration diagnosis traced only the DevelopmentFixture implementation and was incomplete. Real clean/EICAR/encrypted/oversize/health checks and both injected storage/scanner adapter checks passed. Signed-in Cash upload rejected EICAR with no receipt, retained entries, then saved one $1 receipt after a clean replacement. Exact 83-byte download passed; Billing-only access returned 403 and anonymous access 401. A discovered client filename defect was fixed locally: supported server extensions are retained for receipt evidence, including JSON imports. Nine scanner tests, ten focused frontend tests, TypeScript, scoped lint and documentation checks passed. Existing balances/history remain intact; there are 14 invoices/$645 outstanding and eight receipts/$108 unapplied. [Exact runtime and saved evidence](../testing/runs/2026-09-12-lab-production-verification.md#real-scanner-and-receipt-evidence--september-12-2026). No deployment, migration, auth change or Git mutation. Remaining legitimate issuance/PDF, scientific independence and production/physical/provider gates stay open.

## Receipt evidence filename correction - September 12, 2026

The actual protected download returned correct bytes and a server filename with its extension, but the browser client overwrote the filename with an extensionless receipt label. Preserve the receipt-based name and append the supported extension supplied by Content-Disposition, including JSON for imported evidence; use .bin if the header is absent or unsupported. Retain authenticated byte retrieval, explicit error behavior and object-URL cleanup. Verify real saved text evidence and imported JSON downloads, plus focused filename/failure regression cases. No API, authorization, schema or dependency change.

## Real scanner UAT continuation - September 12, 2026

Scope: resume the approved isolated Finance acceptance using the existing ClamAv INSTREAM provider and operational adapter. Code tracing corrects the preceding checkpoint's incomplete diagnosis: the real scanner integration is already implemented in Infrastructure/Storage/FileScanning.cs and registered by Program.cs. EnvironmentOperationalFileScanner is only the DevelopmentFixture selection. LAB-06 currently has no explicit ClamAv selection; this is a local runtime readiness/configuration gap, not evidence of a missing application integration. Historical production ClamAV activation is documented separately and is not current local or production acceptance.

Use a loopback-only local scanner based on the existing managed scanner configuration and image. Verify current loaded definitions, clean/EICAR/encrypted/oversize behavior and both real injected adapters before selecting it for the existing isolated port-7116 API. Preserve fail-closed limits, storage, database and existing fixtures. Exercise a separately marked harmless receipt upload, byte-for-byte authorized evidence download and unauthorized denial; preserve failed-upload cleanup and idempotency. Do not enable trusted-development clean verdicts or touch production services, dependencies, schema, roles or scientific releases. Record actual runtime/provider evidence and any prerequisite blocking completion.


## Finance role separation - September 12, 2026

Owner approved one additional development-only CashOperator + CashReconciler login. Actual signed-in UAT passed second-operator import ownership rejection (preview and direct confirm), with retained input and no receipt created. The combined-role user then imported a separate $7 receipt; a different Cash Operator created/submitted its reconciliation. Approval by the receipt contributor returned 409 and left the batch Submitted/version 2 with no approval/report. This isolates contribution exclusion from creator/submitter exclusion. Existing approved reconciliation and all previous receipt readbacks remained identical. Outstanding invoices remain $645; seven receipts now have $107 unapplied. No product defect, code, production role, provider policy, migration, Git or deployment change. [Evidence and saved records](../testing/runs/2026-09-12-lab-production-verification.md#finance-role-separation--september-12-2026). Scanner-backed upload, legitimate issuance/PDF, and production/physical/provider acceptance remain open.

## Finance aging boundaries - September 12, 2026

Actual signed-in Billing verification passed all eight aging boundaries (0, 1, 30, 31, 60, 61, 90 and 91 days) using separately marked isolated fixtures. At UTC date 2026-09-13, bucket totals are $391 current, $6 at 1-30 days, $24 at 31-60, $96 at 61-90 and $128 over 90: $645 outstanding. Aging CSV has 12 open rows; all-invoice CSV has 14 rows, including Paid and WrittenOff. Customer filtering leaves the labeled all-Customer aging/export scope unchanged. Existing receipts, allocations, adjustments and reconciliations were preserved; unapplied cash remains $100. Desktop and fresh 390px page screenshots inspected. This is synthetic arithmetic/export evidence, not legitimate issuance/PDF or production acceptance. [Saved evidence](../testing/runs/2026-09-12-lab-production-verification.md#finance-aging-boundaries--september-12-2026). No product code or new automated suite changed. Remaining role-combination, scanner, issuance and production gates stay open.

This plan records the implemented POMS operational accounts-receivable
boundary for PSeq Lab Service. The broader authority, rollout flags, and
acceptance gates remain in `PSEQ-ORDER-TO-CASH-GAP-CLOSURE-PLAN.md`.

## Closeout report presentation — September 12, 2026

The Finance UAT follow-up replaces the raw JSON disclosure with a readable summary and downloadable text copy of the existing saved approval evidence. It displays frozen totals, period, included-record count, approval time and an expandable reviewer reference; the download retains recorded draft changes and source references contained in that evidence. No new API, persisted field, authorization, dependency or approval workflow is introduced. A missing, malformed or mismatched report produces an explicit error and no download, without substituting current values for missing evidence. Related included-source and draft-history views remain in the record workspace. FIN-05 verification must inspect the actual saved report and downloaded text, including approval identity and totals.

## Receipt upload defect correction — September 12, 2026

Live FIN-02 testing found the receipt FormData inheriting the API client's JSON content type. Axios serialized it as JSON, so form binding rejected missing file/payload before scanning. The receipt upload now explicitly uses multipart, following the existing upload pattern and retaining the idempotency key. Separately, the shared result filter now maps ValidationProblemDetails to the established failure envelope with validation_error and field details; previously it wrapped that HTTP 400 as success=true. No schema, authorization, dependency or new API shape is introduced. Eight focused backend and 38 frontend tests plus TypeScript/scoped lint passed. The isolated API was restarted with the tested build and existing configuration; actual multipart now reaches the unavailable scanner, returns receipt_evidence_not_clean, retains entries and creates no receipt. This verifies fail-closed behavior, not a clean-scanner positive. Existing Phaeno receipt help already describes this behavior and remains accurate.

## Product boundary

- POMS owns Customer billing configuration, quote snapshots, invoice issue,
  immutable invoice PDFs, adjustments, receipt evidence, allocation,
  reconciliation, aging, and operational exports.
- A future accounting adapter may post approved records to a general ledger.
  POMS does not implement a general ledger.
- Version 1 is USD-only. It has no foreign exchange, tax engine, online
  ACH/card processor, or new QuickBooks dependency.
- PSeq results are never payment- or credit-gated. Partner PSeq Kit and
  data-assembly payment/release rules remain unchanged.

## Implemented workflow

1. Finance records billing contact/address, Net 30 by default, and an effective
   `Taxable`, `Exempt`, or `NonTaxable` decision with applicable rate or
   exemption evidence.
2. A Finance approver records approval, date, and notes. When this profile is
   complete at quote issuance, POMS calculates tax from the approved decision
   and rate and freezes billing, tax, terms, currency, and configuration
   version in the quote. A calculated zero-tax amount is valid.
3. When tax cannot be calculated at quote issuance, POMS issues an explicitly
   pre-tax quote. Quote issuance and acceptance do not require the billing
   profile, but invoice issuance does.
4. Completing the job idempotently creates one numbered invoice. It preserves
   tax and terms frozen in the accepted quote or calculates tax and snapshots
   the then-current complete, Finance-approved profile for a pre-tax quote. Due
   date is completion date plus the applicable snapshotted terms. The invoice
   and PDF are immutable.
5. Finance enters a manual receipt with evidence or previews and confirms a CSV
   import. Imported and manual receipts begin unapplied; duplicate source and
   external IDs are rejected.
6. Matching suggestions are advisory. A Cash Operator explicitly allocates
   amounts, including partial, many-invoice, and many-receipt cases. Excess
   remains unapplied. Reversals preserve their actor and reason.
7. Invoice corrections are append-only credit, debit, or write-off
   adjustments. An issued invoice is never edited in place.
8. A Cash Operator creates and submits a balanced reconciliation. A different
   Cash Reconciler, who contributed none of its receipt/import/allocation/
   reversal/adjustment activity, approves the immutable closeout report.

## Operations and rollout

### Finance correction workflow - 2026-09-07

The authorized remaining-work slice exposes receipt allocation history and the
existing versioned allocation-reversal endpoint. History retains the original
allocation, invoice/receipt identity, actor/time and reversal reason. The
reversal dialog captures all three reviewed versions, preserves failed entries,
and requires explicit review after a conflict. Cash Operators can search
same-Customer open invoices by number and page beyond the first 25 suggestions;
the selected invoice remains pinned while browsing other matches. Refreshing a
conflicted selection resolves that exact invoice within the same Customer scope.

Reconciliation detail now displays included sources and draft change history.
Only Draft batches permit reasoned **Edit draft** or **Cancel draft**. Editing
recalculates ledger and difference values and atomically replaces current source
links. Existing allocation/adjustment sources are retained by the receipt-focused
editor. Nullable `DraftChangesJson` stores append-only before/after period,
totals, all three source-ID sets, actor, timestamp and reason. Every historical
draft editor participates in the existing enforced/audit-only separation rule.
Submitted/approved records cannot be corrected or cancelled; cancelled drafts
retain financial sources/history and do not generate new difference attention.
Balancing or cancelling a draft resolves only that batch's open difference
attention in the same transaction, retaining its owner and recording the acting
operator, timestamp and correction reason.
The coordinated additive migration/ERD changes are owned by the parent work.

Authored regression sources cover reversal validation, reviewed versions,
conflict recovery, pending/dirty guards, retained failed reconciliation edits,
submitted-state rejection, cancellation, matching search/paging, durable
source/history persistence and actor exclusion. Existing billing-pristine
coverage waits for React Hook Form's asynchronous form-state update after the
original value is restored. This subsection records implementation and coverage,
not a suite pass, live financial acceptance, or deployment.

The Finance workspace exposes aging, invoices, receipts, explicit allocation,
preview/confirm import, and reconciliation. Overdue invoices, unapplied cash,
and reconciliation differences create owned attention items. Historical manual
billing remains `Legacy billing source - Finance review required`; it is not
backfilled into issued invoices or inferred payment.

`NativePSeqAccountsReceivable` and the additive schema/UI slices must be proven
in dedicated staging before activation. Production requires restored-data
migration proof, invoice-number and decimal verification, Finance acceptance,
backup/restore evidence, source-SHA alignment, authenticated smoke testing, and
rollback/forward-fix readiness. This plan does not authorize deployment or a
shared-database migration.
