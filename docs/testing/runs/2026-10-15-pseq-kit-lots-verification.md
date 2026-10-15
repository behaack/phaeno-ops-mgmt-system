# PSeq kit lots: standalone Partner entry and later assembly

Date: October 15, 2026. Scope: local working tree, focused regressions and connected browser acceptance through analysis start.

## Result

The Partner can save and check the shipped kit's printed lot before sequencing, without an assembly request, files or actual use date. Reopening the order preserves that entry. Later assembly reuses it, requires the actual kit-use date, uploads inputs, saves a draft and submits that same request. A use date before expiry remains valid when the data arrives after expiry.

Phaeno's analysis-start form checks current lot information. A recall added after the form loads rejects the stale start without creating a run. Refreshing displays the recall; the reviewed retry records the current assessment. The original input revision retains its earlier assessment. Recall and expired-at-use warnings are both visible when applicable.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Focused backend domain and PostgreSQL regressions | 25 passed, zero skipped | [Results and individual names](2026-10-15-pseq-kit-lots-evidence/results.json) |
| Frontend components and decision dialogs | 25 passed across four files | `KitLotSubmission`, `BundledOrders`, `KitPurchaseReview`, `ExternalOrderDecisionDialogs` |
| Connected browser scenarios | 4 passed: two journeys in desktop Chromium and Pixel 5 mobile emulation | [Final browser wrapper TRX](2026-10-15-pseq-kit-lots-evidence/final-browser.trx), [browser log](2026-10-15-pseq-kit-lots-evidence/browser.log) |
| Existing bundled Kit preparation and interrupted-upload browser regression | 1 passed in desktop Chromium with intercepted APIs | `bundled-orders.spec.ts`, existing Partner Kit preparation test; this is separate simulated UI evidence |
| Backend build | Passed with zero warnings/errors | Test project build includes API and both modules |
| Frontend type check and touched-file ESLint | Passed | Includes connected browser fixture/spec and final workflow changes |
| Frontend production client/server build | Passed | [Build output](2026-10-15-pseq-kit-lots-evidence/frontend-build.log) |
| Documentation generation and consistency | Passed, 59 guides, corpus `50b53bdc8aa1` | Partner help and owning/living test plans updated |

The combined backend run contains 25 passing regressions and an earlier browser-wrapper failure for the expiration display. That failure was corrected and superseded by the passing final browser run linked above. [The original combined TRX](2026-10-15-pseq-kit-lots-evidence/backend-regressions-and-resolved-browser-failure.trx) is retained unmodified. The final run has no failed or skipped browser scenarios.

## Connected browser checks

The opt-in `BrowserStandaloneLotThenAssemblyUsesRealHttpAndPostgres` test starts a loopback Kestrel host using actual MVC controllers, API envelopes/error middleware, authorization checks, domain services, EF and PostgreSQL. The browser uses actual Portal components and forwards feature requests to that host. Feature API responses and persisted assessments are not mocked. Each scenario receives a separate synthetic order/case/lot in a disposable database.

Both desktop and mobile verify:

- Anonymous kit reads return 401 and another Department cannot submit the lot (404).
- The early lot dialog has no upload control and permits a blank actual-use date.
- A mismatched lot is rejected while preserving the entry for correction.
- Saving the correct lot creates one Partner submission and zero assembly requests/files; reload retains it.
- Early checking of an already expired lot warns immediately. Shipment and assessment show the same labeled calendar date.
- Later preparation reuses the saved lot; submitting without a use date fails before creating a request.
- Adding the actual date before expiry clears the expiry warning, despite submission taking place after expiry.
- Saving the draft creates one request and one uploaded input file; submitting from **Actions → Submit for intake** creates one immutable input revision and no second purchase/request.
- Phaeno's stale analysis-start check creates zero runs; refresh displays a newer recall, and retry creates one run with a new assessment while preserving the original revision.
- A recalled lot used after expiry shows both warnings, in light and dark themes. Keyboard cancellation restores focus to the case's Actions button.
- Captured states have no document-level horizontal overflow, no page exceptions and no Axe WCAG 2 A/AA, 2.1 AA or 2.2 AA violations. Expected mismatch (400) and stale-lot (409) responses are deliberately exercised.

Representative screenshots: [early dialog](2026-10-15-pseq-kit-lots-evidence/screenshots/desktop/early-lot-dialog.png), [saved standalone entry](2026-10-15-pseq-kit-lots-evidence/screenshots/desktop/standalone-lot-saved.png), [submitted assembly](2026-10-15-pseq-kit-lots-evidence/screenshots/desktop/assembly-submitted-reused-lot.png), [recall refresh](2026-10-15-pseq-kit-lots-evidence/screenshots/desktop/analysis-stale-lot-refresh.png), [analysis-start record](2026-10-15-pseq-kit-lots-evidence/screenshots/desktop/analysis-run-current-recall.png), [mobile dark warnings](2026-10-15-pseq-kit-lots-evidence/screenshots/mobile/both-warnings-dark.png).

## Repairs made during verification

1. The saved-draft detail action now sends the displayed lot version, and refreshes current information after a rejected write. Related actions share the standard Actions menu.
2. Closing a standalone lot dialog explicitly restores focus to the surviving case menu or assembly-page button.
3. Shipment expiration displays the printed calendar date instead of shifting UTC midnight into the preceding local date.

The component Link mock now preserves menu attributes, and the immutable JSON assertion compares values rather than PostgreSQL JSONB whitespace. Browser harness issues (overbroad source-file interception and the file-evidence query) were repaired before the passing final run.

## Boundaries and repeatability

Sign-in identities/session presentation, scanning and byte storage are synthetic and confined to the test host. This does not verify live Clerk sign-in/MFA, real scanner/storage/provider integration, physical kit handling, scientific pipeline execution, output quality, hosted release or final business acceptance. Analysis start records workflow evidence; no scientific assembly job is executed by these scenarios. The separate staff lot-catalog creation/recall UI was not manually accepted in this browser scope; recall commands are exercised through the real API.

The host test is opt-in: set `PSEQ_KIT_BROWSER_VERIFICATION=1` and `PSEQ_OPERATIONS_REFERENCE_CONNECTION` to an authorized loopback reference database, then run the named backend test. The existing fixture guard accepts known reference database names and creates/drops its own uniquely named `pseq_kit_test_*` database; do not point it at hosted infrastructure or reset existing data. The host launches `pseq-kit-lots.connected.spec.ts` on port 3107 and writes the browser log under `.task-tmp`.

The verification used temporary loopback reference databases plus the fixture's disposable databases. These were removed after the runs. No operational records were inserted into the configured application database, no Website intake was reset, and no Git publication, hosted migration or deployment was performed.
