# Federal holiday calendar seed - September 30, 2026

The owner requested federal holidays for 2026, 2027 and 2028 in both local and production databases. This authorized a data-only calendar initialization. The dates were verified against the [US Office of Personnel Management holiday schedules](https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/). Named exclusions use the published observed closure dates, rather than weekend anniversary dates.

## Result

| Target | Database | Calendar | Coverage | Holidays |
| --- | --- | --- | --- | --- |
| Configured local development | `localhost:5432/phaeno_ops_clean_20260919` | Revision 1 | January 1, 2026 - December 31, 2028 | 33 |
| Production Portal | `phaeno-portal-green-db/phaeno_portal_green` | Revision 1 | January 1, 2026 - December 31, 2028 | 33 |

Both calendars use `America/Los_Angeles`. Each OPM holiday year contributes 11 holidays. The date-year filter shows **11 in 2026, 12 in 2027 and 10 in 2028**: New Year's Day 2028 is observed on **December 31, 2027** and is named accordingly. Weekend observations also include July 3, 2026; June 18, July 5 and December 24, 2027; and November 10, 2028.

Each target initially had zero calendars, holidays, timing policies and jobs. The operation inserted one calendar, 33 holiday rows and 34 creation audit records in a serializable transaction. The audit request identifies the seed and database; actor fields are null for this maintenance operation. Before/after snapshots are retained in ignored `artifacts/federal-holidays-20260930/`. No schema, timing policy, existing commitment, API deployment or authentication change was required. Separate Emmaus/OCIA services were unchanged.

## Safety and verification

Production preflight verified the API's actual connection target, healthy API/database, the private PostgreSQL 18.6 container and `phaeno-portal-green-postgres18-data` volume. The active API image was `phaeno-portal-green-api:sha-3cb30732e875-run-36669915989-1`; this live observation supersedes the September 29 release identity for this operation. Existing verified backup `snapshot-20260930T042551Z-1edd7fac-b8c5-4fcc-91bb-b58a738772b3` passed freshness/integrity checks before the write. The production seed used the existing deployment/maintenance lock without pausing the API.

The [seed SQL](../../scripts/seed-federal-holidays-2026-2028.sql) requires an explicit expected database, accepts only the two verified target names, locks calendar writes and rejects an existing calendar requiring a revision review. Exact replay is a no-op. Pending calendar-dependent deadlines require the application save workflow instead of this initializer. All inserts and audits commit together.

Post-commit readback verified all 33 date/name pairs, coverage, timezone, revision, audit counts and unchanged job/policy counts in both databases. Local replay retained the same calendar, holiday rows and 34 audits. Production API health returned HTTP 200, database ping HTTP 204, and Portal UI HTTP 200; API, scanner and PostgreSQL remained healthy. An initial health probe used `/health` and returned 404; the documented `/api/health` endpoint passed. No application build or automated test suite was needed for this data-only operation; no build artifacts were created. Existing user help already describes observed local dates, year filtering and explicit calendar revisions, so its behavior instructions remain accurate.

For future changes, use Lab settings -> Holiday calendar to create the next revision and the existing policy preview/apply workflow where necessary. Preserve published calendar history and frozen commitments. This one-time seed does not introduce an automatic yearly holiday generator.
