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

Pending: application commit, API workflow/migration evidence, matching Vercel production build, public health probes and final documentation commit. Record exact identities after deployment; a local build alone is not production proof.
