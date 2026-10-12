# Laboratory outage worksheet and reconciliation draft

Prepared October 11, 2026. Lab management must approve this procedure before
operational use. This is a training/acceptance draft, not a validated laboratory
SOP and not an offline feature of POMS.

## Before the exercise

Name the supervising owner, operator, approved paper/electronic worksheet
location and reconciliation reviewer. Identify printer/stock/scanner/browser
and the approved procedure for the exact handling/storage conditions. Use
clearly marked non-customer material for qualification. Preserve source records;
an outage never authorizes invented barcode, quantity, custody or result facts.

## Stop and preserve identity

- Stop the affected activity at the laboratory-approved safe boundary. The
  supervisor decides whether an in-flight procedure can safely continue;
  application unavailability alone does not establish a physical stop.
- Keep every physical tube, rack/tray position and existing label associated.
  Segregate ambiguous/unlabeled material for supervisor review. Do not assign a
  replacement identity or repeat a transfer merely because POMS is unavailable.
- Retain actual observation times separately from later recording times.
  Record the performer, recorder and reviewer rather than inferring one role
  from another. Use the worksheet's timezone and explicit units.

## Required worksheet fields

| Field | Evidence to record |
| --- | --- |
| Outage | Start/end, workstation, affected scanner/printer/network/application and supervising owner. |
| Work identity | Existing Job/phase/sample/accession identifiers, source/destination physical barcodes and namespaces, tray positions and location. |
| Actual work | Approved protocol/step/version, actual start/stop, observation/capture, performer and supporting evidence reference. |
| Material | Actual quantity/unit transferred or measured, source remainder/exhaustion observation and destination identity. Do not calculate missing observations from capacity. |
| Printing | Label identity/content, attempt/outcome and physical verification. A browser print command does not establish a usable label. |
| Custody | Actual handoff/receipt time, people, package/tube identities and discrepancies; preserve carrier/provider evidence. |
| Exception | What is uncertain, how material is segregated, safe boundary, supervisor decision and required follow-up. |
| Reconciliation | POMS record/command identity, recorder/time, reviewer, duplicate/conflict check and unresolved discrepancies. |

## Controlled recovery

1. Confirm application/scanner/printer readiness without advancing real work.
2. Review retained POMS facts before entering worksheet observations. Determine
   whether an uncertain save already committed; reopen its saved record rather
   than creating a duplicate accession, print, transfer or batch.
3. Reconcile exact physical identities, namespaces, lineage and quantities.
   Conflicting/unknown values remain exceptions until reviewed. Never silently
   overwrite earlier evidence or reuse an identity assigned to another tube.
4. Record the actual performance evidence and the later recorder/time through
   the supported workflow. Corrections retain original evidence and reasons.
5. Reviewer compares worksheet, physical material and POMS history. Resume only
   after role, authorization, QC, material and independent blockers are cleared.

## Qualification and acceptance

Observe printer interruption, partial print, scanner character/terminator
failure, unknown/duplicate/wrong-context scan, network loss before/after save,
uncertain transfer commit, and vendor custody discrepancy. Record hardware,
participants, actual behavior, defects, remediation and retest.

Lab management approves the safe boundaries, worksheet storage/handling,
reconciliation authority and training procedure. Engineering confirms the
supported recovery controls. The designated trainer teaches the process back.
No operational acceptance is claimed by drafting this document.
