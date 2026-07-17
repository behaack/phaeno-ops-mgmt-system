namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.DataProvisioning.Domain;
using PSeq.Operations.Laboratory;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Features.Website.Entities;

public class PersistenceTests
{
    [Fact]
    public void PSeqOperationsDbContextMapsEveryEntityToItsOwningSchema()
    {
        using var dbContext = CreateDbContext();
        var entityTypes = dbContext.Model.GetEntityTypes().ToList();
        var commercialAssembly = typeof(CommercialAssembly).Assembly;
        var laboratoryAssembly = typeof(LaboratoryAssembly).Assembly;

        Assert.Null(dbContext.Model.GetDefaultSchema());
        Assert.NotEmpty(entityTypes);
        Assert.All(
            entityTypes,
            entityType => Assert.True(
                entityType.GetSchema() is "commercial_ops" or "lab_ops" or "website"));
        Assert.All(
            entityTypes.Where(entityType => entityType.ClrType.Assembly == commercialAssembly),
            entityType => Assert.Equal("commercial_ops", entityType.GetSchema()));
        Assert.All(
            entityTypes.Where(entityType => entityType.ClrType.Assembly == laboratoryAssembly),
            entityType => Assert.Equal("lab_ops", entityType.GetSchema()));
        Assert.All(
            entityTypes.Where(entityType =>
                entityType.ClrType.Namespace?.StartsWith(
                    "PhaenoPortal.App.Features.Website",
                    StringComparison.Ordinal) == true),
            entityType => Assert.Equal("website", entityType.GetSchema()));
        Assert.DoesNotContain(entityTypes, entityType => entityType.GetSchema() == "portal");
        Assert.DoesNotContain(entityTypes, entityType => entityType.GetSchema() == "public");
    }

    [Fact]
    public void PSeqOperationsDbContextMapsWebsiteEntitiesToWebsiteSchema()
    {
        using var dbContext = CreateDbContext();

        var contactEntity = dbContext.Model.FindEntityType(typeof(WebContact));
        Assert.NotNull(contactEntity);
        Assert.Equal("website", contactEntity.GetSchema());
        Assert.Equal("web_contacts", contactEntity.GetTableName());
        Assert.Equal(
            "normalized_email",
            contactEntity.FindProperty(nameof(WebContact.NormalizedEmail))?.GetColumnName());
        Assert.Contains(
            contactEntity.GetIndexes(),
            index => index.IsUnique
                && index.Properties.Select(property => property.Name)
                    .SequenceEqual([nameof(WebContact.NormalizedEmail)]));

        var orderEntity = dbContext.Model.FindEntityType(typeof(WebOrder));
        Assert.NotNull(orderEntity);
        Assert.Equal("website", orderEntity.GetSchema());
        Assert.Equal("web_orders", orderEntity.GetTableName());
        Assert.Equal(
            "organization_name",
            orderEntity.FindProperty(nameof(WebOrder.OrganizationName))?.GetColumnName());
    }

    [Fact]
    public void PSeqOperationsDbContextMapsCompleteLaboratoryModelWithoutCommercialForeignKeys()
    {
        using var dbContext = CreateDbContext();
        var laboratoryAssembly = typeof(LaboratoryAssembly).Assembly;
        var laboratoryEntities = dbContext.Model.GetEntityTypes()
            .Where(entityType => entityType.ClrType.Assembly == laboratoryAssembly)
            .ToList();

        Assert.Equal(22, laboratoryEntities.Count);
        Assert.Equal(
            "lab_work_orders",
            dbContext.Model.FindEntityType(typeof(LabWorkOrder))?.GetTableName());
        Assert.Equal(
            "lab_work_authorization_versions",
            dbContext.Model.FindEntityType(typeof(LabWorkAuthorizationVersion))?.GetTableName());
        Assert.Equal(
            "lab_specimens",
            dbContext.Model.FindEntityType(typeof(LabSpecimen))?.GetTableName());
        Assert.Equal(
            "lab_work_events",
            dbContext.Model.FindEntityType(typeof(LabWorkEvent))?.GetTableName());
        Assert.Equal(
            "lab_scientific_approvals",
            dbContext.Model.FindEntityType(typeof(LabScientificApproval))?.GetTableName());
        Assert.Equal(
            "lab_provider_command_receipts",
            dbContext.Model.FindEntityType(typeof(LabProviderCommandReceipt))?.GetTableName());
        Assert.Equal("lab_role_assignments", dbContext.Model.FindEntityType(typeof(LabRoleAssignment))?.GetTableName());
        Assert.Equal("lab_containers", dbContext.Model.FindEntityType(typeof(LabContainer))?.GetTableName());
        Assert.Equal("lab_protocols", dbContext.Model.FindEntityType(typeof(LabProtocol))?.GetTableName());
        Assert.Equal("lab_protocol_versions", dbContext.Model.FindEntityType(typeof(LabProtocolVersion))?.GetTableName());
        Assert.Equal("lab_protocol_executions", dbContext.Model.FindEntityType(typeof(LabProtocolExecution))?.GetTableName());
        Assert.Equal("lab_material_lots", dbContext.Model.FindEntityType(typeof(LabMaterialLot))?.GetTableName());
        Assert.Equal("lab_material_consumptions", dbContext.Model.FindEntityType(typeof(LabMaterialConsumption))?.GetTableName());
        Assert.Equal("lab_equipment", dbContext.Model.FindEntityType(typeof(LabEquipment))?.GetTableName());
        Assert.Equal("lab_equipment_usages", dbContext.Model.FindEntityType(typeof(LabEquipmentUsage))?.GetTableName());
        Assert.Equal("lab_libraries", dbContext.Model.FindEntityType(typeof(LabLibrary))?.GetTableName());
        Assert.Equal("lab_operational_batches", dbContext.Model.FindEntityType(typeof(LabOperationalBatch))?.GetTableName());
        Assert.Equal("lab_batch_members", dbContext.Model.FindEntityType(typeof(LabBatchMember))?.GetTableName());
        Assert.Equal("lab_ngs_sendouts", dbContext.Model.FindEntityType(typeof(LabNgsSendout))?.GetTableName());
        Assert.Equal("lab_custody_events", dbContext.Model.FindEntityType(typeof(LabCustodyEvent))?.GetTableName());
        Assert.Equal("lab_exceptions", dbContext.Model.FindEntityType(typeof(LabException))?.GetTableName());
        Assert.Equal("lab_operations_outbox_events", dbContext.Model.FindEntityType(typeof(LabOperationsOutboxEvent))?.GetTableName());
        Assert.All(laboratoryEntities, entityType => Assert.Equal("lab_ops", entityType.GetSchema()));
        Assert.DoesNotContain(
            laboratoryEntities.SelectMany(entityType => entityType.GetForeignKeys()),
            foreignKey => foreignKey.PrincipalEntityType.ClrType.Assembly != laboratoryAssembly);
    }

    [Fact]
    public void PSeqOperationsDbContextMapsAccountEntities()
    {
        using var dbContext = CreateDbContext();

        var organizationEntity = dbContext.Model.FindEntityType(typeof(Organization));
        Assert.NotNull(organizationEntity);
        Assert.Equal("commercial_ops", organizationEntity.GetSchema());
        Assert.Equal("organizations", organizationEntity.GetTableName());
        Assert.Equal("id", organizationEntity.FindProperty(nameof(Organization.Id))?.GetColumnName());
        Assert.Equal("is_active", organizationEntity.FindProperty(nameof(Organization.IsActive))?.GetColumnName());
        Assert.Contains(
            organizationEntity.GetIndexes(),
            index => index.IsUnique
                && index.Properties.Select(property => property.Name).SequenceEqual([nameof(Organization.Name)]));
        var organizationVersionProperty = organizationEntity.FindProperty(nameof(Organization.Version));
        Assert.NotNull(organizationVersionProperty);
        Assert.False(organizationVersionProperty.IsNullable);
        Assert.True(organizationVersionProperty.IsConcurrencyToken);
        var organizationIsActiveProperty = organizationEntity.FindProperty(nameof(Organization.IsActive));
        Assert.NotNull(organizationIsActiveProperty);
        Assert.False(organizationIsActiveProperty.IsNullable);

        var userEntity = dbContext.Model.FindEntityType(typeof(User));
        Assert.NotNull(userEntity);
        Assert.Equal("commercial_ops", userEntity.GetSchema());
        Assert.Equal("users", userEntity.GetTableName());
        Assert.Equal("id", userEntity.FindProperty(nameof(User.Id))?.GetColumnName());
        Assert.Equal("normalized_email", userEntity.FindProperty(nameof(User.NormalizedEmail))?.GetColumnName());
        Assert.Contains(
            userEntity.GetIndexes(),
            index => index.IsUnique
                && index.Properties.Select(property => property.Name).SequenceEqual([nameof(User.NormalizedEmail)]));
        Assert.Contains(
            userEntity.GetIndexes(),
            index => index.IsUnique
                && index.Properties.Select(property => property.Name).SequenceEqual([
                    nameof(User.ExternalIdentityProvider),
                    nameof(User.ExternalSubjectId)
                ]));
        var userVersionProperty = userEntity.FindProperty(nameof(User.Version));
        Assert.NotNull(userVersionProperty);
        Assert.False(userVersionProperty.IsNullable);
        Assert.True(userVersionProperty.IsConcurrencyToken);

        var membershipEntity = dbContext.Model.FindEntityType(typeof(OrganizationMembership));
        Assert.NotNull(membershipEntity);
        Assert.Equal("commercial_ops", membershipEntity.GetSchema());
        Assert.Equal("organization_memberships", membershipEntity.GetTableName());
        Assert.Equal("id", membershipEntity.FindProperty(nameof(OrganizationMembership.Id))?.GetColumnName());
        Assert.Equal("user_id", membershipEntity.FindProperty(nameof(OrganizationMembership.UserId))?.GetColumnName());
        Assert.Equal("organization_id", membershipEntity.FindProperty(nameof(OrganizationMembership.OrganizationId))?.GetColumnName());
        Assert.Contains(
            membershipEntity.GetIndexes(),
            index => index.IsUnique
                && index.Properties.Select(property => property.Name).SequenceEqual([
                    nameof(OrganizationMembership.UserId),
                    nameof(OrganizationMembership.OrganizationId)
                ]));
        var membershipVersionProperty = membershipEntity.FindProperty(nameof(OrganizationMembership.Version));
        Assert.NotNull(membershipVersionProperty);
        Assert.False(membershipVersionProperty.IsNullable);
        Assert.True(membershipVersionProperty.IsConcurrencyToken);
        Assert.Contains(
            membershipEntity.GetForeignKeys(),
            foreignKey => foreignKey.PrincipalEntityType.ClrType == typeof(User)
                && foreignKey.DeleteBehavior == DeleteBehavior.Restrict);
        Assert.Contains(
            membershipEntity.GetForeignKeys(),
            foreignKey => foreignKey.PrincipalEntityType.ClrType == typeof(Organization));

        var invitationEntity = dbContext.Model.FindEntityType(typeof(OrganizationInvitation));
        Assert.NotNull(invitationEntity);
        Assert.Equal("commercial_ops", invitationEntity.GetSchema());
        Assert.Equal("organization_invitations", invitationEntity.GetTableName());
        Assert.Equal("id", invitationEntity.FindProperty(nameof(OrganizationInvitation.Id))?.GetColumnName());
        Assert.Equal("organization_id", invitationEntity.FindProperty(nameof(OrganizationInvitation.OrganizationId))?.GetColumnName());
        Assert.Equal("accepted_by_user_id", invitationEntity.FindProperty(nameof(OrganizationInvitation.AcceptedByUserId))?.GetColumnName());
        Assert.Equal("revoked_by_user_id", invitationEntity.FindProperty(nameof(OrganizationInvitation.RevokedByUserId))?.GetColumnName());
        Assert.Contains(
            invitationEntity.GetIndexes(),
            index => index.IsUnique
                && index.Properties.Select(property => property.Name).SequenceEqual([
                    nameof(OrganizationInvitation.OrganizationId),
                    nameof(OrganizationInvitation.NormalizedEmail),
                    nameof(OrganizationInvitation.Status)
                ]));
        Assert.Contains(
            invitationEntity.GetIndexes(),
            index => index.IsUnique
                && index.Properties.Select(property => property.Name).SequenceEqual([nameof(OrganizationInvitation.TokenHash)]));
        var invitationVersionProperty = invitationEntity.FindProperty(nameof(OrganizationInvitation.Version));
        Assert.NotNull(invitationVersionProperty);
        Assert.False(invitationVersionProperty.IsNullable);
        Assert.True(invitationVersionProperty.IsConcurrencyToken);

        var auditEventEntity = dbContext.Model.FindEntityType(typeof(AuditEvent));
        Assert.NotNull(auditEventEntity);
        Assert.Equal("commercial_ops", auditEventEntity.GetSchema());
        Assert.Equal("audit_events", auditEventEntity.GetTableName());
        Assert.Equal("id", auditEventEntity.FindProperty(nameof(AuditEvent.Id))?.GetColumnName());
        Assert.Equal("actor_user_id", auditEventEntity.FindProperty(nameof(AuditEvent.ActorUserId))?.GetColumnName());
        var changesJsonProperty = auditEventEntity.FindProperty(nameof(AuditEvent.ChangesJson));
        Assert.NotNull(changesJsonProperty);
        Assert.Equal("jsonb", changesJsonProperty.GetColumnType());
    }

    [Fact]
    public void PSeqOperationsDbContextMapsDataProvisioningEntitiesAndTenantBoundaries()
    {
        using var dbContext = CreateDbContext();

        var sourceEntity = dbContext.Model.FindEntityType(typeof(SourceSample));
        Assert.NotNull(sourceEntity);
        Assert.Equal("source_samples", sourceEntity.GetTableName());
        Assert.True(sourceEntity.FindProperty(nameof(SourceSample.Version))?.IsConcurrencyToken);

        var managedFileEntity = dbContext.Model.FindEntityType(typeof(ManagedFile));
        Assert.NotNull(managedFileEntity);
        Assert.Equal("managed_files", managedFileEntity.GetTableName());
        Assert.Contains(
            managedFileEntity.GetIndexes(),
            index => index.IsUnique
                && index.Properties.Select(property => property.Name)
                    .SequenceEqual([nameof(ManagedFile.StorageKey)]));

        var datasetEntity = dbContext.Model.FindEntityType(typeof(CuratedDataset));
        Assert.NotNull(datasetEntity);
        Assert.Equal("curated_datasets", datasetEntity.GetTableName());

        var versionEntity = dbContext.Model.FindEntityType(typeof(CuratedDatasetVersion));
        Assert.NotNull(versionEntity);
        Assert.Equal("curated_dataset_versions", versionEntity.GetTableName());
        Assert.Equal(
            "jsonb",
            versionEntity.FindProperty(nameof(CuratedDatasetVersion.ManifestJson))?.GetColumnType());

        var grantEntity = dbContext.Model.FindEntityType(typeof(OrganizationDatasetGrant));
        Assert.NotNull(grantEntity);
        Assert.Equal("organization_dataset_grants", grantEntity.GetTableName());
        Assert.Contains(
            grantEntity.GetIndexes(),
            index => index.IsUnique
                && index.Properties.Select(property => property.Name).SequenceEqual([
                    nameof(OrganizationDatasetGrant.OrganizationId),
                    nameof(OrganizationDatasetGrant.CuratedDatasetId)
                ])
                && index.GetFilter() == "\"status\" = 'Active'");

        Assert.Equal(
            "provisioning_runs",
            dbContext.Model.FindEntityType(typeof(ProvisioningRun))?.GetTableName());
        Assert.Equal(
            "dataset_download_audits",
            dbContext.Model.FindEntityType(typeof(DatasetDownloadAudit))?.GetTableName());
        Assert.Equal(
            "data_governance_incidents",
            dbContext.Model.FindEntityType(typeof(DataGovernanceIncident))?.GetTableName());
        Assert.Equal(
            "data_governance_affected_versions",
            dbContext.Model.FindEntityType(typeof(DataGovernanceAffectedVersion))?.GetTableName());
        Assert.Equal(
            "data_governance_affected_organizations",
            dbContext.Model.FindEntityType(typeof(DataGovernanceAffectedOrganization))?.GetTableName());
        Assert.Equal(
            "data_governance_follow_ups",
            dbContext.Model.FindEntityType(typeof(DataGovernanceFollowUp))?.GetTableName());
        Assert.Equal(
            "data_provisioning_notices",
            dbContext.Model.FindEntityType(typeof(DataProvisioningNotice))?.GetTableName());
    }

    private static PSeqOperationsDbContext CreateDbContext()
    {
        var dbContextOptions = new DbContextOptionsBuilder<PSeqOperationsDbContext>()
            .UseNpgsql("Host=localhost;Database=phaeno_portal_test;Username=postgres;Password=postgres")
            .Options;

        return new PSeqOperationsDbContext(
            dbContextOptions,
            Options.Create(new PersistenceOptions()));
    }
}
