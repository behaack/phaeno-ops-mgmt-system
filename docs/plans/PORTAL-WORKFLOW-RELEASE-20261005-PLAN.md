# Portal vendor sequencing release — October 5, 2026

## Scope and authorization

The owner requested documentation updates, tests to success, commit/push and
deployment with EF changes. Release the pending Portal batch: sequencing vendor
catalog and shipment addresses, shipment tracking and final outcomes, external
result references, Lab preparation and specimen hold corrections, graphical
workflow progress, audience help, ERD and regression coverage.

Target `portal.phaenobiotech.com`, `api.phaenobiotech.com` and database
`phaeno_portal_green` (PostgreSQL 18) under `/opt/phaeno.portal-green`.
Preserve existing application rows, accounts, private files, scientific facts
and runtime/storage/scanning/bootstrap settings. No reset, historical backfill,
local demo data copy, Clerk cutover, storage activation or physical deletion is
included. Public Website deployment and Emmaus/OCIA are outside this release;
verify the Portal-owned Website API remains available.

This separate hosted release plan satisfies the September 28 planning gate
using the completed [October 4 release](PORTAL-WORKFLOW-RELEASE-20261004-PLAN.md)
and established recovery process. The current instruction explicitly authorizes
the reviewed preserving migrations. Both Vercel Git holds stay enabled. Temporarily
enable the protected backup/deployment workflows only for the manual operations,
then restore their disabled states.

## Database changes

1. `20261005163942_VendorSequencingResults` adds nullable sendout tracking,
   actual stage/outcome times and evidence, plus restricted member exceptions
   and immutable external storage references.
2. `20261005182306_SequencingVendorCatalog` adds audited supplier shipment
   addresses, nullable sendout catalog lineage and readable address/service
   snapshots. It seeds one built-in **Sequencing service** product type.

Both migrations are additive. Historical sendouts retain their original facts
without invented vendor associations or outcomes. Existing application row
counts must remain identical except `lab_ops.lab_product_types`, which gains
the one reviewed built-in type. Check its fixed ID and normalized-name uniqueness
before activation. Stop if the live database differs from the reviewed baseline
or requires a destructive remedy; the release authorizes no such remedy.

## Verification and recovery

1. Update the audience guides, registry, generated help corpus, complete ERD
   and owning/living test plans. Obtain successful Release build, connected
   backend suite, frontend lint/TypeScript/unit suite and desktop/mobile browser
   suite. Check EF model consistency and whitespace/credential boundaries.
   Preserve documented environment skips and physical/scientific/provider
   acceptance as separate evidence.
2. Inventory current API/UI identities, migrations, all application table counts,
   runtime hashes and mounts. Export a fresh hosted dump to a disposable local
   database. Apply reviewed idempotent SQL twice; require twenty migrations,
   unchanged existing counts and exactly one new built-in type. Remove the
   disposable database and temporary unencrypted dump after verification.
3. Commit/push the reviewed tested source. Build and stage production-configured
   Portal UI from that exact SHA without assigning public domains. Use production
   Clerk/API settings and disable mock sessions.
4. Obtain a fresh coordinated encrypted database/private-file backup through
   the protected backup workflow. Require isolated restore, encryption round trip,
   checksums and an off-server recovery copy. Keep prior recovery sets.
5. Recheck live migration/data prerequisites. Dispatch protected API deployment
   with migrations enabled, storage/scanning/bootstrap **Preserve**, and Clerk
   cutover false. Require its deployment lock, reviewed additive compatibility,
   final encrypted consistent-database backup and restore/health verification.
   The coordinated database/private-file snapshot pauses and resumes the API;
   the API deployer keeps the old API available while taking its PostgreSQL dump
   and applying additive migrations. Do not describe that as a separate write freeze.
6. Verify running source/image, twenty migrations, preservation counts including
   the intentional product-type addition, runtime hashes and private mounts.
   Promote the matching UI only after API verification. Check public health,
   database ping, authorization directly/through proxy, actual sign-in rendering,
   Website search/root, and bounded runtime errors.
7. Restore workflow holds, record exact source/deployment/backup identities in
   the [release receipt](../operations/portal-workflow-release-20261005.md), and
   clean only temporary task-created outputs. Retain logs and encrypted recovery.

## Rollback

For coordinated recovery, freeze writes before restoring the verified
database/private-file snapshot with the matching prior API/runtime and UI.
Do not use migration Down to discard new vendor history. Account for any facts
written after the recovery snapshot; preserve those facts and assess a forward
fix or coordinated recovery before rollback.

## Status

Preparation confirms the hosted API/UI baseline
`58f2af34e989c3b7187b39d542174444c2985896` and eighteen migrations.
Both pending migrations passed twice on a disposable hosted copy: twenty
migrations, all 231 existing application table counts preserved except the
intentional one-row built-in service addition. SQL SHA-256 is
`0d5299c03af9a3972c41d8fc7229a615a0899187d6f516c9eb81150d3b8613fa`.
The temporary database and unencrypted dump were removed and verified.

Frontend unit verification passes 1,448 cases across 225 files. Three inactive
Customer hold cases are intentionally skipped under the owner's suppression;
the suppression regression passes. Final lint, TypeScript and generated help
checks pass. Desktop/mobile browser verification passes 212 cases with two
intentional mobile print skips and no retries. The complete connected backend run
passes 1,261 cases with two intentional environment skips. The full Release build
has zero warnings/errors, EF model drift is absent, and disposable database
cleanup passes. The 63 focused repair cases also pass. Physical/scientific/provider acceptance remains separate.

Protected backup run `37376489067` succeeded from maintenance source
`b09b7935b44bde93f025fbd193d95e0e108382c2`. Its encrypted snapshot
`snapshot-20261005T213232Z-a005ef08-c0fd-48cb-8493-d021aade6bf0` passed isolated
database/file-reference restore, populated synthetic restore, encryption round
trip, cleanup and API resume. The off-server artifact and local encrypted copy
were retained and checksum-verified. The backup workflow is disabled again.

Completed October 5: application `c781988630ddfdb07f0d76dd7c3bb9753c15d660` is
committed, pushed and deployed as matching API/UI under protected run
`37380436791` and UI `dpl_EeQv4SD3AgZkL8fKGw2DMHyxcDS2`. Twenty hosted
migrations, preserving row counts, unchanged runtime settings/private mounts,
restore-verified encrypted recovery with off-server copies, public authorization
and actual production sign-in all pass. Both workflow holds and Vercel Git holds
remain in place. See the completed release receipt for exact identities and
remaining physical/scientific/provider and authenticated acceptance boundaries.
