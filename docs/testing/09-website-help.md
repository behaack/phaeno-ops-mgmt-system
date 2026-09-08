# 09 — Public Website, notifications and Portal help

Use [shared prerequisites](TEST-DATA.md). Public Website has its own deployment. All submissions use an approved isolated mail sink or explicitly authorized tester-controlled recipient.

## WEB-01 — Public discovery, navigation, search and documents

**Setup:** Website address/revision; known published white paper and public search result; desktop/phone browsers.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Navigate Home → technology pages → white papers → Contact through visible links. | Correct pages, working navigation and recognizable next actions; preliminary/RUO scientific qualifications remain visible. |
| 2 | Use site search for known publication/phrase, no-match term and controlled search-service failure. | Relevant public results open correct pages; no matches differs from error/retry; no private Portal content appears. |
| 3 | Open known public paper/download and inspect title/document pages. | Expected readable PDF/document, matching publication identity; no broken internal or unpublished preview link. |
| 4 | On phone use menu, homepage metric expansion and On this page links; navigate core content with JavaScript disabled where supported. | Content/research qualifications remain readable, controls named/keyboard usable, core static content available. |
| 5 | Engineering checks representative canonical/metadata, public sitemap/feed paths and a nonexistent URL. | Current public URLs/metadata consistent; missing route gives meaningful 404; private/preview content excluded from public discovery. |

**Cleanup:** None; this case is read-only. Record actual published content rather than relying on historical route counts.

## WEB-02 — Contact/technical-brief and non-binding demo inquiry

**Setup:** Fresh controlled emails, approved test reCAPTCHA setup, isolated Website/API/mail sender.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open contact/technical-brief form; leave required fields/consent incomplete and submit. | Required legend/associated errors visible; invalid intake not accepted. |
| 2 | Submit valid consenting request with permitted test data and captcha. | One saved intake with durable email intent; confirmation says queued, not delivered. |
| 3 | Repeat accepted signup; compare duplicate-email error with unrelated API failure. | Repeated accepted signup does not resend brief; duplicate-specific message only for actual duplicate-email response. |
| 4 | Submit separate non-binding demo/order inquiry. | Inquiry saved for Web Operations; no commercial order, invoice, service entitlement or Portal user created. |
| 5 | Simulate failed request/captcha failure, correct and retry. | Entries preserved, specific recoverable error, no false success or partial duplicate delivery. |

**Handoff:** Record intake/notification IDs and requested recipient alias for WEB-03/04, not private personal data.

## WEB-03 — Web Operations intake and email processing controls

**Setup:** P-ADMIN plus non-admin control; isolated queued notices; explicitly authorized test processing pause/resume.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open Web Operations and switch Mailing List/Demo requests/Email delivery by mouse and keyboard. | One active panel, matching counts/content; non-admin cannot read/manage protected intake. |
| 2 | Open mailing-list record, review then cancel Unsubscribe; repeat and confirm on disposable contact. | Cancel changes nothing/restores focus; confirmation deactivates correct intake and prevents future eligible sending. |
| 3 | Review/complete disposable demo request, then reopen. | Completion pertains to intake only; history retained, no order completion fabricated. |
| 4 | Open Pause review, cancel; then pause with reason in isolated environment and submit a new test intake. | Cancel preserves processing; paused state audited, intake still queues and monitoring continues; in-flight attempts may finish. |
| 5 | Resume with reason; inspect attempts and queued/sending/failed/provider-accepted counts. | Existing queue resumes without duplicated intake; sender acceptance distinct from destination receipt. |

**Cleanup:** Restore original test processing state and dispose of queued test deliveries through supported operations.

## WEB-04 — Failed delivery, eligible resend and destination receipt

**Setup:** Failed delivery and active opted-in legacy unknown-delivery intake; configured sender/test inbox; P-ADMIN.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Inspect attempts for controlled failure/Needs attention. | Failure, attempt count and recovery are visible; saved intake remains separate from delivery outcome. |
| 2 | Correct test sender issue and review/queue eligible resend on existing notice. | Same intake with retained attempt history; no need to recreate signup/order. Automatic retries respect current configured limit. |
| 3 | Queue technical brief for eligible legacy unknown-delivery intake; try inactive/not-opted-in variant. | Only eligible reviewed request queues a brief; inactive/unauthorized path denied. |
| 4 | Wait for sender result, then independently inspect actual controlled Inbox. | Provider acceptance and Inbox receipt recorded separately with timestamps; either missing evidence leaves that assertion unverified. |
| 5 | Follow exact received document link and compare email promises/title/page count with PDF. | Link works and copy matches actual document; mismatch is a failure even if mail arrived. |

**Cleanup:** Retain safe provider/message references; do not paste full recipient messages or resend to real contacts for testing.

## WEB-05 — Workflow notices, recipient changes and failed-event recovery

**Setup:** Controlled invitation, quote, Trial milestone and release notices; current/removed admin identities; isolated failed delivery.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Trigger one authorized test transition per selected workflow and inspect resulting Portal record plus notice. | Business transition commits once; notice identifies safe record/context and links authenticated owning workspace. |
| 2 | Confirm quote/result recipients against owning workflow rules; change an admin before queued grant/retention notice dispatch. | Current active recipient/scope rules respected; removed recipients excluded where dispatch re-evaluates membership. |
| 3 | Follow notice as correct account, signed-out account and wrong test organization. | Sign-in required as appropriate; no cross-tenant content from link. |
| 4 | Fail delivery, then recover same notice/event through owning workflow. | Retry preserves original order/approval/release and retention dates; no duplicate business transition. |
| 5 | Compare external notice and CRM projection with internal Lab/financial notes. | No sample identifiers in CRM milestones, internal investigation, restricted costs or credentials leak; Inbox evidence separate from sender acceptance. |

**Cleanup:** Remove pending controlled notices only through supported actions; preserve delivery/audit history.

## WEB-06 — Audience help, search and context-preserving navigation

**Setup:** Phaeno, Prospect, Customer, Partner sessions; known guide phrase per audience; controlled search failure.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open Docs in each audience and search its known workflow phrase. | Correct audience guides/results and product name: POMS internally, Portal externally. |
| 2 | Open another audience's direct guide URL as external user. | Audience navigation/access policy blocks it. Static bundled help remains safe to distribute; this is not a confidentiality guarantee. |
| 3 | Open result, follow workflow/help links and return; compare search query/guide context. | Correct guide/owning route, no broken path or wrong organization. |
| 4 | Test no-match, failed search and Retry; inspect pending results during audience/session changes. | Error distinct from no results; stale results cannot expose another audience in current UI. |
| 5 | On desktop and narrow layout operate sidebar/tab/disclosure with keyboard, Escape and touch. | One documentation subject expanded, active group opens; non-modal rail behaves correctly and no duplicate navigation. |
| 6 | Verify external locale controls against currently published corpus. | Only supported reviewed locales advertised; no fabricated translation/hidden English-only instructions presented as localized acceptance. |

**Cleanup:** Restore normal network behavior. Record corpus/release identity for search acceptance.

**Sources:** [Website README](../../website/README.md), [Website controller](../../backend/app/Features/Website/WebsiteController.cs), [Web Operations controller](../../backend/app/Features/Website/WebsiteOperationsController.cs), [documentation standard](../user-documentation.md), [Web recovery E2E](../../frontend/e2e/web-ops-recovery.spec.ts), [documentation search E2E](../../frontend/e2e/documentation-search.spec.ts).
