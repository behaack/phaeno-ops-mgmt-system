# Immediate traceability enforcement — September 19, 2026

The owner approved enforcement starting now, confirmed that all existing data are test data, and waived historical backfill. The [governance contract](../../plans/LAB-EVIDENCE-GOVERNANCE-CONTRACT.md#immediate-enforcement-decision--september-19-2026) records that decision. Implementation remains local and uncommitted; this checkpoint does not claim production activation.

## Implemented behavior

Both result traceability and scientific evidence default on in configuration and options. New staff/pipeline analyses receive the scientific requirements profile. Result registration, artifact attribution, scan finalization, scientific approval, commercial and Trial release, and automatic legacy payment-hold release use the current policy. An older saved package's false requirement flag does not exempt it from a subsequent approval or release. The legacy job-level approval path also requires attributed results for successful samples.

Existing records remain readable and unchanged. Missing scientific evidence must be captured through the supported workflow and associated with explicit replacement/reanalysis records. No inferred evidence, backfill, data deletion, schema change or migration was performed for this slice.

## Verification

- **105 backend tests passed; zero failures or skips in the final runs.** The 104-case regression run covers `LabResultLineageTests`, evidence governance, persisted result lineage, Trial projects, governed retention, result registration concurrency, commercial laboratory handoff, and order-to-cash domain behavior. One additional PostgreSQL test proves that disabling governed packages does not bypass the new legacy scientific-approval requirement.
- New coverage verifies default-on options, refusal of preexisting unlinked packages/releases without changing their records, rejection of an unprofiled producing analysis, acceptance of a complete profiled replacement analysis with attributed artifacts, and refusal of both approval and release for an incomplete Trial package. Historical retention/concurrency/handoff fixtures explicitly select their original compatibility policy; they do not represent acceptance under the new enforcement policy.
- The complete backend solution builds with **zero warnings and errors**. The additional test run rebuilt the test/API projects successfully after its final fixture change.
- Phaeno scientific-approval help and owning contracts/plans were updated. Documentation generation and consistency checks pass for **56 guides**, corpus `da7e50865876`. Whitespace checks pass. No frontend control or route changed in this slice, so UI/browser suites were not rerun.

Database tests used disposable local PostgreSQL on port 55441 with commit timestamp tracking enabled; the server was stopped after verification. The first run identified the test server's missing commit timestamp setting and an incomplete correction reason in the new positive test fixture. Those test setup issues were corrected before the successful runs. The initial compile also caught a dispatcher helper still declared static after policy injection; that was corrected. Required production guards remain enabled.

Machine-readable results are local artifacts at `backend/test/TestResults/traceability-enforcement.trx` and `backend/test/TestResults/traceability-legacy-enforcement.trx`.

## Remaining release and acceptance boundaries

No commit, push, production deployment, production configuration change or shared database migration occurred. The earlier traceability migrations still belong to the production rollout. Real producer/bench validation, external scientific-file availability and hosted recovery acceptance remain separate from these automated tests. The cutoff/in-flight product decision is now settled.
