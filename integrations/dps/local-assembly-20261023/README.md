# Assembled-sequences engineering publication — October 23, 2026

The Owner authorized review, commit and push of the DPS changes and planning handoff. **Deployment, hosted worker start, scientific availability and the real pilot remain held.** The [planning-folder handoff](../../../docs/plans/DPS-LOCAL-ASSEMBLY-ENGINEERING-HANDOFF-20261023.md) records implementation, proof and remaining gates.

DPS source and detailed evidence belong in the private `phaenobiotech/pipeline` repository. This public Portal repository retains this index and the [publication status](publication-receipt.json), without copying new native source or detailed fixture/build records into public Git history.

The local DPS review branch is `codex/real-assembly-sequences`. Source commit: `0aecd977f1f516fece22284a10f8b08f81939ab8`. Complete evidence head: `45d75837e8875bbd2df1fcb4ad649beb7a13f40a`. The DPS push is **blocked**: GitHub reports read-only access for `behaack` and rejected the push with HTTP 403. No merge or deployment was attempted. Once repository write access is granted, push that existing branch; do not recreate the implementation or its receipts.

All 35 committed source paths match the verified combined patch. All 14 preserved package artifacts, including the original patch/receipts, raw test results and build logs, retain their exact hashes. They are committed under `docs/engineering/real-assembly-20261023/` in the local private DPS checkout. The original completion package is also retained at `.tmp/dps-local-completion-package-preserved-20261023`; neither copy contains historical provider ledger/database records. The [first Portal package](../README.md) remains byte-preserved apart from its index documentation.

Retained proof: 77 Linux x64 focused passes; 61 Windows passes with 16 Linux-only skips; actual synthetic eight-input native assembly produced two SMIDs/two contigs and recovered publication without repeating computation. No tests were rerun for this source-identical publication. `poms-dps/1.0` and the simulation-only catalog remain unchanged. ARM64/server qualification and scientific approvals remain separate gates.
