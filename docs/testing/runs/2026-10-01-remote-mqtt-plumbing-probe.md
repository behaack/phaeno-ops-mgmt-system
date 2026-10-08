# Remote MQTT plumbing probe — October 1, 2026

## Scope and result

The owner narrowed this milestone to a synthetic connection test against the remote server's fake asynchronous job and confirmed `test.mosquitto.org:1883`. The standalone [probe](../../../backend/tools/PSeq.Operations.MqttPlumbingProbe/README.md) uses plaintext MQTT 3.1.1, one non-retained QoS 1 Start publication, a fresh synthetic job ID, and dummy `data_folder="mqtt-plumbing-test"`. It does not reference the Portal API/database or activate the assembly worker.

**Latest result: remote MQTT plumbing round trip passed on the owner-authorized retry.** DPS returned six correlated status messages, progressing from 0% to 100% in approximately five seconds. The final observed payload has `status=2`, `progress=100`; retain those raw numeric values until the shared enum is reviewed for the full adapter.

The initial attempt below verified broker connection, subscription, and publication but received no status within 45 seconds. The owner then paused testing and explicitly resumed it with “Let's try again.” The retry sent one fresh dummy job rather than automatically replaying the earlier command.

## Successful retry — 17:49 UTC

| Check | Result |
| --- | --- |
| Standalone probe rebuild | Pass: zero warnings/errors; the Portal solution was not built. |
| Connection/subscription | Pass: MQTT connection `Success`; `GrantedQoS1` on the exact fresh job status topic before publication. |
| Test job ID | `326ed051-46ad-4fc6-aed7-df4b0d3bc23d` |
| Command | One non-retained QoS 1 `dto_id=100` Start with `data_folder=mqtt-plumbing-test` to `backend/data_process/command/start_job`. |
| Broker acknowledgment | `Success` at `2026-10-01T17:49:58.7135867Z`. |
| First remote status | `dto_id=102`, matching job ID, `status=0`, `progress=0` at `2026-10-01T17:49:58.9925709Z`. |
| Intermediate remote statuses | `status=1` at progress 20%, 40%, 60%, and 80%, approximately one second apart. |
| Final observed status | `status=2`, `progress=100` at `2026-10-01T17:50:04.0137846Z`. |
| Observation/shutdown | Six correlated messages in the bounded window; clean disconnect and exit `0`. |

The [retry log](../../../backend/artifacts/mqtt-plumbing-evidence/remote-probe-retry-20261001-174957.jsonl) preserves all raw payloads and receipt times. Every response echoed the synthetic job ID and dummy folder. The observed status sequence is consistent with the guide's Started/Progress/Completed convention; numeric enum definitions remain to be confirmed for semantic mapping in the full provider. This run closes the isolated connection/remote-status milestone and does not activate normal POMS assembly processing.

## Initial-attempt evidence

| Check | Result |
| --- | --- |
| Standalone .NET 10 probe build | Pass: zero warnings/errors on the final build. Only this tool was built. |
| Broker connection | Pass: MQTT connect result `Success` at `2026-10-01T13:59:09.0972715Z`. |
| Job status subscription | Pass: `GrantedQoS1` on `backend/data_process/job/06282cad-4482-4bf5-8fd7-5f54837b388c`, before Start publication. |
| Synthetic Start publication | One application publication to `backend/data_process/command/start_job`; `dto_id=100`, `job_id=06282cad-4482-4bf5-8fd7-5f54837b388c`, `data_folder=mqtt-plumbing-test`, retained false. |
| Broker publication acknowledgment | Pass: `Success` at `2026-10-01T13:59:09.4257033Z`. |
| Correlated DPS status | Not observed: zero matching `dto_id=102` responses during 45 seconds. |
| Remote fake-job start/completion | Unverified; a broker acknowledgment does not establish remote consumption/execution. |
| Probe shutdown | Disconnected; exit code `2` indicates the completed observation window had no matching response. |
| Plan links/whitespace | Plan links resolve; task-scoped `git diff --check` passes. |

The [successful broker exchange log](../../../backend/artifacts/mqtt-plumbing-evidence/remote-probe-attempt3.jsonl) retains the exact timestamps, topic, and dummy payload. Two earlier client connection attempts closed during handshake, **before any Start publication**: [first attempt](../../../backend/artifacts/mqtt-plumbing-evidence/remote-probe.jsonl), [second attempt](../../../backend/artifacts/mqtt-plumbing-evidence/remote-probe-attempt2.jsonl). A separate connection-only diagnostic returned the valid MQTT CONNACK bytes `20 02 00 00` and published no job. The final client explicitly disables TLS and packet fragmentation; it connected after packet fragmentation was disabled. No application republish/reconnect occurred after the acknowledged Start.

## Initial follow-up and remaining integration

After the initial silent attempt, the owner contacted the developer and then authorized the retry. The successful retry verifies the supplied Start/status topics and dummy folder against a responding remote fake-job listener. Full provider enum semantics, durable lifecycle evidence, acknowledgment/replay contracts and scientific input/output binding remain separate integration work in the owning plan. No additional Start publication is needed to establish this plumbing result.

No application test suites, Portal deployment, migration, database mutation, Git staging/commit/push, or production provider activation were performed. Task-owned tool build directories and the isolated package-restore directory are removed after verification; source and evidence logs remain available.
