namespace PSeq.Operations.Commercial.Crm.Domain;

using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Common.Persistence;

public sealed class CrmActivity : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public CrmActivityType Type { get; private set; }
    public string Subject { get; private set; } = null!;
    public string? Body { get; private set; }
    public DateTime OccurredAt { get; private set; }
    public CrmActivityVisibility Visibility { get; private set; } = CrmActivityVisibility.Internal;
    public Guid ActorUserId { get; private set; }
    public User ActorUser { get; private set; } = null!;
    public Guid? CompanyId { get; private set; }
    public CrmCompany? Company { get; private set; }
    public Guid? ContactId { get; private set; }
    public CrmContact? Contact { get; private set; }
    public Guid? LeadId { get; private set; }
    public CrmLead? Lead { get; private set; }
    public Guid? OpportunityId { get; private set; }
    public CrmOpportunity? Opportunity { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private CrmActivity()
    {
    }

    public CrmActivity(
        CrmActivityType type,
        string subject,
        string? body,
        DateTime occurredAt,
        CrmActivityVisibility visibility,
        Guid actorUserId,
        Guid? companyId = null,
        Guid? contactId = null,
        Guid? leadId = null,
        Guid? opportunityId = null)
    {
        if (actorUserId == Guid.Empty) throw new ArgumentException("An actor is required.");
        if (!companyId.HasValue && !contactId.HasValue && !leadId.HasValue && !opportunityId.HasValue)
        {
            throw new ArgumentException("An activity must be linked to a CRM record.");
        }

        ActorUserId = actorUserId;
        CompanyId = companyId;
        ContactId = contactId;
        LeadId = leadId;
        OpportunityId = opportunityId;
        Update(type, subject, body, occurredAt, visibility);
    }

    public void Update(
        CrmActivityType type,
        string subject,
        string? body,
        DateTime occurredAt,
        CrmActivityVisibility visibility)
    {
        if (Type is CrmActivityType.System or CrmActivityType.PortalEvent && Type != default)
        {
            throw new InvalidOperationException("System and Portal activities are immutable.");
        }

        Type = type;
        Subject = CrmPipeline.Required(subject, 255);
        Body = CrmPipeline.Optional(body, 4000);
        OccurredAt = occurredAt.Kind == DateTimeKind.Utc ? occurredAt : occurredAt.ToUniversalTime();
        Visibility = visibility;
    }

    public void Deactivate()
    {
        if (Type is CrmActivityType.System or CrmActivityType.PortalEvent)
        {
            throw new InvalidOperationException("System and Portal activities cannot be removed from the timeline.");
        }

        IsActive = false;
    }

    public void ReassignCompany(Guid companyId) => CompanyId = companyId;
    public void ReassignContact(Guid contactId) => ContactId = contactId;
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}
