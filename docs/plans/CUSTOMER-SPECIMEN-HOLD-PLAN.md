# Customer-requested specimen holds

Status: implementation authorized September 20, 2026; local verification in progress. The owner explicitly approved customer requests, staff-controlled safe pause/resumption, immediate blocking of new work/release, and unchanged charges/retention. See [current gap closure](OPERATIONAL-GAP-CLOSURE-20260920.md). The earlier deferral below is retained as historical planning context, not a current implementation prohibition.

## Approved implementation

Organization and assigned-department administrators request a per-specimen hold/resumption. Lab Supervisors or Operations Administrators decide. Pending and unable-to-pause states block new work/release; physical pause confirmation is recorded separately so a resumption request does not invent a prior physical stop. Already-running work may be documented until a pause is confirmed. Released results remain accessible, including when remaining repeat runs are held. Existing work-entry gates still check authorization, material and workflow eligibility after the customer hold clears. A separate Job hold/cancellation prevents approving resumption. The Jobs blocked queue and 15-second refreshed customer/staff cards expose outstanding requests; no new email channel or response-time guarantee is introduced. Audit events retain every shared reason and decision.

## Historical purpose and boundary

Allow a Customer to request that specified specimens stop progressing, and allow Phaeno to acknowledge what can safely be paused. This is distinct from tube intake suitability, internal QC holds, terminal specimen failure, order cancellation and an existing generic Lab milestone.

Historical September 11 direction (superseded by the explicit September 20 authorization): Do not implement request/resume UI, new endpoints, notifications or persistence for this workflow as part of tube intake or attempt/fallback work. Do not represent existing generic Lab hold controls as satisfying a Customer-request workflow. Existing operational controls are unchanged by this document.

## Proposed scope for later design

- Request identifies the Customer, order, selected specimens, reason, requesting actor and time. Order-wide selection should resolve to an explicit specimen set.
- Distinguish request submitted, operationally applied, unable to pause, and released. A request is not proof that an in-flight physical procedure has stopped.
- Phaeno records acknowledgment, affected work and the safe pause boundary. Already completed actions and consumed materials remain historical facts.
- On an applied hold, block new affected work through every relevant API and queue; resolve behavior for an execution already running without assuming it can be stopped immediately.
- Customer and Phaeno see the effective state and next responsibility. Internal laboratory notes remain separate from customer-facing explanations.
- Resumption is explicit and rechecks authorization, material availability, workflow eligibility and any intervening exceptions. Removing the request does not automatically start execution.
- Store request, acknowledgment and resumption history with actors/times; preserve intake acceptance and prior analysis outcomes.

## Product decisions required before implementation

1. Who may request, apply and release a hold? Is Customer withdrawal sufficient to resume, or is Phaeno confirmation required?
2. Which operations must pause: new processing, in-flight steps at safe boundaries, external sequencing handoff, downstream analysis, review and release? What happens when material is already with an external provider?
3. What acknowledgment expectation and notifications apply? Who owns an unresolved request?
4. How do holds affect turnaround commitments, charges, material retention and cancellation? No automatic extension or financial adjustment is assumed.
5. What happens for urgent requests, partially completed specimens and results already delivered? No retroactive undo is implied.

## Future acceptance coverage

Original deferred acceptance outline (current evidence is in the linked gap plan): requester permissions and tenant scope; selected-specimen scope; request versus effective pause; race with execution start/complete and external handoff; duplicate requests; multiple independent blockers; partial application; resume authorization; accurate Customer/Phaeno messaging; audit trail; no retroactive rewriting of completed work.

## Related plans

- [Specimen tube attempts and fallback](SPECIMEN-TUBE-ATTEMPT-PLAN.md)
- [Lab Operations](LAB-OPERATIONS-PLAN.md)
- [Order Management](ORDER-MANAGEMENT-PLAN.md)
