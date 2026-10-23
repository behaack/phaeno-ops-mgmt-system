# Real assembly — hosted-test implementation and acceptance plan

Status: **assembled-sequences engineering reviewed and committed locally; DPS push requires repository write access; target qualification, scientific approval and hosted activation held**. Updated October 23, 2026 PDT. The Owner authorized engineering/focused isolated tests and later review/commit/push, while holding the real pilot until dataset, references and scientific QC criteria are approved. Owning area: [sequencing assembly](SEQUENCING-DATA-ASSEMBLY-PLAN.md). The [readiness report](../operations/real-assembly-hosted-test-readiness-20261022.md), [original handoff](../operations/real-assembly-engineering-20261022.md) and [October 23 handoff](DPS-LOCAL-ASSEMBLY-ENGINEERING-HANDOFF-20261023.md) retain separate evidence stages. No restart, installation, authentication/dependency change, migration, deployment, real pilot or scientific approval is authorized.

## Product outcome and scope

### October 23 local completion scope

The Owner initially authorized completing the remaining DPS engineering **locally only** and selected **assembled sequences first**. Reference matching and gene summaries are deferred. Preserve `poms-dps/1.0`, every receipt and execution record. The later review/commit/push authorization changes the Git boundary only; DPS/Portal deployment, hosted worker start and the real pilot remain held.

Implement a file-only entry in the existing native runner that invokes its current clustering and Inchworm code, with no changes to their scientific algorithms. DPS generates an attempt-specific dataset/sample mapping and TOML from verified manifest files, pinned tag configuration and explicitly supplied processing parameters. The native entry must bypass normal global startup, disable external log notifications, prohibit database connections and cover every resulting SMID rather than one hardcoded cluster. Return actual combined FASTA, a complete per-cluster assembly summary and existing provenance. Do not enable the scientific recipe or supply invented scientific approvals/settings.

Use an explicit native build feature for the file-only assembly path: external BLAST serves tag matching; the optional NCBI bridge/reference-matching/gene-summary path is not linked or silently simulated. Reuse current package dependencies; add no new runtime package, permission, authentication or wire-contract dependency. Prepare a reproducible release and offline preflight against the existing server architecture without installation or activation. Verify the actual native code with isolated synthetic inputs, plus rejection, process cancellation, recovery and publication cases. These fixtures establish engineering behavior, not scientific validity or hosted acceptance.

Preserve the original [DPS package and verification receipt](../../integrations/dps/README.md) byte-for-byte except its index. Retain the new source/build/test package separately with original hashes. Review/local commits are complete against the unchanged remote PR #2 base. Its private DPS push is blocked by read-only repository permission; the [publication index/status](../../integrations/dps/local-assembly-20261023/README.md) records the existing commits. Keep new native source/detailed proof in private DPS and the planning handoff in public Portal. Before release, reconcile any later source changes deliberately; fresh preserving hosted verification and a separately approved pilot remain necessary.

Completed proof: actual local Linux x64 Cluster/Inchworm produced two SMIDs/two contigs from eight synthetic multipart/gzip/plain FASTQs. All 77 focused Linux checks pass, including actual publication/recovery through the Portal manifest validator; Windows passes 61 with 16 Linux-only skips covered on Linux. This supplies native engineering evidence for RA-03, not approved representative-dataset or ARM64/hosted scientific qualification. The [separate local package](../../integrations/dps/local-assembly-20261023/README.md) retains exact source/build/test receipts. No original provider history or hosted state was touched.

An authorized Lab operator selects one eligible specimen/purchased run and an approved scientific recipe. DPS processes exactly its frozen FASTQs, returns actual scientific deliverables with reproducible provenance and preserves one attributable execution. Portal verifies/adopts those files through the existing scientific capture path. An independent Scientific Reviewer evaluates the nominated dataset against agreed expectations. Customer release remains a separate authorized decision.

Users are the Lab operator, pipeline maintainer/scientific lead, Scientific Reviewer, Operations staff and Result Release Manager. Codex owns runtime/adapter/API/test design. The scientific lead/Product Owner owns dataset permission, scientific intent, expected results, acceptance criteria and business sign-off. Do not ask the Owner to choose software mechanics.

Success requires: zero wrong-input/duplicate executions; no missing/overwritten historical receipt or event; complete validated required outputs; exact byte/version/provenance attribution; a committed final acknowledgment; exactly one idempotently registered analysis for the new attempt; and a recorded independent scientific assessment. Execution Succeeded, scientific QC and Customer release remain separate facts.

The current stop is treated as intentional by Owner direction. Runtime installation/start remains held until a preserving hosted release is explicitly authorized; source publication does not activate DPS. Keep current TLS identities, topic root, storage ownership, deployment holds and the scientific-release boundary.

## Engineering decisions

1. Retain one supervised DPS worker and the existing ledger. Do not add a second consumer to the same Start topic or create a replacement ledger to avoid old history.
2. Retain `pseq_data_assembler` 0.1.0 as diagnostic simulation. Use a separate proposed scientific identity `pseq_scientific_assembly` 0.1.0, unavailable until its actual workflow is qualified. Implement one canonical configuration catalog used by Describe, validation and dispatch; the existing v1 `recipes` array already supports this. Replace the singular recipe configuration in the implementation and convert the hosted configuration once under the release plan, without legacy-field fallbacks/dual configurations.
3. Keep `poms-dps/1.0` and complete its already-required scientific fields. No wire extension is currently necessary. Any discovered new cross-application contract, dependency, identity or permission need must be scoped explicitly before implementation.
4. Use a private per-attempt workspace keyed by immutable attempt UUID. Native sample mappings/configuration come from the pinned manifest and approved profile. No mutable global PB58/sample-09 paths or scanning directories for arbitrary FASTQs.
5. Retain the current Portal models, `DpsHandoff`, `DpsOutputAdmission`, immutable scientific files, analysis registration and QC/release flows. No Portal EF migration is currently expected. If implementation reveals a persisted-model change, revise this plan, warn about affected data, create the migration/update the complete ERD and obtain applicable hosted approval before application.
6. Keep one concurrent scientific execution, matching the current Portal limit of one. Enforce the bound in DPS as well. Pin executable/tool/reference releases; readiness and reproducibility must not depend on a maintainer's interactive PATH or on downloading “current” references during a run.

## Phase 0 — define the qualified pilot and freeze evidence

Deliver a qualification sheet containing:

- Approved real dataset, provenance/use permission and exact specimen/run/input admission. Define assay/layout/SMID expectations, all required output roles/formats and complete sample scope.
- Intended pipeline stages, scientific parameters and reference versions/checksums; independently expected results, tolerances, QC criteria and reviewer.
- Source/tool release identities and Linux ARM64 compatibility; resource, scratch, output-size, duration and diagnostic-retention budget appropriate to that dataset.
- Existing-history baseline: all target attempts/receipts/events/commands, all provider ledger jobs and final acknowledgment state, hashes of launcher/configuration/binaries and currently protected backups. Recheck this baseline at deployment time; counts may legitimately grow through unrelated work and must never be restored backwards.

The current inspection baseline is six attempts, 28 receipts, 42 journal events and nine commands for `SIMULATED-ASM-20261020`, plus four terminal provider jobs. Do not repurpose this diagnostic specimen or rewrite any of its input/recipe/execution records. Reuse a separately approved real specimen/run if available; admit a new pilot fixture only within its separately authorized hosted-test scope.

Gate: scientific dataset/deliverables/reference/QC decisions are supplied. The initial pilot's planned scanned files fit the effective 100 MiB file/stream, 400M expanded scan and time constraints, or a separate limit-change plan is approved. Do not silently split, truncate or downsample scientifically relevant data to fit limits.

## Phase 1 — reproducible runner and controlled service

Prepare a native immutable release of the intended `phaeno` runner and its actual transitive tools/libraries/reference stores. `apps/phaeno` is the currently referenced Rust candidate; verify its real CLI/profile against the pipeline maintainer's approved workflow. Do not confuse this with the similarly named legacy C# or other runner project. Preserve source commit, actual executable version/hash, architecture and build receipt. Rust is already installed under `~/.cargo/bin`; resolve paths before proposing new installations.

Build a controlled systemd service using explicit protected runtime configuration, the existing user/client identity, TLS validation and existing ledger path. Configure an intentional `systemctl stop` to remain stopped. Use bounded restart behavior only while the service is intended to run; record exit signal/code, reason, deployed version and broker readiness. An unhealthy scientific profile must not be advertised as available; a qualified simulator can remain available independently. Preserve the exclusive ledger lock and reject a competing process before command acceptance.

Handle SIGINT/SIGTERM explicitly. Integrate child-process ownership with Phase 3 before enabling automatic scientific recovery. A worker restart must never leave an old native process running beside a resumed execution. Keep credentials out of source/logs and do not generate a new certificate merely to repair an existing launch path.

Gate: isolated start/stop/restart and duplicate-worker checks preserve the ledger; logs identify the real exit status; dependency/reference preflight is deterministic. No live scientific Start is sent.

## Phase 2 — exact inputs and real recipe dispatch

Extend the current streaming S3 reader to materialize each exact version into the attempt workspace while computing compressed-byte size/hash. Promote temporary files atomically only after verification. Validate manifest scope, group/read/part ordering, paired-read completeness, compression and configured expansion/disk bounds. Preserve original names/IDs/pinned objects; filesystem names are generated safely from admitted identities, not trusted path fragments.

Generate the native sample-info/configuration and reference bindings from those verified files. If decompression/concatenation is required, retain the original mapping and record derived-file identity without replacing the original hash. Use only the frozen scientific parameters; remove hardcoded PB58, sample 09, individual SMID, reference path and stage settings. Qualify processing of the complete requested sample scope.

Dispatch explicitly through the configured catalog. Unknown identities, unavailable tools, invalid schemas or mismatched required roles reject before scientific execution. The Simulated identity must still be unable to invoke a scientific executable. Set the child working directory and data paths per job; reference stores are immutable/read-only. Do not run reference rebuild/update commands against shared databases or fetch newer annotations as a side effect of assembly.

Gate: deterministic fixtures prove every native input derives from the listed exact S3 objects, with no fallback to another dataset and no use of unapproved parameters. Cross-job contamination and traversal cases fail safely.

## Phase 3 — execution ownership, cancellation and real outputs

Add a durable per-attempt scientific execution journal/checkpoints alongside the existing ledger, using current-format records only for new scientific work. Record process ownership, stage identity, pinned executable/profile/input identity and actual stage start/stop. Existing receipts/events remain immutable. Use atomic, crash-tested journal/manifest promotion and prove that a restart fences any previous child/process group before resuming safe work. An ambiguous execution is held for reconciliation; missing state never licenses blind re-execution.

Keep current native child-tree cancellation, but add coordinated service shutdown and recovery. Cancellation before execution has no invented start; mid-stage cancellation waits for the child tree to stop before terminal reporting. Completed scientific work and output-admission failure remain distinct. Preserve the original start time across safe recovery; never create a second terminal identity to conceal an interrupted execution.

Stream bounded stdout/stderr to protected job diagnostics; publish sanitized error codes/reasons rather than raw native output or private paths. Keep progress transient and based on defined stage milestones; scientific native progress is capped below 100 until outputs and their manifest verify.

Replace the real branch's placeholder builder with an approved-role output collector. Validate actual file formats/completeness and keep all output paths inside the attempt workspace. Assign durable artifact IDs, write only to the authorized attempt prefix, and persist a stable final manifest locator/hash before committing its terminal event. Repeat/recovery must reuse the same already-committed event and artifact identities. Never overwrite/delete prior storage versions.

Extend existing signing/upload code to stream actual files with bounded transfer/cancellation behavior, verify exact version/length/hash after writing and publish Succeeded only after all required objects and the immutable manifest exist. No new S3 dependency is assumed; review one separately if implementation requires it. Populate actual engine/tool identities, approved parameter digest, full input-manifest binding and pinned reference provenance. A recipe version is not a substitute for native software versions.

Gate: crash/restart/cancellation/output-publication cases establish zero concurrent duplicate computation and stable terminal evidence. Wrong/missing/oversized/placeholder scientific deliverables cannot be reported as valid completed output.

## Phase 4 — qualify the existing Portal scientific handoff

Reuse strict v1 manifest validation and `DpsOutputAdmission`. Prove required roles, execution times, input-manifest hash, scope and pinned output objects. Verify actual bytes and real scanner results, then register one analysis and its files idempotently. Retry a temporary scan/storage/admission failure after DPS's committed final outcome without another Start or changed execution timestamps. Keep scientific QC/approval and release separate.

For the initial pilot, preflight against the effective scanner ceiling of 100 MiB/file and the agreed expanded-size/time limits. The source's 1 GiB/output and 16 GiB/set ceilings are not scientific scanner capability. Align the enabled scientific profile and admission limits for the pilot. Larger datasets/files require a measured streaming/scanner/admission sizing change, not disabling validation or fabricating a clean scan.

The 300-second Portal operation budget is not a limit on total assembly duration. Measure individual handoff/admission operations; if they exceed the bound, implement safe resumable admission using existing idempotent records before the pilot. Do not lengthen MQTT request timeouts to hide an unresponsive provider.

Retain current navigation, contextual Actions grouping, quiet refresh and truthful content states. Add only behavior required to distinguish real scientific output/admission/QC from diagnostic simulation. Update Phaeno help with implemented behavior when it ships; do not publish this prospective plan in browser-bundled help or expose internal diagnostics to Customers.

Gate: focused connected tests pass strict scientific admission, duplicate recovery, authorization, scanner failure and preserved execution outcome cases. No weakened Simulated/scientific boundary.

## Verification matrix

| ID | Evidence required | Level |
| --- | --- | --- |
| RA-01 | Reserved simulation never invokes native runner; unsupported/disabled recipes reject; catalog declarations/parameters match actual dispatch. | DPS unit/contract |
| RA-02 | Exact S3 version/hash/size, gzip/paired/multipart ordering and generated mappings; missing/wrong/traversing/oversized input rejects before native start. | DPS storage/adapter integration |
| RA-03 | Actual qualified CLI/profile uses generated inputs, expected complete output roles and pinned references; no global demonstration paths. | Native adapter + representative fixture |
| RA-04 | Nonzero exit, bounded diagnostics, before/during-run cancellation, SIGTERM, duplicate worker and orphan-child fencing. | Linux process integration |
| RA-05 | Crash before/after stage/output/manifest/final commit, lost ACK and identical Start replay retain one execution identity and stable event/artifact IDs. | Linux restart/ledger/storage |
| RA-06 | Scientific provenance passes the actual Portal schema; absent/wrong reference declaration and simulated placeholder evidence reject. | Shared contract regression |
| RA-07 | Correct manifest registers one analysis/files; repeats, storage outage, scanner rejection/unavailability, partial admission and later retry preserve DPS Succeeded without another Run. | Disposable PostgreSQL + actual file service/scanner |
| RA-08 | Cross-specimen/organization/run/prefix/version/required-role mismatches and unauthorized operator/reviewer actions reject. | Backend authorization/lineage |
| RA-09 | Real selection/admission/QC views retain quiet refresh, keyboard/focus, narrow layout, correct Actions controls and the Simulated separation. | Focused frontend/browser |
| RA-10 | Exactly one real pilot has expected actual outputs and measurements, independently reviewed against frozen scientific criteria. | Hosted + scientific review |
| RA-11 | Whole-record/provider-ledger comparisons retain both original conflict receipts, every old attempt/event/command and all unrelated/Website records. | Pre/post readback + recovery |

Local engineering evidence is recorded in the [handoff](../operations/real-assembly-engineering-20261022.md). RA-01/02/04/05/06 have focused synthetic fixture coverage; the direct PostgreSQL admission fixture covers rollback/recovery/idempotency and unchanged execution/receipts with synthetic S3 transport and scanner verdicts. This does not close actual native PSeq qualification (RA-03), real S3/ClamAV/throughput and supervisor deployment acceptance, hosted UI/preservation readback (RA-09/11), or the real scientific pilot (RA-10). Those remain held. The previous shell-substitute wrapper tests were replaced by the new process/adapter fixtures; neither kind is biological qualification.

## Preserving hosted release and single-pilot acceptance

Before any separately authorized deployment/start:

1. Identify exact DPS/Portal source and runtime configuration. Review any operator changes without overwriting them. Confirm zero active or ambiguously owned native jobs and pending Start deliveries; verify the existing ledger and all terminal acknowledgments. Honor the intentionally stopped state until the controlled start is authorized.
2. Capture fresh protected DPS ledger, workspace/journal, launcher/environment, certificates, current/prior executable and scientific reference identities. Capture the Portal database and file recovery copy, restore-verify it in isolation and independently verify off-server encrypted contents. Include all Website intake data and current destination records. Preserve the existing populated-S3 recovery deferral; do not claim it has been solved by database backup.
3. Stage an isolated native release, approved catalog and configuration conversion. Preserve old binary/configuration recovery and the same ledger. If no Portal runtime source changes are required, do not redeploy it. If Portal deployment is required, use its preserving plan, bounded workflow enable/run/disable authorization and existing orphan quarantine/Vercel holds. No migration runs unless separately authorized where required.
4. Start exactly one service with the existing identity/TLS/ledger. Verify broker connection and actual Describe/Query behavior, scientific dependency readiness, health/exit observability, scanner/size constraints and unchanged history. This step sends no Start.
5. After explicit authorization for the nominated real pilot, submit one normal Portal attempt using its approved specimen/run, pinned inputs and qualified recipe. Save the new attempt ID, parent link if it truly is a same-specimen repeat, and stable Run command identity. No automatic second pilot follows a failure.
6. Verify actual start/stop/disposition, one attributed computation, real complete output bytes/versions, required provenance, committed final acknowledgment and idempotent scientific analysis registration. Download authorized outputs and independently compare hashes; the reviewer records the scientific assessment and any QC failure honestly. Do not assert QC Pass from exit code or provider status.
7. Compare every original receipt/event/command/execution fact and provider record with the pre-release baseline; record only expected new pilot/work/audit records. Verify unrelated and Website intake content unchanged, retained storage versions, service health, zero unexpected active processes and final recovery copies. Keep Customer release/commercial activation outside the pilot unless separately authorized.

Rollback: stop/fence the exact replacement and its owned children, retain all new ledger/journal/output/receipt evidence, and return to the retained binary/configuration only if it can safely honor the current ledger. Never restore an older ledger/database over later activity or replay old Start commands. If compatibility or process ownership is uncertain, leave processing stopped and preserve evidence for Operations reconciliation. An execution that failed or failed scientific QC remains recorded as such.

## Approval and handoff checklist

- Scientific lead/Product Owner: dataset/use scope, intended workflow/output roles, fixed references, expected results/tolerances and independent reviewer.
- Engineering: phases 1–4 and their focused proof; source/build/runtime/size/recovery receipts; current help/test-plan updates. No Owner library/schema/tool choice is needed.
- Release Owner: explicit hosted activation and one-pilot authorization after the concrete preserving release is reviewable. Separate approval for any new dependency/authentication/contract scope, nonlocal migration or destructive data remedy, if one becomes necessary.

Completion is a scientifically assessed, traceable real hosted-test assembly with all prior history intact. It does not constitute broad production qualification or Customer release.
