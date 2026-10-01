# Portal database reconstruction workflow

## Owner request and scope

On September 30, 2026 the owner requested a GitHub Action that clears database data except Phaeno users, built-in product types and the holiday calendar, then explicitly asked to keep it simple without rollback. This change creates that manual maintenance capability. It does not authorize running it, publishing Git changes, deploying application code or migrating production.

The operator is the repository owner or an authorized production maintainer. Success is a clean operational database with preserved staff sign-in/access, the three canonical product types and complete calendar history. Preview must describe preserved, cleared and recreated row counts without exposing personal information.

## Settled behavior

- Reset data in the existing Portal database in one PostgreSQL transaction. Keep its current schema and EF migration history; do not reconstruct schema from potentially different checkout/application versions. No replacement database, cutover, backup workflow or separate rollback machinery is included.
- Preserve all users with a Phaeno organization membership, including inactive users/memberships. Preserve their exact identity bindings, activation state, Phaeno organization and department membership dependencies, business/Lab role assignments and Trial approval authorities. Customer/Partner/Prospect memberships and organizations are cleared, including for a person who also belongs to Phaeno. Required authority references must resolve within retained records or the operation refuses before clearing data.
- Preserve the exact three built-in product-type records by canonical UUID, including their current definitions/status. Clear custom types, products, suppliers and stock.
- Preserve every business-calendar revision and every holiday row; clear timing policies and operational commitments with the jobs they belong to.
- Recreate only standard model reference seeds: the Phaeno internal supplier, default CRM pipeline/stages, three default Trial deliverables and Website notification processing control. Their old customized rows are not preserved. Keep this seed definition synchronized with the current model.
- Clear all other tables in `commercial_ops`, `lab_ops` and `website`, including invoices, requests, customer accounts, jobs, samples, scientific/file metadata, Website intake and prior audits. Record one new maintenance audit. Enumerate tables from the database so newly added operational tables are cleared too. Do not use `TRUNCATE ... CASCADE` or touch other schemas/databases.
- Leave external Clerk accounts, runtime configuration, file bytes, database volumes and separate Emmaus/OCIA services untouched. Deleted metadata can leave unreferenced files; physical file cleanup is a separate task.

## Workflow and guards

`Reconstruct Portal Database` is manual, with `preview` as the default and `reset` requiring `RESET PORTAL DATABASE`. Use the protected production SSH secrets and existing production concurrency group/server deployment lock. Preview uses a consistent transaction and returns counts. Reset verifies the API's actual canonical database target, healthy PostgreSQL 18 service and expected volume; pauses only that exact API container; locks the application tables; captures the allowed records in temporary tables; validates preserved dependencies; clears/reinserts/reseeds; and compares every table before commit. The API restarts on success or failure, followed by health/database-ping checks. PostgreSQL transaction failure prevents a partial data reset; this is not an application rollback procedure.

Do not upload staff records or secrets as GitHub artifacts. Logs and the retained maintenance receipt contain table counts, operation/source identities and statuses only. An active linked Phaeno organization administrator, exactly three built-ins and a populated calendar are required before reset.

## Verification and acceptance

Static checks cover YAML/shell syntax, SQL template construction, paths and whitespace. Read-only preview against production checked 223 deployed application tables and confirmed three Phaeno users, three built-ins, one calendar and 33 holidays, with ROLLBACK and no persistent data changes. No application model changes or builds are needed. Automated suites and a destructive connected rehearsal remain deferred under the repository's request-only test rule. Required connected cases are listed in BACKEND-TEST-PLAN.md. Preview and static checks are not evidence of a successful production reset or API interruption/restart. The workflow must be committed/pushed before GitHub can discover it; those Git operations remain separately authorized.
