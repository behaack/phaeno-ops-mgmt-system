# POMS–DPS MQTT messaging plan

Status: planning only, September 24, 2026. This plan specifies server-to-server messages between this project's POMS API and the Data Pipeline Server (DPS). It does not implement the connection, change the database, activate processing, or deploy either server. It supersedes the external-service SignalR transport proposed in the [sequencing assembly plan](SEQUENCING-DATA-ASSEMBLY-PLAN.md); SignalR is reserved for POMS-to-UI notifications.

## Product outcome and scope

An authorized POMS user can request or cancel one data-assembly job. DPS reports actual execution progress and a final outcome. POMS records a confirmed start and final disposition against the existing assembly attempt, so an investigator can follow the job to its exact Lab Job, sample/specimen, purchased sequencing run, and input lineage. An unanswered command or lost connection must remain visibly uncertain rather than inventing a start, failure, cancellation, or success.

This scope covers only POMS API ↔ MQTT broker ↔ DPS. It does not define laboratory equipment messaging, the data-to-assemble schema, S3 input/output transfer, scientific QC, result release, or a general event bus. Existing assembly, traceability, authorization, and customer-release rules remain authoritative.

The user roles are the authorized POMS requester, authorized laboratory viewers, and an Operations Administrator investigating delivery failures. DPS is the execution authority for actual start and final outcome; POMS is the system of record for the job's saved lifecycle and sample/specimen linkage.

## Identity and message contract

`JobId` means the immutable POMS assembly-attempt ID (`LabAssemblyJob.Id`), not the commercial Job ID or the specimen ID. POMS already links that attempt to the Lab work order, specimen, purchased sequencing-run allocation, and frozen inputs. DPS must echo the same `JobId` in every response and event. POMS resolves and verifies that saved relationship before applying a DPS message; neither a topic name nor a DPS-supplied sample label establishes ownership.

Each message or response needs a contract version, unique message/command ID, `JobId`, occurrence time in UTC, and correlation to the originating command where applicable. These are delivery and evidence fields, not additional business message types. Agree exact topic names, schemas, status codes, progress values, permitted sizes, and data classification with the DPS developer before implementation. Keep customer/sample-identifying content and secrets out of topic names.

| Direction | Business message | Required behavior |
| --- | --- | --- |
| POMS → DPS | **Run** (`JobId`, **Data To Assemble: TBD**) | POMS commits the authorized request and frozen input identity before dispatch. DPS responds that it received or rejected the command. A receipt means only that DPS took responsibility for the command. DPS separately confirms when execution actually starts, with its actual `startedAtUtc`, through the correlated Run response contract. Repeated Run commands for the same attempt cannot create another execution. |
| POMS → DPS | **Cancel** (`JobId`) | DPS responds that it received, rejected, or could not act on the request. Receipt of Cancel does not mean the job was cancelled. DPS later reports the actual terminal outcome, including a possible success/cancel race. Existing POMS permission and reason requirements still apply before dispatch. |
| DPS → POMS | **Progress** (`JobId`, progress details TBD) | POMS validates the job and receipt identity, responds, and makes the latest fresh progress available to authorized users. Progress is transient: no percentage history or per-update database/audit row. A missed update may be replaced by a newer one. Progress cannot change a terminal outcome. |
| DPS → POMS | **Final disposition** (`JobId`, `Cancelled` / `Failed` / `Succeeded`) | Include a stable event ID, DPS occurrence time, actual start/stop times when execution occurred, and a safe reason/reference when applicable. POMS validates and durably commits the outcome and traceability event before returning an application-level acknowledgment. Exact duplicate events receive the same acknowledgment without creating duplicate history. |

DPS may acknowledge Run as received before it can confirm actual start. The correlated Run response therefore has two distinct facts: command receipt and actual-start confirmation. DPS durably retains and retries the actual-start confirmation until POMS acknowledges it after commit. POMS records `startedAtUtc` only after that confirmation; if it is delayed or lost, the final disposition must also carry the actual start time for recovery. A job cancelled before execution has no fabricated start time. Preserve DPS occurrence time separately from POMS receipt time. Map DPS `Cancelled` to the existing POMS `Terminated` or `CancelledBeforeStart` state according to confirmed execution evidence; do not relabel a merely requested cancellation as final.

## Receipts, uncertainty, and recovery

MQTT broker delivery acknowledgment proves broker-level transfer, not that the other application accepted or recorded a business message. Every Run, Cancel, Progress, and Final disposition therefore has a correlated application response. Run/Cancel acceptance is recorded only after DPS has durably accepted responsibility. A Progress response confirms receipt/validation and latest-value handling, not durable history. POMS acknowledges a Final disposition only after its database transaction commits. Definite validation failures return a negative response with a safe reason; transient failures remain eligible for retry.

If Run receives no DPS application receipt within the agreed timeout, POMS keeps the attempt in an **unconfirmed dispatch** attention state. If DPS acknowledges receipt but does not confirm actual start by the agreed start-confirmation deadline, POMS retains the accepted state with no start time and raises the same attention condition. In either case POMS sends a SignalR alert to the authorized initiating UI client, with a persistent job-detail alert for reload/disconnect. The alert explains the known receipt state and that processing may or may not have begun, and links to the job. POMS reconciles by the same `JobId` before any resend; an ambiguous timeout must not launch a second computation. A late DPS response or start confirmation updates the saved state and clears or revises the alert.

If Cancel receives no response, POMS retains the cancellation request and marks its outcome uncertain. It must not report `Cancelled` until DPS confirms the terminal outcome. Reconciliation covers lost responses, API/DPS restarts, duplicate commands, and outcomes that arrive out of order. The DPS contract must provide an authoritative lookup or replay by `JobId`; a missing immediate response is not proof that a job never started.

For Final disposition, DPS saves the outgoing event in a durable local queue before publishing. Until POMS acknowledges a committed outcome, DPS retries the same event ID with bounded backoff across broker disconnections and DPS restarts. At **30 minutes without POMS acknowledgment**, DPS records an escalation log entry with the event ID, `JobId`, final outcome, DPS outcome time, escalation time, and delivery-failure reason, excluding secrets and raw scientific data. DPS sends an Operations Administrator alert through an independently available monitoring/notification path, because POMS may be unavailable. Alert channel, recipients, and delivery proof remain to be agreed. DPS continues retrying after the alert until POMS acknowledges; the log or alert never replaces delivery of the authoritative outcome. Repeat failures create one active alert per event, with follow-up if the condition persists.

POMS retains the received final event ID and committed result so replay is idempotent. A conflicting event with the same ID, or incompatible terminal outcomes with different IDs, is held for Operations reconciliation without silently changing the saved outcome. POMS startup/reconnect also reconciles active or uncertain attempts with DPS. A SignalR notification is a prompt to refresh the POMS record, not the record itself.

## Security and operations boundary

Use a private broker connection with TLS and distinct POMS and DPS client identities, preferably separate client certificates/private keys. Broker access rules allow POMS to publish Run/Cancel and consume DPS responses/events, and DPS the inverse; deny anonymous or broad topic access. Store credentials outside source, rotate and revoke them, and monitor rejected connections and topic access. POMS authorizes the human request before dispatch and validates the saved job/provider relationship and event state on receipt. Do not put credentials, signed file URLs, or unnecessary customer data in MQTT messages or operational logs.

If POMS runs more than one API instance, coordinate durable event consumption so one final outcome is committed once, and route the resulting UI notification to clients connected to any instance. The existing saved job and lifecycle records remain the recovery source; an in-memory subscriber or SignalR connection does not replace them.

## Delivery sequence and acceptance

1. Agree the versioned DPS contract: broker/topic permissions, message/response examples, actual-start confirmation, final-outcome evidence, idempotent Run/Cancel, authoritative lookup, progress meaning, timeout/backoff, and **Data To Assemble**. Agree the independent Operations alert channel and recipients.
2. Adapt the existing `ILabAssemblyProvider` and durable assembly worker to MQTT request/response and inbound events, preserving frozen inputs, one-active-attempt guards, timestamps, and purchased-run lineage. Add only persistence needed for durable inbox/outbox/recovery and update the ERD if the model changes. Keep external execution disabled until the real DPS contract is verified.
3. Add the scoped SignalR Run-nonresponse alert and durable job-detail attention state. Keep the existing authenticated HTTP snapshot as reconnect/fallback evidence. Preserve access checks on connection, subscription, and permission revocation.
4. Verify with DPS fixtures and a staging journey before activation. Update the owning backend/frontend/E2E living test plans and affected Phaeno user guide when behavior is implemented. Database migration, deployment, and production activation follow their separate approval and verification gates.

Acceptance requires proof that:

- A DPS receipt alone never creates a start time. A confirmed start and every committed final disposition retain DPS occurrence time, POMS receipt time, `JobId`, and the exact sample/specimen and purchased-run ancestry.
- Lost Run responses produce the SignalR and persistent UI attention state, with no invented start and no duplicate execution after reconciliation or retry.
- Cancel receipt does not become `Cancelled`; a success/cancel race records the actual DPS terminal outcome.
- Progress responses work without saving a progress series. Missing/late progress never overwrites a terminal outcome.
- POMS acknowledges a final event only after commit. DPS survives restart, retries the same event ID, logs and alerts after 30 minutes, continues retrying, and stops only when POMS acknowledges. A late or repeated event creates one terminal history fact.
- Cross-job, cross-organization, unauthorized-topic, malformed, duplicate, conflicting, and out-of-order messages do not change another job or leak sample data. Broker/API/DPS restart and prolonged POMS outage preserve a recoverable final outcome.

Success means every actually started job and DPS terminal outcome is attributable to one POMS attempt and its saved specimen lineage, with no false starts or unexplained duplicate computation. Staging transport proof does not establish scientific correctness of assembled outputs or authorize customer release.
