# Portal scientific storage and progress release — October 9, 2026

## Authorized release and data preservation

The Owner requested code review, edge-case fixes, user documentation, complete
test suites, commit, push and deployment, with EF migrations only if necessary.
Release the reviewed scientific storage, streaming/ZIP and progress implementation
with its matching Portal API, UI and help corpus. Exclude credentials and temporary
verification assets. The existing staged laboratory navigation, specimen and
sequencing screens are reviewed with the connected scientific-storage/progress
changes so their API contracts, browser fixtures and help stay matched.

Target the existing hosted-test Portal Green API and Portal frontend. Preserve all
records, scientific receipts, private files, identity mappings, storage/scanner
providers, worker settings and Vercel Git deployment holds. This release does not
activate S3 or perform the separately planned file-provider conversion. Existing
Local bytes remain accessible. Original S3 admission requires exact retained object
versions once its separate infrastructure and recovery prerequisites are fulfilled.

No persisted model changes or new EF migrations are included. Verify the actual
target, existing application revisions, database identity and applied migration
baseline in the private release evidence. October 9 read-only preflight confirms
`phaeno_portal_green`, 25 applied migrations, Local storage, ClamAV and the prior
matched API/UI source `c10c622e`. Do not reset or replace the hosted database.

The fresh protected coordinated backup completed successfully, including isolated
populated restore and cleanup verification and encrypted off-server collection.
Its recovery identifiers and log are retained privately. The backup workflow hold
was restored immediately after dispatch. Frontend deployment access remains a
release gate: the connected Vercel account cannot currently see the Portal project.

## Preparation, recovery and cutover

Complete the requested tests and builds from the reviewed source. Before activation,
take a fresh coordinated encrypted database and Local-file backup through the
protected backup workflow. Require successful populated isolated restore checks,
encrypted checksums and verified off-server collection. Prepare the separate
restore-rehearsal database and file namespace; dispatch and deletion stay disabled.
The live database is preserved, so no replacement/cutover database is needed.

Pin the reviewed commit and retain the prior matched API/UI revisions for rollback.
Build a Production frontend deployment without assigning live domains, verify its
rendering and sign-in, then deploy the same API commit with storage, scanning and
bootstrap configuration preserved, migration and identity-cutover switches off.
Verify API health and source identity before promoting the matching UI. Restore
the backup and deployment workflow holds after the bounded release.

## Rollback and acceptance

Restore the retained matched application revisions if acceptance fails. Preserve
new business facts and scientific files; a database restore over new records needs
a separate reconciliation decision. Retain the verified recovery copies privately.

Require matched source identities, API/database health, existing authentication and
anonymous authorization rejection, retained file access, upload verification states,
and active/unknown/terminal assembly progress behavior. Smoke must not save business
records, submit scientific results, activate storage conversion or invoke real DPS.
Record actual completed checks and blockers; preparation alone is not deployment.
