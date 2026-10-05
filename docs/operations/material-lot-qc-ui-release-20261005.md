# Material lot QC layout UI release — October 5, 2026

The owner added this adjustment during the authorized commit/push and UI release:
Record QC belongs on the material card's top row at the trailing edge; details
must wrap to accommodate the button. The
[owning plan](../plans/LAB-OPERATIONS-PLAN.md#material-lot-qc-action-placement--october-5-2026)
records the scope and preserving UI-only release process.

## Verification and boundary

Scoped lint, TypeScript, help freshness and whitespace checks pass. Read-only
simulated desktop/320 px previews in light/dark verify top-right action placement,
wrapped details, no overlap/overflow, QC dialog Cancel focus return, action absent
for an operator, no browser errors and zero accessibility violations. No API request
or QC outcome is performed. Button label/ID, supervisor/Pending guard, QC workflow,
version and scientific outcome rules are unchanged. The accurate generic materials
guide and API-compatible help corpus remain unchanged.

UI rollback deployment is `dpl_Fk24GZmK2zmyHojYgLw1StfatFkj`. API source remains
`c781988630ddfdb07f0d76dd7c3bb9753c15d660`, healthy with twenty migrations.
No API deployment, EF migration, data reset, provider/authentication change or
public Website deployment is included. Keep both protected workflows disabled
and both Vercel Git deployment holds in place.

## Activation

Commit/push, frozen-source production build, protected staging/source verification,
promotion and live checks are pending. Preserve shared installed dependencies and
remove task-only build/configuration copies after verification. Retain deployment,
preview and live smoke evidence under ignored
`artifacts/material-lot-qc-ui-release-20261005`.
