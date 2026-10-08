namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;

[System.Text.Json.Serialization.JsonUnmappedMemberHandling(System.Text.Json.Serialization.JsonUnmappedMemberHandling.Disallow)]
public sealed record CustomerStandardDraftWrite(CustomerStandardOrderDraft Draft, long? Version = null);
public sealed record CustomerStandardReviewDto(LabServiceOrderDto Order, StandardLabOrderPreviewDto Preview);

public sealed partial class LabServiceOrdersController
{
    [HttpPost("customer-drafts")]
    public async Task<LabServiceOrderDto> CreateCustomerDraft([FromBody] CustomerStandardDraftWrite request, CancellationToken token)
    {
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, true, token);
        RequireCustomer(tenant.Organization.Kind);
        var execution = await idempotency.ExecuteAsync(tenant.Actor.Id,
            $"customer-lab-draft:{tenant.Organization.Id}:{tenant.Department.Id}:create", idempotency.RequireKey(HttpContext), request,
            async ct =>
            {
                Execute(() => request.Draft.Validate(false));
                await EnsureUniqueJobNameAsync(tenant.Organization.Id, tenant.Department.Id,
                    NormalizeJobName(request.Draft.JobName), null, ct);
                var config = await dbContext.OrderSystemConfigurations.AsNoTracking().OrderBy(c => c.CreatedAt).FirstOrDefaultAsync(ct);
                var order = LabServiceOrder.CreateCustomerDraft(tenant.Organization.Id, tenant.Department.Id,
                    await GenerateUniqueJobNumberAsync(ct), request.Draft,
                    tenant.Configuration.ShippingInstructions ?? config?.SampleSubmissionInstructions ?? "");
                dbContext.LabServiceOrders.Add(order);
                dbContext.OrderStatusEvents.Add(NewEvent(order, "Created", order.Status.ToString(), tenant.Actor.Id));
                await dbContext.SaveChangesAsync(ct);
                return await MapAsync(order, true, false, ct);
            }, StatusCodes.Status201Created, token, isolationLevel: IsolationLevel.Serializable);
        await ReadOrderAsync(execution.Response.Id, tenant, token);
        Response.StatusCode = execution.StatusCode;
        return execution.Response;
    }

    [HttpPatch("{orderId:guid}/customer-draft")]
    public async Task<LabServiceOrderDto> SaveCustomerDraft(Guid orderId, [FromBody] CustomerStandardDraftWrite request, CancellationToken token)
    {
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, true, token);
        RequireCustomer(tenant.Organization.Kind);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, token);
        var order = await ReadOrderAsync(orderId, tenant, token);
        EnsureVersion(order.Version, request.Version);
        if (order.CustomerDraftJson is null) throw Conflict("customer_draft_required", "This order uses a different entry workflow.");
        Execute(() => order.SaveCustomerDraft(request.Draft));
        await EnsureUniqueJobNameAsync(tenant.Organization.Id, tenant.Department.Id,
            NormalizeJobName(request.Draft.JobName), order.Id, token);
        ResetCustomerReviewScope(order);
        await dbContext.SaveChangesAsync(token);
        await transaction.CommitAsync(token);
        return await MapAsync(order, true, false, token);
    }

    [HttpPost("{orderId:guid}/customer-review")]
    public async Task<CustomerStandardReviewDto> ReviewCustomerDraft(Guid orderId, [FromBody] VersionRequest request, CancellationToken token)
    {
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, true, token);
        RequireCustomer(tenant.Organization.Kind);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, token);
        var order = await ReadOrderAsync(orderId, tenant, token);
        EnsureVersion(order.Version, request.Version);
        var draft = order.ReadCustomerDraft() ?? throw Conflict("customer_draft_required", "Save a Customer Draft first.");
        Execute(() => draft.Validate(true));
        var sampleType = await Services.LabOrderSampleTypeChoices.RequireAsync(dbContext, draft.SampleTypeDefinitionId, token);
        ResetCustomerReviewScope(order);
        Execute(() => order.PrepareCustomerReview(sampleType.Id, sampleType.MaterialClass, sampleType.TemperatureRequirements));
        dbContext.AddRange(order.SourceGroups);
        dbContext.AddRange(order.Phases);
        await dbContext.SaveChangesAsync(token);
        var preview = await BuildStandardPreviewAsync(order, tenant, draft.OfferingId!.Value, token);
        var result = new CustomerStandardReviewDto(await MapAsync(order, true, false, token), preview);
        await transaction.CommitAsync(token);
        return result;
    }

    private void ResetCustomerReviewScope(LabServiceOrder order)
    {
        dbContext.RemoveRange(order.SourceGroups); order.SourceGroups.Clear();
        dbContext.RemoveRange(order.Phases); order.Phases.Clear();
    }
    private static void RequireCustomer(OrganizationKind kind)
    {
        if (kind != OrganizationKind.Customer) throw new Services.OrderManagementException("customer_required", "This ordering flow requires a Customer organization.", 403);
    }
}
