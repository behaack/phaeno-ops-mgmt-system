import { api } from "./client";

export { apiErrorMessage } from "./api-error";

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error: null | { code: string; message: string; details?: unknown };
};

export type CrmCompany = {
  id: string;
  name: string;
  websiteUrl: string | null;
  domainName: string | null;
  phone: string | null;
  industry: string | null;
  description: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  countryCode: string | null;
  employeeCount: number | null;
  lifecycleState: CrmCompanyLifecycleState;
  source: string | null;
  tags: string[];
  aliases: string[];
  mergedIntoCompanyId: string | null;
  ownerUserId: string;
  ownerName: string;
  accessOrganizationId: string | null;
  portalRelationship: "Prospect" | "Customer" | "Partner" | null;
  portalReadiness: "NotReviewed" | "Pending" | "Ready" | "Blocked" | null;
  portalAccessStatus: "NotEnabled" | "Enabled" | "Suspended";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type CrmCompanyList = {
  items: CrmCompany[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type CrmCompanyInput = {
  name: string;
  websiteUrl: string | null;
  domainName: string | null;
  phone: string | null;
  industry: string | null;
  description: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  employeeCount?: number | null;
  lifecycleState?: CrmCompanyLifecycleState;
  source?: string | null;
  tags?: string[];
};

export type CrmCompanyLifecycleState =
  | "Target"
  | "Engaged"
  | "ActiveCustomer"
  | "Partner"
  | "FormerRelationship"
  | "Other";
export type CrmCommunicationPreference =
  | "Unknown"
  | "Permitted"
  | "OptedOut"
  | "DoNotContact";
export type CrmLeadKind = "Individual" | "Company";
export type CrmLeadStatus =
  | "New"
  | "Working"
  | "Qualified"
  | "Disqualified"
  | "Converted";
export type CrmPipelineStageCategory = "Open" | "Won" | "Lost" | "Abandoned";
export type CrmProductInterest = "PSeqLabService" | "PSeqKit";
export type CrmActivityType =
  | "Note"
  | "Call"
  | "Meeting"
  | "Email"
  | "StatusChange"
  | "TaskEvent"
  | "PortalEvent"
  | "System";
export type CrmActivityVisibility = "Internal" | "Restricted";
export type CrmTaskPriority = "Low" | "Normal" | "High" | "Urgent";
export type CrmTaskStatus =
  | "Open"
  | "InProgress"
  | "Blocked"
  | "Completed"
  | "Cancelled";
export type CrmRecordType =
  | "Company"
  | "Contact"
  | "Lead"
  | "Opportunity"
  | "Task";
export type CrmCustomFieldDataType =
  | "Text"
  | "Number"
  | "Date"
  | "Boolean"
  | "Option";
export type CrmFieldSensitivity = "Internal" | "Restricted";
export type CrmHandoffType =
  | "PortalOnboarding"
  | "PortalEvaluation"
  | "TrialProject"
  | "CustomWork"
  | "ServiceChange"
  | "RelationshipChange"
  | "Offboarding";

export type CrmPage<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type CrmContact = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  primaryCompanyName: string | null;
  primaryCompanyTitle: string | null;
  ownerUserId: string;
  ownerName: string;
  communicationPreference: CrmCommunicationPreference;
  lawfulContactBasis: string | null;
  communicationNotes: string | null;
  tags: string[];
  aliases: string[];
  mergedIntoContactId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type CrmContactInput = {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  ownerUserId?: string | null;
  communicationPreference: CrmCommunicationPreference;
  lawfulContactBasis: string | null;
  communicationNotes: string | null;
  tags: string[];
  version?: number;
};

export type CrmCompanyContact = {
  id: string;
  companyId: string;
  companyName: string;
  contactId: string;
  contactName: string;
  jobTitle: string | null;
  relationshipRole: string | null;
  isPrimaryCompany: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  version: number;
};

export type CrmLead = {
  id: string;
  kind: CrmLeadKind;
  displayName: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: CrmLeadStatus;
  qualificationNotes: string | null;
  disqualificationReason: string | null;
  nextAction: string | null;
  ownerUserId: string;
  ownerName: string;
  tags: string[];
  convertedAt: string | null;
  convertedCompanyId: string | null;
  convertedContactId: string | null;
  convertedOpportunityId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type CrmLeadInput = {
  kind: CrmLeadKind;
  displayName: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  nextAction: string | null;
  ownerUserId?: string | null;
  tags: string[];
  version?: number;
};

export type CrmPipelineStage = {
  id: string;
  pipelineId: string;
  name: string;
  position: number;
  category: CrmPipelineStageCategory;
  probability: number;
  requiresReason: boolean;
  isActive: boolean;
  version: number;
};
export type CrmPipeline = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  stages: CrmPipelineStage[];
  version: number;
};

export type CrmOpportunity = {
  id: string;
  opportunityNumber: string;
  name: string;
  companyId: string;
  companyName: string;
  pipelineId: string;
  pipelineName: string;
  stageId: string;
  stageName: string;
  stageCategory: CrmPipelineStageCategory;
  ownerUserId: string;
  ownerName: string;
  productInterest: CrmProductInterest | string | null;
  amount: number | null;
  currency: string;
  probability: number;
  expectedCloseDate: string | null;
  nextStep: string | null;
  competitors: string | null;
  description: string | null;
  tags: string[];
  closedAt: string | null;
  outcomeReason: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type CrmOpportunityInput = {
  name: string;
  companyId: string;
  pipelineId: string;
  stageId?: string | null;
  ownerUserId?: string | null;
  productInterest: CrmProductInterest | null;
  amount: number | null;
  currency: string;
  expectedCloseDate: string | null;
  nextStep: string | null;
  competitors: string | null;
  description: string | null;
  tags: string[];
  version?: number;
};

export type CrmOpportunityContact = {
  id: string;
  contactId: string;
  contactName: string;
  role: string | null;
  isPrimary: boolean;
  isActive: boolean;
  version: number;
};

export type CrmActivity = {
  id: string;
  type: CrmActivityType;
  subject: string;
  body: string | null;
  occurredAt: string;
  visibility: CrmActivityVisibility;
  actorUserId: string;
  actorName: string;
  companyId: string | null;
  companyName: string | null;
  contactId: string | null;
  contactName: string | null;
  leadId: string | null;
  leadName: string | null;
  opportunityId: string | null;
  opportunityName: string | null;
  isActive: boolean;
  version: number;
};

export type CrmTask = {
  id: string;
  title: string;
  description: string | null;
  ownerUserId: string;
  ownerName: string;
  priority: CrmTaskPriority;
  status: CrmTaskStatus;
  dueAt: string | null;
  reminderAt: string | null;
  recurrenceRule: string | null;
  blockedReason: string | null;
  completedAt: string | null;
  companyId: string | null;
  companyName: string | null;
  contactId: string | null;
  contactName: string | null;
  leadId: string | null;
  leadName: string | null;
  opportunityId: string | null;
  opportunityName: string | null;
  isActive: boolean;
  version: number;
};

export type CrmPipelineStageReport = {
  stageId: string;
  stageName: string;
  category: CrmPipelineStageCategory;
  opportunityCount: number;
  amount: number;
  weightedAmount: number;
  averageAgeDays: number;
};
export type CrmPipelineReport = {
  openOpportunities: number;
  wonOpportunities: number;
  lostOpportunities: number;
  openAmount: number;
  weightedForecast: number;
  winRate: number;
  stages: CrmPipelineStageReport[];
};
export type CrmDashboard = {
  attention: {
    overdueTasks: number;
    dueSoonTasks: number;
    leadsNeedingNextAction: number;
    staleOpportunities: number;
    dataQualityWarnings: number;
  };
  tasks: CrmTask[];
  recentlyChangedOpportunities: CrmOpportunity[];
  pipeline: CrmPipelineReport;
};
export type CrmReports = {
  pipeline: CrmPipelineReport;
  ownerWorkload: Array<{
    ownerUserId: string;
    ownerName: string;
    openTasks: number;
    overdueTasks: number;
    openLeads: number;
    openOpportunities: number;
    weightedForecast: number;
  }>;
  sourcePerformance: Array<{
    source: string;
    leads: number;
    qualified: number;
    converted: number;
    conversionRate: number;
  }>;
  activitiesLast30Days: number;
};
export type CrmDuplicateGroup = {
  recordType: CrmRecordType;
  matchReason: string;
  matchValue: string;
  recordIds: string[];
  recordNames: string[];
};
export type CrmCustomFieldDefinition = {
  id: string;
  name: string;
  recordType: CrmRecordType;
  dataType: CrmCustomFieldDataType;
  sensitivity: CrmFieldSensitivity;
  optionsJson: string | null;
  isRequired: boolean;
  isActive: boolean;
  version: number;
};
export type CrmSavedView = {
  id: string;
  name: string;
  recordType: CrmRecordType;
  filterJson: string;
  isShared: boolean;
  ownerUserId: string;
  isActive: boolean;
  version: number;
};
export type CrmImportPreview = {
  batchId: string;
  recordType: CrmRecordType;
  status: "Previewed" | "Committed" | "Failed";
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
  errors: string[];
  version: number;
};
export type CrmHandoff = {
  id: string;
  companyId: string;
  opportunityId: string | null;
  type: CrmHandoffType;
  relationshipRequestId: string;
  requestNumber: string;
  status: string;
  requestedOrganizationKind: string | null;
  organizationId: string | null;
  idempotencyKey: string;
  createdAt: string;
  requestVersion: number;
  orderId: string | null;
  orderNumber: string | null;
  orderStatus: string | null;
  canStartCustomerOrder: boolean;
  orderBlockingReason: string | null;
};
export type CrmOrderHandoff = {
  handoff: CrmHandoff;
  companyName: string;
  opportunityName: string | null;
  organizationName: string | null;
  summary: string;
};

export async function listCrmCompanies(input: {
  search?: string;
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const response = await api.get<ApiEnvelope<CrmCompanyList>>(
    "/platform/crm/companies",
    { params: input },
  );
  return unwrap(response.data);
}

export async function getCrmCompany(id: string) {
  const response = await api.get<ApiEnvelope<CrmCompany>>(
    `/platform/crm/companies/${id}`,
  );
  return unwrap(response.data);
}

export async function getCrmCompanyByAccessOrganization(
  organizationId: string,
) {
  const response = await api.get<ApiEnvelope<CrmCompany>>(
    `/platform/crm/companies/by-access/${organizationId}`,
  );
  return unwrap(response.data);
}

export async function createCrmCompany(input: CrmCompanyInput) {
  const response = await api.post<ApiEnvelope<CrmCompany>>(
    "/platform/crm/companies",
    input,
  );
  return unwrap(response.data);
}

export async function updateCrmCompany(
  id: string,
  input: CrmCompanyInput & { version: number },
) {
  const response = await api.put<ApiEnvelope<CrmCompany>>(
    `/platform/crm/companies/${id}`,
    input,
  );
  return unwrap(response.data);
}

export async function assignCrmCompanyOwner(
  id: string,
  ownerUserId: string,
  version: number,
) {
  const response = await api.post<ApiEnvelope<CrmCompany>>(
    `/platform/crm/companies/${id}/owner`,
    { ownerUserId, version },
  );
  return unwrap(response.data);
}

export async function setCrmCompanyActive(
  id: string,
  active: boolean,
  version: number,
) {
  const response = await api.post<ApiEnvelope<CrmCompany>>(
    `/platform/crm/companies/${id}/${active ? "reactivate" : "deactivate"}`,
    { version },
  );
  return unwrap(response.data);
}
export async function mergeCrmCompany(
  id: string,
  targetId: string,
  reason: string,
  version: number,
) {
  const response = await api.post<ApiEnvelope<CrmCompany>>(
    `/platform/crm/companies/${id}/merge`,
    { targetId, reason, version },
  );
  return unwrap(response.data);
}

export async function listCrmContacts(input: {
  search?: string;
  companyId?: string;
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const response = await api.get<ApiEnvelope<CrmPage<CrmContact>>>(
    "/platform/crm/contacts",
    { params: input },
  );
  return unwrap(response.data);
}
export async function getCrmContact(id: string) {
  const response = await api.get<ApiEnvelope<CrmContact>>(
    `/platform/crm/contacts/${id}`,
  );
  return unwrap(response.data);
}
export async function createCrmContact(input: CrmContactInput) {
  const response = await api.post<ApiEnvelope<CrmContact>>(
    "/platform/crm/contacts",
    input,
  );
  return unwrap(response.data);
}
export async function updateCrmContact(
  id: string,
  input: CrmContactInput & { version: number },
) {
  const response = await api.put<ApiEnvelope<CrmContact>>(
    `/platform/crm/contacts/${id}`,
    input,
  );
  return unwrap(response.data);
}
export async function setCrmContactActive(
  id: string,
  active: boolean,
  version: number,
) {
  const response = await api.post<ApiEnvelope<CrmContact>>(
    `/platform/crm/contacts/${id}/${active ? "reactivate" : "deactivate"}`,
    { version },
  );
  return unwrap(response.data);
}
export async function mergeCrmContact(
  id: string,
  targetId: string,
  reason: string,
  version: number,
) {
  const response = await api.post<ApiEnvelope<CrmContact>>(
    `/platform/crm/contacts/${id}/merge`,
    { targetId, reason, version },
  );
  return unwrap(response.data);
}
export async function listContactCompanies(contactId: string) {
  const response = await api.get<ApiEnvelope<CrmCompanyContact[]>>(
    `/platform/crm/contacts/${contactId}/companies`,
  );
  return unwrap(response.data);
}
export async function listCompanyContacts(companyId: string) {
  const response = await api.get<ApiEnvelope<CrmCompanyContact[]>>(
    `/platform/crm/companies/${companyId}/contacts`,
  );
  return unwrap(response.data);
}
export async function associateCompanyContact(
  companyId: string,
  input: {
    contactId: string;
    jobTitle: string | null;
    relationshipRole: string | null;
    isPrimaryCompany: boolean;
    effectiveFrom: string;
  },
) {
  const response = await api.post<ApiEnvelope<CrmCompanyContact>>(
    `/platform/crm/companies/${companyId}/contacts`,
    input,
  );
  return unwrap(response.data);
}
export async function updateCompanyContact(
  companyId: string,
  associationId: string,
  input: {
    jobTitle: string | null;
    relationshipRole: string | null;
    isPrimaryCompany: boolean;
    effectiveFrom: string;
    effectiveTo: string | null;
    version: number;
  },
) {
  const response = await api.put<ApiEnvelope<CrmCompanyContact>>(
    `/platform/crm/companies/${companyId}/contacts/${associationId}`,
    input,
  );
  return unwrap(response.data);
}

export async function listCrmLeads(input: {
  search?: string;
  status?: CrmLeadStatus;
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const response = await api.get<ApiEnvelope<CrmPage<CrmLead>>>(
    "/platform/crm/leads",
    { params: input },
  );
  return unwrap(response.data);
}
export async function getCrmLead(id: string) {
  const response = await api.get<ApiEnvelope<CrmLead>>(
    `/platform/crm/leads/${id}`,
  );
  return unwrap(response.data);
}
export async function createCrmLead(input: CrmLeadInput) {
  const response = await api.post<ApiEnvelope<CrmLead>>(
    "/platform/crm/leads",
    input,
  );
  return unwrap(response.data);
}
export async function updateCrmLead(
  id: string,
  input: CrmLeadInput & { version: number },
) {
  const response = await api.put<ApiEnvelope<CrmLead>>(
    `/platform/crm/leads/${id}`,
    input,
  );
  return unwrap(response.data);
}
export async function changeCrmLead(
  id: string,
  action: "working" | "qualify" | "disqualify",
  explanation: string,
  version: number,
) {
  const response = await api.post<ApiEnvelope<CrmLead>>(
    `/platform/crm/leads/${id}/${action}`,
    { explanation, version },
  );
  return unwrap(response.data);
}
export async function convertCrmLead(
  id: string,
  input: {
    existingCompanyId?: string | null;
    createCompany: boolean;
    createContact: boolean;
    createOpportunity: boolean;
    opportunityName?: string | null;
    pipelineId?: string | null;
    version: number;
  },
) {
  const response = await api.post<
    ApiEnvelope<{
      lead: CrmLead;
      companyId: string | null;
      contactId: string | null;
      opportunityId: string | null;
      duplicateWarnings: string[];
    }>
  >(`/platform/crm/leads/${id}/convert`, input);
  return unwrap(response.data);
}

export async function listCrmPipelines(includeInactive = false) {
  const response = await api.get<ApiEnvelope<CrmPipeline[]>>(
    "/platform/crm/pipelines",
    { params: { includeInactive } },
  );
  return unwrap(response.data);
}
export async function createCrmPipeline(input: {
  name: string;
  description: string | null;
  isDefault: boolean;
}) {
  const response = await api.post<ApiEnvelope<CrmPipeline>>(
    "/platform/crm/pipelines",
    input,
  );
  return unwrap(response.data);
}
export async function updateCrmPipeline(
  id: string,
  input: {
    name: string;
    description: string | null;
    isDefault: boolean;
    version: number;
  },
) {
  const response = await api.put<ApiEnvelope<CrmPipeline>>(
    `/platform/crm/pipelines/${id}`,
    input,
  );
  return unwrap(response.data);
}
export async function changeCrmPipelineActive(
  id: string,
  action: "deactivate" | "reactivate",
  version: number,
) {
  const response = await api.post<ApiEnvelope<CrmPipeline>>(
    `/platform/crm/pipelines/${id}/${action}`,
    { version },
  );
  return unwrap(response.data);
}
export async function createCrmPipelineStage(
  pipelineId: string,
  input: {
    name: string;
    position: number;
    category: CrmPipelineStageCategory;
    probability: number;
    requiresReason: boolean;
  },
) {
  const response = await api.post<ApiEnvelope<CrmPipelineStage>>(
    `/platform/crm/pipelines/${pipelineId}/stages`,
    input,
  );
  return unwrap(response.data);
}
export async function updateCrmPipelineStage(
  pipelineId: string,
  stageId: string,
  input: {
    name: string;
    position: number;
    category: CrmPipelineStageCategory;
    probability: number;
    requiresReason: boolean;
    version: number;
  },
) {
  const response = await api.put<ApiEnvelope<CrmPipelineStage>>(
    `/platform/crm/pipelines/${pipelineId}/stages/${stageId}`,
    input,
  );
  return unwrap(response.data);
}
export async function changeCrmPipelineStageActive(
  pipelineId: string,
  stageId: string,
  action: "deactivate" | "reactivate",
  version: number,
) {
  const response = await api.post<ApiEnvelope<CrmPipelineStage>>(
    `/platform/crm/pipelines/${pipelineId}/stages/${stageId}/${action}`,
    { version },
  );
  return unwrap(response.data);
}

export async function listCrmOpportunities(input: {
  search?: string;
  pipelineId?: string;
  stageId?: string;
  companyId?: string;
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const response = await api.get<ApiEnvelope<CrmPage<CrmOpportunity>>>(
    "/platform/crm/opportunities",
    { params: input },
  );
  return unwrap(response.data);
}
export async function getCrmOpportunity(id: string) {
  const response = await api.get<ApiEnvelope<CrmOpportunity>>(
    `/platform/crm/opportunities/${id}`,
  );
  return unwrap(response.data);
}
export async function createCrmOpportunity(input: CrmOpportunityInput) {
  const response = await api.post<ApiEnvelope<CrmOpportunity>>(
    "/platform/crm/opportunities",
    input,
  );
  return unwrap(response.data);
}
export async function updateCrmOpportunity(
  id: string,
  input: CrmOpportunityInput & { version: number },
) {
  const response = await api.put<ApiEnvelope<CrmOpportunity>>(
    `/platform/crm/opportunities/${id}`,
    input,
  );
  return unwrap(response.data);
}
export async function moveCrmOpportunity(
  id: string,
  stageId: string,
  reason: string | null,
  version: number,
) {
  const response = await api.post<ApiEnvelope<CrmOpportunity>>(
    `/platform/crm/opportunities/${id}/stage`,
    { stageId, reason, version },
  );
  return unwrap(response.data);
}
export async function getCrmOpportunityHistory(id: string) {
  const response = await api.get<
    ApiEnvelope<
      Array<{
        id: string;
        fromStageId: string | null;
        fromStageName: string | null;
        toStageId: string;
        toStageName: string;
        reason: string | null;
        changedByName: string;
        changedAt: string;
      }>
    >
  >(`/platform/crm/opportunities/${id}/stage-history`);
  return unwrap(response.data);
}
export async function listCrmOpportunityContacts(id: string) {
  const response = await api.get<ApiEnvelope<CrmOpportunityContact[]>>(
    `/platform/crm/opportunities/${id}/contacts`,
  );
  return unwrap(response.data);
}
export async function addCrmOpportunityContact(
  opportunityId: string,
  input: { contactId: string; role: string | null; isPrimary: boolean },
) {
  const response = await api.post<ApiEnvelope<CrmOpportunityContact>>(
    `/platform/crm/opportunities/${opportunityId}/contacts`,
    input,
  );
  return unwrap(response.data);
}
export async function updateCrmOpportunityContact(
  opportunityId: string,
  associationId: string,
  input: { role: string | null; isPrimary: boolean; version: number },
) {
  const response = await api.put<ApiEnvelope<CrmOpportunityContact>>(
    `/platform/crm/opportunities/${opportunityId}/contacts/${associationId}`,
    input,
  );
  return unwrap(response.data);
}
export async function removeCrmOpportunityContact(
  opportunityId: string,
  associationId: string,
  version: number,
) {
  const response = await api.post<ApiEnvelope<CrmOpportunityContact>>(
    `/platform/crm/opportunities/${opportunityId}/contacts/${associationId}/deactivate`,
    { version },
  );
  return unwrap(response.data);
}

export async function listCrmActivities(input: {
  type?: CrmActivityType;
  companyId?: string;
  contactId?: string;
  leadId?: string;
  opportunityId?: string;
  page?: number;
  pageSize?: number;
}) {
  const response = await api.get<ApiEnvelope<CrmPage<CrmActivity>>>(
    "/platform/crm/activities",
    { params: input },
  );
  return unwrap(response.data);
}
export async function createCrmActivity(input: {
  type: CrmActivityType;
  subject: string;
  body: string | null;
  occurredAt: string;
  visibility: CrmActivityVisibility;
  companyId?: string | null;
  contactId?: string | null;
  leadId?: string | null;
  opportunityId?: string | null;
}) {
  const response = await api.post<ApiEnvelope<CrmActivity>>(
    "/platform/crm/activities",
    input,
  );
  return unwrap(response.data);
}
export async function listCrmTasks(input: {
  status?: CrmTaskStatus;
  ownerUserId?: string;
  companyId?: string;
  contactId?: string;
  leadId?: string;
  opportunityId?: string;
  overdueOnly?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const response = await api.get<ApiEnvelope<CrmPage<CrmTask>>>(
    "/platform/crm/tasks",
    { params: input },
  );
  return unwrap(response.data);
}
export async function createCrmTask(input: {
  title: string;
  description: string | null;
  ownerUserId?: string | null;
  priority: CrmTaskPriority;
  dueAt: string | null;
  reminderAt: string | null;
  recurrenceRule: string | null;
  companyId?: string | null;
  contactId?: string | null;
  leadId?: string | null;
  opportunityId?: string | null;
}) {
  const response = await api.post<ApiEnvelope<CrmTask>>(
    "/platform/crm/tasks",
    input,
  );
  return unwrap(response.data);
}
export async function changeCrmTaskStatus(
  id: string,
  status: CrmTaskStatus,
  reason: string | null,
  version: number,
) {
  const response = await api.post<ApiEnvelope<CrmTask>>(
    `/platform/crm/tasks/${id}/status`,
    { status, reason, version },
  );
  return unwrap(response.data);
}
export async function getCrmDashboard() {
  const response = await api.get<ApiEnvelope<CrmDashboard>>(
    "/platform/crm/dashboard",
  );
  return unwrap(response.data);
}
export async function getCrmReports() {
  const response = await api.get<ApiEnvelope<CrmReports>>(
    "/platform/crm/reports",
  );
  return unwrap(response.data);
}
export async function searchCrm(query: string) {
  const response = await api.get<
    ApiEnvelope<
      Array<{
        recordType: CrmRecordType;
        id: string;
        title: string;
        subtitle: string | null;
        status: string;
        updatedAt: string;
      }>
    >
  >("/platform/crm/search", { params: { query } });
  return unwrap(response.data);
}

export async function listCrmDuplicates() {
  const response = await api.get<ApiEnvelope<CrmDuplicateGroup[]>>(
    "/platform/crm/administration/duplicates",
  );
  return unwrap(response.data);
}
export async function listCrmCustomFields(
  includeInactive = false,
  recordType?: CrmRecordType,
) {
  const response = await api.get<ApiEnvelope<CrmCustomFieldDefinition[]>>(
    "/platform/crm/administration/custom-fields",
    { params: { includeInactive, recordType } },
  );
  return unwrap(response.data);
}
export async function listCrmCustomFieldValues(recordId: string) {
  const response = await api.get<
    ApiEnvelope<
      Array<{
        definitionId: string;
        recordId: string;
        valueJson: string;
        version: number;
      }>
    >
  >(`/platform/crm/administration/custom-field-values/${recordId}`);
  return unwrap(response.data);
}
export async function setCrmCustomFieldValue(input: {
  definitionId: string;
  recordId: string;
  valueJson: string;
  version?: number;
}) {
  const response = await api.put<
    ApiEnvelope<{
      definitionId: string;
      recordId: string;
      valueJson: string;
      version: number;
    }>
  >("/platform/crm/administration/custom-field-values", input);
  return unwrap(response.data);
}
export async function listCrmSavedViews(recordType?: CrmRecordType) {
  const response = await api.get<ApiEnvelope<CrmSavedView[]>>(
    "/platform/crm/administration/saved-views",
    { params: { recordType } },
  );
  return unwrap(response.data);
}
export async function createCrmSavedView(input: {
  name: string;
  recordType: CrmRecordType;
  filterJson: string;
  isShared: boolean;
}) {
  const response = await api.post<ApiEnvelope<CrmSavedView>>(
    "/platform/crm/administration/saved-views",
    input,
  );
  return unwrap(response.data);
}
export async function createCrmCustomField(input: {
  name: string;
  recordType: CrmRecordType;
  dataType: CrmCustomFieldDataType;
  sensitivity: CrmFieldSensitivity;
  optionsJson: string | null;
  isRequired: boolean;
}) {
  const response = await api.post<ApiEnvelope<CrmCustomFieldDefinition>>(
    "/platform/crm/administration/custom-fields",
    input,
  );
  return unwrap(response.data);
}
export async function updateCrmCustomField(
  id: string,
  input: {
    name: string;
    recordType: CrmRecordType;
    dataType: CrmCustomFieldDataType;
    sensitivity: CrmFieldSensitivity;
    optionsJson: string | null;
    isRequired: boolean;
    version: number;
  },
) {
  const response = await api.put<ApiEnvelope<CrmCustomFieldDefinition>>(
    `/platform/crm/administration/custom-fields/${id}`,
    input,
  );
  return unwrap(response.data);
}
export async function changeCrmCustomFieldActive(
  id: string,
  action: "deactivate" | "reactivate",
  version: number,
) {
  const response = await api.post<ApiEnvelope<CrmCustomFieldDefinition>>(
    `/platform/crm/administration/custom-fields/${id}/${action}`,
    { version },
  );
  return unwrap(response.data);
}
export async function previewCrmImport(input: {
  recordType: CrmRecordType;
  idempotencyKey: string;
  fileName: string;
  rows: Array<{ values: Record<string, string | null> }>;
}) {
  const response = await api.post<ApiEnvelope<CrmImportPreview>>(
    "/platform/crm/administration/imports/preview",
    input,
  );
  return unwrap(response.data);
}
export async function commitCrmImport(batchId: string, version: number) {
  const response = await api.post<ApiEnvelope<CrmImportPreview>>(
    `/platform/crm/administration/imports/${batchId}/commit`,
    { version },
  );
  return unwrap(response.data);
}
export async function exportCrm(
  recordType: CrmRecordType,
  filter?: Record<string, string | boolean>,
) {
  const response = await api.post<Blob>(
    "/platform/crm/administration/exports",
    {
      recordType,
      filterJson: JSON.stringify(filter ?? { includeInactive: true }),
    },
    { responseType: "blob" },
  );
  return response.data;
}
export async function listCrmHandoffs(companyId: string) {
  const response = await api.get<ApiEnvelope<CrmHandoff[]>>(
    `/platform/crm/companies/${companyId}/handoffs`,
  );
  return unwrap(response.data);
}
export async function listCrmOrderHandoffs() {
  const response = await api.get<ApiEnvelope<CrmOrderHandoff[]>>(
    "/platform/crm/order-handoffs",
  );
  return unwrap(response.data);
}
export async function createCrmHandoff(
  companyId: string,
  input: {
    type: CrmHandoffType;
    opportunityId?: string | null;
    idempotencyKey: string;
    requestedOrganizationKind?: string | null;
    requestedServices: string[];
    summary: string;
    internalNotes?: string | null;
  },
) {
  const response = await api.post<ApiEnvelope<CrmHandoff>>(
    `/platform/crm/companies/${companyId}/handoffs`,
    input,
  );
  return unwrap(response.data);
}
function unwrap<T>(envelope: ApiEnvelope<T>) {
  if (!envelope.success || !envelope.data) {
    throw new Error(
      envelope.error?.message ?? "The request could not be completed.",
    );
  }
  return envelope.data;
}
