namespace PhaenoPortal.App.Features.OrderManagement.DTOs;

public sealed record SampleShippingProcedureDto(Guid Id, Guid DefinitionKey, int Revision,
    Guid? SupersedesProcedureId, string Name, string Description, string PackingInstructions, string TemperatureInstructions,
    string CarrierInstructions, string DispatchInstructions, string RequiredDocuments,
    string ExceptionInstructions, string? InternationalCustomsInstructions, bool IsActive, long Version,
    string Lifecycle = "Released");

public sealed record SampleShippingProcedureWriteRequest(Guid? SupersedesProcedureId, long? SupersededVersion,
    string Name, string PackingInstructions, string TemperatureInstructions, string CarrierInstructions,
    string DispatchInstructions, string RequiredDocuments, string ExceptionInstructions,
    string? InternationalCustomsInstructions, bool IsActive, string? Description = null);

public sealed record DeactivateSampleShippingProcedureRequest(long Version);
public sealed record SetSampleShippingProcedureStatusRequest(bool IsActive, long Version);
public sealed record EditSampleShippingProcedureDraftRequest(long Version, string Name, string? Description,
    string? PackingInstructions, string? TemperatureInstructions, string? CarrierInstructions,
    string? DispatchInstructions, string? RequiredDocuments, string? ExceptionInstructions,
    string? InternationalCustomsInstructions);
public sealed record DiscardSampleShippingProcedureDraftRequest(long Version);
