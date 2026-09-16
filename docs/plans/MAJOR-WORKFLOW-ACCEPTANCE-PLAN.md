# Major workflow acceptance scripts

**80 of 81 software cases closed (98.8%); SYS-06 remains Blocked.** This comprises 39 ordinary passes and 41 explicitly labeled simulated software passes, with no remaining software failure. The [final-three review](../testing/runs/2026-09-15-final-three-acceptance.md) closes ACC-06 and ORD-03: real private MFA/session/role checks and the implemented immutable Change-quote workflow now have complete software crosswalks. Coordinated recovery, independent scheduled/off-server backup and exact release/owner acceptance remain required. Real physical, scientific and provider-delivery acceptance remains separate.

Latest continuation: the approved failed-processing billing policy, terminal Lab handoff, selected partial cancellation and Trial/result notice links are implemented and verified locally. Current case dispositions and test boundaries are in the report above. No deployment or shared migration was performed.

## Acceptance closure reconciliation — September 14, 2026

Owner requested an end to open-ended testing and a finite closure path. The [reconciled case ledger](../testing/runs/2026-09-14-uat-closure-reconciliation.md) accounts for all 81 cases. The initial audit found zero full passes; the first targeted execution closed FIN-02, FIN-04, FIN-05, FIN-06, WEB-06, CRM-01, CRM-02, CRM-03 and CRM-04 for the isolated software baseline, at that checkpoint leaving 29 primarily remote remainders and 43 prerequisite-gated cases. The current totals and next work are in the latest checkpoint above and the controlling ledger. The [execution run](../testing/runs/2026-09-14-acceptance-closure.md) has complete step crosswalks. These are work-routing categories, not product-failure counts. Existing regression results are supporting evidence only. Continue from the remaining ledger rows, including Job completion/invoice integration and scientific/provider/physical/delivery/restore prerequisites. No new scope exclusions or acceptance waivers are inferred. Do not expand scripted requirements or repeat completed business writes to make closure easier.

## Current laboratory coverage and inventory — September 11, 2026

The current pack contains **81 cases**, with matching case rows in the run-record template. Laboratory coverage is LAB-01–10 plus LAB-13–14; LAB-11/12 are unassigned. Newer cases cover retirement/workflow invalidation, promotion, specimen source/reserve attempts, intake decisions and exception-first accession. LAB-13 includes rejection without storage, atomic acceptance of identified remaining tubes, supervised correction, required-marker wrapping and the Library prep sidebar label. LAB-14 records the preparation-tray journey: Lab configurations setup, mixed-job partial trays, shared evidence and tube exceptions, failure/reserve restart, QC reuse and sequencing handoff. Backend, frontend and E2E plans are aligned. Earlier case counts below are historical checkpoints.

All newly added run-template rows remain Not run. Customer-requested hold implementation remains Blocked. Preserve the existing HS5Y7DB7 walkthrough; no operational execution is authorized by this documentation alignment.


## Specimen attempts — September 11, 2026

LAB-09 now contains the operator script for order-policy confirmation, explicit source selection, same-attempt holds/repeats, reserve restart after failure, success and exhaustion. Include concurrency/replay, lineage denials, permission gates and legacy Planned adoption. Implementation and local migration are complete; persisted lifecycle acceptance remains Not run. Customer-requested holds remain blocked. Preserve HS5Y7DB7 until the paced walkthrough resumes.

## Request and outcome

The Product Owner requested testing scripts for all major system workflows on September 8, 2026. The default deliverable is a manual acceptance pack usable by product, commercial, laboratory and operational testers. It provides prerequisites, ordered actions, expected results, negative variants, handoffs and a run record.

The [testing pack](../testing/README.md) contains 74 cases across access, CRM, Trials, Lab orders/shipping, Partner Kits/Assembly, laboratory execution, Finance, files/data/retention, public Website/help, cross-system recovery and transportation-kit fulfillment. [Test data](../testing/TEST-DATA.md) records role separation and connected-journey fixtures. [Run record](../testing/RUN-RECORD.md) is the reusable evidence template.

## Laboratory test-protocol preparation — September 11, 2026

The resumed walkthrough has a [two-protocol TEST ONLY fixture](../testing/fixtures/test-library-preparation-protocol.md) for existing LAB-01/03/04 cases and a [preparation/run record](../testing/runs/2026-09-11-protocol-preparation.md). The owner requested slow, step-by-step authoring and two connected protocols: Extracted RNA readiness, then Library preparation and QC, each with three steps. It adapts the built-in example, with synthetic QC values, explicit conditional/optional resolution, resource traceability and retained corrections. Scientific criteria remain the Lab owner's responsibility. The first execution checkpoint is one existing specimen's identity step, subject to current intake and pinned-workflow eligibility. Draft preparation does not establish controlled approval or acceptance. No acceptance-case IDs are added. The current pack has 75 cases including ORD-07; the 74-case counts below describe the earlier transportation-kit checkpoint.

## Transportation-kit workflow update — September 8, 2026

The Product Owner requested incorporation of the new workflows into the test
plan. [Module 11](../testing/11-transportation-kits.md) adds SHP-01–14 for kit-size
configuration, Customer/Department delivery locations, included-cost ordering,
deduplication/cancellation, Phaeno notification/fulfillment, physical stock
registration, partial dispatch and Customer receipt, alternate container
selection, tube scanning, split-sample manifests and per-tube Lab receipt.
ORD-04/05 and LAB-02 now connect the grouped/finalized roster to that sequence.

The pack includes a resume point for HS5Y7DB7 and separate 30-tube, alternate-size,
partial-supply, cross-location and recovery fixtures. New cases remain Not run;
the 53 backend, 42 component and 48 browser checks remain historical evidence.
The living backend/frontend matrices distinguish specific existing assertions
from missing regression coverage. Cross-Job inventory, reservation/reconciliation
and automatic replenishment remain planned product scope, separate from the
implemented Job/location kit-ordering slice. No tests or operational actions
are part of this documentation update.

## Scope and acceptance

Document currently implemented behavior using current controllers, services, tests and audience help. Record stale prose discrepancies in the pack. Keep unconfigured/deferred capabilities and physical/provider acceptance explicit. Do not change application behavior, dependencies, auth, schema, Git state, deployment, production records or feature activation.

This is newly authored manual coverage. No application tests or business workflows were run for this documentation task. Existing automated coverage is not promoted to connected acceptance. The living backend, frontend and E2E plans link to the companion without changing their historical results.

Deliverable verification: validate relative document/source links, unique case IDs and inventory/run-record agreement; inspect the resulting documentation diff and whitespace. Application builds and test-suite execution are outside this documentation-only scope.

## Documentation checkpoint

The original 60-case pack's IDs and Not run rows were verified when authored.
The transportation-kit update extends the inventory and run template to 74 cases.
Documentation verification for this update confirmed 11 modules, 74 unique case
IDs, 74 matching Not run rows, all 14 SHP scenarios and 156 resolving local
document/source links. The updated documentation passes whitespace checks.
Source review also confirmed that external sequencing sendout must be created
while its batch is In progress; the Lab script starts the batch, creates the
sendout, and records batch completion afterward. This is script verification,
not a result from executing the workflow.
