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

Commit/push, production build, staged source verification, promotion and live
checks are pending. Preserve Vercel Git deployment holds and both disabled
protected workflows. Record the final UI source/deployment identity and confirm
that API source and migration count remain unchanged.
