# Laboratory versioning UAT slice — September 14, 2026

Continues the owner's request for a large slice toward ten further completed cases. Target LAB-01 and LAB-08 using the saved TEST ONLY protocol definitions. The seven order/shipping cases in the earlier selection remain gated; none is silently marked passed or removed from the ledger.

Use a dedicated TEST ONLY catalog/service key and copied protocol identities. Perform independent author/reviewer approvals, workflow promotion by each permitted actor, validation and stale/unauthorized denials, old/new workflow pins, withdrawal, retired-protocol and legacy self-approval gates. Inspect saved definitions in the actual UI and preserve every approval/history entry. Any provider-created Lab work is explicitly synthetic software fixture data, never an accepted commercial order or physical receipt. No service entitlements, Customer purchases, scientific data, external providers or production changes.

The existing pseq-lab-service workflow, protocol definitions, jobs and pins are a read-only baseline. Retire the disposable production workflow and deactivate its catalog item when done. Keep original snapshots and the new isolated test history. No role grant, shared migration or Git mutation.

## Result

**LAB-01 and LAB-08 Pass for isolated software acceptance.** Every required step and variant below has connected evidence. Overall closure advances from 12 to **14 of 81 cases (17.3%)**; 24 remain on the primarily remote route and 43 on the named-gate route. The earlier selected order/shipping batch remains three of its ten cases closed. These two additional closures bring the broader ten-further-cases effort to five completed cases; they do not imply that the seven blocked order/shipping cases passed.

No product defect was found in this slice and no application source change was needed. Protocol validation, independent approval, immutable history, promotion concurrency and version pinning passed on the retained runtime. This is software acceptance using explicitly synthetic definitions and work authorizations, not validation of scientific criteria, bench work, Customer purchasing or final release signoff.

## Environment and evidence

Actual Clerk sessions P-PROTOCOL-A and P-PROTOCOL-B are separate Protocol Administrators. P-LAB supplies the denied Operator request; P-ADMIN creates and deactivates the dedicated catalog item. Existing assignments are unchanged. Author A is `0eb87b0b-651a-4ba3-ab44-fafbdef30067`; reviewer B is `b94dbfd7-7b78-470f-9ff1-460c8be13356`.

Portal `https://localhost:3016` and API `https://localhost:7116` use isolated PostgreSQL `127.0.0.1:5436 / phaeno_ops_lab06_uat`. The API binary remains `tmp/uat-intake-verified-build/bin/PSeq.Operations.Api/debug/PSeq.Operations.Api.dll`, SHA-256 `C0E99874F49ABEB5AD8152451218909C377589B19A77F2B56DE016F84D99A946`. Runtime settings and corpus are recorded in `tmp/uat-closure/intake-api-baseline.json`; no restart, migration or deployment was needed. The source checkout at closeout is `6208b7f`; the existing binary identity, rather than the later checkout label, identifies this execution.

Authoritative ignored execution journal: `tmp/uat-closure/lab-versioning-connected.json`, with request payloads saved before each mutation, responses, actor identities, original baseline, exact saved definitions, UI review text, concurrency results and final cleanup readback. Scripts are in `tmp/uat-closure-identities/lab-versioning-*.mjs`. Supporting provider commands and acknowledgments are `lab-versioning-command-{before,v1,v2}.json` and `lab-versioning-work-{before,v1,v2}.json` in the same evidence directory. Screenshots `lab-versioning-completed-desktop.png` and `lab-versioning-completed-mobile.png` were visually inspected; the 390px document fits its viewport. This bounded layout check is not full SYS-05 acceptance.

The provider fixtures use the real `InternalLabOperationsProvider.AuthorizeWorkAsync` to select the current Production workflow. Commands are journaled once and use clearly synthetic source identities with one software-placeholder specimen. No commercial order is accepted, no specimen is received, and no workflow pin is assigned directly. Historical negative fixtures are separately identified below; they cannot be produced through the currently enforced approval API and are deliberately staged only in the isolated database.

## LAB-01 step crosswalk

| Required step | Connected result |
| --- | --- |
| 1 Structured definition, validation and save/resume | Created separate copies of the two saved TEST ONLY definitions with ordered required/optional/conditional steps, typed captures, resource requirements and QC criteria. Missing condition, empty choice values and missing QC criteria each return 400 without saving a draft. Actual editor saves a changed step name in protocol 1 v2 and restores it after reopening. Saved normalized definitions and review text are retained. |
| 2 Author rejection and independent approval | A's self-approval requests return 409. B opens each actual Review and approve dialog, inspects the definition, observes approval disabled before attestation, then checks the attestation and approves. Exact versions retain author A, approver B and approval times. |
| 3 Workflow and valid Production selection | B creates the two-stage canonical workflow; A approves and confirms promotion through the UI. Both included protocols become Active with their original B approvals. Only one current Production version exists. A separate Draft protocol is rejected as a workflow stage with 400; no workflow revision is saved. |
| 4 New versus existing work | Provider authorization before any promotion leaves work unpinned. A new authorization after v1 promotion pins v1; a new authorization after v2 promotion pins v2. Subsequent promotion, rejected transitions and cleanup preserve all three assignments and all earlier work. |
| 5 Immutable history and separate draft discard | Ordinary approved identity edits, definition edits and deletion each return 409 with identical readback. The approved editor route reports that the draft is not editable. A separate protocol 2 draft is cancelled once without a write, then discarded through the confirmation dialog; its Discarded record remains and original v1 is unchanged. |

## LAB-08 step crosswalk

| Required step | Connected result |
| --- | --- |
| 1 Protocol author promotes independently approved workflow | A authors protocols, B approves them; B authors workflow v1, A approves and promotes it through the UI. Protocol approvals retain B and original times; workflow approval and promotion retain A and distinct event times. |
| 2 Workflow author promotion and Actions/Cancel | A authors v2 and B approves it. Actions → Promote → Cancel changes nothing, followed by the successful A promotion in the concurrent-request check. A separate valid v6, again independently approved by B, additionally completes the entire actual Actions → Cancel → reopen → confirm path as its author A. |
| 3 Enforced and legacy self-approval | Current protocol and workflow self-approvals return 409. B's promotion of a historical self-approved workflow returns 409. B's promotion of an independently approved workflow containing a historical self-approved Active protocol also returns 409. Full protocol/workflow/work-order collections remain identical after each rejection. |
| 4 Role, stale, withdrawal, ineligible protocol and atomicity | Operator promotion returns 403. A withdrawn candidate cannot promote (409); independent reapproval restores eligibility. Two simultaneous requests against the same approved workflow version yield exactly one 200 and one concurrency 409, with one Production version. An older concurrency token returns 409. A candidate containing a retired protocol identity returns 409. Every denied transition leaves the previous Production workflow, protocol states and job pins intact. |
| 5 Approval/promotion audit and job pin retention | v1/v2/v6 retain the expected author, independent approval actor/time and permitted promotion actor/time. The three provider-created jobs retain null/v1/v2 respectively. All 24 original work orders, seven original protocols, three original workflows and ten role assignments match the initial readback; original material, equipment and batch collections also match. No assignment repair was performed. |

## Fixture identities and audit boundary

Dedicated catalog/service: `test-only-uat-versioning-20260914`; canonical workflow `858ef785-535a-4cba-802d-3ab34527daf5`. Copied protocol identities are `153ec7bb-ac70-4ff6-980d-9e95f478593d` and `c056c419-87ff-4406-8033-e693e66b7bc2`.

| Workflow version | ID | Result before cleanup |
| --- | --- | --- |
| v1 | `5e54bb0c-be6e-49fb-876e-83cd54872713` | Promoted by protocol author A; subsequently retired by v2 promotion. |
| v2 | `3bd7c6d1-f88d-4ca8-82d6-02154e335adb` | Promoted once by workflow author A; subsequently retired by v6 promotion. |
| v3 | `498d1c13-bc2a-400d-8e81-0a7f95e191aa` | Synthetic historical self-approved workflow; promotion denied, withdrawn and discarded. |
| v4 | `ce18b10f-d1c7-40c3-af5e-0bf29ccc8b96` | Includes synthetic historical self-approved Active protocol `01d7e740-1651-4571-949f-375ec6d4abcb`; promotion denied, withdrawn and discarded. |
| v5 | `d887bfbe-d716-46e3-b938-21af877b731f` | Includes retired protocol identity `74713b66-fbec-46be-92f8-311f3c518806`; promotion denied, withdrawn and discarded. |
| v6 | `8093faa9-9af1-4ed3-88ee-d6fc6576dfc5` | Actual UI promotion as workflow author A, independently approved by B. |

Legacy fixtures are new, explicitly synthetic rows created with the domain's audit-only approval option. Only the never-persisted negative protocol object's Active status was staged to represent historical state; enforcement flags and existing approved rows were not changed. The fixture helper records IDs before saving and refuses an unresolved existing candidate. These records establish fail-closed software behavior, not valid independent scientific approvals.

| Synthetic work | Saved pin, retained after cleanup |
| --- | --- |
| `16df844d-235d-4c59-addc-d151c0f48ee7` | None; created before Production existed. |
| `2b4065af-ddde-46b0-92bb-ac1ab91eab8e` | Workflow v1. |
| `4534a085-1254-4c09-8b15-614e92611b88` | Workflow v2. |

All remain AwaitingSpecimens. Actual work pages were reopened and their visible text retained. No new-work authorization was needed after the extra v6 UI confirmation; current-version assignment was already proven across the real v1-to-v2 change.

## Cleanup and continuation

Retired disposable v6 through the actual UI after first verifying Cancel; the test service now has no Production workflow. Deactivated its catalog item through the supported API and confirmed it is absent from active marketed services. Negative candidates and the separate protocol draft remain Discarded. Test histories, definitions and the three synthetic job pins remain for audit. Original PSeq workflows, jobs, protocols, supplies, equipment and role assignments are unchanged. Final browser capture contains no page errors or blocked unexpected writes.

Harness-only corrections: one self-approval expectation was corrected from 403 to the API's documented 409 without repeating a successful mutation; a fixture rebuild used a separate output directory after Windows reported locked helper binaries. The final helper build passed with zero warnings/errors. No broad application suite was rerun for this evidence-only slice.

Next work must target another unfinished case's missing steps. Retain the [order/shipping prerequisites](2026-09-14-next-ten-uat.md); do not recreate imports, locations, protocol approvals or these pinning fixtures to report progress again.
