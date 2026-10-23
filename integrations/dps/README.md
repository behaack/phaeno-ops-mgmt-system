# DPS real-assembly engineering package

Engineering handoff for the separate private `phaenobiotech/pipeline` repository. This package preserves its complete reviewed source change as a Portal repository artifact. It was published with the [Portal-only release](../../docs/operations/dps-admission-portal-test-release-20261023.md); no changes were published to the separate pipeline repository, deployed to DPS or made to historical provider data.

- Base: merged DPS PR #2, `c68e584f29a0e8faa2a9a6537075d356de1929fc`, tree `e2f00ad3902da19e0d8dbe33ba5c3694a70dc03e` (identical to retained local source `e4857ef538315932a02a4a636e8acc2f09e307b8`).
- [Source patch](real-assembly-engineering.patch) includes code, replacement fixtures, simulation-only catalog, preparation-only ARM64 build procedure, service unit and operator reference.
- [Source receipt](source-receipt.json) records the patch/file hashes. A null file hash records an intentional source deletion, never a provider-history deletion.
- [Verification receipt](verification.json) records the checked patch identity, focused results and held scientific/hosted scope at implementation time, before the later Portal-only publication/deployment.
- [Engineering handoff](../../docs/operations/real-assembly-engineering-20261022.md) records scope, proof and remaining gates. The [owning plan](../../docs/plans/REAL-ASSEMBLY-HOSTED-TEST-IMPLEMENTATION-PLAN.md) controls future activation.

The live edit is in `.tmp/dps-simulation-src`; the durable patch is the handoff artifact. `export_patch.py <that-source-directory>` exports/checks it without Git mutations. Before an authorized upstream publication, review/apply the patch to the exact base, recheck hashes and focused tests, and publish through the pipeline repository's normal review process. Do not apply it to a server worktree or overwrite another operator's work as a release shortcut.

The scoped `.gitattributes` retains the patch's exact hashed bytes and literal diff-context whitespace. This affects the generated patch artifact only; normal source whitespace checks remain enabled.

The shipped catalog contains only the reserved simulator. No scientific dataset, references, QC criteria, native recipe or pilot has been approved by this package. No existing ledger, receipt, execution journal, scientific file or storage version is included or replaced.
