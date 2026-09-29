# Transportation kits as Customer location inventory

## Publication verification — September 29, 2026

The owner authorized tests, commit and push, with deployment explicitly excluded. The complete suites plus targeted reruns establish 1,124 backend, 1,244 component and 194 desktop/mobile browser cases passing. Obsolete fixtures/assertions and a mobile animation-timing assertion were corrected; all affected cases were rerun. Two backend cases and two mobile print cases remain intentionally skipped. The living backend, frontend and E2E plans record the initial failures, corrections, exact evidence and simulation boundaries.

The full solution build has zero warnings/errors; frontend ESLint, TypeScript and the 56-guide corpus check pass. Disposable local database cleanup succeeded. The configured owner database and active debug processes were preserved, with no additional migration application. The new assembly modal has component/connected-backend and earlier bounded manual evidence; actual printing, physical scanning, scientific acceptance and hosted acceptance remain separate. Backend deployment remains manually disabled and both Vercel applications retain the branch deployment hold.

## September 29 one scan per packed tube

The owner approved removing mandatory independent tube rescanning. Phaeno staff scan each tube once as it goes into the container. The assembly modal keeps exact bill-of-materials quantities, unique barcode syntax/namespace/ownership checks, approved product/source-lot/expiration checks, recorded Print and affixed container-label scan. Complete is the operator's confirmation that the recorded contents are packed and atomically records the approved assembly step, actor and time. Save for later stays outside Inventory; resuming displays the saved tube count and expandable IDs without asking staff to scan them again. No narrative notes or additional checkbox is required.

Engineering decision: assembly completion and both dispatch paths require the exact unique tube roster with the saved tube product and namespace. Customer request supply selection and frontend Inventory/dispatch use the same completion criteria. Optional physical rescanning remains available from the completed kit's single Actions menu and through the existing explicit verification API. A real optional scan must match the full roster. Do not stamp rescan actor/time from the first packing scan or from completion; existing rescan evidence and correction history remain valid. Saved optional verification evidence and API fields retain their current purpose; no compatibility adapter, persisted-model change or migration is added. Existing published/physical snapshots stay unchanged.

Acceptance: one tube scan per item; exact BoM and N unique registered tubes; missing/duplicate/excess/wrong product or namespace is rejected; missing Print/affixed label and expired stock still block; unfinished drafts stay outside Inventory; resumed complete contents can finish without extra consumption; completed unrescanned kits appear in dispatch choices and can dispatch; optional rescan is clearly labeled and records evidence only when performed. Earlier mandatory-rescan acceptance and verification checkpoints below are historical.

Verification: 65 focused frontend and 18 backend cases pass, including successful Customer supply selection and dispatch without a second scan, exact unique product/namespace roster gates, resumed complete packing without added consumption and optional rescan validation. Scoped ESLint, TypeScript, 56-guide corpus and whitespace checks pass. The current signed-in Inventory list loads; no unfinished owner kit was available to reopen the assembly form, so no new manual completion or phone review is claimed. No owner kit/stock/print request was made. The API/test projects build in the isolated artifacts directory; Visual Studio/IIS Express still holds the active normal outputs, so its API needs a rebuild/restart to use the server change. No persisted-model change, migration, Git operation or hosted deployment.

## September 29 assembly confirmation without required notes

The owner removed the assembly completion notes field because routine completion prompted filler such as N/A. The assembly modal now completes without typed notes; the server still records the approved step, operator and UTC completion time atomically with all material and barcode evidence. Existing saved notes remain readable and are retained when resuming a draft. Notes supplied through the existing API remain optional and length-limited. No database shape changes or migration are needed. Print/attached-label scan, exact BoM, independent tube verification and expiration gates remain in force.

The duplicate divider came from the final component fieldset's bottom border and the verification section's top border. The form now explicitly applies bottom borders only between component rows; Verify packed tubes keeps its single top divider. This supersedes the earlier required-notes acceptance criteria below.

Verification: all 54 focused frontend and 16 backend regressions pass. Backend tests use the disposable `phaeno_kit_packing_edge_20260928` database, which was removed after the run. The current API/test projects build successfully in an isolated artifacts directory because Visual Studio/IIS Express holds the normal output assemblies open. Scoped frontend ESLint with zero warnings, full TypeScript, documentation corpus and whitespace checks pass. Signed-in desktop and actual 390 × 844 CSS phone review confirms a single divider, no notes field or checklist entry, no horizontal overflow, Escape dismissal and focus return to Actions. Review made no owner kit writes or print requests. The running Visual Studio API needs a restart/rebuild to load the changed completion rule; its debug process was preserved. No migration is needed for this correction.

## September 29 unified assembly modal and label confirmation

The owner approved replacing Prepare Phaeno kit with Assemble transportation kit and completing assembly in that modal. Save for later retains actual scans, component/source-lot consumption and draft notes; unfinished assemblies appear in a separate In progress list and never in Inventory or dispatch selection. Resume uses the same modal. Print creates/saves a permanent kit identity before printing; the same identity is reused on retries and reprints. Completion requires a recorded print request and a scan of the barcode after it is affixed, as well as exact BoM use, the independent full tube rescan and assembly completion notes. The browser print dialog is not proof that a physical label printed. Remove the separate Complete assembly and Stop assembly UI commands. Keep withdrawal and completed history available.

Engineering scope: Portal-owned assembly API and feature components only; no dependency, authentication, hosted deployment or Git changes. Persist print-request/attached-label verification actor/time and draft notes/rescan entries on the existing assembly run, with an additive EF migration and ERD update. A combined save validates and commits component consumption, tube registration, notes, verification and completion atomically. Keep current immutable kit/specification/workflow evidence and source-stock concurrency checks. Creation retries use a stable request identity. Print does not consume components. A saved draft retains its original specification rather than silently adopting a later revision. Apply the verified migration only to the configured local development database.

Acceptance includes partial-save/resume outside inventory, exact final quantities, missing/cancelled print and incorrect label gates, independent matching tube rescan, no duplicate stock consumption on retry, one modal from creation through completion, accessible desktop/mobile layout and immutable completed evidence. The previous separate-step/completion UI paragraphs below are historical.

### Unified assembly verification

- All 54 focused frontend and 16 backend regressions pass. Backend reference cases run only against the named disposable test database; cleanup succeeded.
- Solution build: zero warnings/errors. Frontend full ESLint with zero warnings, TypeScript, documentation corpus check and whitespace checks pass.
- Local migration `20260929133348_AddKitAssemblyLabelVerification` applied successfully to verified localhost database `phaeno_ops_clean_20260919`; existing business records were preserved. ERD regenerated: 221 tables, 3,245 fields and 527 foreign keys. No pending EF model changes remain.
- Signed-in Chrome review: renamed creation entry, separate In progress list, same modal from saved kit, Print-first blocked completion, fixed form actions, amber warnings, keyboard Tab/Shift+Tab, Escape and focus return. Actual phone CSS viewport 390 × 844 has no document/dialog horizontal overflow. No Print or Save request was made against the owner's Test Kit; its 0-of-20 roster remains unchanged.
- Print request does not prove a printer produced a physical label. Independent affixed-label scan and tube rescan remain required. Real printer/scanner and physical/scientific acceptance remain unverified. No hosted deployment, Git mutation or production database change was performed.

## September 29 single-step assembly in the packing modal

The owner requested that the Lab-step recording action move into Record packed contents and that a Transportation kit workflow contain exactly one approved instruction-only Lab step. The users remain Phaeno staff preparing physical kits. The workflow editor exposes one required Assembly step select; draft creation/update and approval enforce exactly one valid step. Existing immutable revision and physical-kit evidence remains readable.

The packing modal shows the pinned assembly instructions. Partial component saves leave the step pending. A save that brings every component to its exact approved quantity requires completion notes and records the single step, its operator and timestamp together with scans, uses and stock deductions in one transaction. If components are already recorded but step evidence is missing, the same modal supports a notes-only save. Remove the separate Record next Lab step action/dialog. Retain the existing step API; automatic approval review rejected its removal because other clients could depend on it. Enforce the single-step rule in transportation kit workflow save/approval and new-stock readiness, without changing shared domain constructors or persisted evidence. Previously recorded step evidence is retained and never duplicated. Final physical-roster verification and Complete assembly remain separate gates. No database schema change, new dependency, authentication change, deployment or Git operation is required.

Acceptance: exactly one configured Lab step; one modal for instructions, final completion notes, barcodes and component/source-lot use; no step completion on partial packing; any invalid notes/scan/component/lot/version leaves all writes unchanged; notes-only completion records one step without extra consumption; stale/lost responses retain entered values for review. Update the guide and living test plans at the focused verification checkpoint.

## September 28 combined physical-kit packing

The owner approved combining tube registration and component recording into one Actions → Record packed contents command for physical kits with an assembly workflow. The bounded dialog contains new permanent tube scans, the derived unrecorded tube quantity, remaining other quantities and source lots. Barcode normalization, syntax, uniqueness, prior registration, capacity, source-lot availability and exact BoM limits are enforced by the API. Partial packing is allowed; completion still requires every exact BoM quantity and a separately rescanned full physical roster. Register tubes remains the current flow for physical kits without an assembly workflow.

Engineering decision: one Portal-owned packed-contents request includes the displayed assembly and stock-kit versions. Under assembly, stock-kit, barcode and source-lot locks, it stages barcode registrations, component use and source consumption, then saves and commits once. The server requires tube use to equal all scanned tubes not previously recorded; it rejects barcode-only writes through this command. Both existing authorization requirements remain: the Lab role for component use and the platform capability for newly registering tubes. No schema, migration, dependency, authentication or external application contract changes. Failure preserves form entries while both kit and inventory refresh; retained scans remain visible for review even if the refreshed roster is full. There is no automatic resubmission.

Verification: the backend solution build passes with zero warnings/errors, frontend TypeScript and full ESLint pass, final dialog edits pass scoped ESLint, and the 56-guide documentation corpus passes consistency checking. The restarted local API reports healthy. Signed-in Chrome shows one Record packed contents action without a separate Register tubes action, and the shared dialog contains barcode input, scan-count feedback, read-only tube quantity, other quantities, source-lot areas and amber warnings. Live barcode entry and responsive/keyboard checks were interrupted by an open 1Password extension panel blocking automation; these checks and successful/failing connected saves remain unverified. At the subsequent requested edge-case checkpoint, 14 frontend and 12 backend regression cases pass; see the review below. No kit/inventory data was saved during review; no migration is required.
### Requested edge-case review — September 28

The owner requested focused regression checks. Added and executed combined-dialog/component-hook and isolated PostgreSQL controller cases covering malformed/duplicate/excess/conflicting scans, scan-derived remaining quantities, existing unrecorded tubes, partial completion, current versions, lost-response recovery, repeat submits, inventory QC/date/hold/unit/stock failures, atomic stock balance/history/version rollback, same-tube-lot enforcement, concurrent kit saves and shared-lot consumption. Complete assembly still requires exact contents, ordered step evidence and a separately verified full tube roster; packing after completion is rejected. The configured local database was not used for test writes, and the temporary PostgreSQL database was dropped after every run.

The review found one frontend eligibility mismatch: earlier tube use with no source lot allowed the picker to offer newly introduced lots although the existing API prohibits changing that tube source. The picker now evaluates all previous uses and displays a review warning; a failing regression reproduced the mismatch before the fix. Automated evidence lives in `artifacts/kit-packing-20260928/edge-frontend-tests.log` and `edge-backend-tests.log`. No persisted model, migration, authentication, deployment or Git changes. The earlier combined-dialog manual barcode-entry/responsive/focus blocker remains; tests do not claim that browser review or physical scanner qualification.

## September 28 physical kit detail presentation

Earlier component-recording scope (superseded by combined packing above): the owner approved replacing each component's Record use button with one Actions → Record components command. Required contents becomes a read-only summary. One bounded dialog lists remaining products, quantities and source lots together; tube quantities come from registered scans, zero leaves a component for later, and prior recorded quantities are never submitted again. The Portal-owned component-use request becomes a batch, validated and saved in one transaction against the displayed assembly version, with source lots locked in a stable order. A rejected batch saves neither component records nor inventory consumption. Existing authorization, QC/expiry/unit, single tube lot, scanned count, approved quantities and completion rules remain authoritative. No persisted-model change, migration, new dependency, authentication change or external application contract is required.

The owner requested a quieter physical kit detail page and one clearly identified action menu. The title uses the kit specification name, with inventory status beside it and the permanent kit number below. One header Actions dropdown combines Lab-step recording, tube registration/correction/verification, assembly completion/stopping, barcode printing, withdrawal and dispatch when available. Its chevron follows expanded state; keyboard navigation, Escape and focus restoration use the existing Radix menu.

Preparation is the default for kits at Phaeno and shows recorded Lab step/component counts, ordered instructions, a read-only required-contents summary and the tube roster. Details & history groups product/expiration, location/assignment and dispatch facts and is the default for dispatched kits. Empty dispatch history uses one sentence instead of repeated Not dispatched rows. Step notes move into a bounded modal; assembly completion gains a review confirmation. Existing permission, source-lot, each-unit, concurrency, readiness and immutable evidence checks remain in the API. No database model change or migration is needed. Review keyboard/focus, desktop/mobile reflow, dialogs and incomplete/complete/stopped states; automated suites remain request-only.

Verification: frontend TypeScript and full ESLint pass; the API build passes with zero warnings/errors and the restarted local API reports healthy. The 56-guide documentation corpus passes consistency checking. Signed-in local Chrome confirms the single rotating-chevron menu, arrow/Escape behavior and dialog focus return, primary/secondary tab contents, required notes/reason, incomplete completion gate, and component inventory loading. The page, menu and dialogs fit at 390 × 844 CSS pixels without page overflow; desktop layout was also reviewed. Review opened and cancelled dialogs only, with no kit or stock writes. Existing component/E2E title and expiration assertions were updated but their suites were not run. [Desktop screenshot](../../artifacts/kit-detail-cleanup-20260928/desktop-preparation.png).

Component recording follow-up verification: the backend solution build passes with zero warnings/errors, including compilation of the new PostgreSQL batch rollback/stale-retry reference case. Frontend TypeScript and full ESLint pass; the final dialog edits pass scoped ESLint. The 56-guide help corpus passes consistency checking. Signed-in local Chrome confirms the single Record components action, read-only required contents, remaining quantity defaults, scan-derived read-only tube quantity, inventory loading guard, all-zero/range validation and error clearing after correction. Missing tracked lots and unmet tube-scan prerequisites use amber warnings; each component has aligned quantity/source-lot fields and a separate recorded-count line. At 390 × 844 CSS pixels the dialog has no horizontal overflow, scrolls its body, and keeps its footer visible. Escape closes the pristine dialog and returns focus to Actions. This review made no kit or inventory writes. Tracked-lot selection, successful batch persistence, failure/concurrency recovery and the authored automated cases remain pending at the next requested connected test checkpoint. No migration is required. [Earlier desktop dialog](../../artifacts/kit-components-20260928/desktop-dialog.png) · [Phone dialog](../../artifacts/kit-components-20260928/mobile-dialog.png).
## Status and decision — September 9, 2026

Product direction is implemented and deployed to production on matching API/UI
source `11699745825e17f6f16d67be1a678e78ea3b3578`. This plan supersedes the September
8 requirement that Customer containers must have been ordered and fulfilled for
the same Lab Job. The separately approved production migration
`20260909153238_AddTransportationKitLocationReservations` was applied by successful
API workflow `34431957400`; UI deployment `dpl_DzwKyZ5yiw3Zb69B3nBzeF8ZXWGP` was
promoted from the same revision. Backup/restore, migration, health and bounded
runtime-review evidence is in the
[release record](PORTAL-SHIPPING-RELEASE-2026-09-08.md#september-9-location-inventory-and-shipping-insert-release--completed).
The local manual walkthrough remains paused at 18/18 with its issued insert;
physical and remaining manual acceptance are separate from deployment.

The owner identified the failure in that model: cancelling the originating Job
must not strand physical containers already delivered to the Customer. Phaeno
supplies containers to a Customer/Department delivery location. A physical
container becomes assigned to a Job and shipment during Customer preparation,
using its permanent container barcode.

This continues the [shipping plan](SAMPLE-SHIPPING-AND-INTAKE-PLAN.md). The
[local run](../testing/runs/2026-09-08-hs5y7db7-local-walkthrough.md) is retained
before container assignment and successful tube scanning. Its one acknowledged
TRANS-20 remains unused and unbound for the next guided preparation step.

## Product rules

- Every physical container has one permanent, unique barcode. Reuse the existing
  unique kit number as that identity; show and print both readable text and its
  barcode. Container type, SKU, capacity and registered tube identities remain
  attached to that physical container.
- Fulfillment identifies the Customer, Department and delivery location. The kit
  request may retain an originating Job as ordering and commercial history; that
  reference does not limit which eligible Job can later use unused stock.
- Dispatch adds **On the way** inventory. Customer acknowledgement changes only
  the acknowledged containers to **Available**. A carrier timestamp alone does
  not establish receipt. Included kit and outbound-delivery pricing is unchanged.
- Available stock is received, compatible stock at the selected Customer location,
  with no current reservation or use. Another Customer, Department or location's
  stock must not become selectable through an identifier or URL change. Inventory
  transfers between locations are outside this change.
- The Customer scans each physical container's barcode during preparation. Review
  its size, capacity and tube allocation, then confirm the selected containers.
  Confirmation atomically reserves those exact containers to the Job's shipments.
  Scanning a barcode into an unsaved form does not silently consume inventory.
- Display **Assigned to [Job]** for a reserved container. Tube scanning accepts
  only its registered tubes. The first successful tube scan changes it to **In
  use** and preserves the existing permanent-tube lineage and reset lock.
- Before any tube scan, resetting a configuration releases its reservations to
  location inventory and preserves the prior configuration as history. After
  tube scanning starts, normal reset/reassignment remains prohibited. Cancelling
  a Job must not silently make a scanned/used container available for another Job.
- Cancelling a Job leaves delivered, unused, unassigned containers available.
  Unscanned reservations must be released through the cancellation/reset rules.
  This is reuse of unused supplies, not a policy for reusing containers or tubes
  already used for samples.
- Kit receipt and location inventory remain accessible even if the originating
  Job or its former shipment is cancelled. Keep fulfillment history, tracking,
  acknowledgement and subsequent assignment as separate facts.
- Recommendations use compatible available stock. Preserve alternative sizes and
  quantities, partial preparation and Smart Add. Avoid redundant containers;
  unavoidable spare slots are valid. For example, three tubes with an available
  5-tube kit should not suggest an available 10 or 20. A new catalog revision must
  not invalidate physical stock solely because its revision ID changed; actual
  compatibility withdrawals still require a clear block and recovery path.

## One outstanding product decision

If the originating Lab Job is cancelled before kit dispatch, should its unshipped
kit request also be cancelled? Recommendation: cancel the unshipped quantities;
preserve any dispatched quantities, their receipt workflow and available stock.
The owner has been asked. Do not implement this recommendation as an approved
cancellation rule until the answer arrives. Partial dispatch must be considered
explicitly; existing all-or-nothing request cancellation is insufficient for a
rule that cancels only an unshipped remainder.

## Customer and Phaeno workflow

1. **Phaeno stock:** prepare a standard container, register its complete permanent
   tube roster and print its container barcode. Stock is not assigned to a Job.
2. **Need and ordering:** show received and in-transit stock for the selected
   location. Offer the included-cost, confirmed kit order for shortages. Keep a
   simple recommended order, with an optional compatible-size adjustment rather
   than forcing all Customers through a configuration form.
3. **Fulfillment:** notify the responsible staff, fulfill the request to its
   frozen delivery address and record tracking. All dispatch entry points must
   update the same request and inventory facts exactly once. Do not require a
   destination sample-shipment ID to establish ownership of the supplies.
4. **Location receipt:** from the Customer location or contextual Job panel,
   acknowledge arrived containers. This action remains available after the
   originating Job is cancelled. Partial deliveries leave the rest On the way.
5. **Preparation:** choose the departure location, review recommended sizes, scan
   each container barcode and review tube allocation. Confirm exact containers
   atomically. Show the barcode beside every selected container.
6. **Tube matching:** work down the sample list and scan registered tubes belonging
   to the selected container. Show saved barcode identities, progress and restart
   recovery. The first successful tube scan locks reset.
7. **Manifest and return:** retain order, shipment, sample and tube barcodes and
   include the physical container barcode. Preserve split-sample references and
   separate shipment/receipt progress for each container.

## Agreed recovery presentation — September 9

Retain the ability to release and revise unused container reservations before
the first saved tube scan. The owner accepted presenting this as a secondary
**Change containers** action, with explicit whole-Job scope and affected
container/tube counts. Preserve finalized samples, delivery/receipt history,
retired configurations and the existing post-scan lock. The interface currently
still says **Reset container configuration**; the label refinement is planned,
not implemented by this manual testing checkpoint.

## Implementation work

### Inventory and persistence

- Remove originating-Job filtering from available location inventory and scan
  eligibility. Preserve the request association as provenance, not assignment.
- Persist a departure delivery-location ID on Customer sample shipments; do not
  infer it from whichever kit request happens to be newest.
- Separate reversible reservation from existing irreversible tube adoption:
  nullable reserved shipment, reservation time and actor on physical stock;
  retain the existing bound-shipment identity for tube use. Use uniqueness,
  concurrency and transactions to prevent two Jobs claiming the same container.
- Expose tenant-scoped location inventory and request/receipt reads independently
  of an originating Job. Return On the way, Available, Assigned and In use states,
  readable/barcode identity and relevant assignment/provenance separately.
- Confirm exact container IDs/versions with packing; validate ownership, receipt,
  compatibility, location, quantity and capacity on the server. A losing concurrent
  claim must retain the Customer draft and explain which container changed.
- Add reviewed EF migrations, update the complete ERD and verify/apply locally
  during authorized implementation. Shared/production migrations require separate
  explicit approval. Production schema changes were excluded from the original
  local implementation checkpoint; the separately approved application is now
  recorded in the release evidence above.

### Customer and staff screens

- Add reusable inventory and receipt access to the Customer delivery-location
  detail. Reuse it contextually from Job preparation.
- Update supply panels, container configuration, barcode assignment, scanner and
  reset behavior to use received location inventory. Preserve Member read-only
  inventory/tube history while restricting mutations to authorized administrators.
- Keep open forms mounted when inventory refresh fails; disable affected writes
  with feedback instead of discarding drafts through a parent unmount.
- Separate retired configurations from active shipment links. Explain a reset
  as a replaced configuration and offer the current preparation entry point;
  do not present a historical zero-tube shipment as current work.
- Update Phaeno list/detail/dispatch views to distinguish requested-for history,
  delivery location, receipt and actual Customer assignment. Replace the current
  Preparing/Fulfilled/Bound-only presentation with the useful inventory states.
- Review all Customer/Phaeno guides after implementation; preserve audience and
  locale boundaries. Existing user help must describe deployed/current behavior,
  with proposed behavior kept in this plan until implemented.

### Existing records and rollout

No direct data patch is needed for the current walkthrough. The acknowledged,
unbound TRANS-20 can qualify as location stock using its existing receipt and
location facts, while retaining original dispatch and request history. Existing
bound/scanned shipments keep their lineage. Records without verified location or
receipt need an explicit recovery path, not assumed availability. Scope any data
repair separately and preserve the audit trail.

## Acceptance before resuming the full walkthrough

- Kits requested for Job A can be received after A is cancelled and assigned to
  eligible Job B at the same location, without a second order or dispatch.
- Confirmed receipt and inventory counts agree between POMS and Portal after
  refresh; duplicate/retried receipt or assignment does not increment twice.
- In-transit, wrong-Customer/Department/location, incompatible and already-used
  containers cannot be claimed. Compatible older stock revisions remain usable.
- Two simultaneous claims yield one reservation. Failure preserves the other
  draft and explains the unavailable barcode.
- Reset before the first tube scan restores availability; after a successful
  tube scan, reset/reassignment remains blocked, including after scan correction.
- The wrong container's tube cannot match. A correct scan persists the selected
  container/Job/shipment identity, printable barcodes and exact sample lineage.
- Partial receipt and multiple containers preserve available, assigned and
  unallocated counts; unused capacity is not presented as missing samples.
- Members retain read-only history; retired configurations do not look like
  cancelled Jobs; an inventory refresh failure does not discard an open form.

Track focused backend, frontend and manual/E2E results in their living plans.
Production release checks, synthetic acceptance and physical scanner/material
qualification remain separate evidence.

## Local implementation and verification checkpoint — September 9 (historical)

Implemented location-owned inventory and receipt; departure-location selection;
atomic physical-container reservations; first-tube binding; reset and effective
cancellation release; compatible historical-stock handling; independent request
history; Customer/Member and Phaeno screen updates; and frozen/printable container
barcodes. Origin request, delivery and receipt records are preserved. Phaeno
location pages link to staff inventory and do not offer Customer receipt actions.

- Backend build: zero warnings/errors; isolated PostgreSQL checkpoint **76/76**.
- Customer component checkpoint: **108/108**; final staff-location correction
  passed its two affected suites **13/13** (overlapping counts).
- Staff component checkpoint: **47 passed**; packet/barcode checkpoint **8/8**.
- Full frontend TypeScript and scoped lint: passed.
- Customer actual-component browser suite: **8/8** desktop/mobile; staff dialog
  review: **6/6** desktop/mobile/dark/short-height. Barcode PDF: one page.
- Help corpus regenerated and checked: **56 guides**, version `e1df452ece0e`.

Migration `20260909153238_AddTransportationKitLocationReservations` is additive:
four nullable fields, four indexes and three restrictive foreign keys. The ERD
contains 172 tables, 2,592 fields and 395 foreign keys after regeneration. Local
application and the preserved walkthrough state are recorded in the run handoff.
No shared/production migration, data patch, Git operation or deployment is part
of this implementation checkpoint.

The additive migration is applied to verified local `localhost/phaeno_ops`.
The new API runs from `artifacts/location-inventory-runtime` with health HTTP 200.
All six saved-fixture before/after hashes match; evidence is in
`artifacts/location-inventory-tests/local-preservation.json`. Connected Portal
location inventory shows Available 1 / On the way 0 / Assigned 0 / In use 0.
The current pool recommends the existing TRANS-20 for 18 tubes with two spare
slots. Connected POMS independently shows Available, Main laboratory, Not assigned,
the original request/dispatch/receipt and all 20 registered tube identities.
