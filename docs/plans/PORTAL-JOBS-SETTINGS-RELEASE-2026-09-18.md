# Jobs and settings production release — September 18, 2026

## Authorization and scope

The owner requested that documentation, including user guides, be current, followed by commit, push, production deployment and required EF migrations. This releases the implemented Jobs workspace, delivery deadlines, progress-based completion forecasts, laboratory configuration refinements, and separated Order, Lab, CRM, sample-shipping and retention settings.

The proposed service-owned scientific definition and explicit supported sample-type redesign remains **planned, not implemented**. The confirmed decision is one current scientific definition per service catalog item, with historical versions retained. See [Order Management Plan](ORDER-MANAGEMENT-PLAN.md).

## Documentation reconciliation

- Updated Phaeno navigation, configuration, shipping, CRM and laboratory guides; Customer and Partner laboratory guides describe customer-visible timing behavior.
- Reconciled Jobs Active/Closed behavior and the standalone Lab settings pages in the owning plans. Dropdown labels use sentence case while retaining acronyms.
- Updated the database ERD, documentation registry and generated searchable guide package. Historical test-plan entries remain evidence of their original checkpoint; newer entries supersede earlier UI arrangements.
- User guides describe implemented behavior. Future service composition is confined to the owning plan.

## Verification before release

- Release backend build: passed, zero warnings/errors.
- Frontend typecheck and full lint: passed.
- Frontend production build: passed; bundler performance warnings are non-blocking.
- EF pending-model check: passed, no model changes missing a migration.
- Automated test suites were not run; the repository requires a separate request. Authored coverage and outstanding manual cases remain recorded in the three living test plans.
- Final generated-documentation and staged whitespace checks are release gates.

## Database and operational considerations

Required additive migrations: `20260918153728_AddJobDeliveryDeadlines` and `20260918191923_AddLabCompletionForecast`. The first retains known original targets as delivery deadlines; the second adds timing policies, calendars, source transitions and forecast history. Existing scientific commitments are preserved. The production workflow creates an encrypted backup and verifies restoration before applying pending migrations.

Stage durations, day bases and observed holiday coverage require deliberate production configuration. Illustrative 5/2/1-day values and local test fixtures are not copied into production. Historical unknown stage timestamps remain unknown. Incomplete evidence/configuration is shown explicitly instead of presenting a complete forecast. Existing jobs use explicit preview/application to adopt timing policies.

Storage, scanning and Clerk identity settings are preserved. The public Website is not redeployed. The generated local private search-index file is excluded from source release.

## Deployment evidence

- Application commit: `b4daafcf160d30d98578dd14c769821e8eed98ca`, pushed on `codex/portal-documentation-search-release` and independently matched to the remote branch.
- API: [Deploy Portal Green run 35404132011](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/35404132011) succeeded. Running image `sha-b4daafcf160d-run-35404132011-1` verified the exact source revision; deployment completed at 2026-09-18 23:08 UTC.
- Backup: `pre-migration-20260918T230748Z-b4daafcf160d`; restore and cleanup checks passed, and encrypted dump/key checksums passed. Logs confirm both named migrations were applied successfully.
- UI: [Production deployment 3c4Lea6moZmJwhVVRHYGUcchrGuq](https://vercel.com/cadexgenomics/phaeno-ops-mgmt-system/3c4Lea6moZmJwhVVRHYGUcchrGuq) is Ready, built using Production settings from the same application commit and assigned to `portal.phaenobiotech.com`. Both deployment checks passed. The source preview was `GEP5fNcgG1Vv9QmL8EDf7pvpAHrG`.
- Post-release public checks: API health 200/healthy, database ping 204, Portal root 200, Portal API proxy health 200. Fresh signed-in navigation rendered POMS and the sentence-case Administration menu in the expected order. Lab settings displayed its six sidebar pages; Holiday calendar loaded its correct unconfigured state. Jobs displayed Active jobs / Closed jobs, collapsed Filters, visible Clear filters and the default summary. No operational records or configuration were saved during this smoke check.
- The packaged 56-guide corpus check passed with hash `f0d565a56576806318b917649fd2ca028ca80e94beda9de273fb4f92f66b6f95`. Committed whitespace check passed.

An initial UI promotion attempt was rejected by automatic approval review while the API deployment was running. No promotion was made then. After successful API/migration verification, production promotion proceeded successfully. Full populated operational acceptance remains separate from these release checks. Only the local generated private search index remains outside the release. A documentation-only follow-up records this evidence; it does not change the deployed application identity.
