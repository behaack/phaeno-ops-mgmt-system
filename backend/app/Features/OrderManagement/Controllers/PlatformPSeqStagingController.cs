namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record StageEligibleCustomerDto(
    Guid OrganizationId, string OrganizationName, string Readiness,
    bool CanStageOrder, bool CanIssueQuote,
    IReadOnlyList<PSeq.Operations.Commercial.Relationships.Application.OperationalReadinessBlocker> Blockers);
public sealed record CreateStagedPSeqOrderRequest(
    Guid OrganizationId, string? CustomerReference,
    IReadOnlyList<LabSampleWriteRequest> Samples);

[ApiController]
[Authorize]
[Route("api/platform/pseq-staging")]
public sealed class PlatformPSeqStagingController(
    PSeqOperationsDbContext dbContext,
    OrderRequestContext requestContext,
    IOptions<PSeqOrderToCashOptions> rolloutOptions) : ControllerBase
{
    [HttpGet("customers")]
    public async Task<IReadOnlyList<StageEligibleCustomerDto>> Customers(CancellationToken cancellationToken)
    {
        await RequireOperatorAsync(cancellationToken);
        var customerIds = await dbContext.Organizations.AsNoTracking()
            .Where(item => item.IsActive && item.Kind == OrganizationKind.Customer)
            .OrderBy(item => item.Name).Select(item => item.Id).ToListAsync(cancellationToken);
        var service = new OperationalReadinessService(dbContext);
        var result = new List<StageEligibleCustomerDto>(customerIds.Count);
        foreach (var customerId in customerIds)
        {
            var readiness = await service.EvaluateAsync(customerId, cancellationToken);
            result.Add(new StageEligibleCustomerDto(readiness.OrganizationId, readiness.OrganizationName,
                readiness.Evaluation.State.ToString(), readiness.Evaluation.CanStageOrder,
                readiness.Evaluation.CanIssueQuote, readiness.Evaluation.Blockers));
        }
        return result;
    }

    [HttpPost("orders")]
    public async Task<LabServiceOrderDto> CreateStagedOrder(
        [FromBody] CreateStagedPSeqOrderRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireOperatorAsync(cancellationToken);
        var readiness = await new OperationalReadinessService(dbContext)
            .EvaluateAsync(request.OrganizationId, cancellationToken);
        if (!readiness.Evaluation.CanStageOrder)
            throw new OrderManagementException("customer_not_stage_eligible",
                "Resolve the active Customer, PSeq entitlement, and offering blockers before staging an order.",
                StatusCodes.Status409Conflict, readiness.Evaluation.Blockers);
        if (request.Samples.Count == 0)
            throw new OrderManagementException("samples_required", "A staged order requires at least one sample.");
        if (request.Samples.Select(item => item.CustomerSampleId.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase).Count() != request.Samples.Count)
            throw new OrderManagementException("duplicate_customer_sample_id", "Sample identifiers must be unique within the staged order.");
        var analysisIds = request.Samples.SelectMany(item => item.AnalysisDefinitionIds).Distinct().ToList();
        if (analysisIds.Count == 0 || await dbContext.AnalysisDefinitions.AsNoTracking()
            .CountAsync(item => analysisIds.Contains(item.Id) && item.IsActive && !item.IsSynthetic, cancellationToken) != analysisIds.Count)
            throw new OrderManagementException("analysis_definition_unavailable", "Every staged sample requires an active PSeq analysis offering.");
        var config = await dbContext.OrderSystemConfigurations.AsNoTracking().OrderBy(item => item.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        var order = new LabServiceOrder(request.OrganizationId, OrderNumberGenerator.Lab(),
            request.CustomerReference, config?.SampleSubmissionInstructions ?? string.Empty);
        foreach (var item in request.Samples)
            order.Samples.Add(new LabSample(order.Id, item.CustomerSampleId, item.MaterialType,
                item.BiologicalSource, item.Quantity, item.QuantityUnit, item.StorageRequirements,
                item.SafetyDeclaration, item.CollectionDate, item.Concentration, item.Notes,
                JsonSerializer.Serialize(item.AnalysisDefinitionIds), item.ReplacementForSampleId));
        order.Submit(actor.Id, DateTime.UtcNow);
        order.BeginQuotePreparation();
        dbContext.LabServiceOrders.Add(order);
        dbContext.OrderStatusEvents.Add(new OrderStatusEvent(order.OrganizationId,
            OrderWorkflowTypes.LabService, order.Id, null, "NotCreated", order.Status.ToString(),
            "Internally staged before Customer administrator activation.", null, actor.Id, DateTime.UtcNow));
        await dbContext.SaveChangesAsync(cancellationToken);
        Response.StatusCode = StatusCodes.Status201Created;
        return new LabServiceOrderDto(order.Id, order.OrganizationId, order.OrderNumber,
            order.CustomerReference, order.SubmissionInstructionsSnapshot, order.Status.ToString(),
            order.RequestRevision, order.SubmittedAt, order.PlacedAt, order.CompletedAt,
            order.TenantSafeReason, order.InternalNote, order.CreatedAt, order.UpdatedAt, order.Version,
            false, false, false, false, false, order.Samples.Select(item => item.ToDto(true)).ToList(),
            [], [], [], [], [], []);
    }

    private Task<User> RequireOperatorAsync(CancellationToken cancellationToken) =>
        requestContext.RequireBusinessRoleAsync(HttpContext, BusinessRole.CommercialOperator,
            rolloutOptions.Value.BusinessRoles || rolloutOptions.Value.DualControlEnforced,
            cancellationToken);
}
