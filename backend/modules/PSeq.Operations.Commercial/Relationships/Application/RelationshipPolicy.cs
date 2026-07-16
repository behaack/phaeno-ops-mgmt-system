namespace PSeq.Operations.Commercial.Relationships.Application;

using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Relationships.Domain;

public static class RelationshipPolicy
{
    public static bool IsServiceAllowed(OrganizationKind organizationKind, PortalService service) =>
        organizationKind switch
        {
            OrganizationKind.Customer => service == PortalService.PSeqLabService,
            OrganizationKind.Partner => service is PortalService.PSeqLabService or PortalService.PSeqKit,
            _ => false
        };
}
