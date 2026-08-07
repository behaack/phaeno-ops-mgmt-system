# File Management Plan

## Scientific Pipeline Boundary

This plan does not currently own raw NGS files, intermediate pipeline
artifacts, pipeline orchestration, scientific provenance, or scientific-file
retention. The boundary between generated NGS output, Phaeno's existing
automated data pipeline, and customer output availability is an explicit major
TBD in `LAB-OPERATIONS-PLAN.md`.

Do not extend the general file-management design below into that scientific
domain until the pipeline and file-ownership contract is separately approved.
The Lab Operations plan currently assumes only that approved customer output
files eventually become available for controlled release through the Portal.
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

### FileDownloadEvent

Records file access.

- `Id`
- `FileRecordId`
- `UserId`
- `DownloadedAt`
- `IpAddress`
- `UserAgent`

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
2. Log a `FileDownloadEvent`.
3. Open the object through the selected storage provider.
4. Stream the file through the API with the correct content headers.

Both development local storage and production S3 storage stream through the
API. This keeps the API as the current enforcement point for authorization,
payment/release eligibility, quarantine, revocation, and download auditing.
Pre-signed URLs are deliberately deferred unless a future product requirement
and threat review establish a delivery mode whose grant can be invalidated
quickly enough for these files.

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
and complete-archive download for the affected immutable version, regardless of
otherwise-active grants or cached tenant state. Files remain preserved for
investigation, and previously downloaded copies cannot be recalled.

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

## Retention Processing

Add a hosted background service:

- `RetentionPolicyWorker`

Responsibilities:

- Run on a configured interval.
- Find active or soft-deleted files whose effective retention policy has
  elapsed.
- Apply soft delete or hard delete.
- Delete storage objects only after the database state transition is recorded.
- Record enough audit data to explain retention actions.

## Security Requirements

Minimum controls:

- Scope all file access by `OrganizationId`.
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
6. General retention worker and cleanup reconciliation: not started.
7. Local storage and provider-selection tests: created. General policy,
   authorization, and retention-expiration coverage remains future scope.

## Recommended First Slice

The next activation slice is the unchecked Production S3 activation TODO above.
Until that work is explicitly authorized and verified, keep production on the
`Disabled` adapter. This does not authorize the proposed general folder/file
model or the separate scientific-pipeline file boundary.
