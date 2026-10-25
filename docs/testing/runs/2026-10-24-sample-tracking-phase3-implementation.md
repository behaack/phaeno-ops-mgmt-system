# Sample tracking Phase 3 — local implementation

> Raw sample-tracking test outputs linked in this dated record were removed at the Owner's request after consolidation. The archived links now open the retained result/cleanup ledger; screenshots and raw files are no longer retained.

October 24, 2026. Owner authorized implementation and confirmed Job-specific paid retention, optional box positions and procedure-specific actual timing/participant requirements. No deployment or DPS changes; no Git publication or hosted database write.

## Implemented behavior

- Tube lifecycle: explicit exhaustion, return, custody transfer and destruction; actual event time/precision and original offset, recording actor/time, method, reason, prior exact quantity and optional measured disposition quantity/unit. Return/transfer retain destination and shipment/handover reference. Terminal states prevent further laboratory use.
- Retention and preservation: supervisors record paid-work retain-until dates from agreed Job terms, and place/release reasoned tube holds. Due/hold/unknown-retention work is discoverable in Jobs. No automatic physical disposition or invented paid default. Trial terms, closure dates and holds govern tube actions; its material summary must match accounted-for tube states. Awaiting Trial closure is distinct from missing paid retention terms.
- Storage: registered barcode boxes with room/freezer/rack/shelf, scanned placement, optional unique occupied positions, versioned collective moves and immutable receipts. Known boxes are confirmed during accession; unknown boxes are registered. Historical text locations are unchanged and remain explicitly unregistered. Tray/output working-location transitions end box occupancy with an event. Sample investigation/report includes only box moves during that sample's recorded occupancy and no other tube contents.
- Timing: pinned approved procedure requirements for actual start/end intervals and minimum named participants; explicit minute offsets, interval order/future validation, distinct participant IDs and step roles, explained per-tube performance exceptions for shared commands. Value corrections preserve performance; sample amendments carry interval/participant evidence through independent review. Master-mix attributed steps require immutable independent supervisor decisions before readiness. Investigation includes pinned mix steps and performance/review evidence. Existing approved procedures and historical step evidence receive no invented requirements or times.
- Updated Phaeno help, owning contracts and living backend/frontend/E2E test plans. Existing accession fixtures include registered-box setup; focused Phase 3 regression sources are authored.

## Local database preservation

Reviewed additive migration `20261024203101_AddLabPhysicalLifecycle` adds four tables and three nullable tube fields. Applied only to verified loopback development database `phaeno_ops_clean_20260919`. EF reports no pending model changes.

[Archived receipt: Before](2026-10-24-sample-tracking-browser-acceptance-ledger.json) and [Archived receipt: after](2026-10-24-sample-tracking-browser-acceptance-ledger.json) readbacks match all 29 existing tube records and all protocol-version bytes. Website intake tables retain unchanged counts/content fingerprints (both were empty locally). New box/event/review tables contain zero rows after migration; no retrospective associations or scientific backfill. No test fixtures were inserted into configured development. The complete generated ERD contains 253 model tables, 3,690 fields and 605 foreign keys, plus migration history.

## Verification checkpoint

Compilation/static verification only: solution build with zero warnings/errors; frontend TypeScript and scoped ESLint; UI source guard (772 sources, two existing exceptions); generated help freshness (62 guides, corpus `7937d7d9ea9c`); EF model consistency; migration readback/preservation; diff whitespace checks. No dependencies or authentication changes.

Authored regression scope: ten domain cases plus one real EF/PostgreSQL lifecycle/occupancy/replay/privacy/hold/immutability case, and three frontend timing cases. Existing accession regression sources now explicitly confirm known boxes. **These tests have not been executed in this Phase 3 turn.** Browser acceptance likewise remains unrun, under the repository's explicit request-only test rule.

## Remaining acceptance

Run Phase 3 regression and browser acceptance when requested, including the affected accession, preparation, mix, Trial and investigation journeys. Use isolated synthetic local data; verify failures, replay/stale conflicts, independent review, dialog regions, focus/draft recovery, phone/desktop, both themes, accessibility and overflow. Physical scanners/box labels, bench chronology, scientifically qualified procedure content and hosted/provider acceptance are separate gates. The Phase 2 demo-procedure review remains authoritative: implementation does not certify SOP sufficiency. Deployment and DPS integration remain excluded.


Subsequently requested regression/browser execution is recorded in [Phase 3 verification](2026-10-24-sample-tracking-phase3-verification.md): 99 backend, 84 frontend and four connected browser scenarios pass. That record supersedes this implementation-time unrun checkpoint.
