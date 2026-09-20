# Company workflow and repeated-sequencing release

## Scope

The owner authorized the pending Company access, onboarding/readiness, directory and request-history changes; standard Actions menus, list headers and search; sample/shipping configuration improvements; generated department/sample/destination references; and repeated sample-sequencing ordering, pricing and laboratory processing. Existing department administrators can make approved purchasing and Trial decisions only within their assigned departments. Company-wide setup remains available to Phaeno staff.

One preparation can supply several purchased sample-sequencing runs. Each output records the purchased run number and explicit new-preparation or existing-library choice, alongside its actual producing library, preparation and sendout. Twenty samples once and one sample twenty times both have quantity 20. Additional files, linked corrections and reanalysis do not add purchased units. Approval, completion and first delivery require coverage of all purchased runs. Prior accepted prices and historical lineage remain intact.

## Database review

The owner explicitly approved production EF updates after reviewing this release. The following three migrations are now applied to production as well as verified localhost development and the separate release-verification database:

1. `20260919231447_AddSampleSequencingRuns`: optional order run count; sample allocation defaults to one.
2. `20260920022358_AddSequencingRunLineage`: optional output run number and preparation choice; specimen/run lookup index. Historical records retain unspecified preparation choice and count as run one.
3. `20260920023907_AllowRepeatedLibraryPreparation`: replace two uniqueness filters so only Planned, InProgress and OnHold preparations compete for a specimen/source. Multiple completed preparations are preserved; one active preparation remains enforced.

The generated forward SQL adds four columns and replaces three indexes. It does not delete business records or reset configuration. EF reports no pending model changes. Both configured local databases contain the baseline plus these three migrations. The user’s local working records were excluded from automated test fixtures.

Before production migration, the existing deployment script creates an encrypted database backup and restores a disposable copy to verify it. Use the retained migration recipient at `reset-20260919/rebase-backup-public.pem`, whose public-key fingerprint matches the existing local migration recovery key. Preserve the recovery archive, recipient and prior application image. Do not automatically downgrade after repeated-preparation history has been created: the old unique indexes may no longer accept that history. A failure after migration requires an assessed forward fix or restoration of the matched backup.

## Deployment target and procedure

The verified API target is `/opt/phaeno.portal-green` on the existing Portal host, container `phaeno-portal-green-api`. The live source before this release is `9ca9820014af07aa7280bd57a73cb66f5ff6044b`. PostgreSQL is now 18.6 on the dedicated production volume, following the separately completed engine upgrade.

Use the existing `deployment/hetzner/green/deploy-release.sh` against an archive of the exact committed source. Preserve runtime authentication, file storage/scanning, scientific enforcement and the intentionally blank bootstrap email. The generic GitHub workflow currently reinstalls bootstrap values, so direct use of the deployment script preserves the verified post-rebase runtime configuration.

The Portal Vercel project is `phaeno-ops-mgmt-system`, ID `prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R`, team `cadexgenomics`, root `frontend`, production domain `portal.phaenobiotech.com`. Deploy the same pushed commit with Production settings; the public Website is a separate project. Verify deployment source identity, API health (200), database ping (204), Portal root (200) and a fresh navigation. Record actual deployment identities after activation.

## Verification

- Frontend: all 1,094 tests pass across 174 files; lint, TypeScript and the production build pass.
- Browser: full run passed 174 with two CRM fixture failures; after aligning the fixture with the Actions menu, all six Company cases passed across desktop/mobile. This gives passing evidence for all 176 applicable cases. Two mobile print cases are intentionally skipped. It is not represented as one uninterrupted zero-failure full run.
- Backend: final full run passed 957 tests with zero failures and one Windows-only skip. That skipped Unix fixture passed separately on Linux, giving passing evidence for all 958 cases. Pricing and controller approval checks also passed (3/3), and repeated-run/persistence/delivery coverage passed (47/47).
- Unix-only linked-directory protection: passed in a network-disabled, read-only Linux container with no production data mounted. Windows skips this test because its symlink fixture requires separate host privileges.
- Documentation corpus (`6edf2a542e36`), EF pending-model and whitespace checks pass. Release identity is verified when publishing.

Browser and database fixtures simulate authentication, provider responses and scientific records. These results do not establish real bench work, physical material sufficiency, provider delivery, production sign-in acceptance or final scientific/business approval. Production activation completed as recorded below; signed-in hosted workflow acceptance remains separate.


## Activation preparation correction

The first activation attempt stopped before the backup/migrations because the scanner startup/configuration files were exported with CRLF by Windows Git archive. The tracked blobs contained LF, but `.gitattributes` did not cover the nested scanner directory. The API stayed healthy on its previous image. The mounted scanner files were normalized and the scanner restarted; the release now enforces LF for every scanner configuration/script in Git exports. Application code and the three reviewed migrations are unchanged. Activation resumes from a new exact commit containing this packaging correction.


## Completed production activation

The owner approved the EF updates in this task. The matching API and Portal source is `268ba93dbacd66b93c3f9f7f434bd2bf8e76d7e9`; it contains tested application commit `3c8e65be01dc4a5db4c12d0cd1767096a411f334` plus the scanner archive-format correction.

- API activation completed at **2026-09-20 03:25:01 UTC**. Image: `phaeno-portal-green-api:sha-268ba93dbacd-manual-20260920`; actual image ID: `sha256:6a51fb8696b08235367339b8af51dc2a515b3d4cfde427003ee5227bbc375658`.
- Production migration history contains the baseline and all three reviewed migrations, ending in `20260920023907_AllowRepeatedLibraryPreparation`.
- The API and scanner are healthy. The intentionally blank bootstrap email remains blank. Authentication, scientific enforcement, and storage/scanning configuration were preserved. Public Website intake counts remained unchanged by deployment probes.
- Vercel Production deployment `dpl_9QutCTrURqqgfmkJyhBxUghCdtjQ` is Ready, reports the same source SHA, and owns `portal.phaenobiotech.com`.
- Public API health returned HTTP 200, database ping HTTP 204, and Portal root HTTP 200. A fresh Edge reload rendered the production sign-in form; captured browser error logs were empty. No signed-in production session was available, so this is sign-in rendering and release-health evidence, not authenticated workflow acceptance.
- Pre-migration backup: `pre-migration-20260920T032442Z-268ba93dbacd`. The actual backup restore and cleanup checks passed before migration. Encrypted database/key envelopes and their checksum receipt were copied to the ignored local `artifacts/repeated-sequencing-release-20260919` directory and both envelope hashes matched. No plaintext recovery data or private key was transferred to source control.
- The exported scanner directory passed an LF-only check for all four files, and all three scanner shell scripts passed shell syntax validation. No application-code or migration changes were needed after the full passing test checkpoint.

This closes the requested documentation, tests, commit, push, EF update and deployment work. Real provider, physical laboratory and final scientific/business acceptance remain the previously documented external boundaries.
