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
