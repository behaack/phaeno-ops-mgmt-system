# Customer onboarding how-to: preserving hosted-test release

The Owner requested the complete Phaeno Customer-onboarding how-to, generously
annotated screenshots at each step, then commit/push to GitHub and UI deployment.
Release only this guide, its 15 illustrations/73 callouts, metadata/navigation,
updated regression expectations and owning documentation. No business workflow,
model, migration, authentication, dependency or external contract changes.

The guide changes the API's generated documentation corpus as well as UI help.
Publish the exact same source to the existing Portal Green API with migrations
disabled, confirm the new active index, then promote the staged UI. This necessary
help-search update changes no other backend behavior and bypasses no version guard.

## Target, preservation and recovery

Reverify the existing Portal Green PostgreSQL 18.6 target `phaeno_portal_green`,
API/current release, and Cadexgenomics frontend project
`prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R`, root `frontend`, canonical
`https://portal.phaenobiotech.com`. Current expected API/UI source is `8c4ec7d73560`,
UI `dpl_E57hvRrJB1WeTWmVHGBSDZopLeZd`, skew boundary `1792105798062` and maximum
age `43200`. Record verified values before cutover and retain their images/builds.

Preserve all database schemas, rows, account/Department/access/service/billing and
scientific history, current runtime/provider/identity/DPS settings, Local bytes
and S3 settings/object versions. Explicitly preserve `website.web_contacts` and
`website.web_orders` in full, including all IDs, contents, actors, locales,
timestamps and completed/unsubscribed history. Capture fresh table/intake
fingerprints; investigate differences before promotion. Do not replay mail.

The same-day preserving lot release retains an isolated-restore-verified encrypted
database recovery package and content-verified encrypted runtime/Local recovery
package off-server. Recheck their integrity and freshness against current data.
If data changed since that snapshot, take and verify a fresh preserving database
recovery copy before the API update. Do not replace/reset the live database.
The existing replacement preparation is the isolated PostgreSQL recovery rehearsal;
this documentation-only release needs no new database or storage cutover.

The hosted-test populated-S3 recovery deferral remains. Do not enable backup timers,
change identity/storage providers, deploy the public Website or OCIA, change DNS,
or activate commercial/scientific processing. Private recovery and snapshot data
remain outside Git. No hosted operational fixtures are created for illustrations.

## Release and acceptance

1. Finish source/guide review, safe actual-component captures, matching corpus,
   links/assets, types, touched-source lint, build and manual documentation review.
   Automated suites remain request-only; no live backend journey is inferred from
   screenshot fixtures.
2. Commit the reviewed source and push normally; independently verify remote main.
   Record source/archive hashes and exclude temporary previews and private evidence.
3. Stage a production-target UI from the exact GitHub SHA with custom domains
   unassigned. Verify project, source and READY state; check staged assets/images.
4. Temporarily enable `Deploy Portal Green`, dispatch the exact main source with
   `apply_migrations=false`, provider/bootstrap inputs Preserve and identity/S3
   cutover false. Disable the workflow again immediately. This bounded sequence
   follows the Owner's standing October 11 hosted-test deployment authorization.
   Keep both Vercel Git holds disabled.
5. Verify API source/image, unchanged schema/data/intake/configuration, healthy
   services and the exact packaged/active help index. Verify authorization remains
   enforced. Promote only the verified production UI without rebuilding.
6. Advance the existing skew boundary to that UI's creation time, retaining maximum
   age. Check canonical and prior-pin assets, guide-image bytes and available
   browser rendering/search. Keep authenticated hosted acceptance distinct from
   local demonstration rendering if no suitable live session is available.
7. Record exact identities, recovery/data evidence, browser/static checks and
   remaining gates in a release receipt; commit/push the documentation-only receipt.

For failure before promotion, retain the existing UI and inspect the API/index
state. Prefer a preserving forward correction or restore the retained compatible
API/UI pair and recorded routing boundary. No schema downgrade, row deletion or
database restore that discards later writes is authorized. Restore all release
holds even on failure; plan creation alone does not authorize any destructive action.
