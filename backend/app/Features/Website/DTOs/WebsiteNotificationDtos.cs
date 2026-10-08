namespace PhaenoPortal.App.Features.Website.DTOs;

public sealed record WebOpsNotificationDto(Guid Id, string Kind, string State, string OrganizationName, Guid IntakeId, string ContactName, string? RecipientEmail,
    int AttemptCount, DateTimeOffset CreatedAtUtc, DateTimeOffset? LastAttemptAtUtc,
    DateTimeOffset? AcceptedAtUtc, DateTimeOffset? NextAttemptAtUtc, string? LastError, Guid Version, bool CanResend, bool IsProcessingExpired = false);
public sealed record WebOpsNotificationRecoveryRequest(Guid Version);
public sealed record WebOpsNotificationAttemptDto(int AttemptNumber, DateTimeOffset StartedAtUtc,
    DateTimeOffset? FinishedAtUtc, string Outcome, string? Error, bool StaffRequested);
public sealed record WebOpsNotificationSummaryDto(bool IsPaused, Guid Version, DateTimeOffset? UpdatedAtUtc,
    string? UpdatedByName, string? Reason, int PendingCount, int ProcessingCount, int FailedCount,
    DateTimeOffset? OldestPendingAtUtc, int ExpiredProcessingCount);
public sealed record WebOpsNotificationProcessingRequest(Guid Version, bool IsPaused, string Reason);
