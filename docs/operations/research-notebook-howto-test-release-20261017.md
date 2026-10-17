# R&D notebook and illustrated how-to: release checkpoint — October 17, 2026

The Owner requested updated R&D user documentation, an annotated how-to, GitHub commit/push and deployment. The implementation and guide are committed and pushed. **Deployment is blocked by an unresolved GitHub Actions dispatch; the new frontend has not been promoted and the hosted API has not changed.** This is a preparation checkpoint, not a completed-release receipt.

## Delivered source and help

- Source: `e5c0804c90dfcf68931cc2f3d48525964ea6b419`, pushed normally to main and independently matched against GitHub. It includes the R&D module and all six review corrections, shared Phaeno access, five-table additive migration, retained-attachment recovery references and regression sources.
- Source archive SHA-256: `f93466bdf72959df58505b53c867cce3d0586696e64bdba39b42fb06a81d7b46`.
- [How to record an R&D experiment](../../frontend/src/content/docs/phaeno/how-to-record-research.mdx): 11 steps, 14 original actual-component screenshots and 53 numbered callouts with written equivalents. It is the fifth Phaeno How-to card and a child of R&D notebooks. Guide route when released: `/docs/phaeno/how-to-record-research`.
- Screenshots use fictional in-memory local demonstration records. No hosted experimental, Customer, identity or provider data was created to produce them. These illustrations are not backend, scanner, storage, physical or scientific acceptance evidence.
- Matching generated API corpus and UI version: 62 guides, `8c6701d4675a8e563a7e65d6ae3ceef48f2f274ac393a8f440c7182f5f6ee620`.

## Verification

Release solution build passed with zero warnings/errors, including regression-source compilation. TypeScript, scoped lint, documentation generation/check, client/server build and whitespace checks passed. The changed recovery verifier passed Linux Bash syntax checking. Automated test suites were not requested or run.

Every original image was visually reviewed for complete rendering and fictional-only content. The actual rendered guide passed desktop, 320px reflow and 390px dark-mode inspection. All 14 images loaded, no page overflow appeared, and markers did not overlap at 288px rendered image width. Geometry also verifies marker separation at 256px image width. Temporary viewport overrides were reset. A local annotated guide preview is retained outside Git.

## Preservation and recovery preparation

The [preserving release plan](../plans/RD-NOTEBOOK-HOSTED-TEST-RELEASE-20261017-PLAN.md) retains every existing schema/row, Website intake history, runtime/provider/identity settings and file bytes. Preflight verified PostgreSQL 18.6, the expected `phaeno-portal-green-postgres18-data` volume and migration `20261015215237_AddPSeqKitLotTraceability`. There are 245 baseline tables and zero retained Local files. All 12 Mailing-list and six Demo-request records retain the established complete-record fingerprints `ef77bd28975f174e0fefaf39931bd25f` and `95aa679ef04abf2b672f77ee6b9f6222`.

Fresh database recovery restored successfully into isolated PostgreSQL 18.6 without live mounts. Runtime and Local archives matched their source trees. Combined encrypted recovery passed an encryption round trip, was copied off-server into an owner/SYSTEM-only directory, and independently passed checksums, private-key decryption and archive/restore-evidence inspection. Private server evidence is under `/var/backups/phaeno-portal-deploy/research-20261017`; local evidence is ignored under `.artifacts/research-release-20261017`.

| Encrypted recovery artifact | SHA-256 |
| --- | --- |
| `recovery.tar.gz.enc` | `2cbe7ee8cc230a4d2793cdb0f5abb9ebce3ba6cc74bf57943a8bef471a6385b2` |
| `recovery.key.enc` | `fa0d77d25b9c0f3de4950f5c724927d9096ce2c1382fff32927401a2683818bc` |

No migration has run on hosted data. The necessary migration remains the additive `20261016204013_AddResearchNotebook`. The populated hosted-test S3 recovery deferral and disabled backup timer remain. No storage, identity or provider cutover is included.

## Staged frontend and unresolved API dispatch

Vercel production-target deployment `dpl_GLcRkfnnMCU6TY1v86eajqQqxPqA` is READY from the exact source above, with root `frontend`, project `prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R` and custom-domain auto-assignment disabled. Its protected staged root and all 16 linked assets return 200 through the existing Vercel login. The canonical Portal alias still identifies prior deployment `dpl_GVgngTrETWtYjxV8HXcjKnz9uzDT`; skew boundary `1792110534065` and maximum age `43200` have not changed.

[API dispatch 39056745064](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/39056745064) identifies the exact source and preserving inputs: migrations true; storage/scanning/bootstrap Preserve; Clerk cutover and S3 configuration false. GitHub reports queued with zero jobs and a frozen update time of `2026-10-17T18:07:51Z`. Normal and force-cancel requests returned contradictory completed/not-yet-queued errors (409 on the explicit API calls). Briefly enabling the manual-only workflow did not resolve that state; it was disabled again. No duplicate dispatch was issued because cancellation could not be confirmed.

Actual host inspection still identifies healthy API image `phaeno-portal-green-api:sha-a88cc73853fd-run-38829715412-1` and its previous release directory. No new source release directory or migration backup exists. Authenticated hosted documentation readback still shows the previous guide set. This proves deployment has not started at this checkpoint; it does not guarantee that the orphaned GitHub run can never resume.

`Deploy Portal Green` and the backup workflow are verified `disabled_manually`. Both checked-in Portal/Website Vercel Git holds remain false. The public Website frontend and OCIA are unchanged.

## Resume gates

First reconcile the existing dispatch with fresh GitHub and host state; do not dispatch a competing release while its outcome is unknown. If it resumes, verify the exact source and complete the protected migration, restore rehearsal and API checks. If cancellation becomes available, confirm terminal cancellation before retrying. Retain the READY staged frontend for this exact source.

Before promotion, collect and independently verify the workflow's fresh encrypted pre-migration recovery, compare every preexisting business-table fingerprint and all original EF rows, confirm exactly five new empty research tables and the one added migration, unchanged Website intake and runtime providers, scanner/health and anonymous authorization rejection, and matching packaged/active documentation index. Then promote the staged artifact without rebuilding, advance the skew boundary, verify canonical/previous-pin assets and all 14 screenshot hashes, and perform authenticated hosted help/search and read-only R&D navigation checks. Record the completed release separately. No hosted experiment or file upload is authorized merely for demonstration.
