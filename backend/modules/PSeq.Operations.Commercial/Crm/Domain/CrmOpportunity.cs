namespace PSeq.Operations.Commercial.Crm.Domain;

using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Common.Persistence;

public sealed class CrmOpportunity : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string OpportunityNumber { get; private set; } = null!;
    public string Name { get; private set; } = null!;
    public Guid CompanyId { get; private set; }
    public CrmCompany Company { get; private set; } = null!;
    public Guid PipelineId { get; private set; }
    public CrmPipeline Pipeline { get; private set; } = null!;
    public Guid StageId { get; private set; }
    public CrmPipelineStage Stage { get; private set; } = null!;
    public Guid OwnerUserId { get; private set; }
    public User Owner { get; private set; } = null!;
    public string? ProductInterest { get; private set; }
    public decimal? Amount { get; private set; }
    public string Currency { get; private set; } = "USD";
    public int Probability { get; private set; }
    public DateOnly? ExpectedCloseDate { get; private set; }
    public string? NextStep { get; private set; }
    public string? Competitors { get; private set; }
    public string? Description { get; private set; }
    public string[] Tags { get; private set; } = [];
    public DateTime? ClosedAt { get; private set; }
    public string? OutcomeReason { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private CrmOpportunity()
    {
    }

    public CrmOpportunity(
        string name,
        Guid companyId,
        CrmPipelineStage stage,
        Guid ownerUserId,
        string? productInterest,
        decimal? amount,
        string currency,
        DateOnly? expectedCloseDate,
        string? nextStep,
        string? competitors,
        string? description,
        IEnumerable<string>? tags,
        string? opportunityNumber = null)
    {
        if (companyId == Guid.Empty || ownerUserId == Guid.Empty)
        {
            throw new ArgumentException("A company and owner are required.");
        }

        CompanyId = companyId;
        OpportunityNumber = CrmPipeline.Required(
            opportunityNumber ?? CrmOpportunityNumberGenerator.Create(),
            50).ToUpperInvariant();
        OwnerUserId = ownerUserId;
        PipelineId = stage.PipelineId;
        StageId = stage.Id;
        Probability = stage.Probability;
        UpdateProfile(
            name,
            productInterest,
            amount,
            currency,
            expectedCloseDate,
            nextStep,
            competitors,
            description,
            tags);
    }

    public void UpdateProfile(
        string name,
        string? productInterest,
        decimal? amount,
        string currency,
        DateOnly? expectedCloseDate,
        string? nextStep,
        string? competitors,
        string? description,
        IEnumerable<string>? tags)
    {
        if (amount is < 0) throw new ArgumentException("Amount cannot be negative.");
        var normalizedCurrency = CrmPipeline.Required(currency, 3).ToUpperInvariant();
        if (normalizedCurrency.Length != 3 || normalizedCurrency.Any(value => !char.IsLetter(value)))
        {
            throw new ArgumentException("Currency must be a three-letter code.");
        }

        Name = CrmPipeline.Required(name, 255);
        ProductInterest = CrmProductInterests.Normalize(productInterest, ProductInterest);
        Amount = amount;
        Currency = normalizedCurrency;
        ExpectedCloseDate = expectedCloseDate;
        NextStep = CrmPipeline.Optional(nextStep, 1000);
        Competitors = CrmPipeline.Optional(competitors, 1000);
        Description = CrmPipeline.Optional(description, 2000);
        Tags = NormalizeTags(tags);
    }

    public void AssignOwner(Guid ownerUserId)
    {
        if (ownerUserId == Guid.Empty) throw new ArgumentException("An owner is required.");
        OwnerUserId = ownerUserId;
    }

    public void MoveToStage(CrmPipelineStage stage, string? reason, DateTime occurredAt)
    {
        if (stage.PipelineId != PipelineId)
        {
            throw new InvalidOperationException("The selected stage belongs to a different pipeline.");
        }

        var normalizedReason = CrmPipeline.Optional(reason, 1000);
        if (stage.RequiresReason && normalizedReason is null)
        {
            throw new ArgumentException("A reason is required for this stage.", nameof(reason));
        }

        StageId = stage.Id;
        Probability = stage.Probability;
        if (stage.Category == CrmPipelineStageCategory.Open)
        {
            ClosedAt = null;
            OutcomeReason = null;
            IsActive = true;
        }
        else
        {
            ClosedAt = occurredAt;
            OutcomeReason = normalizedReason;
        }
    }

    public void ReassignCompany(Guid companyId) => CompanyId = companyId;
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

    private static string[] NormalizeTags(IEnumerable<string>? values) =>
        (values ?? [])
            .Select(value => value.Trim())
            .Where(value => value.Length > 0)
            .Select(value => value.Length <= 50
                ? value
                : throw new ArgumentException("Tags cannot exceed 50 characters.", nameof(values)))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
            .ToArray();
}

public static class CrmOpportunityNumberGenerator
{
    public static string Create() =>
        $"OPP-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..23]
            .ToUpperInvariant();
}

public static class CrmProductInterests
{
    public const string PSeqLabService = "PSeqLabService";
    public const string PSeqKit = "PSeqKit";

    private static readonly string[] Values = [PSeqLabService, PSeqKit];

    public static string? Normalize(string? value, string? existingValue = null)
    {
        var normalized = CrmPipeline.Optional(value, 255);
        if (normalized is null) return null;

        var canonical = Values.FirstOrDefault(candidate =>
            string.Equals(candidate, normalized, StringComparison.OrdinalIgnoreCase));
        if (canonical is not null) return canonical;

        if (existingValue is not null
            && string.Equals(existingValue, normalized, StringComparison.OrdinalIgnoreCase))
        {
            return existingValue;
        }

        throw new ArgumentException(
            "Product interest must be PSeq Lab Service or PSeq Kit.",
            nameof(value));
    }
}

public sealed class CrmOpportunityContact : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OpportunityId { get; private set; }
    public CrmOpportunity Opportunity { get; private set; } = null!;
    public Guid ContactId { get; private set; }
    public CrmContact Contact { get; private set; } = null!;
    public string? Role { get; private set; }
    public bool IsPrimary { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private CrmOpportunityContact()
    {
    }

    public CrmOpportunityContact(Guid opportunityId, Guid contactId, string? role, bool isPrimary)
    {
        if (opportunityId == Guid.Empty || contactId == Guid.Empty)
        {
            throw new ArgumentException("An opportunity and contact are required.");
        }

        OpportunityId = opportunityId;
        ContactId = contactId;
        Update(role, isPrimary);
    }

    public void Update(string? role, bool isPrimary)
    {
        Role = CrmPipeline.Optional(role, 150);
        IsPrimary = isPrimary;
    }

    public void MakeSecondary() => IsPrimary = false;
    public void ReassignContact(Guid contactId) => ContactId = contactId;
    public void Deactivate()
    {
        IsActive = false;
        IsPrimary = false;
    }

    public void Reactivate() => IsActive = true;
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class CrmOpportunityStageHistory
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OpportunityId { get; private set; }
    public CrmOpportunity Opportunity { get; private set; } = null!;
    public Guid? FromStageId { get; private set; }
    public CrmPipelineStage? FromStage { get; private set; }
    public Guid ToStageId { get; private set; }
    public CrmPipelineStage ToStage { get; private set; } = null!;
    public string? Reason { get; private set; }
    public Guid ChangedByUserId { get; private set; }
    public User ChangedByUser { get; private set; } = null!;
    public DateTime ChangedAt { get; private set; }

    private CrmOpportunityStageHistory()
    {
    }

    public CrmOpportunityStageHistory(
        Guid opportunityId,
        Guid? fromStageId,
        Guid toStageId,
        string? reason,
        Guid changedByUserId,
        DateTime changedAt)
    {
        OpportunityId = opportunityId;
        FromStageId = fromStageId;
        ToStageId = toStageId;
        Reason = CrmPipeline.Optional(reason, 1000);
        ChangedByUserId = changedByUserId;
        ChangedAt = changedAt;
    }
}
