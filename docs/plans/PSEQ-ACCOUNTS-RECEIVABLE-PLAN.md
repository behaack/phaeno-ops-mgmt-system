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
2. A Finance approver records approval, date, and notes. Quote issuance rejects
   incomplete or unapproved tax configuration.
3. The issued quote freezes billing, tax, terms, currency, and configuration
   version. POMS calculates tax from the approved rate.
4. Completing the job idempotently creates one numbered invoice from the
   accepted quote. Due date is completion date plus the snapshotted terms. The
   invoice and PDF are immutable.
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
