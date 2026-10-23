# Real assembly in hosted test — readiness report

Status: **not ready for a scientifically valid assembly**. Prepared October 22, 2026 PDT, from current code and read-only hosted inspection. The Owner requested investigation and planning, with all receipts and execution history preserved. No pipeline execution, restart, configuration change, installation, migration or business-data write was performed.

Subsequent local engineering is recorded in the [engineering handoff](real-assembly-engineering-20261022.md). The findings below remain the pre-change hosted baseline. Local code fixes do not establish hosted activation, native PSeq qualification, approved scientific inputs/references/QC, or pilot acceptance.

The immediate next step is to qualify the native runner and finish its exact-input/actual-output adapter, then conduct one separately authorized scientific pilot. The [implementation plan](../plans/REAL-ASSEMBLY-HOSTED-TEST-IMPLEMENTATION-PLAN.md) defines the work and release gates. The earlier [successful simulation](dps-genuine-simulation-test-release-20261022.md) proves the diagnostic transport/lifecycle path; it does not qualify the scientific recipe.

## DPS stop investigation

**Working assumption directed by the Owner: DPS was stopped intentionally.** This is an operating assumption, not a recovered exit record. The evidence establishes when the connection ended, but cannot identify the signal or person responsible.

| October 22 PDT | Verified evidence |
| --- | --- |
| 8:58:40 PM | Isolated simulation release `e4857ef538315932a02a4a636e8acc2f09e307b8` started as PID 51269; broker accepted client `dps-hosted-simulation-e4857ef`, mutual-TLS identity `dps`. |
| 8:59:19–8:59:34 PM | Linked simulation `e1572182-c16b-446a-9ecb-a45a2d3ec15e` ran once and succeeded; its final acknowledgment remains committed. |
| 9:18:47 PM | Post-merge readback verified the same binary/PID, connected broker socket, exclusive ledger lock and zero active executions. |
| 9:23:49 PM | Last retained DPS capability response in the release log. |
| **9:24:10 PM** | Broker recorded `Client dps-hosted-simulation-e4857ef closed its connection.` (`2026-10-23T04:24:10Z`). |
| 9:28–9:46 PM inspections | No DPS executable or `dotnet ... dps.dll` worker found; all four ledger jobs are terminal. Final provider readback was `2026-10-23T04:46:28Z`. |

There is no logged DPS exception/shutdown reason in the release log, no matching kernel OOM/segfault event and no host reboot in the interval inspected. Boot time remains October 21, 00:50:40 UTC. Neither process accounting nor auditd is enabled; `coredumpctl` is unavailable and no release core file was found. Narrow searches found no saved exact control command for PID 51269. These absences do not prove a particular termination cause.

The three modified launcher/certificate scripts are **file-mode changes only** (`100644` → `100755`), with no content diff. Their file modification times precede this deployment. They are not evidence of a code edit causing the stop. The processing checkout is at merged `c68e584f29a0e8faa2a9a6537075d356de1929fc`; its source tree matches the deployed correction. The GitHub merge did not require a runtime restart.

DPS currently has no systemd service or equivalent identified service supervisor. It was a detached console process with private file logging, and its program handles Ctrl+C but does not explicitly register SIGTERM handling or record a durable exit reason. **Why it remains stopped is clear: nothing supervises/restarts that console process.** Given the Owner's assumption, treat the current stop as intentional and require an explicit controlled start; do not introduce an automatic restart now.

Useful retained evidence: release log SHA-256 `07481d18ad301c2dd4bd2822b6abea8836095cae7dfa48fddeebd58e64ccfeae`; ledger file SHA-256 at inspection `be97b1c7563d07958c15a92d0ca093797f856dacf6ff21fd27699621c9d60e70`. Original logs remain on the host; local task evidence contains bounded, sanitized observations. No general shell history, credentials or scientific input contents were copied into this report.

## Verified preservation and readiness foundations

At `2026-10-23T04:45:39Z`, final whole-record equality against the post-run baseline passed for the entire target specimen:

| Saved records | Count | Result |
| --- | ---: | --- |
| Assembly attempts | 6 | Every row unchanged |
| Commands | 9 | Every row unchanged |
| Journal events | 42 | Every row unchanged |
| Receipts | 28 | Every row unchanged |

The original conflicted attempt `41e26472-16b3-41d2-9130-c041216a3da4` retains all eight receipts, both disputed terminal receipts, original Failed execution facts and its appended Operations reconciliation. The latest repeat remains Succeeded, linked to failed parent `b3187a23-d258-4c85-8866-900021cff3d5`, with no attention reason or scientific analysis link. Canonical specimen snapshot SHA-256: `c11d61215261f975001d83c4529cabb3f6ce6ba8f62eb1c94afde756bbb35f5d`.

The complete provider ledger equals its protected post-run copy: four terminal jobs, all final acknowledgments committed, with every earlier job/event/receipt retained. Global active Portal assembly count is zero. Existing encrypted pre/post Portal and DPS recovery packages and isolated-restore/off-server verification remain recorded in the simulation release receipt; no older ledger was restored.

Existing foundations should be reused:

- Portal freezes exact specimen/run, recipe, input identities, S3 versions, byte lengths and checksums; commands/receipts and terminal outcomes have durable idempotency and conflict reconciliation.
- The current approved recipe is only `pseq_data_assembler` 0.1.0, **Simulated=true**. Runtime still uses validated TLS 18883 and limits Portal dispatch to one concurrent job. Keep that reserved identity unchanged.
- Actual simulated input/output S3 reads, versioned writes, final acknowledgment and authenticated checksum-matching downloads passed in the preceding release. This does not establish the same operations at scientific scale.
- Portal already implements strict scientific manifest validation and `DpsOutputAdmission`: exact binding, byte verification, malware scanning, idempotent scientific-file/analysis registration and separate QC/release. It must not be replaced by a parallel import workflow.
- The Portal API remains healthy at its previous image. API health does not imply the stopped processing worker is available.

## Remaining integration gaps

| ID | Finding from current code/runtime | Required closure |
| --- | --- | --- |
| R01 | No supervised DPS service or retained process exit status. | Controlled, ledger-preserving launch; explicit stop/restart semantics and observable service health. |
| R02 | Saved deployed launch settings have no `PB_RUNNER` or `PB_DATASET_HOME`. No scientific executable exists at the three inspected expected build paths. | Pin and qualify a Linux ARM64 native release and explicit service configuration. Do not infer executable absence everywhere on the host. |
| R03 | Rust/Cargo exist under `~/.cargo/bin` with a stable aarch64 toolchain but are absent from the noninteractive SSH PATH. Configured BLAST binary and inspected Inchworm/reference-file paths are missing. | Use explicit build/runtime paths; inventory actual transitive tools, libraries, reference stores and release dependencies. Source code/Cargo version alone is not a qualified executable. |
| R04 | `VerifyInputsAsync` hashes listed S3 objects and discards their bytes. `PSeqRecipe` does not consume manifest file mappings or frozen recipe parameters; it instead uses PB58/sample 09. | Stream the exact pinned objects into an isolated attempt workspace and generate the native input/configuration mapping from that same verified content. |
| R05 | Native stages hardcode an individual SMID, Ensembl source, local reference database and scientific parameters. | Qualify the intended whole-sample workflow, complete output scope, parameters and references with the scientific lead. No silent selection of one hardcoded cluster as the sample result. |
| R06 | `BuildOutputPayload` still creates placeholder FASTA/JSON even after the non-simulated runner branch. | Collect real native outputs by approved role, validate their format/completeness and upload actual files. Keep the simulator's placeholders in its own branch. |
| R07 | DPS provenance DTO lacks `reference_data` / `reference_data_not_applicable`, which the existing Portal v1 scientific schema requires. It also reports recipe version as engine version. | Implement the existing v1 provenance fields, actual tool/engine release identities and pinned references. Use an explicit no-reference reason only for a genuinely reference-free approved workflow. Never weaken scientific validation to accept mock provenance. |
| R08 | DPS advertises/validates one globally configured recipe, although the wire capability DTO already supports a list. | One canonical recipe catalog and explicit dispatch, preserving the existing Simulated identity and enabling a separate qualified scientific profile. Do not run competing DPS consumers on the same Start topic. |
| R09 | Native process output is read wholly into memory; nonzero-exit exceptions include raw stdout/stderr. Real output upload accepts only `byte[]`; final native progress can reach 100 before uploads. | Bounded private diagnostics, safe failure reasons, file-stream upload, job-scoped paths and 100% only after verified output publication. Input HTTP reads already stream; retain that foundation. |
| R10 | Restart resumes a nonterminal job by rerunning the recipe. The current wrapper kills its child tree on ordinary cancellation, but service death, orphan children, durable stage identity and repeat-safe output publication are not established for scientific execution. | Per-attempt durable execution/checkpoint ownership, child-process fencing and failure/cancellation/restart proofs before automatic scientific recovery. Never use a missing ledger entry alone as proof of safe resubmission. |
| R11 | Portal permits 1 GiB/output and 16 GiB/set; effective scanner stream/file limit is 100 MiB. | Bound the first pilot to scanner-compatible input/output files, expanded size and scan time, or separately review a coherent limit change. No scanner bypass or fabricated Clean verdict. |
| R12 | Existing runner tests use a renamed command shell as the executable. No direct scientific `DpsOutputAdmission` positive/negative journey test was found. | Add focused real-adapter and Portal admission recovery tests, followed by one approved real dataset and independent scientific review. The previous 38 passing Linux checks are transport/simulation evidence. |

## Capacity and size constraints

The processing host snapshot has eight logical CPUs, 61,973 MiB RAM, about 4.6 T free disk and no swap. This is capacity inventory, not a demonstrated PSeq workload budget. Keep one concurrent scientific execution and measure CPU, memory, scratch/expanded input space and duration on the nominated pilot before setting final limits.

Hosted settings: scanner `MaximumStreamBytes=104857600`, timeout 120 seconds; clamd `StreamMaxLength 100M`, `MaxFileSize 100M`, `MaxScanSize 400M`, `MaxScanTime 90000`. The native/library/reference release must also be qualified for ARM64. Approved pilot files must fit every applicable limit. Merely increasing `Dps:MaximumOutputFileBytes` cannot make scanning succeed.

Portal's default 300-second operation budget bounds a dispatch/reconciliation/admission operation, **not the entire scientific execution**. Prove that the actual manifest/admission transfers fit this budget; plan resumable admission work if they do not. Large-file throughput, native memory use and reference database size remain unmeasured.

## Scientific decisions needed before the pilot

The scientific lead/Product Owner must supply the approved dataset and its permitted use, intended assay/recipe and required deliverables, fixed reference identities, expected transcript/isoform or other relevant results, tolerances/QC criteria and an independent reviewer. Engineering will choose the mechanics; the Owner need not choose libraries, storage schemas or process-management tools.

Use a representative PSeq-compatible real dataset with known expectations. The two small `SIMULATED_R*.fastq` diagnostic files and placeholder `N` output do not supply scientific ground truth. Preserve `SIMULATED-ASM-20261020` as diagnostic history; prefer a separately admitted real pilot specimen/run rather than relabeling that record or replacing its FASTQs.

## Source basis and limits

External source is pinned to merged `c68e584f29a0e8faa2a9a6537075d356de1929fc` / deployed-tree-equivalent `e4857ef`. Principal evidence: [PSeqRecipe](https://github.com/phaenobiotech/pipeline/blob/c68e584f29a0e8faa2a9a6537075d356de1929fc/apps/pseq_server/dps/src/PSeqRecipe.cs), [DpsJobRunner](https://github.com/phaenobiotech/pipeline/blob/c68e584f29a0e8faa2a9a6537075d356de1929fc/apps/pseq_server/dps/src/DpsJobRunner.cs), [DPS contract DTOs](https://github.com/phaenobiotech/pipeline/blob/c68e584f29a0e8faa2a9a6537075d356de1929fc/apps/pseq_server/dps/src/DpsContract.cs), [Portal contract](../../backend/app/Features/LabOperations/Services/DpsContract.cs), [output admission](../../backend/app/Features/LabOperations/Services/DpsOutputAdmission.cs) and [shared scanner](../../backend/app/Infrastructure/Storage/FileScanning.cs).

Older plan statements that no MQTT provider or scientific admission implementation exists are superseded by current code. Their historical acceptance limits remain valid. This investigation ran no automated tests or scientific pipeline. Its conclusions are source inspection plus bounded read-only runtime/record checks, with the stop treated as intentional by Owner direction.
