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
        var sourceGroups = request.Samples
            .GroupBy(item => item.BiologicalSource.Trim(), StringComparer.OrdinalIgnoreCase)
            .Select(group => new { BiologicalSource = group.First().BiologicalSource.Trim(), Count = group.Count() })
            .ToList();
        var order = new LabServiceOrder(
            request.OrganizationId,
            OrderNumberGenerator.Lab(),
            request.CustomerReference ?? $"Staged PSeq order {DateTime.UtcNow:yyyy-MM-dd HH:mm}",
            description: "Internally staged before Customer administrator activation.",
            requestedSpecimenCount: request.Samples.Count,
            hasMixedBiologicalSources: sourceGroups.Count > 1,
            sharedBiologicalSource: sourceGroups.Count == 1 ? sourceGroups[0].BiologicalSource : null,
            storageRequirements: request.Samples[0].StorageRequirements,
            safetyDeclaration: request.Samples[0].SafetyDeclaration,
            submissionInstructionsSnapshot: config?.SampleSubmissionInstructions ?? string.Empty);
        foreach (var sourceGroup in sourceGroups)
            order.SourceGroups.Add(new LabServiceSourceGroup(order.Id, sourceGroup.BiologicalSource, sourceGroup.Count));
        order.Submit(actor.Id, DateTime.UtcNow);
        order.BeginQuotePreparation();
        dbContext.LabServiceOrders.Add(order);
        dbContext.OrderStatusEvents.Add(new OrderStatusEvent(order.OrganizationId,
            OrderWorkflowTypes.LabService, order.Id, null, "NotCreated", order.Status.ToString(),
            "Internally staged before Customer administrator activation.", null, actor.Id, DateTime.UtcNow));
        await dbContext.SaveChangesAsync(cancellationToken);
        Response.StatusCode = StatusCodes.Status201Created;
        return new LabServiceOrderDto(
            Id: order.Id,
            OrganizationId: order.OrganizationId,
            OrderNumber: order.OrderNumber,
            CustomerReference: order.CustomerReference,
            Description: order.Description,
            HasMixedBiologicalSources: order.HasMixedBiologicalSources,
            SharedBiologicalSource: order.SharedBiologicalSource,
            StorageRequirements: order.StorageRequirements,
            SafetyDeclaration: order.SafetyDeclaration,
            SubmissionInstructions: order.SubmissionInstructionsSnapshot,
            Status: order.Status.ToString(),
            RequestRevision: order.RequestRevision,
            SubmittedAt: order.SubmittedAt,
            PlacedAt: order.PlacedAt,
            CompletedAt: order.CompletedAt,
            TenantSafeReason: order.TenantSafeReason,
            InternalNote: order.InternalNote,
            CreatedAt: order.CreatedAt,
            UpdatedAt: order.UpdatedAt,
            Version: order.Version,
            CanEdit: false,
            CanSubmit: false,
            CanAcceptQuote: false,
            CanWithdraw: false,
            CanRequestCancellation: false,
            Samples: [],
            Quotes: [],
            ResultReleases: [],
            ResultFiles: [],
            Documents: [],
            CancellationRequests: [],
            Timeline: [],
            RequestedSpecimenCount: order.RequestedSpecimenCount,
            SourceGroups: order.SourceGroups.Select(group => new LabServiceSourceGroupDto(
                group.Id, group.BiologicalSource, group.SpecimenCount, group.Version)).ToList());
    }

    private Task<User> RequireOperatorAsync(CancellationToken cancellationToken) =>
        requestContext.RequireBusinessRoleAsync(HttpContext, BusinessRole.CommercialOperator,
            rolloutOptions.Value.BusinessRoles || rolloutOptions.Value.DualControlEnforced,
            cancellationToken);
}
