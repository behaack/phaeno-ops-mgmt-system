namespace PSeq.Operations.Commercial.OrderManagement.Domain;

using System.Security.Cryptography;
using PSeq.Operations.Commercial.Common.Persistence;

public enum SampleShipmentAuthorizationSource
{
    ProspectTrialProject,
    CustomerPromotionalOrder,
    CustomerLabServiceOrder
}

public enum SampleShipmentStatus
{
    Preparing,
    ReadyToShip,
    Shipped,
    Delivered,
    Received,
    Cancelled
}

public enum SampleReturnKitStatus
{
    Preparing,
    Fulfilled,
    Replaced,
    Cancelled
}

public enum RegisteredSampleTubeStatus
{
    Registered,
    Assigned,
    Accessioned,
    Retired
}

public enum SampleTubeAssignmentAction
{
    Assigned,
    Reassigned,
    Cleared
}

public sealed class SampleShippingDestination : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid DefinitionKey { get; private set; }
    public int Revision { get; private set; }
    public Guid? SupersedesDestinationId { get; private set; }
    public string Code { get; private set; } = null!;
    public string Name { get; private set; } = null!;
    public string RecipientName { get; private set; } = null!;
    public string OrganizationName { get; private set; } = null!;
    public string AddressLine1 { get; private set; } = null!;
    public string? AddressLine2 { get; private set; }
    public string City { get; private set; } = null!;
    public string StateOrProvince { get; private set; } = null!;
    public string PostalCode { get; private set; } = null!;
    public string CountryCode { get; private set; } = null!;
    public string? ReceivingPhone { get; private set; }
    public string? ReceivingEmail { get; private set; }
    public string ReceivingHours { get; private set; } = null!;
    public string TimeZoneId { get; private set; } = null!;
    public string? ClosureInstructions { get; private set; }
    public string DeliveryInstructions { get; private set; } = null!;
    public string? CarrierRestrictions { get; private set; }
    public bool InternationalShippingAllowed { get; private set; }
    public DateTime EffectiveFrom { get; private set; }
    public DateTime? EffectiveTo { get; private set; }
    public bool IsActive { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private SampleShippingDestination() { }

    public SampleShippingDestination(
        Guid definitionKey,
        int revision,
        Guid? supersedesDestinationId,
        string code,
        string name,
        string recipientName,
        string organizationName,
        string addressLine1,
        string? addressLine2,
        string city,
        string stateOrProvince,
        string postalCode,
        string countryCode,
        string? receivingPhone,
        string? receivingEmail,
        string receivingHours,
        string timeZoneId,
        string? closureInstructions,
        string deliveryInstructions,
        string? carrierRestrictions,
        bool internationalShippingAllowed,
        DateTime effectiveFrom,
        bool isActive)
    {
        if (definitionKey == Guid.Empty) throw new ArgumentException("A destination definition key is required.", nameof(definitionKey));
        if (revision < 1) throw new ArgumentOutOfRangeException(nameof(revision));
        if (revision == 1 && supersedesDestinationId.HasValue)
            throw new ArgumentException("The first destination revision cannot supersede another revision.", nameof(supersedesDestinationId));
        if (revision > 1 && !supersedesDestinationId.HasValue)
            throw new ArgumentException("A later destination revision must identify the revision it supersedes.", nameof(supersedesDestinationId));

        DefinitionKey = definitionKey;
        Revision = revision;
        SupersedesDestinationId = supersedesDestinationId;
        Code = SampleShippingText.Code(code, nameof(code));
        Name = OrderText.Required(name, nameof(name), 255);
        RecipientName = OrderText.Required(recipientName, nameof(recipientName), 255);
        OrganizationName = OrderText.Required(organizationName, nameof(organizationName), 255);
        AddressLine1 = OrderText.Required(addressLine1, nameof(addressLine1), 255);
        AddressLine2 = OrderText.Optional(addressLine2, 255);
        City = OrderText.Required(city, nameof(city), 150);
        StateOrProvince = OrderText.Required(stateOrProvince, nameof(stateOrProvince), 150);
        PostalCode = OrderText.Required(postalCode, nameof(postalCode), 50);
        CountryCode = SampleShippingText.CountryCode(countryCode);
        ReceivingPhone = OrderText.Optional(receivingPhone, 50);
        ReceivingEmail = SampleShippingText.OptionalEmail(receivingEmail);
        ReceivingHours = OrderText.Required(receivingHours, nameof(receivingHours), 1000);
        TimeZoneId = OrderText.Required(timeZoneId, nameof(timeZoneId), 100);
        ClosureInstructions = OrderText.Optional(closureInstructions, 2000);
        DeliveryInstructions = OrderText.Required(deliveryInstructions, nameof(deliveryInstructions), 4000);
        CarrierRestrictions = OrderText.Optional(carrierRestrictions, 2000);
        InternationalShippingAllowed = internationalShippingAllowed;
        EffectiveFrom = effectiveFrom;
        IsActive = isActive;
    }

    public bool IsEffectiveAt(DateTime utcNow) =>
        IsActive && EffectiveFrom <= utcNow && (!EffectiveTo.HasValue || EffectiveTo > utcNow);

    public void EndAt(DateTime effectiveTo)
    {
        if (effectiveTo <= EffectiveFrom)
            throw new ArgumentException("A destination revision must end after it begins.", nameof(effectiveTo));
        if (EffectiveTo.HasValue && effectiveTo > EffectiveTo.Value)
            throw new InvalidOperationException("A destination revision cannot be extended after it has been bounded.");
        EffectiveTo = effectiveTo;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class SampleTypeDefinition : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid DefinitionKey { get; private set; }
    public int Revision { get; private set; }
    public Guid? SupersedesSampleTypeId { get; private set; }
    public string Code { get; private set; } = null!;
    public string Name { get; private set; } = null!;
    public string Description { get; private set; } = string.Empty;
    public string MaterialClass { get; private set; } = null!;
    public decimal? MinimumQuantity { get; private set; }
    public decimal? MaximumQuantity { get; private set; }
    public string QuantityUnit { get; private set; } = null!;
    public string PrimaryContainerRequirements { get; private set; } = null!;
    public string TemperatureRequirements { get; private set; } = null!;
    public string? StabilizerRequirements { get; private set; }
    public string PackagingInstructions { get; private set; } = null!;
    public string LabelingInstructions { get; private set; } = null!;
    public string ProhibitedIdentifiers { get; private set; } = null!;
    public string SafetyRequirements { get; private set; } = null!;
    public string? CarrierRestrictions { get; private set; }
    public int? MaximumTransitHours { get; private set; }
    public DateTime EffectiveFrom { get; private set; }
    public DateTime? EffectiveTo { get; private set; }
    public bool IsActive { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private SampleTypeDefinition() { }

    public SampleTypeDefinition(
        Guid definitionKey,
        int revision,
        Guid? supersedesSampleTypeId,
        string code,
        string name,
        string description,
        string materialClass,
        decimal? minimumQuantity,
        decimal? maximumQuantity,
        string quantityUnit,
        string primaryContainerRequirements,
        string temperatureRequirements,
        string? stabilizerRequirements,
        string packagingInstructions,
        string labelingInstructions,
        string prohibitedIdentifiers,
        string safetyRequirements,
        string? carrierRestrictions,
        int? maximumTransitHours,
        DateTime effectiveFrom,
        bool isActive)
    {
        if (definitionKey == Guid.Empty) throw new ArgumentException("A sample-type definition key is required.", nameof(definitionKey));
        if (revision < 1) throw new ArgumentOutOfRangeException(nameof(revision));
        if (revision == 1 && supersedesSampleTypeId.HasValue)
            throw new ArgumentException("The first sample-type revision cannot supersede another revision.", nameof(supersedesSampleTypeId));
        if (revision > 1 && !supersedesSampleTypeId.HasValue)
            throw new ArgumentException("A later sample-type revision must identify the revision it supersedes.", nameof(supersedesSampleTypeId));
        if (minimumQuantity is < 0) throw new ArgumentOutOfRangeException(nameof(minimumQuantity));
        if (maximumQuantity is <= 0) throw new ArgumentOutOfRangeException(nameof(maximumQuantity));
        if (minimumQuantity.HasValue && maximumQuantity.HasValue && maximumQuantity < minimumQuantity)
            throw new ArgumentException("Maximum quantity cannot be less than minimum quantity.");
        if (maximumTransitHours is <= 0) throw new ArgumentOutOfRangeException(nameof(maximumTransitHours));

        DefinitionKey = definitionKey;
        Revision = revision;
        SupersedesSampleTypeId = supersedesSampleTypeId;
        Code = SampleShippingText.Code(code, nameof(code));
        Name = OrderText.Required(name, nameof(name), 255);
        Description = OrderText.Optional(description, 2000) ?? string.Empty;
        MaterialClass = OrderText.Required(materialClass, nameof(materialClass), 255);
        MinimumQuantity = minimumQuantity;
        MaximumQuantity = maximumQuantity;
        QuantityUnit = OrderText.Required(quantityUnit, nameof(quantityUnit), 100);
        PrimaryContainerRequirements = OrderText.Required(primaryContainerRequirements, nameof(primaryContainerRequirements), 2000);
        TemperatureRequirements = OrderText.Required(temperatureRequirements, nameof(temperatureRequirements), 2000);
        StabilizerRequirements = OrderText.Optional(stabilizerRequirements, 2000);
        PackagingInstructions = OrderText.Required(packagingInstructions, nameof(packagingInstructions), 4000);
        LabelingInstructions = OrderText.Required(labelingInstructions, nameof(labelingInstructions), 4000);
        ProhibitedIdentifiers = OrderText.Required(prohibitedIdentifiers, nameof(prohibitedIdentifiers), 2000);
        SafetyRequirements = OrderText.Required(safetyRequirements, nameof(safetyRequirements), 2000);
        CarrierRestrictions = OrderText.Optional(carrierRestrictions, 2000);
        MaximumTransitHours = maximumTransitHours;
        EffectiveFrom = effectiveFrom;
        IsActive = isActive;
    }

    public bool IsEffectiveAt(DateTime utcNow) =>
        IsActive && EffectiveFrom <= utcNow && (!EffectiveTo.HasValue || EffectiveTo > utcNow);

    public void EndAt(DateTime effectiveTo)
    {
        if (effectiveTo <= EffectiveFrom)
            throw new ArgumentException("A sample-type revision must end after it begins.", nameof(effectiveTo));
        if (EffectiveTo.HasValue && effectiveTo > EffectiveTo.Value)
            throw new InvalidOperationException("A sample-type revision cannot be extended after it has been bounded.");
        EffectiveTo = effectiveTo;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class SampleShippingInstructionRule : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid DefinitionKey { get; private set; }
    public int Revision { get; private set; }
    public Guid? SupersedesInstructionRuleId { get; private set; }
    public Guid DestinationId { get; private set; }
    public Guid SampleTypeDefinitionId { get; private set; }
    public string CompatibilityGroup { get; private set; } = null!;
    public string PackingInstructions { get; private set; } = null!;
    public string TemperatureInstructions { get; private set; } = null!;
    public string CarrierInstructions { get; private set; } = null!;
    public string DispatchInstructions { get; private set; } = null!;
    public string DeliveryInstructions { get; private set; } = null!;
    public string RequiredDocuments { get; private set; } = null!;
    public string ExceptionInstructions { get; private set; } = null!;
    public string? InternationalCustomsInstructions { get; private set; }
    public bool RequiresSeparateShipment { get; private set; }
    public DateTime EffectiveFrom { get; private set; }
    public DateTime? EffectiveTo { get; private set; }
    public bool IsActive { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private SampleShippingInstructionRule() { }

    public SampleShippingInstructionRule(
        Guid definitionKey,
        int revision,
        Guid? supersedesInstructionRuleId,
        Guid destinationId,
        Guid sampleTypeDefinitionId,
        string compatibilityGroup,
        string packingInstructions,
        string temperatureInstructions,
        string carrierInstructions,
        string dispatchInstructions,
        string deliveryInstructions,
        string requiredDocuments,
        string exceptionInstructions,
        string? internationalCustomsInstructions,
        bool requiresSeparateShipment,
        DateTime effectiveFrom,
        bool isActive)
    {
        if (definitionKey == Guid.Empty || destinationId == Guid.Empty || sampleTypeDefinitionId == Guid.Empty)
            throw new ArgumentException("Instruction-rule, destination, and sample-type identifiers are required.");
        if (revision < 1) throw new ArgumentOutOfRangeException(nameof(revision));
        if (revision == 1 && supersedesInstructionRuleId.HasValue)
            throw new ArgumentException("The first instruction-rule revision cannot supersede another revision.", nameof(supersedesInstructionRuleId));
        if (revision > 1 && !supersedesInstructionRuleId.HasValue)
            throw new ArgumentException("A later instruction-rule revision must identify the revision it supersedes.", nameof(supersedesInstructionRuleId));

        DefinitionKey = definitionKey;
        Revision = revision;
        SupersedesInstructionRuleId = supersedesInstructionRuleId;
        DestinationId = destinationId;
        SampleTypeDefinitionId = sampleTypeDefinitionId;
        CompatibilityGroup = SampleShippingText.Code(compatibilityGroup, nameof(compatibilityGroup));
        PackingInstructions = OrderText.Required(packingInstructions, nameof(packingInstructions), 4000);
        TemperatureInstructions = OrderText.Required(temperatureInstructions, nameof(temperatureInstructions), 4000);
        CarrierInstructions = OrderText.Required(carrierInstructions, nameof(carrierInstructions), 4000);
        DispatchInstructions = OrderText.Required(dispatchInstructions, nameof(dispatchInstructions), 4000);
        DeliveryInstructions = OrderText.Required(deliveryInstructions, nameof(deliveryInstructions), 4000);
        RequiredDocuments = OrderText.Required(requiredDocuments, nameof(requiredDocuments), 4000);
        ExceptionInstructions = OrderText.Required(exceptionInstructions, nameof(exceptionInstructions), 4000);
        InternationalCustomsInstructions = OrderText.Optional(internationalCustomsInstructions, 4000);
        RequiresSeparateShipment = requiresSeparateShipment;
        EffectiveFrom = effectiveFrom;
        IsActive = isActive;
    }

    public bool IsEffectiveAt(DateTime utcNow) =>
        IsActive && EffectiveFrom <= utcNow && (!EffectiveTo.HasValue || EffectiveTo > utcNow);

    public void EndAt(DateTime effectiveTo)
    {
        if (effectiveTo <= EffectiveFrom)
            throw new ArgumentException("An instruction-rule revision must end after it begins.", nameof(effectiveTo));
        if (EffectiveTo.HasValue && effectiveTo > EffectiveTo.Value)
            throw new InvalidOperationException("An instruction-rule revision cannot be extended after it has been bounded.");
        EffectiveTo = effectiveTo;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed record ResolvedSampleShippingRule(
    SampleTypeDefinition SampleType,
    SampleShippingInstructionRule Rule);

public sealed record SampleShippingResolution(
    SampleShippingDestination Destination,
    IReadOnlyList<ResolvedSampleShippingRule> Rules,
    string CompatibilityGroup,
    bool RequiresSeparateShipment);

public static class SampleShippingCompatibilityResolver
{
    public static SampleShippingResolution Resolve(
        SampleShippingDestination destination,
        IReadOnlyCollection<SampleTypeDefinition> sampleTypes,
        IReadOnlyCollection<SampleShippingInstructionRule> instructionRules,
        DateTime effectiveAt)
    {
        if (!destination.IsEffectiveAt(effectiveAt))
            throw new InvalidOperationException("The selected shipping destination is not effective at the requested time.");
        if (sampleTypes.Count == 0)
            throw new ArgumentException("Select at least one sample type.", nameof(sampleTypes));
        if (sampleTypes.Select(item => item.Id).Distinct().Count() != sampleTypes.Count)
            throw new ArgumentException("A sample type cannot be selected more than once.", nameof(sampleTypes));

        var resolved = new List<ResolvedSampleShippingRule>(sampleTypes.Count);
        foreach (var sampleType in sampleTypes)
        {
            if (!sampleType.IsEffectiveAt(effectiveAt))
                throw new InvalidOperationException($"Sample type '{sampleType.Name}' is not effective at the requested time.");

            var matches = instructionRules
                .Where(rule => rule.DestinationId == destination.Id
                    && rule.SampleTypeDefinitionId == sampleType.Id
                    && rule.IsEffectiveAt(effectiveAt))
                .ToList();
            if (matches.Count == 0)
                throw new InvalidOperationException($"No effective shipping instruction rule exists for '{sampleType.Name}' and '{destination.Name}'.");
            if (matches.Count > 1)
                throw new InvalidOperationException($"More than one effective shipping instruction rule exists for '{sampleType.Name}' and '{destination.Name}'.");
            resolved.Add(new ResolvedSampleShippingRule(sampleType, matches[0]));
        }

        var compatibilityGroups = resolved
            .Select(item => item.Rule.CompatibilityGroup)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        var requiresSeparateShipment = resolved.Any(item => item.Rule.RequiresSeparateShipment);
        if (resolved.Count > 1 && (requiresSeparateShipment || compatibilityGroups.Count > 1))
            throw new InvalidOperationException("The selected sample types require separate shipment packets.");

        return new SampleShippingResolution(
            destination,
            resolved,
            compatibilityGroups.Single(),
            requiresSeparateShipment);
    }
}

public sealed class SampleReturnKit : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string KitNumber { get; private set; } = null!;
    public Guid SampleShipmentId { get; private set; }
    public Guid OrganizationId { get; private set; }
    public SampleShipmentAuthorizationSource AuthorizationSource { get; private set; }
    public Guid AuthorizationSourceId { get; private set; }
    public string TubeSupplierName { get; private set; } = null!;
    public string TubeProductNumber { get; private set; } = null!;
    public string? TubeLotNumber { get; private set; }
    public string ShipperSupplierName { get; private set; } = null!;
    public string ShipperProductNumber { get; private set; } = null!;
    public int RequiredTubeCount { get; private set; }
    public SampleReturnKitStatus Status { get; private set; } = SampleReturnKitStatus.Preparing;
    public string? OutboundCarrier { get; private set; }
    public string? OutboundTrackingNumber { get; private set; }
    public DateTime? FulfilledAt { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    public ICollection<RegisteredSampleTube> Tubes { get; private set; } = [];

    private SampleReturnKit() { }

    public SampleReturnKit(
        string kitNumber,
        Guid sampleShipmentId,
        Guid organizationId,
        SampleShipmentAuthorizationSource authorizationSource,
        Guid authorizationSourceId,
        string tubeSupplierName,
        string tubeProductNumber,
        string? tubeLotNumber,
        string shipperSupplierName,
        string shipperProductNumber,
        int requiredTubeCount)
    {
        if (sampleShipmentId == Guid.Empty || organizationId == Guid.Empty || authorizationSourceId == Guid.Empty)
            throw new ArgumentException("Shipment, organization, and authorization identifiers are required.");
        if (requiredTubeCount < 1 || requiredTubeCount > 10_000)
            throw new ArgumentOutOfRangeException(nameof(requiredTubeCount), "A return kit must contain between 1 and 10,000 tubes.");

        KitNumber = SampleShippingText.Reference(kitNumber, nameof(kitNumber));
        SampleShipmentId = sampleShipmentId;
        OrganizationId = organizationId;
        AuthorizationSource = authorizationSource;
        AuthorizationSourceId = authorizationSourceId;
        TubeSupplierName = OrderText.Required(tubeSupplierName, nameof(tubeSupplierName), 255);
        TubeProductNumber = SampleShippingText.ProductNumber(tubeProductNumber, nameof(tubeProductNumber));
        TubeLotNumber = OrderText.Optional(tubeLotNumber, 100);
        ShipperSupplierName = OrderText.Required(shipperSupplierName, nameof(shipperSupplierName), 255);
        ShipperProductNumber = SampleShippingText.ProductNumber(shipperProductNumber, nameof(shipperProductNumber));
        RequiredTubeCount = requiredTubeCount;
    }

    public void Fulfill(string outboundCarrier, string outboundTrackingNumber, DateTime fulfilledAt)
    {
        if (Status != SampleReturnKitStatus.Preparing)
            throw new InvalidOperationException("Only a preparing return kit can be fulfilled.");
        if (Tubes.Count != RequiredTubeCount)
            throw new InvalidOperationException($"Register exactly {RequiredTubeCount} unique tubes before fulfilling this kit.");
        if (Tubes.Any(tube => tube.Status != RegisteredSampleTubeStatus.Registered))
            throw new InvalidOperationException("Every tube must still be registered and unused when the return kit is fulfilled.");

        OutboundCarrier = OrderText.Required(outboundCarrier, nameof(outboundCarrier), 255);
        OutboundTrackingNumber = OrderText.Required(outboundTrackingNumber, nameof(outboundTrackingNumber), 255);
        FulfilledAt = fulfilledAt;
        Status = SampleReturnKitStatus.Fulfilled;
    }

    public void Replace()
    {
        if (Status is SampleReturnKitStatus.Replaced or SampleReturnKitStatus.Cancelled)
            throw new InvalidOperationException("This return kit is already inactive.");
        if (Tubes.Any(tube => tube.Status == RegisteredSampleTubeStatus.Accessioned))
            throw new InvalidOperationException("A return kit with an accessioned tube cannot be replaced.");
        Status = SampleReturnKitStatus.Replaced;
    }

    public void Cancel()
    {
        if (Status is SampleReturnKitStatus.Replaced or SampleReturnKitStatus.Cancelled)
            throw new InvalidOperationException("This return kit is already inactive.");
        if (Tubes.Any(tube => tube.Status == RegisteredSampleTubeStatus.Accessioned))
            throw new InvalidOperationException("A return kit with an accessioned tube cannot be cancelled.");
        Status = SampleReturnKitStatus.Cancelled;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class RegisteredSampleTube : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid SampleReturnKitId { get; private set; }
    public string SupplierBarcode { get; private set; } = null!;
    public RegisteredSampleTubeStatus Status { get; private set; } = RegisteredSampleTubeStatus.Registered;
    public DateTime? AssignedAt { get; private set; }
    public DateTime? AccessionedAt { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private RegisteredSampleTube() { }

    public RegisteredSampleTube(Guid sampleReturnKitId, string supplierBarcode)
    {
        if (sampleReturnKitId == Guid.Empty)
            throw new ArgumentException("A return-kit identifier is required.", nameof(sampleReturnKitId));
        if (!SupplierTubeBarcode.TryNormalize(supplierBarcode, out var normalized))
            throw new ArgumentException("Scan or enter a complete supplier tube barcode.", nameof(supplierBarcode));
        SampleReturnKitId = sampleReturnKitId;
        SupplierBarcode = normalized;
    }

    public void MarkAssigned(DateTime assignedAt)
    {
        if (Status is RegisteredSampleTubeStatus.Accessioned or RegisteredSampleTubeStatus.Retired)
            throw new InvalidOperationException("An accessioned or retired tube cannot be assigned.");
        Status = RegisteredSampleTubeStatus.Assigned;
        AssignedAt = assignedAt;
    }

    public void MarkAvailable()
    {
        if (Status != RegisteredSampleTubeStatus.Assigned)
            throw new InvalidOperationException("Only an assigned tube can be returned to the available kit inventory.");
        Status = RegisteredSampleTubeStatus.Registered;
        AssignedAt = null;
    }

    public void MarkAccessioned(DateTime accessionedAt)
    {
        if (Status != RegisteredSampleTubeStatus.Assigned)
            throw new InvalidOperationException("Only an assigned tube can be accessioned.");
        Status = RegisteredSampleTubeStatus.Accessioned;
        AccessionedAt = accessionedAt;
    }

    public void Retire()
    {
        if (Status == RegisteredSampleTubeStatus.Accessioned)
            throw new InvalidOperationException("An accessioned tube cannot be retired from the return kit.");
        Status = RegisteredSampleTubeStatus.Retired;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class SampleTubeAssignmentEvent
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid SampleShipmentId { get; private set; }
    public Guid SampleShipmentItemId { get; private set; }
    public Guid? SampleShipmentTubeSlotId { get; private set; }
    public Guid RegisteredSampleTubeId { get; private set; }
    public string CustomerSampleId { get; private set; } = null!;
    public string SupplierBarcode { get; private set; } = null!;
    public SampleTubeAssignmentAction Action { get; private set; }
    public string? Reason { get; private set; }
    public Guid ActorUserId { get; private set; }
    public DateTime OccurredAt { get; private set; }

    private SampleTubeAssignmentEvent() { }

    public SampleTubeAssignmentEvent(
        Guid sampleShipmentId,
        Guid sampleShipmentItemId,
        Guid registeredSampleTubeId,
        string customerSampleId,
        string supplierBarcode,
        SampleTubeAssignmentAction action,
        string? reason,
        Guid actorUserId,
        DateTime occurredAt)
        : this(sampleShipmentId, sampleShipmentItemId, null, registeredSampleTubeId,
            customerSampleId, supplierBarcode, action, reason, actorUserId, occurredAt) { }

    public SampleTubeAssignmentEvent(
        Guid sampleShipmentId,
        Guid sampleShipmentItemId,
        Guid? sampleShipmentTubeSlotId,
        Guid registeredSampleTubeId,
        string customerSampleId,
        string supplierBarcode,
        SampleTubeAssignmentAction action,
        string? reason,
        Guid actorUserId,
        DateTime occurredAt)
    {
        if (sampleShipmentId == Guid.Empty || sampleShipmentItemId == Guid.Empty
            || registeredSampleTubeId == Guid.Empty || actorUserId == Guid.Empty)
            throw new ArgumentException("Shipment, item, tube, and actor identifiers are required.");
        SampleShipmentId = sampleShipmentId;
        SampleShipmentItemId = sampleShipmentItemId;
        SampleShipmentTubeSlotId = sampleShipmentTubeSlotId;
        RegisteredSampleTubeId = registeredSampleTubeId;
        CustomerSampleId = SampleShippingText.Reference(customerSampleId, nameof(customerSampleId));
        SupplierBarcode = supplierBarcode;
        Action = action;
        Reason = OrderText.Optional(reason, 1000);
        ActorUserId = actorUserId;
        OccurredAt = occurredAt;
    }
}

public sealed class SampleShipment : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string ShipmentNumber { get; private set; } = null!;
    public Guid OrganizationId { get; private set; }
    public Guid DepartmentId { get; private set; }
    public SampleShipmentAuthorizationSource AuthorizationSource { get; private set; }
    public Guid AuthorizationSourceId { get; private set; }
    public string AuthorizationReference { get; private set; } = null!;
    public string AuthorizationName { get; private set; } = null!;
    public Guid LabWorkOrderId { get; private set; }
    public Guid DestinationId { get; private set; }
    public SampleShipmentStatus Status { get; private set; } = SampleShipmentStatus.Preparing;
    public string? Carrier { get; private set; }
    public string? TrackingNumber { get; private set; }
    public DateTime? ShippedAt { get; private set; }
    public DateTime? DeliveredAt { get; private set; }
    public DateTime? ReceivedAt { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    public ICollection<SampleShipmentItem> Items { get; private set; } = [];
    public ICollection<SampleShippingPacketRevision> PacketRevisions { get; private set; } = [];
    public SampleReturnKit? ReturnKit { get; private set; }

    private SampleShipment() { }

    public SampleShipment(
        string shipmentNumber,
        Guid organizationId,
        Guid departmentId,
        SampleShipmentAuthorizationSource authorizationSource,
        Guid authorizationSourceId,
        string authorizationReference,
        string authorizationName,
        Guid labWorkOrderId,
        Guid destinationId)
    {
        if (organizationId == Guid.Empty || departmentId == Guid.Empty || authorizationSourceId == Guid.Empty
            || labWorkOrderId == Guid.Empty || destinationId == Guid.Empty)
            throw new ArgumentException("Organization, authorization, Lab work, and destination identifiers are required.");
        ShipmentNumber = SampleShippingText.Reference(shipmentNumber, nameof(shipmentNumber));
        OrganizationId = organizationId;
        DepartmentId = departmentId;
        AuthorizationSource = authorizationSource;
        AuthorizationSourceId = authorizationSourceId;
        AuthorizationReference = SampleShippingText.Reference(authorizationReference, nameof(authorizationReference));
        AuthorizationName = OrderText.Required(authorizationName, nameof(authorizationName), 255);
        LabWorkOrderId = labWorkOrderId;
        DestinationId = destinationId;
    }

    public void MarkReadyToShip()
    {
        if (Status != SampleShipmentStatus.Preparing || Items.Count == 0 || PacketRevisions.Count == 0)
            throw new InvalidOperationException("A preparing shipment needs samples and an issued packet before it can be ready to ship.");
        Status = SampleShipmentStatus.ReadyToShip;
    }

    public void RecordShipment(string carrier, string trackingNumber, DateTime shippedAt)
    {
        if (Status != SampleShipmentStatus.ReadyToShip)
            throw new InvalidOperationException("Only a ready shipment can be marked shipped.");
        Carrier = OrderText.Required(carrier, nameof(carrier), 255);
        TrackingNumber = OrderText.Required(trackingNumber, nameof(trackingNumber), 255);
        ShippedAt = shippedAt;
        Status = SampleShipmentStatus.Shipped;
    }

    public void MarkDelivered(DateTime deliveredAt)
    {
        if (Status != SampleShipmentStatus.Shipped)
            throw new InvalidOperationException("Only a shipped sample shipment can be marked delivered.");
        if (ShippedAt.HasValue && deliveredAt < ShippedAt.Value)
            throw new ArgumentException("Delivery cannot precede shipment.", nameof(deliveredAt));
        DeliveredAt = deliveredAt;
        Status = SampleShipmentStatus.Delivered;
    }

    public void MarkReceived(DateTime receivedAt)
    {
        if (Status is not (SampleShipmentStatus.Shipped or SampleShipmentStatus.Delivered))
            throw new InvalidOperationException("Only an in-transit or delivered sample shipment can be received.");
        if (ShippedAt.HasValue && receivedAt < ShippedAt.Value)
            throw new ArgumentException("Receipt cannot precede shipment.", nameof(receivedAt));
        ReceivedAt = receivedAt;
        Status = SampleShipmentStatus.Received;
    }

    public void Cancel()
    {
        if (Status is SampleShipmentStatus.Received or SampleShipmentStatus.Cancelled)
            throw new InvalidOperationException("A received or cancelled shipment cannot be cancelled.");
        Status = SampleShipmentStatus.Cancelled;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class SampleShipmentItem : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid SampleShipmentId { get; private set; }
    public Guid SubmittedSpecimenId { get; private set; }
    public Guid SampleTypeDefinitionId { get; private set; }
    public string CustomerSampleId { get; private set; } = null!;
    public string SampleName { get; private set; } = null!;
    public decimal Quantity { get; private set; }
    public string QuantityUnit { get; private set; } = null!;
    public Guid? RegisteredSampleTubeId { get; private set; }
    public DateTime? TubeAssignedAt { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    public ICollection<SampleShipmentTubeSlot> TubeSlots { get; private set; } = [];

    private SampleShipmentItem() { }

    public SampleShipmentItem(
        Guid sampleShipmentId,
        Guid submittedSpecimenId,
        Guid sampleTypeDefinitionId,
        string customerSampleId,
        string sampleName,
        decimal quantity,
        string quantityUnit)
    {
        if (sampleShipmentId == Guid.Empty || submittedSpecimenId == Guid.Empty || sampleTypeDefinitionId == Guid.Empty)
            throw new ArgumentException("Shipment, submitted-specimen, and sample-type identifiers are required.");
        if (quantity <= 0) throw new ArgumentOutOfRangeException(nameof(quantity));
        SampleShipmentId = sampleShipmentId;
        SubmittedSpecimenId = submittedSpecimenId;
        SampleTypeDefinitionId = sampleTypeDefinitionId;
        CustomerSampleId = SampleShippingText.Reference(customerSampleId, nameof(customerSampleId));
        SampleName = OrderText.Required(sampleName, nameof(sampleName), 255);
        Quantity = quantity;
        QuantityUnit = OrderText.Required(quantityUnit, nameof(quantityUnit), 100);
    }

    public void AssignTube(Guid registeredSampleTubeId, DateTime assignedAt)
    {
        if (registeredSampleTubeId == Guid.Empty)
            throw new ArgumentException("A registered tube is required.", nameof(registeredSampleTubeId));
        RegisteredSampleTubeId = registeredSampleTubeId;
        TubeAssignedAt = assignedAt;
    }

    public Guid ClearTube()
    {
        if (!RegisteredSampleTubeId.HasValue)
            throw new InvalidOperationException("This sample does not have a tube assignment.");
        var previous = RegisteredSampleTubeId.Value;
        RegisteredSampleTubeId = null;
        TubeAssignedAt = null;
        return previous;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class SampleShipmentTubeSlot : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid SampleShipmentItemId { get; private set; }
    public int Ordinal { get; private set; }
    public Guid? RegisteredSampleTubeId { get; private set; }
    public DateTime? TubeAssignedAt { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private SampleShipmentTubeSlot() { }

    public SampleShipmentTubeSlot(Guid sampleShipmentItemId, int ordinal)
    {
        if (sampleShipmentItemId == Guid.Empty)
            throw new ArgumentException("A shipment item is required.", nameof(sampleShipmentItemId));
        if (ordinal < 1) throw new ArgumentOutOfRangeException(nameof(ordinal));
        SampleShipmentItemId = sampleShipmentItemId;
        Ordinal = ordinal;
    }

    public void AssignTube(Guid registeredSampleTubeId, DateTime assignedAt)
    {
        if (registeredSampleTubeId == Guid.Empty)
            throw new ArgumentException("A registered tube is required.", nameof(registeredSampleTubeId));
        RegisteredSampleTubeId = registeredSampleTubeId;
        TubeAssignedAt = assignedAt;
    }

    public Guid ClearTube()
    {
        if (!RegisteredSampleTubeId.HasValue)
            throw new InvalidOperationException("This tube slot does not have a tube assignment.");
        var previous = RegisteredSampleTubeId.Value;
        RegisteredSampleTubeId = null;
        TubeAssignedAt = null;
        return previous;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class SampleShippingPacketRevision : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid SampleShipmentId { get; private set; }
    public int Revision { get; private set; }
    public string PacketNumber { get; private set; } = null!;
    public string Barcode { get; private set; } = null!;
    public string DestinationSnapshotJson { get; private set; } = null!;
    public string InstructionSnapshotJson { get; private set; } = null!;
    public string ManifestSnapshotJson { get; private set; } = null!;
    public DateTime IssuedAt { get; private set; }
    public DateTime? VoidedAt { get; private set; }
    public string? VoidReason { get; private set; }
    public Guid? ReplacedByPacketRevisionId { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    public bool IsVoided => VoidedAt.HasValue;

    private SampleShippingPacketRevision() { }

    public SampleShippingPacketRevision(
        Guid sampleShipmentId,
        int revision,
        string packetNumber,
        string barcode,
        string destinationSnapshotJson,
        string instructionSnapshotJson,
        string manifestSnapshotJson,
        DateTime issuedAt)
    {
        if (sampleShipmentId == Guid.Empty) throw new ArgumentException("A shipment identifier is required.", nameof(sampleShipmentId));
        if (revision < 1) throw new ArgumentOutOfRangeException(nameof(revision));
        if (!SampleShippingBarcode.TryNormalize(barcode, out var normalizedBarcode))
            throw new ArgumentException("A valid sample-shipping packet barcode is required.", nameof(barcode));
        SampleShipmentId = sampleShipmentId;
        Revision = revision;
        PacketNumber = SampleShippingText.Reference(packetNumber, nameof(packetNumber));
        Barcode = normalizedBarcode;
        DestinationSnapshotJson = OrderText.Json(destinationSnapshotJson);
        InstructionSnapshotJson = OrderText.Json(instructionSnapshotJson);
        ManifestSnapshotJson = OrderText.Json(manifestSnapshotJson);
        IssuedAt = issuedAt;
    }

    public void Void(DateTime voidedAt, string reason, Guid? replacedByPacketRevisionId)
    {
        if (IsVoided) throw new InvalidOperationException("The packet revision is already voided.");
        if (voidedAt < IssuedAt) throw new ArgumentException("A packet cannot be voided before it is issued.", nameof(voidedAt));
        if (replacedByPacketRevisionId == Id) throw new ArgumentException("A packet cannot replace itself.", nameof(replacedByPacketRevisionId));
        VoidedAt = voidedAt;
        VoidReason = OrderText.Required(reason, nameof(reason), 2000);
        ReplacedByPacketRevisionId = replacedByPacketRevisionId;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public static class SampleShippingBarcode
{
    private const string SafeAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private const int TokenLength = 10;

    public static string Create()
    {
        Span<char> token = stackalloc char[TokenLength];
        for (var index = 0; index < token.Length; index++)
            token[index] = SafeAlphabet[RandomNumberGenerator.GetInt32(SafeAlphabet.Length)];
        var payload = $"PH-P-{token}";
        return $"{payload}-{Checksum(payload)}";
    }

    public static bool TryNormalize(string? value, out string barcode)
    {
        barcode = string.Empty;
        if (string.IsNullOrWhiteSpace(value)) return false;
        var candidate = value.Trim().ToUpperInvariant();
        if (candidate.Length > 2 && candidate[0] == '*' && candidate[^1] == '*')
            candidate = candidate[1..^1];
        var parts = candidate.Split('-', StringSplitOptions.None);
        if (parts is not ["PH", "P", string { Length: TokenLength } token, string { Length: 1 } check]
            || token.Any(character => !SafeAlphabet.Contains(character))
            || !SafeAlphabet.Contains(check, StringComparison.Ordinal))
            return false;
        var payload = string.Join('-', parts[..3]);
        if (check[0] != Checksum(payload)) return false;
        barcode = candidate;
        return true;
    }

    private static char Checksum(string payload)
    {
        var checksum = 0;
        foreach (var character in payload)
            checksum = ((checksum * 33) + character) % SafeAlphabet.Length;
        return SafeAlphabet[checksum];
    }
}

public static class SupplierTubeBarcode
{
    public static bool TryNormalize(string? value, out string barcode)
    {
        barcode = string.Empty;
        if (string.IsNullOrWhiteSpace(value)) return false;
        var candidate = value.Trim().ToUpperInvariant();
        if (candidate.Length > 2 && candidate[0] == '*' && candidate[^1] == '*')
            candidate = candidate[1..^1];
        if (candidate.Length is < 4 or > 100) return false;
        if (candidate.Any(character => !IsSupported(character))) return false;
        barcode = candidate;
        return true;
    }

    private static bool IsSupported(char character) =>
        character is >= 'A' and <= 'Z'
        || character is >= '0' and <= '9'
        || character is '-' or '.' or '_' or '/';
}

internal static class SampleShippingText
{
    private static readonly System.Text.RegularExpressions.Regex CodePattern = new(
        "^[A-Z0-9][A-Z0-9_-]*$",
        System.Text.RegularExpressions.RegexOptions.Compiled | System.Text.RegularExpressions.RegexOptions.CultureInvariant);

    public static string Code(string value, string name)
    {
        var normalized = OrderText.Required(value, name, 50).ToUpperInvariant();
        if (!CodePattern.IsMatch(normalized))
            throw new ArgumentException($"{name} may contain only letters, numbers, hyphens, and underscores.", name);
        return normalized;
    }

    public static string Reference(string value, string name) =>
        OrderText.Required(value, name, 100);

    public static string ProductNumber(string value, string name) =>
        OrderText.Required(value, name, 100);

    public static string CountryCode(string value)
    {
        var normalized = OrderText.Required(value, nameof(value), 2).ToUpperInvariant();
        if (normalized.Length != 2 || normalized.Any(character => character is < 'A' or > 'Z'))
            throw new ArgumentException("Country code must be a two-letter code.", nameof(value));
        return normalized;
    }

    public static string? OptionalEmail(string? value)
    {
        var normalized = OrderText.Optional(value, 255);
        if (normalized == null) return null;
        try { _ = new System.Net.Mail.MailAddress(normalized); }
        catch (FormatException exception) { throw new ArgumentException("Receiving email must be a valid email address.", nameof(value), exception); }
        return normalized;
    }
}
