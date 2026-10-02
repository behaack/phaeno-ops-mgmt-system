# Sequential phases within one Lab Job

## October 1 update: on-demand phase kit requests

[On-demand phase kit requests](ON-DEMAND-PHASE-KIT-REQUESTS-PLAN.md) supersedes the earlier automatic-at-acceptance fulfillment decision and whole-Job preparation requirement below. Acceptance places no kit order. Administrators request kits and confirm an address when ready, for the current phase, with distinct kits and sample-based capacity per phase. The later October 1 shipping refinement advances to the next phase after every required shipment of the preceding phase is recorded as sent, without waiting for results; kit requests remain on demand and sent-phase status stays visible; approved cancelled phases are skipped. The Next step card names the action and provides its button. Preparation/finalization and shipping repeat per phase; laboratory execution and full-sample-receipt TAT rules remain sequential. Existing fulfillment and custody history is preserved. Earlier statements below describe the prior implementation/decision history.


Review follow-up (September 30, 2026): early approved cancellation removes the cohort from physical preparation requirements while preserving its accepted commercial scope. A finalized named roster must cover every non-cancelled phase; an early-cancelled cohort does not require invented Sample IDs or tube scans. Preparation responses expose active sources/runs and phase IDs, cancelled saved pairs remain visible as history, and only required pairs create authorization and shipments. This refines the complete-roster implementation assumption below. Partial invoices reconcile tax rounding at the same issued rate without changing earlier tax facts. See [review verification](../testing/runs/2026-09-30-order-review-fixes.md).

Status: implemented locally, September 30, 2026; broader connected business acceptance remains unverified. Earlier phase implementation included an owner-authorized local Job cleanup; the Sales Draft refinement excludes existing orders. The owner subsequently requested migration application, tests and builds, then resolution of the remaining 25 backend failures. Both pending additive pricing/Customer-order migrations are applied locally. The corrected build passes without warnings/errors, and the complete backend rerun passes 1,157 cases with zero failures and two environment-specific skips; all original failures are closed in [the verification run](../testing/runs/2026-09-30-order-management-verification.md). Git mutations, publishing and deployment remain outside scope, and the production deployment hold remains in force. Earlier checkpoints below retain their historical hold/verification state.

## Saved Draft readability — October 1, 2026

### Phase quote review and catalog selection

Later October 1 owner-approved on-screen refinement supersedes the global column/service-table presentation below: one bordered review block owns each frozen phase's scope and pricing. Keep singular Service and its sample quantity at order level. A reconciled uniform phase explains total runs per sample as one included plus additional runs, and shows samples × additional runs per sample beside pricing (15 × 2 = 30 for 3 total runs/sample). Use exact frozen scope/component quantities and omit unsupported derivations. Narrow screens read scope then pricing within the same phase. The one-service/one-controlled-Sample-type restriction remains; biological sources do not change the model. PDF presentation is explicitly excluded. Detailed acceptance and verification are recorded in the [Order Management plan](ORDER-MANAGEMENT-PLAN.md#on-screen-phase-scope-and-pricing-refinement--october-1-2026).

Customer and Partner quote review pairs each frozen phase's scope and business-day TAT on the left with its itemized pricing on the right. Use compact inline labels and shared rows so additional phases stay aligned. On narrow screens, read each phase's details followed by its prices. Hide the duplicate operational Phases card before acceptance; retain receipt, progress, rephasing and cancellation after confirmation. Display the catalog service name, quantity × unit price and amount on one compact pricing row, followed by Additional sequencing runs only when purchased and **Phase price**. Preserve quoted quantities, amounts, tax, expiry and permissions. Order scope lists each service and its quoted quantity summed across phases, with additional sequencing runs counted separately. TAT explanatory copy refers to every required sample for that phase. Hide a notes value consisting only of None; label meaningful notes as Order notes. Quote PDF download belongs below a divider in the quote Actions menu, whose entries stay on one line.

Sales Draft entry gains one active PSeq Lab Service catalog selection for the current order. It is optional for an incomplete Draft and required before pricing submission. Retain its catalog identity on submission and require pricing to use that requested service. This adds a nullable requested-catalog-item foreign key and an additive local migration; existing scope and pricing data are preserved. Existing unfinished Drafts need a service selected before submission, without conversion/reset. Quote readers resolve descriptive catalog names by the exact catalog IDs already recorded in their lines; no catalog price is used to recompute issued prices or alter stored quote snapshots. Freeze concise service descriptions on newly issued quotes.

The owner wants multiple services in one order, including services distributed across phases, eventually. That is future product scope: service scope, purchased quantities, sample/run attribution, output contracts, and billing must become explicit per-service records before broadening the current one-service workflow. Do not silently combine services into the current standard-sample/additional-run model or remove its scientific/acceptance safeguards in this readability update.

Local checkpoint: the nullable catalog-selection migration is applied only to localhost:5432 / phaeno_ops_clean_20260919; no existing Draft or issued quote was rewritten. EF reports no pending model changes, and the ERD is regenerated. Isolated backend solution compilation, frontend TypeScript, scoped lint and generated-help checks pass. Manual actual-component previews verified compact two/twenty-phase pairing, 320px dark-theme reflow and reduced phase spacing; signed-in unsaved Draft inspection verified the actual service option and aligned controls. Automated suites were authored/updated but not executed. The local API was subsequently rebuilt and restarted to activate the quote decisions and descriptive catalog labels; its health check passed. The Visual Studio debugger may need reattachment. No Git mutation or deployment is included.

Commercial scope follow-up: use bold labels for Requested specimens, Biological sources, Storage requirements, Safety declaration, Proposed price, Current quote and the conditional Proposal note. Keep values, spacing, responsive columns and current quote emphasis as implemented.

Commercial scope verification: type checking and scoped lint passed; signed-in browser inspection confirmed 700 weight on all six visible labels, with no page overflow at 1163 px and 487 px CSS widths. Reset the viewport after inspection. No order writes or automated suites were performed; dark theme and conditional Proposal note remain unverified in the browser.

Follow-up: submitted-order phase cards use the same bold label treatment for proposed/additional-run rates, current progress, physical receipt, Portal delivery, TAT expectation, complete receipt, delivery due and Phase price. Preserve existing value placement, responsive columns and contextual Actions behavior. Single-scope proposed-rate labels share this treatment.

Confirmed wording: **Phase price** replaces Accepted phase portion. Phase pricing is frozen on quote issuance, before Customer acceptance, so the former label implied an approval that may not yet exist. Keep the pre-tax phase amount and invoiced amount unchanged; quote status continues to identify acceptance. This wording correction changes no pricing calculation, API field or persisted model.

Wording verification: scoped lint passed; signed-in browser DOM inspection confirmed the bold Phase price label in both phases and unchanged quoted/invoiced values. No order writes or automated tests were performed.

Follow-up verification: type checking, scoped lint and generated-help checks passed. Signed-in inspection of the Quote-issued order confirmed all 16 visible phase labels use 700 weight, with no page overflow at 1163 px and 487 px CSS widths. The temporary viewport was reset. No order action or automated suite was run; dark theme and conditional additional-run labels remain unverified in the browser.

Saved Sales Draft details use bold labels and inline count/price values, for example **Samples:** 5. Apply the same presentation to sequencing runs, proposed sample/additional-run prices and subtotal, including missing-value messages. Retain semantic definition lists, responsive two-column phase summaries and natural text wrapping. Handling and notes labels are bold; their longer text stays below. This presentation-only change preserves scope, calculations, permissions and the single Edit draft action. The current Order operations guide owns the saved Draft instructions.

Verification: type checking and scoped lint passed. Generated help was refreshed after a permission-safe generator rerun. Manual signed-in inspection confirmed bold labels and inline phase values without horizontal overflow at 1163 px and 487 px CSS widths; the viewport was restored, with no Draft save or submission. Automated tests were not requested or run. Dark-theme and entered-price/additional-run visual cases remain unverified.

## Customer ordering boundary — September 30, 2026

Confirmed refinement: Customer-initiated orders have one scope and one included sequencing run per sample. Customers cannot create multiple phases. The current standard or applicable negotiated service price is resolved from Organization and selected-Department pricing, with the lower negotiated price winning when both exist. Each service has a configurable maximum sample count for Customer placement; larger orders and additional runs require Sales. Sales retains phase-enabled Draft entry and separate sample/additional-run pricing. See `ORDER-MANAGEMENT-PLAN.md`, Customer-initiated standard orders, for the confirmed Customer experience, pricing storage, sample-limit setup and acceptance scope. The Customer standard-order refinement is implemented in source after the owner authorized execution. Builds/tests, its additive migration, generated help and runtime activation remain pending under the hold; see the Order Management implementation checkpoint.

## Standard sample service and additional-run pricing (September 30, 2026)

The owner clarified that this rule applies to both phased and non-phased pricing. Each sample buys one standard service containing one library preparation, one sequencing run and data assembly. Runs beyond the first per sample are a separate priced component using that sample's prepared library. The subtotal is `sample count × standard sample price + (total purchased runs − sample count) × additional-run price`. For three samples with three runs each, price three standard services plus six additional runs. Purchased quantities never establish physical material availability or require another library preparation.

Sales Draft proposals retain two rates. The additional-run field appears only when extra runs are requested; incomplete proposals remain savable, but enabled proposals must have every applicable rate before submission. Formal pricing review uses the same rules for one scope or multiple phases. Quote lines retain explicit StandardSample/AdditionalRun components, correct quantities, reviewed rates, descriptions and proposal snapshots. Turnaround belongs to the standard sample line; both monetary portions roll into the phase subtotal, immutable quote and existing Finance snapshots. Amending either proposed rate requires a reason. A Change quote for added samples uses the same split.

Engineering scope: retain the current laboratory catalog item for both priced components; describe them separately in the existing quote-line contract and JSON snapshots. Add the nullable phase `proposed_additional_run_price` column with `AddSeparateSampleRunPricing`; `proposed_unit_price` is the standard sample rate. There is no backfill, conversion or deletion of existing orders. The standard catalog offering has only a sample rate, so direct standard placement includes one run per sample. Extra runs require explicit pricing review rather than multiplying the sample rate or assigning an unconfigured rate. Existing prepared-library quantity, transfer and exhaustion rules remain authoritative; source-tube exhaustion is distinct from remaining prepared-library material.

The owner halted tests and builds while implementation was underway. Source, migration target model, ERD, help and authored coverage are prepared. An isolated backend build had completed before that hold; it does not validate later edits. No automated suites, browser acceptance, further builds, migration application or API restart will run until the hold is lifted. Help corpus regeneration and full current-source verification are deferred with that checkpoint. Local schema/runtime activation remains pending; no Git mutation or deployment is included.

## Product need and confirmed decisions

### Sales Draft entry refinement (September 30, 2026)

Handling layout: Job notes occupies the left column beside Safety declaration. Storage requirements occupies the following full-width row in both default and exception mode. At narrow widths, the reading order is Job notes, Safety declaration, Storage requirements.

Verification: backend solution and local API builds completed with zero warnings/errors; frontend type checking, scoped lint, generated-help consistency and diff whitespace checks passed. Signed-in local browser checks confirmed configured storage text from the refreshed API, default-to-exception prefilling, retained exception text across type changes and restoration of the default. Job notes and Safety declaration had equal 64 px desktop heights and aligned edges; the storage exception spanned the full following row. The phased scope card measured about 139 px high with the checkbox and count in one row. Add source aligned to the heading's trailing edge and added exactly one row using both pointer and keyboard input. At the observed 436 px CSS viewport, notes, safety and storage stacked in order with no horizontal overflow. No Draft was saved or submitted during these checks. Automated suites and connected persistence acceptance remain unrun.

Compact intake refinement: place Use phases and the phase count in one wrapping row, with concise helper text. Use **Phase count** as the label, beside its compact input; keep that pair together when the row wraps and show validation below it. This label/layout adjustment is source-only; builds and tests remain on hold. Put Add source at the trailing edge of Biological-source composition. Storage uses the selected Sample type's Preservation requirements by default; show the configured text and expose a compact override only when Sales checks Use different storage requirements. In the existing nullable Draft storage field, null means use the Sample type and text means an explicit override (including an unfinished empty override). The order-choice API exposes the configured default; submission resolves it from the server-validated selected type and stores the final text in the existing order field. An empty override blocks submission, while incomplete Draft saves remain available. This changes no EF columns, authentication, dependencies or Website contract and requires no migration or existing-order conversion. Update both intake help and scoped frontend/backend coverage.

Presentation corrections: phase Actions use a shared automatic dropdown chevron; existing chevrons are not duplicated and direct actions retain no dropdown cue. Customer and Job fields use shared `Field` spacing and `NativeSelect` sizing to match text/search controls. Clearing Use phases, reducing the count and removing a phase use a Portal HTML confirmation with the affected scope and pricing consequences, initial Cancel focus, Escape cancellation and explicit focus restoration. Scope changes apply only after confirmation. UI principles and the agent guide require these shared patterns for future work. Phase permissions and persisted order behavior are unchanged. Phaeno help describes confirmation and cancellation.

Sales owns initial Customer order entry and agrees the phase scope with the
Customer. Commercial Operator access owns both Draft editing and submission for
pricing; laboratory execution access alone does not grant these actions.
Use a dedicated create/edit page: repeated source tables, phase-specific run
counts and prices, shared handling information and a retained summary meet the
documented complexity exception to modal entry. Intake remains a form-free list
and saved records open a view-first detail page.

Default entry has one scope and hides phase terminology. Checking **Use phases**
enables a configurable count and ordered phase sections. Each section retains its
biological sources, sample counts, sequencing runs per sample, optional proposed
USD standard price per sample, separate price per additional run and pricing note. Formal quote lines and TAT are
reviewed by phase and reconcile to one order quote and Customer acceptance.

**Save draft** retains incomplete scope without submitting or notifying the
Customer. A Customer, Department and Job name identify the saved **Draft**.
**Submit for pricing** validates complete scope and Customer pricing readiness;
it moves to Submitted for pricing. Commercial staff then prepare and issue the
quote. Staff entry uses a notes reminder about patient identifiers rather than a
mandatory no-PHI confirmation. Customer submission declarations remain intact.

The owner explicitly said to ignore existing orders for this refinement. No
conversion, backfill or deletion of existing orders is part of this change.

Customers purchase one order that Phaeno delivers through sequential phases.
Operators need a clear scope, input roster, delivery target and completion rule
for each phase. Commercial staff and Finance need enough phase attribution to
invoice the purchased work without turning POMS into a contract-management system.

Confirmed by the Product Owner:

- Keep one commercial order and one customer-facing Job with ordered phases.
  Each phase completes before the next begins.
- Generalize the separate-cohort model: configure the number of phases, their
  names and sample counts. The 350-sample example split into 50, 150 and 150 is
  illustrative, not a fixed three-phase structure or required quantity.
- Support mutually agreed rephasing of an open order/Job at logical workflow
  points. Completed Jobs cannot be rephased. Only unsent future samples are
  eligible, including while an earlier phase processes. The first required tube
  sent fixes that sample's phase assignment; in-transit, received, started and
  delivered samples cannot be rephased. Eligibility applies to affected samples,
  not the whole Job. This supersedes the earlier received-but-unprocessed rule.
- Capture only information needed for invoicing and laboratory operations. Do
  not introduce a Contract entity, legal-clause editor, contract-term collection,
  negotiation workflow or general dependency engine.
- Support requests to cancel unstarted phases. A request is distinct from an
  approved cancellation; started-phase cancellation is outside this enhancement.
- Receipt of the first required sample/tube closes cancellation-request
  eligibility, even if laboratory processing has not begun. This is distinct
  from the complete-receipt milestone that starts TAT.
- Phaeno chooses invoice timing and amount using the agreement handled outside
  POMS. Support upfront, phase-completion and mixed billing without collecting
  a contract or automatically issuing an invoice at phase completion.
- A phase completes by delivering its required results through the Portal,
  applying the same delivery rules as current Job completion.
- Each phase has its own agreed TAT expectation. Its clock starts on physical
  receipt of the last required sample for that phase. Apply the existing
  complete-tube rule: all expected tubes for every required phase sample must
  have been received, including across shipments.

The existing [Job deadline plan](LAB-JOB-DEADLINE-TRACKING-PLAN.md) and
[Order Management plan](ORDER-MANAGEMENT-PLAN.md) remain authoritative for
implemented single-phase behavior. This plan owns the phase extension.
The older multi-phase concept in the deadline plan is superseded by these
decisions. Implementation follows the confirmed decisions below.

## Generalized phase cohorts — first implementation scope

One Job contains one or more ordered phases, each with a distinct required sample
cohort. Configure phase names, ordering and positive sample quantities; do not
hard-code three phases, Roman numerals or the example quantities. The accepted
phase quantities and assigned sample roster reconcile to the accepted Job scope.

| Example scope | Required samples |
| --- | ---: |
| Job total | 350 |
| Phase I | 50 |
| Phase II | 150 |
| Phase III | 150 |

Each required sample belongs to one phase in this first implementation scope.
Retain multiple expected tubes, processing attempts and purchased runs for that
sample within its phase. Sample quantities and physical tube quantities remain
separate. Reuse of the same sample across commercial phases, or one phase's
outputs becoming another phase's inputs, requires a later explicit extension;
those workflows are not needed to implement the confirmed separate-cohort model.
Retain the current service and sample-type constraints rather than infer new
cross-service or mixed-sample-type order capabilities from this example.

A phase's first required tube receipt closes cancellation eligibility for that
phase only. Complete receipt starts that phase's TAT, independently of receipt
in the other cohorts. Delivering every required output for the first cohort
makes the next non-cancelled phase eligible to begin processing, subject to its
own input and scientific safeguards. Future cohorts can arrive early under the
existing receipt-triggered TAT rule.

Holistic sample counts cover the distinct accepted Job roster; phase counts
cover their own cohorts. A release for a Phase I sample cannot satisfy a Phase II
sample's output obligation. Fully successful closure requires all accepted
phase outputs; approved cancellation retains the separate cancelled-scope
outcome described below. Preserve original accepted quantities, membership and
receipt/delivery history when recording an authorized scope amendment; changing
membership must not fabricate receipt, restart TAT or transfer result coverage.

Phase prices use their accepted priced lines. Do not infer prices from cohort
size, require equal phase prices or couple invoice timing to the phase ordinal.

## Minimum phase information

Keep organization, Department, Customer access, billing profile and the Job
number on the existing parent order. Reuse approved scientific definitions and
existing Finance configuration; do not duplicate account settings on each phase.

| Information | Purpose |
| --- | --- |
| Stable phase identity, number and short name | Identify the ordered work and retain its history. |
| Purchased service/analysis and required result outputs | Define what operators must perform and deliver, using existing approved definitions. |
| Required sample membership and expected tubes | Determine authorized work, receipt completeness and result coverage for this phase. |
| Accepted priced lines assigned to the phase | Retain item/description, sales unit, quantity, unit price, approved discount where applicable and subtotal for invoice attribution. |
| Agreed TAT in business days | Freeze the phase's delivery expectation at order approval or mutually accepted rephasing; retain previous baselines. |
| First/complete receipt, processing start and results-delivery timestamps | Determine cancellation eligibility and keep arrival, execution and successful delivery distinct. |
| Original due date, current due date and operational forecast | Preserve the commitment, reasoned changes and current estimate. |
| Phase lifecycle and cancellation request/decision history | Explain whether the phase is planned, executing, delivered or cancelled, with retained actor/time/reason facts. |
| Accepted phase-plan amendments and mutual agreement | Retain before/after scope, affected sample assignments, timing/billing effects, reason, Phaeno approval and Customer acceptance without collecting contract terms. |
| Derived container, tube and sample-progress summaries | Show mixed progress from the actual work records rather than maintain a manually assigned aggregate laboratory stage. |
| Quote references, phase invoice allocations and adjustments | Track partial billing, invoiced/uninvoiced balances and accepted scope without duplicate billing. |

The parent quote groups its accepted priced lines by phase. Phase amounts must
reconcile to the one accepted order total. Billing contact, currency, tax and
payment terms continue to use the existing Finance-approved quote/invoice rules.
These are operational billing facts, not a new collection of contractual terms.

## Mutually agreed rephasing of an open Job

Rephasing changes how existing accepted sample obligations are grouped and ordered
for future execution. Support splitting, merging, reordering and redistributing
unsent future cohorts, including configurable phase names and quantities. It
keeps one commercial order and Job. Rephasing alone does not add or remove samples,
change purchased outputs or alter the accepted order total; actual scope/price
changes require the existing reviewed commercial amendment path. Every remaining
sample obligation belongs to exactly one phase in the current accepted plan.

Eligibility follows actual sample dispatch and work history, not a manually
selected status:

- Reject rephasing of a completed or otherwise closed Job.
- Only samples that have not been sent are eligible. The cutoff is the first
  required tube dispatched or handed over for transport to Phaeno, not shipping-
  kit dispatch or creation of a packing draft. Partial dispatch fixes the entire
  sample's phase assignment, including its remaining unsent tubes. In-transit
  samples are ineligible even before Phaeno records receipt.
- Keep sent samples, started work and delivered outcomes attached to their
  original phases. Receipt/accession is independently sufficient evidence that
  the sample is no longer unsent, even when a dispatch record is missing. A return,
  shipment correction or processing hold does not restore eligibility.
- In a future phase with both sent and unsent samples, only the unsent samples may
  move. Sent sample assignments remain fixed; a whole-phase split or merge must
  not move them indirectly. No sample with started work becomes eligible merely
  because its shipping record still appears unsent.
- An earlier phase may be executing while unsent future cohorts are rephased.
  A proposal must not rewrite that executing phase's membership, sequence,
  completion obligations or accepted terms, nor move new work ahead of it.
- Preserve actual dispatch, tube receipt, storage and material facts. Rephasing
  eligibility closes at sending; cancellation eligibility retains its separately
  agreed first-required-tube receipt cutoff, and complete receipt still starts TAT.
- Delivered and approved cancelled phase scope stays fixed. Resolve any pending
  cancellation request affecting the proposed scope before applying a new plan.
  Rephasing cannot reinstate cancelled work or disguise a cancellation as a merge.

Use a bounded commercial proposal and acceptance workflow, building on the
existing immutable change-proposal pattern described in the
[Order Management plan](ORDER-MANAGEMENT-PLAN.md). Phaeno proposes or reviews an
exact replacement plan for the selected eligible scope; an authorized Customer
organization administrator accepts it and authorized Phaeno staff approve it.
Either party can initiate discussion, but both must agree to the same proposal
before it takes effect. Retain before/after phase names, order, sample membership,
quantities, agreed TAT/deadline effects and phase price allocations, plus a short
reason, actors and timestamps. No contract document or general terms editor is
required. A decline leaves the current accepted plan in force.

Until agreement is complete, the current accepted plan continues to govern.
Recheck Job closure, affected sample/tube dispatch, processing starts, receipt,
release, invoice allocations, cancellation state and the current plan version
when applying the amendment.
If work or the reviewed facts have changed, require a refreshed proposal and new
agreement rather than silently apply a different plan. Apply one agreed plan
atomically and make retries return the same amendment without duplicating samples,
work authorizations, phases or billing. Sample dispatch, processing starts and
receipt updates use the same authoritative membership/version safeguards. A sample
sent after proposal review cannot be moved by stale acceptance. Before dispatch,
affected prepared shipment records and any phase-dependent packet information
must reflect the accepted plan; retain previously issued packet snapshots.

Preserve previous accepted plans and original phase identities in history.
Replaced future phases are superseded planning records, not completed or cancelled
work. Current Jobs/Phases views and result coverage use the current accepted
membership, while history explains where each sample was previously assigned.
Scientific records, shipping/tube identities and physical material are not cloned.

Receipt and TAT retain their existing meaning. Received samples stay in their
original phase; only unsent sample assignments can change. Derive cancellation
eligibility and complete-receipt TAT from the current accepted phase roster and
actual receipt events. A new phase containing only unsent samples has no receipt-
triggered TAT start until its required tubes arrive. If moving unsent obligations
out of an existing future phase leaves its remaining roster fully received, use
the actual last required receipt date, not the amendment date, to establish its
complete-receipt baseline; surface any resulting overdue deadline during review.
Retain all previous original deadline baselines and show old/new timing effects
in the proposal. Any changed TAT or delivery commitment needs explicit agreement
and retained adjustment history; regrouping must not silently erase a commitment.

Issued invoices retain their original phase attribution and immutable amounts.
Map existing billed portions to the retained obligations when reconciling the new
plan; allocate remaining unbilled accepted scope explicitly across the new phases.
A split or merge cannot create new billable balance or duplicate an allocation.
Use existing authorized Finance adjustments for an actual financial correction.
Rephasing never automatically invoices, refunds or conditions result access.

For example, after the first 50-sample phase is delivered, the remaining two
150-sample cohorts could become three 100-sample cohorts by mutual agreement,
provided all affected samples remain unsent. The same future-cohort change can
be agreed while the first phase is still executing. Its existing work stays fixed;
the Job still contains 350 accepted samples, and the newly agreed future order
continues to enforce sequential result-delivery gates.

## Sequential operations

Only one phase may execute laboratory work at a time. Future phases can be
planned and their samples received, but they cannot begin processing until the
preceding non-cancelled phase's results have been delivered. A phase also needs its
own required inputs and existing service, scientific and material safeguards.
Completing the predecessor makes the next phase eligible; it does not fabricate
a processing-start event or mean that an operator has performed work.

Proposed default: no additional Customer approval step between ordinary phases.
Phaeno can begin eligible work when the preceding phase is delivered. A customer
decision gate, if the owner needs one for a real workflow, is separate product
scope; do not infer it from the word phase.

Use explicit phase membership in execution and output lineage. Preparation trays
and sequencing batches remain operational groups and may cover several Jobs;
they do not define commercial phases. A sample barcode or batch status alone
cannot establish which phase's purchased result obligation has been fulfilled.
Do not duplicate physical samples or material balances to represent phases.

## Phase TAT and forecasting

Reuse the September 29 business-day policy: Monday-Friday in
America/Los_Angeles, excluding the configured Phaeno observed holidays. Each
phase freezes its agreed TAT and, at complete receipt, its original due date and
calendar revision. Partial receipt establishes no complete-receipt deadline.
Scientific acceptance, accession, predecessor completion and processing start
do not replace the physical-receipt trigger.

Early receipt has a deliberate consequence: a later phase's TAT runs while that
phase waits for its predecessor. If two phases have equal TATs and all their
samples arrive together, they have the same initial due date despite sequential
processing. Stage shipments by phase or set TAT expectations that accommodate
the wait. Do not silently delay a later phase's clock until activation.

Holds, cancellation requests and waiting for an earlier phase do not reset the
clock or silently move the commitment. Reuse authorized, reasoned date changes
and preserve performance against the original baseline. If calendar coverage is
missing, retain receipt and expose the correction need rather than invent dates.

Show the active/next phase deadline and strongest actionable risk, including an
early-received future phase already at risk. Forecast later phases with the
remaining predecessor work as well as their own work; do not report them as
already executing. Unknown receipt or duration inputs remain explicit unknowns.

## Result delivery and Job closure

Complete a phase only when every required sample/result obligation in its
accepted scope has an authorized, customer-accessible released output. Partial
releases accumulate without duplicate counting. Ready for release, internal
scientific approval, file upload, notification, Customer download or Customer
acknowledgement is not a substitute for Portal availability. A failed sample
cannot silently disappear from required coverage or count as delivered.

Retain first actual delivery and history. Apply the existing withdrawal/reissue
and retention-expiry distinctions within the phase: withdrawal removes current
coverage without rewriting first-delivery history; normal expiry of the agreed
download period does not undo delivery. If downstream work has already started
when an earlier result is withdrawn, retain that work and surface an operational
review; do not silently roll back execution or material use.

One delivered phase does not complete the Job. Proposed closure presentation:
all required phases delivered is successful Job completion; delivered phases
plus approved cancelled phases can close the Job with a distinct cancelled-scope
outcome. A cancelled phase never becomes Completed. Preserve delivered results,
invoices and phase history when remaining work is cancelled.

## Requests to cancel unstarted phases

Reuse the existing Customer cancellation-request/Phaeno-decision pattern. Permit
selection of one or more eligible unstarted phases, record the reason and scope,
and review outcomes for each phase. Retain approval or decline, customer-safe
reason, actor and timestamps. Do not delete the phase or rewrite accepted history.

Cancellation requests are eligible only before laboratory processing starts and
before the first required sample/tube is received. Receipt closes eligibility
even though receipt itself does not mean processing began. Partial receipt is
sufficient; do not wait until the full phase roster arrives. Planning and
assignment alone do not close eligibility.

While a request is pending, block processing starts for its selected phases.
Other eligible work is unaffected. Recheck eligibility atomically with
request submission, cancellation approval, receipt and a processing start, so
stale pages and concurrent actions cannot cancel or start protected work. Always
record a real physical arrival: if receipt closes eligibility while a request is
pending, retain both facts and require staff to resolve the now-ineligible request;
do not approve it from the earlier state or pretend the material was not received.
A declined request removes its start block, subject to the normal gates, without
changing dates. Approval removes the cancelled phase from outstanding delivery
obligations while preserving its separate cancellation outcome. Unexpected
arrival after approved cancellation remains a physical exception for staff review,
not an automatic reinstatement of scope or work authorization.

In the separate-cohort model, approved cancellation skips that phase in the
sequential processing gate; it does not automatically cancel later cohorts.
The next remaining phase still needs delivery of any earlier non-cancelled
phase and its own required inputs and scientific safeguards. Cancelling scope
does not dispose of received specimens, release results, restore consumed stock
or initiate physical handling commands. Dependencies on preceding phase outputs
remain outside the first implementation scope.

Existing issued invoices remain immutable. Where a financial correction is
needed, use authorized, append-only Finance adjustments linked to the phase.
Do not calculate cancellation fees, refunds or zero-charge outcomes from general
contract terms; staff resolve any applicable charge through existing approved
commercial/Finance actions.

## Phase invoicing

Current PSeq invoicing is triggered by Job completion; see the
[order-to-cash plan](PSEQ-ORDER-TO-CASH-GAP-CLOSURE-PLAN.md). For the future phase
workflow, the owner selected deliberate Phaeno issuance. Authorized Finance staff
choose when to issue an invoice and the portion of accepted scope to bill, based
on the externally managed agreement. Results delivery does not automatically
issue an invoice. An accepted phase may be billed partly upfront and partly after
delivery; keep billing progress separate from execution/delivery progress.

An invoice uses accepted phase lines and retains the parent Job number plus
explicit phase attribution for each billed portion. A phase may have several
invoices; one invoice can include portions from several phases of the same order.
Track the agreed phase amount, issued allocations, adjustments and remaining
uninvoiced amount. Partial monetary billing does not alter purchased sample/run
quantities or authorize additional work. Do not bill beyond accepted scope without
an authorized commercial change. Apply existing billing-readiness, frozen/current
approved tax, payment-term, PDF, payment allocation and adjustment rules.

For Finance, show unbilled accepted scope and delivered scope still awaiting
invoicing without assuming a contractual due milestone. Enter only the current
invoice amount/scope and ordinary required invoice information, not an installment
schedule or rule engine. Billing setup failures remain Finance readiness issues.
Invoice/payment status never gates PSeq result release or defines scientific
completion. Cancellation charges/credits remain deliberate retained Finance
decisions and must not be inferred from a cancellation status.

Each issuance must be idempotent for its explicit billing allocation/request,
while permitting a later invoice for a different unbilled portion of that phase.
The final Job completion path must not automatically invoice a phased order or
issue a second invoice for previously billed scope. Quote lines, invoice lines
and credits/debits retain explicit phase attribution so Finance can reconcile
the whole order and recover failed issuance without duplicate charges. Final
closure does not automatically bill cancelled work or the remaining balance.

## Status ownership and mixed progress

The owner's latest refinement separates underlying sample progress from the
Job/phase summary and permits independent phase or holistic Job list views.
This supersedes the earlier Phase 2 - Library Prep example as the sole phase
status: a phase can contain several laboratory stages at once.

Keep the phase's coarse lifecycle (Planned, In progress, Results delivered,
Cancelled) distinct from laboratory progress. Waiting for an earlier phase,
missing inputs and blocking exceptions explain eligibility or risk; do not
pretend every sample shares one scientific stage. Derive successful completion
from phase-specific release coverage, never from a manually selected label.

Authoritative progress belongs to the actual unit of work: shipping containers,
physical tubes, processing attempts and outputs. Sample progress is scoped to
that sample's assigned phase. One cohort can have delivered results while the
next cohort is unstarted, and members of an executing cohort can be at different
stages. Retain underlying tube/run differences rather than duplicate a physical
sample or overwrite its history. A container can hold tubes from several cohorts;
derive its contribution to each phase through the actual tube membership, without
claiming that container arrival establishes complete receipt for every phase.

Present separate, labeled summaries:

- Incoming container shipping/arrival counts, with states such as in transit and
  received. Courier delivery or container arrival does not establish verified
  receipt of every expected tube.
- Tube receipt/accession counts against the phase's required tube roster. Use
  these physical facts for the first-receipt cancellation cutoff and complete-
  receipt TAT trigger, keeping those milestones distinct.
- Sample-within-phase laboratory-stage counts. Each summary bucket counts its
  member once; detail preserves multiple tubes, attempts and purchased runs.
- Required results delivered versus outstanding. All purchased output obligations
  for a phase sample must be covered before that member counts as delivered.
- Holds, failures and other exceptions alongside progress. Exception counts may
  overlap stage counts; a hold on two samples does not put an otherwise working
  phase wholly on hold.

Mixed progress is a derived description, not a new manually maintained status.
Always show the useful distribution alongside it. Retain earliest outstanding
stage as a labeled remaining-work summary where helpful; do not present it as
the stage of every sample. Filters for a laboratory stage match phases with any
sample work at that stage, so mixed phases are discoverable. Counts, units and
scope must remain explicit; do not sum containers, tubes and samples together.

## Customer and Phaeno presentation

Recommended Phaeno default: a Phases view with one row per phase, its parent Job
identity, lifecycle, progress counts, delivery deadline/forecast and exceptions.
Provide a Jobs view with one row per Job, phase outcomes and the active phase's
mixed progress. Both views use the same scoped facts and preserve list context.
Cancelled and delivered phase counts remain separate; neither view creates a
second commercial order or a manually assigned whole-Job laboratory stage.

Keep the Customer's one-Job discovery view. Show, for example, Phase 2 of 3 -
In progress, followed by the appropriate customer-safe sample-stage distribution
and result delivery count. Keep Received as the intake label. The Job detail
lists ordered phases with scope, lifecycle/progress, agreed TAT, receipt-triggered
due date, results and cancellation outcome; future-phase samples must not make
the active phase look stalled at Received.

Staff open the view-first Job workspace to review phase details, samples, outputs
and invoice attribution. Offer Propose rephasing through the existing Actions
menu for eligible open Jobs, with a before/after plan and timing/billing review.
Use bounded edit/cancellation/decision modals and the
existing single Actions menu per context. Phase permissions inherit the parent
organization/Department scope and existing business roles; do not broaden access.
No separate contract-management navigation is introduced.

## Acceptance criteria and success measures

- One approved order/quote and Job contain configurable ordered phase scopes,
  names and sample quantities. Different phase counts and cohort sizes work
  without fixed three-phase assumptions; accepted sample quantities and phase
  prices reconcile to their respective Job totals.
- The illustrative 350-sample Job has 50, 150 and 150 distinct phase members.
  Each required sample is assigned once; phase and holistic counts reconcile
  without double-counting tubes, attempts or purchased runs as extra samples.
- Processing phase 2 before phase 1 result delivery is rejected. Delivery makes
  phase 2 eligible without inventing its processing start.
- Receipt split across shipments or several tubes starts each phase's TAT only
  after its complete required roster is received. Early future-phase receipt,
  missing calendar coverage, holidays and date adjustments remain explainable.
- Partial, duplicate, failed, withheld, withdrawn and reissued results preserve
  phase-specific delivery coverage and the existing scientific/release rules.
- A phase cannot complete from another cohort's result release. No phase
  completion alone closes a multi-phase Job.
- An eligible unstarted/unreceived phase cancellation request supports approval/
  decline and retained reasons, blocks its pending start, and rejects stale or
  concurrent unsafe actions. First required tube receipt closes eligibility,
  including before processing and before TAT starts; pending requests retain
  subsequent receipt evidence. Started/completed phases and material history
  remain protected.
- A required tube received for one cohort does not close another cohort's
  cancellation eligibility or start its TAT. Approved cancellation skips only
  the selected phase; later cohorts retain their own processing gates. Mixed
  delivered/cancelled closure is distinguishable from every phase delivered.
- Finance can deliberately invoice accepted phase scope upfront, after delivery
  or in several portions. Combined-phase and repeated partial invoices retain
  attribution; retries and final Job closeout cannot double-bill or exceed
  accepted scope. Billing issues do not prevent result delivery.
- Mutually accepted rephasing can split, merge, reorder and redistribute
  unsent future cohorts, including while an earlier phase executes. Completed
  Jobs and sent/started/delivered samples remain protected; a return or processing
  hold does not restore eligibility. No proposal takes effect without both parties'
  agreement to its exact scope, timing and billing effects.
- The 50/150/150 example can become 50/100/100/100 for an open 350-sample Job when
  the future samples are unsent. Decline, stale acceptance, concurrent dispatch/
  start/receipt/completion and retry paths cannot partly apply or duplicate a plan.
- First required tube dispatch makes the whole sample ineligible, including its
  unsent reserve tubes. In-transit and received-but-unprocessed samples cannot
  move. A mixed sent/unsent cohort permits only its eligible unsent sample moves;
  shipment preparation or an outbound empty kit alone does not close eligibility.
- Receipt, storage and material history for fixed samples remain intact. No clock
  restarts at amendment time; moving unsent obligations out of a partially received
  phase uses its remaining roster's actual last receipt date if now complete.
  Original due dates stay visible and changed commitments require agreement.
  Rephasing cannot restore cancellation eligibility for a received cohort.
- Rephasing preserves original phases, releases and issued invoices in history,
  maps billed obligations without double billing, and reconciles unchanged sample
  and commercial totals across the current plan. Superseded future phases cannot
  count as delivered or cancelled obligations.
- Customer and Phaeno views agree on phase scope and outcomes, maintain tenant/
  Department authorization, and preserve list/detail/modal accessibility rules.
- A phase with samples awaiting receipt, processing and already delivered remains
  In progress with an accurate distribution; no single stage falsely describes
  its entire roster. Earlier-cohort delivery cannot complete a later cohort.
- Container/tube/sample/result counts use explicit units and correct denominators.
  Partial tube receipt does not claim all sample intake complete; exception flags
  do not double-count stage membership or imply a whole-phase hold.
- Phases and Jobs list views reconcile to the same phase outcomes and active
  progress. Stage filters find mixed phases containing matching sample work.

Success means every delivered obligation, phase deadline, cancellation decision
and billed amount can be explained from retained phase records within one Job.
No contract-term collection or duplicate order is required to operate the phases.

## Implementation readiness and boundary

Readiness assessment: the product model is ready for implementation within the
generalized separate-cohort scope. The owner's 350-sample example resolves the
input-workflow question, and the explicit request to generalize confirms that
phase counts, names and sample quantities must be configurable. Commercial scope,
sequential processing, receipt-triggered TAT, cancellation eligibility, deliberate
invoicing, result delivery and mixed-progress presentation are defined. The owner
also confirmed mutually agreed rephasing of unsent future cohorts while other
phases execute. The first required tube sent fixes sample phase assignment;
completed Jobs and sent/received/started/delivered samples are protected. Include
the retained plan/receipt/deadline/billing safeguards above in implementation.

Codex owns the remaining engineering design: feature-owned persistence,
phase-specific authorization and input/output lineage, invoice allocations,
API/UI changes, migration design, complete ERD updates and verification coverage.
Retain current service/sample-type constraints for the first implementation;
shared samples across phases, result-dependent phases and broader offering
combinations are later product scope rather than blockers for this model.

Before persisted-model implementation, identify affected existing records and
workflows and present concrete one-time repair/conversion, reseeding or reset
options with a recommendation and data-loss implications. Obtain authorization
for destructive remedies or migrations outside the configured local development
database. Do not add compatibility fallbacks solely to preserve the old model.

Update the living test plans and audience help when implementation is authorized;
keep future behavior out of current in-portal guides during planning. This
readiness assessment does not authorize code changes, migrations, test execution,
Git publishing or deployment. The production deployment hold remains in force.

## Implementation decisions and local evidence — September 30, 2026

- Use feature-owned Commercial phase, proposal, cancellation and billing
  attribution records alongside the existing one-Job Laboratory authorization.
  Share one per-Job transaction lock with physical receipt, dispatch, roster
  writes and actual scientific starts. Tenant decisions use the existing active
  organization/Department administrator scope; Phaeno proposals use Commercial
  authority and invoicing uses Billing authority. No authentication or dependency
  changes are required.
- Preserve the issued quote's phase snapshot, accepted proposal before/after
  snapshots, physical receipts, deadline changes and issued invoice allocations.
  Finance chooses explicit monetary portions against accepted priced source
  lines; never calculate a phase price from its sample count. Native PSeq accounts
  receivable owns phase invoice issuance; no new external accounting/provider
  wire contract is introduced.
- Maintain one complete named Job roster before Laboratory authorization, as in
  the existing workflow. Configurable cohorts partition that roster; future
  phases may be unsent. Cancelled scope retains its declared sample identities,
  source/run quantities and commercial history. The separate-cohort extension
  does not introduce result-dependent registration or reuse a sample across phases.
- Raise the existing accepted Job/sample count ceiling from 100 to 10,000 to
  support larger cohorts while retaining the existing 10,000 purchased-run cap.
- The phase editor is a bounded modal from the view-first Job detail. It handles
  cohort counts, TAT and priced portions; rephasing adds explicit sample assignment
  and a reason. Customer review/decision, cancellation and Finance invoice dialogs
  remain distinct, with one Actions control per context.
- Operator lists default to phase rows and offer holistic Jobs. Mixed stages are
  derived per sample. Container, physical tube and sample counts retain separate
  units; holds and failures overlap stages. Phase forecasts include preceding
  delivery waits only when all required policy/calendar evidence is available.
- Cleanup authorized by the owner removed the sole local Job 6MZBLUGM
  (5ea764dd-6185-4fa1-a676-4187d971d050) and its scoped children from
  localhost / phaeno_ops_clean_20260919 in a serializable transaction. Verification
  found zero Jobs, LabSamples and LabWorkOrders. Organizations and the existing
  stock kit were retained; obsolete Job reservation/request references were
  cleared. No production data was changed or reseeded.
- Two backend compilation checkpoints succeeded with zero warnings/errors.
  Automated tests have not been executed. Frontend/schema/manual acceptance
  verification is still in progress; this is not release or business acceptance.
- AGENTS.md now requires task build-output cleanup. Owner-authorized workspace
  cleanup removed 275 output/cache directories and 32 additional flat compiled
  output trees. Fresh verification output will be removed after use; source,
  dependencies, application data and evidence reports are preserved.

### Final integration refinements

- Finance has a Billing-role Job picker and minimal phase-balance reads, without granting commercial or laboratory workspace access. Phase invoice responses expose only billing information. Accepted pre-tax offers use the approved billing profile at issuance; quoted tax/billing snapshots stay frozen. Monetary portions retain source priced lines and accepted quote identity instead of inferring price from sample counts.
- Complete physical receipt reconciles every named sample's full declared tube count, including tubes not yet packed. Sent samples keep both phase identity and position. Pending cancellation and sequential starts share the phase-plan lock; completion also shares the existing order-operation lock.
- Existing whole-Job cancellation decisions may approve only complete eligible phase cohorts. This prevents partly cancelled cohorts with impossible output obligations. New laboratory identities created after early phase cancellation inherit the cancelled disposition.
- Sample assignment browsing is bounded to 25 rows; the decision modal retains the exact original/proposed plan and named moves. Customer statuses aggregate mixed attributed progress; internal accession progress remains visible as Received externally.
- Authored domain, transaction and UI verification cases were updated. They have not been executed; the living test plans retain connected, browser, physical and scientific acceptance work.

### Local schema and verification closeout

Applied 20260930164656_AddSequentialLabJobPhases only to the configured localhost:5432 database phaeno_ops_clean_20260919. Preflight confirmed zero Jobs, Samples and Lab work orders following the authorized scoped purge; postflight confirmed all five phase tables and the applied migration identity. EF reported no pending model changes. The complete ERD covers 228 application tables, 3,361 fields and 541 foreign keys.

The backend solution builds with zero warnings/errors, frontend type checking and lint pass, and docs:check validates the generated 56-guide corpus. The documentation generator's direct file write hit a local permission error; the same generator output was persisted with the workspace file writer and then validated by docs:check. These are static/schema checks, not automated test execution or end-to-end acceptance. No Git mutations, dependency upgrades, authentication changes or deployments were performed. The September 28 production release hold remains in force.

Final build cleanup: after the successful backend and frontend production builds, removed 95 remaining output/cache directories and the temporary migration SQL. Earlier cleanup removed 275 output/cache directories and 32 flat compiled-output trees. The final inventory found zero DLL, PDB, EXE, deps.json or runtimeconfig.json output files outside installed dependencies; source and installed dependencies were preserved. Active VS Code C# design-time tooling automatically recreated empty bin directories and a few small obj metadata/generated-source files. The editor session was left running. No automated test suites were executed.

### Sales Draft schema and verification closeout

Applied `20260930203514_AddCommercialOrderDraftScope` only to the configured local database `localhost:5432 / phaeno_ops_clean_20260919`. The migration adds Draft JSON, phase scope/proposal fields and explicit sample/tube-pair phase lineage. Preflight and postflight both found two existing orders and zero pairs; no existing order conversion, backfill or deletion was performed. The required pair foreign key has no fabricated default. The pre-migration backup is retained at `backend/artifacts/order-draft-entry/before-draft-scope.dump`. EF reports no pending model changes. The regenerated complete ERD covers 228 tables, 3,368 fields and 542 foreign keys.

The backend solution and frontend production build pass. Backend compilation includes the authored test cases and reports zero warnings/errors. Frontend type checking, lint, `docs:check` (56 guides) and `git diff --check` pass. Unsaved browser inspection verified the phaseless default, phase controls, blank optional turnaround after enabling phases, and two distinct run/rate scopes totaling five samples, eleven runs and USD 205.00. A narrow layout inspection found equal document/viewport widths and visible keyboard focus on Submit for pricing. These limited UI checks do not establish save/reopen, submission, quote issuance, Customer acceptance or physical/scientific acceptance. The running local API was not restarted with this build; connected acceptance remains pending. Automated tests were authored but not executed.

Temporary task scripts and isolated backend/frontend build output are removed after verification; the database backup and active development sessions are preserved. No Git mutation, dependency/authentication change or deployment was performed. The September 28 deployment hold remains in force.
