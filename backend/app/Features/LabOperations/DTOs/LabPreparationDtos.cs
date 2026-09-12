namespace PhaenoPortal.App.Features.LabOperations.DTOs;

using PSeq.Operations.Laboratory.Domain;

public sealed record SaveLabTrayFormatRequest(Guid Id, long Version, LabTrayLayout Layout, bool IsActive);
// Name remains readable for older clients; new batch identifiers are always assigned by the server.
public sealed record CreateLabPreparationRequest(Guid RequestId, string? Name, Guid TrayFormatId, Guid WorkflowVersionId,
    [property: System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)] string? Notes = null);
public sealed record LabPreparationCommand(Guid RequestId, long Version, string Action,
    Guid? MemberId = null, string? Position = null, string? Barcode = null, bool Confirmed = false,
    Guid? StageId = null, string? Reason = null, string? ReasonCode = null,
    LabPreparationStepInput? Step = null, Guid? ResourceId = null, long? ResourceVersion = null,
    decimal? Quantity = null, string? QuantityUnit = null, string? Location = null,
    IReadOnlyList<Guid>? CoveredMemberIds = null, Guid? OutputContainerId = null);
