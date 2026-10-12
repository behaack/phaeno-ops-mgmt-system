# Shipping attention and startup gap closure

Date: October 11, 2026. Authorized continuation: next application slice and relevant
verification, following the [previous receipt](2026-10-11-system-gap-closure-remaining.md)
and [closure register](../../plans/SYSTEM-GAP-CLOSURE-PLAN.md).

Customer-only i18n and deployment on hold remain in force. No model/migration,
dependency, authentication, provider, remote database, deployment or Git mutation
was performed. Existing operational data and running app output were preserved.

## Implemented behavior

Shipping attention shares physical receipt, complete assembled tube roster and
usable/expiry checks with pairing and phase supply. Allocated stock or Received
request status alone cannot create sample-preparation attention. Usable stock can
support preparation while another part of a request awaits dispatch. Withdrawn,
reserved/bound and conflicting claims are excluded from new preparation. Current
phase selection retains the shared shipment sequence. Cancellation and ordinary
member responsibility remain waiting; prepared phases surface carrier handoff.

The feed batches scoped Jobs/phases, samples, shipments, requests/lines,
selections, stock/tubes, claims and pair identities before counts. It performs no
per-Job query chain and batches Trial replacement authority. Reads neither stamp
concurrency nor write state. Command locks, version checks and decisions remain.

Pure Dashboard/Purchasing route parsers no longer import full workspace components
into startup. Existing route values and bookmarks remain. Normal home also defers
the retained Web Operations panels until the authorized view is selected. Customer
shipping feedback respects the Customer locale boundary; other audiences remain
English. Customer getting-started help and its generated corpus were updated.

## Verification

| Check | Actual result | Evidence |
| --- | --- | --- |
| Backend build | 0 warnings/errors | [Build](../../../output/gap-closure-next-20261011/backend-build-final.log) |
| Full backend regression | 899 passed, 408 gated skips, 0 failed | [Log](../../../output/gap-closure-next-20261011/backend-full.log), [TRX](../../../output/gap-closure-next-20261011/next-backend-full.trx) |
| Focused backend sequence/query regressions | 4 passed | [Log](../../../output/gap-closure-next-20261011/backend-unit.log) |
| Selected connected PostgreSQL | 5 passed, 0 skipped/failed | [Log](../../../output/gap-closure-next-20261011/backend-connected-verified.log), [TRX](../../../output/gap-closure-next-20261011/next-connected-verified.trx) |
| Initial affected frontend | 10 files; 46 passed | [Log](../../../output/gap-closure-next-20261011/frontend-tests.log) |
| Final affected frontend | 11 files; 49 passed | [Log](../../../output/gap-closure-next-20261011/frontend-final-tests.log) |
| Browser acceptance | 38 unique desktop/mobile cases pass; final home rerun 8 passed | [Batch](../../../output/gap-closure-next-20261011/e2e.log), [Final home](../../../output/gap-closure-next-20261011/e2e-home-verified.log) |
| Types / lint | Both pass | [Types](../../../output/gap-closure-next-20261011/frontend-types-final.log), [Lint](../../../output/gap-closure-next-20261011/frontend-lint-final.log) |
| Help publication | 5 checks pass; 56 guides, corpus `d3eedf874b9b` | [Tests](../../../output/gap-closure-next-20261011/docs-tests.log), [Generation](../../../output/gap-closure-next-20261011/docs-generate.log) |
| Client/SSR/Nitro build | Pass; main 2,065.14 -> 1,159.61 KB, gzip 593.22 -> 356.84 KB | [Before](../../../output/gap-closure-next-20261011/build-before.log), [Final](../../../output/gap-closure-next-20261011/build-final.log) |
| Startup dependency graph | Entry + default home and all static dependencies: 14 chunks, 1,177,035 bytes; 361,833 gzip. No eager Lab Operations, barcode encoder or retired/Web Operations panels. | [Check](../../../output/gap-closure-next-20261011/startup-check.log), [Summary](../../../output/gap-closure-next-20261011/startup-summary.json), [Profile](../../../output/gap-closure-next-20261011/profile-client.json) |

The 1,005-Job query fixture uses 10 reads, identical to one Job. The final observed
read was 55 ms on the configured loopback `phaeno_ops_recovery_20261008` database.
That fixture excludes populated scientific and physical-stock histories; no
end-to-end latency target or production percentile is inferred. Physical predicate
journeys use separate synthetic kit/phase fixtures and clean their own records.

An intermediate home rerun asserted the hydrated POMS title before the cold mock
client finished loading. The final check waits for hydration and passes, including
the retained Web Operations path. No branding assertion was removed.

Final generated-document consistency, receipt links and working-tree whitespace
checks pass. Task-created profile helpers, build output/cache and Nitro
intermediates were removed; logs, profile/summary JSON and TRX evidence remain.

## Remaining application work

- Complete Customer message/help/email/generated-document readiness and the
  scientific/financial language review before any additional language publication.
- Complete the remaining record discovery/return and draft/focus workflow inventory.
- Complete authenticated source/actor acceptance, request/catalog setup
  prerequisites and populated scientific/tenant query-cost and latency acceptance.

Recovery/monitoring, physical hardware/laboratory/training acceptance and the
hosted-test database release plan are separate operational gates. This is another
verified application slice, not the final application or operational closure.
