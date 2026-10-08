# Portal / POMS consistency and consolidation review

Review date: September 7, 2026. Status: implementation of all 20 items authorized by the Product Owner on September 7, 2026. See [implementation tracker](PORTAL-POMS-CONSISTENCY-IMPLEMENTATION-PLAN.md).

The findings below describe the pre-implementation review snapshot. Current implementation and verification outcomes are recorded in the tracker above.

## Conclusion

The Order staging / Intake overlap is part of a broader pattern. Some newer screens coexist with older operational controls. Other consolidations removed the only user interface for an action that the backend still requires. Several successful-looking saves also fail to preserve everything the form collected.

Prioritize complete, resumable workflows before further menu removal. The target is one owning workspace per record and action, with contextual shortcuts that open that same workflow.

## Scope and evidence

This was an application-wide source and workflow review of the current local checkout, including the earlier Trial and Intake changes. The route inventory contains 64 route files. Reviewed areas include POMS dashboard/navigation, CRM and access administration, Order Ops and configuration, Customer lab orders, Partner kit and Assembly orders, Trials, Lab Ops, shipping, data provisioning/library, release/retention, Finance, and audience help. Frontend entry points were traced to backend behavior and relevant plans where findings depended on workflow rules.

A separate signed-in local browser tab verified the Order Ops sections, Finance layout, Order configuration sections/fields, dashboard mock content, and administration/resource navigation. Other findings are source-confirmed, not populated end-to-end browser reproductions. No business records, configuration, permissions, messages, deployments, or application source were changed during this audit. No test suites ran. Only this review document was created. Production deployment, external-role sessions, physical laboratory/shipping behavior, payment processing, real downloads, and live failure/retry journeys were not validated. The separate public Website was outside scope.

High priority means a missing step, lost entered information, wrong recorded intent, or competing authority for an operation. Medium priority covers clarity, discovery, compatibility, and interaction consistency. Recommendations describe proposed behavior, not shipped changes.

## Fix workflow continuity first

### 1. High — Required Catalog and Sample shipping configuration screens are unreachable

The configuration sidebar offers Defaults, Analyses, PSeq kits, Assembly, and Legacy links. Catalog and Sample shipping editors exist but are not mounted anywhere in the application. The help explicitly directs staff to both. The page instead prominently offers Sync QuickBooks catalog while the guide says that integration is deferred.

**Consequence:** A readiness message can tell staff to activate a PSeq offering or shipping setup without a reachable editor for the required configuration. This is a missing workflow, not merely a label problem. Confirmed in the signed-in local configuration page.

**Recommendation:** One configuration workspace with reachable Service catalog, Shipping setup, scientific definitions, defaults, and retention links. Put deferred connector actions in an explicitly separate recovery area. Readiness items should link to the exact owning setup section.

Evidence: [configuration sections](D:/__dev/phaeno-portal/frontend/src/features/orders/configuration/OrderConfigurationPage.tsx:25), [rendered panels](D:/__dev/phaeno-portal/frontend/src/features/orders/configuration/OrderConfigurationPage.tsx:113), [Catalog editor](D:/__dev/phaeno-portal/frontend/src/features/orders/configuration/CatalogConfigurationPanel.tsx:79), [shipping editor](D:/__dev/phaeno-portal/frontend/src/features/orders/configuration/SampleShippingConfigurationPanel.tsx:145), [guide](D:/__dev/phaeno-portal/frontend/src/content/docs/phaeno/configuration-and-recovery.mdx:7).

### 2. High — The paid Customer job lacks its required sample-list and shared-shipping handoff

The active Customer job detail offers per-sample Record shipment, but does not expose the required sample-roster finalization or link to the shared shipment workflow. The backend creates shared shipping and Lab authorization at roster finalization. Per-sample carrier/tracking entry changes a LabSample; packet/tube confirmation and shipment status belong to a separate SampleShipment. The Customer's main navigation also hides the shared shipping list.

**Consequence:** The prescribed accept quote → enter/finalize exact samples → ship → Lab flow is not connected in its owning Customer screen. Two separate records can represent shipping information.

**Recommendation:** Job → Samples and shipping owns roster entry/finalization and links directly to its return kit, tubes, packet, and shipment. Record shipment once and project the information onto individual samples. Preserve separate explicit confirmation of identity, custody, and receipt.

Evidence: [active job route](D:/__dev/phaeno-portal/frontend/src/routes/lab-services.$orderId.tsx:3), [job sample controls](D:/__dev/phaeno-portal/frontend/src/features/orders/LabServiceDetailPage.tsx:83), [roster finalization](D:/__dev/phaeno-portal/backend/app/Features/OrderManagement/Controllers/LabServiceOrdersController.cs:537), [per-sample shipping](D:/__dev/phaeno-portal/backend/app/Features/OrderManagement/Controllers/LabServiceOrdersController.cs:631), [shared shipment](D:/__dev/phaeno-portal/frontend/src/features/sample-shipping/SampleShippingDetailPage.tsx:43).

### 3. High — Reagent Save draft loses purchase and delivery information

The form requires a purchase order and shipping address even to save a draft. Its draft save sends only reagent lines, then navigates away before transmitting the purchase order, selected address, requested date, or instructions.

**Consequence:** Enter those fields → Save draft → reopen: a successful save has discarded part of the entered order.

**Recommendation:** One persistent kit-order draft that retains every entered value. Enforce placement-specific requirements at Place order. Save draft should allow an incomplete order while validating any values supplied.

Evidence: [form validation](D:/__dev/phaeno-portal/frontend/src/features/orders/ReagentOrderCreatePage.tsx:19), [save versus place](D:/__dev/phaeno-portal/frontend/src/features/orders/ReagentOrderCreatePage.tsx:58), [draft backend](D:/__dev/phaeno-portal/backend/app/Features/OrderManagement/Controllers/ReagentOrdersController.cs:108).

### 4. High — Company People lost essential external-user administration

Company People invitations hard-code ordinary member privileges. The former full user-management tab is deliberately hidden in the embedded Company view. Current People actions do not include administrator designation, membership deactivation, or invitation resend/revoke. Phaeno's User management opens internal staff in the usual Phaeno context.

**Consequence:** The normal Company workflow cannot designate the Customer's first Organization administrator, even though an active administrator is required later. User recovery and offboarding actions are also absent from that workspace.

**Recommendation:** Company → People owns the complete external-person lifecycle: contact association, invitation, resend/revoke, access and department roles, and deactivation. Reuse existing editors; preserve backend role boundaries.

Evidence: [member-only invitation](D:/__dev/phaeno-portal/frontend/src/features/crm/CrmCompanyPeople.tsx:115), [available actions](D:/__dev/phaeno-portal/frontend/src/features/crm/CrmCompanyPeople.tsx:291), [hidden administration](D:/__dev/phaeno-portal/frontend/src/features/crm/CrmCompanyDetailPage.tsx:387), [user route scope](D:/__dev/phaeno-portal/frontend/src/routes/phaeno-users.tsx:27).

### 5. High — Approved Company requests disappear before completion

The live Requests queue retains pending requests and approved requests without an organization. Ordinary approved service, relationship, and offboarding requests still need a separate completion action. That call remains in an unmounted legacy organization list.

**Consequence:** Approved work attached to an existing organization falls out of the actionable queue before staff can finish it. The help still instructs staff to select Complete request. Automatic application in the Customer-order handoff covers only that particular workflow.

**Recommendation:** One Requests queue with Needs decision, Approved / needs work, and Completed/history views. Each approved item links to its owning fulfillment action and retains an explicit completion record.

Evidence: [live queue filter](D:/__dev/phaeno-portal/frontend/src/features/crm/CrmPortalAccessPage.tsx:90), [approval](D:/__dev/phaeno-portal/backend/app/Features/RelationshipManagement/Controllers/RelationshipManagementController.cs:275), [separate completion](D:/__dev/phaeno-portal/backend/app/Features/RelationshipManagement/Controllers/RelationshipManagementController.cs:321), [legacy completion caller](D:/__dev/phaeno-portal/frontend/src/features/organizations/OrganizationListPage.tsx:91).

### 6. High — A relationship request can record the current relationship instead of the requested one

The Company request form asks for Prospect, Customer, or Partner and sends that choice. When the Company already has an access organization, the backend chooses the existing organization's kind first. The older conversion controls are also hidden in the embedded Company workspace.

**Consequence:** A requested Prospect → Customer change can retain Prospect as the requested outcome or fail service validation against that existing relationship.

**Recommendation:** An explicit Company Change relationship action showing current and requested relationship, preserving the selected target through review and execution. Keep sales engagement stage separate from operational relationship/access.

Evidence: [relationship selector](D:/__dev/phaeno-portal/frontend/src/features/crm/CrmCompanyRelationships.tsx:660), [backend precedence](D:/__dev/phaeno-portal/backend/app/Features/Crm/Controllers/CrmHandoffsController.cs:94), [hidden conversion](D:/__dev/phaeno-portal/frontend/src/features/organizations/OrganizationDetailPage.tsx:155).

### 7. High — Assembly corrections and Partner retries are not resumable

Assembly editing carries all existing inputs into the next manifest but offers no remove/replace action for persisted files. A backend removal endpoint exists. A wrong or failed-scan active input can therefore block resubmission. Separately, new Assembly creation runs create → uploads → submit inside one attempt; Reagent creation runs create → place. If a later stage fails, retry creates again with a fresh operation key.

**Consequence:** Correction can remain blocked; a failed upload or placement can leave saved drafts behind while the screen reports failure. Retrying can create extra drafts rather than continue the original one. Failure timing was not reproduced live.

**Recommendation:** Persist and open the canonical draft first. Assembly Inputs shows all files, scan results, remove/replace actions, and prior revisions. Resume uploads/submission/placement against the same draft and distinguish saved draft from unsuccessful final submission.

Evidence: [Assembly sequence](D:/__dev/phaeno-portal/frontend/src/features/orders/DataAssemblyCreatePage.tsx:63), [manifest composition](D:/__dev/phaeno-portal/frontend/src/features/orders/DataAssemblyCreatePage.tsx:69), [backend removal](D:/__dev/phaeno-portal/backend/app/Features/OrderManagement/Controllers/DataAssemblyRequestsController.cs:185), [active-file checks](D:/__dev/phaeno-portal/backend/app/Features/OrderManagement/Controllers/DataAssemblyRequestsController.cs:219), [operation keys](D:/__dev/phaeno-portal/frontend/src/api/order-management.ts:1377).

### 8. High — Held PSeq work falls out of the only Intake view

Order detail offers Place on hold and Release hold. Both the Intake backend and frontend active-status filters exclude OnHold, and the screen has no held/all-orders view. The attention collector's staged-order candidates likewise include only quote preparation and issued quotes.

**Consequence:** A held PSeq order leaves the Intake list even though it still needs a commercial decision. Reopening it can require another context or a known detail link. This is a source-confirmed discovery gap, not a claim that the record is deleted or inaccessible through every API.

**Recommendation:** Keep Intake as one workspace with Active, On hold, and All/history views. Preserve search and filters on return from details.

Evidence: [hold actions](D:/__dev/phaeno-portal/frontend/src/features/orders/OrderOperationsPage.tsx:300), [frontend statuses](D:/__dev/phaeno-portal/frontend/src/features/orders/CommercialOrderIntakePanel.tsx:28), [backend statuses](D:/__dev/phaeno-portal/backend/app/Features/OrderManagement/Controllers/PlatformOrdersController.cs:46), [attention candidates](D:/__dev/phaeno-portal/backend/app/Features/OrderManagement/Controllers/OperationalAttentionController.cs:121).

### 9. High — Cash-import confirmation can refer to an earlier preview

The Finance form saves a preview batch but does not clear it when Customer, Source, or CSV content changes. Confirm submits the previously stored batch ID/version, and the backend correctly imports that batch's frozen rows.

**Consequence:** The editable values visible above Confirm can differ from the rows actually imported. This is a frontend review/confirmation mismatch; it was not exercised with real cash records.

**Recommendation:** Use one import flow: select/upload → validate → review immutable preview → confirm. Editing any input invalidates the preview; confirmation identifies Customer, source, count, amount, and the exact file/batch.

Evidence: [preview and confirmation state](D:/__dev/phaeno-portal/frontend/src/features/orders/PSeqOrderToCashPanels.tsx:256), [editable import form](D:/__dev/phaeno-portal/frontend/src/features/orders/PSeqOrderToCashPanels.tsx:268), [confirm frozen rows](D:/__dev/phaeno-portal/backend/app/Features/OrderManagement/Controllers/AccountsReceivableController.cs:284).

## Consolidate competing screens and simplify the work

### 10. High — Order Ops and Lab Ops both execute kit and Assembly work

Both areas expose execution/fulfillment panels and actions on the same records, backed by route aliases on the same controllers. There is already behavioral drift: Order Ops supplies no reagent offering options, while Lab Ops supports substitutions.

**Recommendation:** Commercial review, quotes, amendments, and cancellation decisions stay in Order Ops. Input validation, processing, physical shipping, and operational completion belong in Lab Ops. Keep status visibility and direct cross-links in both, while giving each action one owner. This is the closest remaining equivalent to the removed Order staging duplication.

Evidence: [Order Ops controls](D:/__dev/phaeno-portal/frontend/src/features/orders/OrderOperationsPage.tsx:155), [repeated actions](D:/__dev/phaeno-portal/frontend/src/features/orders/OrderOperationsPage.tsx:307), [Lab controls](D:/__dev/phaeno-portal/frontend/src/features/lab-operations/LabManufacturingPage.tsx:133), [shared kit controller routes](D:/__dev/phaeno-portal/backend/app/Features/OrderManagement/Controllers/PlatformReagentOrdersController.cs:15), [shared Assembly routes](D:/__dev/phaeno-portal/backend/app/Features/OrderManagement/Controllers/PlatformDataAssemblyRequestsController.cs:16).

### 11. High — Data provisioning has a parallel organization-creation workflow

Organization grants offers New organization / Create tenant organization. The endpoint directly creates an Organization and optional data grants without creating or associating a CRM Company.

**Recommendation:** CRM Company requests own relationship/access creation. Data provisioning chooses an existing access scope and assigns data. A contextual shortcut can open the canonical Company workflow and return to the pending grant. Audit existing unassociated organizations before retiring the alternate path.

Evidence: [parallel creation UI](D:/__dev/phaeno-portal/frontend/src/features/data-provisioning/DataProvisioningPage.tsx:662), [creation dialog](D:/__dev/phaeno-portal/frontend/src/features/data-provisioning/DataProvisioningPage.tsx:794), [direct insertion](D:/__dev/phaeno-portal/backend/app/Features/DataProvisioning/Controllers/DataProvisioningAdminController.cs:55).

### 12. Medium — Readiness still has competing meanings and opaque setup

Company administration displays manual Setup readiness, derived PSeq readiness, Internal staging, and Quote and commitment, with all blockers mixed together. Order defaults ask staff for raw configuration JSON. The sample/destination completeness checks establish valid JSON and a value other than the literal empty object; they do not validate a meaningful scientific/delivery configuration. For example, syntactically valid non-object JSON is not excluded by these checks.

**Recommendation:** One derived, department-aware readiness model reused in Company, Intake, and configuration: Can start pricing, Can issue quote, Can invoice. Each blocker names its owner and opens the relevant setting. Replace raw setup JSON with defined operational fields, validating actual completeness. Retire the non-authoritative manual status and obsolete staging terminology.

Evidence: [Company readiness](D:/__dev/phaeno-portal/frontend/src/features/organizations/OrganizationDetailPage.tsx:379), [JSON form](D:/__dev/phaeno-portal/frontend/src/features/orders/configuration/SystemConfigurationPanel.tsx:14), [domain completeness](D:/__dev/phaeno-portal/backend/modules/PSeq.Operations.Commercial/OrderManagement/Domain/OrderConfiguration.cs:431), [JSON validation](D:/__dev/phaeno-portal/backend/modules/PSeq.Operations.Commercial/OrderManagement/Domain/OrderConfiguration.cs:473).

### 13. Medium — Finance is many forms on one page

The signed-in Finance screen stacks Customer billing setup, invoices/adjustments, receipt entry, allocation, reversal, CSV import, and reconciliation. It repeatedly asks for Customer/receipt context and asks users to type an Evidence storage key.

**Recommendation:** One Finance workspace with view-first Customers, Invoices, Receipts, and Reconciliation sections. Open bounded actions from the relevant record. Record receipt → review matching invoices → allocate cash should retain context. Upload/select evidence instead of typing a storage identifier. Keep billing setup separate from daily transaction entry and preserve dual-control approval.

Evidence: [Finance panels](D:/__dev/phaeno-portal/frontend/src/features/orders/PSeqOrderToCashPanels.tsx:215), [stacked forms](D:/__dev/phaeno-portal/frontend/src/features/orders/PSeqOrderToCashPanels.tsx:266). Verified in the signed-in local browser.

### 14. Medium — Results, release, and retention lack one connected package identity

Order Ops Result release presents sample UUIDs and artifact hashes without a direct Customer/job/package workspace. Released packages and receipts live elsewhere. A legacy /data-library?jobId=… branch shows only old result records and mentions a payment gate, so historical links can disagree with the canonical job results. No current internal link to that legacy branch was found.

**Recommendation:** One package detail with Customer, job, sample, scientific decision, release status, files, retention, receipt, and reissue lineage. Different queues open that same detail with role-appropriate actions. Redirect old job-library links to the job results. Keep curated example Data Library separate from Customer-owned job results.

Evidence: [release list](D:/__dev/phaeno-portal/frontend/src/features/orders/PSeqOrderToCashPanels.tsx:193), [receipt workspace](D:/__dev/phaeno-portal/frontend/src/features/file-management/ReleasedDeliverableDetailPage.tsx:52), [legacy job library](D:/__dev/phaeno-portal/frontend/src/features/data-library/DataLibraryPage.tsx:257), [legacy payment text](D:/__dev/phaeno-portal/frontend/src/features/data-library/DataLibraryPage.tsx:363), [current results](D:/__dev/phaeno-portal/frontend/src/features/orders/LabServiceDetailPage.tsx:94).

### 15. Medium — Trial shipping loses context and sends staff to an unavailable page

Trial detail always links Shipping and packets to the external shipping list. Phaeno staff do not receive that page's capability. Prospects reach a global list rather than shipments belonging to the current Trial, and the shipment view lacks a corresponding Back to Trial path.

**Recommendation:** Trial → related shipments, direct shipment links, and Back to Trial. Staff open the appropriate Lab shipping workspace; external users open their authorized shipment. The cross-Trial shipping queue remains a useful separate view.

Evidence: [Trial link](D:/__dev/phaeno-portal/frontend/src/features/trials/TrialDetailPage.tsx:62), [capability assignment](D:/__dev/phaeno-portal/backend/app/Features/Accounts/Endpoints/SessionEndpoints.cs:235), [page access check](D:/__dev/phaeno-portal/frontend/src/features/sample-shipping/SampleShippingPage.tsx:20).

### 16. Medium — Dashboards are not yet reliable starting points for daily work

POMS Order/Lab panels and their sidebar counts use fixed example data even in a connected session. The panel is explicitly marked Mock data, so this is not an undisclosed live-data claim, but it still cannot tell staff what needs attention. The external dashboard omits the parent Trial while promoting shipping/data subtasks.

**Recommendation:** A role-aware home summary drawn from the real owning queues: decisions due, held work, invitations/setup awaiting action, samples due, and results ready. Link directly to each record or filtered queue. Hide example panels in connected sessions. Include actionable Trials for external users.

Evidence: [fixed POMS data](D:/__dev/phaeno-portal/frontend/src/features/dashboard/DashboardPanelSelector.tsx:48), [always-rendered panels](D:/__dev/phaeno-portal/frontend/src/features/dashboard/DashboardPanelSelector.tsx:291), [explicit mock label](D:/__dev/phaeno-portal/frontend/src/features/dashboard/DashboardPanelSelector.tsx:364), [external dashboard](D:/__dev/phaeno-portal/frontend/src/features/dashboard/ExternalDashboardContent.tsx:72). POMS behavior verified in the signed-in local browser.

## Shared interaction and documentation improvements

### 17. Medium — Lists have different limits, search behavior, and return behavior

Contacts, Leads, Opportunities, and Tasks stop at 100 without pagination. Intake searches only its fetched first 100 orders. External Lab/Reagent/Assembly lists have no paging controls despite backend defaults of 25. Several forms keep filters only in component state, lose context on return, or display No orders yet alongside a failed request or an active non-text filter.

**Recommendation:** One list interaction pattern: server search/filtering, total counts and pagination, Clear all, retained search/page/selection context, and distinct loading/error/empty/no-match states. Share behavior and components; do not merge unlike scientific/business records into one list just to standardize them.

Evidence: [CRM Contacts](D:/__dev/phaeno-portal/frontend/src/features/crm/CrmContactsPage.tsx:35), [CRM Leads](D:/__dev/phaeno-portal/frontend/src/features/crm/CrmLeadsPage.tsx:31), [Intake fetch/filter](D:/__dev/phaeno-portal/frontend/src/features/orders/CommercialOrderIntakePanel.tsx:59), [Customer list](D:/__dev/phaeno-portal/frontend/src/features/orders/LabServicesPage.tsx:17), [Partner kit list](D:/__dev/phaeno-portal/frontend/src/features/orders/ReagentOrdersPage.tsx:23), [Assembly list](D:/__dev/phaeno-portal/frontend/src/features/orders/DataAssemblyPage.tsx:23).

### 18. Medium — Common tasks require avoidable departures and re-entry

Company People only associates an existing Contact; Company Sales lacks a create-opportunity action. Staff must leave the Company to create those records. In Lab receiving, packet/tube context is checked in one screen, then requested again in accession. Some Lab action dialogs ask for raw user IDs, release-definition keys/versions, and QC JSON.

**Recommendation:** Add person and New opportunity from Company should open the shared editors with Company context filled in. Receiving should carry identified shipment/tube context into explicit receipt/accession confirmation. Lab actions should select eligible known records and collect structured scientific evidence, preserving pinned versions and separate approvals.

Evidence: [existing-contact-only dialog](D:/__dev/phaeno-portal/frontend/src/features/crm/CrmCompanyPeople.tsx:462), [Company Sales](D:/__dev/phaeno-portal/frontend/src/features/crm/CrmCompanySales.tsx:15), [receiving handoff](D:/__dev/phaeno-portal/frontend/src/features/lab-operations/LabReceiptAccessionPanel.tsx:123), [generic Lab action form](D:/__dev/phaeno-portal/frontend/src/features/lab-operations/LabWorkOrderPage.tsx:164).

### 19. Medium — The nested-scroll pattern persists outside Trials

Reagent Add address, reagent configuration, shipping-configuration editors, and generic Lab action forms impose capped scrolling within the shared dialog's own scroll body. These are structural matches to the Trial problem; each viewport manifestation still needs browser reproduction. Required-field legends, field errors, and unsaved-draft handling also vary in older forms.

**Recommendation:** One scroll owner per modal body, shared field/required/error conventions, and consistent draft protection/focus restoration. Preserve separate scrolling for long option lists and genuine data tables.

Evidence: [Reagent address modal](D:/__dev/phaeno-portal/frontend/src/features/orders/ReagentOrderCreatePage.tsx:91), [reagent configuration](D:/__dev/phaeno-portal/frontend/src/features/orders/configuration/ReagentConfigurationPanel.tsx:55), [shipping editor](D:/__dev/phaeno-portal/frontend/src/features/orders/configuration/SampleShippingConfigurationPanel.tsx:288), [Lab dialog](D:/__dev/phaeno-portal/frontend/src/features/lab-operations/LabWorkOrderPage.tsx:164), [shared scroll body](D:/__dev/phaeno-portal/frontend/src/components/ui/dialog.tsx:142).

### 20. Medium — Help and labels describe conflicting workflows

Examples include unreachable Catalog/Sample shipping and Complete request instructions; retired HubSpot simulator/Accounts text in the Order guide; organization-admin-only guidance where department administrators can operate paid orders; Trial shipping help saying one tube per sample despite multi-tube support; and a shipping-list fallback labeling paid shipments Customer promotional order. Project, Query demo, and Support and policy links coming soon also remain in the connected application.

**Recommendation:** Maintain one audience-specific workflow/role vocabulary. Update every affected guide with each repaired journey; keep proposed/deferred behavior out of current help. Preserve Trial organization-admin approval rules, which legitimately differ from department-scoped paid work. Move development pages out of normal user navigation and replace placeholder support copy.

Evidence: [retired handoff guide](D:/__dev/phaeno-portal/frontend/src/content/docs/phaeno/order-operations.mdx:16), [Customer role wording](D:/__dev/phaeno-portal/frontend/src/content/docs/en-US/customer/lab-services.mdx:22), [actual paid-order authority](D:/__dev/phaeno-portal/backend/app/Features/OrderManagement/Services/OrderRequestContext.cs:66), [Trial shipping help](D:/__dev/phaeno-portal/frontend/src/content/docs/en-US/prospect/sample-shipping.mdx:17), [shipment type label](D:/__dev/phaeno-portal/frontend/src/features/sample-shipping/SampleShippingPage.tsx:46), [resource navigation](D:/__dev/phaeno-portal/frontend/src/components/navigation.ts:183).

## Recommended screen ownership

| User task | Owning workspace | Other screens should do |
| --- | --- | --- |
| Create/manage Company, relationship, access, people | CRM Company | Open the same Company action with context; do not create another tenant independently |
| Review and complete Company requests | CRM Requests, with Company history | Link to the same request and fulfillment task |
| Create paid work, price, quote, commercial decisions | Order Intake and order detail | Show commercial status and link back |
| Manage no-charge scope and acceptance | Trial detail | Show Trial status and link back; preserve separate business rules |
| Exact samples, return kit, tubes, packet, shipment | Samples and shipping within Job/Trial, shared shipment detail | Reuse the same shipment identity and status |
| Receipt, execution, QC, physical fulfillment | Lab Ops work detail | Show progress and Open Lab work |
| Scientific release and retention history | Connected result-package detail | Filter queues by role and lifecycle stage; preserve independent decision authority |
| Billing profile, invoices, cash, reconciliation | Finance, with focused record views/actions | Show read-only financial context and open the relevant Finance record |
| Catalog, shipping setup, defaults, retention policy | Configuration | Link directly from actionable readiness messages |
| Day-to-day priorities | Role-aware dashboard | Summarize real queues and deep-link to the owning task |

Do not consolidate Contact with User identity, scientific approval with release, Trial with paid orders, curated datasets with Customer-owned results, or scan comparison with receipt/accession. Contextual create buttons and dashboard links are useful when they open the same underlying workflow.

## Recommended delivery sequence and acceptance

1. **Repair lost information and blocked journeys:** findings 1–9. Prove save/reopen retains every field; failed later steps resume the same record; first administrator can be designated; approved requests remain actionable; selected relationship survives review; quote acceptance reaches exact samples/shipping; held work remains discoverable; import confirmation matches its preview.
2. **Consolidate operation ownership:** findings 10–16. Remove competing mutation controls only after their replacement preserves all existing capabilities. Identify/reconcile pre-existing organizations and historical links before retiring paths. Use the same Customer/job/sample/package identity across handoffs.
3. **Standardize daily use:** findings 17–20 and contextual improvements in 18. Verify lists above their former limits, return-state preservation, filtered/error states, role-appropriate entry points, keyboard focus/Escape, mobile dialog scrolling, and audience help.

Before implementation, turn each group into a bounded approved scope with acceptance examples. Avoid a single wholesale UI rewrite: the evidence shows that removing a screen without tracing every dependent action has already stranded important workflows.
