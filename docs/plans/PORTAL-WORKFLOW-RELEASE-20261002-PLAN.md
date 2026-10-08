# Portal workflow release — October 2, 2026

## Authorized scope and preserved target

The owner requested documentation, successful tests, commit, push, deployment,
and necessary EF migrations for the pending Portal workflow batch. This covers
the accessioned-sample directory and usage facts, receipt/shipment history,
accepted-tube box placement, kit request management, quote acceptance navigation,
and the single Lab step Actions menu. The tested source also includes the order,
phase shipping and assembly messaging changes already committed since the hosted
baseline. Customer, Partner and Phaeno guides and the living test plans accompany
the implementation. A lot-number field in preview follows the step's configured
Include lot number setting; no inventory lot is created by a preview.

Target: the production-hosted test Portal at `portal.phaenobiotech.com` and
`api.phaenobiotech.com`, database `phaeno_portal_green` on PostgreSQL 18.6,
under `/opt/phaeno.portal-green`. Preserve all current rows, configuration,
identities, private files and runtime choices. No data reset, guessed conversion,
Clerk cutover, public Website UI deployment, or Emmaus/OCIA change is authorized.
The [September 29 hosted clean cutover](HOSTED-CLEAN-DATABASE-20260929-PLAN.md)
and [controlled post-reset release](PORTAL-POST-RESET-RELEASE-20260929-PLAN.md)
provide the established backup and matched rollback method. This separate plan
addresses the hosted database gate; automatic deployment holds remain in place.

## Baseline and migrations

The pre-release API reports source
`3cb30732e8756ab49a2002f5d5c6cabdd5eefa0a`, image
`phaeno-portal-green-api:sha-3cb30732e875-run-36669915989-1`, and image ID
`sha256:4441298e0eeff8060b68390af1f50ce55d92dfd7d4b7366d5d29accca2409664`.
The current database has seven migrations through `AddLabQuoteDeliveryTarget`.
Live read-only inventory found zero Jobs, invoices and submitted Lab samples.
Recheck this inventory immediately before cutover. `AddSequentialLabJobPhases`
explicitly refuses existing Jobs; if any appear, stop the release and preserve
them rather than reset or invent phase history.

Seven existing migrations are pending:

1. `20260930164656_AddSequentialLabJobPhases`
2. `20260930203514_AddCommercialOrderDraftScope`
3. `20260930225000_AddSeparateSampleRunPricing`
4. `20260930233000_AddCustomerStandardOrdering`
5. `20261001032706_AddAssemblyMessagingRecovery`
6. `20261001155357_AddRequestedLabCatalogService`
7. `20261001205012_AddOnDemandPhaseKitShipping`

No new persisted-model change is introduced by the latest UI/accession fixes.
Verify no pending model differences and review the generated idempotent SQL.
The existing ERD must remain consistent with all fourteen source migrations.
Rehearse the seven pending migrations on an isolated copy of the current hosted
database, verify configuration counts and final migration history, then remove
only that disposable copy. Retain the rehearsal result with release evidence.

## Preparation, activation and rollback

1. Correct failures and obtain clean full backend, frontend unit and desktop/mobile
   browser runs. Run lint, typecheck, documentation consistency and production
   build. Keep physical scanner, printer and scientific acceptance distinct from
   automated synthetic journeys. Record intentional platform/environment skips.
2. Review every pending file and generated help asset, verify whitespace and
   credential boundaries, then commit and push the exact tested batch. Keep
   both Vercel Git deployment holds and disabled automatic API deployment paths.
3. Record the current Vercel production deployment, API runtime/image identity,
   database migration history and counts, and private file mounts. Temporarily
   enable the protected backup workflow for one manual dispatch from the exact
   release SHA. Require a fresh coordinated encrypted DB/private-file snapshot,
   isolated restore, checksum/encryption verification and off-server artifact.
   Disable the workflow immediately afterward. Preserve prior recovery packages.
4. Build and stage the production-configured Portal UI from the same source SHA
   without assigning the public domain. Confirm the deployment is Ready. Recheck
   hosted migration prerequisites and backup receipts before API activation.
5. Temporarily enable Deploy Portal Green for the exact manual release dispatch,
   with migrations enabled and storage, scanning and bootstrap set to Preserve;
   Clerk cutover remains false. Its deployment lock/write freeze, final encrypted
   migration backup, restore verification, migration application and health gate
   must pass. Disable the workflow immediately afterward.
6. Verify the running API source/image and all fourteen migrations, preserved
   rows/runtime/private storage, public health and authentication boundaries.
   Promote the matching staged UI only after the API is healthy. Record the
   production alias, exact Vercel deployment ID, workflow IDs and live smoke results.

Before writes reopen, failure requires restoring the verified DB/private-file
backup, prior API image/runtime and prior UI deployment as one matched set.
Never run the old API against the new schema. After writes reopen, preserve new
records and assess recovery before rollback. No destructive down migration or
hosted repair is included in this authorization.

## Verification status

The exact Release assembly reports no pending EF model differences. The seven
pending migrations were rehearsed against an isolated dump of the current hosted
database. All fourteen migrations were recorded; a second idempotent application
passed, and every existing application table count was preserved. The scratch
database and temporary unencrypted dump were removed and verified absent. The
reviewed SQL SHA-256 is
`7c7ac11cefd977159a7b76399d82551f1c5a54ad746071a5683a184a555509f1`.
This rehearsal is not the live migration or the required encrypted backup.

Release verification passed: 1,201 backend cases with 2 intentional environment
skips, 1,353 frontend unit cases, and 198 desktop/mobile browser cases with 2
intentional mobile print skips. Lint, TypeScript, documentation checks, production
build and whitespace checks pass. The 56-guide corpus is `a5744885cb96`.
Initial complete runs exposed stale fixture assumptions, an unmapped computed
property in shipment search and accepted-addition pair/provider gates. The query
now searches the latest non-void packet using mapped SQL fields; accepted Change
quote additions retain the correct pending roster and provider amendment scope.
Updated fixtures retain real phase-order, physical crosswalk, commercial catalog,
unsaved-entry, permissions and cancellation guards. The source-frozen full
browser run passed after an overlapping build caused development-server reloads.
Exact activation, recovery and smoke identities will be recorded in the final
release receipt. Physical/scientific/provider and hosted operator acceptance
remain distinct from these automated gates.

## Completed activation

The [release receipt](../operations/portal-workflow-release-20261002.md) records
matching API/UI application source `66240861c32c49af1b85ac4fa4c0dcf9f6fcd5c7`,
successful protected backup/deployment runs, all fourteen hosted migrations,
both verified encrypted off-server recovery copies, preserved counts for all
223 existing tables and runtime/storage hashes, public UI alias and live smoke
checks. Automatic deployment holds remain in place. This controlled release is
complete; remaining physical/scientific/provider and hosted operator acceptance
are not claimed by these release checks.
