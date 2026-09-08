namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Domain;

/// <summary>Owns purchased Kit lineage; it never creates another Assembly sale.</summary>
public sealed class KitBundleService(PSeqOperationsDbContext dbContext)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private const int MaximumUnitsPerOrder = 1000;

    public async Task SnapshotDraftProfilesAsync(PartnerReagentOrder order, CancellationToken cancellationToken)
    {
        if (!order.IsKitBundle) return;
        await ValidateProfilesAsync(order.Lines.Select(x => new ReagentLineWriteRequest(x.OfferingId, x.Quantity, x.Note)), cancellationToken);
        foreach (var line in order.Lines)
        {
            var offering = await dbContext.PartnerReagentOfferings.AsNoTracking().SingleAsync(x => x.Id == line.OfferingId, cancellationToken);
            var profile = await dbContext.AssemblyProfiles.AsNoTracking().SingleAsync(x => x.Id == offering.IncludedAssemblyProfileId, cancellationToken);
            line.SnapshotIncludedProfile(profile.Id, profile.ProfileVersion, offering.Version, JsonSerializer.Serialize(ProfileDto(profile), JsonOptions));
        }
    }

    public async Task ValidateProfilesAsync(IEnumerable<ReagentLineWriteRequest> lines, CancellationToken cancellationToken)
    {
        var entries = lines.ToList();
        if (entries.Any(line => line.Quantity != decimal.Truncate(line.Quantity)) || entries.Sum(line => line.Quantity) > MaximumUnitsPerOrder)
            throw Invalid("kit_quantity_invalid", "Order whole Kit units, up to 1,000 per standard order. Request custom work for other quantities.");
        var ids = entries.Select(line => line.OfferingId).Distinct().ToList();
        var offerings = await dbContext.PartnerReagentOfferings.AsNoTracking().Where(x => ids.Contains(x.Id)).ToListAsync(cancellationToken);
        var profiles = await dbContext.AssemblyProfiles.AsNoTracking().Where(x => x.IsActive && !x.IsSynthetic).Select(x => x.Id).ToListAsync(cancellationToken);
        if (offerings.Count != ids.Count || offerings.Any(x => !x.IncludedAssemblyProfileId.HasValue || !profiles.Contains(x.IncludedAssemblyProfileId.Value)))
            throw Invalid("kit_assembly_profile_unavailable", "Every standard Kit offering must include an active, reviewed Assembly profile. Request custom work or ask Phaeno to complete the offering.");
    }

    public async Task CreatePurchasedCasesAsync(PartnerReagentOrder order, CancellationToken cancellationToken)
    {
        if (!order.IsKitBundle) return;
        if (await dbContext.KitAssemblyCases.AnyAsync(x => x.PartnerReagentOrderId == order.Id, cancellationToken))
            throw Conflict("kit_cases_already_created", "The purchased Kit cases already exist.");
        await ValidateProfilesAsync(order.Lines.Select(line => new ReagentLineWriteRequest(line.OfferingId, line.Quantity, line.Note)), cancellationToken);
        var offeringIds = order.Lines.Select(x => x.OfferingId).ToList();
        var offerings = await dbContext.PartnerReagentOfferings.AsNoTracking().Where(x => offeringIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, cancellationToken);
        var profileIds = offerings.Values.Select(x => x.IncludedAssemblyProfileId!.Value).Distinct().ToList();
        var profiles = await dbContext.AssemblyProfiles.AsNoTracking().Where(x => profileIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, cancellationToken);
        var ordinal = 0;
        foreach (var line in order.Lines.OrderBy(x => x.CreatedAt).ThenBy(x => x.Id))
        {
            var profile = profiles[offerings[line.OfferingId].IncludedAssemblyProfileId!.Value];
            var frozen = JsonSerializer.Serialize(ProfileDto(profile), JsonOptions);
            if (line.IncludedAssemblyProfileId != profile.Id || line.IncludedAssemblyProfileVersion != profile.ProfileVersion
                || line.IncludedOfferingVersion != offerings[line.OfferingId].Version
                || !System.Text.Json.Nodes.JsonNode.DeepEquals(System.Text.Json.Nodes.JsonNode.Parse(line.IncludedAssemblyProfileSnapshotJson ?? "null"), System.Text.Json.Nodes.JsonNode.Parse(frozen)))
                throw Conflict("kit_scope_changed", "The included Assembly scope or offering changed. Review and save the refreshed draft before placing the Kit order.");
            for (var unitNumber = 0; unitNumber < decimal.ToInt32(line.Quantity); unitNumber++)
            {
                var unit = new PartnerKitUnit(order.Id, line.Id, order.OrganizationId, order.DepartmentId, $"{order.OrderNumber}-K{++ordinal}");
                dbContext.PartnerKitUnits.Add(unit); dbContext.KitAssemblyCases.Add(new(unit, profile.Id, frozen));
            }
        }
    }

    public async Task AssignShipmentAsync(PartnerReagentOrder order, ReagentShipment shipment, Guid billingDocumentId, Guid actorId, CancellationToken cancellationToken)
    {
        if (!order.IsKitBundle) return;
        foreach (var allocation in shipment.Lines)
        {
            if (allocation.Quantity != decimal.Truncate(allocation.Quantity)) throw Invalid("kit_shipment_quantity_invalid", "Ship whole purchased Kit units.");
            var units = await dbContext.PartnerKitUnits.Where(x => x.PartnerReagentOrderId == order.Id && x.PartnerReagentOrderLineId == allocation.PartnerReagentOrderLineId
                && x.Status == KitUnitStatus.AwaitingShipment).OrderBy(x => x.Label).Take(decimal.ToInt32(allocation.Quantity)).ToListAsync(cancellationToken);
            if (units.Count != allocation.Quantity) throw Conflict("kit_units_unavailable", "The shipment does not match the remaining purchased Kit units.");
            var ids = units.Select(x => x.Id).ToList();
            var cases = await dbContext.KitAssemblyCases.Include(x => x.History).Where(x => ids.Contains(x.CurrentKitUnitId)).ToDictionaryAsync(x => x.CurrentKitUnitId, cancellationToken);
            foreach (var unit in units)
            {
                unit.Ship(shipment.Id, shipment.ShippedAt, allocation.ExpiresAt, allocation.LotBatchNumber, shipment.Carrier, shipment.TrackingNumber);
                var included = cases[unit.Id]; included.RecordShipment(unit, actorId, DateTime.UtcNow); included.RecordBillingSource(billingDocumentId);
                TrackNewHistory(dbContext, included);
            }
        }
    }

    public async Task<PartnerReagentOrderDto> EnrichAsync(PartnerReagentOrderDto dto, bool canManage, bool platform, CancellationToken cancellationToken)
    {
        var isBundle = await dbContext.PartnerReagentOrders.AsNoTracking().Where(x => x.Id == dto.Id).Select(x => x.IsKitBundle).SingleAsync(cancellationToken);
        if (!isBundle) return dto with { IsKitBundle = false, KitUnits = [], AssemblyCases = [], OperationalSummary = dto.Status };
        var units = await dbContext.PartnerKitUnits.AsNoTracking().Where(x => x.PartnerReagentOrderId == dto.Id && x.OrganizationId == dto.OrganizationId).OrderBy(x => x.Label).ToListAsync(cancellationToken);
        var cases = await dbContext.KitAssemblyCases.AsNoTracking().Include(x => x.History).Where(x => x.PartnerReagentOrderId == dto.Id && x.OrganizationId == dto.OrganizationId).OrderBy(x => x.CaseNumber).ToListAsync(cancellationToken);
        var requestIds = cases.Where(x => x.AssemblyRequestId.HasValue).Select(x => x.AssemblyRequestId!.Value).ToList();
        var requests = await dbContext.DataAssemblyRequests.AsNoTracking().Where(x => requestIds.Contains(x.Id) && x.OrganizationId == dto.OrganizationId).ToDictionaryAsync(x => x.Id, cancellationToken);
        var now = DateTime.UtcNow;
        return dto with
        {
            IsKitBundle = true,
            OperationalSummary = dto.Status == nameof(ReagentOrderStatus.KitFulfilledAssemblyPending) ? "Kit fulfilled / assembly pending" : dto.Status,
            KitUnits = units.Select(x => new KitUnitDto(x.Id, x.Label, x.PartnerReagentOrderLineId, x.Status.ToString(), x.ShippedAt, x.ExpiresAt, x.LotBatchNumber, x.Carrier, x.TrackingNumber, x.ReplacesKitUnitId, x.ReplacedByKitUnitId, x.Version)).ToList(),
            AssemblyCases = cases.Select(x =>
            {
                var request = x.AssemblyRequestId.HasValue ? requests.GetValueOrDefault(x.AssemblyRequestId.Value) : null;
                var unit = units.Single(value => value.Id == x.CurrentKitUnitId);
                return new KitAssemblyCaseDto(x.Id, x.CaseNumber, x.OriginalKitUnitId, x.CurrentKitUnitId, x.Status.ToString(), x.SubmissionDeadlineAt, x.DeadlineBasis,
                    x.AssemblyRequestId, request?.RequestNumber, request?.Status.ToString(), FrozenProfileDto(x.ProfileSnapshotJson), x.Version,
                    !platform && canManage && !x.AssemblyRequestId.HasValue && x.CanPrepareAt(now),
                    platform && !x.FirstSubmittedAt.HasValue && x.Status is not (KitAssemblyCaseStatus.ResultsReleased or KitAssemblyCaseStatus.Cancelled or KitAssemblyCaseStatus.AwaitingShipment),
                    platform && unit.Status == KitUnitStatus.Shipped && x.Status is not (KitAssemblyCaseStatus.ResultsReleased or KitAssemblyCaseStatus.Cancelled),
                    platform && !x.FirstSubmittedAt.HasValue && x.Status is not (KitAssemblyCaseStatus.ResultsReleased or KitAssemblyCaseStatus.Cancelled),
                    x.History.OrderBy(h => h.At).Select(h => new KitCaseEventDto(h.Id, h.EventType, h.At, h.Reason)).ToList());
            }).ToList()
        };
    }

    public async Task<DataAssemblyRequestDto> EnrichAsync(DataAssemblyRequestDto dto, CancellationToken cancellationToken)
    {
        var included = await dbContext.KitAssemblyCases.AsNoTracking().SingleOrDefaultAsync(x => x.AssemblyRequestId == dto.Id && x.OrganizationId == dto.OrganizationId, cancellationToken);
        if (included is null) return dto;
        var orderNumber = await dbContext.PartnerReagentOrders.AsNoTracking().Where(x => x.Id == included.PartnerReagentOrderId && x.OrganizationId == included.OrganizationId).Select(x => x.OrderNumber).SingleAsync(cancellationToken);
        var editable = !included.IsTerminal && (included.FirstSubmittedAt.HasValue || included.CanPrepareAt(DateTime.UtcNow));
        return dto with { KitAssemblyCaseId = included.Id, KitOrderId = included.PartnerReagentOrderId, KitOrderNumber = orderNumber, KitCaseNumber = included.CaseNumber,
            IsIncludedAssembly = true, CanAcceptQuote = false, CanEdit = dto.CanEdit && editable, CanSubmit = dto.CanSubmit && editable };
    }

    public async Task<AssemblyProfile> ReadProfileAsync(DataAssemblyRequest request, CancellationToken cancellationToken)
    {
        if (!request.KitAssemblyCaseId.HasValue) return await dbContext.AssemblyProfiles.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.AssemblyProfileId, cancellationToken)
            ?? throw Invalid("assembly_profile_unavailable", "The request's Assembly profile is unavailable.");
        var dto = FrozenProfileDto(request.KitProfileSnapshotJson ?? throw new InvalidOperationException("The included profile snapshot is missing."));
        if (dto.Id != request.AssemblyProfileId || dto.ProfileVersion != request.AssemblyProfileVersion) throw Conflict("included_profile_mismatch", "The included Assembly profile requires Phaeno review.");
        return new(dto.QboCatalogItemId, dto.Name, dto.ProfileVersion, dto.Description, dto.Instructions, dto.MetadataSchemaJson, dto.AllowedFileKindsJson,
            dto.OutputContractJson, dto.MaximumFileSizeBytes, dto.MaximumTotalSizeBytes, dto.IsActive, dto.IsSynthetic);
    }

    public async Task<decimal> ReadIncludedBalanceAsync(Guid caseId, CancellationToken cancellationToken)
    {
        var included = await dbContext.KitAssemblyCases.AsNoTracking().SingleAsync(x => x.Id == caseId, cancellationToken);
        if (!included.BillingDocumentId.HasValue) throw Conflict("kit_billing_source_missing", "The purchased Kit shipment accounting source must be available before result release.");
        var document = await dbContext.CommercialDocumentLinks.AsNoTracking().SingleOrDefaultAsync(x => x.Id == included.BillingDocumentId
            && x.WorkflowId == included.PartnerReagentOrderId && x.WorkflowType == OrderWorkflowTypes.Reagent && x.Kind == CommercialDocumentKind.Invoice, cancellationToken);
        return document?.Balance ?? throw Conflict("kit_billing_source_missing", "The original Kit billing source requires Finance review.");
    }

    public async Task RefreshOrderCompletionAsync(Guid orderId, CancellationToken cancellationToken)
    {
        var order = await dbContext.PartnerReagentOrders.SingleAsync(x => x.Id == orderId, cancellationToken);
        if (!order.IsKitBundle) return;
        var cases = await dbContext.KitAssemblyCases.Where(x => x.PartnerReagentOrderId == orderId).ToListAsync(cancellationToken);
        order.RefreshIncludedAssemblyCompletion(cases.Count > 0 && cases.All(x => x.IsTerminal));
    }

    public async Task CancelUnshippedAsync(PartnerReagentOrder order, Guid actorId, string reason, CancellationToken cancellationToken)
    {
        if (!order.IsKitBundle) return;
        foreach (var line in order.Lines)
        {
            if (line.CancelledQuantity != decimal.Truncate(line.CancelledQuantity)) throw Invalid("kit_quantity_invalid", "Cancel whole Kit units.");
            var units = await dbContext.PartnerKitUnits.Where(x => x.PartnerReagentOrderId == order.Id && x.PartnerReagentOrderLineId == line.Id
                && x.ReplacesKitUnitId == null).OrderBy(x => x.Label).ToListAsync(cancellationToken);
            var target = order.Status is ReagentOrderStatus.Cancelled or ReagentOrderStatus.Rejected
                ? units.Count(x => x.Status == KitUnitStatus.AwaitingShipment) : decimal.ToInt32(line.CancelledQuantity) - units.Count(x => x.Status == KitUnitStatus.Cancelled);
            foreach (var unit in units.Where(x => x.Status == KitUnitStatus.AwaitingShipment).Take(Math.Max(0, target)))
            {
                var included = await dbContext.KitAssemblyCases.Include(x => x.History).SingleAsync(x => x.OriginalKitUnitId == unit.Id, cancellationToken);
                unit.CancelUnshipped(); included.Cancel(reason, actorId, DateTime.UtcNow);
                TrackNewHistory(dbContext, included);
            }
        }
        await RefreshOrderCompletionAsync(order.Id, cancellationToken);
    }

    public async Task SyncAssemblyClosureAsync(DataAssemblyRequest item, Guid actorId, string reason, CancellationToken token)
    {
        if (!item.KitAssemblyCaseId.HasValue || item.Status is not (AssemblyRequestStatus.Cancelled or AssemblyRequestStatus.Rejected)) return;
        var included = await dbContext.KitAssemblyCases.Include(x => x.History).SingleAsync(x => x.Id == item.KitAssemblyCaseId, token);
        if (included.Status is not (KitAssemblyCaseStatus.Cancelled or KitAssemblyCaseStatus.ResultsReleased)) included.Cancel(reason, actorId, DateTime.UtcNow);
        TrackNewHistory(dbContext, included);
        await RefreshOrderCompletionAsync(included.PartnerReagentOrderId, token);
    }

    public static void TrackNewHistory(PSeqOperationsDbContext db, KitAssemblyCase included)
    {
        // Events receive their identity in the domain. Explicitly insert new
        // children of an already tracked case instead of inferring an update.
        var detectChanges = db.ChangeTracker.AutoDetectChangesEnabled;
        db.ChangeTracker.AutoDetectChangesEnabled = false;
        try
        {
            foreach (var entry in included.History.Where(item => db.Entry(item).State == EntityState.Detached))
                db.KitCaseEvents.Add(entry);
        }
        finally { db.ChangeTracker.AutoDetectChangesEnabled = detectChanges; }
    }

    public static AssemblyProfileDto ProfileDto(AssemblyProfile profile) => new(profile.Id, profile.QboCatalogItemId, profile.Name, profile.ProfileVersion,
        profile.Description, profile.Instructions, profile.MetadataSchemaJson, profile.AllowedFileKindsJson, profile.OutputContractJson,
        profile.MaximumFileSizeBytes, profile.MaximumTotalSizeBytes, profile.IsActive, profile.IsSynthetic, profile.Version);
    public static AssemblyProfileDto FrozenProfileDto(string json) => JsonSerializer.Deserialize<AssemblyProfileDto>(json, JsonOptions)
        ?? throw new InvalidOperationException("The included Assembly profile is unavailable.");
    private static OrderManagementException Invalid(string code, string message) => new(code, message, StatusCodes.Status400BadRequest);
    private static OrderManagementException Conflict(string code, string message) => new(code, message, StatusCodes.Status409Conflict);
}
