namespace PSeq.Operations.Commercial.Crm.Domain;

using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Common.Persistence;

/// <summary>
/// An explicit, reviewed link between a relationship Contact and authenticated User.
/// </summary>
public sealed class CrmContactUserLink : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ContactId { get; private set; }
    public CrmContact Contact { get; private set; } = null!;
    public Guid UserId { get; private set; }
    public User User { get; private set; } = null!;
    public bool IsActive { get; private set; } = true;
    public string LinkReason { get; private set; } = null!;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private CrmContactUserLink()
    {
    }

    public CrmContactUserLink(Guid contactId, Guid userId, string linkReason)
    {
        if (contactId == Guid.Empty || userId == Guid.Empty)
        {
            throw new ArgumentException("A Contact and User are required.");
        }

        ContactId = contactId;
        UserId = userId;
        LinkReason = Required(linkReason);
    }

    public void Deactivate() => IsActive = false;
    public void ReassignContact(Guid contactId)
    {
        if (contactId == Guid.Empty)
        {
            throw new ArgumentException("A Contact is required.", nameof(contactId));
        }

        ContactId = contactId;
    }
    public void Reactivate(string linkReason)
    {
        LinkReason = Required(linkReason);
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

    private static string Required(string? value)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            throw new ArgumentException("A link reason is required.", nameof(value));
        }

        return normalized.Length <= 500
            ? normalized
            : throw new ArgumentException("The link reason cannot exceed 500 characters.", nameof(value));
    }
}
