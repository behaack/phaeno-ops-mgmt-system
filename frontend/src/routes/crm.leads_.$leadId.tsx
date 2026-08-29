import { createFileRoute } from "@tanstack/react-router";

import { CrmLeadDetailPage } from "#/features/crm/CrmLeadDetailPage";

export const Route = createFileRoute("/crm/leads_/$leadId")({
  component: LeadRoute,
});

function LeadRoute() {
  const { leadId } = Route.useParams();
  return <CrmLeadDetailPage leadId={leadId} />;
}
