# 10 — Recovery and cross-system checks

Use [shared prerequisites](TEST-DATA.md). Engineering/operations assists with isolated fault injection and independently verifies persisted results. Do not apply these failures to shared production services.

## SYS-01 — Conflict handling, delayed saves and duplicate submissions

**Setup:** Two authorized sessions and separate Company edit, Trial draft, quote acceptance, sample finalization, Kit placement and Finance allocation fixtures.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open same editable record in both sessions; save first session then stale second. | Second save rejected; first change persists. Appropriate reload/review path preserves second user's entries where documented. |
| 2 | Follow Use reviewed record / Reload current Trial; keep my entries or owning record's recovery, then deliberately resubmit. | Current version and consequence reviewed before save; no silent overwrite. |
| 3 | Delay a save and try repeat click, Escape, Cancel and navigation. | Busy controls prevent duplicate/dismissal hazards in protected dialogs; no false completed action before response. |
| 4 | Engineering drops only successful response after commit; tester uses documented resume/retry. | One quote acceptance, Lab authorization, Kit sale/case set or financial mutation; saved record recovered. |
| 5 | Independently reopen linked records and inspect counts/IDs/audit after recovery. | UI and persistent state agree; duplicate prevention not inferred merely from disabled button. |

**Cleanup:** Restore response behavior after each variant; retain both attempted versions and final IDs.

## SYS-02 — Partial outages, durable projections and unavailable connectors

**Setup:** Isolated API/search/storage/scanner/sender failure controls; committed order/Trial/scientific milestone fixtures; configured recovery capabilities.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Fail a list/supporting lookup request, then retry. | Error/retry shown, not empty business state; unrelated sections remain usable where supported. |
| 2 | Fail Lab-to-Commercial or Trial/standard-sale-to-CRM projection after authoritative commit. | Original scientific/commercial state remains committed; safe pending/failed recovery visible. |
| 3 | Retry original durable event and repeat recovery. | Destination reaches correct state once; no recreated work, sale, approval or leaked internal fields. |
| 4 | Make storage/scanner unavailable during upload/release preparation, then restore. | Incomplete/unclean file cannot be approved/released; recoverable draft/original package remains. |
| 5 | Attempt retained QuickBooks recovery while connector unconfigured. | Unavailable/Needs attention with no fabricated invoice/payment/zero balance; retry cannot pretend to configure connector. |

**Cleanup:** Restore every injected dependency; inspect remaining failed/queued work and assign owner rather than mark complete.

## SYS-03 — Active access removal and in-flight download revocation

**Setup:** Customer/Partner test files large enough for controlled transfer, active monitored enforcement, admin and external sessions; clean disposable drafts.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Start authorized file/ZIP transfer; remove selected membership/Department access from other session. | New requests denied; monitored active transfer stops under configured revocation contract. |
| 2 | Refresh external detail/list and repeat with release withdrawal or file scan failure fixture. | Stale UI/cache cannot authorize new bytes; failed transfer is not completed. |
| 3 | Restore access and attempt resume of revoked transfer. | Restoring access does not revive old revoked attempt; any new transfer requires fresh authorization. |
| 4 | Replay prior successful operation identity after changing/removing tenant/Department access. | Server rechecks current scope before returning prior result; idempotency cannot reveal another tenant's response. |
| 5 | Switch among permitted Departments with a saved draft and return. | Prior workspace does not remain active under wrong Department; records retain original owning scope. |

**Cleanup:** Restore test grants/assignments; if monitoring is disabled, record active-stream assertion Blocked and separately record fresh-request results.

## SYS-04 — Holds, cancellation and cross-screen ownership

**Setup:** Separate received/unreceived/partly consumed Lab work, Kit output with paid original source, Trial hold, blocking exception; Commercial/Lab roles.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Request cancellation externally and inspect Commercial/Lab views before decision. | Same request/record visible; pending request does not erase shipment/receipt or force Lab cancellation. |
| 2 | Record bounded Lab recommendation based on known custody/consumption and decide Commercial cancellation. | Allowed full/partial/declined outcome retains work and financial correction history. |
| 3 | Place operational/Trial hold and attempt execution, scientific approval, shipping and result-release actions. | Applicable progress gates remain effective across screens; legitimate custody/exception records remain possible. |
| 4 | Satisfy Partner payment while output has hold/pending cancellation. | Payment processing does not release blocked work. |
| 5 | Follow Company → order/Trial → shipment → Lab → execution → parent return links. | Each handoff retains exact organization/Department/record/section; no manual duplicate record needed to continue. |

**Cleanup:** Resolve test holds through owning workflow with reasons; do not delete exceptions or custody facts.

## SYS-05 — Keyboard, responsive UI, errors and draft recovery

**Setup:** Representative populated Company list/detail, Trial scope, quote, sample roster, Kit input, Finance dialog, protocol execution and help; 1440px desktop, tablet, 390px phone, zoom/reduced motion/light/dark modes.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Navigate lists/filters/primary identifiers/create-edit actions using keyboard alone; open detail and return. | Visible focus, meaningful names, preserved filters/page/scroll; lists are discovery surfaces and major records view-first. |
| 2 | Operate searchable modal choice with arrows/Enter/Tab/Escape, then dismiss edited form. | First Escape closes choices, draft retained; discard review works, focus returns to invoker, no keyboard trap. |
| 3 | Trigger required-field errors, failed save, loading and no-results states. | Visible required legend and field-associated errors; errors distinguish retry from no records; unsaved entries retained as documented. |
| 4 | Repeat at phone/tablet/200% zoom, plus 320 CSS-pixel reflow for representative forms; inspect footer actions and long labels. | Controls/content remain usable without clipping or page overflow except justified two-dimensional content; no duplicate navigation. |
| 5 | Check light/dark focus and contrast, reduced-motion behavior, accessible names/status announcements with accessibility tooling/screen reader. | No critical keyboard/naming/announcement issue; WCAG 2.2 AA checks recorded explicitly. Automated scan alone does not prove complete conformance. |

**Cleanup:** Reset temporary viewport/preferences if shared. Record per-surface/device subresults; one passing modal does not pass every workflow.

## SYS-06 — Coordinated restore and release-level acceptance

**Setup:** Operations engineer; isolated populated database/private files with known manifests and checksums; approved backup tooling, isolated restore target and recovery plan. No production writer interruption is authorized by this document.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Record exact API/UI/Website revisions, schema/provider/flag prerequisites and owned database-file references. | Evidence identifies actual release/environment; health alone not treated as workflow completion. |
| 2 | In isolated environment create coordinated database/private-file backup using approved tooling. | Bounded writer pause produces consistent snapshot; API returns to service before long verification. |
| 3 | Exercise supported backup failure/watchdog fixture. | Exact paused API recovers; no orphan writer outage, exposed plaintext or false successful snapshot. |
| 4 | Restore to isolated target; verify database references and file bytes/checksums, then reopen representative Job/package/receipt. | Referential integrity, owned files and known checksums match; real downloadable test artifact survives restore. |
| 5 | Review actual independent scheduled run and off-server encrypted artifact where activated. | Host-local file or manual feature-branch dispatch is not proof of scheduled/off-server backup. Missing activation is Blocked. |
| 6 | Assemble case results and remaining operational/physical/provider gates against this exact release. | Every required case has evidence/result; unresolved blockers have owner/next action and explicit acceptance decision. |

**Cleanup:** Operations removes only verified isolated restore resources under approved procedure; retain encrypted artifacts/receipts and no plaintext secrets in test report.

**Sources:** [verification playbook](../../ai/playbooks/verification.md), [UI principles](../ui-ux-principles.md), [operations readiness](../operations-readiness.md), [operational completion/backup boundaries](../plans/PORTAL-OPERATIONAL-COMPLETION-2026-09-08.md), [retention concurrency tests](../../backend/test/GovernedRetentionConcurrencyPostgresTests.cs).
