# Production storage cutover to S3

Status: planned production target, explicitly confirmed September 20, 2026. No bucket, credentials, migration, lifecycle policy or production provider change is authorized or performed by this gap-closure work.

## Application contract

Scientific receipts retain specimen, file name, SHA-256 and byte count. Existing logical keys and receipt IDs must survive the move. The configured `IFileStorage` provider handles both final files and resumable upload chunks; no scientific controller assumes a local path. S3 writes use unique keys with `IfNoneMatch="*"`. Full-file scanning and verified reads operate through the provider, not public links. An S3 ETag is not substituted for the scientific receipt SHA-256.

Current configuration fields are `FileStorage:Provider=S3`, `FileStorage:S3:BucketName`, `Region` and `KeyPrefix`. `ServiceUrl`/`ForcePathStyle` support compatible test endpoints; actual AWS production should use its region endpoint. Use the runtime credential chain and private bucket access; credentials never belong in source. The application limit remains the configured complete-file scanner limit (100 MiB by default); moving bytes to S3 does not raise it.

## Required activation sequence

1. Prepare the private bucket, encryption, least-privilege runtime access and separate backup/recovery access. Set versioning and recovery retention to protect scientific evidence. Review deletion protection separately for permanent internal evidence and expiring customer outputs; a blanket lifecycle expiry on the shared prefix is unsafe.
2. Inventory each database-referenced object, including managed scientific receipts, staged upload portions, result artifacts, invoices and provisioning files. Preserve logical keys under the configured prefix and verify full size/SHA-256 after copying. Quiesce writes for the final cutover or implement and verify a captured change log; a one-time copy while writes continue is insufficient.
3. Establish S3-aware recovery using a database snapshot plus the exact referenced object versions, stored independently of the live bucket. Preserve the database migration and application release identities with the recovery receipt. The current Hetzner Local-volume backup helper deliberately refuses an S3 runtime: do not disable that check or call its Local-volume proof an S3 backup.
4. Restore to an isolated database and bucket/prefix. Verify specimen-to-result lineage, scientific and supporting documents, result downloads, checksums, interrupted-upload recovery and protected-evidence retention. Exercise lost/missing/corrupted objects and scanner failure. Object storage availability alone is not recovery verification.
5. Obtain approval for the actual infrastructure/provider change, complete the final verified copy, switch the runtime, and perform scoped authenticated uploads/downloads. Retain the verified Local recovery point and a defined rollback/write-reconciliation procedure until acceptance.

## Evidence boundary

The September 20 software tests exercise a simulated S3 client with 50 MiB immutable writes and exact-byte reads, plus a 50 MiB resumable controller journey through the storage abstraction. They do not certify actual AWS permissions, bucket versioning, lifecycle behavior, throughput, provider availability or disaster recovery. Those are go-live checks against the production bucket.
