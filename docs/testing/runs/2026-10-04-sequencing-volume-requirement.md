# Local sequencing transfer refinement — October 4, 2026

Owner request: scan the source library and destination sequencing tube, record the physical amount with atomic debit/credit, and verify a configured minimum. Owner selected volume only and **5 µL per tube for the fake PSeq batch**.

## Persisted configuration and retained data

- Target: configured local Development `localhost:5432/phaeno_ops_clean_20260919`.
- Applied `20261004200855_SequencingMinimumVolume`; reviewed `Up` adds only nullable numeric `lab_ops.lab_operational_batches.minimum_sequencing_volume_ul`. No reset, inferred quantities or production migration.
- Saved **5 µL** once through the normal Sequencing volume requirement UI for batch `PH-BAT-20261004-TAHDCRV5` (`8e80e870-684c-4abd-9502-1e380da4783b`).
- Read-only database confirmation: version 10, six members, minimum 5, zero destination allocations, zero transfers, smallest/largest library source balances both 20 µL. This task did not assign members, allocate tubes, print labels or record physical transfers.

## Connected UI evidence

- Before configuration, all six **Prepare sequencing tube** actions were disabled. The minimum prerequisite and **Set minimum volume** action were visible.
- After saving, the batch card shows **Minimum per sequencing tube: 5 µL**.
- Preparation form shows source identity, tray/position, remaining 20 µL and minimum 5 µL; source scan is required before allocation. Blank submission reports the source scan and location errors without sending an allocation.
- Desktop and 320 CSS-pixel layouts contain the dialog with a meaningful body and visible footer. Keyboard/scan focus is reviewed. No physical identity or volume is asserted by this UI check.
- Proof screenshots: `sequencing-minimum-5ul.png` and `sequencing-source-scan-5ul.png` in the calling task's visualization folder.

## Engineering verification boundary

Solution compilation (including regression sources), TypeScript, scoped ESLint, generated help consistency and whitespace validation apply. Automated suite execution remains request-only/deferred. Regressions cover exact minimum boundaries, volume equivalence, unsupported mass units, reason/version/audit, minimum locking, below-minimum rejection without a debit, scan prerequisites, balance preview and exact command retry. Physical scanner, measured volumes, scientific qualification, provider acceptance and production release remain unverified.
