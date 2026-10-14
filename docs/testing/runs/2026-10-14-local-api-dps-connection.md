# Local API DPS connection — October 14, 2026

The Owner requested enabling the API integration and ultimately selected the
local development API. The preceding hosted preflight was read-only. The hosted
API and deployment holds were not changed.

## Configuration and running session

- API: `https://localhost:44399`, with HTTP on `http://localhost:48056`; these
  preserve the existing frontend proxy targets.
- Database: configured local `localhost:5432/phaeno_ops_clean_20260919`.
- DPS: `poms-dps/1.0`, local namespace `phaeno/dps/v1/local`, loopback port 11883
  forwarded over SSH to the EC2 broker's port 1883. EC2 Mosquitto serves both
  1883 and 11883; DPS connects to EC2 `127.0.0.1:11883`.
- Machine-only Development settings enable DPS and the assembly worker, with
  maximum concurrency 1 and the declared `pseq_data_assembler` / `0.1.0`
  recipe. Shared settings remain disabled/unconfigured. The initial observation
  below used `phaeno-local-assembly` / `local-1`; the later checkpoint records
  the Owner's updated recipe.
- File storage remains Local. Existing versioned-S3 requirements continue to
  block actual assembly requests. No file relocation, schema change, migration,
  identity change or scientific release was performed.

The [local launcher](../../../backend/tools/Start-LocalDpsApi.ps1) remains running
with the API and tunnel. It retains an account-restricted temporary identity copy
only for the running session and cleans it up when the API exits. The original
private key is not modified. A protected copy of the preceding Development
configuration is retained for rollback outside source control.

## Observed checks

| Check | Evidence |
| --- | --- |
| API project build | Pass: zero warnings and errors; automated tests not run. |
| Local HTTPS health | Pass: HTTP 200, API envelope reports healthy. The local development certificate was accepted by the diagnostic client; browser certificate trust was not tested. |
| Anonymous assembly list | Pass: HTTP 401. |
| API-to-DPS capability round trip | Pass: API-issued request `fd47b04e-25fc-49ac-8d61-29922ea5e074` received matching DTO 107, correct contract/environment and `available=true`. |
| Synthetic assembly execution | Not performed. No Start or Cancel was published by this API verification. |
| Assembly-job inventory | Zero before and after activation; no assembly attempt was created. |

The passive observer published no requests. It subscribed to Describe and reply
topics, then matched the API's own request to the remote reply at
`2026-10-14T18:33:47Z`. Raw exchange, process state and API output are retained
locally under `backend/artifacts/mqtt-plumbing-evidence/`. The temporary observer
build had a NuGet vulnerability-feed availability warning; its existing pinned
MQTT dependency restored from cache and the observation succeeded. This is not
dependency-audit evidence.

Start/Cancel outcomes, saved lifecycle evidence, progress, restart/ACK recovery,
S3 checksums/versions, output scanning/admission, authenticated UI behavior and
scientific correctness remain unverified. The declared recipe is a test harness,
not a validated scientific assembly pipeline.

## Updated recipe and SSH convention

The Owner supplied the instance scripts and requested `pseq_data_assembler`
version `0.1.0`. The scripts control EC2 instance power/status and open an SSH
tunnel; they do not start or configure the DPS application. No EC2 start/stop
operation was issued. The supplied tunnel convention forwards local 11883 to
remote 1883. Both remote MQTT ports belong to the same Mosquitto process.

The idle duplicate test process was stopped and the existing DPS application
restarted with the requested recipe and broker settings, preserving its command,
working directory and remaining environment. Its ledger contained zero jobs
before restart. A non-secret environment file was saved under the remote
application's private settings directory. The local API was restarted through
the launcher with the matching recipe.

At `2026-10-14T19:23:55Z`, passive observation matched API-issued Describe request
`a2cc9a9e-3342-4e06-ba93-06b62dc214f6` to a capabilities reply advertising
`pseq_data_assembler` version `0.1.0`, PairedEnd input and required roles
`assembly_output,provenance_report`. API health returned HTTP 200; anonymous
assembly access returned 401; local assembly-job count remained zero. The
observer published no requests. The remote recipe's current implementation uses
simulated processing stages and mock output generation.

The Owner subsequently requested a standalone S3 synthetic request. That
[separate run](2026-10-14-synthetic-fastq-s3-dps.md) completed with Succeeded and
verified outputs; it did not use the API to dispatch a Portal assembly job.
