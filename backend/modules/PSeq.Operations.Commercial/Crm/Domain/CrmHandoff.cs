namespace PSeq.Operations.Commercial.Crm.Domain;

using PSeq.Operations.Commercial.Common.Persistence;
using PSeq.Operations.Commercial.Relationships.Domain;

public sealed class CrmHandoff : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid CompanyId { get; private set; }
    public CrmCompany Company { get; private set; } = null!;
    public Guid? OpportunityId { get; private set; }
    public CrmOpportunity? Opportunity { get; private set; }
    public CrmHandoffType Type { get; private set; }
    public Guid RelationshipRequestId { get; private set; }
    public PortalIntegrationRequest RelationshipRequest { get; private set; } = null!;
    public string IdempotencyKey { get; private set; } = null!;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private CrmHandoff() { }

    public CrmHandoff(Guid companyId, Guid? opportunityId, CrmHandoffType type, Guid relationshipRequestId, string idempotencyKey)
    {
        CompanyId = companyId;
        OpportunityId = opportunityId;
        Type = type;
        RelationshipRequestId = relationshipRequestId;
        IdempotencyKey = CrmPipeline.Required(idempotencyKey, 255);
    }

    public void ReassignCompany(Guid companyId) => CompanyId = companyId;
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}
