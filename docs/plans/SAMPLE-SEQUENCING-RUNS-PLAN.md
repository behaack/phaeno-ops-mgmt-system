# Sample-sequencing runs

Status: implemented and verified locally. Production activation awaits explicit migration approval. Owner approved the feature and release scope September 19, 2026.

## Product scope

Customers and Phaeno staff can purchase multiple sequencing runs of the same identified sample. Twenty samples sequenced once and one sample sequenced twenty times both have commercial quantity 20. Unique sample count, physical submission/container count, machine batch count and purchased run count remain distinct. Existing quotes and commitments keep their accepted financial values. Existing orders default to one run per sample. Failure-recovery attempts retain the existing policy and do not create additional purchased units.

## Implementation

- [x] Add an optional requested run total to the Job profile and a positive run allocation to each sample, defaulting to one. Roster finalization verifies allocation equals the purchased total.
- [x] Price configured/manual orders and proposed prices by run total. Freeze both sample and run totals in commitments. Preserve additional-sample amendments and legacy defaults.
- [x] Carry per-sample run allocations in laboratory authorization. Allow subsequent successful runs up to the authorized count, retaining attempt/result lineage and physical material guards. Do not complete the specimen before all allocated runs succeed or an explicit terminal failure is recorded.
- [x] Expose run totals/allocations/progress in ordering, sample entry/import and laboratory operation controls. Retain one active attempt per sample and explicit confirmation of reused available material.
- [x] Update persistence, ERD, regression sources, owning plans and audience guides; compile and verify browser workflows with isolated automated fixtures. Hosted and physical acceptance remain separate.

## Boundaries

The owner authorized documentation, full tests, commit, push and deployment for the completed pending batch. Do not reprice accepted commitments or apply production/shared migrations without separate explicit approval. This change does not enable new biological materials or container workflows. Schema migration is authorized by the persisted-model rule in the Phaeno repository guide; local application requires confirming the configured database is local development.

## Scientific workflow clarification

Owner decision: support both new library preparation and reuse of an existing prepared library, with an explicit choice recorded for each purchased sample-sequencing run. One preparation provides material for multiple runs. Identify each purchased run by its sample and allocation number; multiple files, corrections and reanalyses for that allocation count once. Preserve the producing library and preparation lineage for every output. A preparation success alone never completes a purchased run. Failure recovery does not add purchased units.

Release scope now includes finishing this workflow, updating documentation, running tests to success, committing, pushing and deploying. Shared or production migration application still requires explicit approval.

Local migration 20260919231447_AddSampleSequencingRuns added nullable order sequencing_run_count and sample sequencing_run_count default 1 to verified localhost database phaeno_ops_clean_20260919. Only the baseline was previously applied; no shared database was changed.

## Current verification checkpoint

Implementation now records a purchased run number and explicit preparation choice with sequencing output. Reuse retains the original library and attempt; new preparation creates another attempt. Corrections keep their purchased allocation. Approval and delivery count distinct purchased run numbers through analysis input lineage, never preparation attempts or file counts. Partial approval keeps repeated-run work open. Previously used libraries may enter a subsequent batch only after previous batches/sendouts complete and while authorized runs remain.

Additive migration `20260920022358_AddSequencingRunLineage` adds nullable run-number and preparation-choice fields and an index; historical output defaults to run 1 without inventing a preparation choice. Applied to verified localhost development and the isolated `phaeno_release_verification_20260919` database. The additional `20260920023907_AllowRepeatedLibraryPreparation` migration changes the specimen/source unique indexes to cover active preparations only. One active preparation remains enforced; multiple completed preparations are retained. Production is unchanged.

The owner-requested release verification is recorded in the [release record](../operations/repeated-sequencing-release-20260919.md). Frontend tests pass (1,094); browser passing evidence covers all 176 applicable cases, with two intentional mobile-print skips. Focused database checks pass (47), including twenty runs from one prepared library and a linked replacement from another preparation. The additional pricing and controller approval checks pass (3): partial approval leaves work open and full coverage permits readiness. The Unix-only storage guard passed in an isolated Linux container. The final full backend rerun passed 957 tests with zero failures and one Windows skip; the skipped fixture passed separately on Linux, covering all 958 cases. No production migration or deployment has occurred.
