# Final sample-tracking review corrections - October 24, 2026

> Raw sample-tracking test outputs linked in this dated record were removed at the Owner's request after consolidation. The archived links now open the retained result/cleanup ledger; screenshots and raw files are no longer retained.

Owner scope: fix all four final-review issues and add focused regression coverage. No deployment or DPS changes. The [owning validation plan](../../plans/SAMPLE-TRACKING-PHASE4-VALIDATION-PLAN.md), [physical lifecycle plan](../../plans/LAB-PHYSICAL-LIFECYCLE-PLAN.md) and [master-mix plan](../../plans/MASTER-MIX-PREPARATION-PLAN.md) record the scope and decisions.

## Final results

| Check | Result | Evidence |
| --- | --- | --- |
| Focused backend selection | **42 passed**, zero failed/skipped | [Archived receipt: TRX](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: log](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Focused frontend selection | **12 passed**, zero failed/skipped | [Archived receipt: JUnit](2026-10-24-sample-tracking-browser-acceptance-ledger.json), [Archived receipt: log](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Backend test-project build | Zero warnings/errors | [Archived receipt: Build](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Static checks | TypeScript, scoped ESLint, UI guard, help freshness and whitespace pass | [Archived receipt: TypeScript](2026-10-24-sample-tracking-browser-acceptance-ledger.json); 774 guarded sources/two unchanged exceptions; 62 guides, `c6b4c67bd74a` |
| Preservation | All 254 configured-development table fingerprints match the prior checkpoint throughout the retained before/after receipts, including protected Website intake | [Archived receipt: Combined proof](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |
| Cleanup | Independent read-only check confirms all 28 manifested test databases and 12 private roots from this follow-up are absent | [Archived receipt: Native readback](2026-10-24-sample-tracking-browser-acceptance-ledger.json) |

The 42-case selection is the previous 41 plus the expanded shared-mix exposure case. Existing cases now contain additional command/report/failure subcases; overlapping reruns and subcases are not additional distinct tests. The frontend selection comprises five new evidence-display cases and seven existing ingredient/investigation cases. The complete application suites and connected browser matrix were not rerun. The Phase 3 browser source now supplies observed precise disposition times instead of rounding them before a just-recorded placement; earlier browser results remain dated prior evidence.

## Corrections and regression coverage

1. **Physical handling order.** Actual placement/disposition cannot precede later recorded placement, removal, exhaustion or final custody events. Contradictory entries return an actionable conflict without changing tube custody, version or event count. Existing transfer, hold, retention, Trial-term and active-work guards remain. Seconds and up to six fractional digits with an explicit offset distinguish handling within one minute; placement may optionally provide an actual time. The real MVC regression refuses late placement/return and accepts a valid precise return. Out-of-order entries are refused for review rather than automatically rewriting physical history.
2. **Historical registered storage.** Each placement now includes its registered room/freezer/rack/shelf context, source box-record identity and source time. A preceding registration/move is location context, not an assertion that the tube occupied the box then. Departed tubes retain this context even if the box never moved during occupancy. Later movements/current box edits do not substitute for it. Missing/bounded-out facts remain unknown and malformed saved location evidence refuses a trusted read. Actual HTTP and saved-report assertions cover two former boxes, departure, subsequent box movement and unchanged original report bytes.
3. **Equipment through shared mixes.** The actual mix-step writer freezes structured field/asset identity and equipment conditions in the existing step evidence JSON. Its workspace and sample investigations expose those facts. Equipment searches follow non-voided dispensing to the exactly covered samples within the organization. Zero-use and voided dispensing do not assert exposure. Replay and subsequent retirement preserve the original evidence. A rollback-only legacy-shaped fixture proves missing original equipment conditions remain unknown and prevent a complete exposure-search claim. No historical calibration or equipment facts are guessed.
4. **Uncertain database creation.** The runner verifies an intended identity is absent, persists creation intent before issuing CREATE and independently reconciles every attempted identity. A missing acknowledgement no longer omits that database from cleanup or produces a false cleanup success. Actual local databases are created before injected acknowledgement loss on the first and second creation; operation receipts fail while cleanup/qualification pass, variables are restored and absence is independently checked.

The report correction also addresses the related Trial work-state blocker exposed by the actual HTTP checks: existing authorized Lab staff can generate an internal report for a held/closed Trial without changing its hold/status or resuming scientific work. Customer access remains forbidden. Exact controller/action metadata limits the exception, and the outer Trial transaction uses repeatable read for a consistent report boundary. Identity configuration and Lab role checks are unchanged.

The [Archived receipt: source manifest](2026-10-24-sample-tracking-browser-acceptance-ledger.json) records reviewed source hashes and the passing test assembly. Actual custody/report assertions are retained in the [Archived receipt: HTTP receipt](2026-10-24-sample-tracking-browser-acceptance-ledger.json) and its regression source.

## Recovery fault evidence

- [Archived receipt: First creation acknowledgement lost](2026-10-24-sample-tracking-browser-acceptance-ledger.json): one server-created database reconciled and absent.
- [Archived receipt: Second creation acknowledgement lost](2026-10-24-sample-tracking-browser-acceptance-ledger.json): both intended attempts reconciled and absent.
- [Archived receipt: Cleanup failure probe](2026-10-24-sample-tracking-browser-acceptance-ledger.json): the intentionally failed cleanup is followed by an independently [Archived receipt: successful repair](2026-10-24-sample-tracking-browser-acceptance-ledger.json). Failed negative receipts are expected evidence, not unfinished cleanup.
- [Archived receipt: Native restore](2026-10-24-sample-tracking-browser-acceptance-ledger.json): the existing connected journey, independent database/file recovery, integrity and long-history checks continue to pass.

## Diagnostic corrections and isolation

Early fixture diagnostics used an invalid required location/table name and test assertions unavailable in the existing frontend setup; these were corrected without relaxing application validation. The first added shared-mix invocation used the shared reference target for short-lived fixture setup. Its own cleanup completed, and all 254 table fingerprints subsequently matched the prior checkpoint. That case now creates/migrates/removes its own generated database; final runs target generated fixtures only. A narrow commercial fixture was replaced by an actual held/closed Trial report case so the Trial guard is exercised rather than bypassed. Diagnostic receipts remain retained separately from the final passing checkpoint.

The final independent readback covers every manifested identity in those diagnostic and final executions. No configured-development record change remains. Equipment facts extend existing JSON storage without a new database column, schema migration or inferred backfill. Existing saved reports remain frozen. Plans, the ERD annotation/generator and Phaeno help reflect the implemented behavior.

No dependency, Git mutation, deployment, hosted write or DPS source/runtime/contract change. Actual scientific SOP sufficiency, structured reagent-manufacturing measurements where required, complete supported-writer admission coverage, hosted recovery/concurrency and physical/provider/scientific/business acceptance remain open in the [acceptance crosswalk](../../plans/SAMPLE-TRACKING-PHASE4-ACCEPTANCE.md).
