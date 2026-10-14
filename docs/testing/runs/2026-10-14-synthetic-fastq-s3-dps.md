# Synthetic FASTQ S3 handoff to DPS — October 14, 2026

Result: **Pass for the standalone simulated S3/MQTT flow.** The Owner requested
simulated FASTQ uploads and submission of their path to the remote server. One
Start command was published; DPS accepted, ran its mock recipe, reported 100%
progress and Succeeded, and wrote verified versioned outputs. No Portal assembly
attempt or scientific result was created.

## Dataset and S3 path

```text
s3://phaeno-portal-local-test-767828764389-us-east-2/synthetic/dps/20261014/6fa95cc4-4546-4fd0-8961-944702cd0893/
```

The existing local-test bucket is in `us-east-2`, with versioning Enabled. The
fresh UUID prefix contains `inputs/SYNTHETIC_S1_L001_R1_001.fastq.gz` and its R2
mate, `README-SYNTHETIC.txt`, and `input-manifest.json`. Each FASTQ contains 100
150-base reads with matching pair identifiers and valid quality lengths. Reads
were generated from artificial fragments with overlapping reverse-complement
mates. All scope and file identifiers are fresh synthetic UUIDs. There is no
customer or biological sample data.

Uploads used conditional creation. Every object was downloaded by its exact
version ID and compared byte for byte. Independent rereads verified complete
SHA-256 hashes, gzip decoding, FASTQ structure, unique/matching pair identifiers,
read count and read length. Existing objects and bucket configuration were not
changed. The input-manifest version is `.kqzOOfD5aHsP12gejtywOzW4RiBiPw7`,
2,968 bytes, SHA-256
`ef7fbe3776ee2a18f6a88838eb91a92b92f13c1c63b90c0d7043d4f002b945b9`.

## Remote execution evidence

- Recipe: `pseq_data_assembler`, version `0.1.0`, parameters `{}`.
- Job: `6fa95cc4-4546-4fd0-8961-944702cd0893`.
- Start command: `6998b7c8-413d-4517-8925-5317edd88b2e`.
- Accepted business receipt: `9f1e38cd-0d6a-49fa-a770-816ccc4c80c2`.
- Actual mock execution start: `2026-10-14T19:36:36Z`.
- Stop/Succeeded: `2026-10-14T19:39:08Z`, approximately 152 seconds.
- Succeeded event: `bf460b47-086b-451d-a080-ebdaf1fc739c`, sequence 523.
- Observed progress: 520 events, ending at 100%.
- Authoritative Query: `0660836a-2d16-44f5-92b4-90dec0f36835`, Found,
  replaying the same Succeeded event and original accepted receipt.

The standalone receiver subscribed before publishing one non-retained QoS 1
Start through `127.0.0.1:11883`. The SSH tunnel forwards to EC2 port 1883;
the remote DPS uses EC2 `127.0.0.1:11883`, served by the same Mosquitto broker.
No automatic Start retry or second job was issued.

The receiver saved and flushed each lifecycle event and a receipt UUID to a
separate local test journal before sending a simulated committed ACK. Progress
received a received ACK. These acknowledgments simulate POMS persistence; they
do **not** certify a Portal database transaction or scientific admission. A
remote ledger reread confirmed Succeeded and `final_event_committed=true`, with
523 events, retiring the synthetic final-event retry obligation.

## Verified outputs and boundary

| Object | Exact version | Size |
| --- | --- | --- |
| `outputs/assembly-output.fasta` | `pTQIRQ_1QujujUgMtn.7ybRI1w4XzLAF` | 56 bytes |
| `outputs/provenance-report.json` | `vyddaCR4LRQOmF10sDxEOV4mY.aCI1R.` | 280 bytes |
| `output-manifest.json` | `Xhivd5RZuUjzCzbPu7yShs5gwG0vvEqc` | 2,584 bytes |

Each exact-version output passed full-byte SHA-256 and size verification. The
output manifest matches the job, synthetic scope, recipe, input-manifest hash,
execution times, required roles and authorized output prefix. Its SHA-256 is
`34ebaed766e12664416df353a1f64bdf549c9dee1a06388be3bd71905ae5f28b`.

The server's `MarksRecipe` simulates cluster, k-mer, inchworm and BLAST stages.
The FASTA contains one placeholder sequence `N`; the provenance report is a
mock summary. The output manifest omits the current contract's required
reference-data/no-reference provenance declarations. Scientific validity and
normal Portal output admission are therefore not established by this run.

The local API remains healthy and its database still contains zero assembly
jobs. Its file provider remains Local, so normal API assembly dispatch remains
blocked by the existing versioned-S3 requirement. No hosted runtime, Portal
database, storage provider or release hold changed. No deployment, staging,
commit or push was performed.
The diagnostic receiver compiled with zero warnings/errors using the existing
pinned MQTT library; no automated test suite was run.

Exact manifests, Start/receipt/events/Query, the durable receiver journal,
downloaded outputs and independent verification are retained locally under
`backend/artifacts/synthetic-s3-20261014-6fa95cc4/`. S3 objects are retained for
inspection. Temporary build and helper files were removed after verification;
the existing local API and SSH tunnel remain running.
