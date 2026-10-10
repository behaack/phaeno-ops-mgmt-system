# POMS–DPS MQTT messaging plan

## POMS implementation authorized — October 10, 2026

Status: implementation written, compilation/validation deferred. The API now
registers DpsAssemblyProvider, a configured MQTT hosted client, schema/recipe
checks, pinned S3 handoff and parameter objects, scoped command/lifecycle
receipts/query/ACK mapping, immediate Start/Cancel dispatch errors, saved-request
UI recovery and scanned output/analysis admission. See
[configuration and recovery](../operations/dps-integration-configuration.md).
The adopted output provenance now explicitly supplies reference-data versions
or a no-reference reason, matching existing scientific evidence requirements.
The schema/examples and Chris's handoff are updated; those revisions have not
been validated. Historical probe/fixture checks below do not validate this code.

The Owner authorized completing POMS without validation runs, then explicitly
requested dispatch and an API error when dispatch fails. Implement the adopted
1.0 contract with MQTTnet 5.2.0.1603 (the existing probe's pinned dependency),
server-only configured broker/TLS identities, approved recipe configuration,
exact versioned S3 manifests, receipt/query/event/ACK mapping and scanned output
admission into existing scientific-file/analysis records. No new persisted
entities, authentication-provider changes or public browser MQTT contract are
introduced. The saved request/command precede publication; initial dispatch
requires a correlated DPS business receipt and reports unavailable/rejected/
timeout failures through the existing API error envelope. An uncertain dispatch
remains recoverable under its original ID. Defaults stay disabled/unconfigured;
no connection, dispatch, build, test, validation, migration or deployment is run
as part of implementation, per the Owner's instruction. Chris-dependent runtime
acceptance remains outstanding.

## Owner-defined integration contract — October 10, 2026

The Owner asked to finish the assembly integration, then confirmed the current
DPS source/real input-output guide is unavailable and directed POMS to define
the required contract for the MQTT developer. The implementation scope is now
the [POMS–DPS developer contract](POMS-DPS-DEVELOPER-CONTRACT.md), its machine-readable
schemas/examples and an exact two-sample acceptance handoff. These define a new,
versioned operational contract; they do not claim the earlier dummy server
implements it. Baseline topic/DTO observations below remain historical evidence.
The provider adapter and controlled activation follow developer implementation
and verification of this contract. No guessed legacy translation, fabricated
execution times, runtime simulation, deployment, credential/access change or
new dependency is included in the contract handoff. The Owner can forward the
bundle. The Owner chose a standalone Markdown handoff addressed to Chris Yourch;
it is supplied as a downloadable file, with no outbound email/chat message.

## Immediate milestone — MQTT plumbing test, October 1, 2026

Status: **plumbing round trip verified** on the owner-authorized retry. The remote server returned six correlated status messages from 0% through 100%; see the [October 1 run record](../testing/runs/2026-10-01-remote-mqtt-plumbing-probe.md).

The owner clarified that the immediate goal is one connection test: send a synthetic command to the remote server, where a fake asynchronous job runs, and observe the returned status messages. This milestone uses dummy values and proves the MQTT round trip. Scientific input verification, persisted assembly lifecycle evidence, production security work, independent Operations alerts, and the complete recovery contract belong to later integration milestones.

The owner confirmed **`test.mosquitto.org:1883`** as the broker used by the remote fake-job server. Use an isolated developer-side probe with plaintext/anonymous connection settings for this test, with no application authentication changes or new security-hardening scope. A separate Portal deployment is not needed for this probe.

Implementation scope: a standalone .NET 10 [plumbing probe](../../backend/tools/PSeq.Operations.MqttPlumbingProbe/README.md), outside the Portal solution/runtime and with no API/database project reference. Its sole package dependency is [MQTTnet 5.2.0.1603](https://www.nuget.org/packages/MQTTnet/5.2.0.1603), verified against the package publisher's NuGet listing. The supplied guide is sufficient to publish the synthetic Start DTO and display raw status responses; full shared-source/schema review remains a later integration gate.

1. Connect and subscribe to `backend/data_process/job/{job_id}` for a freshly generated synthetic UUID. Wait for subscription confirmation before publishing so a fast fake job's response can be observed.
2. Publish one non-retained QoS 1 message to `backend/data_process/command/start_job`, with `dto_id=100`, the same `job_id`, and dummy `data_folder="mqtt-plumbing-test"`. No scientific files or processing recipe are required for the fake job; confirm a special dummy-folder value only if the remote stub requires one.
3. Display returned status payloads from the exact subscribed topic, checking `dto_id=102` and the matching `job_id`. Record connection, subscription, publication, and response times in the test output. Display the supplied `status` value without inventing numeric enum meanings; map friendly state names only when confirmed by the remote shared source or wire examples.
4. Observe the remote fake job's asynchronous status progression/completion, then disconnect. Use a bounded observation window and report the received messages or timeout. Make one intentional Start publication; do not automatically republish on reconnect or timeout. Keep application-level repeat handling and failure recovery for the later contract work.

Success is a correlated response from the remote server and observed completion of its fake asynchronous job. Broker acknowledgment alone establishes publication, not execution of that fake job. The probe does not create a Lab assembly attempt, persist scientific evidence, or enable the normal assembly worker.

- [x] Confirm the fake-job server's broker host/port and any existing connection settings: owner supplied `test.mosquitto.org:1883` on October 1.
- [x] Prepare and compile the isolated probe using the supplied Start/status topics and dummy payload: standalone build passes with zero warnings/errors.
- [x] Connect, subscribe, and publish one dummy Start to the confirmed broker. The first published job received no status; the owner-authorized retry used fresh job `326ed051-46ad-4fc6-aed7-df4b0d3bc23d` and was acknowledged by the broker.
- [x] Exercise the remote fake job and retain its correlated status exchange: six `dto_id=102` responses progressed 0%, 20%, 40%, 60%, 80%, 100%, ending with raw `status=2`. This completes the isolated plumbing round trip; numeric enum definitions remain to be verified when implementing the full provider.

The broader contract and activation gaps below remain tracked for the full POMS integration. They are not prerequisites for this isolated plumbing test.

## Authorized POMS foundation — September 30, 2026

The owner authorized the provider-independent recovery and POMS notification slice. Extend the existing assembly attempt/worker with durable Run/Cancel command identities, delivery attempts, configurable retry/confirmation deadlines, persistent attention and 30-minute escalation; normalized lifecycle-event receipts with duplicate/conflict guards and acknowledgment eligibility only after commit; and authenticated job-scoped SignalR refresh notifications. Keep progress transient. Microsoft SignalR's browser client is the only new dependency in this slice, pinned to the registry-verified 10.0.11 release. Reuse Clerk JWT validation and existing active internal Lab roles; query-string bearer tokens are accepted only at the exact POMS notification endpoint. WebSocket connections skip negotiation, and each API instance reads committed job versions for its own connections, avoiding dependency on an external backplane or a timestamp event cursor. Recheck internal access before delivery and close expired/revoked connections. HTTP snapshots/polling remain the reconnect/fallback authority.

New delivery/receipt tables are additive. One-time migration initialization records existing unfinished attempts as unconfirmed, with no invented provider receipt/execution evidence. No existing attempt, specimen, purchased-run or scientific record is removed. Create/apply the migration only to the configured local development database after verification. Synthetic fixtures exercise internal normalized messages; they do not define DPS wire enum values, response topics or manifest conventions. The unavailable provider and default-off processing gate remain. Real MQTT transport, DPS acknowledgments/replay, independent Operations alert delivery, shared-source review, scientific acceptance, deployment and live activation remain external gates.

Status: POMS recovery and notification foundation implemented September 30, 2026; the isolated remote MQTT plumbing round trip was verified October 1, 2026. Full operational MQTT integration remains gated by the external contract. This plan specifies server-to-server messages between this project's POMS API and DPS. The authorized foundation adds internal persistence and POMS-to-UI SignalR notifications; it does not connect the runtime provider to DPS, activate assembly processing, or deploy either server. It supersedes external-service SignalR transport in the [sequencing assembly plan](SEQUENCING-DATA-ASSEMBLY-PLAN.md).

The supplied guide establishes the current external library's connection settings, topics, DTOs, and status conventions. It does not yet satisfy all previously agreed lifecycle-evidence and recovery requirements. This plan distinguishes that supplied baseline from the contract additions still required before activation; receipt of the guide is not proof of a live DPS integration.

## Product outcome and scope

An authorized POMS user can request or cancel one data-assembly job. DPS reports actual execution progress and a final outcome. POMS records a confirmed start and final disposition against the existing assembly attempt, so an investigator can follow the job to its exact Lab Job, sample/specimen, purchased sequencing run, and input lineage. An unanswered command or lost connection must remain visibly uncertain rather than inventing a start, failure, cancellation, or success.

This scope covers only POMS API ↔ MQTT broker ↔ DPS. It does not define laboratory equipment messaging, the data-to-assemble schema, S3 input/output transfer, scientific QC, result release, or a general event bus. Existing assembly, traceability, authorization, and customer-release rules remain authoritative.

The user roles are the authorized POMS requester, authorized laboratory viewers, and an Operations Administrator investigating delivery failures. DPS is the execution authority for actual start and final outcome; POMS is the system of record for the job's saved lifecycle and sample/specimen linkage.

## Supplied external MQTT contract

Source: `MQTT_INTEGRATION.md`, supplied by the owner and reviewed September 30, 2026. It describes `PhaenoMqttClientConfig.cs` and `PhaenoMqttMessages.cs` in namespace `MqttPipeline.Shared`, located in the external solution at `apps/MQTT_Test/shared/`. The guide's `backend/Program.cs`, `frontend/Program.cs`, and `mqtt_broker/Program.cs` are external sample applications, not files in this Portal repository. The shared source files, exact package version, and live broker/DPS behavior have not been independently verified.

The guide calls the command sender **FRONTEND** and the processor **BACKEND**. For this integration, those roles map to the **POMS API** and **DPS**, respectively. The Portal browser does not connect to MQTT or receive broker credentials; authenticated POMS HTTP snapshots and the planned POMS-to-UI SignalR notifications remain its interface.

### Connection settings and shared-library behavior

The supplied configuration reads these environment variables at each call, without caching:

| Variable | Supplied meaning | Supplied default |
| --- | --- | --- |
| `MQTT_HOST` | Bare broker hostname/IP; no scheme, port suffix, or path | `test.mosquitto.org` (`MosquittoEndpoint`) |
| `MQTT_PORT` | Broker TCP port | `8883` when the host equals `AwsEndpoint`; otherwise `1883` |
| `MQTT_USERNAME`, `MQTT_PASSWORD` | Optional broker credentials | Omitted unless both values are non-blank |
| `MQTT_TLS` | Explicit `true`/`false` override | TLS on for the exact AWS endpoint; otherwise off |
| `MQTT_CLIENT_CERT_PATH` | PKCS#12/PFX client-certificate path for mutual TLS | No client certificate |
| `MQTT_CLIENT_CERT_PASSWORD` | PFX password | `null` for an unprotected certificate |

The supplied `AwsEndpoint` is `agfp5d276k18i-ats.iot.us-east-2.amazonaws.com` (AWS IoT Core, `us-east-2`). The guide says that matching this exact host selects TLS/port defaults and applies `WithoutPacketFragmentation()` to the options builder. This is a supplied endpoint reference, not evidence of approved POMS access, certificates, topic policies, or production readiness.

- `GetBrokerHost()` and `GetBrokerPort()` resolve the settings above. `Build(string client_id)` constructs `MqttClientOptions` with client ID, TCP endpoint, **clean session**, optional TLS/client certificate, and optional credentials. Call it for each connection attempt so changed configuration is reread.
- `DefaultQualityOfServiceLevel()` returns `AtLeastOnce` (**QoS 1**) for publication and subscription. Duplicate delivery remains possible and requires application-level idempotency.
- `DefaultRetainFlag()` returns `true`, but existing callers apply it **only to job-status publication**. Start and Cancel commands are not retained. Status retention includes the latest `Started`, `Progress`, `Completed`, or `Canceled` snapshot on that job's status topic.
- The guide loads PFX certificates with `X509CertificateLoader.LoadPkcs12FromFile(...)` and `X509KeyStorageFlags.EphemeralKeySet`; the private key is not persisted to the profile/key store. Reload the configured certificate for each process/connection as needed.
- Use a stable, app-specific client ID, unique to every concurrently connected POMS/DPS instance. External examples `backend-01` and `frontend-01` are sample IDs, not POMS deployment settings. A stable ID does not override the supplied **clean-session** setting or establish durable subscription/message continuity.
- Attach `ConnectedAsync`, `DisconnectedAsync`, and `ApplicationMessageReceivedAsync` handlers before `ConnectAsync`. The integrating service owns reconnection, connection state, subscription restoration on each connection, and shutdown; the shared library only constructs options and payloads.

For isolated development, the external sample's embedded broker defaults to `127.0.0.1:1883`, with `MQTT_BROKER_BIND`/`MQTT_BROKER_PORT` overrides. Its client uses `MQTT_HOST=127.0.0.1` and explicit `MQTT_TLS=false` if a previous environment forced TLS on. The public Mosquitto defaults are sample-only references. POMS configuration must require an explicit approved broker and TLS for hosted integration, without falling back to an anonymous public broker; localhost plaintext is limited to isolated development with synthetic messages.

The external sample targets .NET 8 and uses the **MQTTnet** NuGet package, `System.Text.Json`, and BCL X.509 APIs. The POMS API targets .NET 10. Review the actual shared files and pin a compatible MQTTnet version before implementing the backend provider; the guide does not specify a package version. Reuse the contract within the backend provider boundary rather than copying the sample application's workflow. This documentation update adds no dependency or authentication change.

### Topics, DTO IDs, and payloads

Use the supplied topic strings exactly; changing or extending the external contract requires agreement with DPS. `job_id` is the serialized POMS assembly-attempt ID defined below.

| POMS direction | Shared member and exact topic | DTO ID and payload |
| --- | --- | --- |
| Publish Run | `PhaenoMqttTopics.StartDataProcessing`: `backend/data_process/command/start_job` | `PhaenoMqttDtoIds.StartDataProcessing = 100`; `StartJobDto(int dto_id, string job_id, string data_folder)` |
| Publish Cancel | `PhaenoMqttTopics.CancelJob(jobId)`: `backend/data_process/command/cancel_job/{job_id}`; prefix `CancelDataProcessingPrefix` | `PhaenoMqttDtoIds.CancelDataProcessing = 101`; `CancelJobDto(int dto_id, string job_id)` |
| Subscribe to DPS status | `PhaenoMqttTopics.JobStatus(jobId)`: `backend/data_process/job/{job_id}`; prefix `JobStatusPrefix`; subscription `backend/data_process/job/+` | `PhaenoMqttDtoIds.JobStatus = 102`; `JobStatusDto(int dto_id, string job_id, eJobState status, uint progress, string? data_folder = null)` |

DPS's sample subscribes to the exact Start topic, `backend/data_process/command/cancel_job/+`, and its own `backend/data_process/job/+` status stream. POMS needs only the authorized DPS status subscription for this baseline. Any later response/acknowledgment or reconciliation topic is still to be agreed; none is supplied by the guide.

The three wire DTOs are sealed positional records. `PhaenoMqttJson.Serialize(dto)` and `Deserialize<T>(payload)` use `System.Text.Json` with `JsonSerializerDefaults.Web`. Preserve the exact JSON field names `dto_id`, `job_id`, `data_folder`, `status`, and `progress`. `Deserialize<T>` can return null for JSON `null` and throws `JsonException` for malformed JSON. The guide names the enum states but does not give explicit numeric assignments, a string-enum converter, or captured status JSON; confirm the encoded `status` values from the actual shared source and DPS fixtures before writing status examples or implementing serialization.

Illustrative Run and Cancel payloads using a synthetic attempt ID and folder reference:

```json
{"dto_id":100,"job_id":"11111111-1111-4111-8111-111111111111","data_folder":"assembly-inputs/11111111-1111-4111-8111-111111111111"}
```

```json
{"dto_id":101,"job_id":"11111111-1111-4111-8111-111111111111"}
```

The folder value above is illustrative, not an agreed filesystem/S3 address convention. The supplied Run input is **`data_folder`**, replacing the earlier wholly unspecified wire payload. Its path/URI format, access, upload-completion evidence, immutable file-manifest binding, and recipe/configuration selection remain open. Resolve it from the saved verified inputs; never forward an arbitrary browser-supplied path or treat a nonempty folder as proof of complete inputs. File transfer and output verification remain governed by the sequencing assembly plan.

### Status meaning and receipt validation

The supplied `eJobState` contains `Started`, `Progress`, `Completed`, and `Canceled`. The external sample treats `Completed` and `Canceled` as terminal. `progress` is an unsigned integer constrained to **0–100**. `data_folder` is optional on status messages; the sample DPS always includes it, and its receiving client retains the previous folder when it is omitted. POMS instead resolves omitted values from its saved input binding; a supplied folder must match that binding and cannot change the attempt's frozen inputs.

| Supplied state | Planned POMS interpretation | Remaining evidence requirement |
| --- | --- | --- |
| `Started` | Candidate actual-start confirmation; never infer it from Start publication or broker acknowledgment | DPS must confirm it means actual execution and supply the actual UTC start time and durable replay/acknowledgment identity |
| `Progress` | Latest transient percentage for the saved attempt | Freshness/order semantics are absent; a progress value, including 100, is not a terminal outcome or an actual-start timestamp |
| `Completed` | Candidate successful final disposition (`Succeeded`) | Agree that it means successful execution, and supply final event identity, occurrence/start/stop times, and output-evidence references; it does not establish QC approval or customer release |
| `Canceled` | Candidate final cancellation (`Terminated` after execution or `CancelledBeforeStart` before execution) | Require actual execution times or explicit never-started evidence; cancellation receipt alone is insufficient |

No `Failed` state, rejection/error DTO, command receipt DTO, final-commit acknowledgment DTO, or query/replay contract is supplied. Do not map errors or unknown states to `Completed`/`Canceled`, manufacture missing timestamps from POMS receipt time, or apply the baseline status DTO directly as a complete lifecycle record. The existing provider/domain require richer execution evidence; mapping pre-execution DPS cancellation also needs an explicit supported domain transition during implementation.

On receipt, guard empty payloads, decode the documented UTF-8 payload, catch malformed JSON, reject null DTOs, and validate the expected integer `dto_id` **before acting**. Reject a missing/mismatched ID, unknown enum value, out-of-range progress, invalid/unrecognized attempt ID, unauthorized provider/job association, or mismatched topic suffix and payload `job_id`. Per-job topics have exactly one job-ID segment; validate the full shape rather than accepting arbitrary `StartsWith` matches. Agree message-size limits before activation. Invalid baseline messages are discarded with safe diagnostics; negative application responses require the still-unagreed response contract.

The external `JobSnapshot(string job_id, eJobState status, uint progress, string data_folder)` is a console/UI read-model convenience, not another MQTT payload and not POMS lifecycle evidence.

Retained status is a latest snapshot for a late subscriber, not a durable event journal, acknowledgment, or authoritative negative lookup. It may replay old `Started`/`Progress` after reconnect and replaces earlier status for the same topic. Broker-retained progress does not authorize POMS percentage-history writes. Until DPS supplies occurrence time/sequence and authoritative replay, receipt time cannot prove status freshness, absence of retained status cannot prove non-execution, and a retained terminal snapshot cannot recover omitted actual-start evidence. Preserve terminal guards and reconcile uncertain attempts before resending any command.

## Identity and message contract

`JobId` means the immutable POMS assembly-attempt ID (`LabAssemblyJob.Id`), not the commercial Job ID or the specimen ID. POMS already links that attempt to the Lab work order, specimen, purchased sequencing-run allocation, and frozen inputs. DPS must echo the same `JobId` in every response and event. POMS resolves and verifies that saved relationship before applying a DPS message; neither a topic name nor a DPS-supplied sample label establishes ownership.

Use a canonical UUID string for the supplied `job_id` and its topic segment, and require DPS to echo the same attempt identity. Each agreed message or response also needs a contract version, unique message/command ID, occurrence time in UTC, and correlation to the originating command where applicable. These are delivery and evidence fields, not additional business message types. The supplied `dto_id` identifies a DTO type; it does not provide a schema version, unique event identity, or command correlation. The supplied three DTOs lack those additional fields. Agree their explicit extension and response schemas with DPS rather than silently adding fields to the current wire payloads. Keep customer/sample-identifying content and secrets out of topic names.

| Direction | Business message | Required behavior |
| --- | --- | --- |
| POMS → DPS | **Run** (supplied `StartJobDto`, `dto_id=100`, `job_id`, `data_folder`) | POMS commits the authorized request and frozen input identity before dispatch. The supplied command has no defined application receipt. The completed contract must let DPS respond that it received or rejected the command. A receipt means only that DPS took responsibility for the command. DPS separately confirms when execution actually starts, with its actual `startedAtUtc`, through the agreed correlated response/status contract. Repeated Run commands for the same attempt cannot create another execution. |
| POMS → DPS | **Cancel** (supplied `CancelJobDto`, `dto_id=101`, `job_id`) | The supplied command has no defined application receipt or reason field. The completed contract must let DPS respond that it received, rejected, or could not act on the request. Receipt of Cancel does not mean the job was cancelled. DPS later reports the actual terminal outcome, including a possible success/cancel race. Existing POMS permission and reason requirements still apply before dispatch; retain the reason in POMS and agree whether DPS also needs it. |
| DPS → POMS | **Progress** (supplied `JobStatusDto`, `dto_id=102`, `status=Progress`, `progress=0–100`) | POMS validates the job and, once the response contract is agreed, responds and makes the latest fresh progress available to authorized users. Progress is transient: no percentage history or per-update database/audit row. A missed update may be replaced by a newer one. The baseline uses retained status; freshness/order evidence and application responses remain to be agreed. Progress cannot change a terminal outcome. |
| DPS → POMS | **Final disposition** (`JobId`, `Cancelled` / `Failed` / `Succeeded`; baseline candidates `Canceled` / `Completed`) | Extend the supplied contract to cover failure and include a stable event ID, DPS occurrence time, actual start/stop times when execution occurred, and a safe reason/reference when applicable. POMS validates and durably commits the outcome and traceability event before returning an application-level acknowledgment. Exact duplicate events receive the same acknowledgment without creating duplicate history. The baseline terminal DTO alone does not meet this requirement. |

DPS may acknowledge Run as received before it can confirm actual start. The correlated Run response therefore has two distinct facts: command receipt and actual-start confirmation. DPS durably retains and retries the actual-start confirmation until POMS acknowledges it after commit. POMS records `startedAtUtc` only after that confirmation; if it is delayed or lost, the final disposition must also carry the actual start time for recovery. A job cancelled before execution has no fabricated start time. Preserve DPS occurrence time separately from POMS receipt time. Map DPS `Cancelled` to the existing POMS `Terminated` or `CancelledBeforeStart` state according to confirmed execution evidence; do not relabel a merely requested cancellation as final.

## Receipts, uncertainty, and recovery

The following application receipts, queues, and recovery behavior remain required contract work; the supplied QoS 1 and retained-status conventions do not establish them. With the supplied clean session, restore subscriptions after reconnect and use durable application recovery for outages. Do not retain Start/Cancel commands as a substitute for a durable command outbox, because a late subscription must not launch or cancel work unexpectedly.

MQTT broker delivery acknowledgment proves broker-level transfer, not that the other application accepted or recorded a business message. Every Run, Cancel, Progress, and Final disposition therefore has a correlated application response. Run/Cancel acceptance is recorded only after DPS has durably accepted responsibility. A Progress response confirms receipt/validation and latest-value handling, not durable history. POMS acknowledges a Final disposition only after its database transaction commits. Definite validation failures return a negative response with a safe reason; transient failures remain eligible for retry.

If Run receives no DPS application receipt within the agreed timeout, POMS keeps the attempt in an **unconfirmed dispatch** attention state. If DPS acknowledges receipt but does not confirm actual start by the agreed start-confirmation deadline, POMS retains the accepted state with no start time and raises the same attention condition. In either case POMS sends a SignalR alert to the authorized initiating UI client, with a persistent job-detail alert for reload/disconnect. The alert explains the known receipt state and that processing may or may not have begun, and links to the job. POMS reconciles by the same `JobId` before any resend; an ambiguous timeout must not launch a second computation. A late DPS response or start confirmation updates the saved state and clears or revises the alert.

If Cancel receives no response, POMS retains the cancellation request and marks its outcome uncertain. It must not report `Cancelled` until DPS confirms the terminal outcome. Reconciliation covers lost responses, API/DPS restarts, duplicate commands, and outcomes that arrive out of order. The DPS contract must provide an authoritative lookup or replay by `JobId`; a missing immediate response is not proof that a job never started.

For Final disposition, DPS saves the outgoing event in a durable local queue before publishing. Until POMS acknowledges a committed outcome, DPS retries the same event ID with bounded backoff across broker disconnections and DPS restarts. At **30 minutes without POMS acknowledgment**, DPS records an escalation log entry with the event ID, `JobId`, final outcome, DPS outcome time, escalation time, and delivery-failure reason, excluding secrets and raw scientific data. DPS sends an Operations Administrator alert through an independently available monitoring/notification path, because POMS may be unavailable. Alert channel, recipients, and delivery proof remain to be agreed. DPS continues retrying after the alert until POMS acknowledges; the log or alert never replaces delivery of the authoritative outcome. Repeat failures create one active alert per event, with follow-up if the condition persists.

POMS retains the received final event ID and committed result so replay is idempotent. A conflicting event with the same ID, or incompatible terminal outcomes with different IDs, is held for Operations reconciliation without silently changing the saved outcome. POMS startup/reconnect also reconciles active or uncertain attempts with DPS. A SignalR notification is a prompt to refresh the POMS record, not the record itself.

## Contract gaps to close with DPS

The supplied topics, field names, DTO IDs, 0–100 progress range, QoS 1, and status-only retention are now documented baseline facts. These remaining items are gates for full operational integration/activation, not for the isolated fake-job plumbing test above, and do not weaken the agreed product behavior:

| Gap in supplied guide | Required agreement/evidence |
| --- | --- |
| Shared implementation and schema stability | Obtain the two actual shared files, exact MQTTnet version, encoded enum values and fixtures, contract versioning, size limits, and malformed/unknown-message behavior. Review .NET 10 compatibility. |
| Hosted broker configuration | Verify the intended test/hosted endpoint, separate client IDs/certificates, TLS validation, least-privilege publish/subscribe policies, and isolation between environments and other clients using the fixed topic prefixes. |
| `data_folder` input semantics | Agree the DPS-resolvable folder format/access and immutable binding to the verified input manifest, selected recipe/configuration, and single specimen/purchased-run allocation. |
| Run/Cancel responses and idempotency | Define accepted/rejected/cannot-act responses, stable command IDs/correlation, durable deduplication, and behavior when the same `job_id` is resent with different inputs or a cancellation races with success. |
| Actual execution start | Confirm `Started` means execution began; add actual UTC start time, occurrence time, durable confirmation/replay identity, and POMS acknowledgment after commit. |
| Final outcomes | Define `Failed`, `Completed` success semantics, safe failure/cancellation reasons, stable final event ID, UTC outcome/start/stop times or never-started evidence, and output-evidence references. |
| Commit acknowledgment and retry | Define POMS response topic/DTO after durable commit, DPS persistent final queue, bounded retry/backoff across restart, and duplicate/conflicting-event handling. Apply the agreed **30-minute** escalation with continued retries. |
| Authoritative reconciliation | Provide lookup or replay by `job_id` for the existing `ILabAssemblyProvider.FindAsync` requirement, including definitive never-accepted/never-started evidence. Retained-status absence is not sufficient. |
| Status ordering and retention | Agree sequence/occurrence/freshness fields, terminal precedence, retained-message lifecycle/cleanup, and replay behavior after broker/POMS/DPS restarts. Preserve transient POMS progress. |
| Operational timing and escalation | Agree command-receipt/start-confirmation deadlines, reconnect and retry policy, and independent Operations alert channel, recipients, and delivery proof. |

## Execution gap checklist

Status: open as of September 30, 2026. The detailed contract table above defines the required external agreements. The checklist below tracks their closure alongside the POMS implementation and verification still needed. Documentation of a requirement does not close an item; retain the agreed contract/fixture or implementation/verification reference when marking it complete.

### External contract and access

- [ ] **Lifecycle evidence — DPS, with POMS mapping review.** Supply Run/Cancel acceptance, rejection, and cannot-act responses; actual UTC start/stop/outcome times; explicit never-started cancellation evidence; a `Failed` outcome; and stable command/event IDs and correlation. Confirm `Started` means execution began and `Completed` means successful execution.
- [ ] **Recovery — DPS and POMS.** Agree authoritative lookup/replay by `job_id`, durable duplicate-command protection, final-commit acknowledgment topics/DTOs, persistent final-event retries across restart, status ordering/retained replay, and conflict handling. Preserve the agreed **30-minute escalation and continued retries until POMS acknowledges**.
- [ ] **Scientific inputs and outputs — DPS and POMS.** Define how `data_folder` resolves to the verified immutable input manifest, selected processing recipe/configuration, and one specimen/purchased-run allocation; supply verifiable output-manifest/evidence references. Detailed input/output transfer and scientific acceptance remain in the [sequencing assembly plan](SEQUENCING-DATA-ASSEMBLY-PLAN.md).
- [ ] **Broker access — Operations, DPS, and POMS.** Confirm the test/hosted endpoint, TLS validation, certificates/credentials, unique instance client IDs, topic permissions, and environment isolation. Record access-verification evidence without storing secrets in this plan.
- [ ] **Contract verification and operational rules — DPS, POMS, and Operations.** Obtain the actual shared source files and MQTTnet version; confirm encoded status values, contract versioning, message limits, and representative wire examples. Agree command/start deadlines, reconnect/backoff settings, and the independent Operations alert destination, recipients, and delivery proof.

### Completed POMS foundation

- [x] Durable Run/Cancel identities, saved attempts/backoff, confirmation deadlines and persistent escalation without abandonment.
- [x] Normalized lifecycle receipts, commit-before-acknowledgment eligibility, concurrent/restarted receivers, duplicate/conflict/terminal guards and transient progress without durable percentage history.
- [x] POMS-to-UI scoped refresh notifications, current access checks, reconnect/polling recovery, delivery detail and updated Phaeno guide.
- [x] Additive local migration, complete ERD and focused regressions/checks; see the [run record](../testing/runs/2026-09-30-poms-assembly-messaging-foundation.md).

### Remaining POMS implementation

- [ ] **MQTT provider adapter.** Implement the backend connection/configuration, exact agreed DTO/topic translation, validation, subscription restoration, reconnect, and instance coordination through `ILabAssemblyProvider`. Require explicit hosted configuration and keep the worker/provider unavailable for live processing until the contract and access gates are verified.
- [ ] **Live lifecycle delivery and Operations reconciliation.** Bind the completed POMS ledger/receipt foundation to agreed DPS command response, lookup/replay and acknowledgment contracts. Complete authorized Operations reconciliation and independent alert delivery with real evidence. Preserve specimen/purchased-run lineage and transient progress.
- [ ] **Input/output binding.** Map the agreed folder and recipe to saved verified inputs and integrate successful output evidence through the existing assembly/analysis boundary. MQTT completion must not bypass input integrity, scientific QC, or customer-release gates.
- [ ] **Live POMS UI acceptance.** Verify the implemented scoped SignalR refresh and persistent attention behavior with a real authenticated browser, the updated API, hosted proxy/origin configuration, revocation/reconnect and cross-instance status/progress delivery. Preserve authoritative HTTP recovery.
- [ ] **Verification and controlled activation.** Add focused wire, lifecycle, restart, duplicate, conflict, cancellation-race, and authorization coverage and update the living backend/frontend/E2E test plans. When test execution is requested, run the appropriate local checks; then prove the agreed contract with real DPS staging and a representative dataset before separately authorized deployment/activation.

### Work that can proceed locally

The authorized provider-independent lifecycle/recovery foundation and POMS notification/attention behavior are implemented and verified with synthetic fixtures as recorded above. Final wire mappings, input/output semantics, live broker access and real-DPS staging still depend on the external checklist. Keep live processing disabled throughout preparation. Local or simulated proof cannot close real-DPS or scientific acceptance gates.

## Security and operations boundary

Use a private broker connection with TLS and distinct POMS and DPS client identities, preferably separate client certificates/private keys. Broker access rules allow POMS to publish Run/Cancel and consume DPS responses/events, and DPS the inverse; deny anonymous or broad topic access. Store credentials outside source, rotate and revoke them, and monitor rejected connections and topic access. POMS authorizes the human request before dispatch and validates the saved job/provider relationship and event state on receipt. Do not put credentials, signed file URLs, or unnecessary customer data in MQTT messages or operational logs.

If POMS runs more than one API instance, coordinate durable event consumption so one final outcome is committed once, and route the resulting UI notification to clients connected to any instance. The existing saved job and lifecycle records remain the recovery source; an in-memory subscriber or SignalR connection does not replace them.

## Delivery sequence and acceptance

1. Review the supplied shared files and close the gap table above using DPS-approved wire fixtures. Keep the supplied topic/DTO baseline explicit; agree versioned extensions, application response topics, failure evidence, `data_folder`/manifest semantics, and the independent Operations alert channel before live integration. Record the exact MQTTnet dependency scope without changing Portal browser authentication or exposing broker credentials.
2. Adapt the existing `ILabAssemblyProvider` and durable assembly worker to MQTT request/response and inbound events, preserving frozen inputs, one-active-attempt guards, timestamps, and purchased-run lineage. Add only persistence needed for durable inbox/outbox/recovery and update the ERD if the model changes. Keep external execution disabled until the real DPS contract is verified.
3. Add the scoped SignalR Run-nonresponse alert and durable job-detail attention state. Keep the existing authenticated HTTP snapshot as reconnect/fallback evidence. Preserve access checks on connection, subscription, and permission revocation.
4. Verify with DPS fixtures and a staging journey before activation. Update the owning backend/frontend/E2E living test plans and affected Phaeno user guide when behavior is implemented. Database migration, deployment, and production activation follow their separate approval and verification gates. The September 29 controlled hosted rebuild/release is recorded in [operations readiness](../operations-readiness.md); GitHub and Vercel automatic deployment holds remain. That scoped release does not authorize MQTT deployment or activation, and this MQTT plan does not lift those controls.

Acceptance requires proof that:

- A DPS receipt alone never creates a start time. A confirmed start and every committed final disposition retain DPS occurrence time, POMS receipt time, `JobId`, and the exact sample/specimen and purchased-run ancestry.
- Lost Run responses produce the SignalR and persistent UI attention state, with no invented start and no duplicate execution after reconciliation or retry.
- Cancel receipt does not become `Cancelled`; a success/cancel race records the actual DPS terminal outcome.
- Progress responses work without saving a progress series. Missing/late progress never overwrites a terminal outcome.
- POMS acknowledges a final event only after commit. DPS survives restart, retries the same event ID, logs and alerts after 30 minutes, continues retrying, and stops only when POMS acknowledges. A late or repeated event creates one terminal history fact.
- Cross-job, cross-organization, unauthorized-topic, malformed, duplicate, conflicting, and out-of-order messages do not change another job or leak sample data. Broker/API/DPS restart and prolonged POMS outage preserve a recoverable final outcome.
- Wire fixtures prove the exact topic strings, `dto_id` 100/101/102, JSON field names, agreed enum encoding, topic/payload job-ID agreement, and 0–100 progress validation. Unknown/null/empty/oversized messages are safely rejected. The configured folder remains bound to the saved immutable inputs.
- QoS 1 duplicates, retained status on late subscription, subscription restoration with clean sessions, and unique client IDs across instances are verified. Commands are never retained; stale progress/Started replay cannot fabricate timestamps or replace terminal evidence. A missing retained status never permits an unsafe second execution.
- Hosted configuration requires the approved TLS broker/identity and fails closed when missing; it cannot silently use public Mosquitto or a plaintext endpoint. No broker credentials reach the Portal browser.

Success means every actually started job and DPS terminal outcome is attributable to one POMS attempt and its saved specimen lineage, with no false starts or unexplained duplicate computation. Staging transport proof does not establish scientific correctness of assembled outputs or authorize customer release.

## Current implementation boundary

The [provider boundary](../../backend/app/Features/LabOperations/Services/LabAssemblyProvider.cs) still registers an unavailable external provider through [Program.cs](../../backend/app/Program.cs), with processing default off. The Portal API has no MQTT runtime client or broker configuration; the standalone plumbing probe above supplies the isolated connection-test evidence.

- [Delivery recovery](../../backend/app/Features/LabOperations/Services/LabAssemblyDelivery.cs) persists Run/Cancel identities before provider attempts, bounded retry schedules, receipt/start/cancellation deadlines and escalation. Default deadlines are 5 minutes for Run receipt, 10 minutes after receipt for start, 5 minutes for cancellation outcome, and 30 minutes for escalation. Recovery starts at 5 seconds and caps at 60 seconds. Options are under `LabAssembly`; dispatch reconciliation is bounded by `PollSeconds`. A receipt never establishes execution. Unavailable reconciliation before the first publish also ages into attention; queued work does not falsely age into an execution deadline.
- [Normalized receipts](../../backend/app/Features/LabOperations/Services/LabAssemblyReceiptService.cs) validate saved attempt/provider/execution identity, serialize application using advisory locks, deduplicate provider event IDs and retain conflicting evidence without replacing saved outcomes. Acknowledgment eligibility is returned only after the receiver's owned transaction commits. Late nonterminal evidence is ignored; compatible terminal replay is idempotent. Percentages do not enter receipt hashes or persisted payloads. Conflicts pause automatic application pending a future authorized Operations reconciliation workflow.
- [Notification delivery](../../backend/app/Features/LabOperations/Services/LabAssemblyNotifications.cs) reads committed versions for job-scoped authorized connections. Transient progress changes also prompt HTTP refresh without adding durable percentage history. Each instance serves its own connections, with a fresh access check before sends, expiry/revocation closure and bounded delivery time. Reconnect refreshes authoritative HTTP snapshots; existing polling remains available. Transient progress is local to the reporting instance and may be unavailable after restart or on another instance; a live transport must supply current progress to the serving instance before claiming cross-instance progress delivery.
- [Migration](../../backend/app/Migrations/20261001032706_AddAssemblyMessagingRecovery.cs) adds commands/receipts and initializes existing unfinished attempts without inventing receipt/start evidence. The [ERD](../database-erd.md) includes both entities. The job detail displays delivery and recovery status.

Verification evidence is recorded in [the foundation run](../testing/runs/2026-09-30-poms-assembly-messaging-foundation.md). Synthetic normalized messages are not DPS-approved wire fixtures. Shared-source review, real MQTT DTO/enum encoding, response/ack/replay contracts, trusted output-folder/manifest binding, broker/TLS identities, independent Operations alerts, hosted acceptance and scientific acceptance remain open gates. Earlier checklist rows for the complete live integration remain open even where this foundation implements their POMS portion.
