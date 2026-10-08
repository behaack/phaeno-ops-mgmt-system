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

UI source `2fe9571d5ed722365a6c91f687703ade267b7e72` is committed and pushed to
`codex/portal-documentation-search-release`. The production build passed from a
frozen Git archive matching all 1,056 frontend files after line-ending
canonicalization. Existing verified dependencies were reused without installation;
production Clerk, disabled mock sessions and the existing `/api` proxy are verified.
The built help corpus remains compatible with the current API.

Staged deployment `dpl_HkmQDYddxbcAj37ZKc1MvgGinis2` reached READY from the exact
pushed source and passed protected-root rendering before promotion. Canonical
Vercel alias and source metadata confirm [Portal](https://portal.phaenobiotech.com)
serves that same source at
`phaeno-ops-mgmt-system-mo5pp72l4-cadexgenomics.vercel.app`.

Live health 200, database ping 204, accession/vendor lookup authorization 401
directly and through the Portal proxy, Website search/root 200 and Portal root
200 all pass. Production Clerk sign-in renders with zero browser warnings/errors.
The API remains healthy on source `c781988630ddfdb07f0d76dd7c3bb9753c15d660`
with twenty migrations; no API deployment or migration occurred. Both protected
workflows remain disabled and both Vercel Git holds are preserved. No QC outcome
or production catalog write was performed during verification or deployment.
Authenticated QC execution remains separate from the simulated layout/focus and
public smoke evidence; scientific QC behavior was not changed.

Task-only build/configuration copies, archive and preview fixture/cache are
removed; shared installed dependencies are preserved. Deployment metadata,
configuration/source proofs, preview screenshots and live smoke evidence remain
under ignored `artifacts/material-lot-qc-ui-release-20261005`. The final
receipt checkpoint is documentation-only; UI stays pinned to the application
source above and API remains on its previous source.
