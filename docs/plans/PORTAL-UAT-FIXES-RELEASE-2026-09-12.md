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

Exact production deployment identities will be recorded here when completed. Earlier successful local tests and signed-in UAT are retained in the linked runs; deployment smoke checks do not substitute for scientific, provider, Customer download or final acceptance signoff. UAT remains open.
