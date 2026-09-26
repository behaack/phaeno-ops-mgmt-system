namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/platform/sample-shipping")]
[Route("api/platform/lab-operations/sample-shipping")]
public sealed partial class SampleShippingAdminController(
    PSeqOperationsDbContext dbContext,
    OrderRequestContext requestContext,
    SampleShippingWorkflowReader workflowReader) : ControllerBase
{
    [HttpGet("configuration")]
    public async Task<SampleShippingConfigurationDto> GetConfiguration(CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var destinations = await dbContext.SampleShippingDestinations
            .AsNoTracking()
            .OrderBy(item => item.Code)
            .ThenByDescending(item => item.Revision)
            .ToListAsync(cancellationToken);
        var sampleTypes = await dbContext.SampleTypeDefinitions
            .AsNoTracking()
            .OrderBy(item => item.Code)
            .ThenByDescending(item => item.Revision)
            .ToListAsync(cancellationToken);
        var procedures = await dbContext.SampleShippingProcedures.AsNoTracking()
            .OrderBy(item => item.Name).ThenByDescending(item => item.Revision).ToListAsync(cancellationToken);
        var system = await dbContext.OrderSystemConfigurations.AsNoTracking().OrderBy(item => item.CreatedAt)
            .Select(item => new { item.DefaultShippingDestinationDefinitionKey, item.Version })
            .FirstOrDefaultAsync(cancellationToken);
        return new SampleShippingConfigurationDto(
            destinations.Select(Map).ToList(),
            sampleTypes.Select(Map).ToList(),
            procedures.Select(SampleShippingProceduresController.Map).ToArray(),
            system?.DefaultShippingDestinationDefinitionKey, system?.Version ?? 0);
    }

    [HttpPut("destinations/default")]
    public async Task<SampleShippingConfigurationDto> SetDefaultDestination(
        [FromBody] SetDefaultShippingDestinationRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            "sample-shipping-default-destination", cancellationToken);
        var usable = await dbContext.SampleShippingDestinations.AsNoTracking().AnyAsync(item =>
            item.DefinitionKey == request.DefinitionKey && item.IsActive && item.EffectiveFrom <= DateTime.UtcNow
            && (!item.EffectiveTo.HasValue || item.EffectiveTo > DateTime.UtcNow), cancellationToken);
        if (!usable) throw Invalid("shipping_destination_unavailable", "Choose a current Active Phaeno ship-to destination.");
        var setting = await dbContext.OrderSystemConfigurations.OrderBy(item => item.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (setting is null)
        {
            if (request.Version != 0) throw Conflict("shipping_default_changed", "Refresh the destinations before saving the default.");
            setting = new OrderSystemConfiguration(30, string.Empty, "{}");
            dbContext.OrderSystemConfigurations.Add(setting);
        }
        else EnsureVersion(setting.Version, request.Version);
        setting.SetDefaultShippingDestination(request.DefinitionKey);
        await dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return await GetConfiguration(cancellationToken);
    }

    [HttpPost("destinations")]
    public async Task<SampleShippingDestinationDto> CreateDestination(
        [FromBody] SampleShippingDestinationWriteRequest request,
        CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var effectiveFrom = RequireUtc(request.EffectiveFrom, "Destination effective-from");
        var familyKey = request.SupersedesDestinationId.HasValue
            ? await DestinationFamilyKeyAsync(request.SupersedesDestinationId.Value, cancellationToken) : Guid.NewGuid();
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"shipping-destination:{familyKey}", cancellationToken);
        SampleShippingDestination? predecessor = null;
        Guid definitionKey;
        int revision;
        string code;

        if (request.SupersedesDestinationId.HasValue)
        {
            predecessor = await dbContext.SampleShippingDestinations
                .FirstOrDefaultAsync(item => item.Id == request.SupersedesDestinationId.Value, cancellationToken)
                ?? throw Missing("shipping_destination_not_found", "The destination revision to supersede was not found.");
            EnsureVersion(predecessor.Version, request.SupersededVersion);
            if (await dbContext.SampleShippingDestinations.AsNoTracking()
                .AnyAsync(item => item.SupersedesDestinationId == predecessor.Id, cancellationToken))
                throw Conflict("shipping_destination_already_superseded", "The selected destination already has a later revision.");
            if (!string.Equals(predecessor.Code, request.Code?.Trim(), StringComparison.OrdinalIgnoreCase))
                throw Conflict("shipping_destination_code_frozen", "A destination code cannot change between revisions.");
            if (effectiveFrom <= predecessor.EffectiveFrom)
                throw Invalid("shipping_destination_period_invalid", "A destination revision must begin after the revision it supersedes.");
            definitionKey = predecessor.DefinitionKey;
            revision = predecessor.Revision + 1;
            code = predecessor.Code;
        }
        else
        {
            code = request.Code?.Trim().ToUpperInvariant() ?? string.Empty;
            if (await dbContext.SampleShippingDestinations.AsNoTracking()
                .AnyAsync(item => item.Code == code, cancellationToken))
                throw Conflict("shipping_destination_code_exists", "Create a revision from the existing destination instead of reusing its code.");
            definitionKey = Guid.NewGuid();
            revision = 1;
        }

        var item = Execute(
            "shipping_destination_invalid",
            () => new SampleShippingDestination(
                definitionKey,
                revision,
                predecessor?.Id,
                code,
                request.Name,
                request.RecipientName,
                request.OrganizationName,
                request.AddressLine1,
                request.AddressLine2,
                request.City,
                request.StateOrProvince,
                request.PostalCode,
                request.CountryCode,
                request.ReceivingPhone,
                request.ReceivingEmail,
                request.ReceivingHours,
                request.TimeZoneId,
                request.ClosureInstructions,
                request.DeliveryInstructions,
                request.CarrierRestrictions,
                request.InternationalShippingAllowed,
                effectiveFrom,
                request.IsActive));

        if (request.IsActive)
        {
            var previous = await dbContext.SampleShippingDestinations.Where(value => value.DefinitionKey == definitionKey
                && value.IsActive && (!value.EffectiveTo.HasValue || value.EffectiveTo > effectiveFrom)).ToListAsync(cancellationToken);
            foreach (var value in previous) Execute("shipping_destination_period_invalid", () => value.EndAt(effectiveFrom));
        }
        dbContext.SampleShippingDestinations.Add(item);
        await dbContext.SaveChangesAsync(cancellationToken);
        if (transaction != null) await transaction.CommitAsync(cancellationToken);
        Response.StatusCode = StatusCodes.Status201Created;
        return Map(item);
    }

    [HttpPost("sample-types")]
    public async Task<SampleTypeDefinitionDto> CreateSampleType(
        [FromBody] SampleTypeDefinitionWriteRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var effectiveFrom = RequireUtc(request.EffectiveFrom, "Sample-type effective-from");
        var familyKey = request.SupersedesSampleTypeId.HasValue
            ? await SampleTypeFamilyKeyAsync(request.SupersedesSampleTypeId.Value, cancellationToken)
            : Guid.NewGuid();
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"sample-type:{familyKey}", cancellationToken);
        SampleTypeDefinition? predecessor = null;
        Guid definitionKey;
        int revision;
        string code;

        if (request.SupersedesSampleTypeId.HasValue)
        {
            predecessor = await dbContext.SampleTypeDefinitions
                .FirstOrDefaultAsync(item => item.Id == request.SupersedesSampleTypeId.Value, cancellationToken)
                ?? throw Missing("sample_type_not_found", "The sample-type revision to supersede was not found.");
            EnsureVersion(predecessor.Version, request.SupersededVersion);
            if (await dbContext.SampleTypeDefinitions.AsNoTracking()
                .AnyAsync(item => item.SupersedesSampleTypeId == predecessor.Id, cancellationToken))
                throw Conflict("sample_type_already_superseded", "The selected sample type already has a later revision.");
            if (!string.Equals(predecessor.Code, request.Code?.Trim(), StringComparison.OrdinalIgnoreCase))
                throw Conflict("sample_type_code_frozen", "A sample-type code cannot change between revisions.");
            if (effectiveFrom <= predecessor.EffectiveFrom)
                throw Invalid("sample_type_period_invalid", "A sample-type revision must begin after the revision it supersedes.");
            definitionKey = predecessor.DefinitionKey;
            revision = predecessor.Revision + 1;
            code = predecessor.Code;
        }
        else
        {
            code = request.Code?.Trim().ToUpperInvariant() ?? string.Empty;
            if (await dbContext.SampleTypeDefinitions.AsNoTracking()
                .AnyAsync(item => item.Code == code, cancellationToken))
                throw Conflict("sample_type_code_exists", "Create a revision from the existing sample type instead of reusing its code.");
            definitionKey = Guid.NewGuid();
            revision = 1;
        }

        if (predecessor is not null && request.ShippingProcedureId.HasValue)
            throw Invalid("sample_type_procedure_change_separate", "Use Change procedure to update this relationship without creating a Sample-type revision.");
        var selectedSampleProcedureId = predecessor?.ShippingProcedureId ?? request.ShippingProcedureId;
        if (!selectedSampleProcedureId.HasValue)
            throw Invalid("shipping_procedure_required", "Choose one shared shipping procedure before saving a new Sample type.");
        await SampleShippingPackingData.LockAsync(dbContext, $"shipping-procedure:{selectedSampleProcedureId.Value}", cancellationToken);
        var selectedSampleProcedure = await dbContext.SampleShippingProcedures.AsNoTracking()
            .SingleOrDefaultAsync(value => value.Id == selectedSampleProcedureId, cancellationToken)
            ?? throw Invalid("shipping_procedure_unavailable", "Choose an available shared shipping procedure for this Sample type.");
        if (!await dbContext.SampleShippingProcedures.AsNoTracking().AnyAsync(value =>
            value.DefinitionKey == selectedSampleProcedure.DefinitionKey && value.IsActive, cancellationToken))
            throw Invalid("shipping_procedure_unavailable", "The selected procedure has no Active revision.");
        var item = Execute(
            "sample_type_invalid",
            () => new SampleTypeDefinition(
                definitionKey,
                revision,
                predecessor?.Id,
                code,
                request.Name,
                request.Description,
                request.MaterialClass,
                request.MinimumQuantity,
                request.MaximumQuantity,
                request.QuantityUnit,
                request.PrimaryContainerRequirements,
                request.TemperatureRequirements,
                request.StabilizerRequirements,
                request.PackagingInstructions,
                request.LabelingInstructions,
                request.ProhibitedIdentifiers,
                request.SafetyRequirements,
                request.CarrierRestrictions,
                request.MaximumTransitHours,
                effectiveFrom,
                request.IsActive,
                selectedSampleProcedureId));

        // Saving an inactive revision must not retire the currently approved revision.
        if (request.IsActive)
        {
            var activePredecessors = await dbContext.SampleTypeDefinitions.Where(value => value.DefinitionKey == definitionKey
                && value.IsActive && (!value.EffectiveTo.HasValue || value.EffectiveTo > effectiveFrom)).ToListAsync(cancellationToken);
            foreach (var previous in activePredecessors)
                Execute("sample_type_period_invalid", () => previous.EndAt(effectiveFrom));
        }
        dbContext.SampleTypeDefinitions.Add(item);
        if (predecessor is null)
        {
            var procedureAnchorId = await dbContext.SampleShippingProcedures.AsNoTracking()
                .Where(value => value.DefinitionKey == selectedSampleProcedure.DefinitionKey && value.Revision == 1)
                .Select(value => value.Id).SingleAsync(cancellationToken);
            dbContext.SampleTypeProcedureLinks.Add(new SampleTypeProcedureLink(item.Id, procedureAnchorId,
                actor.Id, DateTime.UtcNow));
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        if (transaction != null) await transaction.CommitAsync(cancellationToken);
        Response.StatusCode = StatusCodes.Status201Created;
        return Map(item);
    }

    [HttpPost("sample-types/{id:guid}/status")]
    public async Task<SampleTypeDefinitionDto> SetSampleTypeStatus(Guid id,
        [FromBody] SampleShippingStatusRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var familyKey = await SampleTypeFamilyKeyAsync(id, cancellationToken);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"sample-type:{familyKey}", cancellationToken);
        var family = await dbContext.SampleTypeDefinitions.Where(value => value.DefinitionKey == familyKey).ToListAsync(cancellationToken);
        var item = family.Single(value => value.Id == id);
        EnsureVersion(item.Version, request.Version);
        var now = DateTime.UtcNow;
        if (request.IsActive && family.Any(value => value.Revision > item.Revision))
            throw Conflict("sample_type_already_superseded", "Only the latest sample-type revision can be activated. Open the latest revision to continue.");
        Execute("sample_type_status_invalid", () => item.SetActive(request.IsActive, now));
        if (request.IsActive)
        {
            var activationAt = item.EffectiveFrom > now ? item.EffectiveFrom : now;
            foreach (var previous in family.Where(value => value.Id != id && value.IsActive
                && (!value.EffectiveTo.HasValue || value.EffectiveTo > activationAt)))
                Execute("sample_type_period_invalid", () => previous.EndAt(activationAt));
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        if (transaction != null) await transaction.CommitAsync(cancellationToken);
        return Map(item);
    }

    private async Task<Guid> SampleTypeFamilyKeyAsync(Guid id, CancellationToken cancellationToken)
        => await dbContext.SampleTypeDefinitions.AsNoTracking().Where(value => value.Id == id)
            .Select(value => (Guid?)value.DefinitionKey).SingleOrDefaultAsync(cancellationToken)
            ?? throw Missing("sample_type_not_found", "The sample-type revision was not found.");

    [HttpPost("sample-types/{id:guid}/procedure")]
    public async Task<SampleTypeDefinitionDto> ChangeSampleTypeProcedure(Guid id,
        [FromBody] ChangeSampleTypeProcedureRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var familyKey = await SampleTypeFamilyKeyAsync(id, cancellationToken);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"sample-type:{familyKey}", cancellationToken);
        var family = await dbContext.SampleTypeDefinitions.Where(value => value.DefinitionKey == familyKey)
            .OrderBy(value => value.Revision).ToListAsync(cancellationToken);
        var current = family[^1];
        EnsureVersion(current.Version, request.Version);
        var selected = await dbContext.SampleShippingProcedures.AsNoTracking()
            .SingleOrDefaultAsync(value => value.Id == request.ProcedureId, cancellationToken)
            ?? throw Invalid("shipping_procedure_unavailable", "Choose an available shared shipping procedure.");
        var active = await dbContext.SampleShippingProcedures.AsNoTracking().AnyAsync(value =>
            value.DefinitionKey == selected.DefinitionKey && value.IsActive, cancellationToken);
        if (!active)
            throw Invalid("shipping_procedure_unavailable", "Activate the selected procedure before using it on a Sample type.");
        var anchor = await dbContext.SampleShippingProcedures.AsNoTracking()
            .Where(value => value.DefinitionKey == selected.DefinitionKey && value.Revision == 1)
            .Select(value => value.Id).SingleAsync(cancellationToken);
        var link = await dbContext.SampleTypeProcedureLinks.SingleOrDefaultAsync(value =>
            value.SampleTypeAnchorId == family[0].Id, cancellationToken)
            ?? throw Conflict("sample_type_procedure_missing", "This Sample type has no procedure relationship. Refresh its configuration before changing it.");
        if (link.ProcedureAnchorId == anchor)
            throw Conflict("sample_type_procedure_unchanged", "This Sample type already uses the selected procedure.");
        link.ChangeProcedure(anchor, actor.Id, DateTime.UtcNow);
        foreach (var revision in family)
            revision.ChangeShippingProcedure(selected.Id);
        await dbContext.SaveChangesAsync(cancellationToken);
        if (transaction != null) await transaction.CommitAsync(cancellationToken);
        return Map(current);
    }

    [HttpPost("preview")]
    public async Task<SampleShippingPreviewDto> Preview(
        [FromBody] SampleShippingPreviewRequest request,
        CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var effectiveAt = request.EffectiveAt.HasValue
            ? RequireUtc(request.EffectiveAt.Value, "Preview effective-at")
            : DateTime.UtcNow;
        var requestedSampleTypeIds = request.SampleTypeDefinitionIds ?? [];
        var sampleTypeIds = requestedSampleTypeIds.Distinct().ToList();
        if (sampleTypeIds.Count == 0)
            throw Invalid("sample_type_required", "Select at least one sample type to preview.");
        if (sampleTypeIds.Count != requestedSampleTypeIds.Count)
            throw Invalid("sample_type_duplicate", "A sample type cannot be selected more than once.");

        var destination = await dbContext.SampleShippingDestinations.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == request.DestinationId, cancellationToken)
            ?? throw Missing("shipping_destination_not_found", "The selected shipping destination was not found.");
        var selected = await SampleShippingRevisionData.ReadAsync(dbContext, request.DestinationId, sampleTypeIds, effectiveAt, cancellationToken);
        if (selected.CurrentTypes.Count != sampleTypeIds.Count)
            throw Invalid("sample_type_duplicate", "Select each sample type only once, regardless of revision.");

        SampleShippingResolution resolution;
        try
        {
            resolution = selected.Resolve(destination, effectiveAt);
        }
        catch (ArgumentException exception)
        {
            throw Invalid("sample_shipping_preview_invalid", exception.Message);
        }
        catch (InvalidOperationException exception)
        {
            throw Conflict("sample_shipping_incompatible", exception.Message);
        }

        return new SampleShippingPreviewDto(
            effectiveAt,
            Map(resolution.Destination),
            resolution.Rules.Select(item => new SampleShippingPreviewRuleDto(
                Map(item.SampleType),
                item.PackingInstructions,
                item.TemperatureInstructions,
                item.CarrierInstructions,
                item.DispatchInstructions,
                item.DeliveryInstructions,
                item.RequiredDocuments,
                item.ExceptionInstructions,
                item.InternationalCustomsInstructions,
                item.ShippingProcedureId,
                destination.DeliveryInstructions)).ToList());
    }

    [HttpGet("packets/scan")]
    public async Task<SampleShippingPacketScanDto> ScanPacket(
        [FromQuery] string barcode,
        CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var packet = await SampleShippingPackingData.ResolvePacketAsync(dbContext, barcode, cancellationToken);
        var shipment = await dbContext.SampleShipments.AsNoTracking()
            .FirstAsync(item => item.Id == packet.SampleShipmentId, cancellationToken);
        var organizationName = await dbContext.Organizations.AsNoTracking()
            .Where(item => item.Id == shipment.OrganizationId)
            .Select(item => item.Name)
            .FirstAsync(cancellationToken);
        var destinationName = await dbContext.SampleShippingDestinations.AsNoTracking()
            .Where(item => item.Id == shipment.DestinationId)
            .Select(item => item.Name)
            .FirstAsync(cancellationToken);
        var submittedSpecimenIds = await dbContext.SampleShipmentItems.AsNoTracking()
            .Where(item => item.SampleShipmentId == shipment.Id)
            .Select(item => item.SubmittedSpecimenId)
            .ToListAsync(cancellationToken);
        var labWorkStatus = await dbContext.LabWorkOrders.AsNoTracking()
            .Where(item => item.Id == shipment.LabWorkOrderId)
            .Select(item => item.Status)
            .FirstAsync(cancellationToken);
        var labSpecimens = await dbContext.LabSpecimens.AsNoTracking()
            .Where(item => item.LabWorkOrderId == shipment.LabWorkOrderId
                && submittedSpecimenIds.Contains(item.SubmittedSpecimenId))
            .Select(item => new { item.ReceivedAtUtc, item.IntakeDisposition })
            .ToListAsync(cancellationToken);
        var expectedSampleCount = submittedSpecimenIds.Count;
        var receivedSampleCount = labSpecimens.Count(item => item.ReceivedAtUtc.HasValue);
        var awaitingReceiptSampleCount = labSpecimens.Count(
            item => item.IntakeDisposition == LabSpecimenIntakeDisposition.AwaitingReceipt);
        var receiptState = ResolveReceiptState(
            expectedSampleCount,
            receivedSampleCount,
            awaitingReceiptSampleCount,
            labSpecimens.Count,
            labSpecimens.Count(item => item.IntakeDisposition == LabSpecimenIntakeDisposition.Cancelled));
        var replacementBarcode = packet.ReplacedByPacketRevisionId.HasValue
            ? await dbContext.SampleShippingPacketRevisions.AsNoTracking()
                .Where(item => item.Id == packet.ReplacedByPacketRevisionId.Value)
                .Select(item => item.Barcode)
                .FirstOrDefaultAsync(cancellationToken)
            : null;
        var workflow = await workflowReader.ReadAsync(shipment.Id, null, cancellationToken);
        if (workflow.Crosswalk.Any(item => item.RegisteredSampleTubeId.HasValue))
        {
            receivedSampleCount = workflow.Crosswalk.GroupBy(item => item.SubmittedSpecimenId).Count(group => group.All(item => item.IsReceived));
            awaitingReceiptSampleCount = workflow.Crosswalk.GroupBy(item => item.SubmittedSpecimenId).Count(group => group.All(item => !item.IsReceived));
            if (receiptState is not ("Cancelled" or "SubmissionMismatch")) receiptState = workflow.ReceivedTubeCount == 0
                ? "AwaitingReceipt" : workflow.ReceivedTubeCount == workflow.ExpectedTubeCount ? "ReceiptRecorded" : "PartiallyReceived";
        }

        return new SampleShippingPacketScanDto(
            packet.Id,
            packet.PacketNumber,
            packet.Barcode,
            packet.Revision,
            packet.IsVoided,
            packet.VoidedAt,
            packet.VoidReason,
            replacementBarcode,
            shipment.Id,
            shipment.ShipmentNumber,
            shipment.Status.ToString(),
            shipment.OrganizationId,
            organizationName,
            shipment.AuthorizationSource.ToString(),
            shipment.AuthorizationSourceId,
            shipment.AuthorizationReference,
            shipment.AuthorizationName,
            shipment.LabWorkOrderId,
            labWorkStatus.ToString(),
            shipment.DestinationId,
            destinationName,
            shipment.Carrier,
            shipment.TrackingNumber,
            shipment.ShippedAt,
            expectedSampleCount,
            receivedSampleCount,
            awaitingReceiptSampleCount,
            receiptState,
            packet.IssuedAt,
            workflow.Crosswalk, workflow.ExpectedTubeCount, workflow.ReceivedTubeCount,
            workflow.OrderExpectedTubeCount, workflow.OrderReceivedTubeCount, shipment.DeliveredAt ?? shipment.ReceivedAt);
    }

    private static string ResolveReceiptState(
        int expectedSampleCount,
        int receivedSampleCount,
        int awaitingReceiptSampleCount,
        int labSpecimenCount,
        int cancelledSampleCount)
    {
        if (labSpecimenCount != expectedSampleCount) return "SubmissionMismatch";
        if (expectedSampleCount > 0 && cancelledSampleCount == expectedSampleCount) return "Cancelled";
        if (awaitingReceiptSampleCount == expectedSampleCount) return "AwaitingReceipt";
        if (receivedSampleCount == expectedSampleCount) return "ReceiptRecorded";
        return "PartiallyReceived";
    }

    private static SampleShippingDestinationDto Map(SampleShippingDestination item) => new(
        item.Id,
        item.DefinitionKey,
        item.Revision,
        item.SupersedesDestinationId,
        item.Code,
        item.Name,
        item.RecipientName,
        item.OrganizationName,
        item.AddressLine1,
        item.AddressLine2,
        item.City,
        item.StateOrProvince,
        item.PostalCode,
        item.CountryCode,
        item.ReceivingPhone,
        item.ReceivingEmail,
        item.ReceivingHours,
        item.TimeZoneId,
        item.ClosureInstructions,
        item.DeliveryInstructions,
        item.CarrierRestrictions,
        item.InternationalShippingAllowed,
        item.EffectiveFrom,
        item.EffectiveTo,
        item.IsActive,
        item.Version);

    private static SampleTypeDefinitionDto Map(SampleTypeDefinition item) => new(
        item.Id,
        item.DefinitionKey,
        item.Revision,
        item.SupersedesSampleTypeId,
        item.Code,
        item.Name,
        item.Description,
        item.MaterialClass,
        item.MinimumQuantity,
        item.MaximumQuantity,
        item.QuantityUnit,
        item.PrimaryContainerRequirements,
        item.TemperatureRequirements,
        item.StabilizerRequirements,
        item.PackagingInstructions,
        item.LabelingInstructions,
        item.ProhibitedIdentifiers,
        item.SafetyRequirements,
        item.CarrierRestrictions,
        item.MaximumTransitHours,
        item.EffectiveFrom,
        item.EffectiveTo,
        item.IsActive,
        item.Version,
        item.ShippingProcedureId);

    private static DateTime RequireUtc(DateTime value, string label)
    {
        if (value == default) throw Invalid("effective_time_required", $"{label} is required.");
        if (value.Kind == DateTimeKind.Unspecified)
            throw Invalid("effective_time_zone_required", $"{label} must include a time zone.");
        return value.ToUniversalTime();
    }

    private static void EnsureVersion(long current, long? requested)
    {
        if (!requested.HasValue || current != requested.Value)
            throw Conflict("sample_shipping_version_conflict", "This configuration changed after it was loaded. Refresh before making changes.");
    }

    private static T Execute<T>(string code, Func<T> action)
    {
        try { return action(); }
        catch (ArgumentException exception) { throw Invalid(code, exception.Message); }
        catch (InvalidOperationException exception) { throw Conflict(code, exception.Message); }
    }

    private static void Execute(string code, Action action)
    {
        try { action(); }
        catch (ArgumentException exception) { throw Invalid(code, exception.Message); }
        catch (InvalidOperationException exception) { throw Conflict(code, exception.Message); }
    }

    private static OrderManagementException Invalid(string code, string message) => new(code, message);
    private static OrderManagementException Conflict(string code, string message) =>
        new(code, message, StatusCodes.Status409Conflict);
    private static OrderManagementException Missing(string code, string message) =>
        new(code, message, StatusCodes.Status404NotFound);
}
