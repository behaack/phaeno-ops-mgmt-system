# S3 storage and scientific file access

Status: hosted-test and local S3 active October 9, 2026. Private isolated test destinations
and scoped credentials are configured, and live storage/ClamAV verification passes.
The local four-file address conversion and API/frontend restart are complete.
Actual configured storage readback verifies all retained bytes; scientific receipt
fields and Local originals are preserved. No external scientific originals have been
admitted. S3 backup/restore remains a production requirement, deferred for testing.

## Implementation checkpoint

The Owner additionally requested streaming uploads, ZIP bundle upload/extraction
after completed S3 upload, and visible upload progress. The existing resumable
four-MiB browser/API transfers remain. S3 writes now stream large inputs through
bounded eight-MiB multipart buffers, computing full-file SHA-256 without an S3
writer disk spool; small objects use a bounded in-memory write. Abort failed
multipart sessions, retain immutable completion conditions, and distinguish S3
composite checksums from independently measured full-file hashes.

The current batch ZIP flow accepts a ZIP created on the user's computer. It
completes provider storage before readback, scanning and ZIP inspection; reviewed
entries are then extracted, validated and stored under their scientific scopes.
S3 itself does not unzip data. ZIP creation in the browser and AWS extraction
compute are not implemented by this change. Verification/ZIP random-access work
may still use private temporary files, independently of streamed S3 writes.

Per-file, scientific-evidence and bundle controls display transferred bytes and
percentages, then indeterminate verification/scanning and explicit extraction
counts. Transfer is capped below 100 while awaiting acknowledgement; completed
admission or ZIP inspection is reported separately. Progress is transient and
does not create scientific evidence or a percentage-history audit.

- Scoped S3 writes derive Customer/Job/sample/library/capture ownership from
  authorized existing records. The immutable FASTQ set ID identifies the
  sequencing-dataset capture, so repeated data/corrections within the same
  library, submission and purchased allocation cannot collide. Actual provider
  run references/times remain separate scientific evidence.
- S3 originals are listed only beneath that record-derived scope, admitted
  in place after complete SHA-256/scan/FASTQ verification, and protected from
  Portal deletion. Exact non-null object version IDs and ETag read
  conditions are frozen in the original-object locator. Receipt and set locks
  serialize repeated admissions. Existing scientific approval/release stays
  authoritative.
- The existing receipt `StorageKey` holds a typed `s3-managed/<area>/<object-key>`
  or `s3-original/<encoded-locator>` address. Storage-area checks remain enforced
  without adding an area above Customer in physical S3. The current 1000-character
  receipt bound is enforced without truncation. No schema or EF migration changed.
- Assembly requests freeze a unique bucket/region/output prefix per attempt.
  A single capture uses its sequencing branch; combined permitted captures use
  a sample-level assembly branch and keep all exact inputs in the frozen manifest.
  The actual DPS provider remains unconfigured; no processing adapter or output
  manifest format was fabricated by this work.
- Shared Actions controls now offer configured original S3 selection alongside
  computer upload. Source-folder guidance supports producer uploads before the
  first file exists. Phaeno help and living test plans are updated.
- The local launcher prepares process-only AWS settings without saving credentials
  and refuses activation without the file-preservation checkpoint. Hetzner S3
  configuration supports an explicit empty prefix for customer-first bucket roots.

## Read-only preflight evidence

The configured loopback development database is `phaeno_ops_recovery_20261008`,
with Provider Local and root
`C:\Users\bhaac\AppData\Local\PhaenoPortal\managed-files\Development`.
It has four scientific file receipts and four FASTQ upload records. Scientific
upload sessions, FASTQ archives, managed provisioning/operational files, invoices
and result artifacts counted zero in this bounded inventory. This current
configuration supersedes earlier notes about the default directory being absent;
the restricted-process directory check was not authoritative.

Copy and verify the four retained files and convert their provider locators once
before activation. Preserve their receipt IDs, sample/library/run binding,
checksums, byte counts and the prior Local store, with an exact rollback mapping.
Reset/deletion or reseeding would discard these records and requires explicit
destructive authorization; neither occurred. The owner was warned during this
checkpoint. No live database rows or file bytes were changed.

Read-only AWS checks confirm `phaeno-dev-01` in `us-east-2`, AES256 server-side
encryption and all four S3 Public Access Block settings enabled. Versioning is
not enabled and no lifecycle configuration is present. The bucket already has
objects; the Owner's "no files yet" concerns scientific source files, not an
empty AWS bucket. Existing unrelated objects were not read, reorganized or changed.
Original-preservation controls/versioning and least-privilege hosted credentials
remain activation gates, as does S3-aware coordinated backup/restore. No bucket
policy, versioning, IAM, server configuration or deployment was changed.

## Owner decisions

- October 9 testing policy update: S3-aware coordinated backup/restore is a
  production launch requirement, not a local/hosted-test activation gate. Retain
  existing files/recovery copies and verify conversion integrity; original-version
  protection, scoped access and application admission checks still apply. The
  Local-only backup timer must be explicitly deferred when testing uses S3.

- Support both Portal uploads stored in S3 and scientific files already in S3.
- Apply the S3 hierarchy **Customer -> Job -> Sample -> Library -> Sequencing
  run**. The Owner corrected the initial word "Subject" to "Sample"; reuse
  existing sample, library and sequencing-run identities, without a new subject
  model.
- Apply this hierarchy to S3. It describes object organization, not new Portal
  record types. Both local and hosted integration remain in scope.
- Access existing scientific S3 objects **in place**. Do not import a separate
  managed copy or silently move, rename or delete a source object.
- The Owner confirmed that there are **no existing scientific S3 files yet**.
  Establish the hierarchy for new files; there is no historical scientific S3
  dataset to import, reorganize or migrate. Original-object access is for future
  producer uploads.
- The Owner requires repeated work at every scientific stage: one sample can
  produce multiple independently prepared libraries, one library can be
  sequenced multiple times, and one sequencing dataset can be assembled multiple
  times. Preserve the separate identities and evidence for each execution.

No historical source folder is needed to design this integration. Use
`phaeno-dev-01` as the candidate development bucket and prepare an independently
configured hosted destination; do not assume the development bucket is approved
for hosted data or repurpose `elasticblast-phaeno`. The supplied AWS credentials
successfully authenticated and listed `elasticblast-phaeno` and `phaeno-dev-01`;
that evidence establishes neither object permissions nor an approved source or
production destination. The configured profile region is `us-east-2`; verify
each target bucket's actual region before activation.

The absence of external scientific S3 files does not establish that Portal-managed
files on the current local/hosted filesystem are absent. Inventory those stores
and their database references independently before selecting S3 for uploads.

## Users, problem and workflow

Phaeno Operators and Supervisors need to register scientific files against
existing work without downloading them to a workstation and uploading them
again. Readers and Scientific Reviewers retain their existing scoped access.
Customers and Partners receive files only through their existing approved
release workflows, never through raw bucket browsing.

1. An authorized operator opens the owning Job/sample or vendor-results intake.
2. The operator chooses an administratively configured S3 source and eligible
   objects, then explicitly reviews sample/library/purchased-run attribution.
3. The API verifies source identity, exact size and full-file SHA-256, performs
   malware scanning, and applies the current scientific-file or FASTQ policy.
4. Save the verified source locator and custody evidence. A failed or incomplete
   verification does not admit a scientific file or successful vendor result.
5. Subsequent processing and downloads resolve the original object and recheck
   its recorded identity and integrity. Unavailable or changed evidence blocks
   use and remains visible for investigation.

Discovery does not imply producer completion, correct mapping, scientific
approval, processing success or permission to release a Customer result.
Automatic provider notifications and real DPS execution remain separately
owned integrations; a bucket connection does not enable them.

## Object organization and ownership

For new sample-bound scientific uploads, use the following relative structure
inside the environment's selected bucket:

```text
<customer>/<job>/<sample>/<library>/<sequencing-run>/<file-purpose>/<immutable-file>
```

Derive identifiers from authorized existing records on the backend. Freeze key
identity, avoid collisions across retries/versions, and keep original display
names as metadata. Do not infer ownership from a filename, path or caller's
chosen Customer. Separate multiple libraries and purchased sequencing runs;
retain corrections and processing attempts independently below their owning
run. Do not use mutable display names or direct personal identifiers as keys.

Place files only beneath ownership that actually exists. Customer-wide,
Job-wide, sample-wide and multi-library batch documents need an explicit
placement inventory before implementation; never invent a library/run or
assign a shared file to one sample merely to satisfy a folder template.

Give future producers the agreed hierarchy and explicit current record
identifiers before their first upload. Register their original objects in place
only after the existing completion, scope and verification requirements pass.
There are no existing scientific objects requiring path reconciliation. Any
later physical reorganization requires an explicit decision; an in-place
connection grants no authority to rename or delete original objects.

### Repeated preparations, sequencing and assembly

The proposed storage layout supports the Owner's repetition requirements when
each library and actual sequencing event has a distinct immutable identity.
Recommend separate `raw/` and `assemblies/<assembly-attempt-id>/` branches below
each sequencing event. An assembly attempt owns its output, parameters,
software/reference versions, input manifest, diagnostic files and QC evidence;
it reads the original raw objects without making a new managed input copy.

Use a new library identity for a new preparation from the same sample. Reusing an
existing library for sequencing retains its identity and creates a separate
sequencing-event identity. The purchased sample-run allocation number is a
commercial attribution, not by itself a unique physical sequencing-event ID.
Corrections to an event's files retain their predecessor/version identity;
repeated acquisition must not overwrite the original event's files.

Each genuine assembly execution, including a rerun with changed parameters,
receives its own attempt ID and frozen input manifest. Retain failed attempts
and their available evidence. A transport retry of the same command does not
create another scientific attempt. Existing assembly jobs already distinguish
attempt IDs, predecessor links and frozen inputs/recipes.

The folder tree is an organization aid; persisted input/output lineage remains
authoritative. If an assembly consumes multiple sequencing datasets, its input
manifest must identify all of them. Choose its owning placement from that actual
scope instead of falsely assigning it to a single parent or duplicating its
outputs. Current product rules require one purchased sample-run per analysis;
combining different purchased runs would require a separate product decision.

## Scientific custody and retention

Persist the source configuration identity, exact bucket/key/version, original
name, byte length, independently computed SHA-256, scan/validation evidence,
verification time, actor and current sample/library/run bindings. Preserve
producer completion evidence when present without inventing timestamps.
Treat S3 ETags as object identity checks, not full-file SHA-256 fingerprints.
Require an exact non-null object version for original admission, plus conditional
reads and independently verified full-file SHA-256. Unversioned originals are
rejected with an Operations setup explanation; an ETag alone cannot preserve a
historical original. Bucket versioning/preservation preparation remains an
explicit cloud activation gate, without changing unrelated bucket objects.

The existing internal-evidence policy retains evidence indefinitely. In-place
access makes original-object preservation an operational requirement: inspect
source versioning, deletion/lifecycle rules and owner responsibilities before
admitting files. A recorded locator is not proof that bytes remain retained.
Keep original objects outside Portal staging and released-byte cleanup; deleting
a customer download cannot delete its source scientific evidence.

Reuse FASTQ validation, paired-read completeness, explicit batch mapping,
configured scanner limits and result-draft concurrency. Reuse the existing
scientific approval, QC and release boundaries. Do not accept arbitrary S3 URLs,
public URLs, source credentials, bucket/region/service overrides or keys outside
the authorized record-derived directory from browser callers.
Stream through backend-authorized access; keep credentials outside source and
browser bundles. Initially originals and uploads use the environment's
server-configured bucket; source reads are restricted to authorized scientific
directories. Additional source buckets and independent source credentials
require a separately scoped extension. Provision permissions and preservation
controls appropriate to originals before hosted activation.

## Current implementation and required changes

- `IFileStorage` already supports Local, Disabled and S3. Before this change S3 keys were
  `{prefix}/{area}/{yyyy/MM}/{uuid}.{extension}`. Setting `KeyPrefix` alone cannot
  implement the requested Customer/Job/Sample/Library/Run hierarchy: the existing
  storage write contract received no owning record context. The implemented
  scoped contract now supplies that context and returns typed provider locators;
  Local retains its current layout.
- Scientific receipts and FASTQ intake now admit original objects through a
  versioned locator and scoped verification/in-place reads. Declared locations
  are not admitted receipts. Only the configured environment bucket is supported
  by this implementation; no arbitrary external bucket adapter was introduced.
- The Hetzner S3 installer and release preflight already support protected S3
  runtime settings. Existing coordinated backup explicitly requires Local
  storage, so S3-aware coordinated recovery is necessary before hosted cutover.
- Older architecture/Hetzner prose describes hosted storage as Disabled; the
  later File Management and operations-readiness records describe persistent
  Local activation. Inspect the live target before relying on either history.
- The default development managed-files directory was absent during discovery.
  This is not evidence that the running app has no files: determine effective
  configuration and database references before changing providers.

Use the existing AWS SDK dependency and backend authorization. Add no dependency
or authentication change merely to connect S3. Record the exact persisted-model
design against the confirmed empty-source starting point; generate EF migrations and update the complete
ERD together if that design changes persistence.

## Implementation slices and activation gates

1. Inspect the approved source/destination, effective local settings, permissions,
   original-object protection and current referenced bytes. Resolve shared-file
   ownership and retention implications without changing scientific records.
2. Implement scoped S3 upload keys and original-object admission/access, durable
   source provenance, retry/concurrency behavior and bounded verification.
3. Add source selection/mapping to the existing view-first Job/sample and
   vendor-results workflows. Follow shared Actions/form/accessibility patterns;
   update implemented Phaeno help and living test plans in the same change.
4. Verify local S3 access using dedicated synthetic objects and scoped records.
   Use independent local/hosted datasets and credentials. Do not repoint the
   running development app until referenced files have a migration decision.
5. Prepare a separate hosted cutover plan naming the production-hosted test
   database, preserved data, restore-verified database/files, S3 recovery,
   destination preparation, cutover, rollback and acceptance checks. Obtain
   explicit release authorization under the repository deployment hold.

Before changing existing storage keys, inventory affected receipts and workflows
and warn the Owner. Recommend one-time verified copy/key conversion for managed
uploads, preserving the prior store and an exact rollback mapping. Development
reset/deletion or reseeding is an alternative only with explicit destructive
authorization; neither is authorized here. Original external scientific objects
are excluded from this managed-upload conversion.

## Acceptance and success measures

- New eligible uploads follow the approved hierarchy and round-trip exact bytes
  through existing authenticated workflows in both environments.
- Existing S3 files register without creating another managed byte copy. Exact
  original-object identity, scope and verification evidence remain traceable.
- Wrong Customer/Job/sample/library/run bindings, incomplete paired files,
  invalid FASTQ, unsafe archives, infected files, changed/missing originals and
  over-limit files cannot become admitted inputs or successful results.
- Retries do not create duplicate admissions or change an admitted source.
  Source access never grants scientific approval or Customer release.
- Internal source evidence survives customer-download expiry and cleanup.
- Existing referenced managed files remain accessible after a verified cutover;
  restore proof covers both database metadata and exact S3 object identities.
- Measure zero cross-tenant admissions, duplicate receipts, silent integrity
  failures or lost referenced files. Track verified/failed/retried admissions
  and time to register a representative real dataset.

No automated suites were executed, in accordance with
the repository's request-only testing rule. Implementation verification must
cover authorization, exact-version reads, source mutation/deletion, retention,
retry/crash recovery, file limits and browser mapping in the living test plans.
The separate [hosted cutover plan](S3-HOSTED-CUTOVER-PLAN.md) tracks target pinning,
source protection, populated S3-aware recovery and explicit release authorization.

Static and synthetic UI verification is recorded in the
[October 9 checkpoint](../testing/runs/2026-10-09-s3-hierarchy-and-streaming.md).
Backend/test-source build passed with zero warnings/errors; frontend types,
scoped lint, documentation consistency, script syntax and diff whitespace passed.
These checks do not establish live source admission or hosted activation.
