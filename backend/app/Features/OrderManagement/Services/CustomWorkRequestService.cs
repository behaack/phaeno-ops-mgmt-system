namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class CustomWorkRequestService(PSeqOperationsDbContext dbContext)
{
    public static void RequireOrganizationAdministrator(OrderTenantContext tenant)
    {
        if (!tenant.Membership.IsOrganizationAdmin)
            throw new OrderManagementException("organization_administrator_required",
                "An organization administrator must request custom work.", StatusCodes.Status403Forbidden);
    }

    public static CreateCustomWorkRequest Normalize(CreateCustomWorkRequest request, OrganizationKind kind)
    {
        if (kind is not (OrganizationKind.Customer or OrganizationKind.Partner)
            || request.Service is not (CrmProductInterests.PSeqLabService or CrmProductInterests.PSeqKit)
            || (request.Service == CrmProductInterests.PSeqKit && kind != OrganizationKind.Partner))
            throw Invalid("custom_work_service_invalid", "Select a service available to your organization.");
        return request with
        {
            Subject = Required(request.Subject, 255, "subject"),
            Description = Required(request.Description, 1500, "description")
        };
    }

    public async Task<CustomWorkSubmissionDto> CreateAsync(OrderTenantContext tenant,
        CreateCustomWorkRequest request, CancellationToken cancellationToken)
    {
        RequireOrganizationAdministrator(tenant);
        request = Normalize(request, tenant.Organization.Kind);
        var company = await dbContext.CrmCompanies.AsNoTracking()
            .SingleOrDefaultAsync(value => value.AccessOrganizationId == tenant.Organization.Id
                && value.IsActive && value.MergedIntoCompanyId == null, cancellationToken)
            ?? throw Unavailable();
        var ownerReady = await dbContext.Users.AsNoTracking().AnyAsync(value => value.Id == company.OwnerUserId
            && value.IsActive && value.Memberships.Any(membership => membership.IsActive
                && membership.Organization!.IsActive && membership.Organization.Kind == OrganizationKind.Phaeno), cancellationToken);
        if (!ownerReady) throw Unavailable();
        var stage = await dbContext.CrmPipelineStages.AsNoTracking()
            .Where(value => value.Pipeline.IsActive && value.Pipeline.IsDefault && value.IsActive
                && value.Category == CrmPipelineStageCategory.Open)
            .OrderBy(value => value.Position).FirstOrDefaultAsync(cancellationToken)
            ?? throw Unavailable();

        string? orderNumber = null;
        if (request.SourceOrderId.HasValue)
        {
            orderNumber = request.Service == CrmProductInterests.PSeqLabService
                ? await dbContext.LabServiceOrders.AsNoTracking()
                    .Where(value => value.Id == request.SourceOrderId && value.OrganizationId == tenant.Organization.Id
                        && value.DepartmentId == tenant.Department.Id)
                    .Select(value => value.OrderNumber).SingleOrDefaultAsync(cancellationToken)
                : await dbContext.PartnerReagentOrders.AsNoTracking()
                    .Where(value => value.Id == request.SourceOrderId && value.OrganizationId == tenant.Organization.Id
                        && value.DepartmentId == tenant.Department.Id)
                    .Select(value => value.OrderNumber).SingleOrDefaultAsync(cancellationToken);
            if (orderNumber is null)
                throw new OrderManagementException("order_not_found", "The requested order resource was not found.",
                    StatusCodes.Status404NotFound);
        }

        var now = DateTime.UtcNow;
        var department = $"Department: {tenant.Department.Name} ({tenant.Department.Code}).";
        var origin = orderNumber is null ? string.Empty : $"\nOriginating order: {orderNumber}.";
        var opportunity = new CrmOpportunity(request.Subject, company.Id, stage, company.OwnerUserId,
            request.Service, null, "USD", null, "Review the Portal custom-work request with the requester.",
            null, $"{request.Description}\n\n{department}{origin}", ["Portal custom work"]);
        dbContext.CrmOpportunities.Add(opportunity);
        dbContext.CrmOpportunityStageHistory.Add(new(opportunity.Id, null, stage.Id,
            "Portal custom-work request submitted.", tenant.Actor.Id, now));
        // A PortalEvent cannot be edited or removed. Keep original tenant and
        // Department identity here even if editable Opportunity details change.
        dbContext.CrmActivities.Add(new(CrmActivityType.PortalEvent, "Custom work requested",
            $"{request.Subject}\n\n{request.Description}\n\nService: {request.Service}.\n{department}"
            + $"\nOrganization ID: {tenant.Organization.Id:D}.\nDepartment ID: {tenant.Department.Id:D}."
            + origin + (request.SourceOrderId.HasValue ? $"\nOrder ID: {request.SourceOrderId.Value:D}." : string.Empty),
            now, CrmActivityVisibility.Internal, tenant.Actor.Id, company.Id, opportunityId: opportunity.Id));
        // The existing idempotency transaction saves the entire submission.
        // No operational handoff, quote, order, entitlement, or notice is issued.
        return new(opportunity.Id, opportunity.OpportunityNumber, tenant.Department.Id, "Submitted");
    }

    private static string Required(string? value, int maximum, string field)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrWhiteSpace(normalized) || normalized.Length > maximum)
            throw Invalid($"custom_work_{field}_invalid", $"Enter a {field} of 1 to {maximum} characters.");
        return normalized;
    }
    private static OrderManagementException Invalid(string code, string message) => new(code, message);
    private static OrderManagementException Unavailable() => new("custom_work_unavailable",
        "Custom work requests are unavailable for this organization. Ask Phaeno to check the commercial setup.",
        StatusCodes.Status409Conflict);
}
