# Major workflow acceptance scripts

## Request and outcome

The Product Owner requested testing scripts for all major system workflows on September 8, 2026. The default deliverable is a manual acceptance pack usable by product, commercial, laboratory and operational testers. It provides prerequisites, ordered actions, expected results, negative variants, handoffs and a run record.

The [testing pack](../testing/README.md) contains 74 cases across access, CRM, Trials, Lab orders/shipping, Partner Kits/Assembly, laboratory execution, Finance, files/data/retention, public Website/help, cross-system recovery and transportation-kit fulfillment. [Test data](../testing/TEST-DATA.md) records role separation and connected-journey fixtures. [Run record](../testing/RUN-RECORD.md) is the reusable evidence template.

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
