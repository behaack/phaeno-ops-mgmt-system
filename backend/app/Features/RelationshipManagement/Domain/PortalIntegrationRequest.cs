namespace PhaenoPortal.App.Features.RelationshipManagement.Domain;

using PhaenoPortal.App.Common.Persistence;
using PhaenoPortal.App.Features.Accounts.Domain;

public sealed class PortalIntegrationRequest : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string RequestNumber { get; private set; } = null!;
    public Guid? OrganizationId { get; private set; }
    public string CandidateOrganizationName { get; private set; } = null!;
    public PortalIntegrationRequestType RequestType { get; private set; }
    public PortalIntegrationRequestSource Source { get; private set; }
    public PortalIntegrationRequestStatus Status { get; private set; } = PortalIntegrationRequestStatus.PendingReview;
    public OrganizationKind? RequestedOrganizationKind { get; private set; }
    public string? SourceReference { get; private set; }
    public string Summary { get; private set; } = null!;
    public string? InternalNotes { get; private set; }
    public Guid RequestedByUserId { get; private set; }
    public Guid? ReviewedByUserId { get; private set; }
    public DateTime? ReviewedAt { get; private set; }
    public string? DecisionReason { get; private set; }
    public Guid? AppliedByUserId { get; private set; }
    public DateTime? AppliedAt { get; private set; }
    public string? ApplicationNotes { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    public ICollection<PortalIntegrationRequestService> RequestedServices { get; } = [];

    private PortalIntegrationRequest()
    {
    }

    public PortalIntegrationRequest(
        Guid? organizationId,
        string candidateOrganizationName,
        PortalIntegrationRequestType requestType,
        PortalIntegrationRequestSource source,
        OrganizationKind? requestedOrganizationKind,
        string? sourceReference,
        string summary,
        string? internalNotes,
        Guid requestedByUserId,
        IEnumerable<PortalService> requestedServices)
    {
        OrganizationId = organizationId;
        CandidateOrganizationName = RelationshipText.Required(candidateOrganizationName, nameof(candidateOrganizationName), 255);
        RequestType = requestType;
        Source = source;
        RequestedOrganizationKind = requestedOrganizationKind;
        SourceReference = RelationshipText.Optional(sourceReference, 255);
        Summary = RelationshipText.Required(summary, nameof(summary), 2000);
        InternalNotes = RelationshipText.Optional(internalNotes, 4000);
        RequestedByUserId = requestedByUserId;
        RequestNumber = $"PRQ-{Id:N}".ToUpperInvariant();

        foreach (var service in requestedServices.Distinct())
        {
            RequestedServices.Add(new PortalIntegrationRequestService(Id, service));
        }
    }

    public void Decide(bool approved, string reason, Guid actorUserId, DateTime utcNow)
    {
        if (Status != PortalIntegrationRequestStatus.PendingReview)
        {
            throw new InvalidOperationException("Only a pending request can be reviewed.");
        }

        Status = approved ? PortalIntegrationRequestStatus.Approved : PortalIntegrationRequestStatus.Declined;
        ReviewedByUserId = actorUserId;
        ReviewedAt = utcNow;
        DecisionReason = RelationshipText.Required(reason, nameof(reason), 2000);
    }

    public void MarkApplied(string notes, Guid actorUserId, DateTime utcNow)
    {
        if (Status != PortalIntegrationRequestStatus.Approved)
        {
            throw new InvalidOperationException("Only an approved request can be marked applied.");
        }

        Status = PortalIntegrationRequestStatus.Applied;
        AppliedByUserId = actorUserId;
        AppliedAt = utcNow;
        ApplicationNotes = RelationshipText.Required(notes, nameof(notes), 2000);
    }

    public void AssociateOrganization(Guid organizationId)
    {
        if (OrganizationId.HasValue && OrganizationId.Value != organizationId)
        {
            throw new InvalidOperationException("The request is already associated with another organization.");
        }

        OrganizationId = organizationId;
    }

    public bool AuthorizesEntitlement(Guid organizationId, PortalService service) =>
        OrganizationId == organizationId
        && Status is PortalIntegrationRequestStatus.Approved or PortalIntegrationRequestStatus.Applied
        && RequestedServices.Any(value => value.Service == service);

    public void Cancel(string reason, Guid actorUserId, DateTime utcNow)
    {
        if (Status is PortalIntegrationRequestStatus.Applied or PortalIntegrationRequestStatus.Declined or PortalIntegrationRequestStatus.Cancelled)
        {
            throw new InvalidOperationException("This request can no longer be cancelled.");
        }

        Status = PortalIntegrationRequestStatus.Cancelled;
        ReviewedByUserId = actorUserId;
        ReviewedAt = utcNow;
        DecisionReason = RelationshipText.Required(reason, nameof(reason), 2000);
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
}

public sealed class PortalIntegrationRequestService
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid PortalIntegrationRequestId { get; private set; }
    public PortalService Service { get; private set; }

    private PortalIntegrationRequestService()
    {
    }

    public PortalIntegrationRequestService(Guid portalIntegrationRequestId, PortalService service)
    {
        PortalIntegrationRequestId = portalIntegrationRequestId;
        Service = service;
    }
}
