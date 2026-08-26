namespace PSeq.Operations.Commercial.Crm.Domain;

using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Common.Persistence;

public sealed class CrmTask : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Title { get; private set; } = null!;
    public string? Description { get; private set; }
    public Guid OwnerUserId { get; private set; }
    public User Owner { get; private set; } = null!;
    public CrmTaskPriority Priority { get; private set; } = CrmTaskPriority.Normal;
    public CrmTaskStatus Status { get; private set; } = CrmTaskStatus.Open;
    public DateTime? DueAt { get; private set; }
    public DateTime? ReminderAt { get; private set; }
    public string? RecurrenceRule { get; private set; }
    public string? BlockedReason { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public Guid? CompletedByUserId { get; private set; }
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

    private CrmTask()
    {
    }

    public CrmTask(
        string title,
        string? description,
        Guid ownerUserId,
        CrmTaskPriority priority,
        DateTime? dueAt,
        DateTime? reminderAt,
        string? recurrenceRule,
        Guid? companyId = null,
        Guid? contactId = null,
        Guid? leadId = null,
        Guid? opportunityId = null)
    {
        if (!companyId.HasValue && !contactId.HasValue && !leadId.HasValue && !opportunityId.HasValue)
        {
            throw new ArgumentException("A task must be linked to a CRM record.");
        }

        CompanyId = companyId;
        ContactId = contactId;
        LeadId = leadId;
        OpportunityId = opportunityId;
        AssignOwner(ownerUserId);
        Update(title, description, priority, dueAt, reminderAt, recurrenceRule);
    }

    public void Update(
        string title,
        string? description,
        CrmTaskPriority priority,
        DateTime? dueAt,
        DateTime? reminderAt,
        string? recurrenceRule)
    {
        if (reminderAt.HasValue && dueAt.HasValue && reminderAt.Value > dueAt.Value)
        {
            throw new ArgumentException("The reminder cannot occur after the due date.");
        }

        Title = CrmPipeline.Required(title, 255);
        Description = CrmPipeline.Optional(description, 2000);
        Priority = priority;
        DueAt = NormalizeUtc(dueAt);
        ReminderAt = NormalizeUtc(reminderAt);
        RecurrenceRule = CrmPipeline.Optional(recurrenceRule, 255);
    }

    public void AssignOwner(Guid ownerUserId)
    {
        if (ownerUserId == Guid.Empty) throw new ArgumentException("An owner is required.");
        OwnerUserId = ownerUserId;
    }

    public void Start()
    {
        EnsureOpen();
        Status = CrmTaskStatus.InProgress;
        BlockedReason = null;
    }

    public void Block(string reason)
    {
        EnsureOpen();
        BlockedReason = CrmPipeline.Required(reason, 1000);
        Status = CrmTaskStatus.Blocked;
    }

    public void Complete(Guid actorUserId, DateTime completedAt)
    {
        EnsureOpen();
        Status = CrmTaskStatus.Completed;
        CompletedByUserId = actorUserId;
        CompletedAt = completedAt;
        BlockedReason = null;
    }

    public void Cancel()
    {
        EnsureOpen();
        Status = CrmTaskStatus.Cancelled;
        BlockedReason = null;
    }

    public void Reopen()
    {
        Status = CrmTaskStatus.Open;
        CompletedAt = null;
        CompletedByUserId = null;
        BlockedReason = null;
        IsActive = true;
    }

    public void ReassignCompany(Guid companyId) => CompanyId = companyId;
    public void ReassignContact(Guid contactId) => ContactId = contactId;
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;

    private void EnsureOpen()
    {
        if (Status is CrmTaskStatus.Completed or CrmTaskStatus.Cancelled)
        {
            throw new InvalidOperationException("Reopen the task before changing its workflow status.");
        }
    }

    private static DateTime? NormalizeUtc(DateTime? value) => value.HasValue
        ? value.Value.Kind == DateTimeKind.Utc ? value : value.Value.ToUniversalTime()
        : null;
}
