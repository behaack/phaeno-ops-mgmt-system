# Major-workflow acceptance run record

Copy this file for each run; leave this template unchanged. Follow [README.md](README.md) and [TEST-DATA.md](TEST-DATA.md). All 75 cases are initially Not run.

## Run identity

- Run ID / started / finished (include time zone):
- Environment name / owner / isolated test authorization:
- Portal URL + exact revision/deployment:
- API URL + exact revision/schema:
- Website URL + exact revision (if in scope):
- Browser / OS / devices / viewport / theme / zoom:
- Tester names and test account aliases/capabilities (no credentials):
- Scientific, Commercial and Operations owners:
- Storage / scanner / sender modes and controlled recipients:
- Retention processing / enforcement / cleanup flags:
- Kit lifecycle / attention queue availability:
- Backup schedule / off-server / restore prerequisites:
- Scope exclusions agreed before execution:

## Prepared fixture and handoff ledger

| Alias | Actual safe record ID / version | Owning organization / Department | Preparation evidence / prerequisite case |
| --- | --- | --- | --- |
| Company / request / Opportunity | | | |
| User / invitation (never link/token) | | | |
| Manual / standard Job and quote | | | |
| Trial / scope / acceptance | | | |
| Sample / authorization / shipment / tubes | | | |
| Lab work / protocol / workflow / execution | | | |
| Kit order / unit / case / input revision | | | |
| Transportation-kit request / version / notification | | | |
| Customer delivery location / version / frozen address reference | | | |
| Container definition SKU / revision / capacity | | | |
| Physical kit / registered tube roster / outbound tracking | | | |
| Customer kit receipt / actor / location / observed time | | | |
| Packing pool / container shipment / current and void packet | | | |
| Scientific package / release / receipt | | | |
| Invoice / receipt / allocation / reconciliation | | | |
| Source / curated version / grant | | | |
| Intake / notification / provider receipt | | | |
| Backup / restored record / file checksum | | | |

Add separate rows for each fixture and preserve parent-child references. Record whether preparation was through connected UI, API/database fixture or intercepted browser responses.

## Case results

Use Pass / Fail / Blocked / Not run / Not applicable. Every required step and variant must pass for a case to pass. Missing prerequisites are Blocked, not Pass. Not applicable requires an agreed scope reason. Keep evidence from earlier failures after retesting.

| Case | Scenario | Result | Evidence / defect reference | Owner / next action |
| --- | --- | --- | --- | --- |
| ACC-01 | Invitation, correct identity and first access | Not run | | |
| ACC-02 | Resend, revocation, expiry and declined invitation | Not run | | |
| ACC-03 | Department structure, membership and settings inheritance | Not run | | |
| ACC-04 | Tenant, Department and member permission boundaries | Not run | | |
| ACC-05 | Deactivate and restore access without erasing history | Not run | | |
| ACC-06 | Sign-in, MFA, session expiry and user-role administration | Not run | | |
| CRM-01 | Company, Contact and relationship management | Not run | | |
| CRM-02 | Lead qualification, duplicate review and conversion | Not run | | |
| CRM-03 | Opportunity pipeline, buying team and reports | Not run | | |
| CRM-04 | Activities, recurring Tasks and attention handoffs | Not run | | |
| CRM-05 | Request approval, access, services and completion | Not run | | |
| CRM-06 | CSV import, saved views, merge and administrative boundaries | Not run | | |
| TRI-01 | CRM request to shared scope draft | Not run | | |
| TRI-02 | Independent approvals and Prospect acceptance | Not run | | |
| TRI-03 | Bounded submission and sample/shipment authorization | Not run | | |
| TRI-04 | Amendment, holds and one authorized replacement | Not run | | |
| TRI-05 | Partial and complete scientific result release | Not run | | |
| TRI-06 | Closure, material disposition, CRM follow-up and conversion | Not run | | |
| ORD-01 | Staged readiness and versioned configuration | Not run | | |
| ORD-02 | Configured standard Lab commitment | Not run | | |
| ORD-03 | Manual pricing, immutable quote and Customer acceptance | Not run | | |
| ORD-04 | Exact sample roster, CSV preview and finalization | Not run | | |
| ORD-05 | Transportation kits, containers, frozen manifests and sample dispatch | Not run | | |
| ORD-06 | Custom work, sales-assisted intake, timing and cancellation | Not run | | |
| ORD-07 | Customer laboratory stages and mixed sample progress | Not run | | |
| KIT-01 | Negotiated Kit draft, review and one purchase | Not run | | |
| KIT-02 | Commercial acceptance, split shipments and billing lineage | Not run | | |
| KIT-03 | Substitution, replacement, deadlines and cancellation | Not run | | |
| KIT-04 | Included input preparation and interrupted upload recovery | Not run | | |
| KIT-05 | Intake correction, processing and original-purchase release gate | Not run | | |
| KIT-06 | Independent case completion and historical compatibility | Not run | | |
| LAB-01 | Controlled protocols, independent approval and workflow pinning | Not run | | |
| LAB-02 | Receipt, multi-tube accession and physical lineage | Not run | | |
| LAB-03 | Material QC, prepared lots, consumption and equipment | Not run | | |
| LAB-04 | Guided evidence, QC blockers, correction and completion | Not run | | |
| LAB-05 | Libraries, scan-first batches and external sequencing custody | Not run | | |
| LAB-06 | Exceptions, independent scientific approval and release candidate | Not run | | |
| FIN-01 | Approved billing, frozen invoice and scientific independence | Not run | | |
| FIN-02 | Receipt evidence, split allocation and overpayment | Not run | | |
| FIN-03 | Allocation reversal, receipt reversal and invoice adjustments | Not run | | |
| FIN-04 | Receipt import preview, ownership and duplicate prevention | Not run | | |
| FIN-05 | Draft reconciliation, independent approval and immutable closeout | Not run | | |
| FIN-06 | Aging, exports, attention and section recovery | Not run | | |
| DAT-01 | Managed source intake and immutable curated publication | Not run | | |
| DAT-02 | Exact-version grants, Department scope, upgrades and revocation | Not run | | |
| DAT-03 | Quarantine, investigation, clearance and withdrawal attestation | Not run | | |
| DAT-04 | Authorized individual/ZIP downloads and completion evidence | Not run | | |
| DAT-05 | Frozen retention, warnings, grace and cutoff | Not run | | |
| DAT-06 | Preservation, quarantine, byte deletion and reissue receipts | Not run | | |
| WEB-01 | Public discovery, navigation, search and documents | Not run | | |
| WEB-02 | Contact/technical-brief and non-binding demo inquiry | Not run | | |
| WEB-03 | Web Operations intake and email processing controls | Not run | | |
| WEB-04 | Failed delivery, eligible resend and destination receipt | Not run | | |
| WEB-05 | Workflow notices, recipient changes and failed-event recovery | Not run | | |
| WEB-06 | Audience help, search and context-preserving navigation | Not run | | |
| SYS-01 | Conflict handling, delayed saves and duplicate submissions | Not run | | |
| SYS-02 | Partial outages, durable projections and unavailable connectors | Not run | | |
| SYS-03 | Active access removal and in-flight download revocation | Not run | | |
| SYS-04 | Holds, cancellation and cross-screen ownership | Not run | | |
| SYS-05 | Keyboard, responsive UI, errors and draft recovery | Not run | | |
| SYS-06 | Coordinated restore and release-level acceptance | Not run | | |
| SHP-01 | Container sizes and compatible recommendations | Not run | | |
| SHP-02 | Customer and Department delivery locations | Not run | | |
| SHP-03 | Included-cost kit order and confirmation | Not run | | |
| SHP-04 | Duplicate prevention, stale review and cancellation | Not run | | |
| SHP-05 | Fulfillment notification and request queue | Not run | | |
| SHP-06 | Prepare and register physical stock at Phaeno | Not run | | |
| SHP-07 | Dispatch and provisional customer inventory | Not run | | |
| SHP-08 | Customer receipt and partial availability | Not run | | |
| SHP-09 | Available sizes, alternate packing and residual supply | Not run | | |
| SHP-10 | Scan tubes and retain exact identities | Not run | | |
| SHP-11 | Branded manifests and samples split across containers | Not run | | |
| SHP-12 | Record each sample-return shipment | Not run | | |
| SHP-13 | Laboratory receipt across split shipments | Not run | | |
| SHP-14 | Access, recovery and usable long workflows | Not run | | |

## Transportation-kit quantity and identity evidence

For SHP cases, repeat a row at each order/dispatch/receipt/packing handoff. Counts
are kits unless labeled tubes; preserve identity links instead of relying only
on a success banner. Quantities awaiting dispatch are distinct from kits already
on the way. Link the snapshot to the request and physical kit records.

| Case/step | Job / location / request version | SKU / physical kit IDs | Requested / dispatched / received | On the way / available / allocated | Sample tubes allocated / still pending | Shipment / manifest / receipt evidence |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |

Mark provider delivery and physical dispatch/receipt independently from application
state. The current Job/location supply model does not prove cross-Job warehouse
balances, reservation release, damaged-kit corrections or automatic replenishment.

## Detailed step record (repeat for each case and variant)

- Case / variant / attempt number:
- Tester / effective role / organization / Department:
- Start / finish / exact environment revision:
- Prepared fixture IDs and prerequisite evidence:
- Evidence type: connected application / intercepted browser / API-database / provider / destination receipt / physical bench / restore drill

| Step | Expected result (from script) | Actual observation | Result | Redacted evidence / defect |
| --- | --- | --- | --- | --- |
| 1 | | | Not run | |
| 2 | | | Not run | |
| 3 | | | Not run | |
| 4 | | | Not run | |
| 5 | | | Not run | |
| 6 | | | Not run | |

Add/remove rows to match the case; repeat separately for each role, state or device variant. Record persistent IDs/counts and provider or physical evidence where required, not only screenshots of success banners.

- Cleanup completed / retained records / outstanding queued work:
- Handoff to next tester/case:
- Retest decision and remaining blockers:

## Defect record (repeat as needed)

- Defect ID / affected case-step / severity / owner:
- Exact revision, account alias, organization and Department:
- Starting state and reproduction steps:
- Expected versus actual behavior:
- User/business consequence and affected records:
- Safe evidence references (no tokens, PHI or confidential file contents):
- Workaround, if valid / next action / retest result:

## Acceptance decision

- Case totals: Pass __ / Fail __ / Blocked __ / Not run __ / Not applicable __ (must total 75):
- Connected journeys completed:
- Remaining failures/blockers and explicit disposition:
- Missing provider / destination / physical / restore evidence:
- Cleanup and test mail/configuration restoration confirmed by:
- Commercial acceptance / name / date:
- Scientific and physical acceptance / name / date:
- Operations/recovery acceptance / name / date:
- Product acceptance / exact release / name / date:

Do not mark acceptance complete from a health probe, an empty queue, intercepted browser responses, or a historical automated test total alone.

