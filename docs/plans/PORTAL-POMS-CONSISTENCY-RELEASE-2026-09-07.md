# Portal consistency documentation and production release

## Authorized scope

On September 7, 2026 the Product Owner requested complete User documentation, an updated `docs/Phaeno-POMS-Order-to-Cash-Guide.docx`, commit/push/production deployment, and removal of temporary code after verified data repair followed by another documentation review.

Release the 20-item consistency implementation from the existing `codex/portal-documentation-search-release` branch. Preserve the unrelated tracked local Website index binary. No schema migration, Clerk identity cutover, storage activation, retention deletion activation or inferred historical-record merging is included.

## Release sequence

1. Review all 55 registered audience guides and current source. Update Word instructions and inspect every rendered page.
2. Retire the unconfigured QuickBooks gateway's synthetic success/payment responses. Keep current Assembly credit rules, historical records and authorization intact.
3. Build/typecheck/lint as appropriate; check documentation generation and file links. The repository instruction to reserve test-suite execution for an explicit request remains in effect.
4. Commit and push the reviewed changes. Use the existing protected Deploy Portal Green workflow with migrations and Clerk cutover false, and the temporary read-only consistency audit true. The audit runs before restarting the API and emits no freeform business content or credentials.
5. Verify API workflow/image source revision, health and database ping; create the matching Portal production build using Production environment values and verify its domain, revision and runtime logs.
6. Use inventory evidence and confirmed source-of-truth values to scope data repair. Do not infer a historical requested relationship from today's organization kind or mark unverified billing/scientific/shipping requirements complete.
7. After repairs are verified, remove the temporary inventory step/input/SQL and any recovery-only code whose stored-data dependencies are resolved. Recheck all affected User documentation and the Word guide; commit/push/deploy the final cleanup if it changes the released application.

## Current evidence

- Existing API and Portal production release: `b2bc04ba8a9a3433bec2ecbc137cef29fa2db5c5`, API workflow `34009074864`, Vercel `dpl_ChTsgPMUgxEuJxx6TSBSCnhPkWFv`.
- API health was 200/healthy before this release. Git fetch and protected workflow API access succeeded.
- The connected Vercel tool does not expose the Portal project; the signed-in Vercel project UI is available for the release.
- Repair-target clarification is pending; read-only inventory and documentation work can proceed independently.
- The temporary SQL completed all ten sections against the guarded local `localhost` / `phaeno_ops` database in a read-only transaction. It found one legacy Defaults row without supported sample/result modes or submission instructions, and twelve unassociated development organizations with no exact-name Company candidates. It found no affected historical relationship targets, prior link-audit candidates, receipt evidence or synthetic commercial documents. The only outbox record was a succeeded catalog sync. These are development findings, not production findings or authorization to populate business instructions.
- The release solution compiled with zero warnings and zero errors, including the unconfigured QuickBooks safety change and test-project compilation. Test methods were not run.
- Documentation review is complete: all 55 audience guides reviewed, 45 guide bodies updated, every registry review date refreshed, authored links/anchors and generated corpus checked. Corpus fingerprint: `4c9b63d266d9d568af28612fff9671aded1bb01da6a600252c91cb40f686cbbb`.
- `Phaeno-POMS-Order-to-Cash-Guide.docx` is a revised 16-page practical guide. Every final page was visually inspected; the document accessibility audit returned zero findings. SHA-256: `0f82b26c55a7fe8bcd2c3e80ead80cc7098d5cf12c14347cde2a78b7266153a4`.
- Frontend TypeScript, full ESLint with zero warnings, and production build passed. The existing client bundle-size advisory remains non-blocking. Temporary audit workflow YAML parses, its shell body passes syntax validation, and its SQL completes against local development data without writes.
- Final backend source review corrected Assembly storage cleanup after failed idempotent saves and Customer-conversion readiness within the existing atomic transaction. Associated regression sources were added; test execution remains deferred under repository instructions. No further concrete release blockers were found in the reviewed workflow changes.
- New release revision, audit results and final cleanup evidence will be recorded here as they complete.
