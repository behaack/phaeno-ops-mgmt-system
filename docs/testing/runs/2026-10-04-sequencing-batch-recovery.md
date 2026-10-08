# Local empty sequencing batch recovery — October 4, 2026

The owner requested a workflow fix and correction of
**PH-BAT-20261004-TAHDCRV5**, which was In progress with zero libraries and no
sendout. Its state prevented the completed 6WTMNUFE demo tray from assigning
libraries because membership is restricted to Draft batches.

Implemented safeguards reject empty start, completion and sendout creation.
The batch card explains the assignment prerequisite and disables empty Start
and Sequencing tubes actions. Empty In progress batches without a sendout offer
an audited return to Draft with a required correction reason. Current-version
checks and the existing batch lock protect this correction. No persisted model
change or migration was required.

The local UI saved the authorized correction once. Immediately afterward, the
same identifier was Draft with zero members and no current start. The menu's
Start and Sequencing tubes items were disabled. Cancel initially had focus;
required-reason validation, three dialog regions, focus return and containment
at 320 CSS pixels passed.

A read-only database check found `EmptySequencingBatchReturnedToDraft` with an
actor, the entered owner-requested reason and the original start
`2026-10-04T19:09:00Z`. The identifier/name/notes were preserved. During subsequent
verification, the user's session assigned all six passing libraries. The
refreshed batch was Draft with six members, and the completed tray showed
**6 passing libraries · 6 assigned**, all with this destination. This task made
no library-membership, start, transfer, sendout or sequencing command.

Verification: solution build (including regression sources), TypeScript
typecheck, scoped ESLint, generated documentation corpus/check and connected
Chrome acceptance passed. Automated unit/integration/E2E suites were not
requested or executed. The API runs locally in Development at its existing
URLs; no deployment, Git mutation, physical sequencing or scientific/provider
acceptance is claimed.

The accompanying Master mix card change places its sole **Open Master mixes**
outline link beside the title, wraps the description and preserves existing
uses. Geometry/keyboard checks passed at 320, 1025 and normal desktop widths.
