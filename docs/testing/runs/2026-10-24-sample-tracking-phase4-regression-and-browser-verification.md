# Phase 4 regression and browser verification — October 24, 2026

> Raw sample-tracking test outputs linked in this dated record were removed at the Owner's request after consolidation. The archived links now open the retained result/cleanup ledger; screenshots and raw files are no longer retained.

Owner scope: run Phase 4 regressions and browser acceptance, repair issues and report back. No deployment or DPS changes. This follows the [initial implementation](2026-10-24-sample-tracking-phase4-verification.md) and [owning plan](../../plans/SAMPLE-TRACKING-PHASE4-VALIDATION-PLAN.md).

## Final results

| Check | Result | Evidence |
| --- | --- | --- |
| Focused backend regressions | **33 passed**, zero failed/skipped | [Archived receipt: TRX](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: log](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Focused frontend regressions | **15 passed**, zero failed/skipped | [Archived receipt: JUnit](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Connected Chromium desktop/320px phone × light/dark | **Four passed**, zero failed/skipped; wrapper also passed | [Archived receipt: Browser log](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: structured results](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: wrapper TRX](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Independent native database/private-file restore | **254 tables / 940 fixture rows / three stored objects** match; original storage offline | [Archived receipt: Restore receipt](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: recovery probes](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Long history | **10,029 frozen events / 201 pages**, at most 50 rows and four read queries per page, no missing/duplicate events; later writer excluded; oversized report refused | [Archived receipt: Backend measurements](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Build/static verification | Backend builds with zero warnings/errors; TypeScript, scoped ESLint, UI guard, help freshness and whitespace checks pass | 773 guarded source files, two unchanged existing exceptions; 62 guides, hash `84b6e1ec5070` |
| Fixture cleanup and development preservation | Generated databases confirmed absent, temporary private roots removed; every configured-development table unchanged | [Archived receipt: Regression cleanup](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: browser cleanup](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: browser preservation](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |

The browser wrapper runs the same connected recovery fact with an additional test host; it is not another set of distinct domain cases. Intermediate trials and overlapping confirmations do not increase these counts. These are focused selections, not the full application suites. Existing browser color-environment warnings were harmless; the final matrix has no runtime page errors. Sixteen final screenshots are retained and representative desktop/phone/light/dark viewports were inspected. No reviewed visual baseline changed.

The combined [Archived receipt: preservation receipt](2026-10-24-sample-tracking-browser-acceptance-ledger.json) compares all 254 configured-development tables across the entire checkpoint, including both protected Website intake tables. A separate final [Archived receipt: runtime readback](2026-10-24-sample-tracking-browser-acceptance-ledger.json) confirms all ten generated recovery databases and their five private roots are absent and the browser fixture port is closed. The [Archived receipt: source manifest](2026-10-24-sample-tracking-browser-acceptance-ledger.json) identifies the tested uncommitted source subset and assembly hash.

The measured regression run's first controller/database event page took **32.44 ms** and complete 201-page traversal took **1.63 s**. This is local API/database timing, not a browser first-usable measurement or production SLA.

## Repairs

- **Scientific-file error feedback:** a failed binary download kept its API error envelope inside a Blob, so the scientific-file UI lost the missing/integrity explanation. A shared Lab evidence-download helper now exposes the domain explanation, matching saved-report/supporting-report behavior. Successful bytes remain opaque and unchanged; malformed, non-text or empty messages preserve the original failure. Eight new API tests cover these paths. The initial integrity test failed before the repair. Phaeno scientific-approval help, its review date and generated corpus are updated.
- **Regression export opt-in:** the historical commercial fixture treated an empty environment value as an export directory and failed after its successful journey. It now ignores blank values. The first selection had 32 passes and this one harness failure; the corrected selection passes all 33. Its generated database was still removed, and the recovery runner's cleanup/preservation passed.
- **Browser fixture:** the first trial assumed the upload's proposed filename; FASTQ capture correctly assigns its canonical saved filename. The selector now uses the actual managed-file control and validates its downloaded bytes by the saved hash. The oversized-report check follows the actual boundary: event history remains pageable, and the Save command visibly refuses an unsupported full report without creating a partial report.

Application scientific/authorization/preservation guards were not relaxed. No persisted model, migration, dependency or production-authentication change was needed.

## Browser coverage

`sample-recovery.phase4-connected.spec.ts` runs through `SampleTrackingPhase4Browser.cs` on a freshly restored, generated loopback database and independent private-file root. The original source files are unavailable. Production investigation and scientific-file download components use actual MVC/envelope/domain/EF responses forwarded to the test host. Synthetic identities, external producer/scanner observations and deliberate fixture faults are explicit. Program/hosted workers and DPS are not started.

Each scenario verifies:

- Anonymous and Customer identities are denied internal history/raw downloads. Staff can inspect the restored evidence.
- The frozen manifest downloads with its exact original SHA-256 and source barcode/actual acquisition. Keyboard Actions opening, Escape and focus return work.
- A report Save commits but loses its response. The UI's retry sends the identical request body/identity and creates exactly one report.
- Corrupting the original saved report produces a checksum refusal; repairing the fixture returns the exact original bytes.
- Selecting the exact released package shows its source supplier tube, producing analysis and explicit actual-run inputs. Expanded lineage reflows at 320px.
- Processing history retains the original physical preservation hold and reason.
- The managed raw file downloads with its original hash. Actual corrupt and missing restored bytes show actionable errors; restoring availability permits an exact successful retry and clears the error.
- More than 10,000 events trigger a visible oversized-report refusal without a new report. Event pages remain available. Two actual browser pages contain 100 distinct event identities under the same frozen boundary; a subsequently committed event is excluded, and Previous restores the first page.
- Selected axe WCAG A/AA checks, no horizontal overflow in results/history, reduced-motion operation and no runtime page errors pass in all four scenarios.

After browser actions, the host asserts unchanged original lot/use records, no physical or assembly commands, and exact original report bytes. The parent recovery runner then drops its databases, removes its private temporary tree and compares every configured-development table again, including protected `website.web_contacts` and `website.web_orders`.

## Reproduce and boundaries

Use the [runbook](../SAMPLE-TRACKING-PHASE4-RUNBOOK.md): `verify-sample-tracking-phase4.ps1` runs the 33-case selection; `-Browser` runs the connected recovery/browser wrapper. Each invocation requires a new evidence directory and generates independent disposable fixtures. Frontend selection: `lab-evidence-download.test.ts`, `SampleInvestigation.test.tsx` and `ScientificFilePicker.test.tsx`, with two workers.

No Git mutation, deployment, hosted write or DPS source/runtime/contract change occurred. Existing Phase 1–3 and unrelated work is preserved. The [acceptance crosswalk](../../plans/SAMPLE-TRACKING-PHASE4-ACCEPTANCE.md) keeps full Active/Closed Portal navigation and real sign-in, Firefox/WebKit, complete assistive-technology/zoom/reflow qualification, real provider/scanner/storage/physical work, scientific SOP sufficiency, representative legacy hosted-copy rehearsal, concurrent hosted backup consistency, scheduled recovery/cleanup and the Owner's actual questioned-result walkthrough open. These local synthetic feature checks do not replace those gates.
