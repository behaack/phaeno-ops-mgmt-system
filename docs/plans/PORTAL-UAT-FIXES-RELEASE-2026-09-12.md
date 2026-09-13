# Portal UAT fixes release — September 12, 2026

## Authorized scope

The owner requested a saved UAT checkpoint, commit and push of accumulated changes, and redeployment of the API and Portal UI. The [saved laboratory checkpoint](../testing/runs/2026-09-12-laboratory-uat-closeout.md) identifies the next step, preserved fixtures and outstanding acceptance gates. The [Finance and production follow-up](../testing/runs/2026-09-12-lab-production-verification.md) retains the detailed findings and the unresolved legitimate completed-Job invoice journey.

Changes include result registration concurrency/replay recovery; validation errors in the API failure envelope; Finance receipt multipart upload and download filename handling; saved reconciliation report presentation/download; role-appropriate navigation and related links; disabled-capability guidance; narrow-layout wrapping; and immediate preparation access denial without exposing cached staff data. Focused tests, current Phaeno help and generated documentation accompany the fixes.

There are no persisted-model or migration changes relative to the previous deployed source `5365a38015e8fd444b6e802b5e5345c1dbe6ab57`. Use `Deploy Portal Green` on the current release branch with migrations disabled, storage/scanning Preserve and Clerk identity cutover disabled. Keep current production feature flags. Deploy only the Portal Vercel project, rebuilding the exact Git source for the production environment after API success.

Local test identities, credentials, fixture databases/files, ignored helper scripts and generated private search-index changes are excluded. No public Website production deployment is in scope.

## Verification and deployment

Pre-release checkpoint passed:

- Frontend: 76 tests across nine changed/related suites; TypeScript; scoped ESLint; generated 56-guide corpus check (`9e7fac7318fd`).
- Backend: API and test assembly built successfully in isolated `tmp/uat-release-build`; three API validation-envelope tests passed. Both PostgreSQL concurrency tests passed against the owned loopback UAT cluster, with zero skips.
- Git whitespace checks passed; no migration/model changes since the deployed application revision. Remote branch matched local HEAD before creating this release commit.

Earlier successful local tests and signed-in UAT are retained in the linked runs; deployment smoke checks do not substitute for scientific, provider, Customer download or final acceptance signoff. UAT remains open.

## Production deployment completed

Application commit `26839b4c7739ca1e5f3934335c9f5a758cd6a55c` was committed and pushed to `codex/portal-documentation-search-release`.

- API: [Deploy Portal Green run 34736875788](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/34736875788) succeeded for the exact commit. Release build logged zero warnings/errors; runtime deployment logged the matching `source_revision`. Migrations and Clerk identity cutover were disabled; file storage/scanning were Preserve. The public dial-tone step passed.
- Portal UI: the Git-built preview `dpl_E1SjuC4v7Y9KUR12SwfYR1jBLECT` passed for that commit. After API success, it was rebuilt for production as [deployment dpl_3AgHRLYfVrm1NogVQYFv6abvY6gs](https://vercel.com/cadexgenomics/phaeno-ops-mgmt-system/3AgHRLYfVrm1NogVQYFv6abvY6gs). Vercel reports Ready, target production, and https://portal.phaenobiotech.com points to it. Deployment URL: https://phaeno-ops-mgmt-system-ik06d7jvs-cadexgenomics.vercel.app. The exact commit's Vercel status also points to this production deployment.

At approximately 04:06–04:09 UTC September 13 (September 12 local): direct API health and Portal-proxied health returned 200/healthy; database ping returned 204; Portal root and its deployed CSS/JS assets returned 200; anonymous access to the protected Lab endpoint through the Portal returned 401. The active production alias was independently inspected again. Error-level and 5xx Vercel log queries for the new deployment over the preceding ten minutes returned no entries; this is a bounded check, not long-term monitoring evidence.

Read-only signed-in Edge verification used a separate production tab. The original loaded page retained old dashboard content after a reload; fresh navigation loaded the new CSS identity `styles-DYAU23Lj.css` and corrected content. Dashboard now shows Attention queues not enabled without Retry attention or the disabled queue link. Order operations opens successfully; Result release shows the neutral Result release not enabled guidance without failed-query controls. The Result release layout was visually inspected. No production form, scientific approval, release or Finance mutation was submitted.

Only Portal production was explicitly redeployed. Git integration also creates automatic Website previews; no Website production promotion occurred. The generated local private search-index file remains uncommitted and the local UAT fixtures/services remain preserved. This documentation-only evidence commit follows the deployed application source and does not require another API/UI rollout. Resume UAT at the saved checkpoint; no final acceptance is asserted.
