namespace PhaenoPortal.App.Infrastructure.Persistence.Auditing;

public interface ICurrentUserContext
{
    Guid? UserId { get; }
    Guid? OrganizationId { get; }
    string? RequestId { get; }
}
