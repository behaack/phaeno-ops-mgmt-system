# Library preparation release - September 17, 2026

## Authorization and source

The owner requested commit, push and deployment of the pending application work, then explicitly authorized EF migrations on the production database. The owner separately requested committing the agreed Lab step and Configuration preview requirements to a plan; those capabilities are planned, not implemented.

- Application revision: `4df13cb42d38fb1b1304b247e75a436411e72bb9`.
- Requirements plan revision: `da8828868928804496ef19c8ed6998f3b3d7f002`.
- Branch: `codex/portal-documentation-search-release`; both revisions pushed.
- The application commit contains the pending Lab configuration, preparation, shipping and associated documentation/acceptance work. The mutable local search-index `segments.gen` file was excluded from the commit and left intact locally.
- [Lab steps and configuration preview plan](../../plans/LAB-STEPS-AND-CONFIGURATION-PREVIEW-PLAN.md).

## Validation

Release solution build passed with zero warnings/errors; full frontend lint passed. Frontend typecheck, scoped lint and generated documentation checks passed during the shared-output implementation checkpoint. Whitespace checks passed. No automated tests were executed during this release; authored tests and prior acceptance evidence are not represented as a new full-suite run.

## Production API and migrations

[Deploy Portal Green run 35258640614](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/35258640614) succeeded for exact application revision `4df13cb42d38fb1b1304b247e75a436411e72bb9`. Inputs: migrations enabled, file storage/scanning Preserve, Clerk identity cutover false.

The deployment workflow completed its pre-migration backup verification. Encrypted dump and key checksums for `pre-migration-20260917T182855Z-4df13cb42d38` both reported OK at 18:29:00 UTC. Logs confirm these four migrations applied at 18:29:04-05 UTC:

1. `20260916201610_AddSupplierProductCatalog`
2. `20260916202935_AddManagedProductTypes`
3. `20260916235423_AddLabApprovalOverrides`
4. `20260917120029_AddPhysicalPreparationTray`

Deployment reported success at 18:29:15 UTC, with matching source revision and unchanged Website intake counts `12,5`.

Independent post-release probes returned API health 200, database ping 204, Portal root 200 and Portal API-health proxy 200. No operational specimen/output/evidence records were created for verification.

## Portal UI promotion pending

GitHub reports success for the exact-application-commit [Portal preview deployment BxLhtu6yiASk3jNSk4Hk7P1bH2CD](https://vercel.com/cadexgenomics/phaeno-ops-mgmt-system/BxLhtu6yiASk3jNSk4Hk7P1bH2CD).

Production promotion is not complete. The signed-in Vercel dashboard requires the owner's authenticator code. The Edge sign-in tab is left for the owner to complete; resume by opening the exact preview above and promoting it with production environment settings, then verify the production deployment source and Portal rendering. A 200 from the existing Portal domain is availability evidence, not proof that the new frontend is deployed. No public Website production promotion was performed.

## Remaining acceptance

Finish Portal UI promotion, verify its exact source revision and perform fresh signed-out browser smoke checks. Authenticated populated workflow acceptance, physical barcode handling and scientific validation remain separate from release/build checks.
