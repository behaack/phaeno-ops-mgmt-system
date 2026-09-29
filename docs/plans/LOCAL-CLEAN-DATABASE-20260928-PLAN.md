# Local clean database and compatibility removal

## Authorized outcome

On September 28, 2026 the owner requested deletion of the EF migration files, a completely clean local database, and one seeded administrator, `bhaack@phaenobiotech.com`. The owner expanded compatibility cleanup to the entire Portal, local only. This supersedes the selective local preservation decisions from September 19 and the additive purchased-container migration proposed earlier today.

The future production-hosted test reset is a separate exercise. Its preservation list has not been selected or authorized. No production reset, deployment, commit, or push is included here.

## Engineering decisions

- Inventory and back up only the configured local PostgreSQL database before replacement. Archive the previous migration source separately. Keep backups in ignored artifacts.
- Generate one initial migration from the complete current model across Commercial, Laboratory, and Website schemas. Refuse application to a populated database or previous migration history.
- Seed only the administrator and required organization, department, access, and built-in product/reference defaults. Preserve the verified local Clerk binding without creating or modifying an external identity. Do not import configuration, catalog products, customers, orders, or laboratory activity.
- Remove historical-data adapters, retired request/response fields, obsolete schema fields, rollout fallbacks, and migration/backfill code. Keep current product capabilities, including actual Trial/Partner supply workflows and external accounting integration; their age or a historical label alone does not make them backward compatibility.
- Kit specifications select purchased Shipping Containers, own kit SKU/name and required contents, and select a reusable assembly workflow. Remove the separate finished-kit catalog product, historical workflow binding, and complete-kit receipt branches.
- Keep scientific lineage, explicit authorization, released-document snapshots, concurrency, and current retention policies required for new records. Missing required evidence is an error, not an opportunity to infer historical values.
- Update the database ERD, affected user guides, and living test plans. Verify builds and static checks at the checkpoint; automated suites require the owner's requested scope.

## Local execution evidence

- Verified target: localhost:5432, `phaeno_ops_clean_20260919`.
- Pre-reset database contained 21 users. The requested administrator has the verified local Clerk subject and Bill Haack profile.
- PostgreSQL custom backup: `artifacts/local-clean-reset-20260928/before-reset.dump`; SHA-256 `0C0BD37920DCC871BA70982F1881CBF833F26DD685DCC83BA245A6479628E744`. Archive listing verified.
- Previous migration files and snapshot: `artifacts/local-clean-reset-20260928/migration-source-before-reset.zip`.
- Replaced all 68 previous migration/snapshot files with `20260928192920_InitialCleanPortal`, its designer, and the current snapshot. The migration creates 221 application tables, 3,239 fields and 525 foreign keys; the ERD was regenerated from the same snapshot.
- Recreated only `phaeno_ops_clean_20260919` locally and applied the guarded baseline. EF reports no pending model changes.
- Seeded Bill Haack, `bhaack@phaenobiotech.com`, as the only active user with one Phaeno organization, one default department and administrator memberships. Linked the verified existing Clerk subject locally; no external account was created or modified.
- Seeded Tube, Shipping Container, Reagent, the Phaeno supplier, standard CRM/Trial/Website references and the 30/5/5 retention default. Products, kit specifications, stock kits and Lab work are empty.
- Verified a fresh local browser session opens Purchasing in POMS and the user menu identifies Bill and the requested email. The owner's existing tab was not reloaded or edited.
- Restarted the current built API at `https://localhost:44399`; `/api/health` reports healthy. Read-only SQL after restart still shows exactly one active administrator and no catalog products, kit specifications, stock kits or work orders. Removed the isolated compile directory and this task's temporary helpers; retained the backups and final verification logs in the ignored reset artifact directory.

## Compatibility audit

Removed the retired finished-kit catalog binding, workflow-owned BOM, purchased-complete-kit receipt branch, family-level Sample type linkage and obsolete shipping specification fields. Tube assignments use explicit slots only, with explicit supplier namespaces. Removed unused persisted legacy components/job title, old inactive lifecycle, identity-cutover maintenance command, old Website brief recovery, un-attempted execution adoption, inferred forecast stages, synthetic resource captures, unscoped barcode collision fallback, old result-attribution/quote/sample-roster exceptions, and retired route adapters. The current CRM routes replace the unused customer-directory adapter. Required QC capture fields no longer have exemptions based on old fixture names.

Retained documented current capabilities: conditional prior-QC review, optional report attachment, supported Trial/Partner dispatch, direct scientific result uploads, native and connected accounting operations, configured authorization and result-retention modes, immutable history and missing-evidence diagnostics. These are current product workflows, not old-data converters.

Automatic approval review rejected removal of the old CRM lawful-contact-basis field and OptedOut/DoNotContact values because they may carry compliance records. The owner was asked for explicit confirmation. These fields and their read-only display remain pending that answer; the cleanup is not represented as complete for this category.

## Verification checkpoint

The complete solution builds with zero warnings and errors. Full frontend TypeScript and ESLint pass. Documentation consistency passes for 56 guides (corpus `96710f7fcefa`); the built API corpus matches the generated source. EF reports no pending model changes, and diff whitespace checks pass. Fixtures use purchased Shipping Containers and explicit tube namespaces; canonical-route cases replace redirect cases. Automated backend, frontend and E2E suites were not run in this local reset slice. No commit, push or production deployment was performed.

## Later production-hosted test exercise

On September 28 the owner explicitly blocked deployment until a separate deployment plan addresses the new production-hosted test database. `Deploy Portal Green` is disabled in GitHub, and the existing Vercel Git holds remain. This local reset record does not satisfy that gate. The [current hold and required plan scope](../operations-readiness.md#deployment-hold--september-28-2026) cover target isolation, preservation/reset decisions, coordinated backup and restore, replacement preparation, cutover, rollback and acceptance. Do not re-enable deployment controls or perform manual deployments/promotions while the hold applies.

Prepare a separate owner-approved preservation list, including the records and relationships to retain. Inventory the deployed schema and snapshot those records, verify a backup, construct and verify a replacement database against the new model, and review the preserved result before a separately authorized cutover. Never apply this clean baseline as an in-place upgrade to the existing populated database. The future preservation list and execution remain undecided and unperformed.

## Acceptance

One migration recreates all current schemas. Local application rows contain exactly one active administrator and its required access, with no imported activity or catalog products. Built-in defaults remain reproducible. The owner can sign in with the existing local Clerk account. New kit configuration and preparation use only the purchased-container model. Repository scans distinguish genuine compatibility adapters from supported current capabilities. Production remains unchanged.
