# Catalog sequencing requirement and tube pairing

Owner direction: October 4, 2026. Implemented locally; approved conversion and static verification complete. Final interactive scanner/layout checks are pending dismissal of a Chrome extension popup. No Git publishing or deployment in this scope.

Laboratory Operators pair one source library with one separate sequencing tube, scan both physical identities, and record the actual volume transferred. Catalog administrators configure the minimum sequencing volume on each PSeq Lab Service. Operators cannot edit or override it in a batch. The previously implemented batch-level minimum is superseded.

## Accepted product behavior

- Use the customer sample/tube pairing pattern: one active pair form, progress count, compact saved pairs, and focus on the next source after saving. Avoid six repeated cards with separate nested forms.
- Each library resolves its own Catalog service through the work order's normalized service key. Cross-service batches can have different requirements.
- Show the Catalog minimum read-only. Unconfigured services block tube preparation with a clear setup message. No inferred minimum or batch fallback.
- Capture Catalog identity, version, name and minimum on the member when its sequencing tube is allocated. That requirement stays fixed with the physical pair; subsequent Catalog edits apply to newly prepared pairs.
- Preserve generated-label verification, manufacturer namespace checks, two physical scans, exact volume comparison, exact inventory subtraction/credit, performed attribution, concurrency, command receipts and interrupted-command recovery. Allocation alone moves no material.
- Sendout validates each member's captured requirement and freezes it with its transfer evidence.
- Keep the entered actual transfer volume editable; the Catalog requirement is read-only.

## Local data change

Before conversion, local data contained one configured batch minimum: `PH-BAT-20261004-TAHDCRV5`, 5 µL, six members for Catalog service `PSeq RNA Sequencing` (`b265580b-1d13-46b0-bea2-f86e132e7b54`). No sequencing destinations or transfers exist for these members. All source libraries retain 20 µL.

Recommended remedy: preserve every existing batch-level minimum in an audit event before removing the obsolete column; add Catalog and member snapshot fields; configure this demo's Catalog minimum to the already authorized 5 µL through the UI. Existing unrelated services remain unconfigured. No physical transfer, inventory balance, label, roster or result is inferred or reset.

Alternative remedies are deleting/resetting the affected demo batch and rebuilding it (loses its saved membership/history), or reseeding a separate demo (duplicates fixtures). Neither is recommended. The owner explicitly approved preserving/converting the local setting. Applied `20261004210005_CatalogSequencingPairRequirement` only to configured Development `localhost:5432/phaeno_ops_clean_20260919`. The migration archives every non-null batch setting before removing the obsolete field; new Catalog and pair fields remain unconfigured until explicit configuration/allocation. Outside-local migration and deployment remain unauthorized.

## Verification

Compile affected backend/test sources; frontend typecheck, scoped lint and documentation generation/check. Author regression coverage for per-service requirements, immutable pair snapshots, scanner pairing, below-minimum rejection, exact debit/credit and replay recovery. Automated test execution remains subject to the request-only rule. Verify the connected local Catalog and pair form without recording a physical or simulated transfer.

Local checkpoint: Catalog `PSeq RNA Sequencing` has 5 µL/version 5, the old batch setting has one archive audit event, and the batch retains six members with 20 µL each, zero destinations and zero transfers. The connected UI displays the Catalog requirement read-only and one active form with a compact pair list. Build, TypeScript, scoped ESLint, EF model drift, generated documentation and whitespace checks passed. See [the verification record](../testing/runs/2026-10-04-catalog-sequencing-pairing.md) for evidence and the remaining browser gate.
