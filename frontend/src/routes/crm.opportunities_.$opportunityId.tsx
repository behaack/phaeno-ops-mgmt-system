import { validateCrmNavigationSearch } from '#/features/crm/CrmListNavigation'
import { createFileRoute } from "@tanstack/react-router";

import { CrmOpportunityDetailPage } from "#/features/crm/CrmOpportunityDetailPage";

export const Route = createFileRoute("/crm/opportunities_/$opportunityId")({ validateSearch: validateCrmNavigationSearch,
  component: OpportunityRoute,
});

function OpportunityRoute() {
  const { opportunityId } = Route.useParams();
  return <CrmOpportunityDetailPage opportunityId={opportunityId} />;
}
