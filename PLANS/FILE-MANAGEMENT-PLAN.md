# File Management Plan

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

- EF Core and Npgsql are configured in `AppDbContext`.
- Persistence DI lives in `PersistenceServiceCollectionExtensions`.
- API endpoints are mapped from `Program.cs`.

## Storage Abstraction

Application code should use an interface instead of directly depending on local
disk or S3.

```csharp
public interface IFileStorage
{
    Task<StoredFileResult> PutAsync(
        FileStorageWriteRequest request,
        CancellationToken cancellationToken);

    Task<FileStorageReadResult> GetAsync(
        string storageKey,
        CancellationToken cancellationToken);

    Task DeleteAsync(
        string storageKey,
        CancellationToken cancellationToken);

    Task<string?> CreateDownloadUrlAsync(
        string storageKey,
        TimeSpan ttl,
        CancellationToken cancellationToken);
}
```

Implementations:

- `LocalFileStorage`: stores bytes under a configured local root such as
  `App_Data/files`.
- `S3FileStorage`: stores bytes in a configured S3 bucket and key prefix.
- `FileService`: owns validation, database transaction flow, retention policy
  lookup, storage calls, and state transitions.

## Configuration

Add a `FileStorage` configuration section.

```json
{
  "FileStorage": {
    "Provider": "Local",
    "LocalRootPath": "App_Data/files",
    "S3": {
      "BucketName": "",
      "Region": "",
      "KeyPrefix": "phaeno-portal"
    }
  }
}
```

Production AWS credentials should use the standard AWS SDK credential chain:
IAM role, environment variables, or configured profile. Do not store AWS secrets
in `appsettings.json`.

## Dependency Injection

Add a storage registration extension, for example
`StorageServiceCollectionExtensions.cs`.

```csharp
services.Configure<FileStorageOptions>(
    configuration.GetSection(FileStorageOptions.SectionName));

if (environment.IsDevelopment())
{
    services.AddScoped<IFileStorage, LocalFileStorage>();
}
else
{
    services.AddAWSService<IAmazonS3>();
    services.AddScoped<IFileStorage, S3FileStorage>();
}

services.AddScoped<IFileService, FileService>();
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

## Download Flow

Endpoint:

```http
GET /api/files/{id}/download
```

Behavior:

1. Validate the user has access to the file.
2. Log a `FileDownloadEvent`.
3. If the storage provider supports signed URLs, return a short-lived URL.
4. Otherwise, stream the file through the API with the correct content headers.

Development local storage should stream through the API. Production S3 storage
should generally return a short-lived pre-signed URL after authorization. For
sensitive files, keep proxy-download mode available so the API remains the
enforcement point.

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
- Use short TTLs for signed download URLs.
- Consider adding an `IFileScanner` hook before activating uploaded files.

## Package Additions

S3 support likely requires:

```xml
<PackageReference Include="AWSSDK.S3" Version="..." />
```

Use the latest compatible version when implementing.

## Implementation Phases

1. Add domain entities, DbSets, EF mappings, and migration.
2. Add `IFileStorage`, local implementation, options, and DI registration.
3. Add upload and download endpoints backed by local storage.
4. Add S3 implementation and production configuration.
5. Add folder CRUD and policy inheritance.
6. Add retention worker and cleanup reconciliation logic.
7. Add tests for local storage, policy resolution, upload/download
   authorization, and retention expiration.

## Recommended First Slice

Build local storage first. It proves the domain model, API contract, database
transactions, and retention behavior without involving AWS. Once the local
provider is stable, S3 should be a provider swap behind `IFileStorage`.
