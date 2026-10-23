# DPS real-assembly engineering package

The later [October 23 assembled-sequences publication index](local-assembly-20261023/README.md) records reviewed/local-committed native engineering and its separate source/build/test receipts. New native source/detailed proof stay in private DPS; its push awaits repository write access. Deployment and the real pilot remain held. The original patch and receipts below are unchanged; do not apply both packages on top of one another.

Engineering handoff for the separate private `phaenobiotech/pipeline` repository. This original package preserves its reviewed source change as a Portal artifact. It was published with the [Portal-only release](../../docs/operations/dps-admission-portal-test-release-20261023.md); at that checkpoint no changes had been published to pipeline, deployed to DPS or made to historical provider data. The later publication index above records subsequent source work separately.

- Base: merged DPS PR #2, `c68e584f29a0e8faa2a9a6537075d356de1929fc`, tree `e2f00ad3902da19e0d8dbe33ba5c3694a70dc03e` (identical to retained local source `e4857ef538315932a02a4a636e8acc2f09e307b8`).
- [Source patch](real-assembly-engineering.patch) includes code, replacement fixtures, simulation-only catalog, preparation-only ARM64 build procedure, service unit and operator reference.
- [Source receipt](source-receipt.json) records the patch/file hashes. A null file hash records an intentional source deletion, never a provider-history deletion.
- [Verification receipt](verification.json) records the checked patch identity, focused results and held scientific/hosted scope at implementation time, before the later Portal-only publication/deployment.
- [Engineering handoff](../../docs/operations/real-assembly-engineering-20261022.md) records scope, proof and remaining gates. The [owning plan](../../docs/plans/REAL-ASSEMBLY-HOSTED-TEST-IMPLEMENTATION-PLAN.md) controls future activation.

The original working copy was `.tmp/dps-simulation-src`; the durable patch remains its historical handoff artifact. The original `export_patch.py` expects that retained base plus uncommitted original edits. Do not rerun it against the later committed DPS checkout or overwrite this package's receipts. The current review branch and preserved later evidence are recorded in the publication index above. Reconcile source deliberately before any future merge/release; do not apply an original/combined patch on top of its already-committed implementation, use a server worktree as a shortcut or overwrite another operator's work.

The scoped `.gitattributes` retains the patch's exact hashed bytes and literal diff-context whitespace. This affects the generated patch artifact only; normal source whitespace checks remain enabled.

The shipped catalog contains only the reserved simulator. No scientific dataset, references, QC criteria, native recipe or pilot has been approved by this package. No existing ledger, receipt, execution journal, scientific file or storage version is included or replaced.
