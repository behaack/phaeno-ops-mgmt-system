# Phase 2 sample-tracking implementation — October 24, 2026

> Raw sample-tracking test outputs linked in this dated record were removed at the Owner's request after consolidation. The archived links now open the retained result/cleanup ledger; screenshots and raw files are no longer retained.

Subsequent Owner-requested execution is recorded in the [Phase 2 verification report](2026-10-24-sample-tracking-phase2-verification.md): 44 backend, 16 frontend and four connected browser scenarios pass. That record supersedes the implementation-time unrun status below.

Owner authorization: implement the next capture-at-source phase, with no deployment or DPS changes. See the [owning plan](../../plans/SAMPLE-TRACEABILITY-AND-INVESTIGATION-PLAN.md#phase-2--capture-at-source-october-24-2026).

## Implemented behavior

- Master-mix and reagent-manufacturing withdrawals freeze lot, quantity-unit/balance, QC/results/approval, expiry/retest, material, supplier, product and named storage facts before stock changes in the existing transaction. Saved withdrawal snapshots cannot be overwritten/deleted. Verified mix voids retain the original snapshot and correction history.
- Prepared reagent use snapshots retain component identity/amount and original withdrawal references. Investigations traverse the original withdrawals, retaining distinct snapshots for repeated use of one source. They do not read later component QC as preparation evidence. Old absent snapshots remain unknown. Mix and reagent records expose an expandable frozen-conditions view.
- Vendor receipt requires an explicit actual acquisition reference and UTC times for every selected file-set/group mapping. Instrument, flowcell, lane, pool, index/demultiplexing mapping, software/version/checksum, settings fingerprint and checksummed vendor evidence can be captured. The vendor job reference and purchased run remain separate. A file set stays within one authorized purchased run/actual acquisition; separate sets under one vendor job can identify different acquisitions. A performed failed run can retain an optional unmapped declaration, while no-run rejects actual-run evidence.
- Vendor result versions and sequencing outputs freeze actual-run evidence. Corrected provenance passes existing downstream withdrawal/active-assembly protections and creates correction outputs; unchanged set provenance preserves exact input identities. Investigation projection includes only the selected sample's mapped groups. Shared failed-run declarations expose common instrument/run/time facts with explicit unknown per-library coverage, omitting unscoped mapping/documents from the sample view.
- Saved/restarted drafts retain capture fields. Additional unedited scientific metadata and timestamp precision are preserved during notes-only edits. New Phaeno help explains recording and interpreting the evidence. No approved protocol definition was changed.

## Local migration and preservation

Migration `20261024192049_FreezeLabIngredientWithdrawalEvidence` adds only nullable `resource_snapshot_json` JSONB columns to `lab_ops.lab_master_mix_ingredients` and `lab_ops.lab_reagent_material_uses`. It was reviewed and applied only to configured loopback development database `phaeno_ops_clean_20260919`. It was the only pending migration after `20261017190934_SplitInternalOrderNotes`. Downgrade refuses to discard preserved scientific snapshots; use a preserving forward migration for any later schema change.

Before implementation, the local inventory contained six master-mix withdrawals, zero reagent withdrawals/components, two vendor versions, zero sequencing outputs and zero saved reports. No historical facts were fabricated. [Archived receipt: Before](2026-10-24-sample-tracking-browser-acceptance-ledger.json) and [Archived receipt: after](2026-10-24-sample-tracking-browser-acceptance-ledger.json) counts/full-record fingerprints match for existing ingredient withdrawals, vendor versions and both Website intake tables, excluding only the newly added nullable snapshot field. No row deletion/reset or scientific data conversion occurred. Website tables were empty in this local database; no hosted Website data was accessed.

The [Archived receipt: local schema readback](2026-10-24-sample-tracking-browser-acceptance-ledger.json) confirms both nullable JSONB columns, six historical mix snapshots still null, and zero backfilled snapshots. EF reports no pending model changes. Its existing 10.0.4 tool prints a version advisory against the 10.0.10 runtime; migration/model checks complete successfully without a dependency/tool update.

The generated [complete ERD](../../database-erd.md) includes both new fields. Regeneration also corrects a pre-existing commercial field-count mismatch and preserves the existing formatted private/public note annotations; the generator now retains annotated field comments. No Commercial model changed.

## Procedure capture review

The [read-only procedure review](../../plans/PHASE2-PROCEDURE-CAPTURE-REVIEW-20261024.md) inventories the configured approved demo library protocol and demo mix, their required fields/units/resource tracking and absent attachments/equipment fields. No approved reagent workflow exists locally. The reagent manufacturing step model is currently instruction/note based and does not supply typed scientific measurement or required-report fields. Real SOP measurement, equipment, acceptance-rule and attachment requirements require a scientific/domain review; the demo evidence cannot qualify them. [Archived receipt: Source inventory](2026-10-24-sample-tracking-browser-acceptance-ledger.json).

## Verification boundary

The backend solution and all new/amended regression sources compile with zero warnings/errors. TypeScript, scoped ESLint, the UI guard and generated-help freshness pass. UI guard: 767 source files, two unchanged existing exceptions. Help corpus: 62 guides, `40fd4cc1d142`. Migration/model consistency, report links and whitespace checks pass.

Five new backend service/domain cases and seven new frontend helper/component/workspace cases are authored. Existing master-mix, reagent-manufacturing and FASTQ PostgreSQL cases are extended for frozen conditions, overwrite refusal and actual-run output evidence. **No Phase 2 tests or browser acceptance were run**, under the repository's request-only policy. Earlier Phase 1 passing results apply to the earlier source checkpoint; they are not Phase 2 execution evidence. The living backend/frontend/E2E plans record the remaining requested verification matrix, including multi-set acquisition coverage, corrections and mobile/keyboard behavior.

No new dependencies, production authentication change, DPS source/runtime/contract change, provider execution, hosted migration, deployment, Git staging or commit. Local additive schema application and source/static proof do not establish scientific validity, physical bench evidence, hosted acceptance or business sign-off. Physical disposition/storage and further timing/participant work remain in later phases. Task-owned scratch scripts and files were removed after retaining the inventory/preservation receipts.
