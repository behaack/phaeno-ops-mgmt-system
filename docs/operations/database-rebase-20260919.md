# September 19, 2026 database rebase

Status: rehearsal verified; activation and release pending. Owning authorization and scope: [database reset plan](../plans/DATABASE-REBASE-AND-RESEED-PLAN.md), followed by the owner's **Execute** instruction.

## Targets and recovery boundary

| Environment | Original database | Prepared replacement | Activated name |
| --- | --- | --- | --- |
| Local PostgreSQL 18 | `localhost:5432/phaeno_ops` | `phaeno_ops_clean_20260919` | `phaeno_ops_clean_20260919` |
| Production PostgreSQL 17 | Portal-only container `phaeno-portal-green-db`, database `phaeno_portal_green` | `phaeno_portal_rebased_20260919` | `phaeno_portal_green`, after renaming the old database to `phaeno_portal_green_before_20260919` |

The production rename preserves the canonical database name used by deployment and scheduled backup scripts. Keep the original database, full encrypted database/files recovery point, previous image, runtime files and exact application source together. Do not remove the old database or storage volumes as part of activation. Other applications on the host are outside scope.

The baseline is `20260919153100_InitialPSeqOperationsRebased`: 197 tables across `commercial_ops`, `lab_ops` and `website`. PostgreSQL 17 and 18 schema comparisons agree, including column defaults, indexes, foreign keys and checks. PostgreSQL 18 exposes individual NOT NULL catalog constraints; nullability is compared through column metadata on both versions. The retired chain has one renamed NOT NULL constraint whose meaning is unchanged.

Inventory discovered two existing Website `language` columns missing from the EF model and a historical database-only migration. The baseline now models those columns and retains their values. It also preserves 22 SQL-only column defaults, three product classifications and the approved 30/5/5 retention policy. Operational backfills are retired. Up refuses existing application schemas/history; Down refuses destructive downgrade.

## Preservation and seed

Protected exports, exact ID selection, every-table dispositions, source archive, hashes and import receipts are in the ignored `artifacts/database-rebase-20260919` directory and root-only `/opt/phaeno.portal-green/reset-20260919` on the server. The maintenance [tool](../../backend/tools/PSeq.Operations.DatabaseReset/README.md) validates dependencies, target identity and all imported rows before commit. No bootstrap, workers, identity provisioning or notifications run during import.

| Scope | Retained content |
| --- | --- |
| Production people/customer/CRM | Both users and organizations; departments, memberships, roles, entitlements and commercial terms; three CRM companies, two contacts, one lead, one opportunity, its contact and stage history, seven activities and one task; applied onboarding handoff and its linked request/services. All associated invitation intent/history is retained without resending. |
| Production Website | Twelve contact inquiries and five order inquiries, language values, two accepted deliveries/attempts and processing control. This is customer/prospect correspondence, so it is preserved rather than treated as disposable test orders. |
| Local people | One owner account, its original local Clerk binding, Phaeno administrator membership, department and existing Trial authority. No customer organizations or CRM sales activity. |
| Shared business defaults | Production CRM pipeline with seven stages; quote validity 30 days; approved retention policy; three system Trial deliverable definitions. |
| Shared physical definitions | Three transportation-container sizes with six definition revisions; three product types, three suppliers and four tube/container products. No stock, lots or physical kit instances. |
| Shared lab calendar | Six calendar revisions and 80 observed holiday rows covering the retained 2026/2027 configuration; same verified owner mapped to each environment's existing identity. |
| Catalog review | Production PSeq Service and its $1,250/specimen value retained **inactive**. The original description identifies a mock price and there is no scientific definition. The local $100 reference-test item and handling fee are excluded. |
| Scientific/shipping configuration | Retain the non-test PSeq protocol placeholder, which has no approved version. Exclude exact reviewed TEST ONLY/SOP-MOCK/reference-fixture protocol, workflow, step, tray, sample-type, destination, instruction, equipment, location and reagent rows. |

The clean system deliberately contains no invented approved scientific workflow, service definition, sample type or shipping destination. Staff must configure and approve real definitions before accepting new work. Order-readiness configuration remains unconfigured as it was in the retained source; no readiness assertion is fabricated. Result traceability and scientific-evidence enforcement remain enabled for new approvals/releases.

Prepared manifests contain 127 local rows and 211 production rows. Production includes every user/customer/CRM class above. Local has exactly one user. All excluded order, sample, preparation, sequencing, result, release, download, stock and transaction tables are empty. Full row comparisons include empty tables, not just headline counts.

## Verification

- Original local and production custom-format dumps restored successfully into isolated local databases. The production restore received the four pending traceability migrations only in the disposable copy, to compare the complete old chain with the baseline.
- Fresh baseline applied on PostgreSQL 18 and the actual production PostgreSQL 17 server. Every schema object agrees after accounting for the NOT NULL catalog representation.
- Transactional local and production candidate imports passed exact row comparison. Retained production data matched a fresh live snapshot after normalizing timestamp representations.
- Guard probes passed: wrong target, raw snapshot, missing foreign-key dependency with complete rollback, valid import, exact replay, conflicting replay, refusing a baseline on populated data, preserved rows after that refusal, and detecting post-import drift.
- UI unit tests: 1,061 passed. Lint, typecheck and documentation check passed. Release build caught and corrected one non-UTF-8 separator in the performance-review component; the subsequent build passed.
- Browser run: 174 passed initially; the two keyboard-order cases needed the new performer/time controls in their expected tab order and both passed after correction. Two mobile print cases are intentionally desktop-only.
- Backend full-suite verification and the final release identity are recorded below when complete. The existing Unix symlink case requires Linux and is explicitly excluded on Windows.

## Cutover procedure

1. Freeze the reviewed application commit and build the matching API and Portal release. Keep the old production image and protected runtime files. Verify the new API has no pending model changes and the frontend release build succeeds.
2. Obtain a fresh encrypted, restore-verified coordinated database/files backup using the existing Portal backup helper. Stop the Portal API and all its workers for the final preservation snapshot. Shared Website intake is briefly unavailable during the stop; do not replay old provider notifications.
3. Compare the frozen source's preserved data with the reviewed manifest. If it changed, rebuild and reverify the candidate from the final source before activation. Never ignore a mismatch. Capture a final encrypted database dump under the same write freeze.
4. Verify candidate import receipt, users/access/CRM, configuration and empty operational tables. Keep the old source intact. Rename the old production database to the dated rollback name and the verified candidate to `phaeno_portal_green`. Do not change the database role, password or Clerk bindings.
5. Start the matched new API image and PostgreSQL with `track_commit_timestamp=on` for download-commit evidence. The Compose setting makes this survive later deployments. Confirm enforcement overrides are true. Avoid bootstrap reprovisioning during activation because both administrator accounts already exist.
6. Check API health/database access, retained identities/relationships, hosted Portal pages, CRM and settings, shared Website API behavior and canonical backup targeting. Enable normal workers only as part of the verified application startup. Record exact image/commit, UI deployment, import hashes, backup IDs and actual outage.
7. Repoint ignored local development configuration to `phaeno_ops_clean_20260919`, preserving local credentials and Clerk settings. Keep `phaeno_ops` for rollback. Revalidate one-account scope and empty operational work.

## Rollback

Before reopening writes, stop the new API. If activation failed, retain the failed replacement under a distinct dated name, rename `phaeno_portal_green_before_20260919` back to `phaeno_portal_green`, restore the saved runtime files and old image, then check API health/database ping. Never pair the old image with the new schema or erase migration history. Existing managed-file volumes remain intact; restore the matched encrypted file/database backup if files changed. After writes reopen, reconcile new records before rollback; a blind rename could lose new business data.

For local rollback, restore only the former database connection value. Do not overwrite the user's complete local settings file. Cleanup of the old databases, protected manifests or recovery archives requires a separate explicit decision.

## Activation record

Pending successful final tests, matched release and verified cutover.
