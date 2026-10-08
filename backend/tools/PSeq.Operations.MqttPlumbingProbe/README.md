# MQTT plumbing probe

Runs one synthetic Start publication against the broker hosting the external fake asynchronous job and observes only that job's status topic. It is a standalone .NET 10 tool with MQTTnet pinned to [5.2.0.1603](https://www.nuget.org/packages/MQTTnet/5.2.0.1603). It has no reference to the Portal API or database.

From the repository root:

```powershell
dotnet run --project backend/tools/PSeq.Operations.MqttPlumbingProbe -- --host test.mosquitto.org --port 1883 --wait-seconds 45
```

The user confirmed `test.mosquitto.org:1883` for this plaintext, unauthenticated test. TLS and packet fragmentation are explicitly disabled for this probe connection. The tool uses a fresh synthetic UUID, subscribes before publishing, and sends `{"dto_id":100,"job_id":"<new UUID>","data_folder":"mqtt-plumbing-test"}` to `backend/data_process/command/start_job`. Commands use QoS 1 and are not retained. Incoming `dto_id=102` messages must match `backend/data_process/job/<new UUID>` and the payload job ID.

The tool prints timestamped JSON output, including raw status payloads. It does not assign names to numeric status codes because the supplied guide does not define their numeric encoding. Confirm completion from the external enum/server or an explicit named completion response. A matching response establishes the MQTT round trip; a broker publication acknowledgment alone does not.

One invocation intentionally publishes once; there is no application reconnect/republish loop. MQTT QoS 1 may still cause duplicate delivery. If the command's outcome is uncertain, check the remote server before starting another test. Stop with Ctrl+C or let the observation window finish. `--data-folder` can override the dummy string if the remote stub expects a different sentinel.

Exit codes: `0` = at least one matching remote status received; `2` = observation finished without a matching status; `3` = cancellation/setup timeout; `1` = connection/publication error; `64` = invalid arguments. Exit `0` does not certify fake-job completion or scientific processing.
