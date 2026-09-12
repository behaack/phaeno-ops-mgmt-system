# Customer-requested specimen holds

Status: **IMPLEMENTATION BLOCKED by Product Owner direction, September 11, 2026.** This is a planning outline only. Separate design approval and explicit implementation authorization are required to remove the block.

## Purpose and boundary

Allow a Customer to request that specified specimens stop progressing, and allow Phaeno to acknowledge what can safely be paused. This is distinct from tube intake suitability, internal QC holds, terminal specimen failure, order cancellation and an existing generic Lab milestone.

Do not implement request/resume UI, new endpoints, notifications or persistence for this workflow as part of tube intake or attempt/fallback work. Do not represent existing generic Lab hold controls as satisfying a Customer-request workflow. Existing operational controls are unchanged by this document.

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

All Not run and blocked from implementation: requester permissions and tenant scope; selected-specimen scope; request versus effective pause; race with execution start/complete and external handoff; duplicate requests; multiple independent blockers; partial application; resume authorization; accurate Customer/Phaeno messaging; audit trail; no retroactive rewriting of completed work.

## Related plans

- [Specimen tube attempts and fallback](SPECIMEN-TUBE-ATTEMPT-PLAN.md)
- [Lab Operations](LAB-OPERATIONS-PLAN.md)
- [Order Management](ORDER-MANAGEMENT-PLAN.md)
