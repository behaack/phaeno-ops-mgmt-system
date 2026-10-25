# Phase 4 sample-tracking validation and recovery — October 24, 2026

> Raw sample-tracking test outputs linked in this dated record were removed at the Owner's request after consolidation. The archived links now open the retained result/cleanup ledger; screenshots and raw files are no longer retained.

The subsequent requested regression/browser checkpoint is recorded in [Phase 4 regression and browser verification](2026-10-24-sample-tracking-phase4-regression-and-browser-verification.md): 33 backend, 15 frontend and four connected browser scenarios pass. It also records the scientific-file feedback and test-harness repairs. The initial implementation evidence below remains dated evidence of its original scope.

Owner scope: implement end-to-end sample-tracking validation and recovery checks locally. No deployment or DPS changes. This implements the [Phase 4 plan](../../plans/SAMPLE-TRACKING-PHASE4-VALIDATION-PLAN.md) with a [repeatable runner/runbook](../SAMPLE-TRACKING-PHASE4-RUNBOOK.md) and [ST-01–ST-20 acceptance crosswalk](../../plans/SAMPLE-TRACKING-PHASE4-ACCEPTANCE.md).

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Focused backend selection | **33 passed**, zero failures/skips | [Archived receipt: TRX](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: log](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Independent native database/private-file restore | **254 tables / 940 rows** match exactly; all three stored objects match; original storage unavailable | [Archived receipt: restore receipt](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: source](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: restored](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: files](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Restored lineage/replay/integrity/preservation | All asserted recovery probes passed | [Archived receipt: recovery receipt](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Long history | **10,029 frozen events / 201 pages**, at most 50 rows and four read queries per page; no omissions/duplicates; independent later append excluded; oversized report refused | [Archived receipt: measurements](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Local timing | First controller/database page **25.19 ms**; complete traversal **1.43 s** | Same measurement receipt; not browser first-usable time or a production SLA |
| Build | Test project and referenced backend modules compile with zero warnings/errors | Successful final build and test log |
| Preservation and fixture cleanup | Both generated recovery databases dropped and confirmed absent; private temporary root removed; every configured-development table unchanged | [Archived receipt: cleanup](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: before](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: after](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |

The selection includes the new connected recovery fact, the original independently disposable commercial journey, and focused `LabPhysicalLifecycleTests`, `LabResultLineageTests`, `LabScientificEvidenceTests` and `LabInvestigationScopeTests`. This is a focused selection, not the entire application suite. Intermediate trials and overlapping confirmations do not increase the 33 distinct-case count.

After the final receipt safeguard change, the overlapping recovery case was rerun alone and passed with zero skips/failures: [Archived receipt: confirmation TRX](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: recovery](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: restore](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: cleanup](2026-10-24-sample-tracking-browser-acceptance-ledger.json). It again verifies 254 tables/940 rows/three stored objects and 10,029 events across 201 pages. Its first page measured 26.74 ms and full traversal 1.51 s. PowerShell parsing, Phase 4 local documentation links and source whitespace checks pass; `git diff --check` passes with existing line-ending advisories.

## Connected evidence

The new case continues the actual commercial authorization/shipping/laboratory command journey through supplier tube receipt/accession, registered box storage, preparation/step capture and frozen material/equipment use. It resolves the exact producing execution/attempt/source tube from the library and preserves the original supplier-barcode crosswalk.

It then captures a managed single-end FASTQ through begin/chunk/complete commands, repeats uncertain responses after clearing tracked state and creating a fresh controller, and records an actual acquisition reference distinct from the vendor job. Explicit scientific evidence/profile snapshots accompany the acquisition and analysis. Synthetic external analysis packaging/scan observations are fixtures. Contributor self-approval fails; a separate reviewer approves. The existing release/customer tracked-download helper verifies the exact package and synthetic delivered bytes. Current scientific requirements remain enabled throughout the new branch. The historical commercial case retains its older deliberate fixture policy and passes separately.

A repeatable-read investigation report is frozen before backup. Native `pg_dump`/`pg_restore` targets two new generated databases and private-file roots. Every source/restored table is compared by sorted full-record SHA-256 and row count, including EF history and Website tables. File copies are compared by size/hash. Original source storage is moved offline before restored controllers read anything.

After restore, the package still resolves through its explicit analysis/output chain to the exact source supplier tube. Report download returns its exact saved UTF-8 bytes/hash; actual raw-file downloads verify all bytes. Original physical/vendor/report requests replay without duplicate records, stock changes or altered report bytes. A conflicting physical request and a stale command fail. A preservation hold survives and refuses destruction after agreed retention is recorded as elapsed.

Deliberate corruption of the independently restored raw bytes and report body is rejected; missing raw bytes also fail. The fixture repairs its injected corruption. The real storage adapter then removes the synthetic result object: raw evidence, report and exact tube lineage remain accessible, and the investigation-preserving adapter refuses raw-evidence deletion. This is a controlled deletion simulation, not a scheduled retention-worker run.

Long-history qualification adds 10,007 equal-time events to the existing sample history. During paging, a separate context commits a later event. All frozen rows are traversed once, query/row counts stay bounded, and a new report exceeding the supported history bound is rejected without creating a partial report.

## Corrections and isolation

The first trial exposed a new harness error: it called the transactional current-FASTQ validator without opening the required transaction. The harness now opens that transaction in both source and recovery validation. Application guards were not weakened. That failed trial's cleanup/preservation passed; [Archived receipt: diagnostic log](2026-10-24-sample-tracking-browser-acceptance-ledger.json) and [Archived receipt: cleanup](2026-10-24-sample-tracking-browser-acceptance-ledger.json) remain reviewable. The corrected standalone trial passed before the full 33-case selection. Restored writes use the existing centralized audit interceptor, and the final receipt also requires preservation/cleanup success before claiming a pass.

All fixture writes use generated loopback databases and temporary private storage. The recovery runner proves the configured development database's complete table fingerprints unchanged, including protected `website.web_contacts` and `website.web_orders`. No persisted model, migration, database reset/backfill, production authentication, dependency or application runtime source changed in this phase. Existing unrelated/Phase 1–3 work is retained. No Git mutation, deployment, hosted write or DPS source/runtime/contract change occurred.

## Remaining acceptance

No frontend or browser source changed, and no browser suite was rerun in Phase 4. The prior [Phase 1](2026-10-24-sample-investigation-phase1.md), [Phase 2](2026-10-24-sample-tracking-phase2-verification.md) and [Phase 3](2026-10-24-sample-tracking-phase3-verification.md) connected Chromium results remain dated feature evidence. The new check is controller/database/local-storage recovery proof with synthetic identities and external observations.

Hosted sign-in/full Job navigation, full accessibility/browser qualification, real providers/scanner/storage/physical work, scientifically approved procedures, representative legacy-copy migration/recovery, concurrent hosted database/files backup consistency, scheduled backup/cleanup qualification and the Owner's actual questioned-result walkthrough remain open. The [crosswalk](../../plans/SAMPLE-TRACKING-PHASE4-ACCEPTANCE.md) records these per requirement. Local Phase 4 implementation does not close or authorize those gates.
