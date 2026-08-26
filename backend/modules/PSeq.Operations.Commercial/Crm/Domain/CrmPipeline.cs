namespace PSeq.Operations.Commercial.Crm.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public sealed class CrmPipeline : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Name { get; private set; } = null!;
    public string? Description { get; private set; }
    public bool IsDefault { get; private set; }
    public bool IsActive { get; private set; } = true;
    public ICollection<CrmPipelineStage> Stages { get; private set; } = [];
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private CrmPipeline()
    {
    }

    public CrmPipeline(string name, string? description, bool isDefault = false)
    {
        Update(name, description);
        IsDefault = isDefault;
    }

    public void Update(string name, string? description)
    {
        Name = Required(name, 150);
        Description = Optional(description, 1000);
    }

    public void SetDefault(bool isDefault) => IsDefault = isDefault;
    public void Deactivate() => IsActive = false;
    public void Reactivate() => IsActive = true;

    public void MarkCreated(DateTime utcNow, Guid? actorUserId)
    {
        CreatedAt = utcNow;
        CreatedByUserId = actorUserId;
    }

    public void MarkUpdated(DateTime utcNow, Guid? actorUserId)
    {
        UpdatedAt = utcNow;
        UpdatedByUserId = actorUserId;
    }

    public void IncrementVersion() => Version++;

    internal static string Required(string? value, int maximumLength)
    {
        var normalized = Optional(value, maximumLength);
        return normalized ?? throw new ArgumentException("A value is required.", nameof(value));
    }

    internal static string? Optional(string? value, int maximumLength)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrWhiteSpace(normalized)) return null;
        if (normalized.Length > maximumLength)
        {
            throw new ArgumentException($"The value cannot exceed {maximumLength} characters.", nameof(value));
        }

        return normalized;
    }
}

public sealed class CrmPipelineStage : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid PipelineId { get; private set; }
    public CrmPipeline Pipeline { get; private set; } = null!;
    public string Name { get; private set; } = null!;
    public int Position { get; private set; }
    public CrmPipelineStageCategory Category { get; private set; }
    public int Probability { get; private set; }
    public bool RequiresReason { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private CrmPipelineStage()
    {
    }

    public CrmPipelineStage(
        Guid pipelineId,
        string name,
        int position,
        CrmPipelineStageCategory category,
        int probability,
        bool requiresReason)
    {
        if (pipelineId == Guid.Empty) throw new ArgumentException("A pipeline is required.");
        PipelineId = pipelineId;
        Update(name, position, category, probability, requiresReason);
    }

    public void Update(
        string name,
        int position,
        CrmPipelineStageCategory category,
        int probability,
        bool requiresReason)
    {
        if (position < 0) throw new ArgumentException("Position cannot be negative.");
        if (probability is < 0 or > 100) throw new ArgumentException("Probability must be between 0 and 100.");
        if (category == CrmPipelineStageCategory.Won && probability != 100)
        {
            throw new ArgumentException("A Won stage must use 100 percent probability.");
        }

        if ((category is CrmPipelineStageCategory.Lost or CrmPipelineStageCategory.Abandoned) && probability != 0)
        {
            throw new ArgumentException("Lost and Abandoned stages must use 0 percent probability.");
        }

        Name = CrmPipeline.Required(name, 150);
        Position = position;
        Category = category;
        Probability = probability;
        RequiresReason = requiresReason || category is CrmPipelineStageCategory.Lost or CrmPipelineStageCategory.Abandoned;
    }

    public void Deactivate() => IsActive = false;
    public void Reactivate() => IsActive = true;

    public void MarkCreated(DateTime utcNow, Guid? actorUserId)
    {
        CreatedAt = utcNow;
        CreatedByUserId = actorUserId;
    }

    public void MarkUpdated(DateTime utcNow, Guid? actorUserId)
    {
        UpdatedAt = utcNow;
        UpdatedByUserId = actorUserId;
    }

    public void IncrementVersion() => Version++;
}
