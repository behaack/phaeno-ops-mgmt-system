# Portal plan closeout - 2026-09-04

The Product Owner requested execution after the loose-end review and then
requested flexible Organization and Department admin rights. This checkpoint
records completed local work and the remaining product/acceptance boundaries.
The original checkpoint was local-only. On 2026-09-05 the Product Owner
explicitly authorized completing this plan, all test suites, documentation and
user-guide updates, a commit, and deployment of both the API and Portal UI.
Production storage activation and human acceptance remain distinct from shipping
the code; retain the existing storage hold. Scientific Trial Project criteria
are being confirmed before dependent implementation.

| Area | Current result | Remaining next action |
| --- | --- | --- |
| People and Departments | External self-service, reviewed invitations, independent Organization/Department admin rights, and five typed Organization defaults implemented locally. | Secondary exports/notices/history now verified locally; signed-in two-department acceptance and shared rollout evidence remain open. Department pricing and storage routing depend on their owning plans. |
| PSeq order-to-cash | Additive implementation/release recorded in its owning plan; local domain/API regression passed and staging checklist refreshed. | Dedicated staging from CRM through Paid, restored-database migration/recovery evidence, provider/staffing checks, and six-function signoff before activation. |
| File management | Governed PSeq and general Lab/Assembly policy, completion/grace/cutoff, durable warning/grace checkpoints, recoverable notices, and database-backed stream revocation are implemented locally behind default-off activation switches; historical schedules retain dates. | Actual commit-time boundary proof is local; hosted commit-tracking recovery, authenticated/mailbox acceptance, and storage/scanner/deletion activation remain open. General folder/version management remains separate scope. |
| Orders | Existing manually prepared quote workflow implemented. | Configured pricing and bundled-order workflow remain future product delivery. |
| Trial Projects | Planning exists; parent issuance and release model are not implemented. | Execute the owning feature plan when prioritized. |
| Lab and shipping | Internal operator and shipping foundation implemented. | Representative tube/shipper/label/scanner validation, NGS operating decisions, signed-in parent workflow, and activation. Raw/intermediate pipeline ownership remains unresolved; final PSeq deliverable handoff is implemented behind flags. |
| Authentication | Existing Clerk sign-in and membership authorization retained. | Production MFA/recovery/provider acceptance evidence remains an operational gate; this closeout changed no identity-provider configuration. |

## Admin behavior delivered

Organization admins govern the Organization and all its Departments, including
new ones. Department admins govern settings and existing-member assignments only
within their assigned Departments. A person can administer Research, belong to
Operations as a member, and have no Finance access. Permissions are independent
per Organization membership and Department assignment. Only Organization admins
invite new users and change Organization roles; Department admins cannot reduce
or elevate Organization-admin rights.

Open **Departments** in the external user's menu. Organization defaults cover PO
requirements, billing email, notification email, shipping instructions, and result
instructions. Each Department can override these fields independently. Null uses
the next applicable default. Existing saved shipping and accepted-quote snapshots
retain their values. Result instructions do not automatically route file storage.

## Local evidence

- Inspected additive migration `20260905011422_AddOrganizationConfigurationDefaults`
  and applied its five nullable columns to `localhost/phaeno_ops`; ERD updated.
- Backend build passed; 60 focused Department/PSeq/order-domain tests and nine
  quote/staff-initiation integration cases passed, with no skips.
- Frontend lint/typecheck passed; full unit suite: 144 tests across 57 files.
- Twelve distinct focused browser cases passed across desktop/mobile runs,
  including Axe checks, conflict recovery, invitation intent, and focus restoration.
  These use mock sessions/API responses, plus real rollback-backed database tests;
  they are not signed-in hosted acceptance.
- Staging script parser, offline preparation, and production-host refusal checks
  passed. No staging URLs/accounts were supplied, so the prepared run records all
  14 checkpoints as pending and activation/deployment authorization as false.
- Current plans and audience help were updated; no Git mutation or release ran.

## Next slice delivered: secondary department isolation

- New curated download audits retain the Department active at download time,
  including Organization-wide packages. Department admins see their selected
  Department's history; unknown legacy rows remain Organization-admin-only.
  The Data Library exposes the same rights and clears prior Department rows
  immediately during a switch.
- Queued order and grant notices recheck active scope and current administrator
  assignments. Empty recipient sets fail with actionable retry guidance.
  Organization-wide safety instructions about previously supplied copies still
  reach current active admins of affected suspended Organizations.
- Customer Lab and Partner Reagent/Assembly exports, search, counts, curated
  activity, files/archives, revocation, and recipient isolation have local proof.
- Inspected/applied `20260905014541_ScopeCuratedDownloadAuditByDepartment` only to
  `localhost/phaeno_ops`; updated the complete ERD and audience guides. Backend
  build passed with zero warnings/errors; all 68 focused tests passed with no
  skips, including 13 new rollback-backed scenarios. These overlap earlier runs.
- Frontend lint/typecheck and 13 focused unit cases passed. Both desktop/light
  and mobile/dark history browser checks passed with Axe, no overflow/console
  errors, and inspected screenshots. Browser sessions/API responses are fixtures.
- No real email, shared migration, Git mutation, or release ran. Hosted signed-in
  acceptance remains open. The next independent implementation gap is reconciling
  general-file and governed-PSeq retention policy/grace semantics in their owning
  plans; storage activation and physical deletion remain separately held.

## Next slice delivered: governed retention reconciliation

- New PSeq releases freeze the effective versioned global/Organization policy in
  the release transaction. Existing retention dates and audit events are preserved.
- Governed artifact downloads now count only completed full responses. Partial,
  cancelled, failed-open, and interrupted streams do not count. A late completion
  does not cancel conditional grace; new requests close at the applicable deadline
  even when worker state is stale. Staff and Customer projections agree.
- The Customer result section shows standard/final dates and completion facts;
  download attempts refresh the current package. The old worker cannot process
  snapshot-backed schedules, so it cannot apply its incompatible deletion rules.
- Local migration/ERD updated; zero-warning backend build; 79 focused backend,
  14 frontend, and two desktop/mobile browser checks passed. Lint/typecheck passed.
  Database fixtures roll back; browser fixtures do not authenticate to Clerk.
- Next: durable warning/grace checkpoints and notifications, missing-recipient
  Operations follow-up, and concurrent checkpoint/stream-revocation proof. General
  endpoint execution and physical cleanup remain open. No runtime flags, storage,
  shared database, real emails, Git state, or deployed environment were changed.

## Continued remaining work: durable governed retention

- Implemented one warning checkpoint (queued or explained skip), one grace notice,
  immutable standard/final decisions, and package-level database serialization.
  Late completions do not cancel persisted grace. Historical dates remain intact.
- Notices use current active Organization admins and authenticated Portal detail
  links with no scientific content, attachments, credentials, or direct downloads.
  Missing recipients and delivery failures surface as one urgent, recoverable
  Operations item. Operators can filter **Retention notices** and retry the
  existing notification; interrupted final delivery failures are recovered too.
- Serving responses poll durable access across instances and abort if authority is
  revoked or monitoring fails. Admission/completion hold current authority rows
  until commit; byte streaming holds no database transaction lock.
- Migration `20260905031439_AddGovernedRetentionCheckpoints` applied only to the
  guarded local development database. The ERD was regenerated to fix previously
  omitted tables/fields and now has a model-completeness regression check.
- Processing and dispatch require the separate default-off governed-retention
  flag, governed results, and an available Operations attention queue. No flags,
  shared database, provider delivery, physical deletion, Git mutation, or deployed
  environment were activated by this work.
- Verification passed: 103 focused backend tests, 15 frontend tests, backend
  compilation, lint/typecheck, and model/ERD completeness. Independent database
  connections and a blocked MVC response prove revocation stops that transfer.
- Exact wall-clock commit/deadline ordering, hosted signed-in acceptance, general
  Lab/Assembly execution, and provider/storage activation remain gates. Existing
  outbox retries are at-least-once; local uniqueness is not mailbox-delivery proof.
  Staging URLs and the available two-department test organization were requested.

## Prepared staging review

From the repository root, run:

```powershell
./scripts/acceptance/pseq-order-to-cash-staging.ps1 -PrepareOnly -EvidenceDirectory ./artifacts/pseq-order-to-cash-acceptance-20260904
```

That prepared artifact directory contains `run-context.json`, 14 checkpoint files,
and `acceptance-summary.json`. It records requirements, not completed acceptance.
For an authorized live run, supply the dedicated staging Portal/API base URLs,
setup actor's OrganizationId and DepartmentId, and a short-lived token through
`PSEQ_STAGING_BEARER_TOKEN`. Use separately assigned test actors for each workflow;
do not put credentials in source, evidence notes, or chat. Confirm actual evidence
at each checkpoint. Live noninteractive mode leaves checkpoints pending and exits
with code 2. A PASS record makes the run ready for review only.


## Next slice delivered: exact download commit timing (2026-09-05)

- Admission and completion retain verified database commit times. Late admission
  cannot open storage, and success committed after the standard deadline preserves
  grace. Existing assigned dates and original audit timestamps remain intact.
- A durable observer recovers after interruption; missing timing evidence stops
  retention decisions while failure and revocation remain recordable.
- All 104 affected backend checks passed on an isolated tracking-enabled local
  PostgreSQL cluster, including actual delayed commits at standard/final cutoff,
  lost-observer recovery, rollback, and zero storage opens on denied admission.
- Additive migration and complete ERD updated. No frontend component or navigation
  changed; Customer/Phaeno help and living plans explain recovery.
- Governed-results activation now explicitly requires database commit tracking.
  The normal local server was not restarted or reconfigured. Hosted recovery,
  signed-in two-department/streaming acceptance, shared rollout, and providers
  remain open. Next implementation slice: general Lab/Assembly retention endpoint
  enforcement. No Git operation, deployment, real message, or deletion ran.


## Next slice delivered: general Lab/Assembly download enforcement (2026-09-05)

- Individual and ZIP downloads now share frozen retention cutoff/grace decisions,
  commit evidence, bounded leases, and cross-connection revocation monitoring.
  Partner payment/release gates and undated historical releases are preserved.
- Customer Lab releases display their schedule and file/package controls.
  Customer/Partner actions disable at closure and refresh after failed transfers.
- All 104 prior affected backend checks passed; both new independent-database
  journeys passed after fixture corrections. All 14 focused frontend tests,
  lint/typecheck, and two desktop/mobile accessibility/browser checks passed.
- No schema change was needed. Enforcement is default-off and requires commit
  tracking before activation. No Git operation, deployment, shared change,
  provider activation, email, or deletion ran.
- Next implementation slice: scheduled warning/grace processing and recovery for
  general Lab/Assembly releases. Hosted acceptance and storage work remain open.

## Next slice delivered: general retention notices (2026-09-05)

- Customer Lab and Partner Assembly now share durable warning/grace checkpoints,
  tenant-safe workflow links, current Organization-admin delivery, and urgent
  Operations failure/retry recovery without altering the frozen deadline.
- General and governed PSeq scheduling/claims remain independently gated.
  Processing defaults off and requires general enforcement plus Operations
  attention; ordinary notifications continue under their existing behavior.
- All 111 affected backend cases passed, including concurrency, successful ZIP
  timing, warning suppression, current recipients, provider retry/reopening,
  interrupted final claims, and gate isolation. EF reports no model changes.
- Updated all three audience guides and readiness notes. Frontend/browser suites
  were not rerun because only backend behavior and help prose changed.
- No Git operation, deployment, shared mutation, real email, storage activation,
  or byte deletion ran. Remaining work: cleanup/holds/reissue and Trial Project
  integration, plus hosted authenticated, mailbox, and restart acceptance.

## Release closeout checkpoint (2026-09-05)

Implemented cleanup retries, lease/hold/shared-object protection, preservation
and quarantine actions, retained printable receipts and new-package reissue links.
Reissue requires the same sample for sample-level Lab/PSeq releases. New Lab
receipts freeze lineage; historical unknown facts are not manufactured. Cleanup
and storage activation remain held. Customer, Partner and Phaeno guides, ERD,
architecture, business rules and living test plans are updated.

Full verification passed: 346 backend tests with PostgreSQL opt-ins enabled and
no skips, 163 frontend unit tests, 54 desktop/mobile browser tests, backend build,
frontend lint/typecheck/build, and the separate public Website build. The final same-sample reissue correction passed another complete 346-test
backend run. Final receipt print corrections passed both browser modes; the
frontend unit suite and build passed again after final guide/print changes.
Browser fixtures are synthetic. Both printed receipt modes contain all 35 long
Unicode filenames across five A4 pages; page rendering was inspected. The global
Lab label print rule is now scoped to its label surface.

The full run also repaired stale fixture expectations for CRM online-access
approval, canonical Company People/Departments navigation, and Order operations;
shipping fixture Department cleanup; canonical CRM product-interest values; and
an explicit production workflow inside the rolled-back Lab reference journey.
No production scientific workflow was changed by these fixtures.

All seven pending schema migrations are applied locally. The production release
procedure and migration review are in `PORTAL-CLOSEOUT-RELEASE-2026-09-05.md`.
Trial implementation still needs the pending decision on scientific criteria;
hosted authenticated/physical/mailbox acceptance remains unperformed. This is
not a claim that every feature plan or activation gate is complete.
