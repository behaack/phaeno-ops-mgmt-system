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
