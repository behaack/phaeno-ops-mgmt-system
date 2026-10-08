namespace PhaenoPortal.App.Features.OrderManagement.DTOs;

public sealed record CreateCustomWorkRequest(
    string Service,
    string Subject,
    string Description,
    Guid? SourceOrderId = null);

// External callers receive their submission reference, never internal CRM terms,
// ownership, pipeline configuration, or a platform-only navigation target.
public sealed record CustomWorkSubmissionDto(
    Guid OpportunityId,
    string OpportunityNumber,
    Guid DepartmentId,
    string Status);
