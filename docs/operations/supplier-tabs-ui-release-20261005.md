# Supplier tabs UI-only release — October 5, 2026

The owner authorized commit/push and Portal UI deployment of the supplier detail
change: full-width **Products | Addresses**, Products selected by default,
independent retained filters and URL-backed tab selection. The owning
[release plan](../plans/SEQUENCING-VENDOR-CATALOG-PLAN.md#supplier-tabs-ui-only-release--october-5-2026)
defines scope and rollback. The earlier hosted database planning gate is covered
by the [completed preserving release](portal-workflow-release-20261005.md).

## Scope and verification

This is a UI-only release. API source remains
`c781988630ddfdb07f0d76dd7c3bb9753c15d660`, with twenty migrations. No API
deployment, migration, data reset, runtime provider/authentication change or public
Website deployment is included. The current UI rollback deployment is
`dpl_EeQv4SD3AgZkL8fKGw2DMHyxcDS2`.

Scoped lint, TypeScript, help freshness and whitespace checks pass. Read-only
simulated desktop/320 px previews in light/dark confirm Products default,
full-width equal tabs, exclusive panels, preserved filters, keyboard selection
and focus, no overflow, no API writes, no browser errors and zero automated
accessibility violations. Existing component and product-creation E2E selectors
are adapted; no automated regression suite was requested or executed for this
presentation follow-up.

Keep the current generic guide and generated help hash `1fcbe16fb9a6`, matching
the running API. The planned tab-specific help wording is recorded in the owning
plan for a paired UI/API release, preserving documentation search compatibility.

## Activation

Application UI source `4c61eddb73a94e4c46d26caefc4e0bddaabb7753` is committed and
pushed to `codex/portal-documentation-search-release`. Its production build
passed from a frozen Git archive matching all 1,056 frontend files after
canonicalizing Windows line endings. Existing lockfile-compatible dependencies
were reused with installation skipped; no dependency changes were introduced.
Production Clerk is configured, mock sessions are disabled and `/api` retains the
existing public proxy. The built help hash matches the current API corpus.

Staged UI `dpl_Fk24GZmK2zmyHojYgLw1StfatFkj` reached READY from this exact source
and passed protected-root rendering before promotion. Canonical Vercel alias and
source metadata confirm that [Portal](https://portal.phaenobiotech.com) serves the
same commit at `phaeno-ops-mgmt-system-30e6tvwl6-cadexgenomics.vercel.app`.

Live health 200, database ping 204, accession/vendor lookup authorization 401
both directly and through the Portal proxy, Website search/root 200 and Portal
root 200 all pass. Production Clerk sign-in controls render with zero browser
warnings/errors. The API source/image remains
`c781988630ddfdb07f0d76dd7c3bb9753c15d660` /
`phaeno-portal-green-api:sha-c781988630dd-run-37380436791-1`, healthy with twenty
migrations. Both protected workflows remain disabled and both Vercel Git holds
remain enabled. No production catalog write was performed. Authenticated supplier
and documentation-search walkthroughs remain separate from the source/version
compatibility and simulated browser evidence recorded here.

The frozen build/configuration directory and source archive are removed after
verification; shared installed dependencies are preserved. Logs, deployment
metadata, source/configuration proofs and live smoke evidence remain under
ignored `artifacts/supplier-tabs-ui-release-20261005`. The final documentation
checkpoint records activation; UI deployment remains pinned to the application
commit above and the API remains on its previous source.
