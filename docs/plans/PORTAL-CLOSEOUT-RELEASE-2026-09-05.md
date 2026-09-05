# Portal closeout release - 2026-09-05

The Product Owner authorized tests, documentation, commit and API/UI deployment.
The repository separately requires explicit approval for a production database
migration. The Product Owner approved the reviewed migration and API/UI release
on 2026-09-05 with "Deploy please." The API and Portal UI are deployed to production.
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

## Production release evidence

The application release is commit `ab2df0aa6b88a515dce0e13a01c415e5b3154c47`,
pushed to `main`. A subsequent documentation-only commit records this evidence;
it does not change the deployed application code.

- API: [Deploy Portal Green run 33975386749](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/33975386749)
  succeeded on 2026-09-05 at 15:40:56 UTC. The runtime image revision matched the
  full release commit. All seven reviewed migrations applied successfully.
- Backup: `pre-migration-20260905T154037Z-ab2df0aa6b88` under
  `/var/backups/phaeno-portal-deploy`. Both the encrypted dump and wrapped key
  passed checksum verification. This is backup evidence, not full restore acceptance.
- UI: [Vercel deployment C4mxejzDYqEGHMJuoZzqBUpeVnNt](https://vercel.com/cadexgenomics/phaeno-ops-mgmt-system/C4mxejzDYqEGHMJuoZzqBUpeVnNt)
  (`dpl_C4mxejzDYqEGHMJuoZzqBUpeVnNt`) reached Ready and Production on the
  exact release commit and served [the Portal](https://portal.phaenobiotech.com).
  Git integration promoted it automatically; no separate promotion was needed.
- Public probes at approximately 15:43 UTC: API health returned 200/healthy,
  database ping returned 204, and an unauthenticated released-deliverables API
  request returned 401 as expected. Portal `/`, `/departments`, and
  `/released-deliverables` returned 200. The production browser rendered the
  invitation-only sign-in screen.
- The inspected Vercel runtime-log window had no Warning, Error or Fatal entries.
  Build-time requests to Clerk proxy paths on the unique `vercel.app` host
  returned 404; the production custom-domain sign-in screen rendered successfully.
  No signed-in Clerk or Department workflow acceptance was performed.

`FileStorage__Provider=Disabled` was installed by the deployment workflow.
Retention/deletion activation remains held, and the database was not restarted
to enable commit tracking. Trial scientific criteria, signed-in hosted workflows,
mailbox delivery, physical shipping and storage activation remain separate gates.

Local logs and TRX/PDF/browser artifacts are under `artifacts/portal-closeout`,
including `api-deployment.log` and `public-probes.json`. The local verification
checkpoint and full-suite counts are recorded in
[Portal plan closeout](PORTAL-PLAN-CLOSEOUT.md#release-closeout-checkpoint-2026-09-05).
