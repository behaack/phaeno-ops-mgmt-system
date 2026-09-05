# Portal closeout release - 2026-09-05

The Product Owner authorized tests, documentation, commit and API/UI deployment.
The repository separately requires explicit approval for a production database
migration. Deployment is prepared; production migration approval is still pending.
Trial scientific criteria and storage activation are separate unresolved items.

## Reviewed schema changes

From committed migration `20260904173717_ScopeDatasetGrantsByDepartment`:

| Migration | Change |
| --- | --- |
| `20260905011422_AddOrganizationConfigurationDefaults` | Five nullable organization defaults. |
| `20260905014541_ScopeCuratedDownloadAuditByDepartment` | Nullable historical Department scope, foreign key and replacement index. |
| `20260905022605_UnifyGovernedResultRetentionPolicy` | Governed snapshot/artifact references and nullable general-file reference. |
| `20260905031439_AddGovernedRetentionCheckpoints` | Durable warning/grace checkpoints and outbox references. |
| `20260905114659_RecordGovernedDownloadCommitEvidence` | Durable database commit evidence table. |
| `20260905135247_CloseReleasedDeliverableLifecycle` | Hold/reissue tables and cleanup/quarantine state. |
| `20260905140916_FreezeReleasedDeliverableReceiptLineage` | Nullable immutable release-time lineage. |

The forward script adds three tables, nullable/defaulted fields and indexes; it
replaces one audit index and relaxes one existing reference's nullability. It
contains no business-row deletion or retention-date backfill. The complete ERD
has 144 model tables, 2,151 fields and 257 foreign keys (plus public history).
The reviewed idempotent SQL is generated under
`artifacts/portal-closeout/production-migrations.sql` and is reproducible from
these committed migrations. All seven were applied to guarded local databases.

## Production target and recovery

Use **Deploy Portal Green**, environment **production**, for the release commit,
with `apply_migrations=true` only after explicit approval and
`cutover_clerk_identity=false`. Target `/opt/phaeno.portal-green`, Portal API
loopback port 8084 and its isolated Docker-network PostgreSQL. No unrelated
application/database or identity-provider configuration is part of this release.

The existing production environment has `PORTAL_MIGRATION_BACKUP_PUBLIC_KEY`.
The workflow creates a pre-migration database dump under
`/var/backups/phaeno-portal-deploy`, verifies its restore manifest, encrypts it with
a random AES passphrase wrapped by the configured RSA public key, checks encrypted
checksums, and removes plaintext. A dump manifest check is not a full restored-
database acceptance run. Stop if the backup gate fails. Local migration execution
was short; production duration depends on table size and lock availability.

After migration, prefer an inspected forward fix. Automated old-image rollback
is disabled after schema changes; lineage/lifecycle/commit-evidence Down guards
refuse to discard existing evidence. Full restore requires the backup private key
and an explicitly approved recovery window. Keep FileStorage disabled and all new
retention/deletion activation switches false; do not restart the database to
activate commit tracking as part of this code deployment.

## UI and verification sequence

The existing Vercel project is `cadexgenomics/phaeno-ops-mgmt-system`, serving
`portal.phaenobiotech.com`. Verify the deployment's exact Git revision, wait for
Ready, then promote if it is not already Production. Git integration may create
independent public Website builds; this request specifically deploys Portal UI
and API and does not change Website content.

Verify the API revision/container health, public health and database ping,
Portal alias/HTTP health and deployment logs. Record migration application and
backup artifacts from the workflow. These checks do not replace hosted Clerk,
two-Department, streaming, mailbox, physical shipping or scientific acceptance.

## Evidence

Local logs and TRX/PDF/browser artifacts are under `artifacts/portal-closeout`.
The local verification checkpoint records full-suite counts in
`PORTAL-PLAN-CLOSEOUT.md`. Commit and deployment identifiers are recorded only
after their operations succeed; production rollout is not yet recorded here.
