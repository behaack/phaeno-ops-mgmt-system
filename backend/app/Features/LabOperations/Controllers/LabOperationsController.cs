namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.LabOperations.Application;
using PSeq.Operations.Commercial.LabOperations.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/platform/lab-operations")]
public sealed partial class LabOperationsController(
    PSeqOperationsDbContext dbContext,
    LabOperationsRequestContext requestContext) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [HttpGet]
    public async Task<LabOperationsDashboardDto> Dashboard(CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.ProtocolAdministrator,
            LabRole.ScientificReviewer, LabRole.OperationsAdministrator);

        var workOrders = await dbContext.LabWorkOrders.AsNoTracking()
            .OrderByDescending(item => item.UpdatedAt).Take(250).ToListAsync(cancellationToken);
        var authorizations = await dbContext.CommercialLabAuthorizations.AsNoTracking()
            .Where(item => workOrders.Select(work => work.AuthorizationId).Contains(item.AuthorizationId))
            .ToDictionaryAsync(item => item.AuthorizationId, cancellationToken);
        var commercialOrderIds = authorizations.Values.Select(item => item.CommercialOrderId).ToList();
        var commercialOrders = await dbContext.LabServiceOrders.AsNoTracking()
            .Where(item => commercialOrderIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, cancellationToken);
        var specimenCounts = await dbContext.LabSpecimens.AsNoTracking()
            .GroupBy(item => item.LabWorkOrderId)
            .Select(group => new { WorkOrderId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.WorkOrderId, item => item.Count, cancellationToken);
        var exceptionCounts = await dbContext.LabExceptions.AsNoTracking()
            .Where(item => item.Status == LabExceptionStatus.Open)
            .GroupBy(item => item.LabWorkOrderId)
            .Select(group => new { WorkOrderId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.WorkOrderId, item => item.Count, cancellationToken);

        var protocols = await ReadProtocolsAsync(cancellationToken);
        var lots = await dbContext.LabMaterialLots.AsNoTracking()
            .OrderBy(item => item.Name).ThenBy(item => item.LotNumber)
            .Select(item => new LabMaterialLotDto(item.Id, item.Kind.ToString(), item.MaterialKey,
                item.Name, item.LotNumber, item.Supplier, item.ExpiresAtUtc, item.StorageLocation,
                item.AvailableQuantity, item.QuantityUnit, item.QcDisposition.ToString(), item.Version))
            .ToListAsync(cancellationToken);
        var equipment = await dbContext.LabEquipment.AsNoTracking().OrderBy(item => item.AssetCode)
            .Select(item => new LabEquipmentDto(item.Id, item.AssetCode, item.Name, item.EquipmentType,
                item.Location, item.Status.ToString(), item.LastCalibrationAtUtc,
                item.CalibrationDueAtUtc, item.Version)).ToListAsync(cancellationToken);
        var batches = await ReadBatchesAsync(cancellationToken);
        var roles = await ReadRoleAssignmentsAsync(cancellationToken);

        return new LabOperationsDashboardDto(
            workOrders.Select(work => MapWorkOrder(work, authorizations, commercialOrders,
                specimenCounts.GetValueOrDefault(work.Id), exceptionCounts.GetValueOrDefault(work.Id))).ToList(),
            protocols, lots, equipment, batches, roles);
    }

    [HttpGet("work-orders/{workOrderId:guid}")]
    public async Task<LabWorkOrderDetailDto> WorkOrder(Guid workOrderId, CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.ProtocolAdministrator,
            LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        var work = await RequireWorkOrderAsync(workOrderId, cancellationToken);
        var authorization = await dbContext.CommercialLabAuthorizations.AsNoTracking()
            .SingleOrDefaultAsync(item => item.AuthorizationId == work.AuthorizationId, cancellationToken);
        var commercialOrder = authorization is null ? null : await dbContext.LabServiceOrders.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == authorization.CommercialOrderId, cancellationToken);
        var specimens = await dbContext.LabSpecimens.AsNoTracking().Where(item => item.LabWorkOrderId == work.Id)
            .OrderBy(item => item.AccessionNumber).Select(item => new LabSpecimenDto(item.Id,
                item.SubmittedSpecimenId, item.AccessionNumber, item.ReceivedAtUtc,
                item.IntakeDisposition.ToString(), item.ReceiptCondition, item.IntakeReasonCode,
                item.CurrentLocation, item.Version)).ToListAsync(cancellationToken);
        var containers = await dbContext.LabContainers.AsNoTracking().Where(item => item.LabWorkOrderId == work.Id)
            .OrderBy(item => item.Barcode).Select(item => new LabContainerDto(item.Id,
                item.LabSpecimenId, item.ParentContainerId, item.Kind.ToString(), item.Barcode,
                item.Label, item.LabelPrintCount, item.Location, item.Quantity, item.QuantityUnit,
                item.Status.ToString(), item.RetainUntilUtc, item.Version)).ToListAsync(cancellationToken);
        var executions = await dbContext.LabProtocolExecutions.AsNoTracking().Where(item => item.LabWorkOrderId == work.Id)
            .OrderBy(item => item.CreatedAt).Select(item => new LabExecutionDto(item.Id,
                item.LabSpecimenId, item.LabProtocolVersionId, item.AssignedToUserId,
                item.Status.ToString(), item.CapturedResultsJson, item.DeviationNote,
                item.StartedAtUtc, item.CompletedAtUtc, item.Version)).ToListAsync(cancellationToken);
        var libraries = await dbContext.LabLibraries.AsNoTracking().Where(item => item.LabWorkOrderId == work.Id)
            .OrderBy(item => item.LibraryKey).Select(item => new LabLibraryDto(item.Id,
                item.LabSpecimenId, item.SourceContainerId, item.LibraryContainerId,
                item.PreparationExecutionId, item.LibraryKey, item.Status.ToString(),
                item.QcResultsJson, item.Version)).ToListAsync(cancellationToken);
        var exceptions = await dbContext.LabExceptions.AsNoTracking().Where(item => item.LabWorkOrderId == work.Id)
            .OrderByDescending(item => item.CreatedAt).Select(item => new LabExceptionDto(item.Id,
                item.LabSpecimenId, item.LabProtocolExecutionId, item.Audience.ToString(),
                item.CategoryCode, item.Title, item.InternalDescription, item.CustomerSafeSummary,
                item.IsBlocking, item.Status.ToString(), item.ResponseDueAtUtc,
                item.ResolvedAtUtc, item.Version)).ToListAsync(cancellationToken);
        var approvals = await dbContext.LabScientificApprovals.AsNoTracking().Where(item => item.LabWorkOrderId == work.Id)
            .OrderBy(item => item.ApprovalVersion).Select(item => new LabScientificApprovalDto(item.Id,
                item.ApprovalVersion, item.ReleaseDefinitionKey, item.ReleaseDefinitionVersion,
                item.ApprovedByUserId, item.ApprovedAtUtc, item.ProjectionVersion)).ToListAsync(cancellationToken);

        var authorizationMap = authorization is null
            ? new Dictionary<Guid, CommercialLabAuthorization>()
            : new Dictionary<Guid, CommercialLabAuthorization> { [authorization.AuthorizationId] = authorization };
        var commercialMap = commercialOrder is null
            ? new Dictionary<Guid, LabServiceOrder>()
            : new Dictionary<Guid, LabServiceOrder> { [commercialOrder.Id] = commercialOrder };
        return new LabWorkOrderDetailDto(
            MapWorkOrder(work, authorizationMap, commercialMap, specimens.Count,
                exceptions.Count(item => item.Status == LabExceptionStatus.Open.ToString())),
            specimens, containers, executions, libraries, exceptions, approvals);
    }

    [HttpPut("roles/{userId:guid}/{role}")]
    public async Task<LabRoleAssignmentDto> SetRole(Guid userId, string role,
        [FromBody] SetLabRoleRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken, LabRole.OperationsAdministrator);
        if (!Enum.TryParse<LabRole>(role, true, out var parsedRole)) throw Invalid("lab_role_invalid", "The laboratory role is invalid.");
        var user = await dbContext.Users
            .Include(item => item.Memberships)
            .ThenInclude(item => item.Organization)
            .SingleOrDefaultAsync(item => item.Id == userId && item.IsActive, cancellationToken)
            ?? throw Missing();
        var assignment = await dbContext.LabRoleAssignments
            .SingleOrDefaultAsync(item => item.UserId == userId && item.Role == parsedRole, cancellationToken);
        if (request.IsActive && !LabOperationsAuthorization.IsEligibleLabStaff(user))
        {
            throw Invalid("lab_role_user_ineligible", "Lab roles can be assigned only to active Phaeno members.");
        }
        if (!request.IsActive && assignment is null)
        {
            throw Missing();
        }
        if (assignment is null)
        {
            assignment = new LabRoleAssignment(userId, parsedRole);
            assignment.SetActive(request.IsActive);
            dbContext.LabRoleAssignments.Add(assignment);
        }
        else
        {
            EnsureVersion(assignment.Version, request.Version);
            assignment.SetActive(request.IsActive);
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        return new LabRoleAssignmentDto(assignment.Id, user.Id,
            $"{user.FirstName} {user.LastName}".Trim(), user.Email,
            assignment.Role.ToString(), assignment.IsActive, assignment.Version);
    }

    [HttpPost("protocols")]
    public async Task<LabProtocolDto> CreateProtocol([FromBody] CreateProtocolRequest request,
        CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.ProtocolAdministrator, LabRole.OperationsAdministrator);
        var key = await LabIdentifierService.AllocateProtocolKeyAsync(
            dbContext, request.Name, cancellationToken);
        var protocol = new LabProtocol(key, request.Name, request.Description);
        dbContext.LabProtocols.Add(protocol);
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapProtocol(protocol, []);
    }

    [HttpPost("protocols/{protocolId:guid}/versions")]
    public async Task<LabProtocolDto> CreateProtocolVersion(Guid protocolId,
        [FromBody] CreateProtocolVersionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.ProtocolAdministrator, LabRole.OperationsAdministrator);
        var protocol = await dbContext.LabProtocols.SingleOrDefaultAsync(item => item.Id == protocolId, cancellationToken)
            ?? throw Missing();
        EnsureVersion(protocol.Version, request.ProtocolVersion);
        var definition = NormalizeJson(request.DefinitionJson, "protocol_definition_invalid");
        var nextVersion = protocol.LatestVersion + 1;
        protocol.RecordVersion(nextVersion);
        dbContext.LabProtocolVersions.Add(new LabProtocolVersion(protocol.Id, nextVersion,
            definition, actor.User.Id, DateTime.UtcNow));
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await ReadProtocolsAsync(cancellationToken)).Single(item => item.Id == protocol.Id);
    }

    [HttpPost("protocol-versions/{versionId:guid}/transition")]
    public async Task<LabProtocolVersionDto> TransitionProtocol(Guid versionId,
        [FromBody] ProtocolTransitionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.ProtocolAdministrator, LabRole.OperationsAdministrator);
        var version = await dbContext.LabProtocolVersions.SingleOrDefaultAsync(item => item.Id == versionId, cancellationToken)
            ?? throw Missing();
        switch (request.Action.Trim().ToLowerInvariant())
        {
            case "approve": version.Approve(actor.User.Id, DateTime.UtcNow); break;
            case "activate":
                var active = await dbContext.LabProtocolVersions
                    .Where(item => item.LabProtocolId == version.LabProtocolId && item.Status == LabProtocolStatus.Active)
                    .ToListAsync(cancellationToken);
                foreach (var previous in active) previous.Retire();
                version.Activate();
                break;
            case "retire": version.Retire(); break;
            default: throw Invalid("protocol_transition_invalid", "The protocol transition is invalid.");
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapProtocolVersion(version);
    }
}
