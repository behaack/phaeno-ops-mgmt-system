# Order management verification — September 30, 2026

The owner requested: “Apply migrations. Run tests and build.” This lifted the earlier tests/builds hold. Work remained local; no staging, commit, publication or deployment was performed. The production deployment hold remains in force. Existing orders were retained without conversion.

## Database

Verified target: PostgreSQL 18.3 at `localhost:5432`, database `phaeno_ops_clean_20260919`, from the configured Development connection. Before migration, there were nine applied migrations, two Lab Service orders and three users.

Preserved a custom-format backup at `backend/artifacts/order-management-verification/before-migrations.dump` and validated its archive listing. A subsequent disposable verification database was successfully restored from this archive; this supplies local database restore evidence, not coordinated production database/file recovery proof.

Applied both pending additive migrations:

- `20260930225000_AddSeparateSampleRunPricing`
- `20260930233000_AddCustomerStandardOrdering`

Afterward, migration history contains all eleven migrations. The Customer Draft column and negotiated-price table exist. Counts remain two orders and three users. EF reports no model changes since the latest migration. The installed EF CLI 10.0.5 reports that it is older than runtime 10.0.10; migration and model checks nevertheless succeeded. No tool or dependency upgrade was made.

## Results

| Check | Result |
| --- | --- |
| Backend solution build | Passed again after the remaining-failure corrections, zero warnings and errors |
| Frontend TypeScript | Passed |
| Frontend lint | Passed |
| Frontend production build | Passed |
| Generated help consistency | Passed, 56 guides, fingerprint `2e52e65b69c2` |
| Frontend unit suite | Passed, 1,266 tests in 200 files |
| Complete deterministic Playwright suite | Passed, 194 cases, 2 skips; Chromium and mobile Chrome |
| Initial PostgreSQL-enabled full backend suite | 1,125 passed, 31 failed, 2 skipped, 1,158 total; retained historical evidence |
| Initial focused order/backend recheck | Passed, 25 tests; corrected six failures from the initial full run |
| Final complete PostgreSQL-enabled backend rerun | Passed, 1,157 passed, zero failed, 2 skipped, 1,159 total; 14.28 minutes |
| Original failure ledger | All 31 original failures have matching passing full-run results, including the remaining 25 requested by the owner |
| Source and staged diff whitespace | Passed |

The final complete backend run is successful. All remaining 25 failures are resolved, along with the six corrected earlier. The ledger preserves original names/errors, maps renamed cases to their current workflow, and verifies each against its passing full-run result. The new manual-request phase-count regression increases the suite by one case. The two skips are the Unix symbolic-link fixture on Windows and the opt-in database/private-file restore qualification, whose PostgreSQL tools flag was not enabled. Frontend and browser results above are retained from the preceding full verification; this follow-up changed backend code/fixtures and planning records.

Initial PostgreSQL reference/concurrency verification used a task-created local restored database with the required `phaeno_release_verification_` prefix. The final complete rerun used a separate disposable loopback database migrated from empty to all eleven migrations, isolating reference tests from existing CRM records. An initial run directly against the configured Development database also encountered fixture guard failures because its name is outside the concurrency suites' allowed disposable prefixes. These earlier attempts remain available for diagnosis and do not replace the final full-run result.

## Corrections made during verification

- Corrected the Customer Draft status namespace and the Query function signature for available offerings.
- Explicitly registered new source and phase rows as Added in Customer review, Sales Draft materialization and additional-scope acceptance. Previously, EF interpreted their assigned UUIDs on a tracked parent as updates. Customer persistence coverage now saves an edited reviewed Draft, reviews it again and verifies exactly one current source group/phase and removal of the prior phase.
- Preserved null quote form values as null, allowing missing additional-run rates to show the intended validation error.
- Kept Radix-generated title IDs and focused the review heading through a ref, preserving the Customer dialog's accessible name. Added accessible-name coverage and explicit checkbox label associations.
- Fixed the shared dialog arranger to recognize header/feedback/footer regions inside nested React fragments while preserving unique child keys. A regression verifies that conditional action footers stay outside the scrolling body.
- Increased dark destructive-text contrast after axe reported an outlined cancellation button below the AA threshold. Updated stale sample-price, Customer modal, Sales route and phase-completion browser/component expectations. Corrected touched mojibake text.
- Quoted-order test fixtures now freeze accepted phase pricing, and the Sales creation retry case exercises Draft creation separately from subsequent pricing transitions. Readiness assertions retain the saved Draft when submission is blocked. PDF integrity compares SHA-256 bytes without depending on hexadecimal letter case.

One full frontend run had a biological-transfer retry assertion fail under concurrent verification load; its isolated twelve-case file passed, then the final complete suite passed with four workers. Focused browser rechecks also exposed a cold development-server hydration wait for the stored mock organization; the initial workspace assertions now wait up to fifteen seconds for that state. These retries are retained in the raw logs.

## Remaining 25 failure groups — closed

| Area | Resolved cases | Correction verified in the complete rerun |
| --- | --- | --- |
| Preparation, assembly and Jobs queue fixtures | 12 | Added actual commercial parents, samples and valid phase/deadline state; runtime lineage guards remain enforced. |
| Sample roster, investigation and retention fixtures | 3 | Fixed pending-deletion import counts and reconciled test-owned two-sample cohorts/membership. |
| CRM commercial access | 4 | Isolated search cohorts and before/after side effects from unrelated records while retaining access/service assertions. |
| Manual pricing/submission flows | 2 | Covered the current Partner manual workflow and corrected single-cohort counts after request edits; Customer standard ordering remains separately covered. |
| Cancellation | 2 | Covered first-receipt closure and complete eligible future-cohort cancellation with quote/custody preservation, replay and stale decisions. |
| Authorized laboratory journey | 1 | Added accepted simulated future scope while preserving started scope; compared PDF hash bytes directly. |
| Later kit request | 1 | Checked both owned eligible receiving destinations without assuming a globally empty destination catalog; retained the post-dispatch fixed-destination checks. |

## Remaining-failure corrections requested by the owner

The owner subsequently requested “Resolve remaining 25.” This correction changes two runtime paths: roster replacement counts retained rows rather than samples pending deletion in the same save, and a revised manual request keeps its single unscoped phase count aligned with the requested sample count. The new domain regression covers both an initial Draft edit and a requested correction without changing the phase identity; the Partner request integration case checks the saved phase count.

Scientific fixture corrections retain commercial order/sample/phase lineage for preparation, assembly and Jobs queue cases, set valid two-sample cohorts for cross-sample history/reissue assertions, and add a separate accepted future cohort for mixed-progress variants without changing started scope. Manual request and quote-review cases use the current Partner workflow; Customer standard ordering retains its separate coverage. Cancellation coverage now tests whole eligible future phases, first-receipt rejection, unchanged received work, immutable quote/custody evidence, replay and stale-decision rejection. CRM tests compare owned results or unchanged before/after side effects, and kit dispatch checks its eligible destinations without assuming no other configured destination exists. The journey's PDF integrity assertion compares SHA-256 bytes directly.

These are local automated verification corrections. No schema migration, existing-order conversion, runtime compatibility adapter, deployment, or provider/bench execution is part of this follow-up.

## Evidence and cleanup

Raw evidence is preserved under `backend/artifacts/order-management-verification/` (ignored verification/recovery artifacts):

- `before-migrations.dump`, `migration-update.log`, `database-final-check.log`, `ef-model-final.log`.
- `backend-build-final.log`, `frontend-build-final.log`, `frontend-typecheck-final.log`, `frontend-lint-final.log`, `documentation-check-final.log`.
- `test-results/backend-final.trx`, `test-results/backend-order-targeted-final.trx`, `backend-failure-ledger.json`.
- `test-results/backend-remaining-25-complete.trx`, `backend-remaining-25-complete.log`, `remaining-25-build-final.log`, and focused correction/retry logs.
- `frontend-final.log`, `frontend-final.json`, `e2e-complete-final.log`, and focused/retry logs.
- `cleanup.log` records removal of the task-created restored database, isolated compiled output and accidental empty nested artifact directories. Regular development build output and the backup/logs remain available.
- `remaining-25-cleanup.log` records removal and verified absence of the final disposable verification database. No additional migration or write to the configured Development database was needed for these corrections.

Mock browser checks establish deterministic UI behavior, including themes and narrow layouts; they do not prove Clerk authentication, connected Customer/Sales save-and-place acceptance, physical shipping/receipt, scientific outputs, external providers or final business sign-off. Those acceptance boundaries remain open in the owning plans. The unrelated public Website was not built or deployed.
