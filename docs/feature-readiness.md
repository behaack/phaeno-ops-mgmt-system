# Portal feature readiness

Reviewed October 11, 2026. Implementation, local verification, hosted-test
activation and commercial production acceptance are separate states. The
runtime named production is currently a hosted test environment.

| Capability | Implemented baseline | Remaining acceptance / scope |
| --- | --- | --- |
| CRM and account lifecycle | First-party Company relationships, people, sales, tasks, reporting, requests and tenant access. | Role-specific signed-in acceptance. Connected email/calendar and external CRM adapters remain deferred. |
| Customer Lab ordering | Configured and negotiated pricing, Sales drafts/quotes, sequential phases, samples/shipping and Lab handoff. | Representative Customer/Sales/Finance acceptance. Multiple distinct services per order remain future scope. |
| Partner PSeq Kit | Kit bundle purchases, included cases, fulfillment, replacement/credit history and retained standalone records. | Representative Partner/fulfillment acceptance, physical shipment qualification and real processing. |
| Trial Projects | Direct Company/Department creation, source quantities, leadership approval, Prospect acceptance, bounded submission and Lab/shipping/results. | Representative Trial and bench acceptance. Customer promotional no-charge placement is unimplemented separate scope. |
| Lab Operations | Receipt/accession, material lineage, preparation, QC, vendor sequencing, scientific review and Commercial projections. | Current DataMatrix/supplier hardware qualification, degraded-mode procedure, operator/vendor and trainer acceptance. |
| Scientific files and processing | Resumable/ZIP FASTQ intake, exact library/run file sets, versioned S3 originals and POMS-side processing contracts. | Real provider execution/output acceptance. Older raw-files-outside-POMS descriptions are historical. |
| Storage and scanning | Local/Disabled/S3 providers. Local and hosted-test S3 cutovers recorded October 9; ClamAV remains configured in the hosted receipts. | S3-aware coordinated recovery, scheduled off-server protection and populated restoration remain commercial launch gates. Local-only backups do not protect S3. |
| Scientific release/retention | Independent QC/approval/publication, immutable manifests, receipts, schedules, full-download evidence, holds and cleanup/reissue controls. | Runtime flags and hosted recovery/cleanup acceptance remain separately evidenced. General folder CRUD/policy inheritance is unimplemented. |
| Finance | Native phase invoices/PDFs, receipts, allocation, adjustments, aging and reconciliation independently of scientific release. | Separated-role Finance acceptance. QBO remains deferred. |
| Help and localization | Audience-isolated lazy guides, authenticated packaged search, Customer message/error extraction and current-English document-source inventory are locally verified. | Human scientific/financial translations and full notice/document review before any additional Customer locale. No second locale is advertised; other audiences remain US English. |
| Work discovery | Shared work dashboard/bell, personal/eligible-unassigned/team views, stable paging, exact links and source recovery facts, with connected local actor/volume/prerequisite checks. | Real Clerk/provider and representative operational-user usefulness/clearance, plus populated strict-scientific tenant cost, remain acceptance gates. |

[System gap closure](plans/SYSTEM-GAP-CLOSURE-PLAN.md) owns current implementation
status and [work dashboard and notifications](plans/WORK-DASHBOARD-AND-NOTIFICATIONS-PLAN.md)
owns work/count/permission meaning. [Operations readiness](operations-readiness.md)
owns dated environment evidence. Deployment remains held.

The [final application closure receipt](testing/runs/2026-10-11-system-gap-closure-final.md)
records current regression outcomes and supersedes earlier local checkpoint
counts. Local fixtures do not establish hosted, physical or operational acceptance.

A capability is operationally ready only after approved configuration,
representative populated role journeys, failure/recovery and accountable
operational acceptance. Historical September checkpoints remain in dated plans
and release receipts; deployment or mocked checks do not establish acceptance.
