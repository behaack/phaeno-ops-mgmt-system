# Box placement preview evidence — October 2, 2026

Local Chrome review used the actual ContainerAccessionDialog and StoreAcceptedTubesDialog with isolated synthetic API responses. No operational shipment, specimen or storage writes occurred. This is UI and client-state evidence, not connected backend, physical scanner or physical placement acceptance.

## Current single-scan workflow

- `recorded-tubes-desktop.png`: latest remaining-tube screen with three accepted tubes collapsed, two undecided rows visible, and required legend/count/action buttons sharing a vertical center.
- `recorded-tubes-mobile-dark.png`: 390 × 844 dark view with saved acceptance collapsed separately from two recorded exceptions. Expanded tables scroll within the dialog; footer controls stay contained.

The disclosure follow-up verified Enter-key open/close, retained saved locations, exclusion of a saved tube scan and visible pending placement. A mixed accepted/held/rejected fixture retained the correct total and separate counts. Desktop footer centers matched at 742.5 px; narrow dialog body width/scroll width were both 341 px. The earlier single-scan images below precede this disclosure refinement.

- `single-scan-placement-desktop.png`: current accession dialog after one tube lookup. The box is open, the matched sample/tube is shown, and its location remains pending until reviewed and saved. Input/button heights and vertical centers match.
- `single-scan-mobile-dark.png`: the current box/tube workflow at 390 × 844 in dark theme. Form controls fit the dialog at the shared height; the expected-tube table scrolls within its own container.

Manual synthetic checks completed a three/two split with five total tube lookups, exact boxes, distinct request IDs and work versions 1/2. A saved pending-tube rejection removed only that identity and preserved the other pending mapping. A broken tube was rejected from its expected row without a scan. The remaining three acceptable tubes saved at version 3, excluding both exceptions, without rescanning the retained tube. Matching-box resume preserved pending identities after focus loss. Exception return focused box rescan and final completion focused Done.

An uncertain five-tube successful response locked the submitted group; retry sent identical JSON/request ID with five total tube lookups and five unique synthetic records. Regression sources were updated but automated tests were not run. TypeScript, scoped lint, documentation freshness and diff checks pass. All temporary preview files/server/cache/tab were removed and viewport override restored.

## Earlier two-pass checkpoint

The images below record the preceding two-pass implementation and its safety checks; they do not represent the current single-scan entry screen.

- `review-desktop.png`: final three-tube review, explicit box identity, unchecked inspection/placement confirmation and Back to placement focus.
- `placement-mobile-dark.png`: final one-tube placement at 390 × 844 in dark theme.
- `review-mobile-dark.png`: final one-tube review at the same narrow/dark viewport.
- `split-completed.png`: five tubes saved as three in one box and two in another; exact group payloads, distinct request IDs and work-version advancement were checked.
- `uncertain-save.png`: frozen group after a synthetic successful save with a lost response; retry submitted identical JSON/request ID and returned the original receipt without duplicate synthetic records.
- `paused-late-scan.png`: pause retained one pending tube and excluded a delayed second scan; a different resume box was rejected and the original box resumed placement.
- `barcode-alignment-desktop.png`: final styled box-entry row with vertically aligned textbox and Open box button. The actual box and tube controls measured equal heights/centers even with required-field validation; at 390 px they stack within the dialog. The first unstyled preview was discarded. All preview API calls were blocked for this layout check.

Box-only scanning assigned no tubes. Duplicate placement did not add a second record. Review started unchecked without submitting or showing a premature confirmation error. Shared dismissal explained physical reconciliation, focused Keep reviewing, retained paused work when kept and preserved saved records when discarded. Completion returned focus to Done. Keyboard scanning and contained desktop/narrow layouts were reviewed.

TypeScript, scoped ESLint, documentation generation/check and `git diff --check` pass. Regression sources were updated but automated suites were not requested or executed. Existing backend atomic validation, concurrency and replay behavior were inspected in source. Box registry, capacity, temperature compatibility and grid positions remain outside this workflow.

Temporary preview server, files, cache and tab were removed; viewport override restored. These screenshots are the retained task evidence. No commit, push or deployment was performed for this implementation.
