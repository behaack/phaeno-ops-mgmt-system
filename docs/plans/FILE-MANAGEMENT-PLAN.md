# File Management Plan

## Scientific Pipeline Boundary

This plan does not currently own raw NGS files, intermediate pipeline
artifacts, pipeline orchestration, or their scientific provenance and
retention. The boundary between generated NGS output, Phaeno's existing
automated data pipeline, and customer output creation is an explicit major TBD
in `LAB-OPERATIONS-PLAN.md`.

This plan does own the approved lifecycle of an immutable customer deliverable
package after it is released through the Portal. The global defaults are 30 days
from release, an undownloaded-package warning 5 days before that deadline, and a
5-day grace period when any released file remains undownloaded at the standard
deadline. All three day counts are Phaeno-managed configuration with optional
Customer-, Partner-, and Prospect-organization overrides.

Do not extend the general file-management design below into raw or intermediate
scientific pipeline files until the pipeline and file-ownership contract is
separately approved. The Lab Operations plan currently assumes only that
approved customer output files eventually become available for controlled
release through the Portal.
The implemented `ReadyForRelease` transition deliberately creates no file,
result release, pipeline run, or customer download. Existing Commercial scan,
credit/payment, and publication gates remain authoritative until this
scientific pipeline boundary is separately approved.

## Current Implementation Boundary

The implemented file flows now share the provider-neutral infrastructure
`IFileStorage` contract with local filesystem and Amazon S3 implementations.
The existing `IManagedFileStorage` and `IOperationalFileStorage` feature ports
adapt to that contract through distinct storage areas, preserving their current
API, authorization, audit, checksum, size-limit, scan, release, and cleanup
behavior. Development selects local storage. The production target is S3, and
startup validation rejects the Local provider in the Production environment.
Until S3 is provisioned, production explicitly selects a `Disabled` adapter
that keeps the API healthy but stores no bytes; file operations return HTTP 503.

The released-deliverable retention configuration foundation is implemented:
the API persists versioned global defaults and versioned Customer, Partner, or
Prospect organization overrides, validates the resolved day values, requires a
reason, retains replacement/removal history, and rejects stale writes. It does
so through a Phaeno-only File Management page for the global policy and an
account Retention tab for partial organization overrides. It does not yet
create released-package policy snapshots or run warning, grace, download-cutoff,
notification, or byte-deletion processing.

The organization-data-provisioning slice includes server-derived size and
SHA-256 metadata, environment-approved file kinds, scan-state abstraction,
reference-safe draft cleanup, tenant-authorized individual/archive downloads,
and download audit records. Its feature-scoped EF mappings are included in the clean
`20260716220428_InitialPSeqOperations` baseline applied to the configured
Development database on 2026-07-16.

This does not complete the general file-management plan or its proposed general
folder/file schema. The S3 adapter is implemented, but production bucket,
credentials, encryption, permissions, monitoring, and runtime validation remain
incomplete. Production malware-scanner integration, shared folders, general
file versions, retention processing, and file behavior outside the existing
curated-data and order-management flows remain unimplemented.

### Production S3 activation TODO

- [ ] Provision and approve the production S3 bucket, region, and key prefix.
- [ ] Obtain production AWS access keys for a dedicated least-privilege IAM
  principal, or replace static keys with an approved workload-identity path.
- [ ] Store credentials only in the protected deployment secret store and
  root-protected runtime environment; never commit or log them.
- [ ] Configure encryption, lifecycle, permissions, monitoring, and rotation.
- [ ] Inventory and migrate any referenced legacy managed-file bytes.
- [ ] Validate representative upload, download, deletion, authorization,
  quarantine/revocation, and rollback behavior before changing production from
  `Disabled` to `S3`.

## Goal

Add backend-managed file upload, download, folder, and retention capabilities.
The database is the source of truth for file metadata, folders, retention
policies, and download events. File bytes are stored outside the database:

- Development: local filesystem storage.
- Production: Amazon S3 storage.

Backend code should depend on storage abstractions registered through
dependency injection so environment-specific storage can be swapped without
changing application logic.

## Backend Structure

Add these feature and infrastructure areas:

- `backend/app/Features/Files/Domain`
- `backend/app/Features/Files/DTOs`
- `backend/app/Features/Files/Endpoints`
- `backend/app/Infrastructure/Storage`

The existing backend already has the right foundation:

- EF Core and Npgsql are configured through the single `PSeqOperationsDbContext`.
- Persistence DI lives in `PersistenceServiceCollectionExtensions`.
- API endpoints are mapped from `Program.cs`.

## Storage Abstraction

Application code should use an interface instead of directly depending on local
disk or S3.

```csharp
public interface IFileStorage
{
    Task<FileStorageWriteResult> SaveAsync(
        FileStorageWriteRequest request,
        CancellationToken cancellationToken);

    Task<Stream> OpenReadAsync(
        string area,
        string storageKey,
        CancellationToken cancellationToken);

    Task DeleteIfExistsAsync(
        string area,
        string storageKey,
        CancellationToken cancellationToken);
}
```

Implementations:

- `LocalFileStorage`: stores bytes under a configured local root such as
  `App_Data`, separated by feature area.
- `S3FileStorage`: stores bytes in a configured S3 bucket and key prefix.
- Feature adapters translate shared storage results and failures to the stable
  curated-data and order-management contracts.
- A future general `FileService` would own the proposed general file/folder
  validation, database transaction flow, retention policy lookup, storage
  calls, and state transitions.

## Configuration

Add a `FileStorage` configuration section.

```json
{
  "FileStorage": {
    "Provider": "Local",
    "LocalRootPath": "App_Data",
    "S3": {
      "BucketName": "",
      "Region": "",
      "KeyPrefix": "phaeno-portal",
      "ServiceUrl": "",
      "ForcePathStyle": false
    }
  }
}
```

Production AWS credentials should use the standard AWS SDK credential chain:
IAM role, environment variables, or configured profile. Do not store AWS secrets
in `appsettings.json`.

### Released-Deliverable Retention Configuration

Phaeno configuration owns three positive whole-day values:

- standard retention: 30 exact 24-hour days from package release;
- undownloaded warning lead: 5 exact 24-hour days before the standard deadline;
  and
- undownloaded grace: 5 exact 24-hour days after the standard deadline.

The warning lead must be shorter than the standard retention period. An
authorized Phaeno user may configure an organization-level override for a
Customer, Partner, or Prospect organization. Each of the three override values
is optional; an omitted value inherits the current global value. The resolved
combination must pass the same validation, and every override creation, change,
or removal requires a reason and audit history. External organization users
cannot edit retention configuration.

A release resolves the global defaults plus any active override for its owning
organization, then snapshots all three effective values, their source, its
release timestamp, standard deadline, warning timestamp, and potential grace
deadline. Later global or organization-level changes affect only packages
released afterward and never shorten or extend a communicated package deadline.
The initial policy has no project- or order-specific override.

For this policy, one configured day is an exact 24-hour interval. POMS stores
the release, warning, standard-deletion, and final-deletion instants in UTC and
calculates them without rounding to midnight or an end-of-day boundary. Portal
views render those same instants in the current user's browser-resolved IANA
time zone and label the zone, falling back to UTC when it cannot be resolved.
Localization never changes the authoritative UTC instant.

## Dependency Injection

`StorageServiceCollectionExtensions.cs` binds and validates configuration,
selects the registered provider, and connects the existing feature ports to the
shared contract.

```csharp
services.AddFileStorage(configuration, environment);
```

Call the extension from `Program.cs` after persistence registration.

## Database Model

Add EF entities, DbSets, mappings, and a migration for file management.

### Folder

Represents a folder in an organization's file tree.

- `Id`
- `OrganizationId`
- `ParentFolderId`
- `Name`
- `Path`
- `RetentionPolicyId`
- audit fields
- concurrency field

Rules:

- Folder names are unique per parent folder.
- Folder policies inherit from parent folders unless explicitly set.
- Folder deletion should soft-delete contained files unless hard delete is
  explicitly allowed.

### FileRecord

Represents the logical file visible to users.

- `Id`
- `OrganizationId`
- `FolderId`
- `FileName`
- `ContentType`
- `SizeBytes`
- `ChecksumSha256`
- `CurrentVersionId`
- `Status`: `Pending`, `Active`, `SoftDeleted`, `Expired`
- `UploadedByUserId`
- `UploadedAt`
- `RetentionPolicyId`
- audit fields
- concurrency field

### FileVersion

Represents a stored version of a file.

- `Id`
- `FileRecordId`
- `StorageProvider`
- `StorageKey`
- `ETag`
- `VersionNumber`
- `SizeBytes`
- `ChecksumSha256`
- `CreatedAt`

The storage key should be generated server-side. A good pattern is:

```text
{organizationId}/{fileId}/{versionId}
```

### RetentionPolicy

Defines lifecycle behavior for folders and files.

- `Id`
- `OrganizationId`
- `Name`
- `RetainForDays`
- `Basis`: `UploadedAt`, `LastAccessedAt`, `DeletedAt`
- `Action`: `SoftDelete`, `HardDelete`
- `IsDefault`

Effective policy resolution order:

1. File-specific policy.
2. Folder policy.
3. Nearest ancestor folder policy.
4. Organization default policy.
5. System default fallback.

Released customer deliverable packages use a narrower effective-policy rule:

1. Resolve each optional value from the active Customer, Partner, or Prospect
   organization override.
2. Inherit any omitted value from the global released-deliverable defaults.
3. Validate the resolved tuple and snapshot it, including the global and
   organization-policy identifiers/versions, on the immutable package release.

The organization override retains its organization, optional standard-
retention/warning-lead/grace values, effective state, required change reason,
actor, timestamps, and audit history. It is Phaeno-managed configuration, not
an external organization self-service preference.

### FileDownloadEvent

Records file access.

- `Id`
- `FileRecordId`
- `UserId`
- `StartedAtUtc`
- `LeaseExpiresAtUtc`
- `TerminalAtUtc`
- `CompletedAtUtc`: populated only for `Succeeded`
- `Outcome`: `Started`, `Succeeded`, `Failed`, `Cancelled`, `TimedOut`, `Revoked`
- `TerminalReasonCode`
- `CountsForReleasedPackageRetention`
- `IpAddress`
- `UserAgent`
- `Version`

The attempt transitions once from `Started` to one terminal outcome under
optimistic concurrency and is immutable afterward. That transition order is the
authority for completion/revocation races; request and browser timestamps are
not.

### Released-Deliverable Policy Records

The released-package policy is controlled operational configuration and must
not reuse tenant-editable folder/file inheritance in a way that could broaden
deletion accidentally.

- `ReleasedDeliverablePolicyDefaults` versions the three required global day
  counts and retains the Phaeno actor, change reason, and timestamps.
- `OrganizationReleasedDeliverablePolicyOverride` belongs to exactly one
  Customer, Partner, or Prospect organization and versions three nullable day
  counts. Null means inherit that value from the current global defaults.
- The organization override is effective only for future releases. Deactivation
  or replacement preserves its history and requires an authorized Phaeno actor
  and reason.
- Each immutable released package stores the resolved three values, global-
  policy version, optional organization-override version, release timestamp,
  warning timestamp, standard deletion timestamp, potential final deletion
  timestamp, grace-activation timestamp, download-access-closed timestamp,
  byte-deletion timestamp, and outcome.
- A correction links the new immutable release to the superseded package while
  preserving separate policy snapshots, clocks, download events, notification
  events, withdrawal state, and byte-deletion outcomes.
- An authorized regeneration similarly links a new immutable reissue to the
  deleted package and retains the Phaeno actor/reason without reviving or
  mutating the deleted release.
- Each released file snapshots its `Sample` or `Combined/Project` scope and the
  applicable external non-PHI sample identifiers, original submitted-tube
  supplier barcodes, and Phaeno accession identifiers. Receipt generation reads
  this frozen release lineage rather than mutable current sample records.
- Per-file successful external-download state is derived from immutable
  download events and may be materialized for efficient worker queries without
  replacing the underlying audit evidence.

## Upload Flow

1. Receive multipart upload with `folderId`.
2. Validate the folder exists and the user has access.
3. Create a `FileRecord` in `Pending` state.
4. Stream bytes to `IFileStorage`.
5. Calculate checksum while streaming.
6. Create a `FileVersion`.
7. Mark `FileRecord` as `Active`.
8. Save database changes.

If storage succeeds but the database save fails, delete the uploaded object. If
the database succeeds but cleanup fails later, use a cleanup job to reconcile
orphaned storage objects.

The organization-data-provisioning first release also uploads approved files
directly from a Phaeno-only source-sample draft. Those uploads use the same
managed storage flow, server-derived storage keys, streaming checksum, file-kind
validation, scan state, and reconciliation. The source revision cannot become
ready until every referenced file passes the configured checks. External file
references and imports are outside that release.

## Download Flow

Endpoint:

```http
GET /api/files/{id}/download
```

Behavior:

1. Validate the user has access to the file.
2. Record a download attempt and bounded lease; this is not yet a successful
   download event for released-package retention.
3. Open the object through the selected storage provider.
4. Stream the file through the API with the correct content headers.
5. Record `Succeeded` only after the server completes the response stream.
   Failed, cancelled, disconnected, or timed-out attempts remain auditable but
   do not satisfy the organization-download condition.

A released-package request authorized and started before its frozen access-
close instant may finish within the configured normal download timeout. A range
resume, retry, archive retry, or other new HTTP request at or after the cutoff is
new access and is denied. A pre-cutoff transfer that completes after the cutoff
retains both timestamps and may count as a successful organization download,
but it never reopens the package or changes an activated grace/final deadline.

That completion allowance applies only to an ordinary retention cutoff. An
emergency quarantine, package withdrawal or correction, membership
deactivation, or organization deactivation revokes the active lease and stops
the response stream as soon as the server applies the revocation. The event is
recorded as `Revoked` and does not count as a successful download; bytes already
delivered to the recipient cannot be recalled.

### Download Boundary And Recovery Rules

- Server-side UTC event order is authoritative; client clocks and UI receipt
  times never decide access or download status. A lease must be authorized and
  durably created strictly before the applicable cutoff. A request at the exact
  cutoff is denied.
- Concurrent completion and revocation use durable event order. A successful
  completion committed first remains successful and auditable because delivered
  bytes cannot be recalled. A revocation committed first wins, stops the stream,
  and produces a non-counting `Revoked` outcome.
- Success is recorded only after normal server completion of the original
  response stream. A partial individual-file transfer counts for nothing. A
  partial complete-package archive counts for none of its files; only successful
  completion of the whole archive marks every included file downloaded.
- At the standard deadline, grace eligibility is frozen from successful events
  committed before that instant. An incomplete lease therefore counts as
  undownloaded and activates grace when it is the only missing success. Its later
  completion may satisfy the audit state but never cancels the activated grace
  period or changes the final deadline.
- Multiple simultaneous leases are independent. Byte deletion waits for every
  otherwise-valid pre-cutoff lease to complete, fail, be revoked, or reach its
  original expiry, but no lease can be renewed or extended after the cutoff.
- The maximum lease duration is a configurable Phaeno operational setting,
  separate from global or organization retention policy. A change affects only
  newly issued leases. Production activation must set and validate it against
  the supported maximum artifact size and minimum supported transfer rate.
- A disconnect, process restart, or other loss of a stream never creates resume
  authority. Persisted `Started` attempts are reconciled to `Failed`,
  `Cancelled`, or `TimedOut`; without a durably recorded success they do not
  count, and cleanup waits no later than the existing lease expiry.
- Restoring membership or organization access does not resume a revoked stream.
  If every current authorization gate passes and the package cutoff remains in
  the future, the user may start a fresh request and lease; otherwise access
  stays closed.

Both development local storage and production S3 storage stream through the
API. This keeps the API as the current enforcement point for authorization,
payment/release eligibility, quarantine, revocation, and download auditing.
Pre-signed URLs are deliberately deferred unless a future product requirement
and threat review establish a delivery mode whose grant can be invalidated
quickly enough for these files.

## Released-Deliverable Retention Policy

This policy applies to immutable customer-facing result and output packages
released for Trial Projects, Customer laboratory work, and Partner operational
work. It does not apply to raw or intermediate pipeline files, customer input
uploads, manifests and commercial documents, audit records, or Phaeno-owned
curated demonstration packages.

The package is the retention and deletion unit. Files are never deleted
piecemeal merely because some were downloaded before others.

1. Release resolves the owning Customer, Partner, or Prospect organization's
   optional override against the global 30-day retention, 5-day warning lead,
   and 5-day grace defaults. It snapshots the effective values and policy
   sources, then displays the standard deletion deadline and conditional grace
   behavior to the organization as exact, zone-labelled timestamps. It does not
   postpone deletion to midnight.
2. A successful download by any member currently authorized for the owning
   external organization records an immutable event and satisfies that file for
   the organization; every administrator or member does not need a duplicate
   download. An individual download marks that file downloaded. A successfully
   completed full-package archive download marks every file in that immutable
   package downloaded. Failed, cancelled, unauthorized, or internal Phaeno
   downloads do not count. A later membership change does not erase a valid
   historical organization download.
3. At the warning timestamp, POMS checks the whole package. If any released file
   has never been successfully downloaded, all active organization
   administrators receive one tenant-safe email warning with the standard
   deletion date. The Portal shows the same warning. No filenames, scientific
   details, attachments, or direct file-download links appear in email. The
   message includes the normal authenticated Portal link to the package detail
   page, where current membership and tenant authorization are rechecked. If
   the organization has no active administrator, the deadline remains unchanged
   and POMS creates an urgent Phaeno Operations item identifying the
   organization, package, and deadline without exposing scientific content.
   This is the only scheduled pre-deadline warning email. Before grace begins,
   the Portal warning remains visible while any package file is undownloaded
   and clears when every file has been downloaded or the package becomes
   unavailable. If delayed processing finds every file successfully downloaded
   before the warning message is created, it records the checkpoint as skipped
   and sends no stale warning. A warning already handed to the outbox is not
   recalled; the authenticated package page always shows current state.
4. At the standard deadline, a package whose every file has been downloaded is
   closed to new downloads immediately and its byte deletion is queued without
   a grace period. If any file remains undownloaded, POMS activates the frozen
   grace period for the entire package, keeps every file downloadable, and sends
   all active organization administrators one grace notice with the final
   deletion timestamp and the same authenticated package-detail link. If no
   active administrator exists, the deadline remains unchanged and POMS creates
   or updates the urgent Phaeno Operations item for the final deadline.
5. A download during grace does not shorten the already communicated grace
   period. The grace countdown remains visible in the Portal until deletion even
   if every file is downloaded during grace. The grace notice is the second and
   final scheduled retention email; POMS sends no daily reminder emails. At the
   grace deadline, POMS closes new download access immediately and queues
   deletion of all package file bytes.
   A transfer authorized and started before either applicable cutoff may finish
   under its existing bounded lease. That allowance does not admit a new range
   request, resume, retry, archive request, or other HTTP request after the
   cutoff, reopen package access, cancel an activated grace period, or move the
   final deadline. Physical byte deletion waits only for each active pre-cutoff
   lease to complete or expire and then proceeds asynchronously.
   A higher-priority quarantine, withdrawal/correction, membership deactivation,
   or organization deactivation cancels that lease instead of waiting for it;
   the ordinary-retention finish allowance does not override revocation.
6. Deletion preserves the package record, filenames, sizes, checksums,
   provenance, release history, notification history, download audit, deletion
   due timestamp, download-access-closed timestamp, byte-deletion timestamp,
   policy snapshot, and deletion outcome. Download authorization rejects access
   at or after the applicable frozen deadline even if physical bytes still
   exist while cleanup is pending or retrying. External users receive no self-
   service restore action, and Phaeno makes no restoration or regeneration
   promise.

The retained metadata supports a permanent downloadable package receipt. The
receipt contains the package identifier, released filenames, sizes, checksums,
release timestamp, organization-download attempt start and completion
timestamps and outcomes, byte-deletion due timestamp, download-access-closed
timestamp, actual byte-deletion timestamp, and deletion outcome, but never file
contents, scientific result values, internal notes, IP addresses, user agents,
or storage identifiers. A successful transfer completed after access closed is
identified as having been authorized and started before the cutoff. An
active organization administrator may view and export the receipt for its own
organization, including the member name and timestamp for each successful
download. An ordinary active member sees package-level availability and
deletion status but not the downloader audit. Authorized Phaeno users retain
the complete operational audit. External receipt surfaces describe `Revoked`
as access having ended and do not expose the confidential revocation reason;
the full reason code remains in the Phaeno audit.

For each released file, the receipt uses the immutable release-lineage snapshot
to identify its scope. A sample-scoped file maps to the external organization's
non-PHI Customer sample identifier, the original submitted-tube supplier
barcode, and the Phaeno accession identifier when applicable. A project-level or
combined file is labelled accordingly and lists every included non-PHI Customer
sample identifier rather than implying a one-file/one-sample relationship. If a
mapping does not apply, the receipt says so instead of inventing lineage. Phaeno
derived-container barcodes and internal-only scientific lineage remain outside
the tenant receipt.

The initial receipt surfaces are an accessible in-Portal record and a printable
PDF generated from the same authorized retained metadata. The PDF includes its
generation timestamp and the package state represented so an earlier export is
not mistaken for a later download or deletion state. The Portal localizes
deadlines to the current user's labelled time zone. The PDF identifies that
display time zone and prints the canonical UTC timestamps alongside the local
values. CSV and other machine-readable receipt exports are deferred until
demonstrated customer demand.

If the necessary source material still exists and Phaeno later authorizes
regeneration, POMS creates a distinct immutable reissue linked to the deleted
package. It records the authorizing Phaeno user and reason, resolves the then-
effective global-plus-organization policy, and starts a fresh clock, download
state, and notice sequence. It never restores the deleted release in place or
changes its deletion record.

The notification outbox retries failures and exposes them to Phaeno Operations.
A delivery failure does not silently change the authoritative deadline or
create indefinite retention. An active quarantine, security investigation, or
other controlled preservation hold blocks byte deletion until authorized
release from the hold. A quarantine immediately blocks new external access and
terminates active external streams; access remains blocked during preservation.
A preservation hold protects bytes only: it never extends or resets the frozen
retention clock, creates a new warning/grace sequence, or reopens external
access. When the hold is released, an already-due package is queued for deletion
immediately; a not-yet-due package continues on its original schedule.

Correction or withdrawal rules continue to control whether a package is
downloadable before its retention deadline. Publishing a correction immediately
withdraws the superseded package from external download and terminates any
active external response stream without rewriting its release, download,
notification, retention, or audit history. Its retained bytes continue under
the existing policy snapshot or an applicable preservation hold until deletion;
withdrawal does not represent successful deletion.

The correction is a new immutable released package. It resolves and snapshots
the effective policy at its own release, starts a fresh retention clock and
fresh per-file organization-download state, and is independently eligible for
its warning and grace notices. Downloads of the superseded package never satisfy
the corrected package. The corrected release does not extend, reset, or reuse
the superseded package's dates.

Content with an immediate revocation requirement, including curated Prospect
sample packages, must use proxy-download mode or another delivery mechanism that
can invalidate access immediately. A signed URL that remains usable after its
grant is revoked does not satisfy that requirement.

Curated sample packages support both an authorized individual-file download and
one complete archive of the exact immutable package version. The complete
archive includes the package manifest and every file in that version. Both
download modes must pass the same current grant check and create distinct audit
events.

Every published curated-package version and its files are retained indefinitely,
including superseded and retired versions. Normal retention cleanup must not
delete those artifacts. A future exceptional purge process is the only planned
deletion path.

The first release does not automatically age-delete source-sample drafts. An
authorized Phaeno user may explicitly discard only an unreferenced draft after
destructive confirmation and a required reason. The audit record remains, and
managed file bytes are removed only if no other record references them. Ready,
archived, snapshotted, published, superseded, retired, quarantined, and withdrawn
revisions are not normal retention-deletion candidates.

An emergency curated-package quarantine immediately blocks every individual-file
and complete-archive download for the affected immutable version and terminates
active external response streams, regardless of otherwise-active grants or
cached tenant state. Files remain preserved for investigation, and bytes
already delivered or previously downloaded copies cannot be recalled.

A separate Phaeno-only investigation path may allow specifically authorized
investigators to view or download quarantined files. Every investigation access
requires a purpose or reason and a distinct audit event. This path must never be
available through Customer, Prospect, Partner, or ordinary Phaeno access.

## Folder Endpoints

Initial endpoints:

- `POST /api/folders`
- `GET /api/folders/{id}`
- `GET /api/folders/{id}/children`
- `PATCH /api/folders/{id}`
- `DELETE /api/folders/{id}`

File endpoints:

- `POST /api/files`
- `GET /api/files/{id}`
- `GET /api/files/{id}/download`
- `DELETE /api/files/{id}`

Retention endpoints:

- `POST /api/retention-policies`
- `GET /api/retention-policies`
- `PATCH /api/retention-policies/{id}`
- `DELETE /api/retention-policies/{id}`

Released-deliverable policy endpoints:

- `GET /api/file-management/released-deliverable-policy`
- `PATCH /api/file-management/released-deliverable-policy`
- `GET /api/organizations/{organizationId}/released-deliverable-policy`
- `PUT /api/organizations/{organizationId}/released-deliverable-policy/override`
- `DELETE /api/organizations/{organizationId}/released-deliverable-policy/override`

Released-package receipt endpoint:

- `GET /api/released-deliverable-packages/{packageId}/receipt`
- `GET /api/released-deliverable-packages/{packageId}/receipt.pdf`

These configuration mutations are Phaeno-only, require optimistic concurrency
and a reason, and return the global, override, and effective values distinctly.
Customer, Partner, and Prospect package-detail responses expose only their own
snapshotted effective dates and download/deletion state, not another
organization's policy or internal change history.

## Configuration And Package UI

- Phaeno File Management configuration shows the global 30/5/5 defaults with
  validation, destructive-impact context, version history, and a required
  reason for changes.
- A Phaeno organization detail surface for every Customer, Partner, and Prospect
  shows the global values, nullable override fields, resulting effective values,
  and retained override history. Clearing one field restores inheritance for
  future releases; removing the override restores all-global inheritance.
- The change confirmation states that existing released packages retain their
  snapshotted dates.
- External users cannot edit the policy. Their released-package detail shows
  the standard deletion date, whether grace is conditional or active, the final
  date when active, per-file download status, and the package-level warning.
  A pre-deadline undownloaded warning clears after all files are downloaded; an
  activated grace countdown remains until package-byte deletion.
- At the applicable deadline, the external detail changes immediately to
  `Downloads closed`. If storage cleanup has not completed, it may additionally
  show `Deletion processing`; this never restores a download action. The receipt
  distinguishes access closure from completed byte deletion.
- A user whose authorized download began before the cutoff may see that transfer
  continue as `Download in progress` until it succeeds, fails, is cancelled, or
  times out. The closed package page offers no resume, retry, range, individual-
  file, or archive-download action after the cutoff.
- If a higher-priority access revocation ends that transfer, the Portal reports
  that the download stopped because access ended and offers no retry. It does
  not expose a confidential quarantine, membership, or internal withdrawal
  reason to an external user.
- Partial, abandoned, and restart-interrupted transfers remain visibly
  undownloaded. If access is later restored before the package cutoff, the page
  may offer a fresh download; it never presents the prior stream as resumable.
- An already-sent warning always opens the current package state. If all files
  were downloaded after the email was queued, the page does not preserve a stale
  warning merely to match the older message.
- A superseded package detail is read-only and clearly unavailable, and links
  an authorized user to its corrected replacement. The corrected package states
  that it replaces the prior release and shows only its own dates and download
  state.
- A deleted package detail shows the deletion outcome and retained history but
  no restore action. A later authorized reissue appears as a separate linked
  package with its own dates and download state.
- An organization administrator can download the permanent tenant-safe package
  receipt before or after byte deletion. Ordinary members see package status
  without downloader names or the receipt's member-level audit.
- The Portal receipt and printable PDF render the same authorized facts. The PDF
  shows its generation timestamp and represented package state, labels the
  current user's display time zone, and prints UTC beside each localized
  retention timestamp; no CSV receipt action appears in the initial release.
- Both receipt surfaces show the frozen file-to-sample lineage: non-PHI Customer
  sample identifier, original submitted-tube barcode, and Phaeno accession for
  sample-scoped files, or the complete included-sample list for a clearly
  labelled combined/project-level file.

## Retention Processing

Add a hosted background service:

- `RetentionPolicyWorker`

Responsibilities:

- Run on a configured interval.
- process released-package warning and grace checkpoints idempotently;
- suppress a delayed warning before outbox creation when all files have already
  completed successfully, while never recalling an outbox message already
  created;
- make deadline-based download denial independent of worker completion; the
  download authorization path evaluates the frozen access-close instant even
  when the cleanup state has not yet advanced;
- stop issuing new download leases at the applicable cutoff while allowing a
  lease authorized and started before that instant to finish within its bounded
  timeout;
- use the package's snapshotted effective policy rather than current global or
  organization-level values;
- distinguish successful organization downloads from failed or internal access;
- reconcile abandoned `Started` attempts to a non-counting terminal outcome no
  later than their persisted lease expiry and make cleanup wait for all active
  eligible leases, never beyond their original expiries;
- count one successful download by any currently authorized organization member
  for the organization without requiring per-user completion;
- send one de-duplicated warning and one de-duplicated grace notice to active
  organization administrators when required;
- send no recurring or daily retention reminders beyond those two scheduled
  package notices;
- create or update one urgent, de-duplicated Phaeno Operations item when a
  required warning or grace notice has no active organization administrator
  recipient, without extending the package deadline;
- Find active or soft-deleted files whose effective retention policy has
  elapsed.
- apply hard deletion to released-deliverable bytes at the applicable standard
  or grace deadline while preserving metadata and audit records; if a valid
  pre-cutoff lease is still active, wait only for its completion or expiry before
  deleting the bytes, without reopening access or treating that bounded wait as
  a cleanup failure;
- Delete storage objects only after the database state transition is recorded.
- Record enough audit data to explain retention actions.
- retry or reconcile partial storage deletion without making deleted files
  downloadable again.
- on preservation-hold release, queue already-due bytes immediately and otherwise
  keep the original frozen schedule without a new notice sequence.
- surface overdue or repeatedly failed byte deletion as urgent Phaeno Operations
  work while keeping external access closed.

## Security Requirements

Minimum controls:

- Scope all file access by `OrganizationId`.
- Authorize package receipts by current active membership and tenant scope.
  Include member-level download audit only for an organization administrator or
  authorized Phaeno user, and exclude secrets, storage keys, network telemetry,
  internal notes, and scientific result content from the tenant receipt.
- Restrict global and organization-level released-deliverable policy mutations
  to the explicit Phaeno configuration capability; validate the target is a
  Customer, Partner, or Prospect and audit every attempted consequential change.
- Never use the organization's current override to recalculate an already-
  released package; authorize and process only its immutable policy snapshot.
- At every download request, enforce the package's frozen access-close instant
  in addition to membership, tenant, release, payment, quarantine, and
  withdrawal gates. Storage-object existence is never evidence of access.
- Generate a bounded download lease only after those gates pass before the
  cutoff. Bind it server-side to the specific request, user, organization,
  package, and file/archive scope; it is neither transferable nor authority for
  a post-cutoff retry or range resume. Count the download only when that same
  response stream completes successfully before its configured timeout.
- Make active leases revocable independently of the retention worker. Applying
  quarantine, withdrawal/correction, membership deactivation, or organization
  deactivation must signal matching streams to stop promptly, record `Revoked`,
  and prevent additional bytes from being intentionally served. The ordinary-
  retention cutoff alone permits an otherwise-authorized stream to finish.
- Enforce lease creation, successful completion, and revocation with durable
  concurrency control and an authoritative server event order. Revocation
  signaling must reach matching streams across all serving instances rather
  than relying only on process-local state; failure to establish or persist the
  lease fails closed before streaming begins.
- Retention email links target the normal authenticated package-detail route.
  They contain no bearer secret or direct storage/file-download URL, and the
  destination rechecks active membership, tenant scope, release gates, and
  current file state before showing or serving anything.
- Never trust client-supplied file paths or storage keys.
- Generate storage keys server-side.
- Store original file names separately from storage keys.
- Sanitize download file names.
- Enforce configured file size limits.
- Enforce configured allowed content types.
- Keep development/test fixture file-kind policy environment-scoped. Production
  must not inherit or promote synthetic-fixture approvals and begins with only
  explicitly configured Phaeno-approved scientific kinds.
- Curated package publication uses a Phaeno-approved configurable file-kind
  list and fails if any package file is unexpected, unsupported, or disallowed.
- If a future approved flow uses signed download URLs, keep their TTLs short and
  do not use them where immediate revocation or quarantine is required.
- Provide an `IFileScanner` hook for managed scientific uploads. A source-sample
  revision cannot become ready while any file is unscanned, scanning, failed, or
  rejected; scanner unavailability is a blocking, retryable readiness error.

## Package Additions

S3 support uses:

```xml
<PackageReference Include="AWSSDK.S3" Version="4.0.101.4" />
```

## Implementation Phases

1. Proposed general file entities, DbSets, EF mappings, and migration: not
   started; existing feature-owned metadata remains authoritative.
2. Shared `IFileStorage`, local implementation, options, and DI registration:
   complete for the existing feature-owned file flows.
3. Existing curated-data and order-management upload/download endpoints backed
   by shared local storage: complete.
4. S3 implementation and provider-selected production configuration contract:
   code complete; production currently uses the non-persisting `Disabled`
   adapter, and live S3 configuration and validation are incomplete.
5. General folder CRUD and policy inheritance: not started.
6. Released-deliverable policy configuration foundation: complete for the
   versioned global 30-day retention, 5-day undownloaded warning, and conditional
   5-day grace defaults; partial Customer-, Partner-, and Prospect-organization
   overrides; validation; required reasons; retained history; optimistic
   concurrency; Phaeno-only API access; global administration UI; and the
   Customer, Partner, and Prospect account Retention tab. Released-package
   snapshots, the general retention worker, warning/grace notifications,
   deadline enforcement, and cleanup reconciliation are not started.
7. Local storage and provider-selection tests: created. Released-deliverable
   value, inheritance, history-state, and EF mapping tests are created. API
   authorization and retention-expiration coverage remains future scope.

## Recommended First Slice

The next activation slice is the unchecked Production S3 activation TODO above.
Until that work is explicitly authorized and verified, keep production on the
`Disabled` adapter. This does not authorize the proposed general folder/file
model or the separate scientific-pipeline file boundary.
