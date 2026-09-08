# 02 — CRM and Company handoffs

Use [shared prerequisites](TEST-DATA.md). All CRM data is fictional commercial context, with no sample identifiers or scientific contents.

## CRM-01 — Company, Contact and relationship management

**Setup:** P-SALES, P-ADMIN; COMPANY-NEW; two controlled Contacts.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create a Company from Companies, open its name and edit ordinary commercial details. | One view-first Company workspace persists; creation grants no Portal access, user, service or order. |
| 2 | From People use New person, then Add existing person for the second Contact. | Both relationships point to durable Contacts; Company-specific titles belong to relationships. |
| 3 | Edit a relationship and remove one association after reviewing the consequence. | Other Company relationships and Contact identity remain; history retains the prior association. |
| 4 | Search/filter Companies, open the record and return. | Search/page context is retained; no-result and load-error states are distinct. |
| 5 | Open an association selector, enter a draft title, press Escape once then again. | First Escape closes choices with draft intact and focus restored; subsequent dismissal follows dirty-draft confirmation. |

**Handoff:** Keep Company and primary Contact for onboarding and commercial work.

**Outreach variants:** Edit a Contact email without selecting **Record or update outreach decision**: new contacts stay Not established, and changing an Allowed email resets permission. Record Allowed with source/date/scope, rejecting missing evidence and future dates; then record Suppressed with a reason. Check directory/detail/export and immutable Activity history with staff/time and before/after evidence. Review legacy Permitted (needs review), Opted out/Do not contact (Suppressed), and merge a suppressed duplicate into an allowed target (suppression survives). Verify the screen explains that external sending tools are not automatically blocked. No invitation or outreach email should be sent during these variants.

## CRM-02 — Lead qualification, duplicate review and conversion

**Setup:** P-SALES; existing Company/Contact duplicate candidate; active default pipeline.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create a Lead, move New → Working and qualify with explanation. | Decision and actor persist; incomplete required fields prevent save. |
| 2 | Convert the Qualified Lead, initially choosing creation that collides with the known duplicate. | Duplicate review blocks unsafe creation or surfaces the documented warning; no automatic merge occurs. |
| 3 | Choose the existing Company; optionally create/link the valid Contact and Opportunity, then convert. | Lead records resulting identities and becomes immutable Converted history. No Portal access or executable work is created. |
| 4 | Refresh/retry the completed conversion. | Existing conversion results remain; no duplicate Company or Opportunity appears. |
| 5 | On a separate Lead disqualify with reason and try ordinary editing/conversion. | Terminal state/reason is retained; unsupported edits/conversion are prevented. |

**Handoff:** Record converted IDs for CRM-03; retain terminal Leads.

## CRM-03 — Opportunity pipeline, buying team and reports

**Setup:** USD and non-USD Opportunities, two pipelines, Contact, P-SALES/P-ADMIN.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create an Opportunity linked to the Company and active pipeline; associate a buying-team Contact. | Unique read-only number and initial stage history exist; active duplicate associations are excluded. |
| 2 | Move through valid stages; omit a required Lost/Abandoned reason, then supply it on a variant. | Missing reason is rejected; accepted changes retain prior/new stage, actor, time and reason. |
| 3 | Attempt another pipeline's stage via an engineering-assisted negative check. Reopen a closed Opportunity through an allowed transition. | Cross-pipeline move fails; valid reopening preserves old closure history. |
| 4 | Mark the main pursuit Won and review Company/order records. | Won alone creates no entitlement, order or Lab work; reviewed handoff is still needed. |
| 5 | Compare board/table, filtered export as admin, and Reports against the known USD/non-USD records. | Filters agree; counts include both currencies, USD monetary aggregates exclude non-USD amounts without conversion. |

**Handoff:** Keep the won Customer Opportunity for ORD-06; active Prospect Opportunity for TRI-01.

## CRM-04 — Activities, recurring Tasks and attention handoffs

**Setup:** P-SALES/P-ADMIN; record-linked overdue, due-within-seven-days and recurring Tasks.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Log an Internal activity and a manually recorded Email on the Company. | Timeline records actor/time; logging Email does not send a message. |
| 2 | As P-ADMIN add a Restricted activity; open the same record as P-SALES. | Restricted content is unavailable to Commercial user, including direct access checks. |
| 3 | Create a linked Task, set Blocked without reason then with reason, and complete it. | Reason validation works; completed history remains and ordinary Update is no longer offered. |
| 4 | Complete one recurring Task and refresh. | Exactly one next occurrence has the expected rule-based due date; original is unchanged. |
| 5 | Follow Home overdue/due-soon/next-action/stale-opportunity cards. | Matching list exposes corresponding filters and records; terminal Leads and closed Opportunities are excluded as applicable. |

**Cleanup:** Cancel only remaining disposable open Tasks; retain completed history.

## CRM-05 — Request approval, access, services and completion

**Setup:** CRM-only Company, P-ADMIN, eligible test service request; separate P-SALES session.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create Online access request for the intended external relationship; inspect before approval. | One pending request exists, with no entitlement, accepted member or order. P-SALES cannot perform platform-only decisions. |
| 2 | In central Requests choose Approve and enable Portal access with reason. | Same Company gets pending-readiness tenant scope atomically; no duplicate directory record or service grant. |
| 3 | With an isolated legacy incomplete-access fixture use Complete Portal access; with a compatible unlinked scope review Use existing access scope. | Missing scope is completed or compatible existing scope explicitly reused; users/history survive. Incompatible scope is not silently attached. |
| 4 | Separately approve a service request, then add/edit its effective Ready entitlement in Departments & services. Try an overlapping period. | Correct service/scope/source is retained; overlap rejected; access-only request cannot authorize service. |
| 5 | Invite the contact through ACC-01, verify owning-workflow outcomes, then Complete request. | Approved/needs-work stays actionable until actual work is complete; completion evidence does not itself create missing work. |
| 6 | On a disposable entitlement use End now with reason. | Future eligibility reflects the ended entitlement; historical work/reason remains. |

**Handoff:** Keep active in-scope entitlements for orders. Use separate fixtures for ending access.

## CRM-06 — CSV import, saved views, merge and administrative boundaries

**Setup:** P-ADMIN/P-SALES; three-row import with valid, duplicate and invalid records; disposable CRM-only merge pair.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Preview the mixed import in Administration. | Counts/errors identify rows; preview writes no imported business records; invalid row blocks commit. |
| 2 | Correct invalid input, preview again and commit; repeat unchanged import. | Valid rows imported, duplicates skipped; same batch retry does not duplicate records. |
| 3 | Review duplicate pair and merge through the controlled action with reason. | Selected authoritative identity retains supported linked context and merge audit; warning alone never merges. |
| 4 | Add required Option custom field and an Internal/Restricted variant; save valid/invalid values. | Allowed choices enforced; required incompleteness visible; P-SALES cannot read/write Restricted values. |
| 5 | Save personal/shared views and export as authorized admin; compare with P-SALES. | Personal views available to Commercial user; shared publication, imports/exports and Administration remain admin-only. Export filters and audit match. |

**Cleanup:** Deactivate disposable configuration through supported actions; keep merge/import audit. Do not merge operational customers for a test.

**Sources:** [CRM guides](../../frontend/src/content/docs/phaeno/crm.mdx), [CRM backend](../../backend/app/Features/Crm), [CRM E2E](../../frontend/e2e/crm.spec.ts), [commercial authorization tests](../../backend/test/CrmCommercialAccessPostgresTests.cs).
