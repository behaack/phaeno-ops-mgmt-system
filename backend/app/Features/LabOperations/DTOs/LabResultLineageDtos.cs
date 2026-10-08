namespace PhaenoPortal.App.Features.LabOperations.DTOs;

using System.Text.Json.Serialization;
using PSeq.Operations.Laboratory.Domain;

public sealed record RegisterSequencingOutputRequest(Guid Id, Guid LabWorkOrderId, Guid LabSpecimenId,
    Guid LabLibraryId, Guid LabNgsSendoutId, string ProviderKey, string ProviderRunReference,
    string SampleMappingReference, string ExternalFileReference, string Sha256, long SizeBytes,
    Guid? CorrectsOutputId = null, string? CorrectionReason = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] LabScientificEvidence? ScientificEvidence = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] int? SequencingRunNumber = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? LibraryPreparationChoice = null);

public sealed record RegisterAnalysisRunRequest(Guid Id, Guid LabWorkOrderId, Guid LabSpecimenId,
    string ProviderKey, string RunReference, IReadOnlyList<Guid> SequencingOutputIds,
    Guid? PreviousAnalysisRunId = null, string? ReanalysisReason = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] LabScientificEvidence? ScientificEvidence = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] int? RequirementsVersion = null);

public sealed record LabResultLineageDto(Guid ResultId, string ResultKind, string Coverage,
    Guid? AnalysisRunId, Guid? SpecimenId, Guid? AttemptId, Guid? SourceContainerId, string? SourceBarcode,
    object? AnalysisRun, IReadOnlyList<object> Inputs, IReadOnlyList<object> Artifacts);
