namespace PSeq.Operations.Commercial.FileManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public sealed record ReleasedDeliverablePolicyValues(
    int StandardRetentionDays,
    int UndownloadedWarningLeadDays,
    int UndownloadedGraceDays)
{
    public static ReleasedDeliverablePolicyValues Create(
        int standardRetentionDays,
        int undownloadedWarningLeadDays,
        int undownloadedGraceDays)
    {
        if (standardRetentionDays <= 0)
        {
            throw new ArgumentOutOfRangeException(
                nameof(standardRetentionDays),
                "Standard retention must be a positive whole-day value.");
        }

        if (undownloadedWarningLeadDays <= 0)
        {
            throw new ArgumentOutOfRangeException(
                nameof(undownloadedWarningLeadDays),
                "The undownloaded warning lead must be a positive whole-day value.");
        }

        if (undownloadedWarningLeadDays >= standardRetentionDays)
        {
            throw new ArgumentException(
                "The undownloaded warning lead must be shorter than standard retention.",
                nameof(undownloadedWarningLeadDays));
        }

        if (undownloadedGraceDays <= 0)
        {
            throw new ArgumentOutOfRangeException(
                nameof(undownloadedGraceDays),
                "The undownloaded grace period must be a positive whole-day value.");
        }

        return new ReleasedDeliverablePolicyValues(
            standardRetentionDays,
            undownloadedWarningLeadDays,
            undownloadedGraceDays);
    }
}

public sealed class ReleasedDeliverablePolicyDefault : IAudit, IConcurrency
{
    public const int InitialStandardRetentionDays = 30;
    public const int InitialWarningLeadDays = 5;
    public const int InitialGraceDays = 5;

    public Guid Id { get; private set; } = Guid.NewGuid();
    public int Revision { get; private set; }
    public int StandardRetentionDays { get; private set; }
    public int UndownloadedWarningLeadDays { get; private set; }
    public int UndownloadedGraceDays { get; private set; }
    public string ChangeReason { get; private set; } = null!;
    public Guid? SupersedesPolicyId { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime? DeactivatedAt { get; private set; }
    public Guid? DeactivatedByUserId { get; private set; }
    public string? DeactivationReason { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private ReleasedDeliverablePolicyDefault()
    {
    }

    public ReleasedDeliverablePolicyDefault(
        int revision,
        ReleasedDeliverablePolicyValues values,
        string changeReason,
        Guid? supersedesPolicyId = null)
    {
        if (revision <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(revision), "Policy revision must be positive.");
        }

        ArgumentNullException.ThrowIfNull(values);
        Revision = revision;
        Version = revision;
        StandardRetentionDays = values.StandardRetentionDays;
        UndownloadedWarningLeadDays = values.UndownloadedWarningLeadDays;
        UndownloadedGraceDays = values.UndownloadedGraceDays;
        ChangeReason = NormalizeReason(changeReason);
        SupersedesPolicyId = supersedesPolicyId;
    }

    public ReleasedDeliverablePolicyValues ReadValues() =>
        ReleasedDeliverablePolicyValues.Create(
            StandardRetentionDays,
            UndownloadedWarningLeadDays,
            UndownloadedGraceDays);

    public void Deactivate(DateTime utcNow, Guid actorUserId, string reason)
    {
        if (!IsActive)
        {
            throw new InvalidOperationException("The global policy version is already inactive.");
        }

        IsActive = false;
        DeactivatedAt = RequireUtc(utcNow);
        DeactivatedByUserId = actorUserId;
        DeactivationReason = NormalizeReason(reason);
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId)
    {
        CreatedAt = RequireUtc(utcNow);
        CreatedByUserId = actorUserId;
    }

    public void MarkUpdated(DateTime utcNow, Guid? actorUserId)
    {
        UpdatedAt = RequireUtc(utcNow);
        UpdatedByUserId = actorUserId;
    }

    public void IncrementVersion() => Version++;

    public static string NormalizeReason(string reason)
    {
        var normalized = reason?.Trim();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            throw new ArgumentException("A change reason is required.", nameof(reason));
        }

        if (normalized.Length > 2000)
        {
            throw new ArgumentException("The change reason cannot exceed 2000 characters.", nameof(reason));
        }

        return normalized;
    }

    private static DateTime RequireUtc(DateTime value)
    {
        if (value.Kind != DateTimeKind.Utc)
        {
            throw new ArgumentException("Policy timestamps must use UTC.", nameof(value));
        }

        return value;
    }
}

public sealed class OrganizationReleasedDeliverablePolicyOverride : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public int Revision { get; private set; }
    public int? StandardRetentionDays { get; private set; }
    public int? UndownloadedWarningLeadDays { get; private set; }
    public int? UndownloadedGraceDays { get; private set; }
    public string ChangeReason { get; private set; } = null!;
    public Guid? SupersedesOverrideId { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime? DeactivatedAt { get; private set; }
    public Guid? DeactivatedByUserId { get; private set; }
    public string? DeactivationReason { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private OrganizationReleasedDeliverablePolicyOverride()
    {
    }

    public OrganizationReleasedDeliverablePolicyOverride(
        Guid organizationId,
        int revision,
        int? standardRetentionDays,
        int? undownloadedWarningLeadDays,
        int? undownloadedGraceDays,
        ReleasedDeliverablePolicyValues globalValues,
        string changeReason,
        Guid? supersedesOverrideId = null)
    {
        if (organizationId == Guid.Empty)
        {
            throw new ArgumentException("Organization is required.", nameof(organizationId));
        }

        if (revision <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(revision), "Override revision must be positive.");
        }

        if (!standardRetentionDays.HasValue
            && !undownloadedWarningLeadDays.HasValue
            && !undownloadedGraceDays.HasValue)
        {
            throw new ArgumentException(
                "Set at least one override value, or remove the override to inherit every global value.");
        }

        ValidateOptionalPositive(standardRetentionDays, nameof(standardRetentionDays));
        ValidateOptionalPositive(undownloadedWarningLeadDays, nameof(undownloadedWarningLeadDays));
        ValidateOptionalPositive(undownloadedGraceDays, nameof(undownloadedGraceDays));

        OrganizationId = organizationId;
        Revision = revision;
        Version = revision;
        StandardRetentionDays = standardRetentionDays;
        UndownloadedWarningLeadDays = undownloadedWarningLeadDays;
        UndownloadedGraceDays = undownloadedGraceDays;
        ChangeReason = ReleasedDeliverablePolicyDefault.NormalizeReason(changeReason);
        SupersedesOverrideId = supersedesOverrideId;

        _ = Resolve(globalValues);
    }

    public ReleasedDeliverablePolicyValues Resolve(ReleasedDeliverablePolicyValues globalValues)
    {
        ArgumentNullException.ThrowIfNull(globalValues);
        return ReleasedDeliverablePolicyValues.Create(
            StandardRetentionDays ?? globalValues.StandardRetentionDays,
            UndownloadedWarningLeadDays ?? globalValues.UndownloadedWarningLeadDays,
            UndownloadedGraceDays ?? globalValues.UndownloadedGraceDays);
    }

    public void Deactivate(DateTime utcNow, Guid actorUserId, string reason)
    {
        if (!IsActive)
        {
            throw new InvalidOperationException("The organization policy override is already inactive.");
        }

        IsActive = false;
        DeactivatedAt = RequireUtc(utcNow);
        DeactivatedByUserId = actorUserId;
        DeactivationReason = ReleasedDeliverablePolicyDefault.NormalizeReason(reason);
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId)
    {
        CreatedAt = RequireUtc(utcNow);
        CreatedByUserId = actorUserId;
    }

    public void MarkUpdated(DateTime utcNow, Guid? actorUserId)
    {
        UpdatedAt = RequireUtc(utcNow);
        UpdatedByUserId = actorUserId;
    }

    public void IncrementVersion() => Version++;

    private static void ValidateOptionalPositive(int? value, string parameterName)
    {
        if (value is <= 0)
        {
            throw new ArgumentOutOfRangeException(parameterName, "Override day values must be positive.");
        }
    }

    private static DateTime RequireUtc(DateTime value)
    {
        if (value.Kind != DateTimeKind.Utc)
        {
            throw new ArgumentException("Policy timestamps must use UTC.", nameof(value));
        }

        return value;
    }
}

public enum ReleasedDeliverablePolicyValueSource
{
    GlobalDefault = 1,
    OrganizationOverride = 2
}

public sealed class ReleasedDeliverableRetentionSnapshot : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public Guid? LabResultReleaseId { get; private set; }
    public Guid? AssemblyOutputReleaseId { get; private set; }
    public Guid GlobalPolicyId { get; private set; }
    public int GlobalPolicyRevision { get; private set; }
    public Guid? OrganizationPolicyOverrideId { get; private set; }
    public int? OrganizationPolicyOverrideRevision { get; private set; }
    public int StandardRetentionDays { get; private set; }
    public ReleasedDeliverablePolicyValueSource StandardRetentionSource { get; private set; }
    public int UndownloadedWarningLeadDays { get; private set; }
    public ReleasedDeliverablePolicyValueSource UndownloadedWarningLeadSource { get; private set; }
    public int UndownloadedGraceDays { get; private set; }
    public ReleasedDeliverablePolicyValueSource UndownloadedGraceSource { get; private set; }
    public DateTime ReleasedAtUtc { get; private set; }
    public DateTime WarningAtUtc { get; private set; }
    public DateTime StandardDeletionAtUtc { get; private set; }
    public DateTime PotentialFinalDeletionAtUtc { get; private set; }
    public DateTime? WarningCheckpointAtUtc { get; private set; }
    public string? WarningCheckpointOutcome { get; private set; }
    public Guid? WarningNotificationId { get; private set; }
    public DateTime? StandardCheckpointAtUtc { get; private set; }
    public Guid? GraceNotificationId { get; private set; }
    public DateTime? GraceActivatedAtUtc { get; private set; }
    public DateTime? DownloadAccessClosedAtUtc { get; private set; }
    public DateTime? ByteDeletedAtUtc { get; private set; }
    public string? DeletionOutcome { get; private set; }
    public string? ReceiptLineageJson { get; private set; }
    public void CaptureReceiptLineage(string json)
    {
        if (ReceiptLineageJson is not null) throw new InvalidOperationException("Receipt lineage is immutable.");
        using var document = System.Text.Json.JsonDocument.Parse(json);
        ReceiptLineageJson = json;
    }
    public bool IsQuarantined { get; private set; }
    public void SetQuarantine(bool active) => IsQuarantined = active;
    public int DeletionAttemptCount { get; private set; }
    public DateTime? LastDeletionAttemptAtUtc { get; private set; }
    public DateTime? NextDeletionAttemptAtUtc { get; private set; }

    public void RecordCleanup(string outcome, DateTime now)
    {
        if (now.Kind != DateTimeKind.Utc || ByteDeletedAtUtc.HasValue || !DownloadAccessClosedAtUtc.HasValue || now < DownloadAccessClosedAtUtc.Value)
            throw new InvalidOperationException("Cleanup requires a due, closed, non-deleted package.");
        if (outcome is not ("WaitingForLease" or "Preserved" or "SharedSource" or "UnavailablePackage" or "DeletionFailed" or "Deleted"))
            throw new ArgumentException("Unknown cleanup outcome.");
        DeletionOutcome = outcome; LastDeletionAttemptAtUtc = now;
        if (outcome is "Deleted" or "DeletionFailed") DeletionAttemptCount++;
        NextDeletionAttemptAtUtc = outcome == "Deleted" ? null : now.AddMinutes(outcome == "DeletionFailed" ? 5 : 1);
        if (outcome == "Deleted") ByteDeletedAtUtc = now;
    }

    public void RequestCleanupRetry() { if (!ByteDeletedAtUtc.HasValue) NextDeletionAttemptAtUtc = null; }

    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private ReleasedDeliverableRetentionSnapshot()
    {
    }

    public void RecordWarningCheckpoint(DateTime utcNow, string outcome, Guid? notificationId)
    {
        if (utcNow.Kind != DateTimeKind.Utc || utcNow < WarningAtUtc)
            throw new ArgumentException("The warning checkpoint must be due and use UTC.");
        if (WarningCheckpointAtUtc.HasValue) throw new InvalidOperationException("The warning checkpoint is immutable.");
        if (outcome is not ("Queued" or "SkippedComplete" or "SkippedUnavailable" or "SkippedPastStandard")
            || ((outcome == "Queued") != notificationId.HasValue) || notificationId == Guid.Empty)
            throw new ArgumentException("A queued warning requires its notification; skipped warnings cannot have one.");
        WarningCheckpointAtUtc = utcNow;
        WarningCheckpointOutcome = outcome;
        WarningNotificationId = notificationId;
    }

    public void ApplyDeadlineDecision(ReleasedDeliverableRetentionDecision decision, DateTime utcNow)
    {
        if (utcNow.Kind != DateTimeKind.Utc) throw new ArgumentException("The checkpoint must use UTC.");
        if (utcNow < StandardDeletionAtUtc) return;
        if (!StandardCheckpointAtUtc.HasValue)
        {
            StandardCheckpointAtUtc = utcNow;
            GraceActivatedAtUtc = decision.GraceActivatedAtUtc;
        }
        DownloadAccessClosedAtUtc ??= decision.DownloadAccessClosedAtUtc;
    }

    public void RecordGraceNotification(Guid notificationId)
    {
        if (!GraceActivatedAtUtc.HasValue || GraceNotificationId.HasValue || notificationId == Guid.Empty)
            throw new InvalidOperationException("An activated grace period can have only one notice.");
        GraceNotificationId = notificationId;
    }

    public static ReleasedDeliverableRetentionSnapshot ForLabResult(
        Guid organizationId,
        Guid labResultReleaseId,
        ReleasedDeliverablePolicyDefault globalPolicy,
        OrganizationReleasedDeliverablePolicyOverride? organizationOverride,
        DateTime releasedAtUtc) =>
        Create(
            organizationId,
            labResultReleaseId,
            assemblyOutputReleaseId: null,
            globalPolicy,
            organizationOverride,
            releasedAtUtc);

    public static ReleasedDeliverableRetentionSnapshot ForAssemblyOutput(
        Guid organizationId,
        Guid assemblyOutputReleaseId,
        ReleasedDeliverablePolicyDefault globalPolicy,
        OrganizationReleasedDeliverablePolicyOverride? organizationOverride,
        DateTime releasedAtUtc) =>
        Create(
            organizationId,
            labResultReleaseId: null,
            assemblyOutputReleaseId,
            globalPolicy,
            organizationOverride,
            releasedAtUtc);

    public void MarkCreated(DateTime utcNow, Guid? actorUserId)
    {
        CreatedAt = RequireUtc(utcNow);
        CreatedByUserId = actorUserId;
    }

    public void MarkUpdated(DateTime utcNow, Guid? actorUserId)
    {
        UpdatedAt = RequireUtc(utcNow);
        UpdatedByUserId = actorUserId;
    }

    public void IncrementVersion() => Version++;

    private static ReleasedDeliverableRetentionSnapshot Create(
        Guid organizationId,
        Guid? labResultReleaseId,
        Guid? assemblyOutputReleaseId,
        ReleasedDeliverablePolicyDefault globalPolicy,
        OrganizationReleasedDeliverablePolicyOverride? organizationOverride,
        DateTime releasedAtUtc)
    {
        if (organizationId == Guid.Empty)
        {
            throw new ArgumentException("Organization is required.", nameof(organizationId));
        }

        if ((labResultReleaseId.HasValue && assemblyOutputReleaseId.HasValue)
            || (!labResultReleaseId.HasValue && !assemblyOutputReleaseId.HasValue)
            || labResultReleaseId == Guid.Empty
            || assemblyOutputReleaseId == Guid.Empty)
        {
            throw new ArgumentException("Exactly one released deliverable is required.");
        }

        ArgumentNullException.ThrowIfNull(globalPolicy);
        if (!globalPolicy.IsActive)
        {
            throw new ArgumentException("The global policy must be active.", nameof(globalPolicy));
        }

        if (organizationOverride is { IsActive: false })
        {
            throw new ArgumentException("The organization override must be active.", nameof(organizationOverride));
        }

        if (organizationOverride != null && organizationOverride.OrganizationId != organizationId)
        {
            throw new ArgumentException(
                "The organization override must belong to the released deliverable organization.",
                nameof(organizationOverride));
        }

        releasedAtUtc = RequireUtc(releasedAtUtc);
        var globalValues = globalPolicy.ReadValues();
        var effectiveValues = organizationOverride?.Resolve(globalValues) ?? globalValues;
        var standardDeletionAtUtc = releasedAtUtc.AddDays(effectiveValues.StandardRetentionDays);

        return new ReleasedDeliverableRetentionSnapshot
        {
            OrganizationId = organizationId,
            LabResultReleaseId = labResultReleaseId,
            AssemblyOutputReleaseId = assemblyOutputReleaseId,
            GlobalPolicyId = globalPolicy.Id,
            GlobalPolicyRevision = globalPolicy.Revision,
            OrganizationPolicyOverrideId = organizationOverride?.Id,
            OrganizationPolicyOverrideRevision = organizationOverride?.Revision,
            StandardRetentionDays = effectiveValues.StandardRetentionDays,
            StandardRetentionSource = organizationOverride?.StandardRetentionDays.HasValue == true
                ? ReleasedDeliverablePolicyValueSource.OrganizationOverride
                : ReleasedDeliverablePolicyValueSource.GlobalDefault,
            UndownloadedWarningLeadDays = effectiveValues.UndownloadedWarningLeadDays,
            UndownloadedWarningLeadSource = organizationOverride?.UndownloadedWarningLeadDays.HasValue == true
                ? ReleasedDeliverablePolicyValueSource.OrganizationOverride
                : ReleasedDeliverablePolicyValueSource.GlobalDefault,
            UndownloadedGraceDays = effectiveValues.UndownloadedGraceDays,
            UndownloadedGraceSource = organizationOverride?.UndownloadedGraceDays.HasValue == true
                ? ReleasedDeliverablePolicyValueSource.OrganizationOverride
                : ReleasedDeliverablePolicyValueSource.GlobalDefault,
            ReleasedAtUtc = releasedAtUtc,
            WarningAtUtc = standardDeletionAtUtc.AddDays(-effectiveValues.UndownloadedWarningLeadDays),
            StandardDeletionAtUtc = standardDeletionAtUtc,
            PotentialFinalDeletionAtUtc = standardDeletionAtUtc.AddDays(effectiveValues.UndownloadedGraceDays)
        };
    }

    private static DateTime RequireUtc(DateTime value)
    {
        if (value.Kind != DateTimeKind.Utc)
        {
            throw new ArgumentException("Retention timestamps must use UTC.", nameof(value));
        }

        return value;
    }
}
