# S3 recovery preparation

Prepared October 11, 2026. Code preparation only; no production activation,
timer installation, credential grant, capture or restore is authorized here.
The Owner's hosted-test backup deferral and deployment hold remain in force.

October 12 continuation: the Owner accepted at most one hour of data loss and
restoration within four hours and requested remaining closure work. The
[commercial acceptance packet](COMMERCIAL-ACCEPTANCE-20261012.md) records the
current scheduling/monitoring mismatch, concrete drill criteria and required
target/responders. Twenty-nine synthetic archive/encryption/restart checks and
seven current-tool S3 integrity checks pass locally. No live S3 capture, recovery,
schedule installation, alert delivery or responder acceptance is claimed.

The repository now contains `backend/tools/PSeq.Operations.S3Recovery`. It uses
the existing AWS SDK and current storage locators; no new application dependency
or schema is introduced. `dry-run` parses the current private reference manifest
without credential discovery or network calls. `capture` reads exact object
versions on an approved Unix backup host, verifies full length/SHA-256, preserves
original bucket/key/version/ETag evidence, and writes private content-addressed
blobs plus a private mapping manifest. `verify` rechecks a captured directory
without S3 or database writes. None of these modes delete or overwrite sources.

## Qualified production run

1. Operations and the Owner approve recovery objectives, the exact target,
   maintenance/deletion lease, private backup destination and least-privilege
   read credentials. Keep secrets out of arguments, receipts and chat.
2. Use the coordinated database snapshot/restoration process in the existing
   backup runbook. Produce its private current-model file-reference TSV only
   from the isolated restored database. The lease must protect referenced files
   through capture; refuse an expired lease or incomplete reference inventory.
3. Run the recovery tool against that TSV. Managed S3 objects are pinned to the
   current version before reading and checked against the snapshot receipt.
   Original objects retain their already-pinned exact versions and ETags.
   Missing/unversioned/mismatched required objects fail the capture. Explicitly
   retired references alone permit absence; a required reference always wins.
4. Include the captured directory and private mapping with the same database
   dump in the existing encrypted envelope. Export and verify it off-server;
   a plaintext capture or console success is not disaster-recovery acceptance.
5. Rehearse database plus object restoration into an isolated destination.
   Preserve immutable original-source provenance: destination version IDs are
   not assumed identical to producer version IDs. Retain the source mapping and
   explicitly review any physical locator rebinding before applying it; no
   automatic database rewrite or source-bucket overwrite is supplied.
6. Verify application file/report access, scientific/Finance lineage, checksum,
   tenant authorization and the approved time/data-loss objectives. Processing
   provider access to restored objects is a separate contract/acceptance gate.
7. Only after separately authorized installation, observe a genuine scheduled
   successful encrypted off-server backup, failure alert, recovery drill and
   accepted responder/escalation ownership. Keep old recovery copies.

This preparation closes neither live S3 restoration nor scheduling/monitoring
acceptance. Those gates remain open in System gap closure GAP-08 and the S3
hosted cutover plan until representative evidence and release authorization exist.
