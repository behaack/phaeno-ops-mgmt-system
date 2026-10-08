namespace PhaenoPortal.App.Features.OrderManagement.DTOs;

using System.Text.Json.Serialization;

public sealed record ContainerSampleTypeContext(Guid SampleTypeDefinitionId);
public sealed record ContainerQuantityRequest(Guid ContainerDefinitionId, int Quantity);
public sealed record ShippingKitContentRequest(Guid SupplierProductId, int Quantity);
public sealed record ShippingKitContentDto(Guid SupplierProductId, Guid SupplierId, string Kind, int Quantity,
    string SupplierName, string ProductNumber, string ProductDescription, string ProductTypeName);
public sealed record DeactivateSampleShippingContainerRequest(long Version);
public sealed record ActivateSampleShippingContainerRequest(long Version);
public sealed record SampleShippingContainerDefinitionDto(Guid Id, Guid DefinitionKey, string Sku,
    string CommonName, int TubeCapacity, int Revision, Guid? SupersedesDefinitionId, DateTime EffectiveFrom, DateTime? EffectiveTo,
    bool IsActive, int DisplayOrder, long Version,
    DateTime? DeactivatedAt = null, IReadOnlyList<ShippingKitContentDto>? KitContents = null,
    Guid? SampleTypeAnchorId = null, decimal? DryIceQuantity = null, string? DryIceUnit = null,
    string? TemperatureControlInstructions = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] bool? NewWorkReady = null,
    string Lifecycle = "Released",
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] bool? AssemblyWorkflowReady = null, Guid? ShippingContainerProductId = null, Guid? AssemblyWorkflowId = null);
public sealed record CreateSampleShippingContainerRequest(string Sku, string CommonName, int TubeCapacity,
    DateTime EffectiveFrom,
    DateTime? EffectiveTo = null, bool IsActive = false, int DisplayOrder = 0,
    IReadOnlyList<ShippingKitContentRequest>? KitContents = null, decimal? DryIceQuantity = null,
    string? DryIceUnit = null, string? TemperatureControlInstructions = null,
    Guid? SampleTypeDefinitionId = null, Guid? ShippingContainerProductId = null, Guid? AssemblyWorkflowId = null);
public sealed record ReviseSampleShippingContainerRequest(long Version, string CommonName, int TubeCapacity,
    DateTime EffectiveFrom,
    DateTime? EffectiveTo = null, bool IsActive = false, int DisplayOrder = 0,
    IReadOnlyList<ShippingKitContentRequest>? KitContents = null,
    decimal? DryIceQuantity = null, string? DryIceUnit = null, string? TemperatureControlInstructions = null,
    Guid? SampleTypeDefinitionId = null, Guid? ShippingContainerProductId = null, Guid? AssemblyWorkflowId = null);
public sealed record EditSampleShippingContainerDraftRequest(long Version, string CommonName, int TubeCapacity,
    DateTime EffectiveFrom, DateTime? EffectiveTo, int DisplayOrder, Guid? SampleTypeDefinitionId,
    decimal? DryIceQuantity = null, string? DryIceUnit = null, string? TemperatureControlInstructions = null,
    IReadOnlyList<ShippingKitContentRequest>? KitContents = null, Guid? ShippingContainerProductId = null, Guid? AssemblyWorkflowId = null);
public sealed record DiscardSampleShippingContainerDraftRequest(long Version);
public sealed record LinkTransportationKitSampleTypeRequest(Guid SampleTypeDefinitionId, long Version);
public sealed record ContainerPackingPreviewRequest(int TubeCount, IReadOnlyList<ContainerSampleTypeContext> Contexts,
    IReadOnlyList<ContainerQuantityRequest>? Availability = null, IReadOnlyList<ContainerQuantityRequest>? Selection = null,
    Guid? IncludeDraftDefinitionId = null);
public sealed record ContainerPackingAllocationDto(Guid ContainerDefinitionId, string Sku, string CommonName,
    int Capacity, int Quantity, int AssignedTubes, int UnusedCapacity);
public sealed record ContainerPackingPreviewDto(int TubeCount, int ContainerCount, int TotalCapacity,
    int UnusedCapacity, int UnallocatedTubes, bool IsComplete,
    IReadOnlyList<ContainerPackingAllocationDto> Containers, string Explanation);
