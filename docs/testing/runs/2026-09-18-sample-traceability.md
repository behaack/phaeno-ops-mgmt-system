# Sample traceability verification — September 18, 2026

Scope: current local, uncommitted traceability work, including the earlier result lineage and personal performance slices. No production deployment or activation is represented by this record.

## Backend

The final focused run passed **43 tests, zero failures, zero skips**. It includes domain checks for explicit result attribution, immutable evidence, timing/late entries, scientific metadata and reports; full persistence/ERD checks; the failed-first-tube/reserve-second-tube PostgreSQL result journey; and four shared-preparation journeys.

The PostgreSQL journey verifies paired sequencing inputs, actual run identities, scientific metadata capture and conflicting replay rejection, result-to-tube reads, report generation replay, exact manifest hash/download, printable HTML, wrong-sample denial, organization-scoped reverse lookup, preservation after later events, and 10,000 same-time events traversed with no duplicates or omissions. Shared preparation verifies the separate performer/recorder evidence, report retry, equal persisted receipt/evidence times, specimen-scoped attachment metadata without storage keys, and denial to an external actor.

Database target: a separately initialized PostgreSQL 18 cluster bound to loopback port 55441, database `traceability_reference`. Application migrations were applied from empty. Fixture work is transactional and rolled back; this is synthetic evidence, not live provider or bench acceptance.

Artifact: `artifacts/sample-investigation-20260919/traceability-final.trx`.

## Frontend and browser

The focused frontend unit run passed **41 tests in five files**: performance input/time-zone validation, performer/recorder display, standalone execution, preparation dialogs and configuration preview. Typecheck and focused lint are part of the final checkpoint.

Browser suites: `lab-protocol-execution.spec.ts` and `sample-investigation.spec.ts`: **12 passed in 23.1 seconds**, on Chromium desktop and Pixel 5 layouts. They cover guided recording, QC corrections, stale writes, keyboard focus, daylight-saving gaps/repeated hours, historical unknown lineage, saved reports, related-sample empty states, source failures, disabled report generation after a source error, light/dark rendering, accessibility scans and 320-pixel reflow. These are simulated UI/API fixtures; actual backend/controller evidence is listed separately above. Desktop/mobile light/dark screenshots are saved under `artifacts/sample-investigation-20260919/`; the mobile dark screenshot was inspected visually. Typecheck, touched-file lint and documentation corpus checks pass (56 guides; corpus `c1f29f0a3b3a`).

## Defects and verification corrections

- Corrected the earlier unrun lineage fixture to follow valid work-order transitions and persist an attempt/execution before recording their failure relationship; these were fixture setup errors.
- Fixed a real timestamp consistency defect: PostgreSQL stores microseconds while embedded JSON had retained .NET's finer ticks. Both preparation and standalone step commands now use the same microsecond clock, preserving exact receipt/evidence equality.
- Fixed the investigation title's missing semantic heading, caught by the browser assertion.
- Removed a duplicate event API declaration introduced during editing; typecheck/browser build detected it before completion.
- Theme tests now initialize the actual application theme before rendering, instead of assessing controls during the theme color transition.

## Schema and documentation

Migrations `20260919033608_AddLabInvestigationReports` and `20260919034706_AddScientificLineageEvidence` were applied only to verified local development (`localhost:5432/phaeno_ops`) and the disposable reference target. They add a report table and two nullable JSON columns; they do not infer historical evidence. The original `AddLabResultLineage` migration is also present. ERD generation covers 195 modeled tables, 2,866 fields and 447 foreign keys, plus the documented EF history table. No pending model changes remain.

The Phaeno laboratory guide and documentation corpus were regenerated (56 guides). The [investigation contract](../../plans/LAB-SAMPLE-INVESTIGATION-CONTRACT.md) states authorization, limits and open decisions.

## Not established by this checkpoint

Mandatory scientific profiles, governed on-behalf/time-amendment review, an approved investigation retention duration/start event, lifecycle cleanup/holds and hosted backup/restore of private evidence, real producer/file/instrument acceptance, production activation, and final laboratory-owner acceptance remain open. The [subsequent local restore rehearsal](2026-09-18-investigation-restore.md) separately proves database/private-file restoration of a synthetic chain and adds verified, sample-scoped supporting-report downloads. Its 43-case regression rerun and one restore case passed without failures/skips; four expanded investigation browser cases passed. No claim is made that all traceability gaps are closed.
