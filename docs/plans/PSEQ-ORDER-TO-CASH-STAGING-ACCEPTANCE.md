# PSeq Order-to-Cash dedicated-staging acceptance

Use this script only after a dedicated staging environment, production-like
restored data, storage/scanner configuration, Postmark test stream, pipeline
credential, and the migration/backfill procedure have received separate
authorization. It is not permission to deploy, migrate shared data, send live
messages, expose result bytes, or delete retained files.

## Entry evidence

- Record the API and frontend source SHA; they must match.
- Record the database restore point, migration list, row counts, and owner.
- Run authenticated `GET /api/order-to-cash/migration-preview` as a platform
  administrator and attach its counts and review disposition.
- Confirm all six flags begin off and `DualControlMode=AuditOnly`.
- Confirm separate staffed users for Commercial Operator, Result Release
  Manager, Billing Operator, Cash Operator, Cash Reconciler, protocol
  author/activator, Lab contributors, and two Scientific Reviewers.
- Confirm synthetic Customer, tax evidence, payer references, artifacts, and
  email recipients are approved for staging.

## Primary journey

1. CRM: create/select the synthetic Company and Contact and submit a reviewed
   Portal handoff. Prove CRM alone grants no Portal access or work.
2. Account: approve/create the Customer with ordering authorization. Confirm
   the derived checklist shows administrator/billing/configuration blockers.
3. Staging: as Commercial Operator, create an internal staged PSeq order before
   an administrator exists. Confirm no quote can be issued or accepted.
4. Invitation: invite the Customer administrator. Capture queued, accepted, and
   delivered evidence; accept with the invited identity. Confirm role intent
   activates only on acceptance.
5. Readiness: configure offering, order/sample/shipping settings, billing
   contact/address/terms, and the Finance-approved tax decision. Confirm the
   same structured blockers clear in account detail and order intake.
6. Quote: issue and accept the USD quote. Preserve the frozen billing, tax,
   payment-terms, price, and expiry snapshot.
7. Samples: enter/import the exact no-PHI roster, finalize it, issue the packet,
   and verify immutable Commercial authorization and Lab work.
8. Lab: exercise receipt, accession, controlled execution, lineage,
   materials/equipment, library/batch/sendout as applicable, QC, exceptions, and
   contributor/reviewer separation.
9. Package: register a sample-level final-output manifest idempotently through
   the pipeline adapter. Verify checksums, clean scans, package/version pinning,
   scientific approval, and the ReadyForRelease projection.
10. Release: as Result Release Manager, release the package. Prove open/overdue
    invoice state is not consulted. Verify Customer-visible package metadata in
    an authenticated Customer session.
11. Completion/invoice: complete the job and verify exactly one numbered
    invoice and immutable PDF from the accepted quote, frozen tax, and due date.
12. Cash: record a manual USD receipt and preview/confirm CSV import. Exercise
    partial one-to-many and many-to-one allocation, unapplied cash, reversal,
    credit/debit/write-off adjustment, and non-applying matching suggestions.
13. Reconciliation: create an imbalanced batch, correct it through append-only
    activity, then approve as a different Cash Reconciler. Preserve closeout
    JSON/hash and verify aging, receipt, unapplied-cash, and reconciliation
    reports.
14. Attention/UI: verify owned rows and accessible loading, empty, stale,
    blocked, failed, in-progress, and resolved states for every enabled role.

## Adverse and replay matrix

- Postmark missing configuration, transient failure, retry exhaustion,
  duplicate/out-of-order delivery, hard bounce, resend cooldown, expiry,
  revocation, and acceptance racing a webhook.
- Manual readiness block, missing administrator, expired entitlement, inactive
  offering, incomplete configuration, missing Finance approval, and a staged
  order waiting for readiness.
- Duplicate pipeline manifest, incomplete manifest, checksum mismatch, infected
  or failed scan, contributor/reviewer conflict, duplicate approval,
  sample-level release, correction, withdrawal, and projection replay.
- Notification outage and retention warning/cutoff/grace evidence. Governed
  result download, outbound result email, and byte deletion remain blocked until
  separately approved and cannot receive signoff from this implementation.
- Duplicate receipt/import external ID, non-USD input, over-allocation,
  overpayment, reversal, immutable adjustment, invoice-number collision,
  reconciliation difference, and same-actor approval rejection.
- Tenant isolation for readiness, packages, invoices/PDFs, receipts, attention,
  and reports; browser refresh/stale-version behavior; keyboard/focus; names;
  errors; contrast; 200% zoom/reflow; automated accessibility checks.

## Flag sequence and forward-fix proof

Enable and disable one flag at a time, preserving legacy behavior while off:
`InvitationDelivery`, `DerivedReadiness`, `BusinessRoles`,
`GovernedPSeqResults`, `NativePSeqAccountsReceivable`, and
`AttentionOperations`. Run relevant primary/adverse cases after each change.
Review audit-only dual-control observations and calculated staffing; attempt
`DualControlEnforced` only with approved staffing evidence. Exercise the
documented forward-fix from a failed migration against a fresh restore.

## Cross-functional signoff

| Owner | Required evidence | Name/date/decision |
| --- | --- | --- |
| Commercial | CRM-to-account, staging, readiness, quote, release, attention | Pending |
| Lab Operations | authorization, execution, lineage, scan/projection recovery | Pending |
| Scientific | package completeness, reviewer separation, correction/withdrawal | Pending |
| Finance | tax snapshot, invoice/PDF, cash, aging, reconciliation/closeout | Pending |
| Security/privacy | tenant isolation, webhook/pipeline auth, evidence contents, sensitive-byte boundary | Pending |
| Accessibility | keyboard, focus, names, errors, contrast, zoom/reflow, automated scan | Pending |
| Product Owner | complete journey and accepted documented deviations | Pending |

Any failed, waived, or unavailable step must identify its owner, impact,
evidence, and required follow-up. Passing this script authorizes neither
production activation nor the currently blocked sensitive-data/destructive
operations.
