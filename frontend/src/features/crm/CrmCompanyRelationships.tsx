import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import {
  apiErrorMessage,
  associateCompanyContact,
  createCrmHandoff,
  listCompanyContacts,
  listCrmHandoffs,
  listCrmOpportunities,
  updateCompanyContact,
  type CrmCompanyContact,
  type CrmHandoffType,
} from "#/api/crm";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Checkbox } from "#/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { MultiSelect } from "#/components/ui/multi-select";
import { Textarea } from "#/components/ui/textarea";
import { CrmAssociationRecordCombobox } from "./CrmAssociationRecordCombobox";
import { CrmCompanyContactEditDialog } from "./CrmCompanyContactEditDialog";
import { CrmRelationshipRoleSelect } from "./CrmRelationshipRoleSelect";

export function CrmCompanyRelationships({
  companyId,
  view,
}: {
  companyId: string;
  view: "relationships" | "requests";
}) {
  const client = useQueryClient();
  const [associateOpen, setAssociateOpen] = useState(false);
  const [managingAssociation, setManagingAssociation] =
    useState<CrmCompanyContact | null>(null);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const contacts = useQuery({
    queryKey: ["crm-company-contacts", companyId],
    queryFn: () => listCompanyContacts(companyId),
    enabled: view === "relationships",
  });
  const opportunities = useQuery({
    queryKey: ["crm-company-opportunities", companyId],
    queryFn: () => listCrmOpportunities({ companyId, pageSize: 100 }),
  });
  const handoffs = useQuery({
    queryKey: ["crm-handoffs", companyId],
    queryFn: () => listCrmHandoffs(companyId),
    enabled: view === "requests",
  });
  const associate = useMutation({
    mutationFn: (input: {
      contactId: string;
      jobTitle: string | null;
      relationshipRole: string | null;
      isPrimaryCompany: boolean;
      effectiveFrom: string;
    }) => associateCompanyContact(companyId, input),
    onSuccess: async (_, input) => {
      setAssociateOpen(false);
      await Promise.all([
        client.invalidateQueries({
          queryKey: ["crm-company-contacts", companyId],
        }),
        client.invalidateQueries({
          queryKey: ["crm-contact", input.contactId],
        }),
        client.invalidateQueries({ queryKey: ["crm-contacts"] }),
      ]);
    },
  });
  const updateAssociation = useMutation({
    mutationFn: ({
      associationId,
      input,
    }: {
      associationId: string;
      input: Parameters<typeof updateCompanyContact>[2];
    }) => updateCompanyContact(companyId, associationId, input),
    onSuccess: async () => {
      const contactId = managingAssociation?.contactId;
      setManagingAssociation(null);
      await Promise.all([
        client.invalidateQueries({
          queryKey: ["crm-company-contacts", companyId],
        }),
        contactId
          ? client.invalidateQueries({ queryKey: ["crm-contact", contactId] })
          : Promise.resolve(),
        client.invalidateQueries({ queryKey: ["crm-contacts"] }),
      ]);
    },
  });
  const handoff = useMutation({
    mutationFn: (input: Parameters<typeof createCrmHandoff>[1]) =>
      createCrmHandoff(companyId, input),
    onSuccess: async () => {
      setHandoffOpen(false);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["crm-handoffs", companyId] }),
        client.invalidateQueries({ queryKey: ["crm-activities", companyId] }),
      ]);
    },
  });
  return (
    <>
      {view === "relationships" ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Contacts</CardTitle>
                <CardDescription>People connected to this Company.</CardDescription>
                <CardAction>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAssociateOpen(true)}
                  >
                    <Plus data-icon="inline-start" />
                    Associate
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-2">
                {(contacts.data ?? []).map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <Link
                      to="/crm/contacts/$contactId"
                      params={{ contactId: contact.contactId }}
                      className="min-w-0 hover:underline"
                    >
                      <span className="block font-medium">{contact.contactName}</span>
                      <span className="block text-xs text-muted-foreground">
                        {contact.jobTitle ?? "Job title not recorded"} ·{" "}
                        {contact.relationshipRole ?? "Role not recorded"}
                      </span>
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      {contact.isPrimaryCompany ? <Badge>Primary</Badge> : null}
                      {!contact.isActive ? <Badge variant="outline">Ended</Badge> : null}
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Edit ${contact.contactName} relationship`}
                        onClick={() => setManagingAssociation(contact)}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}
                {!contacts.isLoading && !(contacts.data?.length ?? 0) ? (
                  <p className="text-sm text-muted-foreground">
                    No contacts associated.
                  </p>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Opportunities</CardTitle>
                <CardDescription>Commercial work tied to this Company.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(opportunities.data?.items ?? []).map((value) => (
                  <Link
                    key={value.id}
                    to="/crm/opportunities/$opportunityId"
                    params={{ opportunityId: value.id }}
                    className="flex justify-between rounded-lg border p-3 hover:bg-muted/50"
                  >
                    <span className="font-medium">{value.name}</span>
                    <Badge variant="outline">{value.stageName}</Badge>
                  </Link>
                ))}
                {!opportunities.isLoading &&
                !(opportunities.data?.items.length ?? 0) ? (
                  <p className="text-sm text-muted-foreground">
                    No opportunities recorded.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>
          <AssociateDialog
            open={associateOpen}
            excludedContactIds={(contacts.data ?? [])
              .filter((contact) => contact.isActive)
              .map((contact) => contact.contactId)}
            pending={associate.isPending}
            error={associate.error}
            onOpenChange={setAssociateOpen}
            onSubmit={(input) => associate.mutate(input)}
          />
          {managingAssociation ? (
            <CrmCompanyContactEditDialog
              value={managingAssociation}
              pending={updateAssociation.isPending}
              error={updateAssociation.error}
              onOpenChange={(open) => {
                if (!open) {
                  setManagingAssociation(null);
                  updateAssociation.reset();
                }
              }}
              onSubmit={(input) =>
                updateAssociation.mutate({
                  associationId: managingAssociation.id,
                  input: { ...input, version: managingAssociation.version },
                })
              }
            />
          ) : null}
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Company requests</CardTitle>
              <CardDescription>
                Request online access, product or service changes, relationship
                changes, or reviewed work. Use the central Requests queue for
                decisions.
              </CardDescription>
              <CardAction>
                <Button size="sm" onClick={() => setHandoffOpen(true)}>
                  <ArrowRight data-icon="inline-start" />
                  Create request
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
              {(handoffs.data ?? []).map((value) => (
                <div key={value.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{requestTypeLabel(value.type)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {value.requestNumber} · {formatDate(value.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{spaced(value.status)}</Badge>
                      {value.type === "TrialProject" ? <Button asChild size="sm" variant="outline">{value.trialProjectId ? <Link to="/trial-projects/$trialId" params={{ trialId: value.trialProjectId }}>Open Trial</Link> : <Link to="/trial-projects">Start Trial</Link>}</Button> : null}
                      {value.status === "PendingReview" ? (
                        <Button asChild size="sm" variant="outline">
                          <Link to="/customers">
                            Review in Requests
                            <ArrowRight data-icon="inline-end" />
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {!handoffs.isLoading && !(handoffs.data?.length ?? 0) ? (
                <Alert>
                  <AlertTitle>No Company requests</AlertTitle>
                  <AlertDescription>
                    Create a request when this Company needs online access, a
                    product or service change, a relationship change, or
                    reviewed work.
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>
          <HandoffDialog
            open={handoffOpen}
            opportunities={opportunities.data?.items ?? []}
            pending={handoff.isPending}
            error={handoff.error}
            onOpenChange={setHandoffOpen}
            onSubmit={(input) => handoff.mutate(input)}
          />
        </>
      )}
    </>
  );
}
function AssociateDialog({
  open,
  excludedContactIds,
  pending,
  error,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  excludedContactIds: string[];
  pending: boolean;
  error: unknown;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: {
    contactId: string;
    jobTitle: string | null;
    relationshipRole: string | null;
    isPrimaryCompany: boolean;
    effectiveFrom: string;
  }) => void;
}) {
  const [primary, setPrimary] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            onSubmit({
              contactId: String(data.get("contactId")),
              jobTitle: nullable(data, "jobTitle"),
              relationshipRole: nullable(data, "role"),
              isPrimaryCompany: primary,
              effectiveFrom: String(data.get("effectiveFrom")),
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Associate contact</DialogTitle>
            <DialogDescription>
              Create an effective-dated Company relationship without duplicating
              the Contact.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{apiErrorMessage(error)}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4">
            <Field label="Contact *" id="association-contact">
              <CrmAssociationRecordCombobox
                id="association-contact"
                name="contactId"
                kind="contact"
                excludedIds={excludedContactIds}
                required
              />
            </Field>
            <Field label="Job title" id="association-title">
              <Input
                id="association-title"
                name="jobTitle"
                maxLength={150}
              />
            </Field>
            <Field label="Relationship role" id="association-role">
              <CrmRelationshipRoleSelect id="association-role" />
            </Field>
            <Field label="Effective from *" id="association-date">
              <Input
                id="association-date"
                name="effectiveFrom"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </Field>
            <div className="flex items-center gap-2">
              <Checkbox
                id="association-primary"
                checked={primary}
                onCheckedChange={(value) => setPrimary(value === true)}
              />
              <Label htmlFor="association-primary" className="cursor-pointer">
                Primary Company for this Contact
              </Label>
            </div>
          </div>
          <DialogFooter>
            <span className="mr-auto text-xs text-muted-foreground">
              * Required
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              Associate contact
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
type CompanyRequestCategory =
  | "OnlineAccess"
  | "ProductsAndServices"
  | "Work"
  | "Relationship";

const companyRequestCategories: ReadonlyArray<{
  value: CompanyRequestCategory;
  label: string;
  requestTypes: readonly CrmHandoffType[];
}> = [
  {
    value: "OnlineAccess",
    label: "Enable or change online access",
    requestTypes: ["PortalOnboarding", "PortalEvaluation", "Offboarding"],
  },
  {
    value: "ProductsAndServices",
    label: "Add or change products and services",
    requestTypes: ["ServiceChange"],
  },
  {
    value: "Work",
    label: "Start reviewed work",
    requestTypes: ["TrialProject", "CustomWork"],
  },
  {
    value: "Relationship",
    label: "Change the relationship",
    requestTypes: ["RelationshipChange"],
  },
];

const companyRequestTypeConfig: Record<
  CrmHandoffType,
  {
    category: CompanyRequestCategory;
    label: string;
    showRelationship: boolean;
    showOpportunity: boolean;
    showServices: boolean;
  }
> = {
  PortalOnboarding: {
    category: "OnlineAccess",
    label: "Onboarding",
    showRelationship: true,
    showOpportunity: false,
    showServices: false,
  },
  PortalEvaluation: {
    category: "OnlineAccess",
    label: "Evaluation",
    showRelationship: true,
    showOpportunity: true,
    showServices: false,
  },
  Offboarding: {
    category: "OnlineAccess",
    label: "Offboarding",
    showRelationship: false,
    showOpportunity: false,
    showServices: false,
  },
  ServiceChange: {
    category: "ProductsAndServices",
    label: "Service change",
    showRelationship: true,
    showOpportunity: false,
    showServices: true,
  },
  TrialProject: {
    category: "Work",
    label: "Trial Project",
    showRelationship: true,
    showOpportunity: true,
    showServices: false,
  },
  CustomWork: {
    category: "Work",
    label: "Custom work",
    showRelationship: true,
    showOpportunity: true,
    showServices: true,
  },
  RelationshipChange: {
    category: "Relationship",
    label: "Relationship change",
    showRelationship: true,
    showOpportunity: false,
    showServices: false,
  },
};

export function HandoffDialog({
  open,
  opportunities,
  pending,
  error,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  opportunities: Array<{ id: string; name: string }>;
  pending: boolean;
  error: unknown;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: {
    type: CrmHandoffType;
    opportunityId: string | null;
    idempotencyKey: string;
    requestedOrganizationKind: string | null;
    requestedServices: string[];
    summary: string;
    internalNotes: string | null;
  }) => void;
}) {
  const [type, setType] = useState<CrmHandoffType>("PortalOnboarding");
  const [requestedServices, setRequestedServices] = useState<string[]>([]);
  const config = companyRequestTypeConfig[type];
  const category = companyRequestCategories.find(
    (value) => value.value === config.category,
  )!;

  function changeRequestType(nextType: CrmHandoffType) {
    setType(nextType);
    if (!companyRequestTypeConfig[nextType].showServices) {
      setRequestedServices([]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            onSubmit({
              type,
              opportunityId: config.showOpportunity
                ? nullable(data, "opportunityId")
                : null,
              idempotencyKey: crypto.randomUUID(),
              requestedOrganizationKind: config.showRelationship
                ? nullable(data, "kind")
                : null,
              requestedServices: config.showServices ? requestedServices : [],
              summary:
                String(data.get("summary") ?? "").trim() ||
                `${config.label} request`,
              internalNotes: null,
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Create Company request</DialogTitle>
            <DialogDescription>
              Create one pending request for review. Nothing is enabled,
              changed, or started until the responsible workflow approves it.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{apiErrorMessage(error)}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4">
            <div
              className={
                category.requestTypes.length > 1
                  ? "grid gap-4 sm:grid-cols-2"
                  : "grid gap-4"
              }
            >
              <Field
                label="What does this Company need? *"
                id="handoff-category"
              >
                <select
                  id="handoff-category"
                  required
                  value={config.category}
                  onChange={(event) => {
                    const nextCategory = companyRequestCategories.find(
                      (value) => value.value === event.target.value,
                    );
                    if (nextCategory) {
                      changeRequestType(nextCategory.requestTypes[0]);
                    }
                  }}
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  {companyRequestCategories.map((value) => (
                    <option key={value.value} value={value.value}>
                      {value.label}
                    </option>
                  ))}
                </select>
              </Field>
              {category.requestTypes.length > 1 ? (
                <Field label="Request type *" id="handoff-type">
                  <select
                    id="handoff-type"
                    required
                    value={type}
                    onChange={(event) =>
                      changeRequestType(event.target.value as CrmHandoffType)
                    }
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  >
                    {category.requestTypes.map((value) => (
                      <option key={value} value={value}>
                        {companyRequestTypeConfig[value].label}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
            </div>
            {config.showRelationship ? (
              <Field label="Requested relationship *" id="handoff-kind">
                <select
                  id="handoff-kind"
                  name="kind"
                  required
                  defaultValue="Customer"
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option>Prospect</option>
                  <option>Customer</option>
                  <option>Partner</option>
                </select>
              </Field>
            ) : null}
            {config.showOpportunity ? (
              <Field
                label="Opportunity"
                id="handoff-opportunity"
                description="Link the request when it arose from a specific commercial pursuit. Customer order handoffs still begin from the Opportunity workspace."
              >
                <select
                  id="handoff-opportunity"
                  name="opportunityId"
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">No specific opportunity</option>
                  {opportunities.map((value) => (
                    <option key={value.id} value={value.id}>
                      {value.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            {config.showServices ? (
              <Field label="Requested products and services" id="handoff-services">
                <MultiSelect
                  id="handoff-services"
                  aria-label="Requested products and services"
                  options={[
                    { value: "PSeqLabService", label: "P-Seq Lab Service" },
                    { value: "PSeqKit", label: "P-Seq Kit" },
                  ]}
                  values={requestedServices}
                  onValuesChange={setRequestedServices}
                  placeholder="Select products and services"
                  emptyMessage="No matching products or services."
                />
              </Field>
            ) : null}
            <Field
              label="Summary"
              id="handoff-summary"
              description="Optional context for the reviewer."
            >
              <Textarea id="handoff-summary" name="summary" rows={3} />
            </Field>
          </div>
          <DialogFooter>
            <span className="mr-auto text-xs text-muted-foreground">
              * Required
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create pending request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  id,
  description,
  children,
}: {
  label: string;
  id: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
      {children}
    </div>
  );
}
function nullable(data: FormData, key: string) {
  const value = String(data.get(key) ?? "").trim();
  return value || null;
}
function spaced(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2");
}
function requestTypeLabel(value: CrmHandoffType) {
  return companyRequestTypeConfig[value].label;
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}
