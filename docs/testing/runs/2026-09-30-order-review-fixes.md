# Order review fixes — September 30, 2026

The owner requested fixes for early phase cancellation blocking preparation, Customer Draft conflict recovery losing concurrent edits, and partial-invoice tax rounding drift.

Implemented active preparation requirements separate from immutable accepted scope; explicit review of merged Customer Draft values before adopting the current version; and cumulative tax rounding within the same issued rate. Added domain, component and PostgreSQL regressions. No persisted model, shared database migration, Git mutation or deployment is included.

Verification completed: 25 focused backend cases passed with zero failures/skips in a fresh loopback PostgreSQL database. Early cancellation finalized one active cohort while retaining the original two-sample agreement; four USD 25 invoices at 7.25% reconciled to USD 7.25 tax, and a later 10% rate charged only the new portion. The first run's tax-fixture cleanup failure was corrected with test-owned invoice/allocation cleanup before the passing rerun. Both disposable databases were dropped and absence verified.

Frontend verification passed 17 cases across six related files, followed by a passing final rerun of all eight affected cases. The conflict regression verifies that changed sample counts are loaded, local notes survive, Save/Review are blocked pending acknowledgement, current-version retry retains both changes, the changed-value summary is in the scrolling dialog body, and focus returns to Job name. The final frontend type check, full lint, production build and generated-help consistency check pass (56 guides). The final backend solution build has zero warnings/errors; EF reports no pending model changes. Diff whitespace and the owning-plan link checks pass.

Browser suites and connected acceptance were not repeated for this follow-up; the E2E plan retains the remaining real-session, physical and business walkthroughs.

Evidence is under `backend/artifacts/order-review-fixes/`, including the PostgreSQL TRX, migration log, owned database name and verified cleanup log. Connected customer/laboratory/provider/physical acceptance remains separate from automated evidence.
