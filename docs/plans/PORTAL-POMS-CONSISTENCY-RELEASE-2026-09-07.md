# Portal consistency documentation and production release

Completed September 7, 2026: the final application revision `1c55725dc07ed0213c9d1a796f499239ec436c42` is live on both API and Portal production. All 55 User guides and the 16-page Word guide were reviewed, the audit-proven Company link was restored, temporary tooling was removed, and documentation was checked again. Approved sample-submission instructions and signed-in populated acceptance remain separate outstanding operational work.

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
- The repair target was initially unspecified. Production inventory and the original immutable onboarding/link history subsequently identified the single lost association precisely; this restoration is within the requested data-repair cleanup and makes no new identity or business-rule decision.
- The temporary SQL completed all ten sections against the guarded local `localhost` / `phaeno_ops` database in a read-only transaction. It found one legacy Defaults row without supported sample/result modes or submission instructions, and twelve unassociated development organizations with no exact-name Company candidates. It found no affected historical relationship targets, prior link-audit candidates, receipt evidence or synthetic commercial documents. The only outbox record was a succeeded catalog sync. These are development findings, not production findings or authorization to populate business instructions.
- The release solution compiled with zero warnings and zero errors, including the unconfigured QuickBooks safety change and test-project compilation. Test methods were not run.
- Documentation review is complete: all 55 audience guides reviewed, 45 guide bodies updated, every registry review date refreshed, authored links/anchors and generated corpus checked. Corpus fingerprint: `4c9b63d266d9d568af28612fff9671aded1bb01da6a600252c91cb40f686cbbb`.
- `Phaeno-POMS-Order-to-Cash-Guide.docx` is a revised 16-page practical guide. Every final page was visually inspected; the document accessibility audit returned zero findings. SHA-256: `0f82b26c55a7fe8bcd2c3e80ead80cc7098d5cf12c14347cde2a78b7266153a4`.
- Frontend TypeScript, full ESLint with zero warnings, and production build passed. The existing client bundle-size advisory remains non-blocking. Temporary audit workflow YAML parses, its shell body passes syntax validation, and its SQL completes against local development data without writes.
- Final backend source review corrected Assembly storage cleanup after failed idempotent saves and Customer-conversion readiness within the existing atomic transaction. Associated regression sources were added; test execution remains deferred under repository instructions. No further concrete release blockers were found in the reviewed workflow changes.
- Production application revision: `cf6995b360fbc9b77bd3ddccf9223e30eb4062b8`, committed and pushed on the existing release branch.
- [API release 34156823295](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/34156823295) succeeded. The running image reports this exact revision and tag `sha-cf6995b360fb-run-34156823295-1`. Migrations and Clerk identity cutover were false. Public API health returned healthy/200, database ping 204, and anonymous session 401 after deployment.
- [Portal production deployment](https://vercel.com/cadexgenomics/phaeno-ops-mgmt-system/76apddFtbKEAqyVTnVdTNrPZqiMZ) `dpl_76apddFtbKEAqyVTnVdTNrPZqiMZ` rebuilt the same revision with Production environment values and reached Ready on `https://portal.phaenobiotech.com`. Its production entry point renders the sign-in screen with the new Help and documentation footer; a fresh signed-in session is required for protected-workflow acceptance.
- Runtime logs for this UI deployment show a 200 request on the production domain and no console Error/Fatal entries in the observed window. Automated probes of `/__clerk` paths returned 404; those paths are not configured application routes or a same-origin Clerk proxy. This is limited runtime evidence, not populated sign-in or workflow acceptance.

## Production inventory and cleanup gate

The September 7 inventory completed in a read-only transaction before the API restarted. It found no incorrect historical relationship targets, receipt-evidence records, synthetic accounting documents or active outbox records. It found one unassociated active Customer whose former active Company link is present in immutable audit history; there is one exact-name candidate and no conflicting current Company link. That original link requires precise version/audit verification before restoration. Existing Customer and Company identities, request state and audit history must remain intact.

The single Order defaults row still has unconfigured sample/result settings and no submission instructions. Effective service catalog and shipping definitions exist. Missing submission instructions require approved operational content; they must not be invented merely to clear readiness. One old Lab-credit flag remains historical; it is not a PSeq result-release gate.

The unconfigured QuickBooks simulator has been removed from application source; its replacement explicitly reports unavailable operations. Durable authorization, audit history, supported compatibility responses and validation are not temporary repair code. Temporary inventory/restoration tooling was removed after the verified repair below.

### Exact restoration prepared

[Expanded inventory run 34157376083](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/34157376083) succeeded from `a5875c74d33339c43f14d0f8c0d26be053384df6`. The original link has exactly one Created event, no later revocation or conflicting pair, and no audit history for a replacement Company link. The existing Onboarding request is Applied with the same Customer organization and Company handoff. The supported application recovery actions do not apply to this already-completed request.

The temporary restoration therefore changes only the original Company's access-organization reference and normal update/version stamps, plus one system recovery audit pointing back to the original audit. It does not change the organization, request, membership, service, order, billing or scientific record. Execution requires the exact Company version 1, organization version 2, request version 3, original event and request/handoff snapshot; concurrent changes abort the transaction. A repeated call is a no-op only when the exact recovery audit and resulting Company version 2 exist.

The protected workflow defaults this action to false. An explicitly selected repair first creates, validates and encrypts a complete database backup using the established deployment backup format. The SQL parsed and rejected an invalid authorization value locally before record reads or writes; no data was changed by that validation. Workflow and helper shell syntax checks passed. After the repair commits, the same read-only inventory must show the restored association before all temporary inventory/restoration files and workflow inputs/steps are removed.

The second review of all 55 User guides found no additional changes needed: temporary maintenance instructions are absent, supported access lifecycle actions and unconfigured readiness requirements remain accurate, and the corpus fingerprint is unchanged.

### Repair completed and temporary tooling removed

[Repair run 34157930613](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/34157930613) succeeded from `128587cc63a9a5ebb3ac5634acc560fa87181aaa` on September 7, 2026. The full encrypted backup is retained on the host at `/var/backups/phaeno-portal-deploy/pre-company-link-20260907T200522Z-34157930613` with `.dump.enc`, `.key.enc` and checksum files. Dump readability and encrypted checksums passed before the repair; plaintext temporary files were removed.

The original Company reference was restored at 20:05:23 UTC, Company version advanced from 1 to 2, and system audit `1a94a689-aff1-49e4-8efb-9c10ee0c3768` records the exact old/new association and original audit reference. Post-repair inventory shows zero unassociated Customer organizations, the original link audit unchanged, and the same Applied request at version 3 with unchanged services and handoff. No organization, membership, order, billing, scientific or request state was rewritten.

After that verification, the temporary audit SQL, restore SQL, restore shell helper and both workflow inputs/steps were removed. The deployment workflow is restored to its pre-maintenance form. Local temporary repair/shell helper code was removed; private audit and backup evidence is retained. The unused HubSpot simulation dialog and obsolete direct organization-creation client wrapper are also retired. Supported access recovery and incomplete-configuration feedback remain.

The Word guide was checked again against the repaired workflow and remains current, with its verified document hash unchanged. The final documentation check retains the same 55-guide corpus. Full signed-in production workflow acceptance remains pending a production login; data-level restoration and anonymous production health are verified separately.

Final cleanup checkpoint: TypeScript, full zero-warning ESLint, documentation corpus check and frontend production build passed after removal of the unused frontend code. No temporary maintenance symbols remain in application/deployment source. Test suites were not run, consistent with repository instructions; no new business behavior or persisted model was introduced by this cleanup.

## Final production evidence

- Application commit: `1c55725dc07ed0213c9d1a796f499239ec436c42`, pushed to `codex/portal-documentation-search-release`.
- [Final API workflow 34158278358](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/34158278358): succeeded; running `source_revision` matches the application commit, image tag `sha-1c55725dc07e-run-34158278358-1`. Migrations and identity cutover were false; temporary maintenance inputs no longer exist.
- [Final Portal deployment](https://vercel.com/cadexgenomics/phaeno-ops-mgmt-system/5UHmcotjbnzdQ24yx1wNaT8szN2k): `dpl_5UHmcotjbnzdQ24yx1wNaT8szN2k`, Ready, Production environment, matching source commit, aliased to `https://portal.phaenobiotech.com`.
- Independent checks at 20:11 UTC: API health healthy/200, database ping 204, anonymous protected session 401, Portal entry point 200. Final UI runtime logs show that production-domain 200 with zero console Warning/Error/Fatal entries in the observed window.
- The final Word file and generated 55-guide corpus retain the verified hashes above. No application test suite was run. The unrelated local Website search-index binary was excluded from every commit.
- The final release-evidence documentation commit does not change application code or bundled User documentation; production intentionally remains on the exact application revision identified above.
