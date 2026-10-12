# System gap closure: requested verification continuation

Date: October 11, 2026. Scope: continued local application fixes and relevant
tests requested by the Owner. This follows the [initial checkpoint](2026-10-11-system-gap-closure.md)
and [closure register](../../plans/SYSTEM-GAP-CLOSURE-PLAN.md).

Customer-only i18n and the Portal deployment hold remain in force. No migration,
new dependency, authentication change, provider dispatch, remote database change,
deployment, Git mutation or physical laboratory exercise was performed.

## Application changes

- Added complete Customer shipment search/status/paging with exact totals and
  saved-filter/page return from shipment detail. Removed the silent 250-item
  ceiling from existing per-source shipment discovery.
- Recovery work now derives directly from failed retention notices, result
  packages and invitation delivery attempts, with exact filtered destinations.
  Summary synchronization/manual resolution cannot hide an outstanding failure.
- Fixed nested confirmation focus, completed department-access draft reset,
  grouped member actions and corrected Finance links inside Actions menus.
- Repaired test fixtures to supply real Query/Router providers, render the shared
  confirmation host, await asynchronous decisions and use current paged contracts.
- Replaced fragmented packing-reset copy with parameterized whole sentences.
  Work pseudolocale uses the shared Customer boundary; source identifiers remain
  unchanged. No additional language is published.
- Mock sessions explicitly report paused connected work instead of indefinite
  loading; the actual home acceptance uses the work dashboard rather than retired
  placeholder panels, with Web Operations still accessible to administrators.
- Updated Customer shipping help and regenerated the 56-guide corpus.

## Verification

| Check | Actual result | Retained evidence |
| --- | --- | --- |
| Full frontend unit suite | 240 files; 1,502 passed, 3 skipped, 0 failed. Lower concurrency resolved the three initial Trial timeouts. | [Full log](../../../output/gap-closure-20261011/frontend-tests-final.log) |
| Final affected components | 6 files; 60 passed, 0 failed after the last dialog/shipment/message changes. | [Component log](../../../output/gap-closure-20261011/frontend-last-changes.log) |
| Backend unit suite | 892 passed, 1 existing platform file-link skip, 0 failed. | [Unit log](../../../output/gap-closure-20261011/backend-unit-final.log), [TRX](../../../output/gap-closure-20261011/backend-tests/backend-unit-final.trx) |
| Focused PostgreSQL | 5 passed, 0 skipped, 0 failed. | [Connected log](../../../output/gap-closure-20261011/backend-connected-final.log), [TRX](../../../output/gap-closure-20261011/backend-tests/backend-connected-final.trx) |
| Relevant desktop/mobile browser journeys | 94 unique passing cases, 2 existing mobile print skips. Initial 96-case batch: 91 passed/3 failed/2 skipped; all 8 home cases pass after fixing obsolete tab-order/hydration expectations. | [Batch log](../../../output/gap-closure-20261011/e2e-final.log), [Final home log](../../../output/gap-closure-20261011/e2e-home-final.log) |
| Compilation and static checks | Backend solution build, TypeScript, full ESLint and final affected lint pass. Client/SSR/Nitro production compilation uses isolated output; no publish. | [Backend build](../../../output/gap-closure-20261011/backend-build-final.log), [Frontend build](../../../output/gap-closure-20261011/frontend-build-final.log), [TypeScript](../../../output/gap-closure-20261011/typecheck-final.log), [ESLint](../../../output/gap-closure-20261011/lint-final.log) |
| Customer catalog/help | 2,571 valid English messages; other audiences remain English. 56 generated guides, corpus `0c7b60ea8f31`; generated content check passes. | [Catalog log](../../../output/gap-closure-20261011/catalog-final.log) |

Final working-tree `git diff --check` and continuation-receipt links pass. A
separate cached-diff check reports a trailing blank line in the previously staged
`home.spec.ts` version; its current working-tree source is corrected. The index
was left untouched under the repository's no-Git-mutation rule.

The initial frontend run exposed missing providers, old response/menu contracts
and synchronous confirmation assertions; these were repaired using real contexts
and current behavior. Browser checks additionally found actual completed-draft
reset and nested-focus bugs. The corrected lower-concurrency full run and focused
final checks are the passing checkpoints, not the initial failed attempts.

The backend build first found missing local restore assets for the existing S3
recovery tool; ordinary restore/build passed without changing dependencies. An
isolated Nitro intermediate directory outside the package root could not resolve
an existing dependency; moving only those temporary intermediates inside the
package root resolved it. Temporary build output/helpers were removed after
verification, while logs and the running application's pre-existing output remain.

PostgreSQL scope: configured loopback development database
`phaeno_ops_recovery_20261008`. Work tests roll back their synthetic fixture;
shipping tests clean their own uniquely identified synthetic records. No existing
operational records were repaired/reset and no migrations were applied.

Browser acceptance uses actual components and deterministic session/API fixtures.
It establishes rendered interaction/accessibility behavior, not authenticated
end-to-end production source/role acceptance.

## Remaining acceptance and implementation

The full staff/external source matrix still requires exact scientific evidence
and release prerequisites, current versus superseded packages, shipping supply
readiness, real actor/role revocation, concurrency, populated-tenant cost and
trigger-to-clear acceptance. Work recovery source freshness is covered locally;
live recovery/monitoring activation is separate.

Secondary assembly/manufacturing/data discovery caps remain classified in the
initial receipt. Their record-facing consumers still need complete discovery.
Customer module constants, backend errors, email and generated documents require
the full localization inventory and language review. Physical bench qualification,
operator teach-back, hosted recovery drills, monitoring ownership and deployment
cutover remain their owning plan's gates. The closure register is not complete.

Production compilation still warns about large client chunks (approximately
2.05 MB for the main chunk and 0.93 MB for Documentation Search, before gzip).
These are compilation warnings, not measured loading/reflow acceptance; a bundle
and populated-tenant performance checkpoint remains required before release.
