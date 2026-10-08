# Material lot identity and Library prep matching

## Product decision and scope — September 17, 2026

Authorized: write this plan and execute it. Operators need to select the actual stock used without accidentally choosing a different product from the same supplier. Configuration authors define the material identity; operators choose only its eligible lot and the quantity at run time.

1. New purchased lots require an active catalog product from the selected supplier. Retain their controlled material definition, QC, storage, units and stock model.

2. Existing purchased lots remain unlinked until an authorized operator explicitly assigns a product from their recorded supplier. Provide a bounded Assign product modal on lot details. Require the current lot version; make the assignment one-time and audit it through existing audit stamping. Do not infer mappings, change suppliers or rewrite consumption records.
3. Lab step and inline protocol authoring support catalog products, internal prepared-reagent definitions, and manual material descriptions. Tracked new fields require a product or prepared-reagent definition. Manual descriptions remain available when stock/lot tracking is not requested. Preserve frozen historical definitions; legacy fields without structured identity retain their existing behavior.
4. Product-configured fields accept only supplier lots linked to that exact product. Prepared-reagent fields accept only prepared lots of that exact material definition. Enforce matching on the server as well as in the selector. Unlinked and wrong-product lots cannot satisfy a product-specific step.
5. Keep QC release, expiry, positive available stock, unit compatibility, optimistic concurrency, atomic step/consumption saving and batch per-sample totals. Inform operators when no matching eligible lots exist. Preview uses fictional lots with matching product/definition identities and does not consume inventory.
6. New material configurations require a quantity unit, entered as text with Units and symbols assistance. Persist it in the existing capture unit property and show it in the runtime quantity label (for example `Quantity per sample (µL)`), with no editable runtime unit. Require exact unit matching for tracked lots in both selection and server validation; do not silently convert. Preserve legacy approved definitions without a unit, falling back to their lot unit or untracked manual entry.
7. Keep resource cards evenly spaced and use the available row width for a quantity whose unit comes from its lot. Place the shared report upload last among step-entry fields, after sample entries and rationale and before final confirmation.

September 24 identity refinement: the purchased-lot form no longer asks operators to choose a second Material value. The server creates or reuses a stable internal definition for the selected product when no definition is supplied. Existing product-linked and unlinked lots keep their recorded definitions and assignments. Phaeno reagents use a named reagent definition created or selected when their manufacturing workflow is configured; the generic material-lot creation path no longer creates them. The legacy explicit-definition API input remains accepted for purchased-lot compatibility; no schema change or backfill was needed for this identity refinement.

September 24 unit refinement: each supplier catalog product has one standard inventory unit. Catalog administrators enter it on new products and verify it for existing products; the migration leaves old products unset rather than guessing. New purchased lots require a configured product unit, display it without an editable unit choice, and reject any mismatched API value. Lot amounts remain actual received quantities; historical lot units are not rewritten. A legacy product can set a future unit even if older lots used another unit; changing an already configured unit is blocked if it conflicts with linked lots. Phaeno-prepared reagents use the same principle on their reagent identity, with actual yield recorded only at run completion. The additive `ReagentIdentityAndInventoryUnits` migration was separately approved and applied to the configured local development database. Focused connected regressions passed.

## Engineering approach

Add nullable `supplier_product_id` to material lots, with a restricted foreign key and index. Leave historical rows null. Keep prepared lots product-free; retain material-definition linkage already present. Add optional identity fields to existing DTOs and protocol JSON with server-side resolution of canonical names. Reuse existing lab authorization for read-only catalog access and lot assignment; supplier administration permissions do not change. No dependencies or authentication changes.

Generate and review an additive EF migration; update the complete ERD in the same change. Verify the configured database target before applying locally. No production deployment, Git mutation or speculative data backfill is part of this implementation.

## Acceptance and verification

- Create purchased lots with exact supplier/product pairing; reject missing, inactive or mismatched products and product links on prepared lots.
- Assign an existing unlinked lot once; reject stale requests and replacement of an established product identity.
- Configure a purchased product or prepared-reagent definition; round-trip and preview the identity.
- Exclude wrong products (including another product from the same supplier), unlinked lots, wrong prepared definitions, failed/expired/empty stock; reject forged mismatches server-side.
- Preserve earlier consumption and all existing QC, units, quantity and concurrency guards.
- Update affected Phaeno guides and living test plans. Add meaningful domain/API/helper regressions; build/typecheck/lint at the logical checkpoint. Automated tests are not executed unless requested under repository policy.
- Inspect connected local UI without changing the user's operational lots or batch. Report any API restart or unavailable populated acceptance separately.

## Status

Implementation complete; build/static checks and connected local UI inspection passed. Automated regression execution and operational write acceptance remain unperformed.

- Added exact product and prepared-definition matching, purchased-lot product selection, one-time assignment from lot details, and matching fictional preview inventory. Existing lots, consumption and frozen configurations were not backfilled or rewritten.
- Applied additive migration `20260917225502_LinkMaterialLotsToSupplierProducts` to the verified local Development database (`localhost:5432/phaeno_ops`). No shared or production database migration was applied.
- Release solution build (including regression test compilation), frontend typecheck, scoped ESLint and whitespace checks passed. Domain, PostgreSQL/API and frontend regression cases were added or updated; automated tests were not run under repository policy.
- Updated the ERD, API contract, Phaeno guides and living test plans.
- After the user restarted the API, connected browser inspection verified Watchmaker offered Reagent A, switching to Containers R US cleared that selection and offered only its three container products, and an existing unlinked lot's Assign product modal offered only products from its supplier. No assignment was saved.
- In the unsaved configuration editor, selected Reagent A with lot tracking and previewed the matching fictional lot. The lot supplied its unit automatically; 10 µL per sample across two samples displayed 20 µL total and validated successfully with “Nothing was saved.” Discarded all temporary configuration edits. No operational lots, batch records or configurations were saved during inspection; no browser console errors were reported.
- No prepared-reagent definitions existed in the local catalog for populated browser acceptance. Prepared-definition matching is implemented and regression cases compile, but that populated journey and actual inventory-write/rollback acceptance remain unverified.
- No Git staging, commit, push or deployment performed.

### Configured units and layout follow-up

Material units are now required in new configuration using a text field with the existing Units and symbols menu. They round-trip through the existing capture JSON and appear in runtime labels before lot selection. The server rejects runtime unit overrides and lot-unit mismatches. Legacy definitions remain readable. No migration is needed.

Release solution build, typecheck, scoped lint and whitespace checks passed. Updated regression cases compile but were not executed. Browser preview verified the µL menu choice, `Quantity per sample (µL) *` without a unit textbox, evenly spaced material fields, and the report after other step-entry fields and before final confirmation. Temporary editor values were discarded; no operational records changed. The user restarted the local API and its health endpoint returned HTTP 200/healthy. Saved configuration and operational write acceptance remain unverified; no records were changed for these checks.

## Per-sample material exceptions — approved implementation

Operators may configure material as Same entry with sample exceptions (per-sample amounts only). Runtime starts with one batch amount/lot; Record exception reveals collapsed sample cards. Each affected material has an explicit override checkbox, actual amount (zero allowed) or Amount unknown, required reason, and disposition: Continue (permitted variation), Hold for review, or Close attempt as failed. Unknown amounts cannot continue. Overrides inherit the shared product, lot and unit; total-batch amounts cannot have per-sample overrides.

Save step record atomically retains all effective amounts, reasons, dispositions, stock use and step history before applying holds/failures. Shared consumption excludes overridden tubes, known overrides deduct their actual amount, and failed tubes retain consumption. Immediate failure is disabled while an unsaved material exception is being entered; saving applies its disposition. Corrections preserve earlier resource use and cannot silently replace exceptions.

Unknown consumption never invents a number: it flags the lot balance for reconciliation after all known use is deducted. A lot with an unresolved balance cannot be consumed anywhere. Materials exposes a Supervisor/Operations Administrator reconciliation action with counted remaining quantity, reason, current version and retained audit history. Reconciliation does not attribute guessed amounts to specimens. A Supervisor can resolve an operational tube hold with a review explanation; failure stays terminal.

Existing approved definitions and batches retain their scopes. Extend existing preparation-record JSON for per-tube exception metadata; add inventory reconciliation fields/history to the lot with an additive local migration. Update ERD, contract, guides and test plans. Build/typecheck/lint and read-only/disposable preview checks; author but do not run automated tests unless requested. No production migration/deployment or Git mutation.

### Material exceptions implementation checkpoint

- Implemented shared per-sample material defaults and explicit overrides (known positive/zero or unknown), required exception reason and continue/hold/fail outcome. Common amounts exclude overridden samples; aggregate stock validation includes all known uses of each lot. Known consumption, evidence and outcomes share the existing preparation transaction and replay protection.
- Unknown amounts hold tracked lot balances. All consumption paths enforce the hold, and lot selectors exclude held inventory. Added supervised quantity reconciliation with retained history, plus supervised tube hold resolution that checks unresolved linked lot balances. Failures retain consumed stock and remain terminal.
- Applied additive migration `20260918000907_AddMaterialQuantityReconciliation` only to verified local Development `localhost:5432/phaeno_ops`. Updated the complete ERD, contract, guides and generated help corpus.
- Release solution build passed with zero warnings/errors, including compilation of new PostgreSQL regressions. Frontend typecheck, scoped ESLint, documentation generation/check and whitespace checks passed. Automated tests were authored but not run under repository policy; actual transactional writes, role denial, stale/concurrent reconciliation and populated reconciliation acceptance remain unverified.
- Connected local configuration preview verified initially hidden/collapsed sample cards, fixed µL labels, required reason/outcome errors, zero with hold, unknown with hold (Continue unavailable), known amount with failure, common subtotal excluding the override, and clearing exceptions restoring both common shares. Preview reported Nothing was saved. Closed preview and editor without saving; no operational lots, batch records or configuration were changed.
- Requested a Visual Studio API restart to load the new backend. Restart confirmation and new-backend runtime acceptance remain pending. No staging, commit, push, deployment or production migration was performed.

### Production release — September 17, 2026

The owner subsequently authorized commit, push and deployment, with the earlier explicit production EF migration authorization retained. Application revision `1e96aa35a84d811296dd7bed4f554af788957a72` is deployed to both the API and Portal UI. The three additive migrations completed after encrypted-backup and isolated restore verification. See the [release record](../testing/runs/2026-09-17-lab-step-materials-release.md) for exact deployment identities and the remaining operational acceptance boundary. Local fixtures and operational records were not copied to production.
