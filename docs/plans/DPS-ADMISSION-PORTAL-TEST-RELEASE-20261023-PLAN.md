# DPS output admission — Portal-only hosted-test release

Status: **authorized for preparation, publication and Portal-only deployment**. October 22, 2026 PDT / October 23 UTC. The Owner approved committing the reviewed changes and deploying the Portal API and matching frontend/help. This does not authorize deploying, installing, starting or changing DPS, or running any assembly or real pilot.

## Scope

Release the Portal output-admission preflight against the configured scanner/file/set limits, focused fixtures and matching Phaeno help/corpus. Retain `poms-dps/1.0`, endpoints, authentication, runtime/storage/scanning selections and scientific QC/release boundaries. No persisted model or migration changes. Preserve the separate DPS source patch, hashes, verification and handoff as repository artifacts; do not activate that patch or publish changes to the separate pipeline repository as part of this release.

The [engineering handoff](../operations/real-assembly-engineering-20261022.md) records the local implementation and focused proof. The [real-assembly plan](REAL-ASSEMBLY-HOSTED-TEST-IMPLEMENTATION-PLAN.md) continues to hold native scientific qualification and the real pilot.

## Target, preservation and recovery

Target only the existing hosted-test Portal at `portal.phaenobiotech.com`, its API under `/opt/phaeno.portal-green`, existing PostgreSQL 18 database/volume, and Vercel project `phaeno-ops-mgmt-system` (`prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R`, team `team_DbkKTfQmQz9atu435ZBugMDD`). Keep the current database in place: no replacement database, import, reset, cutover, migration or identity conversion is needed.

Before activation, record current release/image/frontend identities and obtain a fresh encrypted coordinated database/file/runtime recovery package. Restore the dump into an isolated PostgreSQL 18 instance and compare all table fingerprints; collect the encrypted package off-server and verify decryption and every included file checksum. Preserve every table and record, explicitly including complete `website.web_contacts` and `website.web_orders` history, IDs, contents, timestamps, language/state and actor references. Preserve every current runtime/document/Local file, all S3 versions, all assembly attempts/commands/receipts/events and original execution facts. Retain the existing populated-S3 recovery deferral and disabled backup timer.

Record and compare the complete target specimen history and provider ledger/release identities. Only read DPS state; no remote DPS file changes or restart. No Start, Cancel, reconciliation, repeat, scientific approval, QC Pass, Customer release or business-data repair is in scope. Unrelated OCIA services and Website deployments remain unchanged.

## Publication and activation

1. Verify the exact DPS patch hashes, focused-test receipt, documentation freshness, source whitespace, Portal Release build and production frontend build. Run required exact-source `ui-quality`, `visual-baselines` and `workflow-behavior` checks without changing enforcement or accepting new images.
2. Commit/push the reviewed Portal changes and preserved DPS package on a `codex/` branch. Publish and merge through the normal protected PR path after required checks succeed. Do not push directly to protected `main` or change protections.
3. Stage an exact-source production-environment Vercel deployment without assigning domains. Keep both Vercel Git deployment holds. Verify staged root/entry assets and matching help corpus before promotion.
4. Recheck fresh recovery, zero active assembly work, unchanged runtime settings and the orphan deployment quarantine. Known orphan `39056745064` is queued with zero jobs; never retry it or remove its exact-path fence. If this condition persists, use the established protected direct-host deployment script, retaining its exact-source UI checks, deployment lock and auth/storage/scanner guards. Keep `Deploy Portal Green` disabled unless a safe bounded workflow run is actually used; restore disabled state afterward.
5. Activate only the Portal API from the exact reviewed source, with migrations and identity cutover false and all provider selections preserved. The existing Portal-owned SSH tunnel may need to follow the replacement API network namespace; that does not authorize changing or starting DPS. Promote the tested matching frontend after API verification, preserving skew-protection behavior and restoring temporary auto-domain settings.

## Acceptance and rollback

Verify exact API source/image and canonical frontend/asset identity, health/database/scanner, anonymous protected-route rejection, matching help corpus/index and signed-in assembly/history/help readback where an existing authenticated session is available. Do not create production test records or start an assembly. Retain focused scanner-budget/admission fixtures as local proof; do not claim hosted scientific execution or real native qualification.

Compare all original tables/files and complete Website intake contents with the pre-release snapshot, identifying only expected release metadata and index changes. Confirm all receipts and original execution facts unchanged and no DPS installation/ledger/release/process mutation. Record checks, source identities, recovery hashes and acceptance limits in a release receipt under `docs/operations/`.

On failure, restore the retained API image/release and frontend deployment. No schema/data rollback is needed. Never restore an older database or DPS ledger over later activity; preserve any new evidence and use a separately reviewed recovery scope if necessary. Preserve workflow/Vercel holds, orphan quarantine and the real-pilot hold.
