# Handoff to the MQTT / DPS developer

To: **Chris Yourch**  
Date: October 10, 2026  
Delivery format: Markdown document

Chris,

Please implement the attached **POMS–DPS 1.0 assembly contract**. POMS owns the
specification; the earlier MQTT dummy-job exchange proves connectivity only.
The new operational contract defines exact inputs, outputs and recovery.

The immediate acceptance case is mock order 739XKNR4: **two separate assembly
jobs, one per sample, ten verified gzip FASTQs per job**. Each job has five R1/R2
parts, group 1, one purchased sequencing run and a complete saved vendor result.
Files are already admitted in POMS's private S3 storage. Their exact filenames,
mapping, sizes, read counts and checksums are included as input evidence.

Please deliver:

1. A DPS implementation of the versioned MQTT topics/JSON schemas, Describe
   capabilities, durable Start/Cancel deduplication, command receipts and
   authoritative job lookup.
2. A recipe declaration with its actual key/version, parameter schema, supported
   layouts and required scientific output roles. Example recipe names are
   placeholders; we will not select a recipe that the real service lacks.
3. Verified access to POMS's exact S3 input manifest/object versions and the
   attempt-specific output destination. `data_folder` is an S3 attempt prefix;
   the server reads only files explicitly named in the checksummed manifest.
4. Actual UTC execution start/stop/outcome messages, transient progress, immutable
   checksummed output objects/manifests, and durable final-event delivery until
   POMS acknowledges its committed result.
5. Restart, duplicate-command, cancellation-race, missing/tampered-file and
   30-minute continuing-retry/escalation evidence using the contract checklist.
6. The intended integration broker/environment and service identity/access
   requirements, supplied through the normal secure configuration process.

The POMS provider adapter, dispatch and input/output/lifecycle bindings are now
written against this contract. Builds and validation are deferred at the Owner's
request. Connection and worker settings remain disabled/unconfigured until the
service is ready. Scientific approval and Customer release remain independent
POMS actions; DPS must not publish Customer results itself.

Read [the full specification](../../../plans/POMS-DPS-DEVELOPER-CONTRACT.md) and
[schema package notes](README.md). JSON examples are **non-executable contract
fixtures** with fake S3 locators, unavailable recipe and artificial execution
IDs. Alternative terminal-outcome examples must not be applied sequentially to
the same job. The actual two-sample FASTQs and observed input evidence are
separate acceptance-case assets in the handoff ZIP.

No assembly command was sent while preparing this handoff. Please return the
implemented capabilities and a correlated contract exchange for joint acceptance.
