# Pre-barcoded workflow fixes — October 5, 2026

All nine findings from the [simulated walkthrough](2026-10-04-prebarcoded-library-sequencing-review.md)
are implemented locally. This report distinguishes implementation from acceptance.

| Finding | Implemented change |
| --- | --- |
| 1. Stale Ready mixes | Refetch on step opening and window return; bounded Refresh updates eligible choices without resetting the form. Expired/discarded mixes are filtered and server eligibility still governs saves. |
| 2. Supplied-label instructions | Manufacturer/registered supplied outputs direct the operator to scan their existing labels. Generated labels retain print, attach and scan prerequisites. |
| 3. Direct sendout status saves | Confirmation names batch/provider/status; requires actual UTC occurrence and evidence with optional provider/carrier reference. Backend enforces expected version, status sequence, nonfuture/monotonic actual times and atomic status/history writes. Server entry time and actor are retained separately in custody JSON. |
| 4. Missing mix prerequisite path | Preparation shows exact-recipe prerequisites before the step. Contextual start carries recipe/revision into a new-tab mix workflow while the waiting step component and report selection stay mounted. |
| 5. Opaque preparation identity | List/detail display service name and readable preparation identity; saved identifiers and physical tray barcodes are retained. New identifiers use the service name. No historical rename or data conversion. |
| 6. Single-sample friction | The sole sample with required individual inputs opens; multiple/failed cards retain disclosure. Tube-only steps omit empty Batch entries, and one-sample output omits redundant common defaults. |
| 7. Sequencing handoff/navigation | Contextual draft creation returns to assignment; create and membership remain separate saves. Draft selectors use name plus number. Batch primary links open members/pairs, transfers, frozen manifest, provider, custody and next-action workspace. |
| 8. Premature deviation warning | Ingredient capture shows remaining exact recipe amounts, including partial uses. Deviation wording/approval action appears after ingredient steps finish; genuine mismatch approval remains required. |
| 9. Presentation/autofill | Count-aware wording, sentence-case status labels, exact decimal-text trimming and operational autofill hints. Inputs/selects use shared spacing/sizing and accessible error association. Password-manager extension behavior is not claimed as fixed without reproduction. |

## Verification

The subsequent Customer order-loading report identified a named-enum snapshot
read mismatch at `$.sourceType`. Customer detail and subsequent sample
authorization readers now match the purchased-service correction writer; future
initial/additional snapshots use that format. Existing data requires no repair.
Customer controller regression source checks authorized samples and unchanged
saved evidence. The compiled local API is restarted with the fix. The connected
browser exposes only the Phaeno staff session; the reported Customer session is
unavailable to browser control. Customer browser acceptance therefore remains
unverified; staff views alone do not establish it.

- Backend solution build succeeds with no warnings/errors, including authored regression sources.
- Frontend typecheck and lint of all touched sources succeed.
- Documentation corpus generation/check and whitespace checks succeed.
- Connected local Chrome confirms the readable saved preparation name, retained opaque identifier and tray barcode, one-tube labels, 10 µL mix use, source 1.49 mL and library balance 15 µL.
- The completed sequencing batch detail retains one member, the original library/sequencing barcodes, 5 µL transferred, 15 µL remaining, 5 µL fixed Catalog minimum, frozen manifest and original simulated custody evidence. The older six-member batch remains Draft.
- Desktop and narrow screenshots inspected. Sequencing detail at measured 390 CSS pixels has no page-wide horizontal overflow. Preparation at 487 CSS pixels retains the intentionally scrollable tray grid without page-wide overflow. Temporary viewport overrides are restored.
- Batch Actions opens by keyboard with one chevron. Start confirmation initially focuses Cancel, has a real dialog body and returns focus to the original Actions control after cancellation. Inspection was cancelled; no batch was started.

Phaeno guides, registry dates/generated corpus, owning plan and living test plans
are updated. Automated suites are authored/compiled but not executed under the
repository's request-only rule. Fresh-fixture acceptance remains for cross-tab
creation/discard/expiry, full prepare/return, contextual create/assignment and
persisted timed sendout transitions. These were not simulated by replaying or
changing completed lab records. Full dark-theme/contrast/physical/provider/
scientific acceptance is not established by the read-only checks.

No migration, destructive data repair, dependency/authentication change, Git
publishing or deployment. Local development servers are retained for review.
