namespace PhaenoPortal.App.Features.OrderManagement.DTOs;

public sealed record PSeqKitLotDto(Guid Id, Guid CatalogItemId, string ProductName, string LotNumber,
    DateOnly? ExpirationDate, bool IsRecalled, string? RecallReason, DateTime? RecallChangedAt, long Version);
public sealed record CreatePSeqKitLotRequest(Guid CatalogItemId, string LotNumber, DateOnly? ExpirationDate);
public sealed record PSeqKitRecallRequest(long Version, bool IsRecalled, string Reason);
public sealed record SubmitPartnerKitLotRequest(long CaseVersion, long? Version, string LotNumber, DateOnly? UsedOn);
public sealed record KitLotAssessmentDto(Guid LotId, string LotNumber, DateOnly? ExpirationDate,
    bool IsRecalled, string? RecallReason, bool IsExpired, bool ExpirationUnknown, DateOnly AssessedOn, long LotVersion);
public sealed record KitLotSubmissionDto(Guid Id, string EnteredLotNumber, DateOnly? UsedOn,
    DateTime CheckedAt, long Version, KitLotAssessmentDto SavedAssessment, KitLotAssessmentDto CurrentAssessment);
