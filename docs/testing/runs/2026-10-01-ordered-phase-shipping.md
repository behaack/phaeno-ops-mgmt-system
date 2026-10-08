# Ordered phase shipping refinement — October 1, 2026

Local implementation checkpoint for the owner's phase-order, Next step and
accepted-Job shipping-heading refinements. The earlier
[on-demand kit checkpoint](2026-10-01-on-demand-phase-kits.md) records the initial
implementation; its bulk selection behavior is superseded by current-phase-only
shipping.

## Implemented behavior

- Accepted paired-preparation Jobs show **Shipping: Phase name (X samples)**.
  The heading uses the current phase's name and physical sample count. No
  repeated phase line, phase picker or phase-status overview appears below it.
- The earliest unfinished active phase is selected by position. Every required
  sample's purchased outputs must be Portal-accessible before the next phase
  opens. Preparation, handoff, partial delivery and historical delivery timestamps
  do not advance the phase. Approved cancelled/superseded phases are skipped.
- **Next step** names the current action and has a trailing button to request
  kits, open saved kit receipt, prepare samples, review shipments or follow phase
  progress. Earlier open whole-Job requests have a usable review action. Supply
  eligibility refreshes when the phase or plan revision changes.
- Shared backend guards enforce the current phase for requests, pairing,
  finalization and carrier handoff. Pending cancellation blocks new shipping
  work. Saved fulfillment history and physical receipt remain reviewable.

## Verification performed

- `dotnet build backend/PSeq.Operations.slnx --no-restore`: API, modules, tools and
  test assembly compile; zero warnings and errors. The API was rebuilt once more
  after help regeneration and its owned local IIS process restored.
- `pnpm run typecheck`: pass.
- Scoped ESLint with `--max-warnings=0`: pass for the shipping component, detail
  integration, phase-query hook, helpers and authored test sources.
- `pnpm docs:check`: pass, 56 guides; corpus prefix `7f48ba4d648e`.
- `git diff --check`: pass with the repository's CRLF whitespace convention;
  Git reports informational LF-to-CRLF conversion warnings.
- Local API health returns HTTP 200. Health proves service availability only.

Manual browser verification used the actual React components and shared
primitives with a synthetic offline adapter. No operational API write, dispatch,
receipt, cancellation or data repair was submitted. Request, receipt, prepare,
send, await-results and finished states were inspected. Full delivery advances
the heading and workflow automatically; partial coverage retains the current
phase. Unknown/error states offer refresh instead of selecting an unverified
phase. Request dialogs retain header/body/footer, initially focus Cancel and
return focus to the invoking action. Keyboard opening/closing and navigation
callbacks were checked. A final preview confirmed **Shipping: Phase 1 (15
samples)** changes to **Shipping: Phase 2 (10 samples)** without a selector or
repeated phase line.

Light and dark layouts were visually inspected. At 390 × 844, the document width
is 390 px with no horizontal overflow; Next step text uses the available width
and the button ends the card. The request dialog remains within the viewport.
The temporary viewport override was reset and verification tabs, preview server
and helper files were removed. The user's existing Portal development server
and browser tab were preserved.

Evidence (synthetic preview):

- [Current phase](../../../output/phase-sequence-evidence/current-phase.jpg)
- [Narrow layout](../../../output/phase-sequence-evidence/mobile.jpg)
- [Dark theme](../../../output/phase-sequence-evidence/dark.jpg)

## Confirmation presentation follow-up

The owner removed confirmation guidance from unaccepted Jobs. The workspace
now shows **Review and Accept Order** above the existing order scope, pricing
and quote Actions menu. The step strip and **Your next step** card are absent
before placement/acceptance; exceptional status feedback remains available.
After acceptance, the existing current-phase shipping workspace supplies its
four shipping steps and phase-specific next action.

Actual-component browser preview with synthetic data confirmed zero shipping
steps and no confirmation next-step card before acceptance. Keyboard opening
of Actions exposes Accept quote, Propose changes, Decline quote and the separated
PDF download action. A preview state change, without accepting any real quote,
shows **Shipping: Phase 1 (5 samples)** and four phase shipping steps. At 390 px,
the review page has no horizontal overflow. TypeScript, scoped ESLint and generated-help
consistency checks pass; corpus prefix `7b0ad047eed5`. No automated test execution
or operational write was performed.

Evidence:

- [Before acceptance](../../../output/order-review-evidence/before-acceptance.jpg)
- [After acceptance](../../../output/order-review-evidence/after-acceptance.jpg)
- [Narrow review](../../../output/order-review-evidence/mobile-before-acceptance.jpg)

## Kit receipt and status follow-up

A tenant-scoped, read-only local review of UH2EKGZY found one phase-one kit,
capacity 20, recorded physically received on September 29. It covers the five
samples and no outbound request was created. The jump to Prepare was the
intended received-stock path, but its explanation was missing.

The shipping steps now show **Existing kits allocated** and **Received · existing
stock**, with an explanation that the whole phase is covered and no new delivery
is needed. Allocated stock must be explicitly usable and cover the full sample
count; unreceived stock is not usable in the API pair workspace or counted by
phase supply. Any outstanding outbound request retains Receive as current.

The Receive caption shows **Request received**, **Sent**, **Received**, **Partially
sent** or **Partially received** and announces status changes. Actual-component
offline browser review covered each state, insufficient/unreceived allocations,
received-stock preparation navigation, receipt-modal opening/closing and focus
return, 390 px reflow and dark appearance. Synthetic requests used an offline
adapter; no request, dispatch, receipt or other operational record was written.

API/test assemblies build with zero warnings/errors. A repeat normal build was
blocked after Visual Studio restarted the local API; an isolated output build
passed without interrupting the restarted session. API health remains healthy.
TypeScript, scoped ESLint, help generation/check and diff whitespace checks pass;
help corpus prefix `090fa695c643`. Focused component/helper/PostgreSQL regressions
were authored and compiled, but automated tests were not executed.

Evidence:

- [Request received](../../../output/phase-kit-status-evidence/request-received.jpg)
- [Narrow layout](../../../output/phase-kit-status-evidence/mobile.jpg)
- [Dark narrow layout](../../../output/phase-kit-status-evidence/dark-mobile.jpg)

## Phase disclosure and preparation readiness follow-up

Accepted Customer/Partner Jobs now start with Phases (or Delivery scope for one
phase) collapsed. The aligned disclosure label supports native keyboard
activation; View phase progress expands it before scrolling and focus. A
source-exact disclosure preview with synthetic phase-card bodies confirmed the
closed default, Enter/Space toggling, shortcut navigation and 390 px reflow.

The actual preparation component was reviewed with a synthetic offline API
adapter. Its header now fills the top of the card, has 12 px vertical padding,
an h3 heading and a bottom divider. At 390 px the document fits the viewport.
Its phase explanation now follows sequential delivery. Temporary preview tabs,
server, source, cache and viewport overrides were cleaned up.

A read-only local review of H7QS6TY8 confirmed Phase 1's physical kit
KIT-F45E0AF02F414A30887FD072D02D024F: 20 registered tubes, completed assembly and
recorded Customer receipt. Its optional second-rescan marker is null. Current
assembly/dispatch code and existing regressions accept a complete exact product
and barcode-namespace roster without that second scan; preparation had an
inconsistent mandatory marker check. Preparation and phase stock coverage now
share the completed-assembly/complete-roster rule, while retaining receipt,
expiry, reservation, shipment binding and phase guards. No stock record was
repaired or rescan marker fabricated.

A temporary read-only .NET probe loaded this actual kit through EF and called
the compiled shared predicates: complete prepared roster, physical usability
and the Save kit availability guard all returned true. After the local API
restart, the existing database shows a saved selection for this exact kit and
Phase 1 of H7QS6TY8 at 2026-10-02 00:14:17 UTC. The agent did not submit that Save
kit action or any operational write; this is observed record evidence, not an
agent-performed connected walkthrough.

Normal backend/API/test assemblies compile with zero warnings/errors. Focused
domain/PostgreSQL regressions were authored and compiled but not executed.
TypeScript, scoped ESLint, generated-help and whitespace checks pass; help
corpus prefix `7df7f35f179e`. The local IIS API was rebuilt/restarted and health
returns HTTP 200. No deployment, migration, Git mutation or PDF change was made.

Evidence (synthetic layouts):

- [Collapsed phases](../../../output/phase-preparation-evidence/collapsed-mobile.jpg)
- [Preparation header](../../../output/phase-preparation-evidence/header-desktop.jpg)
- [Narrow preparation](../../../output/phase-preparation-evidence/header-mobile.jpg)

## Remaining acceptance boundaries

Focused unit/PostgreSQL/frontend test sources were authored and compiled but
not executed: automated test execution was not requested under AGENTS.md.
Connected Customer/Partner walkthroughs, direct-API guard acceptance, actual
physical kit receipt and scientific result delivery remain separate acceptance
work. The current POMS session cannot open the Customer Lab services workspace;
no organization or permission was changed to obtain access.

No Git mutation, deployment, migration or database data write belongs to this
refinement. No PDF presentation changes were made by this refinement.
