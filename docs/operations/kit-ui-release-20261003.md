# Kit receipt and cancellation UI release — October 3, 2026

## Scope and source

The owner authorized documentation, complete successful tests, commit/push and deployment under the [release plan](../plans/KIT-UI-RELEASE-20261003-PLAN.md). This release gates Record kit receipt on a dispatched kit awaiting receipt, keeps Customer/Partner Job and phase cancellations inside neutral Actions menus with red destructive items, and renames Kit shipments to Fulfilled requests. Queue membership and removal of the shipping workspace after all samples are sent were discussion only and are excluded.

Application source is `5bc89d13e59b3bde9e784ab188dfec0641eb4429`, pushed to `codex/kit-ui-release-20261003`. Product/documentation commit `1e4367b95fccef0983d8ae3f937b5fdd9a5a2b05` and the necessary security follow-up are isolated from concurrent pending work. Vercel rejected the first unpromoted UI for [CVE-2026-102989](https://github.com/TanStack/router/security/advisories/GHSA-qx66-fv34-fjm8); no dangerous override was used. Existing dependencies are pinned to React Start 1.168.60, Router 1.170.41, SSR query adapter 1.167.3 and React Query 5.102.0, with server-core 1.169.39. The adapter alignment fixes the verified SSR compatibility failure. All 159 generated route paths remain present; the locked graph excludes the known compromised TanStack versions.

## Verification

| Gate | Final result |
| --- | --- |
| Backend Release build | Zero warnings/errors |
| Full connected backend | 1,201 passed, two intentional environment skips, zero failures |
| Full frontend unit suite after dependency alignment | 1,363 passed in 212 files |
| Full desktop/mobile Chromium after dependency alignment | 198 passed, two intentional mobile print skips, zero failures/flaky cases |
| Lint, TypeScript, production build | Passed |
| Documentation generation/consistency | 56 guides, corpus `3fe25a14288c` |
| EF model differences | None; no migration required or applied |
| Whitespace/staged credentials | Passed |

Backend verification used a freshly migrated disposable loopback PostgreSQL 18 database, then removed it. The backend skips require the symbolic-link storage host and dedicated recovery-export environment. Browser suites used isolated mock-session port 3123 and made no hosted operational writes. The earlier incompatible adapter and cold-cache focused runs are superseded by the clean full runs. Physical, scientific, provider and authenticated operator acceptance remain separate.

## Recovery and preservation

Before activation, API source was `66240861c32c49af1b85ac4fa4c0dcf9f6fcd5c7`, image `phaeno-portal-green-api:sha-66240861c32c-run-37077429646-1`, image ID `sha256:f25539681ce239243dc6f054604b59cfc62fddb67902fcd65c11bcdc8b58e4cc`, and public UI `dpl_V8im1BDmMvdceQhNsnbSgdaxeo21`. The production-hosted test database `phaeno_portal_green` has fourteen migrations through `20261001205012_AddOnDemandPhaseKitShipping`. All 231 application table counts, runtime hashes and normalized storage mounts were captured and rechecked. Every existing row, identity, private file and runtime setting is preserved; no reset, repair, Clerk cutover, Website UI or OCIA change is included.

[Backup run 37151994237](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/37151994237) succeeded from the exact application source. Snapshot `snapshot-20261003T203405Z-10f985ac-09a3-43e1-99eb-da1934767a43` passed coordinated database/private-file backup, isolated restore, encryption round trip, file restore and cleanup checks. File inventory is zero files. Off-server artifact `11284755095`, named `portal-snapshot-20261003T203405Z-10f985ac-09a3-43e1-99eb-da1934767a43`, is 1,117,698 bytes, unexpired, with SHA-256 `a72177accaf03b18628c7987dc8651296d82eaceefb44aed3f85885c9a3c7a8e`. The backup workflow was immediately disabled again; older recovery points remain retained.

## Activation

The UI is staged Ready as `dpl_3Q9LGPGXXqYaJJFZswkRFBi3vvae` at `phaeno-ops-mgmt-system-h594nw1ij-cadexgenomics.vercel.app`. Vercel's independent deployment metadata confirms the exact application source. A clean Git archive supplied committed source only, with mock sessions disabled and production settings kept on Vercel.

[API run 37152095279](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/37152095279) completed successfully from the same source, with migrations and Clerk cutover false and storage, scanning and bootstrap Preserve. The workflow was immediately disabled again. The running image is `phaeno-portal-green-api:sha-5bc89d13e59b-run-37152095279-1`, image ID `sha256:0af7790d49c05c88e0cc5f3b25a8ad1c9f37585bc55b96f70941b12b6835415e`, from release `/opt/phaeno.portal-green/releases/5bc89d13e59b3bde9e784ab188dfec0641eb4429-37152095279-1`. Post-activation checks confirm all 231 application table counts, fourteen migrations, runtime hashes and normalized storage mounts match the baseline.

Only after API verification was the matching UI promoted. Independent inspection of `https://portal.phaenobiotech.com` resolves to Ready deployment `dpl_3Q9LGPGXXqYaJJFZswkRFBi3vvae`. Live checks pass: direct API health 200, database ping 204, protected shipment queue 401, public Website search and root 200, Portal root and proxied health 200, and proxied protected shipment queue 401. An isolated production browser rendered the actual Clerk sign-in form with zero console warnings, errors or page exceptions; no credentials or operational forms were submitted.

Both protected workflows read back `disabled_manually`. Both Vercel Git deployment controls remain false. Prior recovery points and unrelated development work are retained. Local temporary staging/build outputs are removed after use; ignored verification logs, TRX and screenshots remain as evidence. The controlled release is complete; authenticated operator, provider, physical and scientific acceptance remain separate.
