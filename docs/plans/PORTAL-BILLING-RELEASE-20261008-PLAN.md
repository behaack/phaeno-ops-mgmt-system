# Portal billing dialog and navigation release — October 8, 2026

## Authorized scope and source

The Owner requested remote API and Portal UI updates after the billing dialog and stale Finance navigation fixes. Release only those changes and matching Phaeno documentation/corpus. Base application source is 247bb15e75fa98e656f205329d146c6fb6d7e59f; application source is identical to the previously deployed 49a90f77b41ceacd42c54d5d0b709c262f797e89 before this overlay. The scoped package excludes the worktree's unfinished CRM contact-association, CRM API/DTO, generated routing and holiday-seed changes. Preserve the owner's working tree and Git index. On October 8 the Owner explicitly authorized the scoped commit and push needed to produce the new source revision required by the protected API deployer.

The clean source package and eight-file SHA-256 manifest are retained under the task's portal-billing-release-20261008 directory. API Release build passes with zero warnings/errors; clean-source frontend TypeScript, focused lint, UI production build and the 56-guide corpus check pass. The earlier dirty-worktree TypeScript errors belong to the excluded CRM work. Local browser evidence verifies the actual modal scrolls, has no inner card, keeps Save in the footer, focuses missing tax-rate validation and reveals Exempt evidence and Finance approval. Automated suites were not requested. The local UI build is a compilation gate, not a staged production-configured deployment.

## Exact target and preservation

Use the existing Portal green stack at /opt/phaeno.portal-green, PostgreSQL 18 database phaeno_portal_green, API api.phaenobiotech.com and Portal portal.phaenobiotech.com. The documented Vercel target is cadexgenomics/phaeno-ops-mgmt-system (prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R). Preserve every hosted row, account, Department, invitation, entitlement, mock supplier/product, workflow, sample/shipping definition, kit, private file and runtime setting. The September 29 database replacement is already complete; this release uses that existing database and prepares no replacement. No schema changes or EF migrations, database reset, identity cutover, auth/provider activation, Website frontend deployment, OCIA update, DNS or Nginx change is authorized or needed.

This separate preserving plan addresses the hosted-database gate through the completed replacement and established recovery procedures. The Owner's API/UI instruction authorizes one manual release after the gates below. Vercel automatic Git deployment holds remain enabled; any temporary protected backup/deployment workflow enablement is restored afterward.

## Recovery and activation gates

1. Obtain a committed, published exact source revision containing only the reviewed release files and this plan. Confirm the release package, generated corpus and application diffs match it. Inventory the active API image/source, public UI deployment/alias, database migration history, protected runtime hashes, private mounts and health; unexpected drift stops activation.
2. Run the existing protected backup-and-collect workflow for the exact reviewed revision. Require a fresh coordinated encrypted database/private-file snapshot, isolated restore verification, encryption round trip/checksums, cleanup/API resume and off-server recovery. Preserve all prior recovery points; no reset or baseline migration is attempted.
3. Stage the same reviewed Portal revision with the existing Production environment, production Clerk configuration, mock sessions disabled and existing API proxy. Do not assign the canonical domain until the API passes. Confirm the project/team and production deployment identity before promotion; never substitute another project.
4. Run Deploy Portal Green for that exact revision with apply_migrations=false, storage/scanning/bootstrap Preserve and Clerk cutover=false. Retain its preflight, deployment lock, scanner/storage checks, image identity, public Website dial tone and automatic non-migration rollback. Never bypass protected runtime permissions to deploy.
5. Verify healthy API, unchanged migration count/runtime/private services, matched help corpus and direct/proxied authorization. Promote the staged Production UI only afterward. Verify canonical alias/source, fresh sign-in rendering, Finance entry under More, real billing-modal scroll, visible footer Save, conditional tax fields and non-writing validation. Do not save real billing decisions or issue invoices during smoke.
6. Restore workflow disabled states and retain automatic Git holds. Record source/image/deployment/recovery identities and API, UI, database and authenticated smoke as separate boundaries. Clean only task-created disposable build artifacts; retain reviewed source, manifest and recovery proof.

## Rollback

With no migration or hosted data transformation, restore the inventoried API image/runtime and prior Vercel production deployment if activation/smoke fails. The existing database and file volumes stay attached. If real business facts have changed, preserve them and use a reviewed forward correction; do not restore old data merely to undo this UI/help release.

## Current preparation and blockers

The existing SSH key and pinned host identity connect to the documented Portal host as appuser. Protected deployment-manifest access is denied, and existing sudo requires a password; no privilege or auth changes were attempted. The GitHub connector can administer the intended repository, so protected CI can use its existing server credentials once the authorized release revision is published. Vercel lookup by exact project ID and canonical Portal hostname returns not found; the connected intended team currently lists only an unrelated project. Portal-project deployment access must be restored before staging. No workflow was enabled, commit created, source pushed, backup started, migration applied or hosted API/UI changed during preparation.
