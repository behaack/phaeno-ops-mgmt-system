# Laboratory workflow release — September 12, 2026

## Authorized scope

Owner requested commit, push, API deployment and Portal UI deployment for the accumulated laboratory workflow changes. Release includes tube-level intake decisions and rejection without fictitious storage, specimen attempts and reserve fallback, tray-based library preparation and shared evidence, configuration/retirement, workflow and navigation/UI improvements, release-queue default, tests and current help. Customer-requested holds remain blocked as documented. UAT is partial: real bench/device/provider/file scanning and Customer publication are not validated by the synthetic acceptance cases.

Local-only test accounts, credentials, cloned databases, runtime flags, fixture helpers and search-index changes are excluded. Public Website is outside this release. Preserve existing production storage/scanning/auth and feature settings.

## Production database gate

Seven migrations are included, in order:

1. 20260911164357_AddEquipmentRetirement — nullable retirement audit fields.
2. 20260911172654_AddProtocolRetirement — nullable retirement audit fields.
3. 20260911174615_AddWorkflowInvalidation — invalidation timestamp and reason.
4. 20260911192043_AddTubeIntakeReview — nullable intake decision/reason/review audit fields.
5. 20260911200711_AddSpecimenTubeAttempts — tube-use policy, specimen processing and attempt/lineage records and indexes.
6. 20260911205728_AllowRejectedTubeWithoutStorage — nullable tube location; changes already-rejected tubes incorrectly marked Available to Rejected.
7. 20260911234552_AddLibraryPreparationBatches — tray formats, preparation batches/members/records and resource links.

Forward changes retain existing records; no forward table/column deletion. Deployment must use the existing encrypted-backup migration workflow before replacing the API. Database migration needs explicit owner approval under AGENTS.md. Do not deploy schema-dependent API/UI without this gate. Automatic application rollback after migration is disabled by the release script; recovery after a failed migrated deployment requires inspecting the failure and choosing a forward fix or the retained backup.

## Verification checkpoint

- API Release build: passed, zero warnings/errors.
- Frontend TypeScript check: passed.
- Selected backend domain tests: 66 passed, zero skipped.
- Selected frontend tests: initial 53 passed and two failures from an outdated test dashboard missing protocols; fixture corrected, focused rerun two passed. No product workaround added.
- Previous signed-in UAT evidence: docs/testing/runs/2026-09-12-lab-14-preparation.md. Test-only package approval/denial/handoff is not production acceptance.
- Production API/UI build, exact revision, migration backup and runtime health: pending deployment.

## Production release completed — September 12, 2026

Owner explicitly approved all seven production migrations after the commit/push request. Application source deployed: 5365a38015e8fd444b6e802b5e5345c1dbe6ab57 (Implement tray-based library preparation and governed lab workflow), on codex/portal-documentation-search-release.

### API and database

[GitHub deployment 34716138359](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/34716138359) completed successfully for that exact headSha. Inputs: apply_migrations=true; file storage/scanning Preserve; Clerk identity cutover=false. Production feature flags and identity policy were not changed to match the local UAT runtime.

Backup verification logged backup_restore_check=PASS and encrypted dump/key checksums OK for pre-migration-20260912T201054Z-5365a38015e8. Encrypted backup is retained by the established server workflow under /var/backups/phaeno-portal-deploy. All seven listed migrations applied, ending at 20260911234552_AddLibraryPreparationBatches. The workflow reported deployment succeeded and source_revision=5365a38015e8fd444b6e802b5e5345c1dbe6ab57, then passed public dial-tone verification.

### Portal UI

Git-built preview dpl_5NLcNg7genzPVtCqfxbKf8tMgRYY was verified against the successful Vercel status on the exact commit. A separate local-upload attempt stalled before creating a production deployment and was stopped. After API success, the verified preview source was rebuilt with the production target using the Vercel CLI.

Production deployment: [dpl_3EJvA2hr3qVj3H1eZCN8mhWeYkXv](https://vercel.com/cadexgenomics/phaeno-ops-mgmt-system/3EJvA2hr3qVj3H1eZCN8mhWeYkXv), Ready, aliased to https://portal.phaenobiotech.com. Deployment URL: https://phaeno-ops-mgmt-system-87a3wltkp-cadexgenomics.vercel.app. The Portal project alone was explicitly deployed; Git integration also produced automatic Website previews, but no public Website production promotion was requested or performed.

### Runtime verification and remaining acceptance

At approximately 20:13 UTC: Portal root returned HTTP 200 HTML; Portal /api/health proxy returned HTTP 200 and healthy; direct API /api/health returned HTTP 200; API /api/v1/web-ops/database-ping returned HTTP 204. Vercel inspection confirmed the production Portal alias targets the deployment above.

No production operational records were created for UAT, no synthetic packages were published, and no local test accounts, credentials, databases or helper files were deployed. The uncommitted local search-index segment change remains excluded. Production signed-in workflow acceptance, real bench/device/provider/file-scanning acceptance and Customer publication remain separate gates; this release proof does not close them. Release-evidence documentation may be committed after the deployed application revision without requiring a second application rollout.
