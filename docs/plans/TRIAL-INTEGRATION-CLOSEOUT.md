# Initial PSeq Trial integration closeout

The Product Owner confirmed on 2026-09-05 that initial Trials use existing PSeq
analyses and acceptance rules. This completes the initial application integration
requested during Portal plan closeout. Production rollout of this change awaits
explicit approval of the new database migration below. Storage/deletion activation
and human scientific/physical acceptance remain separate gates.

## Delivered behavior

- First-party CRM Opportunity request to a distinct, no-charge Trial workspace.
- Versioned scope with existing PSeq analyses and the approved Lab workflow,
  selected deliverables, allowance, submission dates, costs and material terms.
- Named Commercial and Scientific Operations authorities and delegates; two
  different people must approve each scope revision. Amendments require fresh
  approval and Prospect acceptance.
- Organization-admin acceptance with visible RUO/no-PHI terms, coded RNA samples,
  required scientific inputs, explicit replacement lineage and one-use slots.
- Existing Lab execution, scientific review and shared sample shipping, scoped to
  the original organization and department. Trial holds guard shared mutations.
- Governed partial and complete result release, package RUO manifest, completed
  download evidence, frozen retention, warning/grace, preservation, cleanup,
  retained receipts and new-object reissue. Cleanup serializes with Trial holds.
- Independent commercial outcomes, explicit existing CRM conversion and guarded
  Prospect deactivation. Conversion preserves Trial identifiers and deadlines.
- Recoverable, relationship-safe CRM milestone publication. Trial events are the
  durable source, with pending counts and explicit retry in the Trial workspace.
- Staff review filters, Phaeno/Prospect workflows and four maintained audience
  guides, including Customer and Partner access to preserved Trial history.

No paid order, QBO transaction, payment gate, raw-pipeline ownership or identity-
provider change is introduced. Existing package and laboratory roles remain the
release/scientific authorization boundaries.

## Reviewed migration

`20260905172646_AddTrialProjectIntegration` follows the already deployed
`20260905140916_FreezeReleasedDeliverableReceiptLineage` migration. It adds ten
Trial tables, their constraints/indexes and the initial configurable FASTQ, FASTA
and BAM deliverable definitions. It adds nullable Trial parent references to
result packages and retention snapshots, relaxes the two legacy result-package
parent references, and enforces exactly one valid parent pair/package.

The forward script contains no business-row deletion, table removal, retention-
date rewrite or organization conversion. Existing paid result packages retain
their parents. New foreign keys/checks can require locks on existing result and
snapshot tables; do not apply during active release work without the deployment
window's normal coordination.

Reproduce the reviewed SQL from the committed migration using EF's idempotent
script command for the two migrations above. The local reviewed artifact is
`artifacts/trial-closeout/trial-production-migration.sql`, SHA-256:
`C3AAB0A9D3C32C70AB6760BC1E9464290259CA1E12CF95D32049DC9C7F4E70EF`.

The migration is applied to the configured **local** development database after
backup, and to isolated PostgreSQL reference databases. EF reports no pending
model changes. `docs/database-erd.md` includes all new entities and relationships.
The local backup is excluded from Git under `artifacts/trial-closeout/`.

## Verification

- Backend build and full suite: 365 tests, including 19 Trial checks; no skips.
- Frontend lint and typecheck pass; 166 tests across 61 files pass; production
  client/server build passes.
- All 58 browser checks pass, including Prospect acceptance/submission conflict recovery and
  Phaeno scope editing on desktop and mobile, plus WCAG 2.2 AA automated checks.
- Reviewed desktop/light and mobile/dark Trial screenshots; no horizontal overflow.
- Final checks: 365 backend tests, 166 frontend tests, 58 browser checks; zero
  failures or skips. No pending EF model changes; Git whitespace check passes.
  Existing advisory build-size/route-splitting notices remain.

The reference database uses local PostgreSQL with `track_commit_timestamp=on`.
The configured development instance has that prerequisite disabled, so commit-
tracking tests run on an isolated local instance with the expected `phaeno_ops`
source name. Test-created databases are removed by their fixtures. No production
or staging data is used by these checks.

These checks establish local application behavior. They do not claim live mailbox
delivery, signed-in production acceptance, provider transfer/scanning, physical
label/tube/shipper validation or regulatory/legal acceptance of real Trial terms.

## Production release boundary

Git commit and API/UI deployment were already requested. This **new** migration
was not part of the seven reviewed migrations approved for the prior release.
Root `AGENTS.md` requires explicit approval before applying a migration to a shared,
staging or production database. Keep the release local until that approval; a
main-branch push may trigger the connected UI deployment.

After approval, use the existing **Deploy Portal Green** production workflow with
`apply_migrations=true` and `cutover_clerk_identity=false`. Its verified/encrypted
pre-migration backup gate must succeed. Target the existing Portal Green API and
its database. Deploy the matching Portal UI and verify the API build/version,
health/database connectivity, public UI/sign-in and any available authorized
signed-in acceptance. Record actual release evidence here.

Prefer an inspected forward repair after migration. Do not run the generated
Down migration over Trial data: it removes the new records and restores required
legacy parent fields. A schema rollback requires a reviewed data-recovery plan.

## Activation gates retained

- Assign the actual Commercial and Scientific Operations primary approvers and
  delegates; review the active PSeq definitions and effective shipping config.
- Approve the first real destination and physical tube/shipper/label/scanner
  process; obtain final review of customer terms and actual material disposition.
- Complete existing storage/pipeline/scanner, hosted commit tracking, mailbox and
  deletion activation acceptance. Feature switches remain unchanged by this work.
- Perform the signed-in production Trial journey with the responsible staff and
  Prospect organization administrator before real scientific work begins.
