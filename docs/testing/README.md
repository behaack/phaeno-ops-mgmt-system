# Major workflow testing scripts

Prepared September 8, 2026 from the current repository. These are **manual acceptance scripts**, not executable automation. All cases start **Not run**. Writing this pack does not establish acceptance or authorize production transactions.

## Start a test run

1. Copy [RUN-RECORD.md](RUN-RECORD.md) for the run. Record Portal/API/Website addresses and exact revisions, date, browser, tester, and environment. Test matching API/UI versions.
2. Use an isolated acceptance environment and dedicated test identities. Have its administrator prepare the prerequisites in [TEST-DATA.md](TEST-DATA.md). Use separate browser profiles for separate people; POMS does not provide an act-as control or a general external organization switcher.
3. Follow the connected journey recipes and each module's prerequisites. Preserve the linked record IDs when handing work between roles. A pre-staged record can replace an upstream case only when its state, lineage, and setup evidence are recorded.
4. For each step record the actual result and evidence. Run negative variants on separate copies so they do not corrupt the main journey. Refresh or reopen committed records to establish persistence.
5. Use **Pass**, **Fail**, **Blocked**, **Not run**, or **Not applicable**. A case passes only when every required step and variant passes. Missing roles, configuration, fixtures, physical evidence, or a disabled prerequisite produce Blocked, with an owner and next action. Not applicable needs an agreed scope reason.
6. Keep credentials, invitation links, MFA codes, personal information, scientific file contents, and real payment details out of the run record. Use redacted screenshots and safe record references.

Expected controls reflect the current code and audience guides. If a control or transition is absent, capture the version and state and report the discrepancy; do not substitute an unrelated action to obtain a pass. Engineering assistance is explicitly identified where fault injection, provider inspection, or an independent API check is required.

## Script inventory and order

| Module | Cases | Primary testers | Main outcome |
| --- | --- | --- | --- |
| [01 — Access and Departments](01-access.md) | ACC-01–06 | Platform admin, external admins/members | Invitation, session and scope boundaries |
| [02 — CRM and Company handoffs](02-crm.md) | CRM-01–06 | Commercial user, platform admin | Lead to Company, opportunity and controlled access |
| [03 — Trial lifecycle](03-trials.md) | TRI-01–06 | Trial staff, two approvers, Prospect admin, release manager | Approved evaluation through results and closeout |
| [04 — Lab orders and sample shipping](04-lab-orders.md) | ORD-01–07 | Pricing staff, Customer/Partner admins, shipping staff | Committed scope through exact sample and tube handoff |
| [05 — Partner Kits and included Assembly](05-kits-assembly.md) | KIT-01–06 | Partner admins, Commercial/Lab staff | One purchase, one case per Kit, governed outputs |
| [06 — Laboratory operations](06-laboratory.md) | LAB-01–10, LAB-13–14 | Protocol, operator, supervisor, independent reviewer | Controlled scientific execution and release readiness |
| [07 — Finance](07-finance.md) | FIN-01–06 | Billing, Cash Operator, independent Cash Reconciler | Immutable invoices, cash and independent reconciliation |
| [08 — Files, curated data and retention](08-data-files.md) | DAT-01–06 | File/provisioning admin, external members | Governed publication, access and retained receipts |
| [09 — Website, notifications and help](09-website-help.md) | WEB-01–06 | Visitor, platform admin, each Portal audience | Public intake, recoverable delivery and scoped help |
| [10 — Recovery and cross-system checks](10-recovery.md) | SYS-01–06 | Tester with engineering/operations support | Conflict, outage, access, UI and restore acceptance |
| [11 — Transportation kits and sample shipping](11-transportation-kits.md) | SHP-01–14 | Customer/Department admin, Phaeno fulfillment admin, Lab receiver | Included-cost kit order, dispatch, customer receipt, container packing and split sample intake |

There are 81 cases. Each contains setup, executable human steps, observable expected results, and a cleanup/handoff instruction. They cover the major workflow families, not every field permutation or every existing automated assertion. SHP cases concern transportation supplies; KIT cases concern purchased Partner Kits and their included Assembly work.

For the current HS5Y7DB7 walkthrough, use the [transportation-kit resume instructions](11-transportation-kits.md#resume-the-current-local-walkthrough). The recorded checkpoint has nine finalized samples and 18 tubes. The later [intake correction](runs/2026-09-10-intake-progress-correction.md) and [customer-stage checkpoint](runs/2026-09-10-customer-laboratory-stages.md) supersede that earlier preparation checkpoint: receipt/accession is complete and both corrected Jobs show Received to Customers. Resume with read-only verification; do not repeat kit ordering, receipt, accession or the data correction. New manual cases remain Not run despite earlier automated and screenshot evidence.

### Current laboratory acceptance coverage

LAB-07–10 and LAB-13 cover retirement/invalidation, promotion, source attempts and reserve fallback, tube intake reasons, and exception-first accession with bulk acceptance. LAB-13 also checks the **Library prep** sidebar label, wrapped required markers, tube details, permissions and safe retries. These cases remain Not run until their full acceptance evidence is recorded; local build/read-only checks are narrower. LAB-11 and LAB-12 are not assigned cases.

### Connected journey recipes

- **Library preparation batch to sequencing:** LAB-14 step 1 (Lab configurations → Tray formats) → LAB-01/08 (preparation-enabled protocol versions and independent workflow approval/promotion) → LAB-02/13 (accepted source tubes and reserves on compatible test jobs) → LAB-14 steps 2–18 (partial mixed-job tray, shared evidence/exception, failure and reserve restart in a new batch, output identity, QC reuse and sequencing handoff). Run LAB-14's negative, concurrency, role and accessibility variants as well. Record this as LAB-14 in the run template; no provider dispatch or result release is needed.

- **Customer order to cash:** CRM-01/05 → ACC-01/03 → ORD-01/02 (or manual quote ORD-03) → ORD-04 → SHP-01–03 → SHP-05–13 → LAB-02–06 → FIN-01–05 and DAT-04. ORD-05 provides the shipping overview; run ORD-07 alongside the Lab journey to verify customer stages and mixed sample progress. Run SHP-04/14 and alternate/partial variants on separate fixtures. Run Finance and scientific release independently; an unpaid Customer Lab invoice must not block scientifically authorized results.
- **Transportation kit fulfillment and partial supply:** SHP-02/03 → SHP-05/06 → SHP-07 partial dispatch → SHP-08 partial customer receipt → SHP-09 prepare available containers → SHP-10–13. Finish the remaining kit delivery/receipt and residual packing pool without changing earlier container identities. Record provisional, available and allocated quantities separately.
- **Prospect evaluation to relationship decision:** CRM-01/03/05 → ACC-01 → TRI-01–03 → ORD-05 → LAB-02–06 → TRI-05/06. Exercise replacement/amendment with TRI-04 on a separate Trial.
- **Partner Kit to included output:** CRM-05 and entitlement setup → KIT-01/02 → KIT-04/05 → DAT-04. Run KIT-03/06 on sibling cases. Track the original shipment billing reference throughout.
- **Curated data to governed withdrawal:** DAT-01 → DAT-02 (including external downloads) → DAT-03. Test operational release transfers separately under DAT-04 and policy/deletion only on disposable operational releases under DAT-05/06.
- **Website intake to actual recipient:** WEB-01/02 → WEB-03/04. A saved intake, queued notice, provider acceptance and destination Inbox receipt are separate evidence points.

No short recipe replaces the full pack. For a rapid first pass, use ACC-01, CRM-01, ORD-02, ORD-04, KIT-01, WEB-06 and SYS-05; label it a smoke check, not major-workflow acceptance.

## Gates and current-source discrepancies

- [Operational completion](../plans/PORTAL-OPERATIONAL-COMPLETION-2026-09-08.md) and current implementation supersede the September 7 [feature-readiness inventory](../feature-readiness.md) statements that configured Lab purchases and Kit bundles are unimplemented. This pack tests the implemented paths; the older inventory is not rewritten here.
- The generic Partner Assembly paragraph in [Phaeno billing help](../../frontend/src/content/docs/phaeno/order-billing-payment-release.mdx) describes the historical accounting-source behavior. Included cases follow the current [Partner guide](../../frontend/src/content/docs/en-US/partner/data-assembly.mdx) and `KitBundleService`: they retain the original Kit billing context and create no second sale, quote or invoice. Historical standalone requests retain their historical rules.
- Partner Finance remains a separate scope gate. Test Partner Lab commitment with administrator-prepared, approved billing prerequisites; do not expect a Partner Finance workspace or an automatic Partner custom-work-to-order handoff.
- The Kit expiry/payment lifecycle worker is disabled by default. Scheduled retention processing, enforcement, cleanup, operational attention queues, real offerings, scientific/provider readiness, and coordinated backup activation must each be recorded for the tested environment. A deployed page does not prove an enabled process.
- Real bench work requires the [Lab bench validation plan](../plans/LAB-OPERATIONS-BENCH-VALIDATION.md). Browser simulation cannot validate tube fit, labels, scanning hardware, packaging, scientific thresholds, or provider receipt.
- Current Customer transportation-kit ordering includes kits/outbound delivery, frozen Department delivery locations, Phaeno administrator notifications and receipt-gated Job-specific supply. Cross-Job inventory, warehouse reservations, corrections and automatic replenishment remain planned in the [shipping plan](../plans/SAMPLE-SHIPPING-AND-INTAKE-PLAN.md). Do not mark these as implemented or substitute legacy direct kit dispatch for the new request/receipt path.
- POMS tracks NGS custody and final-package lineage; it does not implement raw NGS ingestion, upstream pipeline orchestration, or intermediate scientific storage. HubSpot, connected CRM email/calendar capture, and promotional freebie parent issuance are outside the implemented acceptance scope.

## Completion and evidence

All required cases must pass on the chosen release, or have an explicit acceptance decision for each remaining failure/blocker. No unresolved cross-tenant exposure, unauthorized approval, duplicate commercial charge, corrupted lineage, false transfer completion, or bypassed scientific gate can be treated as a successful journey. Record expected versus actual behavior even when a case finds a defect; testing is allowed to fail.

Use separate evidence labels: **connected application**, **intercepted/synthetic browser**, **API/database**, **provider**, **destination receipt**, **physical bench**, and **restore drill**. Do not combine historical test totals with this run. Retesting a failure updates its case result and retains earlier evidence.

After the run, close or cancel only dedicated test drafts/work through supported actions, end test entitlements or revoke test access as appropriate, and retain audit/financial/scientific history. Do not delete immutable records or change shared flags as cleanup. Environment owners restore isolated fixture/configuration changes and verify no queued test mail remains.

## Existing automation

This pack complements [E2E](../plans/E2E-TEST-PLAN.md), [frontend](../plans/FRONTEND-TEST-PLAN.md), and [backend](../plans/BACKEND-TEST-PLAN.md) plans; it does not change or run their suites. Module source notes identify useful automation for engineering follow-up. Playwright currently uses deterministic sessions and API fixtures, so a browser-suite pass alone is not live sign-in, persistence, payment, or physical acceptance.
