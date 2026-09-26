namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task ProcedureDeactivationRequiresPlatformAdminAndCurrentVersionWithoutRewritingHistory()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var request = new SampleShippingProcedureWriteRequest(null, null, $"PACK-{scope.Suffix}-PROCEDURE",
            "Synthetic shared packing", "Synthetic transit handling", "Synthetic carrier",
            "Synthetic dispatch", "Synthetic insert", "Synthetic exceptions", null, true);
        var procedure = await scope.ProcedureController().Create(request, default);
        scope.ClearTrackedState();

        var denied = await Assert.ThrowsAsync<OrderManagementException>(() => scope.ProcedureController(true)
            .Deactivate(procedure.Id, new(procedure.Version), default));
        Assert.Equal(403, denied.StatusCode);
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => scope.ProcedureController()
            .Deactivate(procedure.Id, new(procedure.Version + 1), default));
        scope.ClearTrackedState();

        var inactive = await scope.ProcedureController().Deactivate(procedure.Id, new(procedure.Version), default);
        Assert.False(inactive.IsActive);
        Assert.Equal(procedure.Revision, inactive.Revision);
        Assert.True(inactive.Version > procedure.Version);
        scope.ClearTrackedState();
        Assert.Equal(1, await scope.DbContext.SampleShippingProcedures.CountAsync(value => value.DefinitionKey == procedure.DefinitionKey));
        var staleRevision = await Assert.ThrowsAsync<OrderManagementException>(() => scope.ProcedureController()
            .Create(request with { SupersedesProcedureId = procedure.Id, SupersededVersion = procedure.Version }, default));
        Assert.Equal(409, staleRevision.StatusCode);
        var duplicate = await Assert.ThrowsAsync<OrderManagementException>(() => scope.ProcedureController()
            .Deactivate(procedure.Id, new(inactive.Version), default));
        Assert.Equal(409, duplicate.StatusCode);
    }

    [PostgreSqlReferenceFact]
    public async Task ProcedureRevisionStatusKeepsDraftPredecessorAndRetiresItOnActivation()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var request = new SampleShippingProcedureWriteRequest(null, null, $"PACK-{scope.Suffix}-PROCEDURE",
            "Synthetic shared packing", "Synthetic transit handling", "Synthetic carrier",
            "Synthetic dispatch", "Synthetic insert", "Synthetic exceptions", null, true,
            "Common handling for frozen synthetic samples.");
        var first = await scope.ProcedureController().Create(request, default);
        Assert.Equal(request.Description, first.Description);
        scope.ClearTrackedState();
        var draft = await scope.ProcedureController().Create(request with {
            SupersedesProcedureId = first.Id, SupersededVersion = first.Version, IsActive = false }, default);
        Assert.Equal(request.Description, draft.Description);
        scope.ClearTrackedState();
        Assert.Equal(request.Description, (await scope.DbContext.SampleShippingProcedures.AsNoTracking()
            .SingleAsync(item => item.Id == draft.Id)).Description);
        Assert.True((await scope.DbContext.SampleShippingProcedures.AsNoTracking().SingleAsync(item => item.Id == first.Id)).IsActive);
        Assert.False(draft.IsActive);

        var denied = await Assert.ThrowsAsync<OrderManagementException>(() => scope.ProcedureController(true)
            .SetStatus(draft.Id, new(true, draft.Version), default));
        Assert.Equal(403, denied.StatusCode);
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => scope.ProcedureController()
            .SetStatus(draft.Id, new(true, draft.Version + 1), default));
        scope.ClearTrackedState();

        var active = await scope.ProcedureController().SetStatus(draft.Id, new(true, draft.Version), default);
        scope.ClearTrackedState();
        Assert.True(active.IsActive);
        Assert.False((await scope.DbContext.SampleShippingProcedures.AsNoTracking().SingleAsync(item => item.Id == first.Id)).IsActive);
        Assert.Equal(1, await scope.DbContext.SampleShippingProcedures.AsNoTracking().CountAsync(item => item.DefinitionKey == first.DefinitionKey && item.IsActive));

        var third = await scope.ProcedureController().Create(request with {
            SupersedesProcedureId = active.Id, SupersededVersion = active.Version }, default);
        scope.ClearTrackedState();
        Assert.True(third.IsActive);
        Assert.False((await scope.DbContext.SampleShippingProcedures.AsNoTracking().SingleAsync(item => item.Id == active.Id)).IsActive);
        Assert.Equal(1, await scope.DbContext.SampleShippingProcedures.AsNoTracking().CountAsync(item => item.DefinitionKey == first.DefinitionKey && item.IsActive));
        var firstVersion = (await scope.DbContext.SampleShippingProcedures.AsNoTracking()
            .SingleAsync(item => item.Id == first.Id)).Version;
        var historical = await Assert.ThrowsAsync<OrderManagementException>(() => scope.ProcedureController()
            .SetStatus(first.Id, new(true, firstVersion), default));
        Assert.Equal("shipping_procedure_already_superseded", historical.ErrorCode);

        scope.ClearTrackedState();
        var staleActiveFlag = await scope.DbContext.SampleShippingProcedures.SingleAsync(item => item.Id == first.Id);
        staleActiveFlag.Activate();
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();
        Assert.Equal(2, await scope.DbContext.SampleShippingProcedures.AsNoTracking()
            .CountAsync(item => item.DefinitionKey == first.DefinitionKey && item.IsActive));
        var stopped = await scope.ProcedureController().SetStatus(third.Id, new(false, third.Version), default);
        scope.ClearTrackedState();
        Assert.False(stopped.IsActive);
        Assert.Equal(0, await scope.DbContext.SampleShippingProcedures.AsNoTracking()
            .CountAsync(item => item.DefinitionKey == first.DefinitionKey && item.IsActive));
    }

    [PostgreSqlReferenceFact]
    public async Task SampleTypeRevisionCarriesItsProcedureRelationship()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var controller = scope.CreateConfigurationController();
        var first = await controller.CreateSampleType(scope.SampleTypeRequest(DateTime.UtcNow.AddDays(-2)), default);
        scope.ClearTrackedState();

        var next = await controller.CreateSampleType(scope.SampleTypeRequest(
            DateTime.UtcNow.AddDays(-1), first.Id, first.Version, "Reference RNA revised")
            with { ShippingProcedureId = null }, default);

        Assert.Equal(2, next.Revision);
        Assert.Equal(scope.DefaultProcedureId, next.ShippingProcedureId);
        Assert.Equal(first.DefinitionKey, next.DefinitionKey);
        Assert.Single(await scope.DbContext.SampleTypeProcedureLinks.AsNoTracking()
            .Where(link => link.SampleTypeAnchorId == first.Id).ToListAsync());
    }

    [PostgreSqlReferenceFact]
    public async Task NewSampleTypeRequiresOneProcedure()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var error = await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.CreateConfigurationController().CreateSampleType(
                scope.SampleTypeRequest(DateTime.UtcNow.AddDays(-1)) with { ShippingProcedureId = null }, default));
        Assert.Equal("shipping_procedure_required", error.ErrorCode);
    }
    private sealed partial class ShippingTestScope
    {
        public SampleShippingProceduresController ProcedureController(bool customer = false) => new(DbContext,
            new OrderRequestContext(DbContext, new FixedIdentityContext(customer ? customerIdentity : platformIdentity)))
            { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() } };

        private async Task CleanupShippingProceduresAsync()
        {
            var procedures = await DbContext.SampleShippingProcedures.Where(value => value.Name == $"PACK-{Suffix}-PROCEDURE" || value.Name == $"REF_{Suffix}_PROCEDURE")
                .OrderByDescending(value => value.Revision).Select(value => value.Id).ToArrayAsync();
            foreach (var id in procedures) await DbContext.SampleShippingProcedures.Where(value => value.Id == id).ExecuteDeleteAsync();
        }
    }
}
