# Staff scientific capture and complete sample delivery history

Status: implemented and verified locally, September 19, 2026. Authorized by the owner's “Do it” following the two confirmed software gaps. This extends the sample traceability and evidence governance contracts. See [verification](../testing/runs/2026-09-19-scientific-capture-history.md).

## Settled product scope and acceptance

Existing Lab Operators/Supervisors must be able to record a sample's sequencing output and analysis evidence through POMS, selecting existing tube/library/sendout/input identities rather than entering internal identifiers. Original records remain immutable; corrections/reanalysis create linked records with reasons. Reviewers can inspect without receiving write authority. New staff-recorded analyses pin approved scientific profile 1. Existing pipeline and role boundaries remain authoritative.

Use the sample workspace for discovery and a stable read-first detail route for each sequencing output/analysis. Scientific capture has several meaningful sections (source selection, file/run identity, timings, QC or software/reference versions, and correction review), so a dedicated creation page is justified by the UI complexity criteria. Dirty navigation requires confirmation. The existing legacy manual-upload client gains exact analysis/file attribution; a bounded upload modal is available only to an authorized platform administrator while the existing governed-pipeline retirement switch permits it. Do not reactivate retired manual uploads.

Consolidate exact sample-scoped package delivery events, download attempts and verified commit observations, retained policy/deletion state, preservation holds and reissues into the live investigation and immutable report. Include commercial and Trial release mappings. Do not expose IP addresses, user agents, raw notification payloads, storage keys, or another sample's rows. Missing history is labelled as not recorded, never as successful delivery. Preserve existing history limits and report refusal on partial snapshots.

## Engineering boundaries

Reuse existing tables and capture guards; add scoped read endpoints and frontend types/forms. No dependency, authentication, database-model or production-setting changes are intended. Update affected Phaeno guides and registry, stale plan status sections, and living test plans. Verification covers authoring, scoped choices, corrections, exact retries, profile validation, manual-upload request attribution, cross-sample/org history exclusion, immutable reports, accessibility and mobile use. Production activation, real producer/bench acceptance and hosted restore remain separate gates.

## Implemented routes and evidence

- `GET work-orders/{work}/specimens/{specimen}/scientific-evidence` returns bounded library/run/input choices and existing-role/state capabilities; `.../sendouts?libraryId=...` matches exact historical library/key/barcode membership without returning the shared manifest. More than 1,000 records fails explicitly.
- `/lab-operations/{work}/specimens/{specimen}/evidence/{sequencing|analysis}/{recordId}` is the stable detail route. `new` starts capture; `?from=...` carries the explicit correction/reanalysis predecessor. Unchanged retries reuse the request identity. Unchanged prefilled timestamps retain their original sub-minute precision.
- Manual uploads carry the fixed selected analysis and required whole-file/contained-result locator. The existing server-side retirement and authorization checks remain authoritative.
- Investigation evidence adds delivery, downloads, download commit observations, retention schedules/snapshots, preservation holds, reissues and matching Trial releases. The people projection resolves their actors. Trial matching uses sample files in each released manifest; malformed sources fail, and limits prevent complete-report claims. Both original and replacement snapshots must be sample-scoped before exposing a reissue.
- Internal report generation includes these projections in its existing repeatable-read snapshot. Later hold releases or delivery changes cannot rewrite an earlier report.

No new migration was needed. Phaeno user guides, reviewed dates, search corpus and the owning plans are updated. Local tests use synthetic records; no production rollout or real producer/bench acceptance is claimed. The subsequent September 19 decision approves immediate enforcement with no backfill or grandfathered future approval/release; the [governance contract](LAB-EVIDENCE-GOVERNANCE-CONTRACT.md) records the now-enabled defaults and current-policy checks.

## Managed-file follow-up

The approved [managed scientific files change](LAB-MANAGED-SCIENTIFIC-FILES-PLAN.md) replaces staff file-reference/hash/size entry with private uploads, automatic verified metadata and scoped retrieval. Its additive file-receipt migration supersedes the original no-model-change boundary for this follow-up only. Historical/provider reference-only capture remains supported and is labelled separately.
