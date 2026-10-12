# Final application gap-closure verification

Date: October 11, 2026. Scope: finish the approved application gap closure and
run relevant tests. Customer-only i18n, en-US only, deployment held. No dependency,
authentication/provider configuration, persisted model, migration or Git mutation
was introduced by this final pass. No operational data repair or reset occurred.

## Delivered

- Complete assembly discovery: server search and exact 25-row pages; older scoped
  history/input/QC/dashboard reads no longer silently stop at 250/1,000. A failed
  read hides stale rows; no-record, no-match and out-of-range states differ.
- Trial detail return preserves the list page. Closed forms no longer block
  unrelated navigation. Governance forms retain/discard drafts safely and restore
  focus; touched contextual actions use shared ActionMenu. Completing laboratory
  execution no longer leaves background pointer interaction locked.
- Customer extraction covers 202 source files, 2,375 static text fragments,
  43 attributes and 286 feedback expressions, with 142 server-message source
  files inventoried. The catalog has 5,777 English entries. Shared FieldError
  still omits absent errors. Customer source matching is lazy. These extraction
  counts are inventory evidence, not independent acceptance cases.
- The [Customer inventory](../../plans/CUSTOMER-LOCALIZATION-INVENTORY.md) covers
  UI/validation/errors, all eight current-English guide bodies, invitation
  templates/subject, notices and printed/generated documents. Other audiences
  retain English. Additional-language translation/review/publication remains
  separate scope; no language selector or new locale was enabled.
- Invoice rendering preserves supported Unicode, frozen numbers and long lines
  across numbered pages using the existing embedded font. Current-English invoice
  and quote labels have an embedded document catalog. The five-page synthetic
  60-line invoice has no clipped text or orphaned continuation lines on the
  inspected first/final pages. It is test content, not a financial transaction.
- Scientific candidate SQL rejects incomplete analysis/profile/artifact evidence
  before full command-equivalent read-only lineage validation. No lock, audit
  stamp or scientific mutation is added to assessment. Current inputs, exact
  package QC and scientific prerequisites still own eligibility before counts.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Full backend | 900 passed, 409 environment-gated skips, 0 failed | [Log](../../../output/gap-closure-finish-20261011/backend-full-final.log), [TRX](../../../output/gap-closure-finish-20261011/backend-full-final.trx) |
| Connected local actor/scientific/volume matrix | 67 passed, 0 skipped/failed | [Log](../../../output/gap-closure-finish-20261011/scientific-final.log), [TRX](../../../output/gap-closure-finish-20261011/scientific-final.trx) |
| Additional reagent/physical phase-kit matrix | 5 passed, 0 skipped/failed | [Log](../../../output/gap-closure-finish-20261011/work-volume-final.log), [TRX](../../../output/gap-closure-finish-20261011/work-volume-final.trx) |
| Invoice/quote renderer checkpoint | 18 passed; 8 environment-gated cases also covered by the connected matrix | [Log](../../../output/gap-closure-finish-20261011/documents-final.log), [TRX](../../../output/gap-closure-finish-20261011/documents-final.trx) |
| Full frontend | 243 files; 1,511 passed, 3 existing skips, 0 failed | [Log](../../../output/gap-closure-finish-20261011/frontend-final.log) |
| Final affected components | 3 files, 10 passed, 0 failed | [Log](../../../output/gap-closure-finish-20261011/frontend-last-affected.log) |
| Desktop/mobile browser | 224 unique cases pass across the final full run and affected rerun; 2 existing skips | [Full run](../../../output/gap-closure-finish-20261011/e2e-stable-final.log), [Search rerun](../../../output/gap-closure-finish-20261011/e2e-search-last.log) |
| TypeScript / ESLint | Pass | [Types](../../../output/gap-closure-finish-20261011/types-last.log), [Lint](../../../output/gap-closure-finish-20261011/lint-last.log) |
| Documentation / Customer catalog | Five publication checks pass; 56 guides, corpus `67540d619002`; 5,777 valid English entries | [Publication](../../../output/gap-closure-finish-20261011/docs-tests.log), [Corpus](../../../output/gap-closure-finish-20261011/docs-check.log), [Catalog](../../../output/gap-closure-finish-20261011/customer-catalog-final.log) |
| Isolated client / SSR / Nitro build | Pass; final production build and profile retained as logs/JSON | [Build](../../../output/gap-closure-finish-20261011/build-last.log), [Profile](../../../output/gap-closure-finish-20261011/startup-profile.json) |

The connected target was the configured loopback Development database
`phaeno_ops_recovery_20261008`. Tests use rollback-scoped synthetic rows or the
existing uniquely named isolated test-database harness with guarded cleanup.
No operational migration or destructive remedy was applied. This matrix includes
1,005 scoped Jobs, 505 data/notice histories, 262 reagent runs, 120 retained Trial
events and 261 assembly attempts, plus role/Department exclusion and scientific
profile/current-input/QC gate cases. Counts precede paging and older records remain
reachable. Individual fixture volumes are not combined into one representative
production workload.

The Trial credit/download fixture uses explicitly injected synthetic commit
evidence. Production commit-timestamp admission remains fail closed and unchanged;
the current local server does not establish real commit-tracking acceptance.
An initial additional-test filter matched zero cases because the files extend
existing partial test classes. It was corrected to actual method names; only the
five executed cases above are counted.

Earlier browser runs found stale required-label/paging/dialog expectations and
missing Router/confirmation fixture context, plus actual footer encoding,
closed-draft navigation and menu/dialog pointer defects. Corrections retain the
scoping/focus/accessibility assertions. The first full checkpoint after fixes
passed 220 cases but had four timing failures, including an accessibility scan
whose fixture execution context was reloaded and duplicate fixture roots. E2E
mode now disables hot reload; normal development still enables it. The stable
full run passed 223 cases with two skips and one failed topic-navigation case.
That case clicked a server-rendered link before hydration settled and remained
on the landing page. It now waits for initial readiness and asserts the selected
topic URL before checking outage feedback. All six desktop/phone search cases
then pass, covering every non-skipped browser case across the final runs. No
additional full run was needed after this test-only readiness correction.

## Performance and remaining acceptance

Final main entry is 1,353,188 bytes; its static startup graph is 1,364,583 bytes,
recorded in the profile. The main remains below
the original 2,065,140-byte baseline; Customer extraction increases it relative
to the smaller shipping-only checkpoint. Normal static startup excludes the Lab
Operations UI, barcode encoder and retired business dashboard panels. Guide
bodies and authorized Web Operations load on demand. The earlier 1,005-Job
shipping benchmark retains ten queries, unchanged from one Job; its 55 ms fixture
measurement is not a production latency promise.

Strict scientific assessment still queries per-package evidence after SQL
prefiltering. Representative populated strict-scientific tenant latency/query
cost, real Clerk/provider journeys, operational-user usefulness, mailbox evidence,
commit tracking, coordinated recovery/monitoring and physical bench/training
acceptance remain explicit gates. The deployment hold also requires the separate
production-hosted test-database cutover/rollback plan. No deployment or activation
is authorized or claimed. The approved local implementation pass is ready for
review; full operational closure is not claimed.

Four earlier October 11 closure receipts were link-audited: all their local
attachments currently exist. [Inventory](../../../output/gap-closure-finish-20261011/historical-evidence-links.json).
Historical results are not recounted as new executions.

An expanded audit of the owning/living plans also found nine links to older
attachments already qualified as unavailable in this checkout. Their historical
names/results remain, but missing paths are no longer presented as clickable
evidence. [Missing historical attachment inventory](../../../output/gap-closure-finish-20261011/missing-historical-plan-attachments.json).
New closeout links are verified separately. Task-created temporary
helpers and isolated build/cache intermediates are removed after verification;
logs, TRX, source/graph inventories and the synthetic PDF visual proof are retained.
The running Portal output and development sessions are preserved.

Final working-tree whitespace and new closeout-document links pass. No staged
content was rewritten; pre-existing index state was preserved.
