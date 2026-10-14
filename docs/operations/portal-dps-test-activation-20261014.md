# Sequenced-sample DPS hosted-test activation — October 14, 2026

Matched API, Portal UI and help source
[`10e0dc9e`](https://github.com/behaack/phaeno-ops-mgmt-system/commit/10e0dc9e5c6b0b739fd7efd3d570451e7194cbad)
is live at [Portal](https://portal.phaenobiotech.com) under the
[preserving activation plan](../plans/PORTAL-DPS-TEST-ACTIVATION-20261014-PLAN.md).
The Owner authorized updating documents, committing/pushing and deploying API/UI.
This activates the existing hosted test environment's simulation, without
commercial or scientific activation.

An authorized laboratory operator can start the remote recipe for a sequenced
sample with a complete current verified FASTQ set and valid sample/run lineage.
The normal workflow uses `pseq_data_assembler` version `0.1.0`; the recipe and
saved attempts are labelled **Simulated**. Managed inputs are verified and staged
to versioned S3, and successful diagnostic outputs are verified and downloadable.
Simulated attempts cannot create or link scientific analyses, enter QC or produce
Customer results. Current remote outputs are placeholders.

## Exact release

[Deploy Portal Green #106](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/38634880473)
succeeds on the full source SHA. The deployed image is
`phaeno-portal-green-api:sha-10e0dc9e5c6b-run-38634880473-1`; its source label and
health match. Vercel Production deployment `dpl_8zVMVFGDMKG3Ui3pNt3VzP9oYbUd`
is ready and promoted without rebuilding on the verified Cadexgenomics Portal
project. Its Git source SHA matches the API, and the canonical alias independently
resolves to this deployment.

The exact committed source archive SHA-256 is
`eeeed6d698ac675eaadd69cb44f75a4557e7b65b09d88c5049490a12d0dea52a`.
The frontend was staged with domains unassigned and built in approximately
31 seconds. The preceding frontend remains available for rollback. Existing
browser pins are retired with version boundary `1792010639159`; protection of
the current build remains. Canonical and previous-pin HTTP both serve the new
entry asset, whose bytes match staging. The actual signed-in Edge page also
loads that entry.

## Connection and preservation

The host-owned `phaeno-dps-mqtt-tunnel.service` uses a protected identity and
pinned EC2 host key outside Git. It binds `127.0.0.1:11883` inside the current
API container's network namespace and forwards over SSH to remote port 1883.
It successfully rebinds after this deployment replaces the API container. No
public MQTT port or API credential mount is introduced. A correlated Describe
request through the replacement container returns the exact available recipe,
PairedEnd support and `assembly_output`/`provenance_report` output roles.

ASP.NET remains Production. Only the owned DPS connection, approved Simulated
recipe, explicit hosted-test simulation permission and assembly worker settings
are activated; concurrency is one. Protected recovery copies of the preceding
runtime files match their original SHA-256 hashes. Comparing all other
`portal.env` keys finds no changed values. S3/ClamAV, authentication, other
workers, persistent mounts and private database networking remain in place.
The compose runtime points at the released image/source.

No persisted model change or migration occurs. The protected run uses migrations
false and Preserve for storage, scanning and bootstrap; identity cutover and
S3 reconfiguration are false. The database remains `phaeno_portal_green`, engine
`180006`, with 25 migrations through
`20261007025545_VersionedVendorLibraryExceptions`. Assembly jobs, sequencing
outputs and FASTQ sets remain `0,0,0`; no old work is dispatched or sample fixture
imported. No records are reset, transformed, reopened or replayed.

Website contacts remain 12 rows with complete-row digest
`615d4900c2dd625b39e16cc5300d4461`; orders remain 6 rows with digest
`6ddf868c9dfd11f82832c22d0aa98a49`. IDs, full contents, dates, language,
completed/unsubscribed history and actors are preserved.

Retained encrypted database recovery and the restore-verified October 9
coordinated snapshot pass checksum inspection. These are historical recovery,
not a fresh restore or current S3 backup. The Owner's hosted-test S3 recovery
deferral remains. The Local-only backup timer stays disabled.

## Verification and remaining acceptance

- Full Release solution build passes with zero warnings/errors. EF comparison
  reports no model changes. TypeScript, scoped lint, shell syntax, whitespace and
  help generation/check pass; the packaged corpus has 56 guides, `a5f6195373c0`.
  Automated test suites remain deferred and were not run.
- API health and proxied health return 200; database ping returns 204. Direct and
  proxied anonymous assembly endpoints return 401. Public Website renders 200.
  Required scanner capacity, clean, EICAR, encrypted, oversize and health smoke
  checks pass in the protected release.
- EC2 independently confirms hosted bucket versioning Enabled. Existing
  bucket-scoped API credentials successfully HEAD an exact existing object
  version. Bucket-administration access remains restricted; no IAM change or
  diagnostic upload is used for this read-only verification.
- The signed-in hosted Data assembly workspace displays **Processing connected**,
  `pseq_data_assembler · 0.1.0` and **Simulated**, with the expected no-input state.
  Screenshot and private release evidence are retained under
  `backend/artifacts/dps-api-ui-release-20261014/`.
- A bounded frontend error query (30 minutes, maximum 25 entries) returns no
  entries; captured browser errors are empty. Current API logs contain no error
  entries. One discovery retry during container replacement resolves; fresh
  correlated discovery and the authenticated connected UI subsequently pass.

There are no hosted complete FASTQ sets. A Portal sample Start/Cancel, retained
attempt/restart, diagnostic download and downstream guard journey therefore
remain unexecuted. The earlier standalone synthetic remote run proves the mock
pipeline exchange and exact-version S3 transfer, without creating Portal records;
it does not substitute for that sample journey or scientific validation.

Deploy Portal Green is verified `disabled_manually` again. Both Portal/Website
configurations retain `git.deploymentEnabled=false`. The Website frontend
is not released. Commercial readiness, current S3 recovery and scientific/physical
acceptance remain separate gates.
