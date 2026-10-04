# Catalog sequencing requirement and tube pairing — October 4, 2026

Owner direction: the minimum belongs to the Catalog, is read-only during tube preparation, and the workspace should follow the Customer's one-pair form. Actual transferred volume remains an Operator entry. This supersedes the batch-minimum behavior recorded in [the earlier checkpoint](2026-10-04-sequencing-volume-requirement.md).

## Approved local conversion

- Applied `20261004210005_CatalogSequencingPairRequirement` only to configured Development `localhost:5432/phaeno_ops_clean_20260919`, after the owner approved preserving/converting the existing 5 µL setting.
- The migration archived the former batch setting in a `BatchSequencingRequirementArchived` audit event before removing the batch-only column. No inferred pair snapshots or physical transfers were written.
- Saved 5 µL on `PSeq RNA Sequencing` through the normal Catalog edit UI. Catalog ID `b265580b-1d13-46b0-bea2-f86e132e7b54`, version 5.
- Read-only database confirmation: demo batch `PH-BAT-20261004-TAHDCRV5` (`8e80e870-684c-4abd-9502-1e380da4783b`) remains Draft/version 10 with six members, one archived setting, zero sequencing destinations and zero material transfers. All six source libraries retain 20 µL.

## Connected UI checkpoint

The Catalog detail shows the 5 µL minimum. The updated Sequencing tubes dialog opens one active source/destination pair, shows `0 of 6` progress, reads back the 5 µL Catalog requirement and version, retains all six sources in the selector and compact pair list, and exposes no batch minimum editor. Allocating an empty destination remains separate from recording the actual material transfer.

Scanner, invalid-entry and narrow-screen checks are pending dismissal of a Chrome extension popup. The extension blocked automation when filling the barcode control; read-only UI inspection did not establish scanner behavior. No destination was allocated, label printed or transfer recorded during this checkpoint. The temporary synthetic browser fixture and its Vite process were removed after inspection; actual transfer validation in that fixture remains unverified.

## Engineering verification

- Solution build, including regression source compilation: passed, zero warnings/errors.
- Frontend TypeScript and scoped ESLint: passed.
- EF pending model change check: passed; no model drift.
- Database ERD regenerated: 231 tables, 3,425 fields and 552 foreign keys.
- Documentation generation/check: passed, 56 guides, corpus `a198cfcd3c50`.
- `git diff --check`: passed.
- Automated test suites: authored/updated, not executed under the request-only rule. Coverage includes per-service minimums, Catalog-family restrictions, immutable pair snapshots, exact minimum boundaries and debit/credit, both scans, label prerequisites, next-pair progression and exact command recovery.

No Git publishing, production migration or deployment was performed. Browser form checks do not establish physical scanning, measured volume, scientific qualification or provider acceptance.
