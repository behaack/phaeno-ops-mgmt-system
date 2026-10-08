# Purchased service identity and library preparation

## Status — October 4, 2026

Local correction authorized by the owner's **Yes, fix** response. The owner
confirmed local job **6WTMNUFE** is fake demo data and authorized its simulated
library run. The local correction and the six-library simulated UI run are
complete. The saved tray is Complete, with six passing libraries ready for
sequencing. Physical/scientific qualification and automated correction
regression execution remain separate. See the
[completion record](../testing/runs/2026-10-04-6wtmnufe-pseq-library-preparation.md).

## Problem and evidence

The saved DEMO PSeq library workflow is approved for marketed service
`item-d3a88695ccdb4d26aa1703ed51595c30`. Its six-position tray is Draft and empty.
All ten accessioned source tubes under 6WTMNUFE are accepted, available and have
no attempts. Scanning `9595-01-10` into A1 returns **Choose a workflow for this
job's purchased service** without adding a member or consuming material.

Current service workflow creation uses the catalog item's permanent external
reference. Commercial sample authorization instead hard-codes the service family
`pseq-lab-service`. The execution guard compares the two identities. The UI
offers no marketed `pseq-lab-service` identity and no action to correct a job's
association. This is an application integration defect, rather than an intake
or specimen acceptance problem.

## Approved scope

1. Derive new Commercial laboratory authorization's service identity from the
   accepted purchase's immutable catalog/quote identity, retaining the existing
   service family for access and commercial classification. Keep Trial scope,
   exact workflow selection, request replay and scientific requirements intact.
2. Provide a bounded, audited supervisor/administrator UI correction for an
   unstarted Commercial job. Resolve the service from its accepted purchase,
   show the old/new association and require confirmation and a reason. Reject
   stale writes or any existing source selection, attempt or laboratory
   execution. Do not allow arbitrary service entry or rewrite the accepted
   purchase, receipt, accession, physical tube or authorization history.
3. Use that UI action on **6WTMNUFE only**. Record a new authorization amendment
   and advance the current Commercial snapshot so future phase additions retain
   the corrected identity. Keep earlier authorization versions and command
   receipts immutable. No deletion/reset, reseeding, migration or direct
   database repair is proposed. Resume the saved tray and Ready mix instead of
   recreating fixtures. Historical commands remain immutable; no runtime
   fallback, alias matching or dual writes are added.
4. Review all service-identity consumers and add focused source/guard regression
   coverage. Verify build, frontend typing/lint, documentation consistency and
   the requested simulated UI path. Automated execution requires the owner's
   requested test scope. Keep physical/scientific acceptance separate.

## Acceptance

- A newly authorized Commercial job and its matching marketed workflow use the
  same permanent service identity; a different purchased service stays blocked.
- The reviewed correction preserves the existing ten accepted source tubes and
  all receipt/accession history. It cannot change a started job or another job.
- The saved fake tray loads compatible sources and records biological transfer,
  exact Ready mix use, library yield/QC and barcode identity, followed by protocol
  and preparation completion and a visible sequencing handoff.
- Close the demo mix with a simulated discard reason after its final use; retain
  lot, mix and tray lineage. Do not perform sequencing or Customer result release.

## Local walkthrough checkpoint — October 3, 2026

- Backend build: zero warnings/errors in an isolated output. Frontend scoped lint,
  typecheck and generated documentation check passed (56 guides, hash
  `9ab90b1943aa`). Automated regression source compiles; suites remain unexecuted.
- The new dialog visibly has header/body/footer, starts on Cancel, rejects an
  empty reason and restores Actions focus. The first save exposed a Commercial
  string-enum/provider read mismatch and rolled back; the corrected read path
  subsequently saved the named fake job's authorization amendment through UI.
- The saved original tray now contains source tubes `9595-01-01` through `-06`,
  is confirmed and In Progress, with six allocated POMS library tubes. No new
  fixture tray, step, protocol or workflow revision was saved. The existing
  biological field correctly uses each source tube's mL unit.
- The first simulated transfer save was rejected because the allocated library
  tubes are Label Pending; no source amount or transfer record changed. Recovery
  feedback now names the required POMS label print and scan-back. Chrome's native
  print preview needs user dismissal before the UI walkthrough can continue.

## Release boundary

Local implementation and the named fake UI records only. No Git mutation,
deployment, shared database migration, production promotion or real bench work.
