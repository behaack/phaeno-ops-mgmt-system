# Portal shipping release and overnight handoff — September 8, 2026

## Scope and current release status

The Product Owner requested that the day's documentation be completed and all
changes committed, pushed and deployed. The complete release includes previously
committed work after production source `00959f5600e065714166232b2f579b3b4b2eff57`
as well as the final shipping corrections. It includes CRM outreach evidence,
invitation/access presentation, quote extensions/PDFs, sample-roster review,
container catalog/packing/stock, Customer delivery locations and kit ordering,
receipt gates, container reset/selection and synchronized dispatch fulfillment.
The public Website has no change in this release.

Documentation and local verification are complete. The Product Owner approved
the pending production migration/switch on September 9 by replying **Switch**.
The selected matching API/UI release source is
`f06f4530bd28a18f611c84ebc8e0230700c5fa7c`, containing application commit `989830a`
and its final handoff documentation. Both API and Portal UI are now deployed to
production at that exact revision, with all four migrations applied and public
health checks passing. Existing storage/scanning providers, Clerk
identity configuration and independent processing/retention flags are preserved.

## Tomorrow's starting point

Resume the [local connected walkthrough](../testing/runs/2026-09-08-hs5y7db7-local-walkthrough.md#end-of-day-handoff--resume-september-9-2026),
at Customer receipt for Job **HS5Y7DB7**, Request **D20018AA**. The request is
Dispatched, **1 sent / 0 received**. Its single TRANS-20 kit has 20 registered
synthetic barcodes; the original FedEx dispatch facts are preserved. Do not
repeat ordering, registration, dispatch or the completed request-link correction.
After the simulated receipt, verify received-Job-only container choices, then
scanning, packet printing and the first-scan reset lock. Split/partial/alternate
size variants use separate fixtures. The nine-sample, 18-tube roster stays intact.

Local test records and runtime data are not part of deployment. Production
container definitions/compatibility, delivery locations and fulfillment inventory
must be configured with approved operational values before new Customer shipping
can run. The schema migration does not seed TRANS sizes or copy test kits,
addresses, tracking numbers or sample records. Physical supply, Customer receipt,
mailbox delivery and representative scanner/printer acceptance remain separate.

## Reviewed production migration plan

Last successful API workflow: [34185311152](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/34185311152),
source `00959f5600e065714166232b2f579b3b4b2eff57`. That run applied
`20260908015114_AddConfiguredLabAndPartnerKitBundles`; no newer successful API
deployment was found. Current production EF history has not been queried directly.

| Migration | Purpose |
| --- | --- |
| `20260908161948_AddCrmOutreachEvidence` | Nullable contact outreach permission/suppression evidence. |
| `20260908204524_AddLabServiceQuoteExtensionRequests` | Durable extension requests retaining original quote history. |
| `20260908234930_AddSampleShippingContainerPackingAndStock` | Container catalog/revisions/compatibility, standard stock kits/tubes and shipment packing metadata. |
| `20260909013740_AddCustomerTransportationKitOrdering` | Customer delivery locations, Job-specific kit requests/lines and stock linkage/receipt. |

The reviewed idempotent SQL adds **9 tables, 11 columns, 42 indexes and 37
foreign keys**. Ten columns are nullable; the other is a false-default packing
pool flag. There are no explicit business-row inserts/updates/deletes, drops,
column alterations, renames or seed records. Normal DDL locks apply; production
duration depends on existing rows and transactions and is not benchmarked.
SQL SHA-256: `017EFBFE99B81D63A8C3B7FE254ACF164A6E809E59F46554AE72534C9CE69005`.
Local review and SQL: `artifacts/release-migration-audit-20260908/`.

After explicit approval, dispatch **Deploy Portal Green** with migrations enabled,
storage/scanner set to Preserve and Clerk cutover disabled. The existing procedure
checks the current migration, creates a dump, verifies an isolated restore and
cleanup, encrypts the dump and key, checks hashes, removes plaintext and applies
migrations before replacing the API. Record the backup identity and exact applied
migration IDs. Do not deploy this API with migrations disabled unless all four
IDs have independently been verified in production history.

Build the Portal UI for the same source with production settings and hold domain
assignment until API success. Verify API source, health, database ping, UI source,
assets and runtime errors before promotion. No authentication or feature-flag
cutover is included. After a migration, the script disables automatic image
rollback: prefer a reviewed forward fix. A database restore or destructive Down
migration requires separate authorization; a UI rollback does not undo the API
or database.

## Verification evidence

- Latest shipping checkpoint: **68/68** isolated backend cases passed, including
  order/receipt guards, packing/reset, synchronization/reconciliation, ownership,
  concurrency and preservation of existing dispatch/barcode facts. Build passed.
- Customer component checkpoint: **62/62**; staff kit/request checkpoint:
  **28/28**. Focused lint and full TypeScript passed.
- Actual-component browser checks: **28/28** Customer supply cases and **7/7**
  recovery-dialog cases, desktop/phone and light/dark, without nonlocal requests
  or real writes. Earlier layout/reset/selector evidence remains in the living
  frontend/E2E plans. Temporary fixtures and isolated server were removed.
- The connected local recovery changed Request D20018AA to Dispatched with one
  sent kit. Read-only hashes confirm unchanged original dispatch facts and all
  20 permanent tube identities/barcodes. Both queue and kit detail agree;
  Customer receipt and sample-shipment binding remain unset.
- Earlier documented checkpoints cover CRM outreach (30 backend cases) and
  quote extensions (six PostgreSQL plus 36 related cases). These were not rerun
  simply to total a release count; overlapping counts are not unique tests.
- The 56-guide corpus is `e81c712bcb04`; affected Customer/Phaeno guides, living
  plans, manual test plan and prominent overnight handoff were reviewed.
- Final frontend production client/SSR build, full typecheck and documentation
  freshness check passed. Existing large-chunk warnings remain; there is no
  dependency or build-configuration change. Evidence:
  `artifacts/end-of-day-release-preflight/`.

These checks do not establish production role workflows, physical delivery,
scientific acceptance or notification inbox receipt. No synthetic fixture is
provisioned in production by this release.

## September 8 preparation evidence (historical)

- Application commit `989830a62cfcba2deb4d3b5f0d86ea6ece9025dc` was pushed to
  `codex/portal-documentation-search-release`; it includes all final source,
  guide, plan, test and walkthrough changes. The generated local search-index
  cache was excluded and its working file preserved.
- Vercel candidate `dpl_CA8GZUFR3Jw6XonEKchT4ToB7JUf` is **READY**, target
  production, built from the exact application commit above:
  `phaeno-ops-mgmt-system-jvm9ye8vr-cadexgenomics.vercel.app`.
  `autoAssignCustomDomains=false`; this is a held release, not a live promotion.
- At the preparation checkpoint, the alias API confirmed `portal.phaenobiotech.com` pointed to
  `dpl_3YWXWbw8GQiobhnpuXrDzkLxf9G9`, the existing `00959f5` release.
  Production API health was 200, database ping 204 and Portal root 200.
  The Vercel connector could not see the new deployment; the authenticated CLI
  that created it verified both candidate and live alias.
- No new **Deploy Portal Green** run was started at that checkpoint because
  explicit migration approval was pending. The September 9 approval and completed
  switch below supersede that hold. The earlier `989830a` UI candidate was never
  promoted; a matching `f06f4530` candidate was built for the final switch.
- Release evidence files are under `artifacts/end-of-day-release-preflight/`:
  `create-ui-deployment.json`, `ui-deployment-created.json`,
  `ui-deployment-status.json`, `production-alias.json`, and preflight build/check
  logs. The read-only migration review is under
  `artifacts/release-migration-audit-20260908/`.

## September 9 production release — completed

The Product Owner's **Switch** response approves the previously described four
production migrations and matching API/UI release. Workflow
[34360242317](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/34360242317)
completed successfully for source `f06f4530bd28a18f611c84ebc8e0230700c5fa7c` with
`apply_migrations=true`, storage/scanner **Preserve**, and Clerk cutover disabled.

- Pre-migration backup:
  `/var/backups/phaeno-portal-deploy/pre-migration-20260909T135930Z-f06f4530bd28`.
  Isolated restoration verified four schemas and the prior migration identity;
  restoration check and cleanup passed. The encrypted dump and wrapped key
  checksums passed before migration. No plaintext backup was retained by the
  workflow. This does not activate a new recurring/off-server backup schedule.
- All four reviewed migration IDs above were applied successfully at
  **13:59:38–39 UTC**. No test/catalog/business data was imported.
- API deployment succeeded at **13:59:49 UTC**, with image
  `sha-f06f4530bd28-run-34360242317-1` and release path
  `/opt/phaeno.portal-green/releases/f06f4530bd28a18f611c84ebc8e0230700c5fa7c-34360242317-1`.
  The solution build had zero warnings/errors; all workflow steps and temporary
  cleanup completed successfully. Nonblocking action/Node deprecation and missing
  optional Compose buildx warnings did not prevent deployment.
- The matching Vercel deployment **`dpl_GViUqZ2XhUnxZ3rjjyW9xuzbfFCf`** is
  **READY / PROMOTED**. Both Git source fields equal the API source above. The
  alias API independently confirms `portal.phaenobiotech.com` points to this
  deployment, URL `phaeno-ops-mgmt-system-q0xlsbcsr-cadexgenomics.vercel.app`.
- Independent live probes returned API health **200**, database ping **204**,
  Portal root **200**, and four sampled current JavaScript/CSS assets **200**.
  Bounded new-deployment runtime-error and HTTP 5xx queries returned zero entries.
  These are post-release health observations, not full signed-in workflow proof.
- A connected production browser smoke could not be completed: the browser
  connector could not open the production tab, and native window observation was
  unavailable. No authentication setting was changed and no production business
  record was submitted. Authenticated role journeys, operational catalog setup,
  mailbox/physical delivery and scanner/printer acceptance remain separate.
- Final evidence is under `artifacts/shipping-production-release-20260909/`:
  `api-deployment.log`, `api-run.json`, `api-release-evidence.json`,
  `public-api-probes.json`, `ui-promotion.log`, `ui-production-status-final.json`,
  `production-alias-final.json`, `public-ui-probes.json`,
  `ui-runtime-errors.jsonl` and `ui-http-5xx.jsonl`.

The previous UI deployment remains identifiable as
`dpl_3YWXWbw8GQiobhnpuXrDzkLxf9G9`. A UI rollback alone does not reverse the
completed database migrations or API deployment. No down migration or restore
was performed. Customer receipt testing remains the next separate **local**
workflow step; the synthetic walkthrough records were not copied to production.
