namespace PhaenoPortal.App.Features.Website.Entities;

public sealed class WebContact
{
    public Guid Id { get; set; }

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string OrganizationName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string NormalizedEmail { get; set; } = string.Empty;

    public bool? SendBrochure { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; }

    public DateTimeOffset? UnsubscribedAtUtc { get; private set; }

    public Guid? UnsubscribedByUserId { get; private set; }

    public bool Unsubscribe(Guid actorUserId, DateTimeOffset occurredAtUtc)
    {
        if (UnsubscribedAtUtc.HasValue)
        {
            return false;
        }

        UnsubscribedAtUtc = occurredAtUtc;
        UnsubscribedByUserId = actorUserId;
        return true;
    }
}
