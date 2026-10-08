# Portal operational and commercial completion

## Authorization and product outcome

On September 7 Pacific, after the deployed completion release, the Product Owner explicitly requested completion of the remaining signed-in acceptance, coordinated file/database backups, scientific/physical validation, configured Lab Service and Partner Kit bundles. This plan executes the approved product rules in `ORDER-MANAGEMENT-PLAN.md`; it does not invent scientific configuration or claim physical acceptance from software tests.

Customer and Partner administrators need to know the complete standard price before commitment. Lab and Commercial staff need one authoritative sale with separately tracked execution. Partners need exactly one included Assembly case per purchased Kit, without another quote or invoice. Operations needs recoverable, coordinated database/file snapshots. Success means the accepted quantities, prices, ownership, lineage and release/payment boundaries survive partial work, retry, correction and recovery.

## Implementation boundaries

1. **Configured Lab Service:** versioned offerings reference existing POMS catalog prices and reviewed scientific configuration. Eligible Customers and Partners prepare the Job pricing profile, review per-specimen bundle price and turnaround, and commit atomically with idempotency. Existing manual and sales-assisted histories remain unchanged. The new standard commitment is organization-administrator-only; existing Department-administrator permissions on historical/manual work remain unchanged. Individual samples follow acceptance. Original and current specimen timing, reasoned overrides, later-date customer-safe notices and limited CRM schedule projections preserve the promised offering window.
2. **Partner Kit:** existing negotiated offerings gain an explicit included Assembly profile. Newly created Kit orders require whole Kit quantities and valid profile bindings. Placement freezes price/profile/expiry rules and creates one original unit plus one included case for each purchased unit in the same transaction. Historical reagent and standalone Assembly records remain operable without inferred links. New standalone Assembly purchase is replaced by case-scoped preparation.
3. **Kit execution:** ordinary shipment allocations assign the purchased units and preserve the existing shipment accounting source. Each case has its own deadline: labeled expiry plus 90 days, otherwise shipment plus 12 months. Unsubmitted cases expire; staff can extend with a reason. Replacement creates an audited replacement unit and transfers the same case, preserving purchase/billing lineage and all input revisions. No additional entitlement, sale or invoice is generated. Physical fulfillment leaves the summary at Kit fulfilled / assembly pending until every included case has results released, expired unused or been formally cancelled.
4. **Included Assembly:** reuse current managed uploads, immutable input revisions, scientific intake, processing, output review and governed release. The purchased profile is frozen. Successful intake queues included work without a second quote. Payment/credit checks reference the original Kit shipment billing context; output approval creates no second accounting source. Every read/write/download remains scoped to the purchasing Partner and Department. Internal notes never enter tenant history.
5. **Backup and recovery:** use the existing protected encryption envelope and deployment lock. A bounded maintenance window stops only Portal API writers for a coherent database/Local-file snapshot; a watchdog restarts the exact API on failure. Resume before expensive restoration/encryption checks. Verify restored metadata, owned file references, checksums and clean cleanup in isolated resources. Protect plaintext and retain only encrypted recovery artifacts. Daily scheduling must actually run independently of a non-default Git branch; record off-server replication separately from host-local copies.
6. **Acceptance and documentation:** exercise populated local/reference journeys and signed-in UI fixtures with all unintended external traffic blocked; distinguish those from Clerk/production acceptance. Update affected audience guides, living test plans and illustrated Word guide. Actual upstream scientific identity and physical Lab/operator evidence remain requested Product Owner inputs.

## Persistence and rollout

Root integrates one reviewed additive migration and full ERD after both commercial models settle. Existing rows retain legacy modes and receive no invented Kit links or offering commitments. New application behavior ships with no invented active production offering. The already-authorized commit/push/deployment work continues; any new shared migration is presented with exact reviewed SQL and recovery evidence before application as required by repository policy. No retention processing, enforcement or deletion activation is inferred.

Backend Lab/TAT, frontend workflows/docs and backup tooling proceed independently; root owns Kit backend, integration, migration, release and evidence. Existing unrelated Website edits remain outside this scope.

## Acceptance checkpoints

- Complete configured price/scope/turnaround before acceptance; zero sample rows before commitment; exact roster and tenant-safe Lab/Finance continuity afterward.
- Concurrent or repeated placement creates one sale and the exact number of entitlements; role, quantity, inactive configuration and scientific incompatibility failures preserve drafts.
- Multi-unit and partial-shipment cases have independent submission, correction, expiry, replacement and completion; billing occurs once per shipped purchased unit, never again for included Assembly.
- Wrong tenant/Department, expired entitlement, wrong profile, rejected scan and historical-record mutation attempts are denied by the backend.
- Backups restore matching database/file content and recover the API under failure; real scheduling and off-server retention are verified independently.
- UI supports keyboard, narrow layouts, clear fixed-footer modals, draft/conflict recovery and preserved parent context. Documentation describes shipped behavior and remaining real-world acceptance honestly.

## Status

Implementation is deployed; the activation and acceptance gates below remain open. Migration `20260908015114_AddConfiguredLabAndPartnerKitBundles` adds 21 columns and six tables without drops. Existing Lab orders default to `ManualQuote`; existing reagent orders default to `IsKitBundle=false`. After local verification and ERD regeneration, the Product Owner authorized the production migration and matching API/UI deployment. The production release evidence below records completion.

Partner Lab Service access was explicitly approved by the Product Owner. Automatic approval review separately rejected the proposed Partner Finance expansion and always-on Kit expiry/payment-release worker; exact authorization questions remain pending. The Kit worker has been prepared as a separately configurable, **disabled-by-default** service (`KitCaseLifecycle:Enabled=false` when omitted). No production activation is inferred. Scientific upstream/physical validation contacts remain requested; production sign-in is a separate acceptance checkpoint.

### Engineering decisions and review findings

- Kit orders support whole purchased units and at most 1,000 units per standard purchase. Nonstandard quantities route to a custom-work request. Draft lines retain offering/profile versions and the complete profile; PostgreSQL JSON canonicalization is compared structurally. Scope or price changes require review before placement.
- The custom-work request creates a first-party CRM Opportunity and immutable original-request activity with Company, Department and requester provenance. It does not create a pending operational handoff before the existing Won/approved handoff gate.
- Configured Lab commitment requires complete Finance-approved billing/tax so its final total is known. The manual quote path retains its existing explicitly pre-tax option. This does not make Lab scientific result release dependent on payment.
- Partner included Assembly retains the original Kit shipment invoice and current Assembly-credit decision. Its scientific output approval creates no second quote, invoice or sale; replacement preserves original billing and immutable input-unit lineage.
- Database acceptance exposed explicit child-insertion requirements for accepted quotes, refreshed reagent draft lines, shipment records and new case history. These are corrected at the owning persistence boundary rather than weakening concurrency.
- Retry admission is checked against selected organization and Department before returning prior results. Removing access or changing the selected scope cannot reveal a previous tenant response.
- Full production activation remains distinct from local PostgreSQL, intercepted browser, backup-helper and Word presentation evidence. The backup schedule must be present on the repository default branch for automatic off-server collection; a feature-branch dispatch alone does not close that gate.

## Current implementation inventory

| Area | Delivered source and behavior | Remaining activation or acceptance |
|---|---|---|
| Configured Lab purchase | Versioned scientific scope, canonical per-specimen price, final tax/total review, stale-review detection, organization-admin commitment, exact roster handoff and one durable CRM sale summary. Inactive and future versions preserve current offering availability. | Reviewed real production offering; Partner billing setup depends on separately authorized Finance access. |
| Partner Lab access | Real session, tenant and Department checks admit an entitled Partner or its own historical Lab Jobs; results and shipping keep those boundaries. Invoice capability remains explicitly false for Partners. | Partner Finance scope decision. Staff-created sales-assisted intake still lists Customers only; a custom-work Opportunity does not promise automatic Partner order conversion. |
| Lab timing | Published acceptance-based range, original/current/actual dates, controlled overrides, safe delay notices and history; application-owned history preserves the Laboratory module boundary. | Real scientific acceptance and upstream output evidence. |
| Purchased Kits | Whole-unit purchase review and frozen included profile, one physical unit/case per unit, split shipment billing/deadlines, audited replacements, original billing and immutable submitted-input lineage. | Approved effective Partner offerings and populated production journey. |
| Included Assembly | Same-case preparation and upload retry, frozen scope, direct accepted intake, no second quote/invoice, original Kit balance/credit gate, operational holds and pending cancellation honored, parent completion derived from all cases. | Automatic expiry/payment worker remains disabled pending explicit decision. |
| Custom work and CRM recovery | Service-specific Customer/Partner request admission creates a scoped Opportunity with immutable original context; no premature executable handoff. Failed sale summaries have a platform-only Attention queue and retry. | Real Sales qualification and any later agreed handoff. |
| Coordinated recovery | Matching database/private files, bounded writer pause with recovery watchdog, isolated metadata/checksum restore, encrypted off-server artifacts, receipt-guarded retention and daily host timer tooling. | First production backup/export/timer activation and workflow on default branch for scheduled off-server collection. |
| Documentation | 56 audience guides; separate Partner Lab help; illustrated Word guide has 32 pages, 17 screenshots and three tables, including six new bundle/timing illustrations. | Publish with the matching API/UI release; final scientific and physical procedures need owner/operator acceptance. |

### Verification and release preparation

The production frontend build passes. The full frontend checkpoint had 332/333 passing tests; its sole obsolete audience assertion was corrected and all four documentation-registry checks then passed. The subsequent invoice-capability/legacy-dialog checkpoint passed 12/12. Ten populated intercepted browser journeys passed on desktop/mobile, with accessibility, overflow, error and request checks. These are synthetic browser records, not Clerk or production business submissions.

The Release backend build passes without warnings; EF reports no pending model changes. Full non-PostgreSQL execution had 415 passes, one strict module-boundary failure and 138 skipped database/platform cases. The boundary was corrected by keeping timing history application-owned; the final model/session/domain checkpoint passed 26/26. The integrated PostgreSQL checkpoint passed 83/88; the Kit-only custom-work admission was corrected and final Kit/custom-work verification passed 22/22, including operational-hold/cancellation protection. All 12 retention cases then passed on a separate loopback PostgreSQL 18 cluster with commit tracking enabled, resolving the four prerequisite failures. The temporary cluster was stopped and removed; no normal development-server setting was changed. Counts overlap across checkpoints and must not be added as unique tests.

Backup helpers passed 26 focused checks and an isolated populated file/metadata restore. Independent review found and corrected the Kit automatic-release hold bypass. No new temporary data-repair endpoint or production fixture is introduced.

Reviewed migration `20260908015114_AddConfiguredLabAndPartnerKitBundles` is additive: 21 columns, six tables, 43 indexes (nine unique), and 37 restrictive foreign keys. Eighteen columns are nullable; the other defaults preserve historical false/false/ManualQuote semantics. The idempotent SQL has no drops, business-row updates or explicit historical backfill, and only inserts its migration-history row. SQL evidence: `artifacts/portal-operational-completion-20260908/bundle-migration.sql`, SHA-256 `E93B6E9E45A5F162D6063C48666D091383713021AFD165E0E7C33F96E37A2FEF`. It was generated and reviewed without production execution.

The final Word guide was rendered with installed Word and Poppler after diagnosing unavailable LibreOffice in the packaged renderer. All 32 pages were visually reviewed; narrow screenshot recaptures and restored table formatting resolved legibility and pagination issues. Its 17 screenshots and three tables have corrected sequential captions and page references. Final DOCX SHA-256: `8C06C17D7A31995FEA5BDCE3BECE765E85F500A4BEC1398CB6B3CEDA21106A11`. Portal documentation generation/check passes with 56 guides, corpus `28556cf5a105`.

## Production release evidence — 2026-09-08 UTC

Following the explicit migration-approval question, the Product Owner requested
deployment of both Portal API and UI. Both now serve application revision
`00959f5600e065714166232b2f579b3b4b2eff57`, which includes the bundle implementation
from `7d1f7f760996653710bf38bccc060b69e6444bda`.

- API workflow [34185311152](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/34185311152)
  succeeded with migrations enabled, Clerk identity cutover disabled, and storage
  and scanner providers preserved. Its release check verified the image revision.
- Before migration, isolated database restoration and cleanup both passed. The
  encrypted dump and wrapped key for
  `pre-migration-20260908T040112Z-00959f5600e0` passed checksum verification.
  The workflow then applied `20260908015114_AddConfiguredLabAndPartnerKitBundles`.
  This is the deployment database backup; it does not activate coordinated
  file/database scheduling or prove off-server collection.
- UI deployment `dpl_3YWXWbw8GQiobhnpuXrDzkLxf9G9` built with production settings
  and custom-domain assignment held until API success. It is now `READY` and
  `PROMOTED`; the alias API confirms `portal.phaenobiotech.com` points to it.
- Public API health returned HTTP 200, database ping HTTP 204, and the Portal
  root plus sampled JavaScript/CSS assets HTTP 200. The existing signed-in browser
  reached the POMS dashboard and Order operations; the new CRM sale-summary
  recovery panel returned its empty state. No business record was submitted.
- The attention queue explicitly reports that operational attention queues are
  not enabled. That existing activation setting was preserved. `/auth/sign-in`
  is not a current route; the root `/` is the current sign-in entry point.
- Bounded UI error and HTTP 5xx scans returned no entries. This does not establish
  full populated production, Partner, scientific, or physical acceptance.
- Previous UI deployment `dpl_DCKnBwZN27ANKkp2x8rD5mNkyDa7` remains identifiable
  for recovery. A UI rollback alone would not roll back the API or database;
  no down migration was run.

Ignored evidence is under `artifacts/portal-operational-completion-20260908/`:
`api-production-release.log`, `ui-production-build.log`,
`ui-production-status.json`, `portal-alias.json`, `portal-root-probe.json`,
`public-release-probes.json`, and the bounded UI error/5xx logs. Partner Finance,
automatic Kit lifecycle processing, active scientific offerings, coordinated
backup activation, and populated workflow acceptance retain their separate gates.
