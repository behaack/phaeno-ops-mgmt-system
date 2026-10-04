# Portal workflow release — October 4, 2026

## Scope and target

The owner requested commit, push and deployment of the pending Portal changes.
The reviewed batch includes Lab steps and assembled master-mix workflows,
library preparation and labels, Catalog-controlled sequencing tube pairing,
kit shipping and cancellation presentation, direct Trial and CRM department
workflows, and workspace navigation. Associated help, ERD and tests ship together.

Target the production-hosted test Portal at `portal.phaenobiotech.com` and
`api.phaenobiotech.com`, database `phaeno_portal_green`, PostgreSQL 18,
under `/opt/phaeno.portal-green`. Preserve existing rows, identities, files and
runtime choices. The fake PSeq walkthrough remains in the local development
database; it is not copied to the hosted database. The public Website and
Emmaus/OCIA are outside this release.

This separate release plan addresses the hosted database deployment gate using
the established [October 2 recovery process](PORTAL-WORKFLOW-RELEASE-20261002-PLAN.md).
Both Vercel Git deployment holds remain enabled. Protected backup and deployment
workflows may be temporarily enabled only for the manual release, then disabled.

## Database changes and prerequisites

Recheck the running API/UI identity, hosted migration history, application table
counts and file/runtime configuration before cutover. Live inventory confirms
application source `5bc89d13e59b3bde9e784ab188dfec0641eb4429`, image
`phaeno-portal-green-api:sha-5bc89d13e59b-run-37152095279-1`, and fourteen
hosted migrations. The Portal UI rollback deployment is
`dpl_3Q9LGPGXXqYaJJFZswkRFBi3vvae`.

Four source migrations follow that baseline:

1. `20261003002746_DirectTrialLeadershipAndOpportunityDepartment` makes Trial CRM
   parents optional and adds an optional opportunity department relationship.
2. `20261003231435_AssembleMasterMixLabSteps` adds step evidence and ingredient
   links. It refuses to proceed if any of the six master-mix tables contain
   records; stop and seek an approved conversion if this prerequisite fails.
3. `20261004200855_SequencingMinimumVolume` adds a nullable batch setting.
4. `20261004210005_CatalogSequencingPairRequirement` archives every non-null
   batch setting in audit events before removing that obsolete column, and adds
   nullable Catalog and immutable member requirement fields. It neither invents
   Catalog values nor changes physical material facts.

Review the idempotent SQL and rehearse all four against an isolated dump of the
current hosted database. Verify every existing application table count and
eighteen migration records, then repeat the script to verify idempotence.
Remove only the disposable database and temporary unencrypted dump.

The owner's earlier conversion approval applies to the local demo database.
Obtain any required hosted migration authorization against the prepared release
and verified impact before applying these migrations outside development.
No reset, guessed conversion or data repair is included.

## Verification and activation

1. Obtain clean full connected backend, frontend unit and desktop/mobile browser
   runs. Also check lint, TypeScript, production build, generated documentation,
   EF model consistency, ERD, whitespace and staged credential boundaries.
   Record intentional environment skips and retain physical/scientific/provider
   acceptance as separate evidence.
2. Commit and push the reviewed, tested source. Stage the production-configured
   Portal UI from that exact SHA without assigning the public domain.
3. Create a fresh coordinated encrypted hosted DB/private-file snapshot through
   the protected backup workflow from verified maintenance source; record its SHA.
   The maintenance scripts are unchanged by this application batch. Require isolated restore, encryption round-trip,
   checksums and an off-server recovery artifact. Preserve earlier recovery sets.
4. After hosted migration authorization and prerequisite rechecks, dispatch the
   protected API release with migrations enabled; storage, scanning and bootstrap
   remain Preserve and Clerk cutover remains false. Require the deployment lock,
   write freeze, final encrypted migration backup and restore/health checks.
5. Verify the running API source/image, eighteen migrations, preserved table
   counts, runtime configuration and private mounts. Only then promote the
   matching staged UI. Verify public health, database ping, authentication
   boundaries, sign-in rendering and the independent Website search service.
6. Restore disabled workflow states, confirm Git holds, record exact release,
   backup and deployment identities, and remove temporary verification outputs
   while retaining recovery packages and evidence.

## Rollback

Before writes reopen, restore the verified database/private-file snapshot and
matching prior API image/runtime and UI deployment together. The Trial migration
explicitly refuses a destructive Down operation; use the verified backup.
Never run the previous API against the migrated schema. After writes reopen,
preserve newly recorded facts and assess recovery before rollback.

## Status

Frontend verification passes: 1,428 unit cases in 220 files, lint, TypeScript,
and generated documentation (56 guides, corpus `a198cfcd3c50`). The current
Release solution builds with zero warnings/errors and no EF model drift.
The hosted-copy rehearsal passed two idempotent applications of the reviewed
SQL (`322d65c524ecaa6d65133efbe5213f18602214da4e2eefeb282948ca1d24b743`),
with eighteen migrations and unchanged counts for all 226 existing tables.
Disposable rehearsal database and unencrypted dump cleanup passed.

The connected backend run and browser suites are in progress. A test fixture
that removed retained sendout history now uses an independent batch instead;
the twelve persistence/recovery cases pass from the repaired source. This
changes test setup, preserving the application's deletion guard. Final results,
backup and activation identities will be recorded in the release receipt.
