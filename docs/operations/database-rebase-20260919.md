# September 19, 2026 database rebase

Status: production reset and matching API/Portal release activated; local database switched. Local PostgreSQL service restart and signed-in acceptance remain open as recorded below. Owning authorization and scope: [database reset plan](../plans/DATABASE-REBASE-AND-RESEED-PLAN.md), followed by the owner's **Execute** instruction.

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
- Browser final full run: **176 passed, 2 intentionally skipped** desktop-only print cases on mobile. Two outdated keyboard-order expectations were repaired to include the performer/time controls.
- Backend full run: **927 passed, 1 failed, 2 skipped** of 930. The single failure was the legacy scientific-review fixture, which omitted its explicit legacy controller policy after the default changed to enforcement. After repair, that case and the previously skipped real database/private-file investigation restore both passed in a separate PostgreSQL database. The Unix-only symlink case passed separately in Linux with networking disabled. Thus all 930 cases have passing evidence across the full run and focused follow-ups; this is not represented as one zero-failure run. No unresolved automated failure remains.
- EF pending-model check, PostgreSQL 17/18 comparisons, release builds and whitespace checks passed. Browser fixtures simulate authentication/providers; these checks do not establish physical bench or real provider acceptance.

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

- Application source: `9ca9820014af07aa7280bd57a73cb66f5ff6044b`, pushed on `codex/portal-documentation-search-release`.
- API image: `phaeno-portal-green-api:sha-9ca9820014af-rebase-20260919`; image ID `sha256:fb0116d0fa51e4590390e50db7aa1e2441b2856dec6603b30321d2a8faad303e`. Activation completed at **2026-09-19 16:37:35 UTC**, with a **20-second** API cutover pause.
- Portal: production deployment [`dpl_5mQmuBRxNeBCh7Rfp4XufXCZst91`](https://vercel.com/cadexgenomics/phaeno-ops-mgmt-system/5mQmuBRxNeBCh7Rfp4XufXCZst91), rebuilt with Production settings from the same exact source and assigned to `portal.phaenobiotech.com`. Vercel reported Ready at 09:38 PDT.
- Final write-frozen preservation comparison passed. The activated production database then passed the exact package verification before browser activity. Local package SHA-256: `d018db29b7d12f97ffc5fc943cbde557405ae9d4ed4d4bf527096e235d4a9051`; production: `6b9c1cc49deff2e0142068b484a0e1ee7e77a0f9803705e270bae0549381a5e2`.
- Both databases contain only baseline `20260919153100_InitialPSeqOperationsRebased`. The old local database remains intact; the old production database is retained under its dated name with connections disabled. No old database or file volume was deleted.
- Production PostgreSQL runs with `track_commit_timestamp=on`; both scientific-evidence and result-traceability environment overrides are true. Bootstrap email was cleared in each environment to prevent startup reprovisioning of preserved accounts; credentials, memberships and external identity bindings were retained.
- Fresh API health and Portal health/root returned HTTP 200; database ping returned HTTP 204; the public Website search read endpoint returned HTTP 200. No contact form or notification was submitted as a probe.
- Local development configuration now points to `phaeno_ops_clean_20260919`, and the API/frontend were started on their normal local endpoints. Exactly one owner account and its dependencies were verified before startup. A read-only Clerk lookup independently confirmed the retained owner's external binding.

### Recovery evidence

- Pre-cutover coordinated database/files backup: `snapshot-20260919T163155Z-8aa3bab0-4de1-4d2e-9080-60db23d6cffd`, restore and cleanup verified; API pause **7 seconds**. Its encrypted envelope, key wrapper and receipt were copied off-server and checksums verified.
- The final write-frozen database dump was independently encrypted to the existing migration-backup recipient. Its encrypted envelope was copied off-server, decrypted with the existing private key, and matched original SHA-256 `55b195eddb0997f14d102525807388228731a5a522cc35aea6728deff669f5ee`. Temporary plaintext decryption/passphrase files were removed. The local encrypted backup likewise passed an exact decryption round trip.
- Post-rebase coordinated backup: `snapshot-20260919T164729Z-60508cfc-e72f-489f-ab70-9b18b9938e52`; the actual production helper successfully restored the new baseline and verified files/references and cleanup, with a 7-second API pause. Both coordinated snapshots had zero real file references; their populated synthetic file fixture passed. This proves the backup path works after the rebase, not a real populated scientific-evidence recovery or a scheduled trigger.
- Existing scheduled-backup recipient and scheduler were left unchanged. The canonical database name remains the scheduler target. No manual run is counted as scheduled-run evidence.

### Remaining acceptance

- The local instance still reported `track_commit_timestamp=off` and a September 13 server start after the first reported restart. `ALTER SYSTEM` has saved the required setting, but this session cannot restart the Windows service without administrator rights. An administrator restart of `postgresql-x64-18` and an `on` verification remain required.
- Production sign-in renders correctly, but no signed-in production session was available for live CRM/settings navigation. The existing local browser session shows Access unavailable; the retained owner's database identity and its Clerk binding match. The session's identity has not been established, so no identity was rebound or broader access granted to make a test pass. A fresh owner sign-in remains required.
- Configure real scientific definitions, approved workflows, supported sample types and destinations before enabling the retained inactive PSeq catalog item. Real producer, bench, physical handoff and business acceptance are separate from reset/release completion.
