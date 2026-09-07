# Portal completion implementation — September 7, 2026

## Authorized outcome

The Product Owner requested an injected file-management interface with local storage now and the option of S3 later, and asked to address the remaining completion items as appropriate. This continues the completed consistency releases. Reuse existing interfaces and workflows; do not introduce parallel file management, CRM search, queues or financial records.

Phaeno operators and external users need dependable file handling, recoverable preparation/correction, correctly scoped staff access and coherent commercial commitments. Existing approved scientific, tenant, audit, pricing and historical-record boundaries remain authoritative. Actual scientific content, provider details and physical bench acceptance cannot be invented.

## Work and acceptance

| Slice | Implementation boundary | Acceptance | Status |
|---|---|---|---|
| Storage and scanning | Reuse `IFileStorage` and feature adapters through DI. Support explicitly configured private persistent Local storage in production; preserve Disabled and S3 providers. Remove deployment's unconditional reset to Disabled. Add a real replaceable scanner adapter without treating local files as automatically clean. | Bounded streams, checksums, private paths, traversal/link protection, persistent local volume, provider-preserving release, failure/retry and scan verdict coverage. No automatic provider migration or invented clean verdict. | Implemented and locally verified; target activation remains |
| CRM | Fix attention-card destination filters and search failure recovery. Reuse existing `CommercialOperator` role for ordinary CRM work, requiring active Phaeno membership; retain platform-only administration, sensitive data and access-changing actions. | Ordinary sales work possible without platform administration; forbidden operations remain denied by API and omitted from UI; exact filtered navigation and truthful errors. | Implemented and locally verified |
| Trial scope drafts | Save and resume a shared staff draft independently of immutable submitted scope revisions. | Partial typed draft, versioned save, last editor/time, no external draft exposure, no premature approval/acceptance/Lab/shipping effect; full validation and atomic draft clearing only on successful submission. | Implemented and locally verified; production migration pending |
| Finance corrections | Expose existing allocation reversal and searchable invoice allocation. Permit correction or explicit cancellation of an unsubmitted reconciliation draft while preserving submitted/approved history. | Versioned, reasoned and authorized actions; accurate recalculation; preserve duplicate prevention and independent reconciliation approval. | Implemented and locally verified; production migration pending |
| Commercial bundles | Follow the exact configured Lab Service and Partner Kit rules in `ORDER-MANAGEMENT-PLAN.md`, including one assembly case per purchased Kit, one commercial commitment and preserved historical standalone work. | Complete price and included scope reviewed before commitment; tenant-scoped cases, entitlement quantities, timing and billing remain coherent; no inferred historical purchase links. | Approved roadmap; not implemented in this change |
| Scientific pipeline | POMS remains the owner of final deliverables; raw/intermediate processing stays outside its current scientific-file boundary. Identify the actual upstream system/team and complete the appropriate final-output handoff. | Real provider contract and representative output evidence, without fabricated scientific results or ownership. | Awaiting upstream identification; independent work continues |
| Documentation and readiness | Reconcile stale plan summaries and publish a current implemented/enabled/verified/accepted inventory. Update affected audience help and the illustrated Word guide. | Documentation describes current delivered behavior and clearly separates activation, future scope and acceptance. | Complete; 55-guide corpus and 26-page illustrated guide verified |

## Engineering decisions

- Storage uses the already implemented `IFileStorage`, `IManagedFileStorage` and `IOperationalFileStorage` boundaries. S3 already exists; future selection must not require rewriting feature code.
- The new Local request supersedes the former production-Local prohibition. Production storage must be explicit, private, persistent across releases and outside application/static roots. Existing file bytes are not silently relocated.
- A scanner adapter can be implemented independently of an external daemon. Unavailable scanning continues to block operations that require a clean scan.
- Existing `CommercialOperator` is reused; no new identity provider, Clerk setting or role table is needed. Platform administration remains a distinct permission.
- Trial draft storage is additive and shared within the existing authorized staff workflow. Root coordinates the EF migration and full ERD update after all persisted models settle.
- Production migration application is separate from the existing deployment authorization and requires the repository's explicit shared-database approval. Prepare and verify the concrete additive migration before any such approval step.
- The commercial-bundle review confirmed that this is a complete new commercial lifecycle, including configured price, Kit case lineage, shipment/expiry, replacement transfer, billing and turnaround commitments. It cannot be delivered safely as a screen consolidation. The exact approved sequence remains in `ORDER-MANAGEMENT-PLAN.md`; current quote and standalone Assembly workflows remain operable and the readiness inventory explicitly records the gap.

## Verification and release

The request to address the remaining acceptance work includes targeted regression verification for this change. Run scoped unit/integration checks at an integration checkpoint, then relevant builds, documentation validation and browser checks. Preserve existing external-role and physical acceptance limits; no test creates production orders, payments, invitations, scientific records or sample movements.

Commit/push/deployment authorization from this conversation remains in force. Deploy only a coherent verified revision and preserve independent scientific/retention activation boundaries. The unrelated tracked local search-index binary remains excluded.

### Completed local checkpoint

- Full backend Release suite: **506 passed, one Linux-only skip, zero failures**. Release build: zero warnings/errors. Full frontend suite: **321 passed across 86 files**, with typecheck, zero-warning lint and client/SSR production build passing. Detailed evidence and remaining target checks are in the living backend/frontend/E2E test plans.
- Retention tests required a separate loopback PostgreSQL reference cluster with commit-timestamp tracking enabled. The entire migration history applied successfully there. The cluster was stopped and deleted after the full suite; the normal development database was not restarted or reconfigured.
- Additive migration `20260907232219_AddTrialAndReconciliationDrafts` adds four nullable fields, one index and one restrictive foreign key. It was applied to local development only; EF reports no model drift and the full ERD is current. Reviewed production SQL SHA-256: `2B56AC6801CD7147F19BC25E462A6152BD804972561A2D7B10108B18B94CFFFA` (`artifacts/portal-completion-20260907/add-drafts.sql`). There is no backfill or historical-row rewrite in its forward migration.
- Storage release-helper checks passed for Preserve, Local, successful completion, rollback, intervening-setting refusal, case-insensitive S3 refusal and different-root refusal. Shell syntax checks passed. All used temporary dummy configuration; no production credentials, file bytes or configuration changed.
- The actual Trial components passed synthetic desktop/narrow save/resume review without business API calls. All temporary fixture/authoring code, review server/tab and isolated database introduced by this change were removed.
- Eight affected Phaeno help guides and the generated documentation corpus were updated; Customer and Partner behavior remains unchanged. The Word guide has **26 pages and 11 screenshots**, retaining all ten earlier screenshots and all three tables. Final pages were visually inspected.

### Release boundary

Application revision [`38fd3a230d361db5334960b1d1067b34d0bcd572`](https://github.com/behaack/phaeno-ops-mgmt-system/commit/38fd3a230d361db5334960b1d1067b34d0bcd572) was committed and pushed to `codex/portal-documentation-search-release`. Production migration application still requires explicit approval under `AGENTS.md`; the coordinated API/Portal deployment has not been dispatched. Apply the migration through the backup-gated production workflow before admitting the new API/Portal revision. Keep S3 inactive; select the private persistent Local volume for the requested Local rollout only after checking the existing provider/root and volume permissions. Provider rollback restores the prior storage settings before restoring the old API image, and never moves or deletes file bytes.

The ClamAV adapter is implemented, but no daemon or production scanning configuration was provisioned. Storage selection does not establish usable clean-file workflows. Production scanning, authenticated storage/role acceptance, backup/restore, scientific upstream identity and physical Laboratory acceptance remain explicit operational work. No production deployment or business-data write is claimed for this revision yet.
