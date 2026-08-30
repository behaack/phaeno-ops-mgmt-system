namespace PSeq.Operations.Commercial.Crm.Domain;

using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Common.Persistence;

public sealed class CrmContact : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string FirstName { get; private set; } = null!;
    public string LastName { get; private set; } = null!;
    public string? Email { get; private set; }
    public string? NormalizedEmail { get; private set; }
    public string? Phone { get; private set; }
    // Retained only so pre-relationship title data is not discarded by the
    // migration. Current job titles belong to CrmCompanyContact.
    public string? LegacyJobTitle { get; private set; }
    public Guid OwnerUserId { get; private set; }
    public User Owner { get; private set; } = null!;
    public CrmCommunicationPreference CommunicationPreference { get; private set; }
    public string? LawfulContactBasis { get; private set; }
    public string? CommunicationNotes { get; private set; }
    public string[] Tags { get; private set; } = [];
    public string[] Aliases { get; private set; } = [];
    public Guid? MergedIntoContactId { get; private set; }
    public CrmContact? MergedIntoContact { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private CrmContact()
    {
    }

    public CrmContact(
        string firstName,
        string lastName,
        Guid ownerUserId,
        string? email = null,
        string? phone = null,
        CrmCommunicationPreference communicationPreference = CrmCommunicationPreference.Unknown,
        string? lawfulContactBasis = null,
        string? communicationNotes = null,
        IEnumerable<string>? tags = null)
    {
        AssignOwner(ownerUserId);
        UpdateProfile(
            firstName,
            lastName,
            email,
            phone,
            communicationPreference,
            lawfulContactBasis,
            communicationNotes,
            tags);
    }

    public string DisplayName => $"{FirstName} {LastName}".Trim();

    public void UpdateProfile(
        string firstName,
        string lastName,
        string? email,
        string? phone,
        CrmCommunicationPreference communicationPreference,
        string? lawfulContactBasis,
        string? communicationNotes,
        IEnumerable<string>? tags)
    {
        FirstName = Required(firstName, nameof(firstName), 100);
        LastName = Required(lastName, nameof(lastName), 100);
        Email = NormalizeEmail(email);
        NormalizedEmail = Email?.ToUpperInvariant();
        Phone = Optional(phone, 50);
        CommunicationPreference = communicationPreference;
        LawfulContactBasis = Optional(lawfulContactBasis, 255);
        CommunicationNotes = Optional(communicationNotes, 1000);
        Tags = NormalizeTags(tags);
    }

    public void AssignOwner(Guid ownerUserId)
    {
        if (ownerUserId == Guid.Empty)
        {
            throw new ArgumentException("An owner is required.", nameof(ownerUserId));
        }

        OwnerUserId = ownerUserId;
    }

    public void Deactivate() => IsActive = false;
    public void Reactivate() => IsActive = true;

    public void MergeInto(Guid targetContactId)
    {
        if (targetContactId == Guid.Empty || targetContactId == Id)
        {
            throw new InvalidOperationException("Select a different target contact for the merge.");
        }

        MergedIntoContactId = targetContactId;
        IsActive = false;
    }

    public void AddAlias(string alias)
    {
        var normalized = Required(alias, nameof(alias), 255);
        Aliases = Aliases.Append(normalized)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
            .ToArray();
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
        var normalized = value?.Trim();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            throw new ArgumentException("A value is required.", parameterName);
        }

        if (normalized.Length > maximumLength)
        {
            throw new ArgumentException($"The value cannot exceed {maximumLength} characters.", parameterName);
        }

        return normalized;
    }

    private static string? Optional(string? value, int maximumLength)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return null;
        }

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
