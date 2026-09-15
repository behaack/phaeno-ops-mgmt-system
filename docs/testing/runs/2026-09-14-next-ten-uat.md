# Ten-case UAT batch — September 14, 2026

## Continued checkpoint — Commercial intake access corrected

The owner authorized the bounded correction below with **continue**. It is implemented and running on the same isolated Portal/API. This continuation closes the access defect, not another complete acceptance case: the selected batch remains **3 of 10 Pass**, and the overall ledger remains **12 of 81 Pass**.

Actual P-PRICE now opens Order intake without the CRM handoff error, selects Customer A/Research, reads the distinct pricing/quote/invoice readiness requirements, opens the saved commercial record and returns with its search/view preserved. The canonical Lab Service catalog lookup supplies pricing without granting general configuration access. Customer names use the bounded Customer lookup when the administrator organization list is unavailable. P-ADMIN retains read access with direct and handoff pricing disabled when it lacks the role. Other queue/configuration/Department-administration access remains denied to P-PRICE; external Customer access to the staff endpoints remains denied.

Connected rejected-write checks: P-PRICE reaches the required data-declaration validation (400); P-ADMIN and C-ADMIN are denied before intake (403). All three attempts are journaled. Customer A still has the same five DraftRequest Finance fixtures. No new Customer order, accepted terms, shipment, role grant or scientific configuration was saved.

Verification: **15 backend tests pass** (four rollback-scoped PostgreSQL access/workflow cases and eleven session cases); **24 frontend tests pass** (navigation, intake, form/readiness and quote review). The rollback workflow test performs Begin quote and Request changes, checks the saved status events and absence of Lab authorization. It does not claim a connected positive Start pricing or idempotent creation test: an initial attempt to combine that transaction-owning action with an outer rollback transaction was incompatible and was replaced with the supported rollback workflow check. Frontend typecheck, focused lint, documentation generation/check and whitespace validation pass. No production deployment.

Evidence: `tmp/uat-closure/intake-access-connected.json`, `intake-final-connected.json`, `intake-quote-review-connected.json`, `intake-access.trx`, `intake-test.log`, `intake-ui-tests.log`, `intake-typecheck.log`, `intake-lint.log`, `intake-docs.log` and the related PNGs. The final API binary is `tmp/uat-intake-verified-build/bin/PSeq.Operations.Api/debug/PSeq.Operations.Api.dll`, SHA-256 `C0E99874F49ABEB5AD8152451218909C377589B19A77F2B56DE016F84D99A946`; documentation corpus `b4e4ab8e37d76bc1ecab5d23885f7032cea53bdc55456b485a9a2109cead2b53`. Runtime manifest: `tmp/uat-closure/intake-api-baseline.json`.

**Next dependent work:** the approved test analysis/source composition question remains unanswered. Standard positive purchasing requires a reviewed eligible offering. Manual pricing does not require an analysis ID, but still needs the approved source composition and supported entitlement/quote setup. Keep ORD-01/02/03/04 and SHP-02/03/04 unfinished until their complete crosswalks pass. Reuse the existing SHP-02 locations and all previously completed evidence.


The Product Owner requested the next ten remaining cases. Selected cases: CRM-06, ORD-01–04, SHP-01–04 and WEB-01. **Three cases are now closed for isolated software acceptance; seven are not closed.** This is not ten completed cases or release signoff. Whole-case progress is **12 of 81**. Passing evidence within the seven unfinished cases is retained.

## Current baseline

Portal https://localhost:3016, owned API https://localhost:7116, isolated PostgreSQL 127.0.0.1:5436 / phaeno_ops_lab06_uat. Current checkout HEAD is 6defa51c270a5c9f59f3ed9c14c04f41c942b9ce plus this batch's changes. The previous run's older HEAD remains historical evidence. This task made no Git mutations. API binary is tmp/uat-crm06-build/bin/PSeq.Operations.Api/debug/PSeq.Operations.Api.dll, SHA-256 44D27B305B6B259641F33148B75BABE6F21FDA0F3922074AC73E7A2C763B4488. Only the owned prior UAT API was replaced; launcher 51040. Existing provider, scanner and retention boundaries remain unchanged. No identity grants, auth-policy changes, shared migration, deployment or outbound message was performed.

Website production was inspected read-only to reproduce its search error. The correction was built locally (17 static pages), served at http://127.0.0.1:4326, and verified using the actual public search API responses through a test transport plus controlled failure/delay. Local search asset Search.D5vJNZaq.js. The correction is not deployed. The existing owner browser was not used or modified.

## CRM-06 — Pass

| Required step | Connected evidence |
| --- | --- |
| 1 Mixed preview | Actual admin CSV upload: one valid, one existing duplicate, one invalid row; row 3 explained, Commit disabled. Business list unchanged. Direct invalid commit originally returned 500; corrected validation now returns 400 before any rows are constructed. |
| 2 Correct and retry | Corrected preview reports two valid/one duplicate/zero invalid and writes no Companies until confirmation. Actual UI commit imports exactly two. Same batch/current-version retry and identical preview preserve the batch; a separately previewed unchanged file reports three duplicates and imports none. |
| 3 Controlled merge | Reuses the completed CRM-01 CRM-only merge with reason, retained relationship, original immutable activities, suppression preservation and merge audit. Fresh source read still points at the same authoritative target. No repeated merge. |
| 4 Custom fields | Admin creates required Internal and Restricted Option fields through UI. Incompleteness visible; null/unconfigured choices rejected. Both valid values save; ordinary Commercial session sees and updates only Internal. Restricted definition/value absent, direct write 403, authoritative value unchanged. |
| 5 Views/export/admin | Commercial personal and admin shared views save through UI, retain filters, and have correct owner visibility. Commercial shared publication/import/export/field administration denied, duplicate directory 403 and admin controls unavailable. Filtered admin export contains exactly the two new Companies; independent database audit matches filter, row count, actor and time. |
| Cleanup | Both disposable custom-field definitions and both views deactivated through supported actions. Values/import/merge/export audit retained. No invitations or outreach sent. |

Retained new Companies: 9264f8d9-7982-4c25-869c-da3534a58a97 and c110db0c-fa3c-431f-b28b-56426e6bb147. Import batches: invalid 7a310f41-5304-4472-9b02-28eb877679b8; committed 56595f0e-1705-4f9a-9d5e-6c068d3f9e12; unchanged-content duplicate-only 3f814872-d7fc-467d-b65e-bc31e8ba5424. Export audit dfcda7e0-0a35-4c43-81bc-c08ecb7a8992 records two rows and the admin actor.

Product correction: CrmAdministrationController rejects InvalidRows before AddImportRow, preventing a null-name query exception and construction of partial tracked records. The rollback-scoped PostgreSQL regression failed before the guard and passed after it (one test, zero skipped), including null/empty names, unchanged preview/version and no persisted or tracked Company additions. The original HTTP 500 and subsequent 400 remain in the request journal. The existing guide already says invalid rows block commit, so no changed CRM user instructions are required.

Evidence: tmp/uat-closure/crm06-connected.json, crm06-audit.json, crm06-export.csv, crm06-fields.png, crm06-invalid-before.trx, crm06-invalid-after.trx and crm06-api-baseline.json. Do not rerun import creation/commit or the reused merge.

## SHP-01 — Pass

| Required step | Connected evidence |
| --- | --- |
| 1 Catalog/detail | Actual configuration and dedicated detail pages show TRANS-20/10/05 identity, capacity 20/10/5, active revision and compatibility. |
| 2 Recommendations | Actual UI/API: 18 tubes → one TRANS-20, two unused slots; 30 → TRANS-20 plus TRANS-10, zero unused slots. Preview creates no physical stock or shipment. |
| 3 Invalid/draft | UI missing name, zero/fractional capacity and direct invalid-name/capacity/incompatible-rule requests rejected. Duplicate SKU returns 409. Inactive seven-slot draft is labeled Including draft for preview and excluded from ordinary recommendation. |
| 4 Revision/history | Separate TEST ONLY size revised to active revision 2 with same SKU and supersedes link. It becomes eligible, then leaves future recommendations when retired. Both revisions remain. Complete existing shipment readbacks are identical before/after, retaining frozen container/revision facts. |

Disposable definition 944e28f1-b5fe-434f-8ddf-dccacf7c6424, revision 2 76e00ea9-6c09-4742-88ed-5d55efdb79ef is retired. Original TRANS catalog and physical inventories were not changed. Evidence: tmp/uat-closure/shp01-connected.json and shp01-retired.png. The UI selector corrections during the harness run were test assumptions, not product defects. No physical material qualification is claimed.

## WEB-01 — Pass for the corrected local Website build

| Required step | Evidence |
| --- | --- |
| 1 Public navigation | Visible Home → PSeq technology → White Papers → Part 1 → Contact links work; research-use qualifications remain visible. |
| 2 Search | Actual published API returns public isoform results; the selected result opens its correct published page and anchor. No-match differs from the corrected outage alert. Try again preserves input, shows Searching, uses the actual service result, and returns keyboard focus appropriately. Controlled 503 is explicitly a fault injection. |
| 3 Public document | Part 1 landing page's View 7-page PDF opens the matching seven-page Letter document. PDF header checked, title/page 1 and diagram/page 4 rendered and visually inspected, readable without clipping. SHA-256 916fd8308854521cd89a911540d9434218a6ff479968ffc7bc8ec843261b4072. |
| 4 Phone/no JavaScript | 390px keyboard menu open/Escape, metric expansion/collapse, On this page anchor and reduced motion pass without page overflow. Core Home/technology/paper/contact headings and qualifications readable with JavaScript disabled. |
| 5 Discovery | Representative canonical URLs, titles/descriptions match public routes. Duplicate canonical tags currently agree on identical URLs. Sitemap has 16 public HTML URLs, including paper landing pages, excluding private/preview/PDF routes. robots and llms.txt return 200. No feed is configured; /rss.xml and a nonexistent route return meaningful 404s. |

Fixed observed defect: Search.tsx previously logged service errors while continuing to show the no-match message. It now separates loading, successful empty results and unavailable service; offers Try again, preserves the query, and suppresses aborted-response changes. Website build passed. Source guide: Website README updated. Evidence: tmp/uat-closure/web01-connected.json (production defect), web01-final.json (corrected local build and actual result destination), web01-build.log, web01-fixed-outage.png, web01-phone.png and web01-paper-page-1/4.png. No production deployment or indexing change.

## SHP-02 — Partial, retained independent controls

Actual Customer Organization admin, Research Department admin, Research member, another Customer and Phaeno admin sessions verified: empty location state; field-level validation/required legend; saved view-first detail; full-width address; second-location default transfer; stale edit 409 with draft intact; no overwrite; member create/update/delete 403; cross-Customer and cross-Department reads/writes 404; admin read; reachable phone header actions; cancel then confirmed retirement; inactive address retained and removed from active choices. The remaining active location is the one default.

Location A 3d201a95-0bb6-49d8-9e49-d58ca49e55af is inactive; location B c0b8d940-e2af-4bea-9de3-ee3a1988dbe4 remains active/default for Customer A Research, with clearly fictional TEST ONLY address data. No delivery has been ordered. Evidence: tmp/uat-closure/shp02-connected.json and shp02-390.png. The create endpoint returns the existing 200 envelope despite its controller's attempted 201; this harness expectation was corrected without repeating either successful creation.

**Still required:** entering from a shipment and returning to an unsubmitted kit confirmation; default versus multiple/no-default selection there. Customer A has no eligible accepted/shipping-ready Job. This case is not Pass.

## Six order/shipping cases — prerequisite and access gates

Current actual API readback: zero analysis definitions; Customer A has five DraftRequest Finance fixtures and zero shipments; its Research Department lacks Ready PSeq service entitlement. Quote readiness additionally reports missing order defaults, result destination and submission instructions. The dedicated Partner's Lab catalog/access returns 404 because its prerequisite service access is absent. Existing accepted Jobs belonging to other organizations and the original shipping walkthrough were not changed or adopted by expanding access.

The pre-correction intake access defect was: P-PRICE is a non-admin CommercialOperator with canQuoteLabServiceWork=true, but customer-options and readiness endpoints still require platform administration and return 403. P-ADMIN can inspect readiness but lacks pricing capability and cannot edit the intake form. This is separate from scientific configuration and is not fixed by granting either account unrelated administration. It is now corrected and verified as described in the continued checkpoint above.

| Case | Exact unfinished path |
| --- | --- |
| ORD-01 | Complete missing staged setup/return, authorized pricing, quote-versus-invoice gate variants and historical/new approved offering comparison. |
| ORD-02 | Approved standard offering and Customer/Partner service readiness, then two-specimen 220.00 terms, organization-versus-Department commitment, lost response and stale terms. |
| ORD-03 | Ready entitlement and quote configuration, then profile correction, independent pricing, complete/pre-tax issuance, current/expired/superseded acceptance and unaccepted scope increase. A manual pricing profile itself does not require an analysis ID; zero analyses alone is not its blocker. |
| ORD-04 | Legitimately accepted two-specimen and multi-source Job, then empty-roster CSV/atomicity/source mix/natural sorting/finalization/readback variants. |
| SHP-03 | Finalized accepted Customer Job and eligible controlled location-stock variants before included-cost review/confirmation/retry/no-price-change assertions. |
| SHP-04 | Separate pending/unsubmitted/dispatched fixtures before delayed/sibling/stale-location cancellation and post-dispatch denial variants. |

Evidence: tmp/uat-closure/next10-prerequisites.json and next10-order-shipping-gates.json; no business writes from these prerequisite probes. An approved test analysis/source specification was requested asynchronously; it has not yet been supplied. These are unfinished cases, not seven assumed failures or seven completed cases.

## Approved correction scope (implemented)

The approved correction reconciles the existing CommercialOperator policy across the queue, customer options, department lookup, readiness, creation and record return. Preserve configuration administration, Finance and scientific authority boundaries, feature-flag fallback, active Phaeno membership checks and denied external users. Add connected tests for the existing P-PRICE/P-ADMIN/external sessions plus rollback-scoped controller authorization tests. The owner approved this bounded authorization correction with continue. No role grants, authentication-provider changes or production permissions were changed. The implementation decision and preserved boundaries are recorded in the Order Management plan.

Existing passing observations must be reused. Do not create another import, merge, container revision or delivery location simply to rebuild this report.
