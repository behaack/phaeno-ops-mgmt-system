namespace PhaenoPortal.App.Features.LabOperations.DTOs;

public sealed record LabEvidenceCoverageDto(string Area, string Status, string Explanation);
public sealed record LabInvestigationDto(int FormatVersion, Guid WorkOrderId, Guid SpecimenId,
    DateTime CapturedAtUtc, object Specimen, IReadOnlyList<LabEvidenceCoverageDto> Coverage,
    IReadOnlyDictionary<string, object> Evidence, IReadOnlyList<string> LimitedSections);
public sealed record GenerateLabInvestigationReportRequest(Guid RequestId);
