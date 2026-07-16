namespace PhaenoPortal.App.Features.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public sealed class QboCatalogItem : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string ExternalItemId { get; private set; } = null!;
    public string Name { get; private set; } = null!;
    public string Description { get; private set; } = string.Empty;
    public string SalesUnit { get; private set; } = null!;
    public decimal BasePrice { get; private set; }
    public string Currency { get; private set; } = "USD";
    public bool IsActive { get; private set; } = true;
    public DateTime LastSyncedAt { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private QboCatalogItem() { }

    public QboCatalogItem(
        string externalItemId,
        string name,
        string description,
        string salesUnit,
        decimal basePrice,
        string currency,
        bool isActive,
        DateTime syncedAt)
    {
        Sync(externalItemId, name, description, salesUnit, basePrice, currency, isActive, syncedAt);
    }

    public void Sync(
        string externalItemId,
        string name,
        string description,
        string salesUnit,
        decimal basePrice,
        string currency,
        bool isActive,
        DateTime syncedAt)
    {
        ExternalItemId = OrderText.Required(externalItemId, nameof(externalItemId), 255);
        Name = OrderText.Required(name, nameof(name), 255);
        Description = OrderText.Optional(description, 2000) ?? string.Empty;
        SalesUnit = OrderText.Required(salesUnit, nameof(salesUnit), 100);
        if (basePrice < 0) throw new ArgumentOutOfRangeException(nameof(basePrice));
        BasePrice = decimal.Round(basePrice, 2, MidpointRounding.AwayFromZero);
        Currency = OrderText.Currency(currency);
        IsActive = isActive;
        LastSyncedAt = syncedAt;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class AnalysisDefinition : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid QboCatalogItemId { get; private set; }
    public string Name { get; private set; } = null!;
    public string Description { get; private set; } = string.Empty;
    public string SubmissionInstructions { get; private set; } = string.Empty;
    public string RequiredIntakeFieldsJson { get; private set; } = "[]";
    public string ResultContractJson { get; private set; } = "[]";
    public bool IsActive { get; private set; } = true;
    public bool IsSynthetic { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private AnalysisDefinition() { }

    public AnalysisDefinition(
        Guid qboCatalogItemId,
        string name,
        string description,
        string submissionInstructions,
        string requiredIntakeFieldsJson,
        string resultContractJson,
        bool isActive,
        bool isSynthetic)
    {
        QboCatalogItemId = qboCatalogItemId;
        Update(name, description, submissionInstructions, requiredIntakeFieldsJson, resultContractJson, isActive, isSynthetic);
    }

    public void Update(
        string name,
        string description,
        string submissionInstructions,
        string requiredIntakeFieldsJson,
        string resultContractJson,
        bool isActive,
        bool isSynthetic)
    {
        Name = OrderText.Required(name, nameof(name), 255);
        Description = OrderText.Optional(description, 2000) ?? string.Empty;
        SubmissionInstructions = OrderText.Optional(submissionInstructions, 4000) ?? string.Empty;
        RequiredIntakeFieldsJson = OrderText.Json(requiredIntakeFieldsJson);
        ResultContractJson = OrderText.Json(resultContractJson);
        IsActive = isActive;
        IsSynthetic = isSynthetic;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class PartnerReagentOffering : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid PartnerOrganizationId { get; private set; }
    public Guid QboCatalogItemId { get; private set; }
    public decimal NegotiatedUnitPrice { get; private set; }
    public string Currency { get; private set; } = "USD";
    public string SellingUnit { get; private set; } = null!;
    public decimal OrderIncrement { get; private set; }
    public decimal? MinimumQuantity { get; private set; }
    public decimal? MaximumQuantity { get; private set; }
    public string ShippingRestrictionsJson { get; private set; } = "{}";
    public DateTime EffectiveFrom { get; private set; }
    public DateTime? EffectiveTo { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private PartnerReagentOffering() { }

    public PartnerReagentOffering(
        Guid partnerOrganizationId,
        Guid qboCatalogItemId,
        decimal negotiatedUnitPrice,
        string currency,
        string sellingUnit,
        decimal orderIncrement,
        decimal? minimumQuantity,
        decimal? maximumQuantity,
        string shippingRestrictionsJson,
        DateTime effectiveFrom,
        DateTime? effectiveTo,
        bool isActive)
    {
        PartnerOrganizationId = partnerOrganizationId;
        QboCatalogItemId = qboCatalogItemId;
        Update(negotiatedUnitPrice, currency, sellingUnit, orderIncrement, minimumQuantity, maximumQuantity, shippingRestrictionsJson, effectiveFrom, effectiveTo, isActive);
    }

    public void Update(
        decimal negotiatedUnitPrice,
        string currency,
        string sellingUnit,
        decimal orderIncrement,
        decimal? minimumQuantity,
        decimal? maximumQuantity,
        string shippingRestrictionsJson,
        DateTime effectiveFrom,
        DateTime? effectiveTo,
        bool isActive)
    {
        if (negotiatedUnitPrice < 0) throw new ArgumentOutOfRangeException(nameof(negotiatedUnitPrice));
        if (orderIncrement <= 0) throw new ArgumentOutOfRangeException(nameof(orderIncrement));
        if (minimumQuantity is < 0) throw new ArgumentOutOfRangeException(nameof(minimumQuantity));
        if (maximumQuantity.HasValue && minimumQuantity.HasValue && maximumQuantity < minimumQuantity)
            throw new ArgumentException("Maximum quantity cannot be less than minimum quantity.");
        if (effectiveTo.HasValue && effectiveTo <= effectiveFrom)
            throw new ArgumentException("Effective-to must be after effective-from.");

        NegotiatedUnitPrice = decimal.Round(negotiatedUnitPrice, 2, MidpointRounding.AwayFromZero);
        Currency = OrderText.Currency(currency);
        SellingUnit = OrderText.Required(sellingUnit, nameof(sellingUnit), 100);
        OrderIncrement = orderIncrement;
        MinimumQuantity = minimumQuantity;
        MaximumQuantity = maximumQuantity;
        ShippingRestrictionsJson = OrderText.Json(shippingRestrictionsJson);
        _ = ReagentShippingRules.Parse(ShippingRestrictionsJson);
        EffectiveFrom = effectiveFrom;
        EffectiveTo = effectiveTo;
        IsActive = isActive;
    }

    public bool IsEffectiveAt(DateTime utcNow) =>
        IsActive && EffectiveFrom <= utcNow && (!EffectiveTo.HasValue || EffectiveTo > utcNow);

    public bool IsQuantityAllowed(decimal quantity)
    {
        if (quantity <= 0) return false;
        if (MinimumQuantity.HasValue && quantity < MinimumQuantity) return false;
        if (MaximumQuantity.HasValue && quantity > MaximumQuantity) return false;
        return decimal.Remainder(quantity, OrderIncrement) == 0;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class AssemblyProfile : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid QboCatalogItemId { get; private set; }
    public string Name { get; private set; } = null!;
    public int ProfileVersion { get; private set; } = 1;
    public string Description { get; private set; } = string.Empty;
    public string Instructions { get; private set; } = string.Empty;
    public string MetadataSchemaJson { get; private set; } = "{}";
    public string AllowedFileKindsJson { get; private set; } = "[]";
    public string OutputContractJson { get; private set; } = "{}";
    public long MaximumFileSizeBytes { get; private set; }
    public long MaximumTotalSizeBytes { get; private set; }
    public bool IsActive { get; private set; }
    public bool IsSynthetic { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private AssemblyProfile() { }

    public AssemblyProfile(
        Guid qboCatalogItemId,
        string name,
        int profileVersion,
        string description,
        string instructions,
        string metadataSchemaJson,
        string allowedFileKindsJson,
        string outputContractJson,
        long maximumFileSizeBytes,
        long maximumTotalSizeBytes,
        bool isActive,
        bool isSynthetic)
    {
        QboCatalogItemId = qboCatalogItemId;
        Name = OrderText.Required(name, nameof(name), 255);
        if (profileVersion <= 0) throw new ArgumentOutOfRangeException(nameof(profileVersion));
        ProfileVersion = profileVersion;
        Update(description, instructions, metadataSchemaJson, allowedFileKindsJson, outputContractJson, maximumFileSizeBytes, maximumTotalSizeBytes, isActive, isSynthetic);
    }

    public void Update(
        string description,
        string instructions,
        string metadataSchemaJson,
        string allowedFileKindsJson,
        string outputContractJson,
        long maximumFileSizeBytes,
        long maximumTotalSizeBytes,
        bool isActive,
        bool isSynthetic)
    {
        if (maximumFileSizeBytes <= 0) throw new ArgumentOutOfRangeException(nameof(maximumFileSizeBytes));
        if (maximumTotalSizeBytes < maximumFileSizeBytes) throw new ArgumentOutOfRangeException(nameof(maximumTotalSizeBytes));
        Description = OrderText.Optional(description, 2000) ?? string.Empty;
        Instructions = OrderText.Required(instructions, nameof(instructions), 4000);
        MetadataSchemaJson = OrderText.Json(metadataSchemaJson);
        AllowedFileKindsJson = OrderText.Json(allowedFileKindsJson);
        OutputContractJson = OrderText.Json(outputContractJson);
        MaximumFileSizeBytes = maximumFileSizeBytes;
        MaximumTotalSizeBytes = maximumTotalSizeBytes;
        IsActive = isActive;
        IsSynthetic = isSynthetic;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class OrganizationCommercialProfile : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public string? QboCustomerId { get; private set; }
    public bool LabCreditApproved { get; private set; }
    public bool AssemblyCreditApproved { get; private set; }
    public DateTime? CreditReviewedAt { get; private set; }
    public Guid? CreditReviewedByUserId { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private OrganizationCommercialProfile() { }

    public OrganizationCommercialProfile(Guid organizationId) => OrganizationId = organizationId;

    public void Update(
        string? qboCustomerId,
        bool labCreditApproved,
        bool assemblyCreditApproved,
        Guid actorUserId,
        DateTime reviewedAt)
    {
        QboCustomerId = OrderText.Optional(qboCustomerId, 255);
        LabCreditApproved = labCreditApproved;
        AssemblyCreditApproved = assemblyCreditApproved;
        CreditReviewedByUserId = actorUserId;
        CreditReviewedAt = reviewedAt;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class OrderSystemConfiguration : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public int QuoteValidityDays { get; private set; } = 30;
    public string SampleSubmissionInstructions { get; private set; } = string.Empty;
    public string ShippingConfigurationJson { get; private set; } = "{}";
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private OrderSystemConfiguration() { }

    public OrderSystemConfiguration(int quoteValidityDays, string sampleSubmissionInstructions, string shippingConfigurationJson)
        => Update(quoteValidityDays, sampleSubmissionInstructions, shippingConfigurationJson);

    public void Update(int quoteValidityDays, string sampleSubmissionInstructions, string shippingConfigurationJson)
    {
        if (quoteValidityDays is < 1 or > 365) throw new ArgumentOutOfRangeException(nameof(quoteValidityDays));
        QuoteValidityDays = quoteValidityDays;
        SampleSubmissionInstructions = OrderText.Optional(sampleSubmissionInstructions, 8000) ?? string.Empty;
        ShippingConfigurationJson = OrderText.Json(shippingConfigurationJson);
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

internal static class OrderText
{
    public static string Required(string? value, string name, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value)) throw new ArgumentException($"{name} is required.", name);
        var normalized = value.Trim();
        if (normalized.Length > maxLength) throw new ArgumentException($"{name} cannot exceed {maxLength} characters.", name);
        return normalized;
    }

    public static string? Optional(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var normalized = value.Trim();
        if (normalized.Length > maxLength) throw new ArgumentException($"Value cannot exceed {maxLength} characters.");
        return normalized;
    }

    public static string Currency(string? value)
    {
        var normalized = Required(value, "currency", 3).ToUpperInvariant();
        if (normalized.Length != 3) throw new ArgumentException("Currency must be a three-letter code.", nameof(value));
        return normalized;
    }

    public static string Json(string? value)
    {
        var normalized = string.IsNullOrWhiteSpace(value) ? "{}" : value.Trim();
        try { System.Text.Json.JsonDocument.Parse(normalized); }
        catch (System.Text.Json.JsonException exception) { throw new ArgumentException("Value must be valid JSON.", nameof(value), exception); }
        return normalized;
    }
}
