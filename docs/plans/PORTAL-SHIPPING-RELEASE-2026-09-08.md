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

Documentation and local verification are complete. Commit/push and deployment
identities will be recorded below. Production migration approval was requested
separately under `AGENTS.md:67`; no migration or production promotion is claimed
at this preparation checkpoint. Existing storage/scanning providers, Clerk
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

## Deployment evidence

Pending the authorized release steps and explicit production migration approval.
