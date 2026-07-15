namespace PhaenoPortal.App.Features.DataProvisioning.Services;

using PhaenoPortal.App.Features.DataProvisioning.Domain;
using PhaenoPortal.App.Features.DataProvisioning.DTOs;

public static class DataProvisioningMappings
{
    public static SourceSampleDto ToDto(SourceSample source)
    {
        return new SourceSampleDto
        {
            Id = source.Id,
            Label = source.Label,
            Description = source.Description,
            BiologicalContext = source.BiologicalContext,
            AssayContext = source.AssayContext,
            AnalysisSummary = source.AnalysisSummary,
            QcStatus = source.QcStatus,
            Provenance = source.Provenance,
            IsSynthetic = source.IsSynthetic,
            Revision = source.Revision,
            Status = source.Status,
            OwnershipBasis = source.OwnershipBasis,
            OwnershipEvidenceReference = source.OwnershipEvidenceReference,
            OwnershipConfirmedByUserId = source.OwnershipConfirmedByUserId,
            OwnershipConfirmedAt = source.OwnershipConfirmedAt,
            DeidentificationMethod = source.DeidentificationMethod,
            DeidentificationNotes = source.DeidentificationNotes,
            DeidentificationConfirmedByUserId = source.DeidentificationConfirmedByUserId,
            DeidentificationConfirmedAt = source.DeidentificationConfirmedAt,
            ReadyAt = source.ReadyAt,
            ArchivedAt = source.ArchivedAt,
            Files = source.Files
                .OrderBy(file => file.FileName, StringComparer.OrdinalIgnoreCase)
                .Select(ToDto)
                .ToList(),
            CreatedAt = source.CreatedAt,
            UpdatedAt = source.UpdatedAt,
            Version = source.Version
        };
    }

    public static ManagedFileDto ToDto(ManagedFile file)
    {
        return new ManagedFileDto
        {
            Id = file.Id,
            FileName = file.FileName,
            FileKind = file.FileKind,
            ContentType = file.ContentType,
            SizeBytes = file.SizeBytes,
            Sha256 = file.Sha256,
            ScanStatus = file.ScanStatus,
            ScanMessage = file.ScanMessage
        };
    }

    public static ManagedFileDto ToDto(CuratedDatasetVersionFile file)
    {
        return new ManagedFileDto
        {
            Id = file.Id,
            FileName = file.FileName,
            FileKind = file.FileKind,
            ContentType = file.ContentType,
            SizeBytes = file.SizeBytes,
            Sha256 = file.Sha256,
            ScanStatus = file.ManagedFile.ScanStatus,
            ScanMessage = file.ManagedFile.ScanMessage
        };
    }

    public static CuratedDatasetDto ToDto(CuratedDataset dataset)
    {
        return new CuratedDatasetDto
        {
            Id = dataset.Id,
            Name = dataset.Name,
            Description = dataset.Description,
            IsActive = dataset.IsActive,
            EligibleVersionId = dataset.EligibleVersionId,
            EligibilityApprovedAt = dataset.EligibilityApprovedAt,
            Versions = dataset.Versions
                .OrderByDescending(version => version.VersionNumber)
                .Select(ToDto)
                .ToList(),
            CreatedAt = dataset.CreatedAt,
            UpdatedAt = dataset.UpdatedAt,
            Version = dataset.Version
        };
    }

    public static CuratedDatasetVersionDto ToDto(CuratedDatasetVersion version)
    {
        return new CuratedDatasetVersionDto
        {
            Id = version.Id,
            CuratedDatasetId = version.CuratedDatasetId,
            VersionNumber = version.VersionNumber,
            Status = version.Status,
            SourceSampleId = version.SourceSampleId,
            SourceRevision = version.SourceRevision,
            SourceSnapshotAt = version.SourceSnapshotAt,
            IsSynthetic = version.IsSynthetic,
            SampleLabel = version.SampleLabel,
            Description = version.Description,
            BiologicalContext = version.BiologicalContext,
            AssayContext = version.AssayContext,
            AnalysisSummary = version.AnalysisSummary,
            QcStatus = version.QcStatus,
            Provenance = version.Provenance,
            OwnershipBasis = version.OwnershipBasis,
            OwnershipEvidenceReference = version.OwnershipEvidenceReference,
            OwnershipConfirmedAt = version.OwnershipConfirmedAt,
            DeidentificationMethod = version.DeidentificationMethod,
            DeidentificationNotes = version.DeidentificationNotes,
            DeidentificationConfirmedAt = version.DeidentificationConfirmedAt,
            ReleaseNotes = version.ReleaseNotes,
            ContentChecksum = version.ContentChecksum,
            PublishedAt = version.PublishedAt,
            Files = version.Files
                .OrderBy(file => file.FileName, StringComparer.OrdinalIgnoreCase)
                .Select(ToDto)
                .ToList(),
            Version = version.Version
        };
    }

    public static DatasetGrantDto ToDto(OrganizationDatasetGrant grant)
    {
        return new DatasetGrantDto
        {
            Id = grant.Id,
            OrganizationId = grant.OrganizationId,
            OrganizationName = grant.Organization.Name,
            OrganizationKind = grant.Organization.Kind,
            CuratedDatasetId = grant.CuratedDatasetId,
            DatasetName = grant.CuratedDataset.Name,
            CuratedDatasetVersionId = grant.CuratedDatasetVersionId,
            DatasetVersionNumber = grant.CuratedDatasetVersion.VersionNumber,
            Status = grant.Status,
            GrantedAt = grant.GrantedAt,
            RevokedAt = grant.RevokedAt,
            RevocationReason = grant.RevocationReason,
            SupersededAt = grant.SupersededAt,
            Version = grant.Version
        };
    }

    public static DataGovernanceIncidentDto ToDto(DataGovernanceIncident incident)
    {
        return new DataGovernanceIncidentDto
        {
            Id = incident.Id,
            SourceSampleId = incident.SourceSampleId,
            SourceSampleLabel = incident.SourceSample.Label,
            Category = incident.Category,
            Status = incident.Status,
            Reason = incident.Reason,
            ExternalGuidance = incident.ExternalGuidance,
            InternalNotes = incident.InternalNotes,
            AttestationDueAt = incident.AttestationDueAt,
            AffectedDatasetVersionIds = incident.AffectedVersions
                .Select(item => item.CuratedDatasetVersionId)
                .ToList(),
            AffectedOrganizations = incident.AffectedOrganizations
                .OrderBy(item => item.Organization.Name)
                .Select(item => new DataGovernanceAffectedOrganizationDto
                {
                    OrganizationId = item.OrganizationId,
                    OrganizationName = item.Organization.Name,
                    OrganizationKind = item.Organization.Kind,
                    Status = item.Status,
                    AffectedGrantCount = item.AffectedGrantCount,
                    ReminderCount = item.ReminderCount,
                    LastRemindedAt = item.LastRemindedAt,
                    AttestedAt = item.AttestedAt,
                    AttestationSource = item.AttestationSource,
                    OrganizationContact = item.OrganizationContact,
                    EvidenceSource = item.EvidenceSource,
                    AttestationNotes = item.AttestationNotes,
                    Version = item.Version
                })
                .ToList(),
            FollowUps = incident.FollowUps
                .OrderByDescending(item => item.OccurredAt)
                .Select(item => new DataGovernanceFollowUpDto
                {
                    Id = item.Id,
                    OrganizationId = item.OrganizationId,
                    Kind = item.Kind,
                    Notes = item.Notes,
                    ActorUserId = item.ActorUserId,
                    OccurredAt = item.OccurredAt
                })
                .ToList(),
            ResolvedAt = incident.ResolvedAt,
            Resolution = incident.Resolution,
            CreatedAt = incident.CreatedAt,
            Version = incident.Version
        };
    }

    public static ProvisioningRunDto ToDto(ProvisioningRun run)
    {
        return new ProvisioningRunDto
        {
            Id = run.Id,
            OrganizationId = run.OrganizationId,
            DatasetVersionId = run.CuratedDatasetVersionId,
            Kind = run.Kind,
            Status = run.Status,
            IdempotencyKey = run.IdempotencyKey,
            RequestedAt = run.RequestedAt,
            CompletedAt = run.CompletedAt,
            GrantId = run.OrganizationDatasetGrantId,
            PreviousGrantId = run.PreviousOrganizationDatasetGrantId,
            FailureCode = run.FailureCode,
            FailureMessage = run.FailureMessage
        };
    }

    public static DataProvisioningNoticeDto ToDto(DataProvisioningNotice notice)
    {
        return new DataProvisioningNoticeDto
        {
            Id = notice.Id,
            Kind = notice.Kind,
            Subject = notice.Subject,
            Body = notice.Body,
            CreatedAt = notice.CreatedAt,
            IncidentId = notice.IncidentId
        };
    }

    public static TenantDatasetDto ToTenantDto(OrganizationDatasetGrant grant)
    {
        var version = grant.CuratedDatasetVersion;
        return new TenantDatasetDto
        {
            GrantId = grant.Id,
            DatasetId = grant.CuratedDatasetId,
            Name = grant.CuratedDataset.Name,
            Description = version.Description,
            DatasetVersionId = version.Id,
            VersionNumber = version.VersionNumber,
            SampleLabel = version.SampleLabel,
            BiologicalContext = version.BiologicalContext,
            AssayContext = version.AssayContext,
            AnalysisSummary = version.AnalysisSummary,
            QcStatus = version.QcStatus,
            Provenance = version.Provenance,
            ContentChecksum = version.ContentChecksum,
            PublishedAt = version.PublishedAt!.Value,
            Files = version.Files
                .OrderBy(file => file.FileName, StringComparer.OrdinalIgnoreCase)
                .Select(ToDto)
                .ToList()
        };
    }
}
