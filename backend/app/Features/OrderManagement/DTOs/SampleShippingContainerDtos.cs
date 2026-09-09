namespace PhaenoPortal.App.Features.OrderManagement.DTOs;

public sealed record ContainerCompatibilityRequest(Guid SampleTypeDefinitionId, Guid InstructionRuleId);
public sealed record ContainerQuantityRequest(Guid ContainerDefinitionId, int Quantity);
public sealed record DeactivateSampleShippingContainerRequest(long Version);
public sealed record SampleShippingContainerDefinitionDto(Guid Id, Guid DefinitionKey, string Sku,
    string CommonName, int TubeCapacity, int Revision, Guid? SupersedesDefinitionId, string? SupplierName,
    string? SupplierProductNumber, string? PackingInstructions, DateTime EffectiveFrom, DateTime? EffectiveTo,
    bool IsActive, int DisplayOrder, long Version, IReadOnlyList<ContainerCompatibilityRequest> Compatibilities,
    DateTime? DeactivatedAt = null);
public sealed record CreateSampleShippingContainerRequest(string Sku, string CommonName, int TubeCapacity,
    DateTime EffectiveFrom, IReadOnlyList<ContainerCompatibilityRequest> Compatibilities,
    string? SupplierName = null, string? SupplierProductNumber = null, string? PackingInstructions = null,
    DateTime? EffectiveTo = null, bool IsActive = false, int DisplayOrder = 0);
public sealed record ReviseSampleShippingContainerRequest(long Version, string CommonName, int TubeCapacity,
    DateTime EffectiveFrom, IReadOnlyList<ContainerCompatibilityRequest> Compatibilities,
    string? SupplierName = null, string? SupplierProductNumber = null, string? PackingInstructions = null,
    DateTime? EffectiveTo = null, bool IsActive = false, int DisplayOrder = 0);
public sealed record ContainerPackingPreviewRequest(int TubeCount, IReadOnlyList<ContainerCompatibilityRequest> Contexts,
    IReadOnlyList<ContainerQuantityRequest>? Availability = null, IReadOnlyList<ContainerQuantityRequest>? Selection = null,
    Guid? IncludeDraftDefinitionId = null);
public sealed record ContainerPackingAllocationDto(Guid ContainerDefinitionId, string Sku, string CommonName,
    int Capacity, int Quantity, int AssignedTubes, int UnusedCapacity);
public sealed record ContainerPackingPreviewDto(int TubeCount, int ContainerCount, int TotalCapacity,
    int UnusedCapacity, int UnallocatedTubes, bool IsComplete,
    IReadOnlyList<ContainerPackingAllocationDto> Containers, string Explanation);
