# Portal / POMS consistency second pass

The Product Owner requested another application-wide UI and workflow scan on September 7, 2026: “Do another scan looking for UI and workflow inconsistencies. Let's tighten this up.” This continues the [implemented first review](PORTAL-POMS-CONSISTENCY-IMPLEMENTATION-PLAN.md).

## Product outcome and scope

Phaeno operators and Customer, Partner and Prospect users should retain their work and context when opening records, submitting forms, recovering from failures and returning to queues. A failed load must not look like an empty collection; an action failure must remain visible beside the draft; saved records must use the version actually reviewed by the operator.

Review shared interaction patterns, dashboard/navigation, CRM/access, data provisioning, Orders/Finance/Trials, Lab Ops and external ordering/shipping. Implement source-confirmed defects with the existing authorization and scientific/commercial rules. No dependency, authentication, schema or production-data changes are planned. The public Website is outside scope.

Success criteria: clear recovery for failed loads and saves, reliable single-click dialog actions, retained list/record context and drafts, fresh dependent record views after writes, truthful labels, and affected audience help aligned with implemented behavior. Existing business records are not created or changed for browser verification.

## Findings and implementation

Source fixes, affected user guides and the illustrated Word guide are complete and deployed to production. Local verification passed. Regression sources are authored; test suites were not run.

| Area | Finding and implemented outcome | Main source |
|---|---|---|
| Shared dialogs | Receipt Cancel blurs an empty Customer field and expands the centered dialog before mouse-up, losing the click. Fixed actions preserve input focus during mouse activation; ordinary blur and keyboard validation remain available. | `components/ui/dialog.tsx` |
| CRM associations | Opportunity choices stop at 100 Contacts; failed association reads look empty. Incremental directory lookup, explicit loading/retry, retained drafts and removal confirmation replace those dead ends. | `CrmOpportunityContacts.tsx`, `CrmOpportunityContactDialog.tsx`, `CrmContactDetailPage.tsx` |
| CRM edits and ownership | Background refresh resets Company editor fields and Contact communication preference while submitting a newer version. Company/Contact editors now retain the record captured at Edit-open; Company ownership reassignment retains the reviewed owner and version. Failed saves retain entries, and reopening starts from the latest loaded record. | `CrmCompanyDetailPage.tsx`, `CrmContactDetailPage.tsx` |
| CRM lifecycle and merge | Contact lifecycle actions lack confirmation; merge selectors stop at 100 records and lose drafts. Company/Contact lifecycle confirmations retain the reviewed name, action and version; merge retains its reviewed source/version and uses directory lookup, required validation and dirty/pending protection. | `CrmContactDetailPage.tsx`, `CrmCompanyDetailPage.tsx`, `CrmMergeDialog.tsx` |
| Data provisioning | Refresh resets Catalog/Governance to Sources and source return loses context. Validated URL sections retain the selected task and explicitly return source details to Source registry. | `DataProvisioningPage.tsx`, `SourceSampleWorkspace.tsx`, thin route |
| Curated catalog dialogs | Dataset create/edit and dataset deactivation/version retirement can discard entered details or reasons. These four actions now protect dirty/pending drafts, disable editing and dismissal while saving, retain the reviewed record/version for existing-record actions, show failures in the dialog header, and clear failed-attempt state after confirmed discard/reopening. | `DataProvisioningPage.tsx` |
| Dashboard | Refresh and browser Back reset the panel. Validated URL selection now retains it with the existing capability-filtered fallback. | `DashboardPanelSelector.tsx`, `routes/index.tsx` |
| Finance records | Background refresh replaces the invoice/receipt versions being edited. Actions submit reviewed snapshots; concurrency conflicts load the current record for explicit review before retry, retaining entries. | `FinanceActionDialog.tsx` |
| Finance workspace | Hidden queries can make another section unavailable; a hidden Customer filter narrows reconciliation receipts. Queries/errors now follow the active task with Retry; reconciliation uses all Customers. Cash-only direct links do not expose billing actions. | `FinanceOperationsPanel.tsx` |
| Trials | Short action drafts are lost on navigation; failed configuration refresh unmounts an editor. Dirty/pending guards, progressive short-form validation and cached configuration with Retry protect work. Creation navigates after successful dialog close. | `TrialFormDialog.tsx`, `TrialProjectsPage.tsx`, `TrialConfigurationPage.tsx` |
| External orders | Quote/cancellation failures appear behind dialogs and persist on reopening; Partner list statuses remain stale. Customer/Partner decision dialogs now protect dirty entries through Close, footer dismissal, Escape and navigation. Pending decisions block editing, dismissal and duplicate submission; failures retain entries for retry, confirmed discard resets the draft, and successful changes refresh lists. | `LabServiceDetailPage.tsx`, `DataAssemblyDetailPage.tsx`, `ReagentOrderDetailPage.tsx` |
| Shipping | Old packet revisions can remain printable after replacement; tube rows are called samples. Packet changes invalidate the cache and opening verifies the current revision before printing. Confirmation distinguishes samples and tubes; errors stay with drafts. | `SampleShippingDetailPage.tsx`, `SampleShippingPacketPage.tsx` |
| Lab handoffs | Receipt/work/execution links lose origin and shipment; failed identity reads look like tube mismatches. Links retain origin through execution and failed reads offer truthful retry. | `LabReceiptAccessionPanel.tsx`, `LabWorkOrderPage.tsx`, `LabExecutionPage.tsx` |
| Retention | Editors use refreshed versions/inherited values, discard edits and remain editable while saving. They now retain reviewed snapshots, protect dirty/pending drafts, preserve errors and retry failed reads. Effective warning validation focuses the responsible field before a request. | `FileManagementPage.tsx`, `OrganizationRetentionPolicyPanel.tsx` |
| Released packages | Errors lack Retry; search lacks Clear; empty later pages claim no records. Recovery now distinguishes all three states. | `ReleasedDeliverablesPage.tsx` |

## Final authored regression additions

These are regression sources, not executed results:

- `frontend/src/features/crm/CrmRecordEditSnapshots.test.tsx` contains **4 cases**: Company field/version retention through refresh and failed save, fresh values on reopening, Contact communication choice/version retention, Company lifecycle name/action/version retention, and ownership selection/version retention. Company reopening is part of the Company edit case.
- `frontend/src/features/data-provisioning/CuratedCatalogDialogs.test.tsx` contains **4 parameterized cases**, covering dataset creation, detail editing, deactivation and exact-version retirement. Each covers declined discard, pending controls/dismissal, retained failed entries, cleared error state on reopening, and the applicable reviewed version after background refresh.
- `frontend/src/features/orders/ExternalOrderDecisionDialogs.test.tsx` contains **10 parameterized cases**: two cases each for Customer Lab cancellation, Partner Assembly cancellation, Partner Reagent cancellation, Customer Lab quote acceptance and Partner Assembly quote acceptance. They cover dirty Close/footer/Escape/navigation and before-unload guards; confirmed-discard reset; pending duplicate-submit/edit/dismissal protection; and failed-draft retention followed by a successful mocked retry.

The catalog cases cover the four named actions, not all provisioning dialogs. The external cases use synthetic component fixtures; they do not establish populated tenant, purchase-order, financial, shipping or laboratory acceptance. Existing authorization, schemas and scientific/commercial rules remain unchanged.

## Verification boundary

Run appropriate static checks and direct browser observations at the completion checkpoint. Unit/integration/E2E suites remain deferred under the repository's instruction unless explicitly requested. Source inspection and local browser observations do not establish populated production, external-role, financial or physical laboratory acceptance.

The final TypeScript, repository-wide ESLint, frontend production build, documentation corpus check and whitespace check passed. The backend Release solution build passed with zero warnings and errors. The default Debug build was blocked by DLLs held by the existing Visual Studio/IIS Express development server; the Release build avoided those files without interrupting that server. No unit/integration/E2E suites were run.

Direct browser observations confirmed shared Cancel, opener focus, normal Tab validation, Save validation/first-error focus, Enter and Escape dismissal and a measured 390 × 844 layout with one dialog-body scroll region and no horizontal overflow. Dashboard Lab and Data provisioning Catalog selections survived reload through their URL state. The catalog dirty-draft confirmation appeared; the browser connection stalled before the declined-confirmation outcome could be verified. It recovered after closing the unsaved review tab. These observations used synthetic input and read-only local data; no orders, payments, invitations, merges or laboratory records were submitted.

Fourteen affected audience guides were updated. The regenerated search corpus contains 55 guides, fingerprint `d03727c3263581446ab75c3189da1653e28c56ccb0e1694e4a3f8853afd0075e`. `docs/Phaeno-POMS-Order-to-Cash-Guide.docx` retains 25 pages and 10 screenshots; every rendered page was visually reviewed. SHA-256: `dc49fd2ad26dea177dee072e1728899bbb51a460bb43f74359dab9e094729527`. Temporary document authoring helpers were removed.

## Production release evidence

- Application revision: [`f9e9b3fb65b1a2ea6b3b24e602552b9ce239bbfd`](https://github.com/behaack/phaeno-ops-mgmt-system/commit/f9e9b3fb65b1a2ea6b3b24e602552b9ce239bbfd), committed and pushed to `codex/portal-documentation-search-release`.
- API: [Deploy Portal Green run 34165666685](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/34165666685) succeeded at 22:12 UTC on September 7, 2026. Image `phaeno-portal-green-api:sha-f9e9b3fb65b1-run-34165666685-1`; image digest `sha256:ffb1e50308edebee4171c0fcfef59387a0e38e89ed69185f4b953622470b0b90`. The deployment verified the running image and revision label, container health and smoke checks. Both migration and identity-cutover inputs were false; website row counts remained `12,4`.
- Frontend: [deployment `dpl_HWq8ybfWcrLibeW9n4Sd71LDhMr7`](https://vercel.com/cadexgenomics/phaeno-ops-mgmt-system/HWq8ybfWcrLibeW9n4Sd71LDhMr7), Ready, built with **Production** settings from the same application revision; assigned to [portal.phaenobiotech.com](https://portal.phaenobiotech.com) at 22:11 UTC. This was a production rebuild of preview `dpl_3GdLFq74SWojKMwp8UpTYwKimVX1`.
- Live probes at 22:12:59 UTC: Portal HTML 200; API health 200 with `healthy`; database ping 204; anonymous protected session 401. The production sign-in screen rendered and its observed browser error log was empty. Deployment runtime rows showed production-domain GET `/` responses of 200 and no 5xx in the observed window. Automated deployment-host requests to unconfigured `/__clerk/v1/client` and `/__clerk/v1/environment` routes returned 404, as in the prior release; there is no same-origin Clerk proxy configured in this application.
- The temporary isolated dialog-review server was stopped, the unsaved synthetic catalog draft was closed, and document authoring helpers were removed. No temporary repair implementation was reintroduced. The unrelated local search-index binary was excluded from both commits.

Remaining acceptance limits: the production browser has no signed-in Portal session. Populated authenticated Customer/Partner/Phaeno journeys, actual payments, quote decisions, merges, physical sample/bench work and the new unit/integration/E2E regression suites remain unverified. These limits do not change the recorded build, local interaction and deployment evidence.
