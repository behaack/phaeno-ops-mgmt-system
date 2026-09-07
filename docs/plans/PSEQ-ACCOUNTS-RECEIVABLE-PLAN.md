# PSeq Accounts Receivable Plan

This plan records the implemented POMS operational accounts-receivable
boundary for PSeq Lab Service. The broader authority, rollout flags, and
acceptance gates remain in `PSEQ-ORDER-TO-CASH-GAP-CLOSURE-PLAN.md`.

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
