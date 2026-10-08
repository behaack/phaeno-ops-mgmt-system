namespace PhaenoPortal.Test;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task LabStepNameIsUniqueEditableAndCreatedWithAnUnconfiguredDraft()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var controller = scope.CreateLabController();
            var originalName = $"TEST catalog step {scope.Suffix}";
            var step = await controller.CreateLabStep(new(originalName, null), default);
            Assert.Equal(1, step.LatestVersion);
            Assert.Equal("Draft", Assert.Single(step.Versions).Status);
            Assert.Equal(LabStepVersion.UnconfiguredDefinitionJson, step.Versions[0].DefinitionJson);
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.CreateLabStep(new(originalName.ToLowerInvariant(), null), default));
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.TransitionLabStep(step.Id,
                new("approve", step.Version, step.Versions[0].Id, ApprovalOverrideReason: "TEST ONLY"), default));

            step = await controller.SaveLabStepVersion(step.Id, new(LabStepTests.Definition().ToJson(), step.Version, step.Versions[0].Id), default);
            Assert.Equal(originalName, LabProtocolDefinition.Parse(step.Versions[0].DefinitionJson).Steps[0].Name);
            var revisedName = $"TEST renamed step {scope.Suffix}";
            step = await controller.UpdateLabStep(step.Id, new(revisedName, "TEST ONLY description", step.Version), default);
            Assert.Equal(revisedName, step.Name);
            Assert.Equal(revisedName, LabProtocolDefinition.Parse(step.Versions[0].DefinitionJson).Steps[0].Name);
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.CreateLabStep(new(revisedName.ToLowerInvariant(), null), default));
            var other = await controller.CreateLabStep(new($"TEST other step {scope.Suffix}", null), default);
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.UpdateLabStep(other.Id,
                new(revisedName.ToLowerInvariant(), null, other.Version), default));

            step = await controller.TransitionLabStep(step.Id, new("approve", step.Version, step.Versions[0].Id,
                ApprovalOverrideReason: "TEST ONLY explicit administrator override"), default);
            step = await controller.UpdateLabStep(step.Id, new($"TEST later name {scope.Suffix}", step.Description, step.Version), default);
            Assert.Equal(revisedName, LabProtocolDefinition.Parse(step.Versions[0].DefinitionJson).Steps[0].Name);
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }

    [PostgreSqlReferenceFact]
    public async Task LabStepMaterialConfigurationResolvesProductSnapshotOnSave()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var db = scope.DbContext; var controller = scope.CreateLabController();
            var supplier = new LabSupplier($"TEST vendor {scope.Suffix}");
            var type = new LabProductType($"TEST type {scope.Suffix}", "TEST ONLY", LabSupplierProductKind.Other);
            var product = new LabSupplierProduct(supplier.Id, "PRODUCT-1", "Configured reagent", type.Id);
            db.AddRange(supplier, type, product); await db.SaveChangesAsync();
            var step = await controller.CreateLabStep(new($"TEST material {scope.Suffix}", null), default);
            var source = LabStepTests.Definition();
            var definition = source with { Steps = [source.Steps[0] with { Captures = [new() {
                Key = "material", Label = "Reagent used", Type = "material", Unit = "µL", Required = true, Scope = "batch", IncludeTracking = true,
                Material = new("Client supplied name", "Client vendor", product.Id, supplier.Id, "Wrong number")
            }] }] };
            step = await controller.SaveLabStepVersion(step.Id, new(definition.ToJson(), step.Version), default);
            var material = LabProtocolDefinition.Parse(step.Versions.Single().DefinitionJson).Steps[0].Captures[0].Material!;
            Assert.Equal(product.Description, material.Name);
            Assert.Equal(supplier.Name, material.Vendor);
            Assert.Equal(product.ProductNumber, material.ProductNumber);
            Assert.Equal(product.Id, material.ProductId);
            supplier.Rename("Changed after draft save"); await db.SaveChangesAsync();
            var retained = (await controller.ReadLabSteps(default)).Single(s => s.Id == step.Id);
            Assert.Equal(material, LabProtocolDefinition.Parse(retained.Versions.Single().DefinitionJson).Steps[0].Captures[0].Material);
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }

    [PostgreSqlReferenceFact]
    public async Task LabStepPinsRejectOverridesAndNewRetiredSelectionsWhilePreservingExistingOccurrences()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        var ct = CancellationToken.None; var controller = scope.CreateLabController();
        try
        {
            var step = await controller.CreateLabStep(new($"TEST ONLY step {scope.Suffix}", null), ct);
            var definition = LabStepTests.Definition();
            step = await controller.SaveLabStepVersion(step.Id, new(definition.ToJson(), step.Version), ct);
            var versionId = step.Versions.Single().Id;
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.TransitionLabStep(step.Id, new("approve", step.Version, versionId), ct));
            step = await controller.TransitionLabStep(step.Id, new("approve", step.Version, versionId, ApprovalOverrideReason: "TEST ONLY explicit administrator override"), ct);
            var savedDefinition = LabProtocolDefinition.Parse(step.Versions.Single().DefinitionJson);
            var pinned = savedDefinition with { Steps = [savedDefinition.Steps[0] with { Key = "first", LabStepVersionId = versionId }, savedDefinition.Steps[0] with { Key = "second", LabStepVersionId = versionId }] };
            var protocol = await controller.CreateProtocol(new($"TEST ONLY composed {scope.Suffix}", null), ct);
            protocol = await controller.CreateProtocolVersion(protocol.Id, new(pinned.ToJson(), protocol.Version), ct);
            var draft = protocol.Versions.Single();
            var altered = pinned with { Steps = [pinned.Steps[0] with { Instructions = "Unapproved replacement" }, pinned.Steps[1]] };
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.UpdateProtocolVersion(draft.Id, new(altered.ToJson(), protocol.Version), ct));
            var detached = pinned with { Steps = [pinned.Steps[0] with { LabStepVersionId = null }, pinned.Steps[1]] };
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.UpdateProtocolVersion(draft.Id, new(detached.ToJson(), protocol.Version), ct));
            step = (await controller.ReadLabSteps(ct)).Single(s => s.Id == step.Id);
            Assert.Equal(2, step.UsedBy.Count);
            var stale = step.Version;
            step = await controller.TransitionLabStep(step.Id, new("retire", step.Version, Reason: "TEST ONLY retire"), ct);
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.SaveLabStepVersion(step.Id, new(definition.ToJson(), stale), ct));
            protocol = await controller.UpdateProtocolVersion(draft.Id, new(pinned.ToJson(), protocol.Version), ct);
            Assert.Equal(pinned.ToJson(), LabProtocolDefinition.Parse(protocol.Versions.Single().DefinitionJson).ToJson());
            var newOccurrence = pinned with { Steps = [.. pinned.Steps, pinned.Steps[0] with { Key = "third" }] };
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.UpdateProtocolVersion(draft.Id, new(newOccurrence.ToJson(), protocol.Version), ct));
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }
}
