# Sample material transfers and tube identity

Status: implemented, software-verified and deployed to production September 23, 2026. Customer-declared shipment amounts, biological transfers, reagent-lot exhaustion and product-dependent expiration capture are connected across the API and UI. Both feature migrations are applied locally and in production; all six pending production migrations were explicitly approved and applied before activating matching API and Portal source `b056528aa59cbec9f2ebc83d407b08211a7c08da`. See the [release record](../operations/material-tracking-release-20260923.md) for tests, recovery checks and production verification. Physical bench, scientific, provider and signed-in hosted workflow acceptance remain separate.

## Product outcome

Laboratory Operators must track physical material through three distinct tubes: the accessioned sample tube, the library preparation tube occupying a tray position, and the sequencing tube sent to the provider. Supervisors and scientific reviewers must be able to reconstruct both transfers and see what remains in Phaeno custody.

Confirmed owner direction:

1. Pipette accessioned sample material into the library tray tube. This can use part or all of the original material.
2. Every library tray tube has its own barcode, distinct from the accessioned source and reusable tray barcode.
3. Transfer only a portion of the prepared library into a separate barcoded sequencing tube. The remaining library stays in its original tube.
4. Support both existing manufacturer-applied barcodes and POMS-generated labels for library and sequencing tubes.
5. Capture the amount of biological material sent by the customer during shipment preparation, tied to its physical tube and unit.
6. Record actual consumed amounts. Offer an optional **Material exhausted** override even when the recorded amount would leave a positive calculated balance.
7. Add **Biological material** to the library-preparation field types, separate from reagent **Material used**.
8. Materials inventory records its starting amount and decrements actual consumption. Apply the optional **Material exhausted** override to reagent lots too, preserving actual use separately from the balance adjustment.
9. Products have a **Can expire** flag. Inventory entry for a flagged product requires its expiration date; retain the declared date and flag on the relevant stock evidence.

`Accessioned source tube -> recorded transfer -> barcoded library tray tube -> preparation and QC -> recorded transfer -> barcoded sequencing tube -> sendout and sequencing output`

This extends the [preparation journey](LAB-WORK-JOURNEY-PLAN.md), [Lab Operations](LAB-OPERATIONS-PLAN.md), and [sample traceability](SAMPLE-TRACEABILITY-AND-INVESTIGATION-PLAN.md). The new workflows distinguish the selected source from the library tray tube and freeze the actual sequencing tube in new sendouts. Restrictions on moving or splitting a started preparation batch remain separate from these material transfers.

## Starting behavior and delivered scope

| Area | Behavior before this change | Delivered change |
| --- | --- | --- |
| Routine accession | Records submitted tube identity, intake and freezer-box location; starting quantity is not required. | Carries the frozen customer declaration into the source balance, preserving its basis and historical unknowns. |
| Tray assembly | A member stores the accessioned source barcode and position. | Retains that source link and assigns a distinct destination library tube at the tray position. |
| Library output | Creates a derived container during preparation with generated barcode, quantity/unit and location, followed by barcode confirmation. | Measures prepared yield in the already assigned and transferred library tube; older configurations retain their original output path. |
| Material balance | Container quantity is an optional creation fact; no sample/container transfer debit exists. | Records both actual transfers, calculated remainders and separate optional exhaustion adjustments. |
| Sequencing sendout | Membership identifies a library; the manifest freezes its library-container barcode. | Retains library membership plus the actual sequencing tube, exact transfer and aliquot amount in manifest version 2. |
| Result provenance | Validates the manifest barcode against the library container. | Validates the sequencing-tube-to-library-to-source chain for new manifests and preserves legacy reads. |

Source references:

- `backend/modules/PSeq.Operations.Laboratory/Domain/LabOperationsDomain.cs` and `LabPreparationBatch.cs`.
- `backend/app/Features/LabOperations/Controllers/LabOperationsController.PreparationCommands.cs`, `LabOperationsController.PreparationExecution.cs`, and `LabOperationsController.Release.cs`.
- `backend/app/Features/LabOperations/Services/LabResultLineageService.cs`.
- `frontend/src/features/lab-operations/PreparationBatchPage.tsx`, `PreparationTray.tsx`, `PreparationOutputsDialog.tsx`, `LabBarcodeScanner.tsx`, `LabOperationsPage.tsx`, and `LabTubePage.tsx`.

Current repeated-run behavior permits another library preparation from a successful source with material-remaining evidence, and another sequencing batch from an eligible library after its previous batches/sendouts complete while purchased runs remain. Preserve this newer behavior from [sample sequencing runs](SAMPLE-SEQUENCING-RUNS-PLAN.md); the older blanket prohibition on successful-source reuse in the specimen-attempt plan is superseded.

## Confirmed material accounting

The customer's shipment declaration supplies the opening amount and unit for each submitted tube. Retain its declaration/source, actor and time in the shipment snapshot and at accession. Label it as customer-declared rather than implying a laboratory measurement; do not divide specimen totals among tubes or infer amounts from capacity. Historical declarations that were never captured remain unknown.

Biological consumption records the actual positive amount used in the compatible unit and calculates the remaining balance when known. **Material exhausted** is optional and initially unchecked. Selecting it records that no usable source material remains and blocks another withdrawal, preserving the entered amount used and separately auditing any balance adjustment. Never inflate the transferred amount to the previous balance merely because the source is exhausted. Do not treat source exhaustion as specimen failure or invalidate material already transferred.

The **Biological material** field resolves the selected attempt's biological source and its destination library tube. It records consumption with per-tube identity and amounts inside the existing step transaction, with the same fictional-only configuration preview. It must not select reagent suppliers/lots or debit reagent inventory. Repeats represent fresh actual use; correction/replay must not consume a second time.

Prepared-library output is a separate measurement from sample input: preparation can change volume and concentration. Never equate finished-library quantity with the original aliquot or treat preparation yield as a second withdrawal from the accessioned source.

Reagent-lot quantities already exist and are debited by tracked consumption. Extend those existing paths instead of introducing a second inventory balance. Where a shared preparation entry withdraws several actual amounts from one lot, complete the validated withdrawals before applying the optional exhaustion adjustment once. Unknown consumption remains governed by the existing reconciliation hold and cannot be silently converted to a known amount by exhaustion.

Product expiration applies to purchased material lots and arbitrary product contents of transportation stock kits. New product flags default false; do not infer them from product names or old dates. Require a valid expiration date for each flagged inventory product and freeze stock-entry evidence independently of later catalog edits. Existing inventory and expired historical records remain readable. Existing reagent expiry eligibility stays enforced; this scope does not introduce automatic physical disposal or a new transportation-stock expiry/dispatch policy.

The new biological field is configured through a new draft/version of the relevant Lab step/protocol. Do not mutate existing approved definitions or fabricate missing historical input transfers. Existing workflows without that field keep their historical execution behavior until explicitly updated; the new tube-allocation action lets operators establish destination identity before the configured transfer step.

## Implementation scope

### Physical identity and preparation

- Keep specimen, accession, selected source container and attempt as distinct references. Add a separate destination-container reference for the tray member.
- Register/allocate and physically confirm the library tube barcode at the transfer. Its physical identity persists through preparation; an empty labelled tube or completed transfer does not establish a finished, QC-passing library.
- Scan the full manufacturer barcode and reject an identity assigned to another physical container or incompatible inventory record. Resolve an existing compatible record explicitly rather than creating a duplicate tube.
- Reuse existing generated-barcode allocation, print and reasoned reprint behavior. Generating/printing a label remains distinct from confirming it on a physical tube.
- Record the source-to-destination transfer with specimen, attempt, preparation context, and performed/recorded attribution. Planning or assigning a tray position alone must not assert that pipetting happened.
- Keep source storage/remainder separate from destination tray position/location. Using all source material records physical exhaustion without failing the specimen or blocking continued preparation.
- Update Start/Resume continuation checks: `LabOperationsController.AttemptGuards.cs` currently requires the original source to remain Available. Distinguish eligibility for another withdrawal from eligibility to continue using material already transferred into the linked preparation tube. Exhaustion caused by that valid transfer must not block its preparation; other applicable holds and QC gates remain enforced.
- Preserve partial/mixed-job trays, exclusive reservations, fixed membership after Start, held/failed history and QC gates. Cancelling a planned action cannot reverse a physical transfer that already occurred.

### Sequencing transfer and custody

- From an eligible prepared library, record transfer into a separately identified sequencing tube. Carry job, sample, attempt and library links automatically.
- Associate the actual sequencing tube and transfer with the intended batch member. Batch reservation and physical transfer are separate facts.
- Require confirmed sequencing-tube identity before freezing a new sendout. Retain sequencing barcode, source library identity/barcode and exact transfer reference in its manifest.
- Keep the remaining library in its recorded location. Shipping its aliquot must not mark the library tube shipped or exhausted.
- Extend sequencing-output capture, lineage validation, sample history and investigation reporting to follow the submitted tube. Preserve purchased-run allocations, QC, batch closure and repeat-run eligibility.
- This scope describes one library as the source of each sequencing tube. It does not introduce pooled multi-library tubes, automatic provider dispatch or a new provider integration.

### History, validation and compatibility

- Store durable transfer facts with typed source/destination links, applicable quantities/units or remainder states, performer/time, recorder/time and context. Reuse existing performance-evidence conventions.
- Save transfers and balance/status changes atomically under current authorization, job/attempt guards, concurrency versions, ordered locks and command receipts. A retry must not transfer twice or allocate a second tube.
- Reject wrong-sample/attempt relationships, duplicate barcodes and unavailable material. Numeric accounting must reject overdraw/incompatible units, retain honest unknowns and avoid implicit unit conversion.
- Distinguish evidence correction from an actual physical return transfer. Retain originals and correction reasons; never silently rewrite downstream manifests or released lineage.
- Keep existing records/manifests readable with their original meaning. Do not backfill unobserved pipetting, invent destination tubes or reinterpret historical library barcodes as sequencing-tube barcodes.
- Before activation, identify draft/in-progress batches lacking transfer evidence and define continuation from saved state. Do not require repeated physical work or fabricated historical amounts.

## Delivery and acceptance

1. Capture required positive declared amount/unit for each physical tube before new shipment dispatch; freeze declarations with the reviewed crosswalk/manifest and carry them into accession without mislabelling their provenance.
2. Implement container links and transfer records, additive Lab API scope, migration and ERD changes together. Commercial pricing, purchased-run authorization, authentication and provider contracts remain outside scope.
3. Update tray assembly, preparation output, sequencing transfer/manifest and sample/tube history as a connected workflow. Use bounded actions, existing scanner/focus behavior and a single contextual Actions dropdown when multiple actions apply.
4. Update Phaeno guides (`lab-receipt-accession.mdx`, `lab-protocol-execution.mdx`, `lab-libraries-batches-sequencing.mdx`), their registry and owning API/lineage contracts when implemented. Do not publish planned behavior as current help.
5. Add focused coverage and update backend/frontend/E2E plans at implementation. Execute checks at the authorized checkpoint; retain separate physical bench/provider acceptance evidence and existing shared-migration/deployment approval boundaries.

Acceptance must demonstrate:

- Partial source transfer retains the remainder; full transfer preserves history and records exhaustion, blocks another withdrawal, and still permits valid Start/Resume against the transferred preparation material.
- Source, library tube, reusable tray/position and sequencing tube identities remain distinguishable and traceable.
- Both barcode paths work for both destination tube types; collisions and wrong scans fail without partial writes.
- Library yield is independent of sample input and does not debit it again.
- Sequencing transfer retains the library remainder and freezes the submitted tube; later authorized runs use traceable aliquots.
- Retry, stale/concurrent transfer, hold/failure, cancellation after physical transfer, correction and historical-unknown cases preserve truthful material records and immutable evidence.
- Result investigation reaches the exact sequencing tube, library tube and accessioned source without guessing or rewriting older manifests.

Success means each new physical handoff has identified source/destination tubes, attributable transfer evidence and an honest remainder; operators do not re-enter known specimen/attempt links or duplicate QC.

The owner subsequently authorized completing the implementation, documentation, tests, commit, push and deployment. The release checkpoint supersedes the initial implementation-only verification boundary below. Shared-database migration authorization remains governed by the operations policy.

## API and persistence decisions

- Customer tube assignment adds the per-tube customer-declared amount/unit; packet rows freeze those values and declaration provenance. Accession reads the frozen packet, retaining unknown historical amounts.
- Preparation definitions add `biologicalMaterial` under typed fields. Allocation uses `allocate-library-tube`; recording the field captures source/destination scans, actual quantity/unit, optional exhaustion and existing performance evidence under the preparation command receipt. Library yield measures the same tube without another source debit.
- Sequencing uses a two-phase versioned command: allocate/register the empty tube, then confirm both barcodes and record the physical transfer. `GET batches/{id}/sequencing-tubes` supports the bounded workspace; `POST batches/{id}/members/{memberId}/sequencing-tube` applies the command. Exact retries preserve the original request, versions and actor.
- New sendouts use manifest version 2 with exact sequencing container and transfer, source library identifiers and actual aliquot quantity/unit. Result capture verifies those immutable facts and preserves legacy version-1 library-barcode manifests.
- `LabBiologicalMaterialTransfer` is append-only evidence. Container quantities are current remaining balances with separate initial amount/basis and history; preparation and sequencing members link their distinct physical tubes. Investigation snapshots and tube details expose the retained transfers.
- Product `CanExpire` and frozen stock-product expiration evidence augment the existing catalog/inventory model; no external provider or authentication contract changes are introduced.

## September 23 implementation checkpoint

- Added migration `20260923165524_AddSampleMaterialTransfersAndProductExpiry`: one immutable transfer table, nullable historical quantity/identity/declaration fields, container quantity history, product `can_expire` default false and nullable stock expiry snapshots. Reviewed the additive `Up` operations; no data backfill, removal or inferred transfers.
- Applied only this pending migration to verified `localhost:5432/phaeno_ops_clean_20260919` under Development configuration. EF reports no model changes since the migration. Regenerated the complete database ERD, including the stock JSON contract.
- Updated Customer, Prospect, Partner and Phaeno guides and registry entries; regenerated all 56 guides and passed documentation consistency validation.
- Regression sources cover material arithmetic and exhaustion, same-step field uniqueness, schema-2 result lineage, missing-transfer sendout rejection, exact command replay, retained legacy manifests, shipment declarations and product-dependent dates. Added/updated the backend, frontend and E2E test plans. These sources were not executed.
- TypeScript and ESLint for all changed TypeScript sources pass. The full Release solution build, including regression sources, passes with zero warnings/errors. `git diff --check` passes. These checks do not claim runtime or physical-workflow acceptance.

Activation and acceptance: add **Biological material** through a newly approved Lab step/protocol version; existing approved definitions are unchanged. Historical in-progress work retains its original output path when no distinct library tube was assigned. New sendouts require actual sequencing-tube evidence, including batches created earlier; operators must record actual observed transfers rather than fabricate historical ones. Catalog-linked material lots and transportation stock enforce Can expire on new entry. Newly entered shipment-specific return kits also require active catalog tube and shipper identities and expiration dates for flagged products; historical free-text kits remain readable.

At the initial checkpoint, automated browser checks and physical bench acceptance were pending, and no operational fixtures, approved protocol edits, Git publishing or deployment had occurred. The release checkpoint below supersedes the initial in-memory retry limitation.

## Authorized release completion

- Preparation-step commands, including an attached report, and sequencing allocation/transfer commands are durably retained in browser storage before sending. Recovery is scoped to the signed-in recorder and batch. Reopening the same batch in the same browser restores the exact request and concurrency versions; an unresolved different command cannot replace it. Storage failure blocks new submission. Successful receipt or a definite refusal clears only that request. Server receipts remain authoritative and prevent a repeated debit.
- Added `20260923172325_AddReturnKitProductExpiration`, a nullable return-kit expiry snapshot. The older shipment-specific creation API now requires catalog identities and validated expiration evidence; assigning stocked kits retains their recorded product snapshot. Neither migration infers historical quantities, transfers or dates.
- Browser fixtures cover reload after an interrupted biological step with a report and after a sequencing transfer, including exact replay and one debit, barcode case/wrapper normalization, desktop/mobile, dark theme, reduced motion, accessibility and overflow. These simulations do not establish physical scanner, scientific or provider acceptance.
- Full release checks, exact migration target, backup/restore requirements and deployment status are recorded in the [release record](../operations/material-tracking-release-20260923.md).
