# PSeq kit lot traceability and standalone Partner lot submission

Date: October 15, 2026.
Status: implemented and verified locally through analysis start. Focused regressions and connected desktop/mobile browser acceptance passed; live identity/provider, physical and scientific acceptance remain separate.
Owner: [Order Management](ORDER-MANAGEMENT-PLAN.md).

## Approved product scope

Every supplied physical PSeq kit belongs to a registered product lot. Partners can enter and check the label lot **outside the data assembly workflow**, before libraries are sequenced or any assembly files are ready. The lot is saved and reused when assembly is later requested. Early entry requires neither an assembly request nor an actual kit-use date and does not consume an entitlement or start work.

Lot entry must precede data assembly. Recommend checking before library preparation and sequencing to catch recalled or expired product early. Record the actual kit-use date when known and require it before submitting assembly inputs. Expiration is assessed on that use date; the labeled expiration day is included. An early check without a use date assesses current status and does not invent a future or historical use date.

Scope is the existing Partner kit purchasing/included-case workflow. Customer organization access, transportation kits, internal reagent inventory, commercial terms, entitlement deadlines and scientific release policy are unchanged. Recall and expiration warnings appear to the Partner and Phaeno; no new separate flagged-lot clearance gate is introduced. Existing intake/scientific review remains responsible for handling affected data.

## Implemented experience

1. A platform administrator opens **Order settings → PSeq kit lots → Create kit lot**, chooses an active catalog product configured for a Partner kit offering, and records the printed lot number and labeled expiration when known. Lots are unique per product after trimming and case normalization. Product, printed identity and expiration are fixed when registered; this avoids silently rewriting label facts. Missing expiration remains explicitly unknown.
2. The lot list has server search, exact counts, stable 25-row pages and URL-backed search/page state. A lot number opens a dedicated view-first detail route. Creation and recall decisions use bounded dialogs. The single **Recall lot** or **Lift recall** action requires a current version and Partner-visible reason; central audit retains prior decisions and actor/time evidence.
3. Shipment and replacement select a registered lot for the exact kit product. The server derives labeled expiration from that lot and freezes it with fulfillment evidence. Unknown, recalled and expired-at-shipment lots cannot ship. Unfulfilled commercial units can await physical allocation; supplied physical units require a registered lot.
4. From a shipped kit order's included case, the Partner chooses **Actions → Submit kit lot**, enters the printed lot and saves it. An actual use date is optional at this point. No assembly request, files, profile metadata or sequencing evidence is required. The kit order shows the saved entry, check time and current warnings. **Update kit lot submission** adds the actual use date later.
5. Later assembly preparation loads the saved lot automatically. If there was no earlier submission, the same bounded lot dialog is available here. Assembly inputs cannot be submitted without a matching registered lot and actual use date. Incorrect/unknown lot numbers require correction or Phaeno support; the system never silently reassigns the physical kit or reports an unknown lot as clear.
6. Recall, expired-at-use and unknown-expiration states appear separately, including both recall and expiry warnings where applicable. A kit used before expiry is not flagged as expired merely because its sequencing data arrives later. The existing assembly entitlement deadline remains distinct.
7. Assembly submission rechecks the authoritative lot and the lot version displayed to the Partner. Changed lot information returns a refresh/review error without duplicating input revisions. The input revision freezes lot identity, Partner submission identity, actual use date and the exact assessment.
8. Phaeno sees entered lot information first in the assembly execution workspace and start form. Starting analysis requires the exact submitted revision's lot/use-date evidence and checks current lot status again. The displayed lot version must still match; the start form provides a refresh action after a stale assessment. The run separately records its analysis-start assessment. Earlier submission evidence is not rewritten by a later recall or replacement.

## Engineering decisions and boundaries

- Add `commercial_ops.pseq_kit_lots` and `commercial_ops.partner_kit_lot_submissions`, with UUIDs, restrictive foreign keys, numeric concurrency and centralized audit stamping.
- Link physical units and shipment allocations to registered lots. Keep shipment lot/expiration facts as immutable fulfillment snapshots, rather than legacy fallbacks or alternate sources of current lot status.
- Save Partner lot entry against the exact purchased case and current physical kit independently of any `DataAssemblyRequest`. A replacement has separate physical-kit evidence. A submitted lot can be changed only while the associated request is editable; corrected inputs create a new immutable revision.
- New assembly input fields are `KitLotId`, `KitLotSubmissionId`, `KitUsedOn` and `KitLotAssessmentJson`; processing runs add `KitLotAssessmentJson`. Non-kit historical standalone assembly remains a separate valid workflow and does not fabricate kit lineage.
- The lot service generates assessments on the server. Lot information is typed domain evidence, not client-trusted profile metadata or validation JSON. Calendar dates are independent of timestamp display/time-zone formatting.
- Recall writes, fulfillment and assembly checks share transaction locks for the lot. Partner lot saves and assembly submission also share the case lock. Existing command receipts retain idempotency; stale versions and uncertain retries cannot duplicate a submission or run.
- External writes require the existing Partner administrator permission and authenticated organization/Department/case ownership before idempotency replay. External reads receive only their own kit/case evidence; the lot catalog and recall mutations require existing Phaeno platform administration. No authentication or dependency change.
- Lot discovery/details use the shared record flow. Case and fulfillment actions use `ActionMenu`; one action renders directly and multiple actions share one menu. New forms use React Hook Form/Zod, shared Field/Input/NativeSelect sizing, visible required legends, draft-dismissal guards and accessible labels/errors. Recall confirmations have header, explanatory body and footer, and initially focus Cancel.
- The existing resumable assembly page remains justified by its files/profile context. Early lot entry uses a modal from the kit order and never forces the Partner through that assembly page.
- No automatic recall outreach, scheduled monitoring, historical email replay, new Customer service, stock-quantity system or fabricated laboratory manufacturing lineage is included.

## API scope

- Staff lot list/create: `GET/POST /api/platform/order-configuration/kit-lots`.
- Staff detail/recall: `GET /api/platform/order-configuration/kit-lots/{id}` and `POST .../{id}/recall`.
- Independent Partner save/check: `POST /api/reagent-orders/{orderId}/assembly-cases/{caseId}/lot`; the existing authorized kit-order read returns saved lot evidence and current warnings.
- Existing kit/case/request DTOs expose saved/current lot assessments. Assembly submission and analysis start send the displayed lot version. Existing API envelopes, domain errors, tenant boundaries and commercial sources are preserved.
- Shipment/replacement commands now obtain expiration from the registered lot, with obsolete caller-supplied expiration removed from those write contracts. Readable shipment snapshots retain their recorded dates.

## Existing data and migration

Configured target verified in this execution: loopback PostgreSQL, `localhost:5432/phaeno_ops_clean_20260919`. Before the model change, purchased kit units, reagent shipment allocations and assembly input revisions each had zero rows. No affected kit history needed conversion, repair, reseeding or reset. No destructive remedy was performed.

Migration: `20261015215237_AddPSeqKitLotTraceability`. It adds two lot/submission tables, seven columns on existing kit/shipment/assembly tables, restrictive relationships, indexes and a shipped-unit lot constraint. It adds no placeholder lot IDs, drops no data in its forward migration, and does not touch Website intake data. Its guard refuses a database containing existing kit shipment or submitted-kit evidence until that evidence has an explicitly reviewed conversion. It does not guess lot identities, use dates or acknowledgements.

The migration was applied only to the configured local target. Readback confirms the exact migration identity, both new tables and the shipped-unit constraint; registered lots, Partner submissions and the three affected existing collections remain empty. EF reports no pending model changes. [The complete ERD](../database-erd.md) was regenerated from the migration snapshot.

For a populated hosted/test database, report affected product/lot identities, expiration conflicts, missing facts and input/replacement lineage before migration. The recommended remedy is reviewed one-time conversion using verified facts, optionally reseeding verified reference lots. Deleting/resetting affected test fixtures is an alternative with loss of the selected history and requires explicit authorization naming that scope. No runtime legacy adapters or invented historical evidence are permitted. Hosted conversion/migration, Website intake preservation/backup obligations, Git operations and deployment keep their existing separate authorization boundaries.

## Documentation and acceptance

Updated distinct Partner kit/assembly help and Phaeno configuration, fulfillment, assembly and order overview help, including review dates. Regenerated the API documentation corpus and UI version. No Customer guide or help audience boundary changed.

Authored three domain, three connected PostgreSQL and three component regression cases. Updated existing kit acceptance fixtures for registered lots, saved Partner submissions, exact lot versions, immutable receipts and Actions navigation. The [backend](BACKEND-TEST-PLAN.md), [frontend](FRONTEND-TEST-PLAN.md) and [E2E](E2E-TEST-PLAN.md) plans record the executed scope and results.

Required behavior covered by the authored cases or pending connected acceptance:

- Independent early save/replay without an assembly request, files or use date, preserving the available entitlement.
- Product/physical-kit mismatch, Department isolation, required lot identity and missing actual use date.
- Expiry on/before/after the labeled last day, use before expiry with later data submission, simultaneous recall/expiry and unknown expiration.
- Recall changes after the early check, between displayed assessment and input submission, and between intake and analysis start.
- Immutable revision/run evidence, replacement lineage, stale writes and duplicate/uncertain command handling.
- Staff lot registration and recall/lift, registered-lot fulfillment, saved-lot reuse in later assembly, keyboard/focus return, confirmation body structure, aligned fields, narrow layouts, light/dark themes and accessible warnings.

## Verification checkpoint

- Focused backend domain/PostgreSQL regressions: 25 passed, zero skipped. The final opt-in browser host test also passed.
- Frontend component/decision-dialog tests: 25 passed across four relevant files.
- Connected browser acceptance: four scenarios passed across desktop Chromium and Pixel 5 emulation, using real HTTP controllers/domain/EF/PostgreSQL. Early standalone save, reopen, saved-lot reuse, required actual use date, saved-draft submission, current recall refresh/start, immutable evidence, anonymous/Department rejection, light/dark warnings, overflow, keyboard focus and Axe checks passed.
- An existing intercepted-API Partner Kit preparation/interrupted-upload browser regression also passed. It is separate simulated UI evidence.
- Verification repaired the missing displayed lot version on saved-draft detail submission, explicit dialog focus return, and shipment expiration calendar-date display. Component menu and JSONB comparison fixtures were corrected.
- Backend build: zero warnings/errors. Frontend type check, touched-file ESLint and production client/server build: passed.
- Documentation generation/consistency: passed, 59 guides, corpus `50b53bdc8aa1`. Owning/test plans and Partner help updated. The previously verified migration/ERD remain unchanged.
- Synthetic identities/session presentation, file scanning/storage, physical/scientific/provider work and live Clerk authentication are explicitly distinguished in the [verification report](../testing/runs/2026-10-15-pseq-kit-lots-verification.md). Staff lot-catalog UI acceptance is outside this browser run.
- Disposable verification databases were removed. The configured application database and Website intake received no operational fixtures. No staging, commit, push, hosted migration or deployment was performed; unrelated workspace changes were preserved.
