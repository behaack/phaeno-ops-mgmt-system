# HP-13 — Record payment and reconcile it

**People:** Cash Operator; independent Cash Reconciler who contributed none of this batch's activity.

**Ready before starting:** HP-12 invoice, controlled full-payment evidence equal to its outstanding balance, matching bank-total fixture and a clean supported evidence file.

| Step | Person and action | Expected result |
| --- | --- | --- |
| 1 | Cash Operator: open Order Ops → Finance → Invoices and aging and open the invoice. | The Customer, invoice total and outstanding balance match HP-12. |
| 2 | Open Receipts → Record receipt. Enter Customer, payer, full amount, received date, method and references. Attach the prepared evidence and save after its clean scan. | A numbered receipt opens with the full unapplied amount. |
| 3 | Choose Allocate to invoice, find that Customer's invoice and review the full balance. Save the allocation for the exact amount. | The invoice is fully paid; the receipt has no remaining unapplied amount. |
| 4 | Reopen the invoice and receipt. | Both show the saved allocation and matching references. |
| 5 | Open Reconciliation and create a batch with the test period, this receipt and the matching bank total. Review and Submit. | Difference is zero and the balanced batch is submitted. |
| 6 | Independent Cash Reconciler: open the submitted batch, inspect totals, receipt/allocation evidence and approve. | Independent approval is recorded and the closeout is immutable. |
| 7 | Open Closeout report and Download closeout report. | The saved report identifies the approved batch and reconciled totals. |

**Done:** Record invoice, receipt, allocation, reconciliation and closeout references. This completes the connected Customer order-to-cash journey.

[Results](RESULTS.md) · [Index](README.md) · [Workflow guide](../../../frontend/src/content/docs/phaeno/order-billing-payment-release.mdx)
