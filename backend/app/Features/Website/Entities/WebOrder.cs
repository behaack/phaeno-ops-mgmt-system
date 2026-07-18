namespace PhaenoPortal.App.Features.Website.Entities;

public sealed class WebOrder
{
    public Guid Id { get; set; }

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string OrganizationName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public DateTimeOffset? CompletedAtUtc { get; private set; }

    public Guid? CompletedByUserId { get; private set; }

    public bool Complete(Guid actorUserId, DateTimeOffset occurredAtUtc)
    {
        if (CompletedAtUtc.HasValue)
        {
            return false;
        }

        CompletedAtUtc = occurredAtUtc;
        CompletedByUserId = actorUserId;
        return true;
    }
}
