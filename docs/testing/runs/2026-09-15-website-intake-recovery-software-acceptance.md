# WEB-02 and WEB-04 simulated software acceptance — September 15, 2026

## Scope and result

The Product Owner's continuing approval of clearly labeled simulated software acceptance applies to this batch. **WEB-02 and WEB-04 are Pass (simulated).** The controlling ledger is **53/81 software cases closed (65.4%): 39 ordinary passes and 14 simulated passes; 28 remain**. These dispositions replace provider-dependent steps with the explicit simulations below; they do not establish live provider or final acceptance.

No product behavior changed. Three PostgreSQL acceptance checks were added in `backend/test/WebsiteIntakeAcceptancePostgresTests.cs`; the existing Website notification test class is now partial to share its rollback fixture. The public form, real Website service, real durable dispatcher/recovery service and real Mailgun HTTP adapter were exercised at their respective boundaries. Google CAPTCHA, provider HTTP responses, inbox delivery and the email rendering were simulated. Browser form submissions ended in intercepted responses; no public or local API intake was sent from the browser.

## Required-step crosswalk

| Case / steps | Completed software evidence |
| --- | --- |
| WEB-02, 1 | Actual local `/contact` forms at 1440 and 390 pixels reject four missing signup fields and five missing demo fields. Required legend, invalid controls and associated signup errors are visible. No simulated intake is accepted. The technical-brief checkbox is an optional explicit opt-in, not a required consent checkbox; current code and visible copy agree. |
| WEB-02, 2 | Browser success says the requested brief is queued, resets the form and records one simulated signup/two notices. `PublicSignupPersistsRequestedMessagesAndDuplicateCannotTriggerResend` separately proves one actual PostgreSQL contact with pending mailing-list and requested-brief intent, without sending. The new rejected-CAPTCHA test verifies updates-only creates one mailing-list notice and no brief. |
| WEB-02, 3 | Browser repeat of the same accepted email yields the specific duplicate response without additional signup/notices. An unrelated HTTP 400, HTTP 503, server CAPTCHA rejection and transport failure retain entries without duplicate or success copy. Existing error-decoder tests independently cover actual API error codes, rate limiting and non-JSON failures. PostgreSQL duplicate rejection preserves the original two notices. |
| WEB-02, 4 | `RejectedCaptchaRetainsNoIntakeAndDemoRetryCreatesOnlyWebsiteIntent` saves one demo inquiry with one pending staff notice and compares Portal user, organization, Lab service order, reagent order, invoice and service-entitlement counts before/after: all unchanged. Browser demo correction succeeds once with its separate confirmation. |
| WEB-02, 5 | Local CAPTCHA execution failure sends no request. Simulated server CAPTCHA rejection, network failure, validation failure and server outage keep signup fields and opt-in; corrected retry succeeds once. Demo CAPTCHA rejection retains the project description before success. The actual Website service rejects both intake kinds before saving, then accepts the corrected verifier result in the same transaction. |
| WEB-04, 1 | Existing administration component checks display failure, Needs attention, attempts and load-error recovery. Actual dispatcher plus the real Mailgun adapter receives five simulated HTTP 503 responses, leaves intake intact and retains five failed attempts. An additional automatic dispatch does not send attempt six. |
| WEB-04, 2 | Exact-recipient review and stale-version refresh pass in the administration component tests. In PostgreSQL, correcting the simulated provider and queuing recovery on the same failed notice retains all five failures, appends accepted attempt six, and records the requesting actor on both attempt and `ResendQueued` audit. Existing version/cooldown checks also pass. No signup is recreated. |
| WEB-04, 3 | Existing component coverage offers reviewed legacy recovery only for a requested brief without delivery history. New PostgreSQL coverage denies an unsubscribed opted-in contact without creating a notice, and queues an active opted-in contact with actor/audit. Existing coverage denies no-opt-in and duplicate recovery, and cancels queued work after unsubscribe. Customer/non-Phaeno access is denied by existing backend coverage. |
| WEB-04, 4 | The simulated provider accepts the message, while the separate simulated inbox initially remains empty. Only an explicit fixture delivery creates the receipt. Provider, persisted accepted-state and inbox timestamps are retained separately below. This proves the software does not equate provider acceptance with inbox receipt; no real inbox was checked. |
| WEB-04, 5 | The actual Mailgun adapter's captured `v:technicalBriefPath` equals the repository's configured URL, and the recipient/template/tracking fields are checked. A clearly labeled simulated receipt links that exact URL. Browser navigation intercepts it and fetches the same-path local Website PDF, verifies HTTP 200, PDF content type/signature and exact source bytes. The original PDF's three rendered pages show the title **PSeq Technical Brief**, matching the simulated receipt's three-page label. The external Mailgun template and deployed PDF are unverified. |

## Verification

- **15 backend checks passed, zero failures/skips**: 14 PostgreSQL notification checks including three new cases, plus the existing sender-failure check. Result: `tmp/website-acceptance-results/website-intake-recovery.trx`.
- **13 Portal administration component checks passed, zero failures/skips**: `WebOpsDeliveryPanel` and `WebOpsDashboardContent`. Result: `tmp/website-acceptance-results/portal-components.json`.
- **Two Website error-decoder checks passed**: `website/src/components/contact-forms/websiteContactError.test.mjs`.
- **Two actual-route browser runs passed**, at 1440 and 390 pixels, with zero tested-form automated WCAG violations and zero page overflow. Each run ends with two simulated contacts, one demo and four notice intents. Source: `tmp/uat-closure-identities/web-intake-simulated.mjs`; results/screenshots: `tmp/website-acceptance-results/web-intake-simulated.json` and `web02-{1440,390}-{recovery,complete}.png`.
- The focused test build compiled the backend tests and their dependencies. No application build or broad test suite was needed for these test/documentation-only changes. Final linked-path, ledger count and whitespace checks passed.

The first browser attempt clicked the server-rendered form before Astro hydration; the harness now waits for its ready island. The subsequent sandbox runs could not save results; the same bounded, intercepted checks passed with the required local execution permissions. No product fix was inferred from either harness issue.

## Simulated provider/receipt and document evidence

The rolled-back delivery ID was `4094ecc6-1b27-4b38-918c-e548827bc5eb`, addressed only to a generated `@example.test` alias. The retained TRX output and `simulated-receipt.json` record:

| Separate event | UTC timestamp |
| --- | --- |
| Simulated provider accepted | 2026-09-15 20:04:26.3157295 |
| Dispatcher persisted Accepted | 2026-09-15 20:04:26.3159170 |
| Simulated inbox received | 2026-09-15 20:04:26.3506343 |

The exact configured/message path is `/technical-brief-C660184C-47D0-45AA-872F-8B3538F17BE5/PSeq-Technical-Brief.AD6548E7-F66A-429A-B0F6-A63988935D68.pdf` on `https://www.phaenobiotech.com`. Local bytes: **292,851**, **3 pages**, SHA-256 **`8c57056bc869090ddadc4bf1a71538e7235488e2753c97d573667c5912430abb`**. All three pages were rendered and visually inspected; source bytes were unchanged. The simulation's email rendering is a test fixture, not a recovered or verified Mailgun template. No scientific claims in the PDF were independently validated by this acceptance run.

## Retained real-world gates and cleanup

Actual Google CAPTCHA behavior, provider authentication/configuration, external template copy, live destination delivery, spam/filter handling and deployed exact-link/PDF identity remain open. The real template must still be compared against its received document; no assumption that it says three pages is made here. WEB-05 workflow-family notification acceptance is a separate open case.

Every PostgreSQL fixture rolled back, including the capture delivery above. No test email escaped the simulated HTTP handler. Browser requests to external CAPTCHA/tracking services were fulfilled locally or blocked; form writes were intercepted. The local Website server was started for this run and stopped afterward. The existing Portal/API, original UAT fixtures, worker configuration and Git index were preserved. No commit, push, migration, deployment or real external message was performed.
