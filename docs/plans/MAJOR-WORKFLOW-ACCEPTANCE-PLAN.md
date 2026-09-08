# Major workflow acceptance scripts

## Request and outcome

The Product Owner requested testing scripts for all major system workflows on September 8, 2026. The default deliverable is a manual acceptance pack usable by product, commercial, laboratory and operational testers. It provides prerequisites, ordered actions, expected results, negative variants, handoffs and a run record.

The [testing pack](../testing/README.md) contains 60 cases across access, CRM, Trials, Lab orders/shipping, Partner Kits/Assembly, laboratory execution, Finance, files/data/retention, public Website/help, and cross-system recovery. [Test data](../testing/TEST-DATA.md) records role separation and connected-journey fixtures. [Run record](../testing/RUN-RECORD.md) is the reusable evidence template.

## Scope and acceptance

Document currently implemented behavior using current controllers, services, tests and audience help. Record stale prose discrepancies in the pack. Keep unconfigured/deferred capabilities and physical/provider acceptance explicit. Do not change application behavior, dependencies, auth, schema, Git state, deployment, production records or feature activation.

This is newly authored manual coverage. No application tests or business workflows were run for this documentation task. Existing automated coverage is not promoted to connected acceptance. The living backend, frontend and E2E plans link to the companion without changing their historical results.

Deliverable verification: validate relative document/source links, unique case IDs and inventory/run-record agreement; inspect the resulting documentation diff and whitespace. Application builds and test-suite execution are outside this documentation-only scope.

## Documentation checkpoint

All 60 case IDs are unique and match the 60 Not run rows in the run template.
Relative document/source links resolve. Documentation whitespace checks passed.
Source review also confirmed that external sequencing sendout must be created
while its batch is In progress; the Lab script starts the batch, creates the
sendout, and records batch completion afterward. This is script verification,
not a result from executing the workflow.
