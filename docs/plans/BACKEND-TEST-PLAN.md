# Backend Test Plan

### Accession before storage and bulk acceptance (2026-09-11)

Added domain coverage in `LabTubeIntakeTests` and persisted shipment coverage in `LabTubeAccessionPostgresTests` (partial shipping fixture): rejected expected tube retains identity/evidence with null location/quantity and Rejected availability; accepted/held material needs real storage; correction needs retained material. Bulk requires inspection, frozen expected identities and current work version; includes no recorded exceptions, rejects invalid storage atomically, and replays without duplicate events. Existing per-tube and receipt identity coverage remains. Suites are authored, not run.

Manual/concurrent gates: wrong role/tenant, voided or unreceived shipment, duplicate/wrong tube, stale decision and two simultaneous batches; consumed/started source and cancelled work; rollback following a mid-save failure; used-tube correction denied; no overwriting storage; no automatic reserve start. These persisted acceptance gates remain Not run.


## Implemented specimen-attempt guards — September 11, 2026

Added LabSpecimenAttemptTests covering barcode mismatch without mutation, same-attempt QC repeat versus explicit operational hold, failure immutability, required/foreign stage skip rejection and processing failure preserving intake acceptance. Domain and controller implementation also add versioned authorization, transactional command receipts, filtered uniqueness, lineage and downstream gates. Tests are authored/compiled, not run. PostgreSQL concurrency, rollback/replay, source/start races, legacy adoption and full lifecycle acceptance are still required by [LAB-09](../testing/06-laboratory.md#lab-09---specimen-tube-attempts-and-reserve-fallback). Earlier proposed-status notes are superseded by this implementation checkpoint.

## Execution tube prerequisite - September 11, 2026

Execution detail now projects TubeAcceptanceRequired for Planned specimen executions through the same predicate enforced by Start. Verify missing acceptance, accepted but unavailable input, foreign-specimen tubes, accepted available input, job-level execution, and started/completed history; a stale ready page must still be rejected by Start if eligibility changed. Existing behavior is preserved; automated coverage deferred and not run for this navigation/prerequisite slice.

## Tube intake reason coverage - September 11, 2026

Added LabTubeIntakeTests for one accepted tube among held/rejected reserves, stable first acceptance time, invalid reason/Other validation without mutation, resolution notes, unreviewed tubes and cross-specimen isolation. Adapted existing acceptance fixtures to tube-derived intake. API acceptance must cover automatic accession, reason catalog, deprecated specimen-write rejection, role/concurrency denial, start/review races and event/turnaround projection. Tests added/updated but not run.

## Tube-attempt enforcement coverage - September 11, 2026

The [tube-attempt plan acceptance matrix](SPECIMEN-TUBE-ATTEMPT-PLAN.md#acceptance-matrix) requires coverage for policy snapshots, atomic tube reservation, competing starts, retries, explicit failure, same-attempt repeats, cross-attempt stage isolation, eligibility, retirement/cancellation, permissions and legacy adoption. The domain sources listed above are now authored and compiled. Automated execution and PostgreSQL lifecycle/concurrency acceptance remain Not run.

## Promotion actor policy - September 11, 2026

Added LabWorkflowPromotionTests and revised protocol activation regressions: author or reviewer may promote independently approved versions; self-approval captured in audit-only mode cannot authorize activation/promotion; Draft and withdrawn approvals remain blocked; promotion actor/time and original approval are preserved. Automated tests not run. API acceptance still needs role denial, mixed independently/self-approved stages (including Active), stale workflow version, and atomic rejection without retiring previous production versions.

## Revised retirement and invalidation coverage — September 11, 2026

New required coverage is specified in [LAB-07](../testing/06-laboratory.md#lab-07--protocol-retirement-workflow-invalidation-and-revalidation). It supersedes the prior rule blocking all workflow/unfinished-job references: active processing blocks, queued work requires explicit current-impact confirmation, and authorized retirement atomically invalidates affected workflows and creates clean Invalid recovery revisions. Cover immutable historical versions, remaining-stage preservation, empty-stage rejection, revalidation with/without edits, independent approval, production gating, queued-pin retention, role checks, stale impact tokens, duplicate retries, concurrent execution starts/assignments/workflow transitions/job authorization, and audit atomicity. Add domain regressions for Invalid candidate approval and invalidated historical immutability. These new scenarios are not yet marked passed; earlier dependency-blocking evidence is historical only. Automated suite execution has not been requested.

## Protocol retirement — September 11, 2026

Added LabProtocolRetirementTests for retained identity/version, reason and actor validation without partial mutation, repeat retirement rejection, and rejection of edits/new versions/use after retirement. Built API and test project; did not run automated tests. Retirement enforces ProtocolAdministrator/version checks, previous approval, no open draft, no Draft/Approved/Production workflow references and no unfinished dependent jobs. New workflow/job/execution references participate in identity concurrency. Live local UI covered Draft workflow blocker and successful retirement after discarding it, with persisted reason/time/actor/version corroborated. Cross-role denial, Approved/Production dependency branches, unfinished-job references, provider rejection and concurrent requests still need executable acceptance coverage.

## Equipment retirement — September 11, 2026

Added LabEquipmentRetirementTests for required/limited reasons, actor requirement, metadata retention, duplicate retirement rejection, calibration/identity retention, and refusal of new usage even when backdated after retirement. API retirement requires Supervisor/OperationsAdministrator and expected equipment version. Recording use now updates the equipment concurrency version in the same SaveChanges transaction to conflict with concurrent retirement. Test project and API build passed; automated tests were not run. Local live verification covered successful retirement and persisted audit metadata; role-denial and concurrent-request scenarios remain unrun.

## Customer laboratory stages — September 10, 2026

**Local checkpoint: 4/4 cases passed; 0 skipped.** See the [stage verification record](../testing/runs/2026-09-10-customer-laboratory-stages.md) and [TRX evidence](../../artifacts/customer-progress-test-results/customer-progress.trx). This is a focused run, not a full backend-suite result.

| Coverage | Evidence and result |
| --- | --- |
| Preparation, sequencing, assembly, review and release | `LabCustomerProgressTests.PreparedAndAwaitingProviderRemainPreparationUntilSequencingIsRecorded` passed. A DataAvailable status alone and withdrawn output do not establish release. |
| Mixed sample stages and partial release | `MixedSamplesAndPartialReleaseDoNotAdvanceTheWholeJob` passed. Outstanding receipt/earlier work prevents whole-Job Results Available; all released samples permit it. |
| Job-wide versus individual progress; holds | `JobWideActivityDoesNotFabricateSampleStageCounts` passed. Global review preserves attributed sample counts; holds remain visible. |
| Persisted workflow and scope | `LabOperationsCommercialHandoffPostgresTests.AuthorizedOrderCompletesTheDatabaseBackedLabOperatorJourney` passed. Started preparation, provider Shipped/ReceivedByProvider versus Sequencing/Complete, organization/order isolation, and scientific readiness without released results are verified against the local database. |

Remaining coverage: a database fixture with multiple libraries for one sample (only some sequencing), populated Customer and entitled Partner list/detail response checks across Department/member boundaries, and actual partial output release through the complete customer journey. These are **Not run** for this feature; pure mapping tests do not establish persisted release or API authorization acceptance. No test or data migration was executed while updating this plan.

## Intake progress synchronization — September 10, 2026

`LabIntakeProgressTests` covers receipt/accession replay, immutable identity, preserved timestamps, holds and later/terminal statuses. The registered-tube reference journey checks Work progress, projection-version replay, completed accession facts and unchanged scientific acceptance/turnaround. The complete Lab operator journey checks Commercial Job/sample propagation. Existing projection tests cover monotonic replay. Results are recorded in [the intake correction run record](../testing/runs/2026-09-10-intake-progress-correction.md).

**Prior local checkpoint: 3 domain cases and 4 focused PostgreSQL cases passed.** The operator journey above overlaps this checkpoint; do not add these historical totals as unique coverage. The database cases are the registered-tube journey, complete operator journey, replay-safe monotonic projection delivery, and whole-kit/partial-fill case. The corrected fixture expectation for an outstanding second shipment is retained in the run record. Failure-injection coverage for atomic rollback/retry across the projection and Commercial update remains **Not run**. Container arrival advances Lab Work to Received and the Commercial lifecycle to InProgress; the newer customer-facing display says Received. No scientific acceptance, target or tube/storage backfill is implied.

## Location inventory correction — September 9, 2026

The [location-inventory plan](TRANSPORTATION-KIT-LOCATION-INVENTORY-PLAN.md)
supersedes the same-Job stock restriction below. The final isolated PostgreSQL
checkpoint passed **76/76** shipping, kit, location, packing, reset and cancellation
cases; the solution build passed with zero warnings/errors. Six new cases in
`TransportationKitLocationInventoryPostgresTests.cs` establish:

- Receipt after origin Job cancellation and exact reservation for another Job at
  the same Customer/Department/location, with no repeated receipt or delivery.
- Concurrent Jobs produce exactly one container reservation without losing tubes.
- Pre-scan reset releases the container; a wrong-container tube fails; first
  successful scan locks reset and freezes the physical barcode into the packet.
- Receipt, tenant, Department, location and Member write restrictions are enforced.
- Ordinary catalog supersession retains compatible physical stock, while explicit
  withdrawal blocks it.
- Pending and declined cancellation retain reservations; approved cancellation
  releases only unused reservations and preserves fulfillment history. Scanned
  containers remain bound. Existing native Lab approval/veto tests also pass.

Existing partial-receipt, dispatch and scan tests now use exact reservations.
The first 73-case checkpoint exposed a dispatch-replay comparison between .NET
100-nanosecond ticks and PostgreSQL microseconds. Matching now compares at the
persisted precision; the regression deliberately supplies a finer-grained time.
The final 76-case run passed, its scratch database was removed, and zero synthetic
notification rows remained. Counts overlap earlier checkpoints and are not additive.

Migration `20260909153238_AddTransportationKitLocationReservations` adds four
nullable fields, four indexes and three restrictive foreign keys; no record
backfill or repair is included. The complete ERD is updated. Shared/production
application is not part of this local implementation. Automatic cancellation of
unshipped requests remains a pending product decision.

Evidence: `artifacts/location-inventory-tests/location-inventory.trx` and
`latest-run.log`. Applied the migration only to verified local
`localhost/phaeno_ops`; API restarted from `artifacts/location-inventory-runtime`
with health HTTP 200. `local-preservation.json` confirms all six before/after
state hashes match: the saved Job still has nine samples and 18 unmatched tubes;
its received kit is version 5, unreserved and unbound. No walkthrough data repair
or consumption occurred.

## Customer Job kit requirement and dispatch synchronization — September 8, 2026

The final isolated checkpoint passed **68/68** shipping, kit, location, packing,
reset and legacy-boundary cases. It includes six new cases in
[TransportationKitOrderRequiredPostgresTests.cs](../../backend/test/TransportationKitOrderRequiredPostgresTests.cs).
The solution build completed with zero warnings/errors. Evidence:
`artifacts/kit-order-required-tests/kit-order-required.trx` and `latest-run.log`.
The scratch database was removed and zero remaining synthetic notification rows
were verified. These totals overlap earlier checkpoints; they are not additive.
An initial run passed 65/66 and exposed an incompatible quantity unit in the new
historical-shipment fixture; the fixture was corrected before the final run.

For accepted Customer Lab Jobs, no request or only cancelled requests must block
unbound container preparation, first tube scanning, packet confirmation and
shipping. Ordering recommendations remain available before an order exists.
Only acknowledged kits ordered for the same Job and delivery location provide
preparation capacity. Existing bound shipments and Trial/Partner policies retain
their prior behavior. New direct shipment-bound legacy kit creation must direct
staff to the Customer Job's kit order.

Both staff dispatch entry points must update the stock kit, matching request
line, request status and one customer dispatch notice in the same transaction.
An already-recorded, unused dispatch may be linked through the same dispatch
endpoint only with its saved Job/carrier/tracking/time unchanged. An identical
retry must not repeat the status event or notice. The shared mutation lock order
is Job, then request, then stock kit; concurrent entry points must not overfill a
request or partly dispatch another kit.

| ID | Trigger and required invariant | Exact test method in TransportationKitOrderRequiredPostgresTests.cs | Evidence |
| --- | --- | --- | --- |
| KIT-B20 | Open or mutate an unbound physical container before ordering, then after cancelling its only request. Reject preparation/scanning/packet/shipping without changing shipment versions, slots or histories; retain a complete order recommendation and enabled eligible ordering. | `TransportationKitMissingOrCancelledOrderBlocksUnboundPreparationWithoutBlockingOrdering` | Passed in the 68-case isolated checkpoint |
| KIT-B21 | Try direct dispatch without an order or new legacy return-kit creation, then scan old unlinked stock despite having another received ordered kit. Reject bypasses; bind the correctly ordered and received kit successfully. | `TransportationKitReceivedOrderCannotBeBypassedWithUnorderedStockOrLegacyDispatch` | Passed in the 68-case isolated checkpoint |
| KIT-B22 | Continue an already-bound historical Customer shipment with no kit request. Retain tube matching, packet confirmation and recorded return shipping. | `TransportationKitOrderRulePreservesAlreadyBoundHistoricalCustomerShipment` | Passed in the 68-case isolated checkpoint |
| KIT-B23 | Evaluate the order requirement for Partner, Trial and unaccepted legacy contexts. Keep the new Customer rule out of those policies. | `TransportationKitOrderRuleRetainsPartnerTrialAndUnacceptedLegacyPreparationPolicies` | Passed in the 68-case isolated checkpoint; existing shared-shipping journeys also rerun |
| KIT-B24 | Race kit-detail dispatch against request fulfillment for the same kit, then replay and attempt an extra kit. Reconcile one line/status/event/notice, accept an unchanged retry and leave excess stock undispatched. | `TransportationKitDirectAndRequestDispatchSynchronizeOnceUnderConcurrentRequests` | Passed in the 68-case isolated checkpoint |
| KIT-B25 | Reconcile an existing direct dispatch with its request. Reject altered saved facts; preserve the original dispatch and every permanent barcode, add the request/location links once, and leave customer receipt unset. | `TransportationKitRecordedDispatchReconcilesWithoutRewritingFactsOrDuplicatingNotices` | Passed in the 68-case isolated checkpoint |

The walkthrough kit's pre-reconciliation dispatch/barcode fingerprints were
captured read-only in `artifacts/kit-order-required-tests/local-kit-before-reconciliation.json`.
This checkpoint did not mutate that kit, reload the local API or send a provider
notification. Record connected reconciliation, delivery acknowledgement and
physical scanning separately in the [E2E test plan](E2E-TEST-PLAN.md) and the
[local walkthrough record](../testing/runs/2026-09-08-hs5y7db7-local-walkthrough.md).

## SHP-03-001 fulfillment routing failure — September 8, 2026

Locally corrected and verified; connected Customer retry saved one request. The
failed unscoped Phaeno lookup now resolves the exact active organization named by
the existing bootstrap configuration, with a controlled conflict for unavailable
or ambiguous routing. Existing administrator-recipient routing is retained.
All **7 focused TransportationKit PostgreSQL tests passed**, including multiple
active Phaeno organizations with concurrent/replayed request creation and only
the configured organization's fake recipient, plus inactive/missing/non-Phaeno
routing rollback. Build had zero warnings/errors. Evidence:
`artifacts/kit-order-routing-tests/kit-order-routing.trx`. The isolated database
was removed and zero remaining synthetic notifications verified. Local API was
reloaded and health returned 200. No live order or provider send was performed
by the isolated checks. Later user confirmation saved request D20018AA and one
logical fulfillment notice recorded Sent, corroborated read-only. Inbox and
physical fulfillment are not yet verified.
See the [incident run record](../testing/runs/2026-09-08-hs5y7db7-local-walkthrough.md).

## Reset container configuration before scanning — September 8, 2026

September 9 explanation correction: an active **ReadyToShip** shipment was
incorrectly described as an inactive container selection. The reset service now
reserves that reason for cancelled/unconfigured, preparation-pool and empty
records, then identifies any issued packet in the shipment family before the
existing scan/history and progress blockers. The packet reason reads
**Containers cannot be changed because a shipping insert has already been issued
for this job.** Eligibility and the 409 rejection remain intact; no schema or
contract-shape change is involved.

The existing PostgreSQL
`ContainerResetBlocksScanningClearedMatchesCancelledHistoryAndShipmentProgress`
case now includes ReadyToShip and Delivered alongside Shipped and Received,
checks the current-record blocked reason and verifies rejection. The retired
identity case also checks that a truly retired selection retains the inactive
reason. These additions have not been executed and are separate from the older
passing checkpoints below.

The active Visual Studio API still runs the older source, so the corrected
backend explanation is not yet verified at runtime. A narrow frontend fallback
provides the issued-insert explanation when a current insert exists and the
server already disallows reset; it does not change backend eligibility or the
409 response. Runtime activation and the new backend assertions remain pending.

The final backend Release solution build passed with zero warnings and zero
errors in 41.65 seconds. No automated suite was run; this build result does not
execute the added reset-reason assertions or activate the running API.

The focused checkpoint passed **61/61**, including **eight reset cases** in
addition to the previous 53 shipping/kit/location cases. The order-wide packing
reset checks target the new eligibility/read and versioned confirmation/write
paths: tenant and Department isolation; organization/Department administrators
versus members; exact family snapshot versions; whole-plan retirement to
cancelled shipment history; and restoration of the correct selection pools.
Assert preserved specimen/tube IDs, global ordinals, counts, destination/handling
separation, quotes, kit requests and physical inventory.

Exercise every family-wide blocker independently: current scan, immutable past
scan with cleared fields, ReturnKit/physical-kit binding, packet, dispatch and
receipt. Race reset against scanning, packing and another reset; stale or changed
families must produce a conflict without partial moves or duplicate tube slots.
Dialog cancellation/no-write behavior is covered in frontend checks. No migration
was planned; model consistency remains part of implementation verification.
The 61-case checkpoint is distinct from older passing totals, and this
documentation update runs no tests itself.
Connected acceptance is the [SHP-09 reset variant](../testing/11-transportation-kits.md),
currently Not run.

## Customer transportation-kit ordering and receipt — September 8, 2026

The focused checkpoint passed **53/53** cases against a newly migrated,
isolated PostgreSQL database. This includes the existing 44 shipping, packing,
catalog and Lab handoff cases, six new transportation-kit cases and three new
Customer delivery-location cases. The solution build completed without warnings
or errors. The scratch database was removed and synthetic notification rows
were verified empty; notification delivery used a fake sender.

New coverage includes concurrent/duplicate request suppression, frozen delivery
and container facts, one Phaeno fulfillment notice, partial dispatch and receipt,
receipt-gated tube scanning and packing, residual capacity after another
container is allocated, delivery-location isolation, cancellation without
operational changes, and all 261 records in the staff queue with status filters.
Delivery-location coverage checks Department ownership, tenant isolation,
administrator/member permissions, default replacement, optimistic concurrency,
soft deactivation and validation without changing a saved default. A demoted
administrator must receive explicit Department membership before member reads
are permitted; missing membership remains a 404.

Migration `20260909013740_AddCustomerTransportationKitOrdering` was applied only
to the configured localhost `phaeno_ops` database. The model has no pending
changes. Before/after evidence confirms identical HS5Y7DB7 order state, nine
sample identities and values, 18 tubes, and shipment identities and versions.
Evidence: `artifacts/transportation-kit-ordering-tests/transportation-kit-ordering.trx`,
`latest-run.log`, `local-migration.log` and `local-job-{before,after}.json`.

### Reusable transportation-kit scenarios

The IDs below are stable regression references. **H53** means the named test
passed in the historical September 8, 2026 53-case checkpoint above; this
documentation update did not run tests or produce new acceptance evidence.
**Planned** means the stated scenario has no dedicated passing case identified
here. A passing API test or fake notification sender does not establish mailbox,
physical inventory, scanner, carrier or customer-delivery acceptance. Follow
the [E2E test plan](E2E-TEST-PLAN.md) for the observable Customer/Phaeno walkthrough
and record its evidence separately.

Reference keys below name exact source files. Methods in TK, LOC, PACK and SHIP
belong to the shared `SampleShippingPostgresTests` partial class.

| Key | Test source |
| --- | --- |
| TK | [TransportationKitOrderingPostgresTests.cs](../../backend/test/TransportationKitOrderingPostgresTests.cs) |
| LOC | [CustomerDeliveryLocationPostgresTests.cs](../../backend/test/CustomerDeliveryLocationPostgresTests.cs) |
| PACK | [SampleShippingPackingPostgresTests.cs](../../backend/test/SampleShippingPackingPostgresTests.cs) |
| SHIP | [SampleShippingPostgresTests.cs](../../backend/test/SampleShippingPostgresTests.cs) |
| CAT | [SampleShippingContainerTests.cs](../../backend/test/SampleShippingContainerTests.cs) |
| DOMAIN | [SampleShippingDomainTests.cs](../../backend/test/SampleShippingDomainTests.cs) |
| LEGACY | [LabOwnedSampleOperationPostgresTests.cs](../../backend/test/LabOwnedSampleOperationPostgresTests.cs), in `LabOperationsCommercialHandoffPostgresTests` |

| ID | Trigger and required invariant | Existing exact test reference | Evidence |
| --- | --- | --- | --- |
| KIT-B01 | Read/order as Customer administrator, ordinary Department member, user without Department access, foreign Customer or Phaeno staff. Retain member reads, deny unauthorized writes, and hide foreign records; cancellation before dispatch permits one replacement request. | TK.`TransportationKitOrderAuthorizationCancellationAndWrongKitLeaveRecordsIntact`; LOC.`CustomerDeliveryLocationsRejectOtherTenantAndMemberWritesWhilePhaenoCanManage`; LOC.`CustomerDeliveryLocationsRespectDepartmentOwnershipAndRejectInvalidAddressWithoutReplacingDefault` | H53 |
| KIT-B02 | Create/change a default delivery location, submit stale edits or invalid address data, and deactivate a location. Keep one active default per Department, reject stale/invalid writes without changing it, and retain inactive record details. | LOC.`CustomerDeliveryLocationsReplaceDefaultWithConcurrencyAndPreserveInactiveDetails`; LOC.`CustomerDeliveryLocationsRespectDepartmentOwnershipAndRejectInvalidAddressWithoutReplacingDefault` | H53 |
| KIT-B03 | Confirm recommended kits for an accepted Customer Lab Job from concurrent clients and retry. Create one Pending request, retain included-cost presentation, preserve sample counts and shipment allocation, freeze the confirmed address against later address edits, and retain requested container capacity. | TK.`TransportationKitConcurrentRequestsFreezeFactsAndNotifyPhaenoOnlyOnce` | H53; included-cost flag is asserted, financial-ledger absence is not separately asserted |
| KIT-B04 | Process the new-request notification and replay ordering. Queue one notice and resolve the Phaeno administrator recipient through the existing dispatcher. | TK.`TransportationKitConcurrentRequestsFreezeFactsAndNotifyPhaenoOnlyOnce` | H53 with fake sender; actual mailbox delivery outstanding |
| KIT-B05 | Dispatch one requested size before the other, or pick a wrong size. Preserve exact requested revision/quantity matching; report PartiallyDispatched, then Dispatched; reject the wrong kit without saving dispatch facts. On-the-way quantities remain unavailable. | TK.`TransportationKitPartialDispatchAndReceiptEnableOnlyAcknowledgedCapacity`; TK.`TransportationKitOrderAuthorizationCancellationAndWrongKitLeaveRecordsIntact` | H53 |
| KIT-B06 | Acknowledge only received kits, repeat the acknowledgement, then receive the remainder. Make only acknowledged capacity usable, preserve receipt/version on repeat, and reach Received only when every requested kit is acknowledged. Block preparation and tube scans before receipt. | TK.`TransportationKitPartialDispatchAndReceiptEnableOnlyAcknowledgedCapacity`; TK.`TransportationKitReceiptGateBlocksTubeScanUntilCustomerAcknowledgesDelivery` | H53 |
| KIT-B07 | Allocate a received 20-tube kit while ten tubes remain, or order to a second delivery location. Keep the same request across the residual pool; subtract already-prepared containers; recommend only missing capacity; do not pool another location's kits. An acknowledged kit already bound to its shipment remains usable there. | TK.`TransportationKitPartialDispatchAndReceiptEnableOnlyAcknowledgedCapacity`; TK.`TransportationKitPackingDoesNotPoolReceivedKitsAcrossDeliveryLocations`; TK.`TransportationKitReceiptGateBlocksTubeScanUntilCustomerAcknowledgesDelivery` | H53 |
| KIT-B08 | Configure compatible sizes and recommend/override them with unknown, zero or limited availability. Enforce Phaeno configuration access and exact compatibility; preserve frozen shipment revisions; prefer fewest containers, then least spare capacity; support 20+10, two 20s or six 5s and retain exact shortfall. | PACK.`ContainerCatalogRequiresPhaenoConfigurationAccessAndExactCompatibilityPairs`; PACK.`ContainerCatalogDraftPreviewRevisionsAndDeactivationPreserveFrozenShipmentFacts`; CAT.`DefaultThirtyTubesUsesTwentyAndTen`; CAT.`ActualAvailabilityControlsRecommendation`; CAT.`UnknownAvailabilityIsNotZeroAndNoCompatibleOptionsIsIncomplete`; CAT.`ZeroAvailabilityDoesNotInventContainers`; CAT.`InvalidSelectionsRejectDuplicatesUnavailableAndUnknownDefinitions` | H53; recorded Job stock does not establish a complete customer inventory balance |
| KIT-B09 | Split tubes 15+15 or 10+10+10, skip an empty container, finish a residual pool, or submit simultaneous packing confirmations. Preserve every physical tube's global sample ordinal and earlier shipment identities; invalid plans leave the source unchanged; only one concurrent allocation wins. | PACK.`ContainerPackingCustomCountsSupportEvenSplitsAndSkipEmptyExtras`; PACK.`ContainerPackingHonorsAlternateSelectionsAndLeavesShortfallExplicit`; PACK.`ContainerPackingRejectsInvalidCustomCountsWithoutChangingTheSource`; PACK.`ContainerPackingConcurrentConfirmAllocatesEveryPhysicalTubeOnlyOnce` | H53 |
| KIT-B10 | Register/dispatch a standard kit and scan its permanent tube barcode into a partially filled return container. Require the complete registered kit before dispatch, bind the physical kit once, retain unused spare tubes separately, and preserve existing supplier-barcode adoption. | DOMAIN.`ReturnKitRequiresTheExactRegisteredTubeCountBeforeFulfillment`; PACK.`ContainerStockConcurrentScansBindOnePhysicalKitToOnlyOneShipment`; PACK.`ContainerStockWholeKitBindsOnFirstScanWhilePartialFillKeepsUnusedTubesSeparate`; SHIP.`RegisteredTubeJourneyFreezesCrosswalkEnforcesTenantAndAdoptsBarcodeAtAccession` | H53 |
| KIT-B11 | Print/replace a split-sample manifest and receive/accession individual tubes. Preserve order/shipment/sample/tube identities, reject a void packet, resolve the current shipment packet, and advance physical counts only for received tubes. A complete package can become Received without fabricated Customer dispatch details; the other package stays incomplete. | PACK.`ContainerStockWholeKitBindsOnFirstScanWhilePartialFillKeepsUnusedTubesSeparate`; SHIP.`RegisteredTubeJourneyFreezesCrosswalkEnforcesTenantAndAdoptsBarcodeAtAccession` | H53; physical print/scan acceptance remains E2E work |
| KIT-B12 | Open and filter a queue or a Job with more than 250 related records. Return all 261 matching requests/shipments without losing older records; retain readable Customer/Department names and tenant/member scope. | TK.`TransportationKitQueueReturnsAllRecordsForClientFilteringBeyondTwoHundredFifty`; PACK.`ContainerShipmentSourceListingIncludesAllPackagesAndRetainsMemberReadOnlyScope` | H53 |
| KIT-B13 | Invoke old whole-sample receipt/accession/status endpoints for Lab-owned shipping samples, then repeat on an unowned legacy sample. Reject the owned bypass with 409 and unchanged state; retain the three legacy operations for unowned samples. | LEGACY.`LabOwnedShippingSampleRejectsLegacyReceiptAccessionAndTransitionWithoutChanges`; LEGACY.`LegacySampleWithoutLabOwnedShippingRetainsReceiptAccessionAndTransition` | H53 |

### Additional backend cases and broader inventory boundaries

These are coverage requirements for later authorized test work, not new passing
results or a claim that the broader inventory model exists. Keep the scenario
IDs when adding tests and replace the reference/status only after evidence is
recorded.

| ID | Trigger and expected invariant | Existing coverage boundary | Evidence/status |
| --- | --- | --- | --- |
| KIT-B14 | Open ordering with no location, one non-default location or several locations without a default; change/deactivate the chosen location before confirmation. Require explicit setup/choice where needed and reject stale confirmation without creating a request. | KIT-B02 covers saved defaults, validation and deactivation; no dedicated backend case covers every ordering-selection branch or stale location confirmation. | Planned regression |
| KIT-B15 | Attempt kit ordering for an unaccepted/held/cancelled Job, Trial or Partner context; retry the same idempotency key with altered data; race dispatch, receipt and cancellation. Preserve eligibility, payload-conflict, quantity and transaction boundaries. | KIT-B01/B03/B05/B06 cover selected authorization, concurrent creation, wrong-kit rollback and repeated receipt; these additional negative/race combinations are not established by those passes. | Planned regression |
| KIT-B16 | Order included kits/outbound delivery and exercise notification failure/retry, missing routing or a future designated recipient. Assert no new invoice/financial posting and no duplicate notification delivery record. | KIT-B03 asserts the included-cost flag; KIT-B04 proves initial routing through a fake sender. Dedicated financial-absence and notification-recovery cases are not identified. | Planned regression; named-recipient policy/configuration remains a separate decision |
| KIT-B17 | Reserve Phaeno/customer stock for simultaneous Jobs, move supply between warehouse/customer locations, and release reservations after plan changes or cancellation. Prevent double allocation across Jobs and distinguish transit from confirmed on-hand balance. | Current kit supply is Job/location scoped; it is not a cross-Job inventory ledger or warehouse reservation system. | Planned product scope; no implemented backend test reference |
| KIT-B18 | Reconcile unknown/stale balances, record lost/damaged supply, adjust with reasons, or split/reassemble kits and reuse spare tubes. Preserve movement history and permanent identities without inventing availability. | Current partial-fill/spare-tube checks do not implement reusable spare inventory, stock adjustments or reconciliation. | Planned product scope; no implemented backend test reference |
| KIT-B19 | Recalculate preliminary demand at order intake, then exact demand after final sample entry; apply replenishment thresholds and partial fulfillment/receipt over multiple orders. Create one appropriate replenishment work item and avoid automatic charges or shipments without policy. | Finalized-Job request and partial receipt are covered above; automatic replenishment and preliminary-demand inventory planning remain in the [owning shipping plan](SAMPLE-SHIPPING-AND-INTAKE-PLAN.md). | Planned product scope; no implemented backend test reference |

For future authorized execution, use isolated synthetic PostgreSQL fixtures and
a fake notification sender; verify cleanup. Do not use the walkthrough Job as
a test fixture. Backend pass counts, signed-in walkthrough results and real
delivery/receipt evidence must remain separate in the
[E2E test plan](E2E-TEST-PLAN.md).

## Container configuration, stock kits and split shipments — September 8, 2026

The final focused checkpoint passed **44/44** cases: 17 container/catalog
domain and packing cases, eight existing shipping domain cases, four packing
invariants, and 15 PostgreSQL cases (twelve new and three existing journeys).
The new PostgreSQL cases are in `SampleShippingPackingPostgresTests.cs`, a
partial of the existing shipping fixture; cleanup scopes all new catalog and
stock records to that fixture's unique SKU prefix.

Coverage includes inactive draft preview, stable case-insensitive SKU identity,
revision history, explicit deactivation, frozen shipment container facts,
Phaeno configuration authorization, exact structured compatibility pairs,
fewest-container/least-unused-capacity recommendations, unknown/zero/limited
availability, arbitrary compatible selections, exact shortfalls and preserved
global sample tube ordinals. The optimizer is also compared with exhaustive
results for 675 small bounded cases. Confirmed plans cover 20+10, two 20s,
six 5s, custom 15+15 and 10+10+10 splits, skipped empty extras, and rejection of
invalid counts without source changes.

The final lifecycle review also verifies completing a previously partial
packing pool without changing earlier containers, retrieving all 261 packages
for a selected job despite the general list's 250-record limit, and retaining
Member read access while blocking administrative writes. Draft preview cannot
override active, ended or deactivated revisions. Complete physical receipt or
accession marks a confirmed package Received even if Customer dispatch details
were never entered, retaining absent carrier/tracking values rather than
inventing them.

`LabOwnedSampleOperationPostgresTests.cs` verifies that the legacy POMS sample
receipt, accession and status-transition endpoints reject samples connected to
Lab-owned shipping work with 409 and direct staff to Lab operations. The guard
leaves sample, order, specimen, work and shipment state, audit events and notices
unchanged. Samples without that ownership retain all three legacy operations.

Concurrent confirmation and concurrent stock-kit binding each permit exactly
one winning operation. A complete stocked 20-tube kit can back a 10-tube return
container without making the other supplied tubes expected returns. Packet
tests verify SKU, distinct order/shipment/sample barcodes, split-sample totals
and other-container references. Identity lookup resolves each context; a
shipment barcode resolves the current packet, while an explicitly replaced
packet barcode is rejected. Physical receipt advances from 1 through 10 of
30 expected tubes while the other container remains at zero. Unpaired receipt,
receipt of an unused spare tube, cross-tenant reads and reuse of a received
tube are rejected. Existing supplier-barcode adoption and packet issuance
regressions still pass.

All database fixtures ran against freshly created local scratch databases with
no copied user data or running notification dispatcher. All five scratch
databases were dropped and absence verified; each left zero synthetic notices.
The intermediate checkpoint caught an unmapped computed void-status property
in packet queries; the final code queries the persisted void timestamp.
The isolated backend/test build passed with zero warnings and errors.

Migration `20260908234930_AddSampleShippingContainerPackingAndStock` adds five
catalog/stock tables, three shipment packing fields and a physical-tube receipt
timestamp. Existing required return-kit ownership is unchanged. The model
snapshot has no pending changes and the complete database ERD is regenerated.
After verifying it was the sole pending migration on `localhost/phaeno_ops`,
it was applied locally. Before/after evidence confirms that the walkthrough
job's nine unique sample IDs, saved sample values, 18 tubes, order status and
version, and shipment IDs/statuses/versions are identical. No fixtures ran
against that database. Shared/production migration, actual supply configuration
and physical kit/scanner acceptance remain unperformed.

## Sample source capacity, imports and roster responses — September 8, 2026

The final focused checkpoint passed 13 cases: five new PostgreSQL capacity
cases, three existing acceptance/finalization/replay PostgreSQL regressions,
and five unit/CSV checks. An earlier broader unit/domain batch passed 27/27.
Coverage includes quota enforcement while other sources still have room,
record counts independent of tubes, source normalization, unchanged-source
legacy metadata recovery, moving/removing records, exact finalization flags
and authorization, persisted CSV revalidation, and simultaneous requests for
the last available source slot. The computed count property is verified absent
from EF metadata, so no model or migration change is required.

The first isolated run exposed duplicate Add response rows from EF collection
fix-up: tracking the sample before explicitly adding it to the order collection
could return the same saved record twice. Add/import now attach the collection
member before tracking it; response-count checks passed. A subsequent failing
assertion depended on source-group iteration order; it now accepts either
correct source-mismatch explanation, and the entire checkpoint passed.

The owner's Visual Studio session repeatedly restarted local IIS, so tests
used fresh local scratch databases instead of the active development database.
Each received the existing migrations without copied user data. All three
scratch databases were dropped and absence verified; cleanup left zero
synthetic notification rows. No user samples were changed and no shared or
production database was used. Root's final local API build passed with zero
warnings/errors; the restarted API returned health HTTP 200.

## Quote decline reason selection — September 8, 2026

The decline dropdown uses the existing withdrawal `ReasonRequest` contract
and request-closure operation. Named selections serialize their readable label;
Other serializes `Other: ` plus trimmed explanation, within the existing
2,000-character limit. No API, authorization or persisted-model change is
required, so no migration or additional backend test run is needed for this UI
change. Focused frontend tests cover the payload and conditional validation.

## Quote expiration and extension requests — September 8, 2026

All six `LabQuoteExtensionPostgresTests` cases passed against guarded local
PostgreSQL. They cover effective expiry without read mutation, blocked expired
acceptance, durable duplicate/idempotent requests, organization/department and
Member/admin boundaries, inactive membership, stale versions/source quotes,
pending staff filtering, future-dated reissue, immutable original terms,
atomic request resolution, one issuance notice, and Accepted-state preservation.
The first checkpoint found a duplicate fixture Job name; unique fixture names
fixed it and all six cases passed on rerun. The other 36 related quote issuance,
PDF and order-domain cases passed in the original checkpoint.

The API was stopped during committed test fixtures so synthetic notices could
not dispatch; fixture cleanup deletes extension requests before their quotes.
Migration `20260908204524_AddLabServiceQuoteExtensionRequests` was verified
additive and applied only to `localhost/phaeno_ops`. Existing Phaeno read
authorization is unchanged. Shared/production execution remains unperformed.

## Branded quote PDF — September 8, 2026

All 6 `QuotePdfRendererTests` cases passed: embedded Phaeno logo/fonts, saved
USD900 pre-tax quote without invented terms, frozen billing/tax/payment terms,
precise unit prices and rounded line amounts, historical status, long/multipage
descriptions with repeated headers and bounded glyphs, and safe failure for
unsupported characters. The representative one-page PDF and every page of the
five-page layout sample were visually checked under `artifacts/quote-pdf-review`.

All 5 `DepartmentAccessPostgresTests.QuotePdf*` cases passed against guarded
local PostgreSQL using rolled-back fixtures, with zero failures/skips. They
cover ordinary Member download, organization/department/order/quote boundaries,
unissued and missing revisions, membership revocation, immutable quote/order/
audit data, frozen billing versus the current profile, and malformed-line 409
recovery. Local API build passed with zero warnings/errors. No migration or
shared-environment change was required. The owner's Firefox retry remains
separate from these automated results.

After the owner's successful Firefox download, the spacing-only refinement
reran the same 6 renderer cases successfully. The sample and all five long
document pages were visually reviewed again, including aligned metadata, table
padding and totals-divider clearance. No new cosmetic test or access-test
rerun was needed; content, money calculations and download permissions did
not change. API rebuild passed with zero warnings/errors.

## Private invitation preview — September 8, 2026

Two `DepartmentAccessPostgresTests.InvitationPreview*` cases passed against the
local development database inside rolled-back transactions. They cover the
minimal pending recipient preview, no-store headers, no membership/lifecycle
mutation, and generic failures for unknown, empty, oversized, expired, revoked,
accepted, declined, and inactive-organization links. The preview POST is
anonymous only with a valid secret invitation token and uses the API rate
limiter. Acceptance and decline authorization remain unchanged. Local API
build passed with zero warnings/errors. No migration was needed.

## Domain invitation template — September 8, 2026

Updated `MailgunInvitationEmailSenderTests.SendInvitationPostsSingleEmailToMailgun`
to verify the domain template name, private `t:variables` organization/recipient/
invitation URL, plain-text fallback, and absence of inline HTML or public token
metadata. All four focused Mailgun sender/renderer/webhook tests passed. API
build passed with zero warnings/errors. No other backend suite was run.

## CRM outreach decisions — September 8, 2026

`CrmOutreachTests` covers legacy permission requiring review, legacy suppression,
required source/date/explanation/email, future dates, inactive/merged eligibility,
email-change invalidation, and preservation of suppression. The transactional
`CrmCommercialAccessPostgresTests.OutreachDecisionsPersistWithImmutableHistoryAndCannotBeChangedThroughLegacyFields`
checks API legacy-field bypass rejection, persisted evidence, actor history,
immutable activity, and email-change history. Focused checkpoint: 30 passed,
zero failed/skipped (includes `CrmCompanyDomainTests`); PostgreSQL fixture rolled
back. Migration `20260908161948_AddCrmOutreachEvidence` applied only to verified
local `localhost/phaeno_ops`. ERD regenerated. No outreach sender exists; queue,
dispatch, and provider receipt enforcement remain a future integration gate.

## Manual major-workflow companion — September 8, 2026

The [major-workflow acceptance pack](../testing/README.md) adds 60 human-run
cases with role/tenant boundaries, duplicate and stale-command checks, persisted
handoff expectations, scientific/financial separation, and provider/restore gates.
See the [owning plan](MAJOR-WORKFLOW-ACCEPTANCE-PLAN.md) and
[run record](../testing/RUN-RECORD.md). These are authored manual scripts, all
initially Not run; no backend tests were added or executed for this documentation
task, and existing automated coverage/results remain unchanged.

## Final isolated retention checkpoint — September 8, 2026

All 12 `ManagedReleaseRetentionPostgresTests` passed with zero failures/skips on an owned, temporary loopback PostgreSQL 18 cluster with `track_commit_timestamp=on`. This resolves the four environmental prerequisite failures in the bundle integration run below. The cluster and its generated test databases were stopped and removed; the normal development instance was neither restarted nor reconfigured. Evidence: `artifacts/portal-operational-completion-20260908/retention-isolated.trx`. These cases overlap the selected PostgreSQL checkpoint and are not an additional unique-test total.

## Configured Lab Service bundles — September 8, 2026

`ConfiguredLabServiceDomainTests` covers immutable offering scope/effective windows, invalid turnaround ranges, exact accepted-quote commitment with no early specimen authority, acceptance-based clocks, preserved original targets, controlled timing reasons/private notes, and durable sale publication retry. The configured portion of `LabOperationsCommercialHandoffPostgresTests` lives in `ConfiguredLabServicePostgresTests.cs`: it exercises atomic placement and idempotent replay, stale scientific/catalog review, organization-admin-only Partner commitment and Department-scoped replay admission, real session capabilities, delayed/earlier timing changes and tenant-safe history/notices, and inactive/future offering versions that preserve current availability. `SessionAccessTests` additionally covers Partner Lab navigation without granting administration and keeps the separate invoice capability aligned with current Accounts Receivable authority.

The initial focused checkpoint passed **12 tests, zero failures/skips**, including four PostgreSQL cases against the explicitly approved local reference database. It found and fixed an accepted-quote tracking defect before commitment could succeed; its failed transaction left the Job unplaced. A failed test-fixture teardown was corrected to include its exact Lab work outbox rows, and the one generated fixture was removed with identity guards. Evidence: `artifacts/portal-bundles-20260908/configured-lab-focused.trx`. Subsequent session, canonical-item, publication-window and current schedule-display changes require the integrated checkpoint below; the initial result does not cover those later changes.

The integrated Release run without the PostgreSQL opt-in discovered **554 tests: 415 passed, one failed, and 138 skipped** (`artifacts/portal-bundles-20260908/backend-non-postgres.trx`). The failed persistence assertion exposed that cross-module timing/notification history belonged in the application layer; moving that record preserved its table and restrictive foreign keys while restoring the Laboratory module's original 30 entities and no-Commercial-foreign-key invariant. The final focused model, session and configured-domain run passed **26 tests, zero failures/skips** (`backend-bundle-model-session.trx` in the same directory), including that strict boundary check and one additional invoice-capability case. This follow-up repairs the identified failure; it is not a second complete-suite run.

The selected local PostgreSQL checkpoint executed **88 tests: 83 passed, five failed, zero skipped** (`artifacts/portal-bundles-20260908/backend-bundle-postgres.trx`). All 26 commercial Lab handoff cases, including the five configured Lab journeys, all five Lab provider cases, all 32 Department-access cases, all three shared-shipping cases and all five Kit cases passed. Retention passed eight cases and failed four because the normal local server has commit-timestamp tracking disabled; that server was not restarted or reconfigured. Custom-work passed four cases and exposed one real routing regression: a Kit-only Partner was incorrectly required to have Lab entitlement. The owning correction selects the existing Kit tenant admission for Kit requests and preserves the new Lab eligibility check for Lab requests. The final Kit/custom-work checkpoint passed **22 tests, zero failures/skips**: six Kit PostgreSQL cases (including a paid order whose Assembly is held or cancellation is pending), five custom-work PostgreSQL cases (including Kit-only Partner access) and 11 unit cases. Evidence: `artifacts/portal-completion-20260907/backend/kit-custom-work-final-acceptance.trx`. The final solution Release build completed with zero warnings/errors. These focused results overlap the earlier checkpoint and must not be added as independent coverage.

The final model/session Release build completed without compiler warnings/errors. EF reports **no pending model changes** after the application-layer history correction; its installed-tool-version advisory (10.0.5 tooling versus 10.0.10 runtime) is separate from the successful model comparison. Reviewed idempotent migration SQL from `20260907232219_AddTrialAndReconciliationDrafts` to `20260908015114_AddConfiguredLabAndPartnerKitBundles` is `artifacts/portal-operational-completion-20260908/bundle-migration.sql`, SHA-256 `E93B6E9E45A5F162D6063C48666D091383713021AFD165E0E7C33F96E37A2FEF`. It adds 21 columns, six tables and 43 indexes; all 37 foreign keys restrict deletion. Existing rows retain manual Lab ordering and non-bundled Kit behavior through additive defaults. It contains no drops, business-data inserts, updates, deletes or explicit historical backfill; its sole insert records migration history. This review generated SQL only and did not execute it against a database.

Remaining acceptance includes the pending Partner Finance scope decision, retention checks on a commit-tracking-enabled reference server, real Customer/Partner submissions, physical specimen acceptance, provider delivery and production release. Approved Partner self-service standard ordering and manual draft submission do not enable staff-created Partner sales-assisted conversion: that existing intake remains Customer-only, and a Partner custom request currently creates a CRM opportunity for staff follow-up. Local reference data is not operational acceptance.

## Approved file-service activation — 2026-09-07

Added the permanent operator-only `--verify-file-services` command for the approved production activation. It starts no HTTP listener or background workers, accesses no database, and uses injected storage/scanning for uniquely owned synthetic files in both managed areas. It verifies size, checksum, exact readback, clean scan and deletion, with cleanup even after failure or cancellation. It requires the configured ClamAV provider; fixture/Disabled scanning cannot establish readiness. This command is reusable deployment verification, not temporary data-repair code.

Five new cases cover both areas and owned cleanup, rejected/unavailable scan failure, corrupt readback and incomplete deletion. The focused storage/scanner/verification checkpoint passed **34 tests, one Linux-only skip, zero failures (35 total)**. Evidence: `artifacts/portal-completion-20260907/storage-activation.trx`. Release build passed with zero warnings/errors. The prior full 506-backend/321-frontend checkpoint below remains the full-suite evidence; this targeted follow-up does not claim a new full-suite run. Live daemon/volume evidence belongs in the completion release plan.

## Portal completion integration — 2026-09-07

The completion checkpoint passed **506 tests, zero failures and one Linux-only skip (507 total)** in the full Release suite. The filesystem-link test is explicitly skipped on Windows; its Linux execution and production volume ownership remain target acceptance. Evidence: `artifacts/portal-completion-20260907/backend-final.trx`.

Coverage includes private Local storage and restart persistence, stream limits/checksums and failed-write cleanup, explicit scanner verdicts and unavailable/error rejection, ordinary Commercial Operator CRM access with active membership, restricted administration and exact attention filters, partial Trial scope drafts and approval separation, allocation correction, append-only reconciliation draft history, independent approval and resolved attention after balancing/cancellation. Earlier focused counts overlap this full checkpoint and must not be added to it.

The usual development PostgreSQL instance has commit-timestamp tracking disabled, so retention verification initially failed on that environmental prerequisite. The final suite used an isolated loopback PostgreSQL 18 reference cluster with commit tracking enabled and the entire migration history applied. That cluster was stopped and removed after verification; the normal development server was not reconfigured or restarted.

Release build passed with zero warnings/errors. EF reports no pending model changes. Additive migration `20260907232219_AddTrialAndReconciliationDrafts` was applied only to configured local development and the isolated reference database. It adds four nullable columns, one index and one restrictive foreign key, with no historical-row rewriting. The complete ERD was regenerated. Reviewed idempotent SQL: `artifacts/portal-completion-20260907/add-drafts.sql`, SHA-256 `2B56AC6801CD7147F19BC25E462A6152BD804972561A2D7B10108B18B94CFFFA`.

Production migration application remains explicitly unapproved. No production financial, scientific or customer records were created by these checks. Real scanner service, target volume backup/restore, authenticated role journeys, upstream scientific output and physical bench acceptance remain separate.

## Intake consolidation - 2026-09-07

Readiness regression assertions now cover separate pricing and invoice blockers. Customer options/readiness endpoints retain platform authorization and validate the selected active Customer department. Readiness uses the canonical specimen catalog and department entitlement precedence; absent system configuration is incomplete. API build is the local checkpoint; automated suites and database-backed endpoint acceptance were not requested.

## Optional Trial assignment note - 2026-09-07

API build passed with isolated output for the optional Trial authority assignment note; the running Visual Studio/IIS Express process locked normal output. Automated tests for omitted/blank notes, trimming and the existing length limit remain deferred; no test suite was requested.

## Combined API/Portal release checkpoint — 2026-09-05

The Product Owner authorized committing/pushing the combined change and deploying
the production API plus Portal UI. Inspected production workflow `33975386749`
at commit `ab2df0a` records migration through
`20260905140916_FreezeReleasedDeliverableReceiptLineage`. The pending release
migrations are `20260905172646_AddTrialProjectIntegration`,
`20260905213944_AddWebsiteNotificationRecovery`, and
`20260905222201_AddWebsiteNotificationProcessingControl`, in that order.
Their reviewed idempotent script is
`artifacts/review-gap-closure/production-review-migrations.sql`, SHA-256
`10A12E85A0B0930AA98E5766D3991227B19556E58248FE60D7F33AC1BBC01EA3`.
Explicit approval for the shared migration is still pending; API/Portal
deployment authorization and earlier local applications do not establish it.
No production application of these migrations is claimed at this checkpoint.

The current release-focused run passed **59 tests with zero failures/skips**.
The backend Release build passed with zero warnings/errors, and EF reports no
pending model changes. Evidence is in `artifacts/review-gap-closure/release-backend-*`
and `release-pending-model.log`. The earlier 27 distinct Website checks remain
the prior subsystem checkpoint. Local release verification is complete;
commit/push, exact deployed artifact, production migration/backup evidence and
runtime health remain unrecorded pending release-owner confirmation.
Hosted operator admission, real provider acceptance versus inbox delivery,
external alert collection/routing and actual Trial/storage paths remain separate
acceptance evidence. Public Website deployment is outside this request.

## Follow-up: review gap closure and Website processing controls — 2026-09-05

All **27 distinct Website checks** passed: 11 PostgreSQL workflow cases, one
independent-connection processing case, one sender case, one queue-monitor case,
and 13 API cases. This follow-up extends the prior checkpoint below; the counts
overlap and must not be added together as independent coverage.

Coverage includes durable pause/resume with required reason, current-version
conflicts and actor audit; intake and manual recovery queuing without consuming
attempts while paused; acknowledgement without waiting for an in-flight provider
call; persistence across fresh connections; and resumed processing of retained
work. Summary/filter cases cover failed and expired claims, including an explicit
interrupted-row projection. Monitor checks cover counts while paused, changed
attention, bounded reminders, cleared attention, numerical gauges, and exclusion
of actor/reason details from logs. Unsubscribe and completion cancel queued or
failed work while retaining attempt history; retired intake also cancels a final
expired claim and a provider failure that finishes after retirement.

The Release build passed with zero warnings, and the EF pending-model check was
clean. Migration `20260905222201_AddWebsiteNotificationProcessingControl` was
applied to isolated loopback PostgreSQL on port 55435 and configured local
`phaeno_ops` on port 5432; the configured-local application followed a backup.
The regenerated ERD accounts for all 157 tables at this checkpoint. Providers
and identities remain synthetic. These results do not establish shared or
production rollout, hosted admission, real provider acceptance, or inbox delivery.
External collection of the emitted metrics/logs and alert-sink configuration
remain deployment work; the monitor tests do not establish an active external
alerting service.

## Review gap closure — 2026-09-05

All 51 focused Website API, notification, Trial domain/PostgreSQL, and persistence
cases passed with zero skips. The PostgreSQL cases used the isolated loopback
reference cluster with commit tracking; notification providers were fake.
`WebsiteNotificationPostgresTests.cs` covers atomic intake/enqueue, duplicate
suppression, bounded retries and immutable attempt history, version/cooldown and
actor audit for recovery, interrupted final leases, inactive intake, legacy brief
recovery, and propagation of Mailgun rejection through a fake HTTP handler.
`TrialProjectPostgresTests.cs` adds a two-sample authorization/shipment, sample-type
quantity rules, exact Company/request lookup, and superseded/expired availability.

Release build passed with zero warnings/errors. Additive migration
`20260905213944_AddWebsiteNotificationRecovery` was applied to the isolated
reference database and configured local `phaeno_ops` after a backup; the complete
ERD was regenerated. Real provider acceptance/inbox delivery, hosted admission,
shared migration and production workers remain release verification steps.

## Portal documentation search — 2026-09-05

All 51 focused documentation-search, Website API and Website crawler cases passed
with zero failures/skips. `DocumentationSearchTests.cs` covers packaged corpus
loading without frontend files, cached-index restart, corrupt-index recovery,
guide removal/version mismatch, audience filtering before counts/facets/snippets,
metadata browsing, short terms and literal syntax, relevance, bounds, index path
separation, concurrent-process locks, rebuild cooldown and Website sentinel/index
byte isolation. A loopback HTTP test exercises the real controller, MVC binding,
authentication admission, error/envelope handling, no-store caching, forbidden
scope overrides and rebuild denial. The test uses a synthetic authentication
handler and active-user source; hosted Clerk/database admission remains separate.

Measured locally with 55 guides: 100 sequential warm searches had p95 19.54 ms;
one recorded initial index build took 183.09 ms. These are search-engine timings,
not production identity/database/network measurements. Backend build and Release
publish passed; the publish artifact contains the exact generated corpus and no
frontend source directory. No database migration is introduced.

## General Lab/Assembly scheduled notices (2026-09-05)

All 111 affected policy/download/PSeq/Department/persistence cases passed with
zero failures/skips against isolated loopback PostgreSQL with commit tracking.
`ManagedReleaseRetentionNoticePostgresTests.cs` extends the existing general
fixture with five cases covering both release families, concurrent warning/grace
polling, authenticated links without file details, actual ZIP completion before
and after standard cutoff, unavailable/undated releases, no-admin recovery,
current recipient selection, repeated provider failure and attention reopening,
expired final claims, independent family activation, and ordinary-notice claims.
The focused 14-case general/governed checkpoint run also passed. No new schema
or external provider was required. Mailbox and hosted acceptance remain open.


## General Lab/Assembly retention enforcement (2026-09-05)

The 106-test affected run passed all 104 prior tests and the new commit/revocation
journey; its other new journey had a fixture-only Department-selection failure.
After correction, both `ManagedReleaseRetentionPostgresTests` journeys passed.
They create/drop unique local databases and cover Customer Lab and Partner
Assembly file/ZIP cutoff, preserved undated/default-off behavior, full completion,
partial response and failed-ZIP non-counting, frozen grace, completed-before-
standard closure, cross-Department denial, payment/release/withdrawal gating,
actual delayed COMMIT admission/completion, and cross-connection ZIP revocation.
Existing PSeq tests use the generalized monitor name and retain their coverage.
No schema migration is needed. Hosted/provider acceptance remains separate.


## Verified commit-time retention (2026-09-05)

The 104-test affected backend set passed with no failures/skips against an
isolated loopback PostgreSQL 18.3 cluster with commit tracking enabled. The new
`GovernedDownloadCommitPostgresTests` holds the actual COMMIT across standard and
final deadlines; it proves late success preserves grace, late admission opens no
storage, lost observations recover durably without rewriting dates, repeated
observation is unchanged, and rollback/uncommitted events cannot create proof.
Existing rollback workflow fixtures use explicit synthetic observations, not
claimed commit timestamps. Missing historical evidence produces controlled
unavailability while revocation still records. Migration/ERD completeness passed.
Hosted startup/restart/failover and browser/provider acceptance remain open.


## Durable governed retention verification (2026-09-04)

- All 103 focused policy/download/PSeq/Department/persistence tests passed with
  zero failures or skips on guarded localhost. The set includes seven new
  rollback-backed checkpoint/outbox cases, two new immutable-boundary cases,
  one independent-connection concurrency/streaming journey, and ERD completeness.
- `GovernedRetentionCheckpointPostgresTests.cs` covers queued/skipped warnings,
  one grace notice, frozen dates, safe links/content, missing admins, dispatch-time
  admin resolution, failed delivery/retry, reopened Operations attention, recovered
  interrupted final attempts, and immutable completion-versus-revocation outcomes.
- `GovernedRetentionConcurrencyPostgresTests.cs` creates a uniquely named local
  database, applies the migration chain, seeds only synthetic records, and drops
  that database in `finally`. Separate connections exercise competing workers,
  a completion waiting across a deadline, current-authority revocation, and a real
  MVC response whose blocked source read is aborted without bytes or counting
  success. Reinstated access cannot turn the revoked attempt into success.
- ERD coverage now checks every runtime-model table/column. Regeneration includes
  primitive collections and previously omitted retention/CRM/model structures.
- Migration `20260905031439_AddGovernedRetentionCheckpoints` applied only locally;
  production processing/dispatch remain default-off. These tests do not prove
  exact PostgreSQL commit-time eligibility across the wall-clock deadline, hosted
  Clerk/proxy behavior, real provider delivery, byte deletion, or shared rollout.


## Governed retention reconciliation (2026-09-04)

- `ReleasedDeliverableRetentionDecisionTests.cs`: 11 cases cover exact warning,
  standard/final boundaries, complete/incomplete packages, late completion,
  historical cutoff without worker progress, and old-worker exclusion.
- `GovernedResultRetentionPostgresTests.cs`: six rollback-backed cases cover
  governed release policy/Organization override capture with one timestamp,
  unchanged recapture, full MVC response success, partial/cancelled/failed streams,
  old non-counting request evidence, grace completion, deadline admission, and
  historical/new cutoff before storage opens. No real bytes are deleted.
- The 79-test focused policy/download/PSeq/Department/persistence set passed with
  no failures/skips on guarded localhost. Backend build passed with zero warnings.
  Updated Department controller construction and obsolete offset expectations.
- Migration `20260905022605_UnifyGovernedResultRetentionPolicy` was inspected and
  applied locally; ERD updated. Concurrent deadline checkpoint ordering, hosted
  transfer/revocation, real provider delivery/deletion, and shared migration remain
  open. No automatic warning/grace outbox implementation is claimed.


## Secondary department paths checkpoint (2026-09-04)

- `DepartmentSecondaryPathPostgresTests.cs`: 13 rollback-backed cases prove
  shared-package file/archive event scope, legacy history restrictions, membership
  reassignment/revocation, wrong-Department non-discovery before storage opens,
  activity/governance ownership, dispatch-time role/status checks, routing
  precedence/deduplication, no-recipient failures, suspended-Organization safety
  follow-up, and Customer Lab/Partner Reagent/Assembly lists/search/counts/CSV.
- All 68 Department/data-provisioning/operational-download/persistence tests
  passed with zero failures/skips using guarded `localhost/phaeno_ops`, including
  the 13 new cases. This set overlaps previous checkpoints. Sender/storage
  recorders avoid real email and production files. Backend build passed with
  zero warnings/errors.
- Additive audit migration `20260905014541_ScopeCuratedDownloadAuditByDepartment`
  was inspected and applied locally, preserving unknown legacy scope. ERD updated.
  Shared migration and hosted signed-in two-department acceptance remain deferred.

## Department administration closeout checkpoint (2026-09-04)

- `DepartmentAccessDomainTests.cs`: five domain cases including field-by-field
  inheritance, explicit false PO overrides, cleared defaults, validation without
  partial writes, and cross-Organization rejection.
- `DepartmentAccessPostgresTests.cs`: 18 rollback-backed local database cases.
  New coverage exercises assigned-admin settings/access, exact active-member
  lookup, ordinary-member denial, role/version/revocation behavior, Organization
  defaults audit/concurrency/inheritance, foreign-Organization denial, and
  protection of Organization-admin access from Department-admin changes.
- `LabOperationsCommercialHandoffPostgresTests.cs`: added real quote-acceptance
  proof for inherited PO enforcement, explicit Department override, and frozen
  accepted snapshots after Organization defaults change.
- Passed 60 focused Department/PSeq order-to-cash/order-domain tests plus nine
  quote/staff-initiation integration cases, with no skips. Both commands used
  guarded `localhost/phaeno_ops`; the two sets are disjoint. Backend build passed.
- Additive migration `20260905011422_AddOrganizationConfigurationDefaults` was
  inspected and applied locally. Shared migration, hosted authenticated flows,
  and full restored-database acceptance remain deferred.


Keep this file updated as backend tests are created, changed, or intentionally deferred.

Do not execute this test plan unless explicitly requested.

Lab Operations is feature-complete for the approved internal application
scope. The five opt-in provider/projection tests and five opt-in Commercial
handoff/operator tests below passed together against the migrated local
`phaeno_ops` database on 2026-07-16. Negative API paths and physical bench
acceptance remain production-activation coverage. Protocol-key, batch-name,
automatic batch-type, and batch-number allocation, barcode normalization,
reasoned print outcomes, exact scan lookup,
library-key derivation, and duplicate-safe batch entry now have focused unit
and rollback-isolated PostgreSQL coverage.

## Created Tests

- [x] `backend/test/DepartmentAccessDomainTests.cs` - new Organizations receive
  one active General Department, typed Department overrides use null for
  inheritance and protect the default lifecycle, and explicit Contact/User
  identity links require a reason while retaining deactivate/reactivate history.
- [x] `backend/test/DepartmentAccessPostgresTests.cs` - 12 rollback-isolated
  PostgreSQL checks for foreign-Organization denial, selected-Department result
  and invoice downloads, default uniqueness/audit, safe deactivation/reactivation,
  invalid/missing invitation intent, inactive Department denial, and service-rule
  override precedence. Passed locally on 2026-09-04.
- [x] Review regression run: 243 non-reference tests passed; 42 focused tests
  passed with the local PostgreSQL connection, including all 12 new checks plus
  quote issue and staff initiation. Other opt-in database suites were not run.
  Updated persistence assertions for separate organization/department grant
  indexes and existing lab workflow entities; fixed handoff fixture cleanup.
- [x] `backend/test/DepartmentSecondaryPathPostgresTests.cs` - the 13 cases in
  the secondary-path checkpoint cover curated grants/history/notice recipients
  and operational reads/counts/search/exports alongside existing Department tests.
- [ ] Remaining Department acceptance - restored-database migration/backfill,
  hosted invitation/identity acceptance, in-flight context switching, and signed-in
  cross-role two-Department workflows. Local controller/database proof does not
  replace authentication middleware, real provider delivery, or browser acceptance.

- [x] `backend/test/PSeqOrderToCashDomainTests.cs` - invitation retry and hard
  bounce transitions; derived full readiness versus permitted internal staging
  without an active Customer administrator;
  manual Blocked override; enforced and audit-only protocol author separation;
  result-package
  completeness, approval, release, correction, and withdrawal; invoice decimal
  arithmetic and append-only adjustment effects; partial allocation and
  overpayment/unapplied behavior; reconciliation balance and independent-actor
  approval in enforced and audit-only modes; retention warning/cutoff/grace/
  deletion/reissue; and production governed-result configuration validation.
- [x] `backend/test/MailgunInvitationEmailSenderTests.cs` - Mailgun form/API
  request and message-id correlation, locale-named embedded template rendering
  with HTML escaping, webhook HMAC verification, and production invitation
  configuration validation.
- [ ] PSeq order-to-cash PostgreSQL/API coverage - invitation webhook
  deduplication and out-of-order retry, durable dispatch concurrency, tenant
  isolation, pipeline idempotency, invoice-number uniqueness, serializable
  allocation/reconciliation conflicts, CSV duplicate import, exact decimal
  persistence, stage-eligible Company filtering, administrator-free pricing
  initiation with quote-issuance blocking until an approver is active,
  migration backfills, and forward-fix behavior remain required against a
  restored production-like database before shared activation.

- [x] `backend/test/FileStorageTests.cs` - local provider round-trip, checksum,
  deletion, oversize cleanup, feature-area separation, dependency-injection
  provider selection, and rejection of local storage in Production.
- [x] `backend/test/ReleasedDeliverablePolicyDomainTests.cs` - approved 30/5/5
  defaults, positive whole-day validation, warning-before-retention validation,
  partial organization inheritance, invalid resolved-policy rejection,
  monotonically versioned revisions, reasoned deactivation history, immutable
  effective-value/source snapshots, exact UTC deadline calculations, and
  cross-organization override rejection. The tenant-safe package projection is
  also checked to expose dates without policy configuration history.
- [x] `backend/test/PersistenceTests.cs` - released-deliverable global-policy and
  organization-override schema ownership, filtered active-version uniqueness,
  immutable release-target snapshot uniqueness, optimistic-concurrency tokens,
  and restricted organization, policy, lab-result, and assembly-output
  relationships.
- [x] `backend/test/OrderManagementDomainTests.cs` - repeated file and package
  release attempts preserve the first release timestamp used by retention.
- [x] `backend/test/PersistenceTests.cs` -
  `PSeqOperationsDbContextMapsWebsiteEntitiesToWebsiteSchema` and the
  all-entity schema assertion cover the Website-owned tables in the shared
  portal context.
- [x] `backend/test/WebsiteApiTests.cs` - sitemap URL discovery,
  accent normalization, single-pass stemming for scientific terms,
  hyphenated-term highlighting, and rejection of
  HTML-page-title-only, hidden-result-title-only, hidden-summary-only, and
  search-keyword-only false positives; all-term visible/source eligibility;
  PDF-only landing matches and source-dependency signaling;
  visible-before-PDF snippet selection, source-aware ranking, and exclusion of
  index-only text from the public Website response; Preview/production Lucene
  index isolation, rejection of a shared index path, and preview-proxy key
  comparison; locale-isolated English, Arabic, French, Spanish, Simplified
  Chinese, Japanese, German, and Italian indexing; Arabic diacritic
  normalization; French, Spanish, German, and Italian stemming; dependency-free
  CJK n-gram matching; regional locale normalization; and unchanged English-default queries. The locale-focused
  additions are created but have not yet been executed.
- [x] `backend/test/WebsiteDocumentTextExtractorTests.cs` - deterministic
  two-page PDF reading order, extracted-character limits, and malformed-PDF
  failure classification for the PdfPig implementation.
- [x] `backend/test/WebsiteCrawlerTests.cs` - one-record document mode,
  same-origin source enrichment, external-origin/prefix/redirect/MIME/robots/
  size rejection, encrypted/malformed/image-only/unavailable/excessive-text
  fallback, hard extraction timeout, unchanged ordinary section indexing, and
  successful mixed valid/invalid publication rebuilds, and separation of
  hidden section metadata from extracted destination-visible text; nested
  heading wrappers retain destination-visible section content such as
  biomarker names and evidence attributions without leaking into the next
  section; unanchored nested headings remain part of their indexed parent
  section; section records retain the page's published document type for result
  labeling and icons. Added locale coverage verifies `<html lang="ar">`
  propagation and prevents an Arabic landing record from indexing its linked
  English PDF; these additions have not yet been executed.
- [x] `backend/test/PhaenoPortalMetadataTests.cs` - `HealthMetadataIdentifiesTheApi`.
- [x] `backend/test/PersistenceTests.cs` -
  `PSeqOperationsDbContextMapsEveryEntityToItsOwningSchema`.
- [x] `backend/test/PersistenceTests.cs` - `PSeqOperationsDbContextMapsAccountEntities`.
- [x] `backend/test/PersistenceTests.cs` - `PSeqOperationsDbContextMapsDataProvisioningEntitiesAndTenantBoundaries`.
- [x] `backend/test/ModuleBoundaryTests.cs` - `CommercialAndLaboratoryAssembliesDoNotReferenceEachOtherOrApi`.
- [x] `backend/test/LabOperationsContractTests.cs` - core v1 contract version,
  Commercial ownership, transport neutrality, prohibited-field boundary, and
  partial-cancellation representation, plus the internal adapter's provider-port
  implementation.
- [x] `backend/test/LabOperationsDomainTests.cs` - monotonic authorization
  versions, receipt-before-accession behavior, controlled hold/rejection reasons,
  immutable authorization payload hashes, pre-receipt cancellation boundaries,
  work cancellation, provider-command receipt matching, controlled work
  milestones, protocol activation, QC-gated material consumption, required
  failed-QC reasons with the laboratory QC date, and
  customer-safe exception separation, including execution completion without
  an optional deviation note; plus Phaeno barcode kind/prefix allocation,
  safe-character generation, Code 39 scan normalization, checksum validation,
  and altered-value rejection; plus readable protocol/material-key collision
  handling, material-lot quantity and structured-component invariants, and
  date-stamped scanner-safe batch-number generation and captured batch lifecycle
  timestamps; plus draft definition
  updates, protocol name/description edits that preserve the immutable key,
  irreversible independent approval, replacement of the prior Approved
  version, discarded-version history, and illegal post-discard
  transitions; plus service-workflow service-key normalization,
  Draft-to-Production lifecycle and immutability, conditional-stage validation,
  and exact work-order workflow-version pinning.
- [x] `backend/test/LabOperationsAuthorizationTests.cs` - exact additive
  Operator, Supervisor, Protocol Administrator, Scientific Reviewer, and Lab
  Operations Administrator capabilities; platform-administrator bootstrap;
  inactive-assignment filtering; external-user denial; disabled-user denial;
  explicit role matching; and `/api/session` capability projection.
- [x] `backend/test/LabProtocolExecutionTests.cs` - strict definition validation,
  historical-evidence recovery, empty-results rejection, typed number/date/
  choice/barcode/reference checks, required roles and confirmations, explicit
  optional/conditional decisions, sequence and QC gates, resource attestation,
  repeat permissions, reasoned supervisor corrections, downstream re-review,
  pinned versions, and immutable completed/abandoned evidence.
- [x] `backend/test/PersistenceTests.cs` - Commercial and Laboratory assembly
  schema ownership, all 26 Laboratory mappings, and no Laboratory foreign key
  into a Commercial entity.
- [x] `backend/test/ApiResponseTests.cs` - `SuccessEnvelopeSerializesWithReferenceShape`.
- [x] `backend/test/ApiResponseTests.cs` - `FailureEnvelopeSerializesWithReferenceShape`.
- [x] `backend/test/ApiResponseTests.cs` - `DomainExceptionMapsLikeReferenceApi`.
- [x] `backend/test/ApiResponseTests.cs` - `ConcurrencyExceptionMapsToConflict`.
- [x] `backend/test/AccountDomainTests.cs` - `NewUserIsInvitedAndInactiveUntilAccepted`.
- [x] `backend/test/AccountDomainTests.cs` - `AcceptInvitationLinksExternalIdentityAndActivatesUser`.
- [x] `backend/test/AccountDomainTests.cs` - `PlatformAdminRequiresActiveAdminMembershipInActivePhaenoOrganization`.
- [x] `backend/test/AccountDomainTests.cs` - `InvitationExpirationIsDerivedFromPendingStatusAndExpiresAt`.
- [x] `backend/test/AccountDomainTests.cs` - `InvitationTokenServiceStoresHashSeparateFromRawToken`.
- [x] `backend/test/AccountDomainTests.cs` - `OrganizationDeactivateDoesNotDeactivateMembership`.
- [x] `backend/test/AccountDomainTests.cs` - `UserDeactivateDoesNotDeactivateMemberships`.
- [x] `backend/test/ExternalIdentityContextTests.cs` - `ClaimsExternalIdentityContextReadsClerkSubjectAndVerifiedEmail`.
- [x] `backend/test/ExternalIdentityContextTests.cs` - `ClaimsExternalIdentityContextReturnsNullForUnauthenticatedUser`.
- [x] `backend/test/ClerkVerifiedEmailResolverTests.cs` - `IsVerifiedReadsVerifiedEmailFromClerkWhenClaimsOmitEmail`.
- [x] `backend/test/ClerkVerifiedEmailResolverTests.cs` - `IsVerifiedRejectsAClerkEmailThatIsNotVerified`.
- [x] `backend/test/ClerkVerifiedEmailResolverTests.cs` - `IsVerifiedUsesMatchingVerifiedClaimsWithoutCallingClerk`.
- [x] `backend/test/AccountDomainTests.cs` - guarded external-identity relinking
  rejects an unexpected prior Clerk subject and accepts only the exact expected
  development-to-production replacement.
- [x] `backend/test/AccountAuthorizationTests.cs` - `PlatformAdminCanManageCustomerOrganizationMembers`.
- [x] `backend/test/AccountAuthorizationTests.cs` - `CustomerOrgAdminCannotManagePhaenoOrganizationMembers`.
- [x] `backend/test/AccountAuthorizationTests.cs` - `CustomerOrgAdminCanManageOwnCustomerOrganizationMembers`.
- [x] `backend/test/AccountAuthorizationTests.cs` - `ProspectOrgAdminCanManageOwnProspectOrganizationMembers`.
- [x] `backend/test/AccountAuthorizationTests.cs` - `ActiveProspectMemberCanViewOnlyOwnOrganizationDatasets`.
- [x] `backend/test/AccountDomainTests.cs` - `NewExternalOrganizationDefaultsToProspectAndConvertsInPlace`.
- [x] `backend/test/AccountDomainTests.cs` - `ProspectCannotConvertToPhaenoOrConvertTwice`.
- [x] `backend/test/DataProvisioningDomainTests.cs` - `ProvisioningPolicyKeepsEnvironmentConfigurationOutsideTheDomain`.
- [x] `backend/test/DataProvisioningDomainTests.cs` - `ReadySourceRevisionIsImmutable`.
- [x] `backend/test/DataProvisioningDomainTests.cs` - `CuratedVersionSnapshotsReadySourceAndBuildsStableChecksum`.
- [x] `backend/test/DataProvisioningDomainTests.cs` - `ManifestComparisonAcceptsJsonbKeyOrderingAndWhitespace`.
- [x] `backend/test/DataProvisioningDomainTests.cs` - `ManifestNormalizesTimestampsToPostgresqlMicrosecondPrecision`.
- [x] `backend/test/DataProvisioningDomainTests.cs` - `EligibilityAndGrantPinOnePublishedExactVersionUntilRevoked`.
- [x] `backend/test/DataProvisioningDomainTests.cs` -
  `GrantUpgradeSupersedesPriorExactVersionWithoutErasingHistory`.
  The scenario now also preserves the Department access scope across an exact-
  version upgrade; it passed in the 2026-09-04 secondary-path regression run.
- [x] `backend/test/DataProvisioningDomainTests.cs` -
  `GovernanceQuarantineCanRestoreUnchangedContentOrWithdrawUnsafeContent`.
- [x] `backend/test/DataProvisioningDomainTests.cs` -
  `AffectedOrganizationAttestationPreservesEvidenceAndClosesOutstandingStatus`.
- [x] `backend/test/DataProvisioningProfileTests.cs` - production rejects
  synthetic fixtures even when incorrectly enabled.
- [x] `backend/test/DataProvisioningProfileTests.cs` - production never trusts
  files without a scanner integration.
- [x] `backend/test/DataProvisioningProfileTests.cs` - unconfigured scientific
  file kinds are rejected.
- [x] `backend/test/OrderManagementDomainTests.cs` - required and normalized Lab
  Job names, required and normalized job-level storage and safety values,
  shared-versus-mixed biological-source validation and normalization, trimmed
  optional Job notes, eight-character mixed Job numbers with ambiguous-
  character and offensive-fragment rejection, laboratory request/quote
  transitions, immutable request revisions, sample stages, quote expiry,
  price-proposal validation, frozen proposal metadata, approval-as-proposed,
  and reason-required price amendment.
- [ ] Laboratory pricing-profile controller coverage - prove an authorized
  Customer administrator may create a draft with no sample records, receives a
  unique generated Job number, must supply a case-insensitively unique Job name
  plus a complete source-count composition, storage, and safety profile, and
  may save optional Job notes and an optional positive two-decimal USD unit-
  price proposal with Customer-safe context. Prove submission requires zero sample records,
  inserts the first immutable request revision rather than treating it as a
  stale update, and retains tenant, role, duplicate-name, limit, idempotency,
  and genuine stale-version enforcement. After quote acceptance, prove manual
  and CSV sample entry use the server-owned `extracted_rna` material type and
  `tube` quantity unit and cannot be finalized until identifiers and source
  counts exactly comply with the accepted Job profile.
- [ ] Laboratory proposal-review controller coverage - prove quote issuance
  binds the designated `pseq-lab-service` line to the requested specimen count,
  records the source request revision, proposed-price snapshot, reviewer,
  decision type and time, requires an internal reason for an amended proposal,
  blocks proposer self-review when dual control is enabled, and leaves Jobs
  without proposals backward compatible. Prove incomplete billing does not
  block quote issuance or acceptance; a complete Finance-approved profile
  calculates and freezes quote tax (including a valid zero-tax decision), while
  an incomplete profile produces a pre-tax quote and defers the system tax
  calculation and billing snapshot until invoice issuance. Invoice issuance
  remains blocked until the current billing and tax profile is complete and
  Finance-approved.
- [ ] Unified Commercial intake query - prove `activeIntake` returns only
  pre-acceptance Customer laboratory, Partner kit-review, and Data Assembly
  pricing states and excludes held, accepted, or executing work. Held work
  remains governed by the separate Attention queue.
- [ ] Order-entitlement and Phaeno-recipient controller coverage - prove an
  effective, `Ready` PSeq Lab Service entitlement and active offering are
  required for Customer Job creation/submission/acceptance and Phaeno Job
  initiation/quote issue; an ended entitlement blocks new Jobs without
  silently invalidating an accepted snapshot. Prove Phaeno quote preparation
  sends no Customer notice, quote issue/revision targets every active eligible
  Customer administrator and fails when none exists, acceptance establishes
  the acting administrator, ordinary and high-impact fan-out remains distinct,
  and an early or unmatched package cannot enter the Customer order receipt or
  Lab-authorization path.
- [x] `backend/test/OrderManagementDomainTests.cs` - negotiated reagent price
  snapshots, effective quantity rules, destination restrictions, immutable
  placement confirmation, approved substitutions, partial shipment, and
  partial cancellation behavior.
- [x] `backend/test/OrderManagementDomainTests.cs` - assembly input-revision,
  quote, placement, and processing continuity.
- [x] `backend/test/OrderManagementDomainTests.cs` - operational-file scan and
  release gating, separate lab/assembly credit decisions, configurable quote
  validity, stable manual journal-entry source creation without changing the
  balance, failed-notification manual recovery, and recovery of an abandoned
  `Sending` notification only after its claim lease expires.
- [x] `backend/test/SampleShippingDomainTests.cs` - packet-barcode allocation,
  scanner framing and checksum rejection, deterministic compatibility and
  mandatory split rejection, effective revision boundaries, and immutable
  packet snapshots with void/replacement identity; supplier-tube barcode
  normalization, exact return-kit tube-count enforcement, tube-to-sample
  assignment, and supplier-barcode adoption by a submitted Lab container.
- [x] `backend/test/RelationshipManagementDomainTests.cs` - an approved request
  authorizes only its associated organization and requested service,
  onboarding-only requests cannot source service entitlements, and entitlement
  end reasons are required and retained; an existing entitlement can become
  Ready and attach its approved source without changing service identity;
  service eligibility is covered for Customer, Partner, Prospect, and Phaeno
  organizations.

## Created Database Verification

- [x] `backend/test/LabOperationsProviderPostgresTests.cs` - opt-in PostgreSQL
  provider conformance coverage for atomic authorization creation, exact command
  replay, conflicting command-ID reuse, safe/stale/unsafe amendments, full and
  partial pre-receipt cancellation, current projection lookup, Commercial
  organization isolation, prohibited commercial-field leakage, durable event
  replay, out-of-order projection rejection, customer-safe exception fields,
  and proof that `ReadyForRelease` creates neither a file nor a result release.
  The tests use `PSEQ_OPERATIONS_REFERENCE_CONNECTION`, require an already
  migrated database, and explicitly clean their run-specific Lab, Commercial
  projection, outbox, event-receipt, and audit fixtures.
- [x] `backend/test/LabOperationsCommercialHandoffPostgresTests.cs` - opt-in
  controller-path coverage proving an authorized Phaeno user can initiate an
  active Customer's price-bearing Job as an immutable submitted revision in
  `QuoteInPreparation`, the exact same initiation key/request replays one Job
  and one idempotency record, missing no-PHI attestation is rejected without
  creating a Job, an unrelated specimen-priced catalog item cannot satisfy the
  designated laboratory-service quote line, quote issuance requires neither a
  QuickBooks Customer link nor a completed billing profile, inserts the new
  quote instead of treating its client-generated ID as an existing row, and
  creates no QuickBooks estimate/outbox work, the shared idempotency boundary
  preserves replay status, rejects payload mismatch, and rolls back an
  intermediate business save, quote acceptance opens sample-roster preparation
  without creating Lab work, and roster finalization atomically creates and
  idempotently replays the Commercial authorization, Lab work, specimen, and
  shipping records. Provider
  rejection rolls the finalization back even after an intermediate save,
  accepted cancellation updates Commercial and Lab together, and started Lab
  work vetoes the decision without partially approving it. The rollback-
  isolated operator journey assigns additive Lab roles
  and exercises immutable-key protocol metadata editing,
  one-Draft protocol enforcement, Approved protocol replacement,
  receipt/accession and barcode-print history,
  including automatic submitted/derived barcode allocation, readable protocol
  keys, library keys derived from their container barcodes, scanner-safe batch
  numbers, Code 39 scan normalization, reasoned initial/reprint/failure outcomes
  without false print increments, exact submitted/library lineage lookup, and
  duplicate-safe scan-first batching; QC-approved materials, calibrated
  equipment, system-assigned equipment asset codes, date-only calibration
  sequencing, execution, library lineage, NGS sendout/custody, exception
  resolution, scientific approval, customer-safe projection delivery, and proof
  that Ready for release creates neither a managed file nor a Lab result release.
  The guided-execution extension rejects invalid definitions, empty and forged
  completion results, wrong-role and stale step writes, and step/resource
  evidence on held jobs. It saves a QC hold, appends a supervisor correction,
  checks retained actors/attempts, and completes using persisted evidence.
  The fixture uses unique
  Customer/Phaeno identities and removes its Commercial, Laboratory, shipping,
  account, idempotency, notification, and audit records. All thirteen sources
  compiled with zero warnings or errors on 2026-08-27; tests were not requested
  and were not run.
- [x] `backend/test/SampleShippingPostgresTests.cs` - opt-in authenticated
  controller/PostgreSQL coverage for destination, sample-type, and combination-
  rule revisions; active-rule overlap rejection; return-kit registration and
  fulfillment; global supplier-barcode uniqueness; tenant-scoped assignment,
  correction history, and non-discovery; frozen destination, instruction,
  manifest, and tube-crosswalk snapshots; CSV crosswalk output; concurrent
  first-packet uniqueness; malformed, unknown, voided, mismatched, expected,
  and repeated packet-plus-tube scan outcomes; exact registered supplier-
  barcode adoption at Lab accession; and repeated-accession denial. The fixture
  uses `PSEQ_OPERATIONS_REFERENCE_CONNECTION`, verifies a fully migrated
  database, and removes its run-specific shipping, Lab, account, configuration,
  and audit records. The suite passed against the local `phaeno_ops`
  development database on 2026-08-18.
- [x] `backend/tools/PSeq.Operations.ReferenceJourney` - controller-level
  authenticated PostgreSQL journey covering approved service-request source
  enforcement, rejection of an onboarding-only source, usable entitlement
  derivation, history-preserving entitlement end, synthetic source authoring,
  authoritative managed upload/scan, readiness, immutable snapshot/checksum,
  publication, eligibility, idempotent exact-version Prospect assignment,
  tenant list/detail and file/archive downloads, audit history, cross-tenant
  non-discovery, revocation, transaction rollback, and temporary-file cleanup.

## Deferred Tests

- [ ] Development invitation sign-in link - cover Development-only endpoint
  registration, authorized pending-invitation token rotation and audit without
  raw-link persistence, inactive/non-pending rejection, tenant denial, and the
  production not-found boundary.

- [ ] Internal Web Operations dashboard endpoint - cover authenticated Phaeno
  platform-administrator access, external and non-admin denial, total counts,
  five-item bounds, newest-first mailing-list ordering, deterministic
  demo-request ordering, and response-envelope serialization. Cover the
  additive mailing-list and demo-request endpoints for their fixed 10-item
  pages, boundary-page normalization, stable ordering, totals, and the same
  authorization rules. Cover the platform-admin-only unsubscribe and complete
  endpoints, missing-record responses, idempotent retries, actor/time capture,
  audit events, immediate active-count/list filtering, and page normalization
  after the final item on a page leaves its queue.
- [ ] Public Website intake language metadata - cover contact and demo-request
  submissions with canonical locales, supported regional variants, omitted
  values, and unsupported values; verify canonical persistence for both tables
  and the backward-compatible `en-US` fallback. Cover technical-brief Mailgun
  template selection and localized `technicalBriefPath` resolution for every
  supported locale, including the legacy single-URL fallback.
- [x] CRM domain foundation - cover Company normalization, validation, and
  record-preserving lifecycle; Contact normalization and merge identity; Lead
  qualification/conversion identity; Pipeline terminal rules; Opportunity
  close/reopen behavior; Task state; immutable Portal activities; typed custom
  fields; and effective-dated Company/Contact history, including the
  Company-specific job title. Company access-scope uniqueness and transfer
  during a merge are also covered. The focused tests are maintained in
  `backend/test/CrmCompanyDomainTests.cs`.
- [x] Controller route materialization - build the complete MVC controller
  endpoint collection so reserved route-token conflicts and other startup-time
  route-construction failures are caught before runtime. Coverage is maintained
  in `backend/test/ControllerRouteTests.cs`.
- [ ] Remaining first-party CRM foundation - cover Company API authorization,
  list/search/pagination, duplicate-name handling, concurrency, audit and
  scientific-data exclusion; then Contact, multi-company contact
  association, Lead, Opportunity, configurable Pipeline/Stage, ownership,
  relationship-title projection and legacy-title migration,
  Activity, Note, Task, reminder, saved-view, custom-field, import/export,
  duplicate detection, controlled merge, search/report projection, optimistic
  concurrency, soft deactivation, authorization, field visibility, audit, and
  scientific/protected-data exclusion.
- [ ] CRM/Portal lifecycle - cover explicit Company Portal-access proposal,
  pending onboarding with no access, approval that creates exactly one internal
  tenant scope, direct Customer/Partner Company creation, designated-admin
  invitation, service entitlements,
  Trial Project and custom-work handoffs, Customer/Partner reclassification,
  offboarding review, idempotent retries, relationship-safe summary
  publication, reconciliation, and domain authority.
- [ ] CRM committed-sale publication - cover one relationship-safe summary per
  committed specimen, reagent, or assembly sale; no routine Opportunity
  creation; Company and originating-Opportunity associations when present;
  amount/currency/status/payment summaries; cancellation/refund history; retry
  without duplication; and POMS/accounting-system authority over CRM projections.
- [ ] Direct configured-price work - cover entitled Customer and Partner
  specimen placement, Partner data-assembly placement, ineligible/custom-work
  routing, immutable pricing snapshots, Partner downstream-identity omission,
  post-placement scientific validation, and cross-tenant denial.
- [ ] Complete Lab Operations API negative paths - extend the passing
  controller/PostgreSQL operator journey with hosted-HTTP unknown-barcode,
  Lab-owned commercial-order-to-work resolution before authorization and
  missing-authorization consistency checks, unified Commercial order-list type
  filtering, Lab-role authorization for the explicit kit, assembly, and shipment
  manufacturing API allowlist, denial of quote, cancellation, sample-shipping
  configuration, and other Commercial actions through the Lab namespace,
  lineage rejection, stale-version conflict, parallel protocol-candidate
  rejection, invalid draft/approval transitions, expired material, overdue
  calibration, wrong-work-order batch/custody, unresolved blocking exception,
  and cross-tenant HTTP/authentication scenarios. Also cover canonical
  marketed-service workflow uniqueness, ordered Required/Optional/Conditional
  stage persistence, workflow promotion with exact Approved protocol versions,
  historical protocol pinning, and rejection of a protocol
  or later stage outside the pinned workflow.
- [x] Completion-aware released-download foundation - create domain coverage for
  immutable `Started` to terminal transitions, successful retention counting,
  rejection of non-success counting, partial range success remaining
  non-counting, whole-package completion across every file, active versus
  expired lease projection, manifest file identity, concurrency-token mapping,
  and package-query indexes. The focused tests were created on 2026-08-19 but
  were not executed because test execution was not requested.
- [ ] Hosted completion-aware download API - prove Customer and Partner tenant
  authorization, transfer creation before storage open, normal individual and
  ZIP response completion, partial range and disconnected response behavior,
  bounded timeout reconciliation, first-terminal-writer concurrency, external
  projection privacy, and cross-tenant non-discovery through the real HTTP and
  PostgreSQL path.
- [ ] Global released-deliverable retention - cover validated global 30-day
  retention, 5-day warning-lead, and 5-day grace defaults; optional Customer-,
  Partner-, and Prospect-organization overrides with partial inheritance,
  required reasons and audit history; authorization denial for external users;
  resolution and source/version snapshot at package release; global or
  organization changes affecting only later releases; exact UTC calculations
  using 24-hour configured-day intervals across daylight-saving transitions
  with no midnight/end-of-day rounding; successful individual
  versus complete-archive download accounting; one authorized member download
  satisfying the organization without per-user completion; later membership
  change preserving that event; failed, cancelled, unauthorized, and internal
  Phaeno downloads not counting; no warning and standard-deadline access close
  plus atomic package-byte deletion queueing when all files were downloaded;
  download denial at the exact applicable deadline even while byte deletion is
  pending or retrying; a pre-cutoff file or archive lease finishing successfully
  after the cutoff and counting only on stream completion; strict denial when
  lease creation would commit exactly at the cutoff; partial file and archive
  streams counting nothing; failed, cancelled, disconnected, and timed-out
  leases not counting; denial of new, retry, range-resume, and archive requests
  at or after cutoff; an incomplete lease at the standard deadline activating
  grace despite later completion; simultaneous eligible leases delaying physical
  deletion only until every lease terminates or reaches its original expiry,
  without renewal, reopened access, changed grace/final dates, or a premature
  cleanup failure; an operational lease-duration change affecting only new
  leases; restart reconciliation to a non-counting terminal outcome with no
  resume right; emergency
  quarantine, withdrawal/correction, membership deactivation, and organization
  deactivation each revoking a matching active lease, stopping further stream
  delivery, recording a non-counting `Revoked` outcome, and not depending on the
  retention-worker interval; durable completion/revocation ordering where the
  first committed terminal transition wins, client time is ignored, and restored
  access permits only a fresh pre-deadline request; one de-
  duplicated warning to all active organization administrators, grace
  activation and notice, full grace despite a later download, and final-deadline
  access close plus atomic package-byte deletion queueing when any file was
  undownloaded; idempotent retries, notification failure without deadline
  extension, no-active-administrator urgent Operations work without deadline
  extension, authenticated package-detail links with no bearer secret,
  attachment, or direct download URL, authorization recheck on arrival,
  exactly one warning plus one grace email and no recurring reminders; delayed
  warning suppression when all files succeed before outbox creation, with no
  recall after outbox creation; warning-state clearance when all files are
  downloaded before grace; activated grace persisting despite later download;
  preservation holds protecting bytes without extending access, resetting the
  clock/notices, or delaying deletion after an overdue hold is released;
  correction immediately
  withdrawing the superseded package, independent old-package retention/
  deletion, a fresh effective-policy snapshot/clock/download state/notices for
  the corrected package, old downloads not satisfying the correction, retained
  metadata/audit, no customer restore operation, authorized regeneration only
  when source material exists, a new linked immutable reissue with Phaeno actor/
  reason and fresh effective policy, the deleted release remaining unchanged,
  permanent receipt generation before and after byte deletion, tenant admin
  access to downloader names plus attempt start/completion timestamps and
  outcomes, including a post-cutoff success's pre-cutoff authorization;
  ordinary-member status without member-level audit, exclusion of file contents/
  scientific values/internal notes/network telemetry/storage identifiers,
  distinct access-closed and actual byte-
  deletion timestamps, overdue cleanup escalation without renewed access,
  equivalent Portal/PDF data with PDF generation timestamp and represented
  state, no initial CSV route, and Trial/
  Customer/Partner frozen file-lineage snapshots. Cover sample-scoped mapping to
  non-PHI Customer sample ID, original submitted-tube supplier barcode, and
  Phaeno accession; complete included-sample membership for combined/project-
  level files; no false single-sample mapping; exclusion of derived-container
  barcodes; and tenant isolation.
- [ ] Prospect Trial Projects - cover idempotent commercial-only CRM request
  intake, rejection or exclusion of scientific fields from that boundary,
  POMS-owned scientific scoping, relationship-safe outbound milestones and deep
  links, dual approval with default CBO/COO authority, domain-specific delegate
  designation and revocation, primary-versus-delegate attribution, denial outside the
  authorized domain, retained actor/authority/reason/timestamps, both decisions
  still required under delegated coverage, rejection when one dual-authorized
  user attempts both affirmative decisions, two different acting users required
  for initial and amended scope versions, later delegate revocation preserving
  valid historical approvals, frozen scope/amendments, Prospect acceptance,
  versioned RUO/no-PHI affirmation at project acceptance and shipment
  confirmation, structured PHI/direct-identifier rejection, restricted hold
  without sensitive propagation into logs, audits, notifications, or CRM,
  blocked receipt progression/processing/release until authorized disposition,
  project-specific
  submit authorization, extracted-RNA-only validation, enforcement of each
  project's frozen approved sample allowance,
  deadlines/analyses, eligible shipping destinations, versioned detailed
  instructions, immutable packet allocation/void/replacement, scan-first
  read-only Lab-work resolution, partial receipt, schedule updates without a
  fixed turnaround SLA, member
  view-versus-submit behavior, configurable deliverable catalog with
  FASTQ/FASTA/BAM as
  the current default selection, exact deliverable/version snapshots at
  approval, catalog/default changes affecting only future projects,
  deliverable changes after approval requiring amendment/reapproval, default
  changes not rewriting approved projects, the package-retention clock starting
  only when the project's complete frozen result package is released, effective
  global-plus-Prospect-organization policy snapshot with no project-level
  override, result
  release without payment, replacement approval and
  original-sample lineage, exactly one restored slot after a Phaeno-caused
  processing failure, no automatic restoration for a Prospect-supplied sample
  problem, an explicit recorded Phaeno exception, no silent allowance rewrite,
  configurable 30-day residual-material default, immutable project-specific
  retention/disposition snapshot, future-only configuration changes, retain-
  until calculation at terminal closure, no automatic disposition, authorized
  exhaustion/destruction recording, pre-first-shipment return approval with
  destination/handling/payer, separate return tracking, post-shipment return
  denial, controlled-hold suspension, and rejection of material reuse without a
  separate written-authorization workflow,
  complete-package enforcement before `Completed`, a required reason for the
  `Closed incomplete` outcome, separate final CRM outcomes, required
  owner/date for nonterminal follow-up, denial of automatic conversion from any
  CRM outcome, explicit authorized POMS conversion, terminal states, CRM
  summary retry,
  conversion preservation without resetting or extending the frozen standard
  or final package-deletion deadline, byte deletion with retained project/
  result/audit history, no automatic organization deactivation on package
  deletion, rejection of deactivation while another active
  Trial Project, grant, or commercial relationship exists, explicit audited
  Phaeno closeout deactivation, retained internal estimated retail value and
  anticipated cost, no QuickBooks records or outbox work through the complete
  journey, continuity during QuickBooks unavailability, normal-order denial,
  and cross-tenant metadata/file/result isolation.
- [ ] Remaining sample-shipping hosted HTTP and Customer freebies - exercise the
  shared journey through the real ASP.NET authentication middleware and API
  envelope after an owning authorization can create the shipment; then cover
  one-time named-Customer promotional grant consumption, no-charge placement
  and Lab authorization atomicity, and absence of a payment gate or
  manufactured QuickBooks invoice by default.
- [ ] Clerk JWT authentication - validate issuer, audience, signature, and expiry with integration-level test coverage.
- [ ] Session/bootstrap endpoint - cover unauthorized, disabled, no active memberships, organization unavailable, and ready states with database-backed endpoint tests.
- [ ] Invitation endpoints - cover required invited first/last name, intended
  Phaeno Laboratory-role persistence, non-Phaeno Laboratory-role rejection,
  roleless-Phaeno-invitation rejection, create, resend cooldown, pending
  replacement, inactive organization rejection, disabled user rejection, and
  active membership rejection.
- [ ] Membership endpoints - cover deactivate, leave, promote, demote,
  administrative self-deactivation denial, cross-org denial, Phaeno-org denial
  for customer admins, and last-admin protection. Pure authorization coverage
  confirms that an administrator may deactivate another membership but not
  their own.
- [ ] Platform lifecycle endpoints - cover organization deactivate/reactivate,
  user disable/reactivate, self-disable denial, platform-admin-only access, and
  last-platform-admin protection. Pure authorization coverage confirms that a
  platform administrator may disable another account but not their own.
- [ ] User read/list endpoints - cover self read, platform read, org-admin organization list, active-default filtering, inactive include filter, and forbidden cross-org access. Cover the consolidated Phaeno user projection/update endpoint for platform-administrator and Lab Operations Administrator access, profile edits, Platform administrator promotion/demotion with last-admin protection, exact additive Lab-role replacement, inactive-user rejection, optimistic versions, and forbidden non-role/profile changes by a Lab-only access administrator.
- [ ] Invitation acceptance/decline endpoints - cover verified email match,
  token hash lookup, single-use behavior, expired/revoked/declined rejection,
  membership activation, and atomic activation of intended Phaeno Laboratory
  roles without granting them while pending.
- [ ] Account domain model - cover Phaeno and Customer organization kinds.
- [ ] Account domain model - cover multi-organization memberships and selected organization authorization gates.
- [ ] Account domain model - cover organization admins managing memberships in their own organization.
- [ ] Account domain model - cover non-admin customer users not managing memberships in their own organization.
- [ ] Account domain model - cover Phaeno platform admins managing customer organizations through platform admin flows.
- [ ] Account lifecycle - cover users, organizations, and memberships marked inactive rather than hard-deleted.
- [ ] Bootstrap seed - cover first Phaeno organization/admin creation and one-time Clerk identity linking with database-backed tests.
- [ ] Clerk Production bootstrap cutover - database-backed coverage for the
  production-only command, sole-linked-user guard, verified-email requirement,
  idempotent replay, audit event, and refusal when any other Portal identity is
  linked.
- [ ] Data provisioning HTTP host - extend the passing controller/database
  journey through the real ASP.NET authentication middleware and API envelope.
- [ ] Managed files - add endpoint coverage for configured file-kind rejection,
  scanner unavailable/rejected states, and missing-byte behavior. The reference
  journey covers authoritative checksum/size and isolated storage cleanup.
- [ ] Order-management authenticated HTTP/PostgreSQL journey - cover Customer,
  Partner, Prospect, Phaeno, cross-tenant non-discovery, optimistic concurrency,
  idempotency, file ownership, download audit, and outbox atomicity through the
  real API host. Include adding and reconciling Job biological-source rows on an
  existing draft without treating new child records as stale updates.
- [ ] Manual accounting API/PostgreSQL journey - cover Phaeno-only authorization,
  inclusive UTC date filtering, stable entry IDs, laboratory completion,
  assembly output approval, per-shipment reagent rows, source references,
  exclusion of historical provider-created documents, 366-day and 10,000-row
  limits, repeat-download non-posting, CSV formula neutralization, and cross-
  tenant non-discovery. QuickBooks adapter/webhook contract coverage is
  deferred with the integration.
- [ ] Notification dispatcher integration suite - cover acting-admin versus
  all-admin recipient rules, Mailgun failure, bounded retry, and manual retry.

## Remaining Coverage

- [ ] Remaining relationship management - cover authorized CRM and
  platform-admin boundaries,
  Company access-scope creation with persisted readiness, organization summary
  derivation, readiness concurrency, service eligibility by organization kind,
  entitlement overlap and all effective boundaries, required
  completed-organization association for a
  pre-organization request, request state transitions, controller routing under
  one `/api` prefix, first-party CRM Company/Opportunity correlation,
  path-specific organization/service validation, request idempotency, the
  Company proposal's Prospect/Customer/Partner and service validation,
  provider-neutral source mapping, and the guarantee that intake alone creates
  no organization, invitation, entitlement, order, or Trial Project. Cover
  atomic approval plus
  access-scope creation for Company onboarding/evaluation requests, including
  supported kind validation, duplicate-name and stale-version rejection,
  durable request association, Pending readiness, rejection of products or
  services on online-access intake, unchanged entitlements, and the guarantee
  that it creates no invitation or order and does not mark the request applied.
  Retain coverage of the legacy access-scope lookup as a deep-link recovery path.
- [ ] Guarded exact-name access-scope recovery - add focused PostgreSQL coverage
  proving the first attempt returns a confirmation candidate, the confirmed
  retry links only the same active, unlinked, kind-compatible scope, and
  changed, linked, inactive, or kind-mismatched candidates are rejected without
  mutation.
- [x] Customer Lab ordering eligibility - focused PostgreSQL coverage verifies
  that Phaeno initiation requires a current `Ready` entitlement, sends no
  Customer notice during quote preparation, permits pricing before Customer
  administrator activation, blocks quote issuance until that administrator is
  active, and then queues quote issue for all active Customer administrators.
  Canonical item identity/quantity and idempotent initiation coverage remain in
  the same reference journey.
- [ ] Remaining relationship management persistence - cover audit
  actor/time/version stamping, existing-organization readiness migration
  default, and request-number uniqueness.

- 2026-07-15: portal hardening verification ran `dotnet test
  backend/PhaenoPortal.slnx --no-restore`; all 66 tests passed. The rollback-only
  PostgreSQL reference journey also passed with approved-request service
  matching and history-preserving entitlement end coverage.

- 2026-07-14: order-management implementation verification ran `dotnet test
  backend/PhaenoPortal.slnx --no-restore`; all 63 tests passed.
- [ ] Tenant curated data - add selected-organization missing/invalid cases,
  deactivation denial, and non-admin download-history denial. The reference
  journey covers cross-tenant non-discovery, revocation, individual/archive
  audit records, and organization-admin history.
- [ ] Production policy - cover synthetic rejection and empty production
  file-kind/scanner configuration at readiness, publication, eligibility, and
  grant boundaries.
- [ ] Advanced provisioning HTTP workflows - cover organization creation with
  optional grants, retry, exact-version upgrade, retirement, catalog removal,
  bulk revocation, durable notice dispatch/retry, and retired-grant access.
- [ ] Governance HTTP workflows - cover source-wide quarantine, publication
  denial during an open incident, internal-note non-disclosure, unchanged-content
  clearance, unsafe withdrawal, investigation-purpose audit, reminders, and both
  attestation sources with database-backed authorization coverage.

## Requested Execution Log

- 2026-08-29: PSeq order-to-cash verification passed all 13 focused domain and
  persistence tests. The full solution passed 169 tests with 10 opt-in
  PostgreSQL tests skipped and no failures. The Release solution build passed
  with zero warnings and zero errors. EF Core reported no model changes after
  `AddPSeqOrderToCashGapClosure`. No database was migrated in this task;
  restored-production-like migration/backfill, webhook concurrency, and live
  PostgreSQL/API acceptance remain activation gates.
- 2026-08-07: added source coverage for the credential-free production
  `DisabledFileStorage` DI selection and its fail-closed storage behavior.
  `dotnet build backend/PSeq.Operations.slnx --configuration Release
  --no-restore` compiled all projects with zero warnings and zero errors.
  The focused Release `FileStorageTests` and `ApiResponseTests` run passed all
  12 tests, including HTTP 503 mapping. Its first run exposed and then corrected
  a Windows file-handle lifetime defect in the pre-existing local round-trip
  test; the storage implementation was unchanged.
- 2026-08-07: provider-neutral local/S3 file-storage verification ran `dotnet
  build backend/PSeq.Operations.slnx -c Release --no-restore` with an isolated
  artifacts path; all projects, including the new storage test source, compiled
  with zero warnings and zero errors. Backend tests were not requested and were
  not run. The S3 adapter was not exercised against a live production bucket.
- 2026-07-18: one-open-protocol-candidate lifecycle verification compiled the
  complete solution, including updated domain and PostgreSQL journey coverage,
  with zero warnings and zero errors using an isolated output path while the
  local API was active. `dotnet ef migrations has-pending-model-changes`
  confirmed that the string-backed status and lifecycle operations require no
  schema migration. Backend tests were not requested and were not run.
- 2026-07-18: system-owned Lab identifier verification ran `dotnet build
  backend/PSeq.Operations.slnx -c Release --no-restore`; all projects,
  including the updated test sources, compiled with zero warnings and zero
  errors. The Debug build could not replace assemblies held by the active
  Visual Studio/IIS Express session. Backend tests were not requested and were
  not run.
- 2026-08-22: Job-profile-first pricing and post-acceptance sample-roster
  coverage was added for domain sequencing and strict CSV parsing, including
  text-preserved identifiers, quoted commas, single-source inheritance, and
  committed count/source mismatches. Follow-on hosted PostgreSQL coverage must
  exercise atomic CSV replacement, finalization rollback, authorization plus
  shipment creation, multi-tube accession, and legacy one-tube compatibility.
  The API and module projects compiled with zero warnings and errors; tests
  were not requested and were not run.
- 2026-07-18: Web Operations unsubscribe and demo-completion lifecycle changes
  passed the full solution build with zero warnings and zero errors. The
  additive migration was generated and applied to the local `phaeno_ops`
  development database. Backend tests were not requested and were not run.
- 2026-07-17: the additive Phaeno-admin Web Operations dashboard read endpoint
  passed a full solution build with zero warnings and zero errors by using an
  isolated output path because the normal Debug assemblies were locked by the
  active Visual Studio/IIS Express session. Backend tests were not requested
  and were not run.
- 2026-07-16: barcode completion verification ran the full Release backend
  suite with the local PostgreSQL reference connection enabled; all 113 tests
  passed with no failures or skips. A separate Release build completed with
  zero warnings and zero errors. Coverage now includes POMS allocation and
  checksum normalization, submitted/derived scan context, reasoned successful
  and failed label attempts, non-incrementing failures, and duplicate-safe
  batch membership.
- 2026-07-16: database-backed Lab verification ran the five provider/projection
  and five Commercial handoff/operator PostgreSQL tests together against the
  migrated local `phaeno_ops` database; all 10 passed. The complete focused Lab
  run passed 37 of 37 tests, and the full backend regression run passed 107 of
  107 tests with no failures or skips. The new rollback-isolated operator
  journey exposed and fixed new-aggregate state tracking during authorization
  amendment, optional Lab text rejecting `null`, a zero-service test fixture,
  and formatting-sensitive JSON comparison. PostgreSQL reference classes now
  run serially to avoid invalid cross-fixture serialization races.
- 2026-07-16: the Commercial-to-Lab handoff slice added four opt-in PostgreSQL
  controller scenarios and ran `dotnet build
  backend/PSeq.Operations.slnx --no-restore`; all projects compiled without
  warnings or errors. Test execution was not requested and was not run.
- 2026-07-16: the Lab role-authorization slice added shared request/session
  capability policy and focused unit coverage, then ran `dotnet build
  backend/PSeq.Operations.slnx --no-restore`; all projects compiled without
  warnings or errors. Test execution was not requested and was not run.
- 2026-07-16: the Lab projection-coverage slice added the fifth opt-in
  PostgreSQL conformance test and ran `dotnet build
  backend/PSeq.Operations.slnx --no-restore`; all projects compiled without
  warnings or errors. Test execution was not requested, so the new database-
  backed scenario was not run.
- 2026-07-16: Lab Operations completion verification ran `dotnet build
  backend/PSeq.Operations.slnx --no-restore`; the solution, including the new
  domain and test sources, compiled without warnings or errors. The three
  completion migrations were generated and applied successfully to the local
  `phaeno_ops` development database. Automated tests and opt-in PostgreSQL
  provider conformance tests were not requested and were not executed.
- 2026-07-16: clean-baseline verification ran `dotnet build
  backend/PSeq.Operations.slnx --no-restore` and `dotnet test
  backend/PSeq.Operations.slnx --no-build`; the build completed without warnings
  or errors and all 69 tests passed with no skips or failures. The rebuilt local
  Development database bootstrapped successfully, `/api/health` returned HTTP
  200, and the PostgreSQL reference journey passed while preserving exact table
  counts after rollback.
- 2026-07-14: completion-slice verification ran `dotnet test
  backend/PhaenoPortal.slnx --no-restore`; all 48 tests passed with no skips or
  failures.
- 2026-07-14: next-slice verification ran `dotnet test
  backend/PhaenoPortal.slnx --artifacts-path backend/.tmp/reference-artifacts`;
  all 45 tests passed. Isolated artifacts avoided the app DLL held by the
  active Visual Studio/IIS Express session.
- 2026-07-14: the PostgreSQL reference journey passed against the configured
  development database. Fixture rows were rolled back and temporary managed
  storage was removed.
- 2026-07-14: implementation verification ran `dotnet test
  backend/PhaenoPortal.slnx`; all 43 tests passed. The existing lowercase
  `initial` migration-name compiler warning remains unchanged.
- 2026-08-28: Customer PSeq Lab Service CRM handoff-to-order verification ran
  the complete backend suite through isolated artifacts against the migrated
  local PostgreSQL database; all 240 tests passed with no failures or skips.
  Coverage includes atomic Order creation/request application, immutable source
  linkage, duplicate prevention, rejection while a linked Opportunity is not
  Won, idempotent initiation, quote creation, and cleanup-preserving Commercial,
  Lab, and shipping reference journeys.
- 2026-08-28: Opportunity identity verification built the API through isolated
  artifacts and ran the focused CRM domain suite; all 13 tests passed with no
  failures or skips. Coverage confirms the readable Opportunity Number format,
  1,000 generated values without duplication, and the controlled PSeq Lab
  Service/PSeq Kit product-interest domain. Migration
  `20260828234907_AddCrmOpportunityNumber` was applied successfully to the local
  development PostgreSQL database, including deterministic legacy backfill and
  the database unique index.
- 2026-09-01: the Company-as-canonical-customer change passed the Release API
  build and EF pending-model check. Migration
  `20260901162409_FoldPortalAccountsIntoCrmCompanies` was applied to the local
  development database. The Release backend suite passed 234 tests with no
  failures; 27 opt-in database tests remained skipped under the default test
  configuration.
- 2026-09-03: controlled service-workflow implementation verification compiled
  the Release API and test project through isolated output directories without
  warnings or errors. EF reported no model changes after migration
  `20260903160117_AddControlledLabServiceWorkflows`; that migration was backed
  up and applied to the local `phaeno_ops` database, and its three workflow
  tables were verified. Automated tests were not requested and were not run.

The commit-evidence migration refuses rollback while evidence exists; the isolated
database test verifies refusal preserves every evidence row. The additive
migration also applied to the guarded local development `phaeno_ops` database;
no shared database or server configuration changed.

### Released lifecycle closeout (2026-09-05)

`ReleasedDeliverableLifecyclePostgresTests.cs` extends the isolated retention
fixture with immutable hold/reissue validation, Lab/Assembly lease and hold
blocking, partial-provider deletion retry/idempotency, shared-source deferral,
governed artifact cleanup with retained evidence, cross-connection quarantine
revocation, stale version recovery, tenant/auditor privacy and new-object reissue
lineage. Fixtures use synthetic storage and uniquely named loopback databases.
Full regression execution is authorized for this closeout. Shipping fixture
cleanup now deletes its Department assignments/departments before organizations.

## Guided protocol completion checkpoint (2026-09-05)

The focused command passed **79 tests, zero failed or skipped**:

```powershell
dotnet test backend/test/PSeq.Operations.Test.csproj --no-restore --artifacts-path .artifacts/protocol-completion --filter 'FullyQualifiedName~LabProtocolExecutionTests|FullyQualifiedName~LabOperationsDomainTests|FullyQualifiedName~PSeqOrderToCashDomainTests|FullyQualifiedName~LabOperationsAuthorizationTests|FullyQualifiedName~AuthorizedOrderCompletesTheDatabaseBackedLabOperatorJourney'
```

The existing opt-in reference connection was supplied from development settings
only after verifying `localhost` and database `phaeno_ops`. The controller
journey uses its established isolation and cleanup. This is local PostgreSQL
proof; shared databases, migrations, deployments, and physical acceptance were
outside this completion run. The solution compiled with no warnings or errors
using the isolated artifact directory.

The final compatibility regression verifies that absent optional procedure
fields remain omitted in saved JSON, so draft resume and formal review retain
the portable authoring format.

## Trial integration checkpoint (2026-09-05)

`TrialProjectDomainTests` and `TrialProjectPostgresTests` cover immutable scope,
two-person approval and revoked authorities, RUO/no-PHI coded samples, allowance
and windows, amendments, one-use replacement lineage, residual-material terms,
first-party CRM outbox retry/deduplication, exact organization/department access,
organization-admin acceptance, Lab authorization and shared shipments without
paid orders, real Lab scientific approval, complete versus partial release,
conversion without changed deadlines, parent holds, commercial closeout and
Prospect deactivation blockers. The combined lifecycle journey verifies warning,
grace, held cleanup, actual artifact deletion metadata and explicit reissue with
new objects and a distinct scientific approval.

The full backend suite includes PostgreSQL reference journeys. Use a local
`phaeno_ops` source with `track_commit_timestamp=on`; concurrency tests create and
remove their own isolated databases. Merely supplying a differently named source
or a server without commit tracking does not meet those tests' prerequisites.
Final execution evidence is in `TRIAL-INTEGRATION-CLOSEOUT.md`. Production
mailbox/scanner/storage and physical acceptance remain separate.


## Portal consistency regression coverage (September 7, 2026)

Authorized implementation covers all 20 review items. Added `OrderReadinessConfigurationDomainTests` for arbitrary/malformed JSON and contradictory/duplicate property rejection, supported modes and atomic failed updates; `PaymentImportBatchDomainTests` for owned, unconfirmed corrections; and `AccountsReceivableEvidencePostgresTests` for protected scanned evidence, retired arbitrary-key writes, upload retries/cleanup, corrected previews, ownership/concurrency, duplicate confirmation, deactivated Customers and malformed CSV. Reagent domain coverage verifies draft purchase/delivery retention without placement requirements.

Source review additionally traces held intake visibility, canonical CRM request completion/conversion, contextual Contact association, paid roster/shared-shipment tracking, Assembly file correction/idempotency, result identity/retention and Lab authorization. New PostgreSQL tests are opt-in and require the existing isolated test database setup. Test suites were not requested and have not been executed in this implementation turn. Build and browser evidence is recorded separately in the implementation tracker.

The production preparation review adds `UnconfiguredQuickBooksGatewayTests`: all unconfigured catalog/create/read operations must fail with `503 quickbooks_not_configured`, and cancellation must remain `OperationCanceledException`. The unconfigured dispatcher immediately records NeedsAttention instead of retrying fabricated success. These two regression cases have not been executed. Release solution compilation passed with zero warnings and zero errors on September 7, 2026; compilation is not test execution.

Final source review adds opt-in `AssemblyUploadPostgresTests` for a failed idempotent save rolling back its input and cleaning up uncommitted bytes, followed by a retry retaining one input. `DepartmentSecondaryPathPostgresTests.RelationshipReadinessUsesPendingConversionWithoutSavingItEarly` verifies readiness uses the authorized tracked Customer conversion while the database still contains the prior Prospect kind. Both preserve transaction boundaries; neither regression has been executed.

## Quote PDF sample-scope verification — September 10, 2026

Focused renderer coverage checks the biological-source names, per-source counts,
total sample count and saved pricing on the same representative page; many rows
and a source longer than a page retain all text with repeated headers and bounded
text. PostgreSQL download coverage checks immutable request-revision selection,
quote-linked standard placement, omitted unrecorded legacy scope, inconsistent
count rejection and unchanged tracked data. Existing quote access, historical
status, commercial immutability, branding and billing tests remain in scope.

Local verification: 16 focused renderer and PostgreSQL download tests passed,
including historical scope and unchanged data. The representative one-page PDF
and all six pages of the long-source stress PDF were visually reviewed. The
scope heading and count share a shaded band attached to the source table; pricing
headers retain room for the first item. Documentation generation and freshness
checks passed (56 guides); whitespace checks passed. No commit or deployment.

### Container receipt and accession separation — September 10, 2026

Regression coverage: each expected container has its own tracking row; PH-P- receiving is an explicit write; repeat scans preserve one receipt/event; unrelated identifiers and void/cancelled inserts cannot receive; container arrival leaves tubes unaccessioned; Accession samples uses read-only lookup and individually saves tube accession. Verify queue movement, permissions, multi-container Jobs, missing tracking, retry, tab navigation and final-tube removal. Backend reference journey and frontend navigation assertions updated; automated suites are unrun by request scope. Manual browser and physical scanner acceptance remain pending. No real shipment is received merely to verify this feature.

Verification: solution build passed with zero warnings/errors using a separate output folder because Visual Studio/IIS Express held the normal output files. Frontend TypeScript, scoped ESLint, documentation freshness (56 guides) and whitespace passed. Read-only signed-in local browser inspection confirmed the separate tabs, two expected container rows with distinct tracking numbers for 69SJN4PA, and a received HS5Y7DB7 container showing 0/18 tubes accessioned. Desktop screenshot review passed. The agent did not submit receipt or accession. Automated suites, narrow/dark layouts, physical scanner and completed tube-accession acceptance remain unrun. The existing shipping insert files have no additional working-tree diff from this work.

## Container accession loop — 2026-09-10

Coverage: PH-P opens complete container modal; each tube opens required freezer-box prompt; no accession before valid save; progress and scan focus repeat until completion; wrong tube blocked; same-tube/same-box replay creates one container/event; different-box replay rejected. Component and PostgreSQL coverage updated. Automated suites not run (not requested). Physical scanner, nested-modal keyboard behavior, partial resume and populated save journey remain manual acceptance gates.


Release checkpoint (September 10): 87 focused backend cases pass in an isolated
PostgreSQL database; 315 frontend cases pass across 30 affected suites. Four
focused browser print checks pass with two intentional mobile-label skips.
Letter/A4 receiving sheets and 50 x 25 mm lab label output were visually reviewed
and independently QR-decoded. See
[release evidence](PORTAL-LAB-PROGRESS-RELEASE-2026-09-10.md) for local fixture
failures, artifacts and outstanding physical/production acceptance gates.

## Focused execution checkpoint — September 11, 2026

LabTubeIntakeTests, LabSpecimenAttemptTests, LabWorkflowPromotionTests, LabWorkflowInvalidationTests and LabProtocolRetirementTests passed: 23 tests, zero failures/skips. Earlier authored/not-run entries describe the prior checkpoint. PostgreSQL acceptance/concurrency suite remains unrun. Current partial manual evidence is in ../testing/runs/2026-09-11-protocol-preparation.md.

## Preparation-batch verification — September 11, 2026

LabPreparationBatchTests: 10 passing cases; LabSpecimenAttemptTests: 5 passing cases. LabPreparationPostgresTests: 2 passing persisted journeys covering competing reservations, stale versions, unauthorized Customer access, start locking, command replay, one material consumption, shared evidence/tube Hold, explicit failure, output creation and existing-output selection, optional final-stage skip, QC references, sequencing membership and reserve fallback. The optional-stage fixture lookup was corrected and rerun. The local migration was applied to localhost/phaeno_ops; the ERD includes all new tables and provenance links.

The owning [Library prep plan](LAB-WORK-JOURNEY-PLAN.md#verification-checkpoint) and [LAB-14 manual journey](../testing/06-laboratory.md#lab-14--preparation-trays-shared-evidence-and-sequencing-handoff) retain remaining acceptance coverage: held/closed Trial races, all staff-role combinations, physical trays/scanners/labels, owner sign-off and production/provider gates. Historical TEST-008 work was not retrofitted or replayed. Customer-requested hold implementation remains blocked.

## September 12 — Preparation batch identifiers

Preparation naming: extended PostgreSQL preparation journey assertions for server-owned names, optional notes, stable create replay, distinct creates and ignoring legacy supplied names. Same-second concurrent allocation uses the existing transaction advisory lock. Regression execution pending; no database migration.


September 12 naming follow-up: both focused PostgreSQL preparation journeys passed, including name/notes/retry assertions. Signed-in UI verified removal of the name field, two distinct identical-choice creates, persisted notes and unchanged historical names. Reserve exhaustion confirmation produced terminal specimen Failed. See the LAB-14 run record; unrun variants remain open.


September 12 LAB-14 follow-up: failed-output scan prompts removed while traceability links remain; terminal specimens use Processing outcome. Live saved-record inspection passed. Failed-output regression passed on desktop/mobile (2); all 11 preparation-domain tests passed, including new repeat reason/history coverage and existing correction invalidation. Manual correction/repeat remains separate and pending; see the active run record.

September 12 LAB-14 checkpoint: existing TypedEvidenceRequiresTheStepRoleConfirmationAndValidValues regression passed (1, no skip). No backend implementation change. This domain proof does not substitute for signed-in role-matrix acceptance.

September 12 preparation concurrency: both PostgreSQL journeys now assert a stale material command returns concurrency_conflict without history, stock or consumption changes, followed by valid idempotent use. Both passed on isolated UAT DB (2, no skips), including competing reservation coverage. No backend product change.

September 12 review-role checkpoint: all 11 existing LabOperationsAuthorizationTests passed, zero skipped. Isolated LAB-14 launcher has governed result-package validation disabled, so no governed missing-package claim is made from that runtime. Independent approval/package controller acceptance requires separate LAB-06 setup; see active run. No backend code or data changed.

September 12 LabScientificReviewGatePostgresTests added and passed (one journey, four rejection cases, zero skipped) against the isolated UAT database. Calls the real scientific-approval controller with governed package validation and dual-control enforcement enabled for test context only. Checks exact errors for premature milestone, missing output package, contributor conflict and blocking exception; after each, asserts unchanged status/version/event count and no approval. Transaction rollback verified by absence of fixture work/user afterward. Uses a legacy-compatible job without tube policy to isolate approval guards; this does not cover specimen readiness, package scanning, HTTP authentication or signed-in acceptance. No runtime flags or operational records changed.

September 12 package-gate extension: same journey passed with seven controller rejections, adding Uploading, Scanning and Failed output packages. Each package stays in its original state/version with no approval ID or release timestamp. Domain transition checks also reject incomplete artifact count, checksum mismatch and non-clean malware result while retaining Scanning. Fixture includes synthetic order/sample/package relationships and rolls back, verifying package absence afterward. No real file, scanner, provider or signed-in package workflow exercised. One journey passed, zero skipped; no product code or runtime change.

September 12 independent approval extension: LabScientificReviewGatePostgresTests now also approves a synthetic ready package through the real controller using a separate non-admin Scientific Reviewer with no work contributions. Work and package become ReadyForRelease; the package references the saved approval and independent reviewer, exactly one ScientificApprovalRecorded event exists, and release timestamp/user remain null. The earlier failed package remains Failed. Focused journey passed (one test, zero skipped), retaining seven controller and three domain rejection checks. Transaction rollback verifies both packages and both reviewers absent. This isolates server approval behavior using a legacy-compatible job and synthetic scan readiness; it does not prove scanner, HTTP authentication, customer visibility or signed-in acceptance.

September 12 signed-in supplement: actual UI/API approval on separate 3016/7116 runtime and cloned DB at 127.0.0.1:5436 persisted one independent approval and ReadyForRelease with no release timestamp/user. Missing-package UI prevented submission, so that case adds UI evidence rather than another controller rejection. Database commit tracking enabled only on the owned temporary cluster; original server unchanged. Full lineage/scanner/publication not covered. See active LAB-14 run.

September 12 HTTP/UI supplement: signed-in contributor approval rejected on separate synthetic LAB-06 work; real database before/after retains ScientificReview/version 1, ReadyForReview/version 1, one original event and zero approvals. Confirms enforced contributor guard through live request with overlapping reviewer/release roles. No new automated test or product change; full lineage/provider cases remain separate.

September 12 release checkpoint: API Release build passed with zero warnings/errors; 66 selected laboratory domain tests passed, zero skipped. Production migration/deployment evidence belongs to LAB-WORKFLOW-RELEASE-2026-09-12.md.
