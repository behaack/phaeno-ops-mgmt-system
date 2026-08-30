import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Link2, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import {
  apiErrorMessage,
  associateCompanyContact,
  createCrmHandoff,
  listCompanyContacts,
  listCrmHandoffs,
  listCrmOpportunities,
  listCrmPortalLinks,
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
import { Textarea } from "#/components/ui/textarea";
import { CrmAssociationRecordCombobox } from "./CrmAssociationRecordCombobox";
import { CrmCompanyContactEditDialog } from "./CrmCompanyContactEditDialog";
import { CrmRelationshipRoleSelect } from "./CrmRelationshipRoleSelect";

export function CrmCompanyRelationships({ companyId }: { companyId: string }) {
  const client = useQueryClient();
  const [associateOpen, setAssociateOpen] = useState(false);
  const [managingAssociation, setManagingAssociation] =
    useState<CrmCompanyContact | null>(null);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const contacts = useQuery({
    queryKey: ["crm-company-contacts", companyId],
    queryFn: () => listCompanyContacts(companyId),
  });
  const opportunities = useQuery({
    queryKey: ["crm-company-opportunities", companyId],
    queryFn: () => listCrmOpportunities({ companyId, pageSize: 100 }),
  });
  const handoffs = useQuery({
    queryKey: ["crm-handoffs", companyId],
    queryFn: () => listCrmHandoffs(companyId),
  });
  const links = useQuery({
    queryKey: ["crm-portal-links", companyId],
    queryFn: () => listCrmPortalLinks(companyId),
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
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
            <CardDescription>
              People connected to this Company.
            </CardDescription>
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
                  {!contact.isActive ? (
                    <Badge variant="outline">Ended</Badge>
                  ) : null}
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
            <CardDescription>
              Commercial work tied to this Company.
            </CardDescription>
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
      <Card>
        <CardHeader>
          <CardTitle>Portal handoffs and account links</CardTitle>
          <CardDescription>
            A reviewed handoff is the only path from CRM context into Portal
            account, access, service, or work workflows.
          </CardDescription>
          <CardAction>
            <Button size="sm" onClick={() => setHandoffOpen(true)}>
              <ArrowRight data-icon="inline-start" />
              Create handoff
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          {(links.data ?? [])
            .filter((value) => value.isActive)
            .map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{link.organizationName}</p>
                  <p className="text-xs text-muted-foreground">
                    {link.organizationKind} Portal account · linked{" "}
                    {formatDate(link.linkedAt)}
                  </p>
                </div>
                <Link2
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
            ))}
          {(handoffs.data ?? []).map((value) => (
            <div key={value.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{spaced(value.type)}</p>
                <Badge variant="outline">{spaced(value.status)}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {value.requestNumber} · {formatDate(value.createdAt)}
              </p>
            </div>
          ))}
          {!handoffs.isLoading && !(handoffs.data?.length ?? 0) ? (
            <Alert>
              <AlertTitle>No Portal handoff created</AlertTitle>
              <AlertDescription>
                This CRM Company alone grants no Portal access, service
                entitlement, or operational work.
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
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
      <HandoffDialog
        open={handoffOpen}
        opportunities={opportunities.data?.items ?? []}
        pending={handoff.isPending}
        error={handoff.error}
        onOpenChange={setHandoffOpen}
        onSubmit={(input) => handoff.mutate(input)}
      />
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
function HandoffDialog({
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
  const [lab, setLab] = useState(false);
  const [kit, setKit] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            onSubmit({
              type,
              opportunityId: nullable(data, "opportunityId"),
              idempotencyKey: crypto.randomUUID(),
              requestedOrganizationKind: nullable(data, "kind"),
              requestedServices: [
                lab ? "PSeqLabService" : null,
                kit ? "PSeqKit" : null,
              ].filter(Boolean) as string[],
              summary: String(data.get("summary") ?? "").trim(),
              internalNotes: nullable(data, "notes"),
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Create reviewed Portal handoff</DialogTitle>
            <DialogDescription>
              This creates a pending relationship request. It does not grant
              access, activate services, or begin work.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{apiErrorMessage(error)}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Handoff type *" id="handoff-type">
                <select
                  id="handoff-type"
                  value={type}
                  onChange={(event) =>
                    setType(event.target.value as CrmHandoffType)
                  }
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  {[
                    "PortalOnboarding",
                    "PortalEvaluation",
                    "TrialProject",
                    "CustomWork",
                    "ServiceChange",
                    "RelationshipChange",
                    "Offboarding",
                  ].map((value) => (
                    <option key={value} value={value}>
                      {spaced(value)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Requested relationship" id="handoff-kind">
                <select
                  id="handoff-kind"
                  name="kind"
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">
                    Use linked account or workflow default
                  </option>
                  <option>Prospect</option>
                  <option>Customer</option>
                  <option>Partner</option>
                </select>
              </Field>
            </div>
            <Field label="Opportunity" id="handoff-opportunity">
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
            <fieldset className="rounded-lg border p-3">
              <legend className="px-1 text-sm font-medium">
                Requested services
              </legend>
              <div className="mt-2 flex gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="handoff-lab-service"
                    checked={lab}
                    onCheckedChange={(value) => setLab(value === true)}
                  />
                  <Label
                    htmlFor="handoff-lab-service"
                    className="cursor-pointer"
                  >
                    P-Seq Lab Service
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="handoff-pseq-kit"
                    checked={kit}
                    onCheckedChange={(value) => setKit(value === true)}
                  />
                  <Label htmlFor="handoff-pseq-kit" className="cursor-pointer">
                    P-Seq Kit
                  </Label>
                </div>
              </div>
            </fieldset>
            <Field label="Summary *" id="handoff-summary">
              <Textarea id="handoff-summary" name="summary" required rows={4} />
            </Field>
            <Field label="Internal notes" id="handoff-notes">
              <Textarea id="handoff-notes" name="notes" rows={3} />
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
              {pending ? "Creating…" : "Create pending handoff"}
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
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
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
function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}
