# Local sample DPS API and UI activation — October 14, 2026

The Owner requested enabling API/UI assembly for sequenced samples and confirmed
the exact recipe name `pseq_data_assembler`, version `0.1.0`. Scope remains the
local API/UI. The existing hosted test environment and deployment holds were
not changed.

## Implemented behavior

The existing Data assembly workspace uses its normal sample/run Start workflow.
One configured recipe is preselected; selecting a run selects its listed inputs.
The API requires a complete current verified FASTQ set and retains existing
preparation, purchased-run, commercial authorization, hold, concurrency and
uncertain-dispatch guards. The DPS 1.0 contract still requires a commercial Lab
Job; Trial scope requires a separate contract extension.

The application file provider remains Local. A separately configured `Dps:S3`
handoff uses the existing versioned local-test bucket and `local-api-dps/` prefix.
Exact original managed bytes are verified, copied into conditional immutable
input-cache objects, and reread by version/checksum/size. Attempts freeze their
input versions, control manifests and record-derived output destinations. Local
originals and scientific receipts are preserved. No storage cutover or migration
was performed. Credentials are retained in an account-only profile outside
source; no credentials enter browser payloads, manifests or this record.

The local recipe is explicitly Simulated, and that marker is saved with each
attempt's recipe snapshot. Simulation is permitted only in Development/local.
The attempt UI labels its mock nature and distinguishes Simulation completed
from scientific success. The API verifies diagnostic output versions, full
hashes, scope, recipe, inputs, execution times, required roles and output prefix
before committing lifecycle evidence. Missing mock reference provenance remains
absent rather than being invented. Scientific output validation remains strict.

Simulated outputs have authenticated, bounded, exact-version downloads, named
`SIMULATED-...`. Automatic scientific analysis admission and manual analysis
linking are blocked; no QC/release action is offered for simulated attempts.
Existing durable commands, authoritative Query recovery, commit-before-ACK,
transient progress, cancellation and scoped notification mechanisms are reused.

## Verification checkpoint

| Check | Result |
| --- | --- |
| Full backend solution compilation | Pass: zero warnings/errors; regression sources compile. |
| Updated local API compilation | Pass: zero warnings/errors. |
| Frontend types and touched-source lint | Pass. |
| Help generation and consistency | Pass: 56 guides, corpus `20c88b0451ec`. |
| Local API health / anonymous assembly access | HTTP 200 healthy / HTTP 401. |
| Configured API S3 SDK | Versioning Enabled; conditional write and exact-version full-byte read pass with application storage still Local. |
| Binary FASTQ handoff | Existing synthetic R1 bytes pass stream staging/full-hash reread; repeated verification reuses the same immutable object version. |
| Mock output boundary | Actual earlier remote mock output passes diagnostic validation and fails scientific validation. |
| Signed-in local workspace | Shows Processing connected, `pseq_data_assembler · 0.1.0`, Simulated. |
| Existing local input inventory | Two Lab Jobs, 15 specimens, zero sequencing outputs, zero FASTQ sets and zero assembly jobs. |
| Sample Start/Cancel, lifecycle, download journey | Not run: no eligible local sequenced sample/input set exists. No scientific records were manufactured. |
| Automated tests | Not run, per the repository instruction. Focused diagnostic/scientific-boundary and presentation regression sources were added. |

The isolated SDK check wrote one 96-byte diagnostic object at
`local-api-dps/diagnostics/a9d0f60682e94b4dbca1b85dcbe2dd9d/connection.json`,
version `T098QUr8gu1lMeHjYyBnH_r2p6BfP1Wg`, SHA-256
`c54ecd228d882e7e27fb2380e5e967484a522d618a1b7ff14d154665340bbc40`.
It did not publish a Start or alter Portal records.

A follow-up reused the earlier synthetic 5,752-byte R1 file to exercise the
binary input-copy method and its existing-object path. The staged object is
`local-api-dps/diagnostics/649d23ffa37148f48521de092d5cdc97/sample.fastq.gz`,
version `QlBdtqsu1fQxIxD_sCz6wsuifaYdQNDO`, SHA-256
`82301358f0b6863eedea214525994fc6fe87c066d1df0788197600c8a4ded923`.
The same bytes/version were returned by repeated verification. Its additional
96-byte connection marker and all raw SDK evidence are retained under the same
diagnostic prefix and local evidence directory.

The earlier [standalone remote S3/MQTT run](2026-10-14-synthetic-fastq-s3-dps.md)
establishes Accepted → Running → Succeeded for the mock server. It is separate
from sample/API execution, which remains an acceptance case once verified
sequencing inputs exist. Narrow/theme/keyboard checks for the conditional
Start/detail/download controls remain in the living test plans.

Local API/tunnel and frontend remain running at `https://localhost:44399`,
`127.0.0.1:11883`, and `https://localhost:3000`. Logs, SDK evidence, process
state and the connected-workspace screenshot are retained under
`backend/artifacts/local-dps-ui-20261014/`. Temporary isolated build/check
projects were removed after verification. No staging, commit, push or deployment
was performed.
