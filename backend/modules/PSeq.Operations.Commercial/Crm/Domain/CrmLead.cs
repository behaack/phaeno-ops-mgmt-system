namespace PSeq.Operations.Commercial.Crm.Domain;

using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Common.Persistence;

public sealed class CrmLead : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public CrmLeadKind Kind { get; private set; }
    public string DisplayName { get; private set; } = null!;
    public string? CompanyName { get; private set; }
    public string? FirstName { get; private set; }
    public string? LastName { get; private set; }
    public string? Email { get; private set; }
    public string? NormalizedEmail { get; private set; }
    public string? Phone { get; private set; }
    public string? Source { get; private set; }
    public CrmLeadStatus Status { get; private set; } = CrmLeadStatus.New;
    public string? QualificationNotes { get; private set; }
    public string? DisqualificationReason { get; private set; }
    public string? NextAction { get; private set; }
    public Guid OwnerUserId { get; private set; }
    public User Owner { get; private set; } = null!;
    public string[] Tags { get; private set; } = [];
    public DateTime? ConvertedAt { get; private set; }
    public Guid? ConvertedCompanyId { get; private set; }
    public Guid? ConvertedContactId { get; private set; }
    public Guid? ConvertedOpportunityId { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private CrmLead()
    {
    }

    public CrmLead(
        CrmLeadKind kind,
        string displayName,
        Guid ownerUserId,
        string? companyName = null,
        string? firstName = null,
        string? lastName = null,
        string? email = null,
        string? phone = null,
        string? source = null,
        string? nextAction = null,
        IEnumerable<string>? tags = null)
    {
        AssignOwner(ownerUserId);
        UpdateProfile(
            kind,
            displayName,
            companyName,
            firstName,
            lastName,
            email,
            phone,
            source,
            nextAction,
            tags);
    }

    public void UpdateProfile(
        CrmLeadKind kind,
        string displayName,
        string? companyName,
        string? firstName,
        string? lastName,
        string? email,
        string? phone,
        string? source,
        string? nextAction,
        IEnumerable<string>? tags)
    {
        EnsureMutable();
        Kind = kind;
        DisplayName = Required(displayName, nameof(displayName), 255);
        CompanyName = Optional(companyName, 255);
        FirstName = Optional(firstName, 100);
        LastName = Optional(lastName, 100);
        Email = NormalizeEmail(email);
        NormalizedEmail = Email?.ToUpperInvariant();
        Phone = Optional(phone, 50);
        Source = Optional(source, 150);
        NextAction = Optional(nextAction, 1000);
        Tags = NormalizeTags(tags);

        if (kind == CrmLeadKind.Individual && FirstName is null && LastName is null)
        {
            throw new ArgumentException("An individual lead needs a first or last name.");
        }

        if (kind == CrmLeadKind.Company && CompanyName is null)
        {
            throw new ArgumentException("A company lead needs a company name.");
        }
    }

    public void StartWorking() => SetStatus(CrmLeadStatus.Working);

    public void Qualify(string qualificationNotes)
    {
        EnsureMutable();
        QualificationNotes = Required(qualificationNotes, nameof(qualificationNotes), 2000);
        DisqualificationReason = null;
        Status = CrmLeadStatus.Qualified;
    }

    public void Disqualify(string reason)
    {
        EnsureMutable();
        DisqualificationReason = Required(reason, nameof(reason), 1000);
        Status = CrmLeadStatus.Disqualified;
    }

    public void Convert(
        Guid? companyId,
        Guid? contactId,
        Guid? opportunityId,
        DateTime convertedAt)
    {
        if (Status != CrmLeadStatus.Qualified)
        {
            throw new InvalidOperationException("Qualify the lead before converting it.");
        }

        if (!companyId.HasValue && !contactId.HasValue && !opportunityId.HasValue)
        {
            throw new ArgumentException("Lead conversion must create or associate at least one CRM record.");
        }

        ConvertedCompanyId = companyId;
        ConvertedContactId = contactId;
        ConvertedOpportunityId = opportunityId;
        ConvertedAt = convertedAt;
        Status = CrmLeadStatus.Converted;
        IsActive = false;
    }

    public void ReassignConvertedCompany(Guid companyId)
    {
        if (!ConvertedCompanyId.HasValue) throw new InvalidOperationException("This Lead has no converted Company.");
        if (companyId == Guid.Empty) throw new ArgumentException("A converted Company is required.", nameof(companyId));
        ConvertedCompanyId = companyId;
    }

    public void ReassignConvertedContact(Guid contactId)
    {
        if (!ConvertedContactId.HasValue) throw new InvalidOperationException("This Lead has no converted Contact.");
        if (contactId == Guid.Empty) throw new ArgumentException("A converted Contact is required.", nameof(contactId));
        ConvertedContactId = contactId;
    }

    public void AssignOwner(Guid ownerUserId)
    {
        if (ownerUserId == Guid.Empty)
        {
            throw new ArgumentException("An owner is required.", nameof(ownerUserId));
        }

        OwnerUserId = ownerUserId;
    }

    public void Deactivate()
    {
        EnsureMutable();
        IsActive = false;
    }

    public void Reactivate()
    {
        if (Status is CrmLeadStatus.Converted or CrmLeadStatus.Disqualified)
        {
            throw new InvalidOperationException("Converted or disqualified leads cannot be reactivated.");
        }

        IsActive = true;
    }

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

    private void SetStatus(CrmLeadStatus status)
    {
        EnsureMutable();
        Status = status;
    }

    private void EnsureMutable()
    {
        if (Status == CrmLeadStatus.Converted)
        {
            throw new InvalidOperationException("A converted lead is retained as immutable history.");
        }
    }

    private static string? NormalizeEmail(string? value)
    {
        var normalized = Optional(value, 255);
        if (normalized is null)
        {
            return null;
        }

        try
        {
            var address = new System.Net.Mail.MailAddress(normalized);
            if (!string.Equals(address.Address, normalized, StringComparison.OrdinalIgnoreCase))
            {
                throw new FormatException();
            }
        }
        catch (FormatException)
        {
            throw new ArgumentException("Enter a valid email address.", nameof(value));
        }

        return normalized;
    }

    private static string Required(string? value, string parameterName, int maximumLength)
    {
        var normalized = Optional(value, maximumLength);
        return normalized ?? throw new ArgumentException("A value is required.", parameterName);
    }

    private static string? Optional(string? value, int maximumLength)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrWhiteSpace(normalized)) return null;
        if (normalized.Length > maximumLength)
        {
            throw new ArgumentException($"The value cannot exceed {maximumLength} characters.", nameof(value));
        }

        return normalized;
    }

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
