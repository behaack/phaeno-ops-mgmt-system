namespace PSeq.Operations.Commercial.Crm.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public sealed class CrmCompanyContact : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid CompanyId { get; private set; }
    public CrmCompany Company { get; private set; } = null!;
    public Guid ContactId { get; private set; }
    public CrmContact Contact { get; private set; } = null!;
    public string? RelationshipRole { get; private set; }
    public bool IsPrimaryCompany { get; private set; }
    public DateOnly EffectiveFrom { get; private set; }
    public DateOnly? EffectiveTo { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private CrmCompanyContact()
    {
    }

    public CrmCompanyContact(
        Guid companyId,
        Guid contactId,
        string? relationshipRole,
        bool isPrimaryCompany,
        DateOnly effectiveFrom)
    {
        if (companyId == Guid.Empty || contactId == Guid.Empty)
        {
            throw new ArgumentException("A company and contact are required.");
        }

        CompanyId = companyId;
        ContactId = contactId;
        Update(relationshipRole, isPrimaryCompany, effectiveFrom, null);
    }

    public void Update(
        string? relationshipRole,
        bool isPrimaryCompany,
        DateOnly effectiveFrom,
        DateOnly? effectiveTo)
    {
        if (effectiveTo.HasValue && effectiveTo.Value < effectiveFrom)
        {
            throw new ArgumentException("The relationship end date cannot precede its start date.");
        }

        var normalizedRole = relationshipRole?.Trim();
        if (normalizedRole?.Length > 150)
        {
            throw new ArgumentException("The relationship role cannot exceed 150 characters.");
        }

        RelationshipRole = string.IsNullOrWhiteSpace(normalizedRole) ? null : normalizedRole;
        IsPrimaryCompany = isPrimaryCompany;
        EffectiveFrom = effectiveFrom;
        EffectiveTo = effectiveTo;
        IsActive = !effectiveTo.HasValue || effectiveTo.Value >= DateOnly.FromDateTime(DateTime.UtcNow);
    }

    public void End(DateOnly effectiveTo)
    {
        if (effectiveTo < EffectiveFrom)
        {
            throw new ArgumentException("The relationship end date cannot precede its start date.");
        }

        EffectiveTo = effectiveTo;
        IsActive = false;
        IsPrimaryCompany = false;
    }

    public void MakeSecondary() => IsPrimaryCompany = false;
    public void ReassignCompany(Guid companyId) => CompanyId = companyId;
    public void ReassignContact(Guid contactId) => ContactId = contactId;

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
