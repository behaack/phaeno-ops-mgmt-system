# Laboratory training plan

Status: initial plan and management manual drafted; management review and trainer walkthrough not yet performed.

Prepared: September 11, 2026.

## Product need and first audience

Lab management needs to understand how POMS supports the laboratory before teaching staff to use it. Resources are limited. Begin with one readable manual and one management walkthrough; use them to prepare a supervisor or lab manager to become the first trainer.

The first outcome is understanding and teach-back, not completion of a full operator training program. Management should be able to explain where work enters the lab, how sample identity and evidence follow it, who makes decisions, and how completed scientific work reaches result release.

The Product Owner requested this small starting scope. A dedicated training environment, video library, learning platform and application training features are future options, not prerequisites or current implementation commitments.

## Deliverable available now

[POMS laboratory management and trainer manual](../training/LAB-MANAGEMENT-MANUAL.md) is the entry point. It provides:

- A plain-language system overview and glossary.
- The laboratory journey from authorized work through scientific review and the release handoff.
- Responsibilities and common exceptions.
- A 60-minute presentation agenda and prompts for the first trainer.
- A teach-back checklist and reusable session record.
- Links to existing task guides for detailed instructions.

The manual is a repository document for management review. It has not been published into the in-application help system. Markdown is the editable source; a shareable PDF or Word edition can follow the first content review if needed. Avoid maintaining separate instructions in multiple formats.

## Phase 1 — Management orientation and first trainer

### Minimum resources

- One lab manager or supervisor as the proposed trainer.
- One person familiar with the current application to lead the first walkthrough.
- The manual, existing guides and a shared screen if available.
- One hour together, with a short separate teach-back if it does not fit.

No new software, training accounts or records are needed for a document-only session. An application demonstration is optional. Use suitable existing synthetic records read-only after confirming the environment and access. If those are unavailable, explain the journey from the manual and mark the live view as not shown. Do not create records or advance real work solely to complete the presentation.

### Steps

1. The facilitator checks the manual against the version being shown and identifies any unavailable sections. In particular, preparation-batch production release remains pending in the current owning plan.
2. Management reads the overview and journey. The facilitator follows the manual's 60-minute agenda.
3. Record confusing terms, missing handoffs and differences from actual laboratory practice in the session record.
4. The proposed trainer teaches the journey back using the same manual and explains the damaged/missing-tube example.
5. Revise the manual from this feedback. Management names the trainer and chooses the first operator task to teach.

### Acceptance and success measures

- Management can explain all six journey stages and identify their responsible roles.
- The trainer distinguishes container receipt, tube acceptance, processing QC, scientific approval and publication without prompting after feedback.
- The trainer can locate the receipt/accession, protocol execution and scientific approval guides.
- Every observed application/manual mismatch has an owner and next action; none is silently presented as supported behavior.
- A first trainer and first operator lesson are named in the session record.

Use these as practical pilot measures, not formal certification. Record the session as Not started, Needs follow-up or Complete; drafting the documents does not complete training.

## Phase 2 — First operator lesson, after management review

Recommended first topic: receipt and accession. Adapt the existing task guide into a short exercise with normal receipt, a damaged tube, a held tube and a missing tube. Management confirms the relevant laboratory procedures and inspection criteria.

Only when hands-on practice is scheduled, arrange suitable isolated synthetic records and the required user permissions. Add a one-page task reference and observed-practice checklist. Physical practice should use the actual approved scanner/label/workstation arrangement. Software exercises do not establish method or hardware qualification.

This phase is planned, not delivered by the initial manual. Reuse the format for Library prep, sequencing handoff and supervisory recovery only after the first lesson has been evaluated.

## Later options — justified by actual need

Consider a resettable practice environment, short captioned videos, screenshots, additional role-specific manuals, or completion tracking if repeated onboarding creates a need. A learning-management platform or in-application training mode is not part of this starting scope.

## Ownership and maintenance

| Responsibility | Owner |
| --- | --- |
| Scientific meaning, actual bench procedures and operating responsibilities | Lab management |
| Product priorities and acceptance of training scope | Product Owner |
| Application accuracy, document structure and links | Engineering/documentation maintainer |
| Delivery, teach-back and learner feedback | Named first trainer |

Keep procedural detail in the existing audience guides. The management manual explains the connected journey and links to those guides. Review affected manual sections when labels, permissions, handoffs or workflow behavior change. Add visuals only where the first walkthrough shows a clear need.

## Source alignment and limits

- Current task guides and application source inform the manual; this is not a production verification report or laboratory SOP.
- The [connected preparation plan](LAB-WORK-JOURNEY-PLAN.md) records locally implemented preparation batches and pending physical acceptance/production release. Confirm availability before showing these in a hosted session.
- Current `LabOperationsPage.tsx` labels the work section **Library prep**. Older references to **Lab work** in receipt prose and acceptance cases describe earlier navigation. The manual uses the current section label and job history lookup; do not treat older prose as an alternate training route without checking the demonstrated version.
- The general Lab overview describes actor separation broadly, whereas the scientific approval guide describes stricter reviewer independence. The manual directs management to the detailed approval guide and the configured policy rather than promising that one person can perform every step. Confirm the demonstrated environment's enforcement before a future hands-on approval exercise.
- The [manual acceptance pack](../testing/06-laboratory.md) supplies future scenario ideas. It is an engineering acceptance artifact and must be simplified before learner use; its cases are not evidence of completed training.

## Verification of this documentation change

Scope is the new plan and manual only. Check local links, whitespace and consistency with the current guides and relevant navigation source. No application behavior, help registry, generated documentation corpus, tests, database, deployment or Git staging/commit is part of this change. Application tests are not needed for these standalone documents.
