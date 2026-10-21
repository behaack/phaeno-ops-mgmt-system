# DPS mutual TLS connection — October 20, 2026

## Scope and authorization

The Owner requested a connection test before code changes, then authorized the
TLS implementation on port 18883 with its Windows certificate-loading fix.
Commit, deployment, runtime activation and assembly execution are excluded.
This record distinguishes the isolated live probe from implementation checks.

## Pre-implementation live connection

An account-restricted temporary copy of the supplied SSH identity and
`PSeq-client-01` PFX/CA/password was used. The saved trusted EC2 SSH host key
matched, and the server reported internal hostname `ip-172-31-33-77`.
The local AWS CLI was unavailable; the previously trusted EC2 DNS address was
resolved and verified through that pinned SSH identity. The SSH tunnel listened
only on local `127.0.0.1:18883`, forwarding to remote localhost 18883.

An isolated .NET 10/MQTTnet 5.2.0.1603 client passed:

- PFX private key and current client validity; CN `PSeq-client-01`, expires
  March 3, 2028.
- Server chain against the supplied private CA and hostname localhost with no
  certificate-policy errors; observed CN localhost, expiry January 17, 2029.
- Mutual-TLS MQTT connection without username/password credentials.
- Correlated `poms-dps/1.0`, environment local, Describe/Capabilities response:
  available, idempotent start/query/cancel support, `pseq_data_assembler` 0.1.0.
- A fresh unused synthetic job ID returned authoritative `NotAccepted` to Query.
- Wrong hostname and unrelated CA were rejected with their corresponding TLS
  validation errors. A missing client certificate was also rejected.

The initial `EphemeralKeySet` load failed in Windows Schannel before MQTT
connected. `UserKeySet` without `PersistKeySet` passed with the same PFX and
strict server verification. This is the basis for the platform-specific loader.
See [Microsoft's SslStream guidance](https://learn.microsoft.com/en-us/dotnet/core/extensions/sslstream-troubleshooting#handshake-failed-with-ephemeral-keys).

Raw safe evidence, retained outside tracked source:

- `backend/artifacts/mqtt-plumbing-evidence/dps-mtls-18883-20261020-5119f8d3.jsonl`
- `backend/artifacts/mqtt-plumbing-evidence/dps-mtls-18883-20261020-5119f8d3-ephemeral.jsonl`

No Start/Cancel command or real input was sent, and no Portal API/database was
used. The test-owned tunnel was closed, port 18883 was verified no longer
listening, and temporary credential copies and probe build/source were removed.
No global trust-store changes were made. This proves the tested connection and
Describe/Query permissions, not full ACL policy, scientific output or release.

## Implementation checkpoint

The full solution build passed with zero warnings/errors. The focused Windows
`DpsMqttTlsTests` and `DpsContractTests` run passed **25/25, zero skipped**.
These include real TLS handshakes against generated local identities and a
bounded synthetic MQTT listener, using the production connection-certificate
owner. No external broker or Portal database is used by these regressions.

The initial fixture setup imported generated private keys as non-exportable,
then attempted to export their PFX files. The fixture was corrected to make
only its generated keys exportable; production client keys remain
non-exportable. Constructor-failure cleanup was added and the initial nine
task-owned fixture directories were removed. The focused contract run also
exposed an unchanged mock-provenance fixture with an empty tool list, violating
the existing schema's minimum of one tool. Adding an explicit synthetic tool
declaration corrected that fixture; production scientific validation was not
relaxed. The final combined run passes.

Three synthetic Windows launcher checks passed: password-file mapping,
`MQTT_*` mapping, and child failure cleanup. They verify TLS settings,
preservation of worker/integration flags, restoration of caller environment and
continued availability of an external tunnel. The child `dotnet` command was
intercepted; no real API was started. PowerShell/Bash syntax, both configuration
JSON files and diff whitespace checks pass. No new dependencies/model changes
were introduced.

Raw implementation evidence is retained at:

- `backend/artifacts/dps-mtls-implementation-20261020/dps-mtls-final-20261020.trx`
- `backend/artifacts/dps-mtls-implementation-20261020/launcher-checks.json`

Temporary fixture directories and listeners were cleaned. Existing build output
was retained for development. No real certificate was installed by the source
implementation, no running API/tunnel configuration was changed, and no assembly
was dispatched. Hosted Linux connection verification is recorded below.
Start/Cancel ACLs, actual worker reconnection/receipt recovery and scientific
acceptance remain outstanding.
There was no commit, push or deployment.

## Hosted Linux connection verification

The Owner subsequently requested the remaining hosted Linux connection check,
again excluding commit and deployment. It **passed** using an isolated temporary
container based on the exact running API image
`sha256:5a956aaaf05dea86ae5459fa6be41d10e89c7633c8dcf65619f193eee52eaaf6`,
whose existing deployed source is `390341dd9ba913f6f5a416de827ad4de99c8f380`.
Observed runtime: Ubuntu 24.04.5 LTS, x64, .NET 10.0.12.

The diagnostic compiled the current uncommitted `DpsMqttTls.cs` and
`DpsOptions.cs` directly, with the unchanged storage-options data class and the
existing MQTTnet 5.2.0.1603 assembly. Source/binary SHA-256 values are retained
in the evidence. The container used the API's existing network namespace and
user, a read-only root filesystem/private test mount, no capabilities, and a
temporary `/tmp`. It received no Portal runtime environment, database credentials
or persistent data mounts. Its entry point was the probe, not the API. No image
was built/pulled or application replaced on the host.

A separate task-owned loopback SSH forward reached EC2 localhost 18883 using
the existing protected host identity and pinned host key. The original tunnel
service was not changed. Private certificate inputs were held in a mode-0700
temporary host directory, with mode-0600 files. The Linux loader used
`EphemeralKeySet`; no trust-store installation or Windows loading workaround
was needed on Linux.

Passed against the real broker/DPS:

- Supplied private CA plus hostname localhost validated the same broker
  certificate observed on Windows, with no TLS policy errors.
- Supplied PFX authenticated MQTT without username/password credentials.
- Correlated current-contract Describe returned an available
  `pseq_data_assembler` 0.1.0 with idempotent start/query/cancel support.
- A fresh unused job ID returned `NotAccepted` to authoritative Query.
- Wrong hostname, unrelated CA and missing client identity were rejected.

No Start/Cancel or real-input operation was sent and no Portal database was
used. Before/after inspection confirms the same API container, image, start
time, configuration contents and healthy state, plus identical runtime/settings
file hashes and an active original tunnel service. The initial combined probe
reported a configuration-hash warning because Docker's mount list order varied.
A read-only follow-up reproduced the exact initial hash from the current
Config/HostConfig/Mounts by changing mount enumeration order only; an
order-normalized hash then matched across three inspections. The original raw
warning and its follow-up proof are both retained; no setting was changed to
resolve it.

The task-owned container, SSH process, listener and hosted credential directory
were removed and their absence was independently checked. Local protected
credential copies and temporary probe source/build output were also removed.
Connection source hashes still match the tested files. The running API remains
on its previous connection settings; activating the new source/settings requires
a separately authorized release. Worker execution/recovery, full Start/Cancel
ACLs and scientific acceptance remain separate gates.

Safe raw evidence under `backend/artifacts/dps-mtls-implementation-20261020/`:

- `hosted-linux-18883-20261020-fd8f6d80.jsonl`
- `hosted-linux-preservation-20261020-fd8f6d80.json`
- `hosted-linux-cleanup-20261020-fd8f6d80.json`
- `hosted-linux-final-20261020-fd8f6d80.json`

No commit, push, deployment, service restart, migration or assembly execution
occurred during this verification.
