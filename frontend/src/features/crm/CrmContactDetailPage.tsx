import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Combine, Pencil, Plus, Power, PowerOff } from "lucide-react";
import { useState } from "react";

import {
  apiErrorMessage,
  associateCompanyContact,
  getCrmContact,
  listContactCompanies,
  listCrmContacts,
  mergeCrmContact,
  setCrmContactActive,
  updateCompanyContact,
  updateCrmContact,
  type CrmCompanyContact,
  type CrmContact,
  type CrmContactInput,
} from "#/api/crm";
import { Alert, AlertDescription } from "#/components/ui/alert";
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
import { CrmAssociationRecordCombobox } from "./CrmAssociationRecordCombobox";
import { CrmCompanyContactEditDialog } from "./CrmCompanyContactEditDialog";
import { CrmContactDialog } from "./CrmContactDialog";
import { CrmCustomFields } from "./CrmCustomFields";
import { CrmMergeDialog } from "./CrmMergeDialog";
import { CrmRecordWork } from "./CrmRecordWork";
import { CrmRelationshipRoleSelect } from "./CrmRelationshipRoleSelect";

export function CrmContactDetailPage({ contactId }: { contactId: string }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [associateOpen, setAssociateOpen] = useState(false);
  const [managingAssociation, setManagingAssociation] =
    useState<CrmCompanyContact | null>(null);
  const query = useQuery({
    queryKey: ["crm-contact", contactId],
    queryFn: () => getCrmContact(contactId),
  });
  const companies = useQuery({
    queryKey: ["crm-contact-companies", contactId],
    queryFn: () => listContactCompanies(contactId),
  });
  const mergeCandidates = useQuery({
    queryKey: ["crm-contacts", "merge-choices"],
    queryFn: () => listCrmContacts({ pageSize: 100 }),
    enabled: mergeOpen,
  });
  const edit = useMutation({
    mutationFn: (input: CrmContactInput) =>
      updateCrmContact(contactId, {
        ...input,
        version: query.data?.version ?? 0,
      }),
    onSuccess: async (contact) => {
      client.setQueryData(["crm-contact", contactId], contact);
      setEditOpen(false);
      await client.invalidateQueries({ queryKey: ["crm-contacts"] });
    },
  });
  const lifecycle = useMutation({
    mutationFn: () =>
      setCrmContactActive(
        contactId,
        !query.data?.isActive,
        query.data?.version ?? 0,
      ),
    onSuccess: async (contact) => {
      client.setQueryData(["crm-contact", contactId], contact);
      await client.invalidateQueries({ queryKey: ["crm-contacts"] });
    },
  });
  const merge = useMutation({
    mutationFn: ({ targetId, reason }: { targetId: string; reason: string }) =>
      mergeCrmContact(contactId, targetId, reason, query.data?.version ?? 0),
    onSuccess: async (target) => {
      setMergeOpen(false);
      await client.invalidateQueries({ queryKey: ["crm-contacts"] });
      await navigate({
        to: "/crm/contacts/$contactId",
        params: { contactId: target.id },
      });
    },
  });
  const associate = useMutation({
    mutationFn: ({
      companyId,
      jobTitle,
      relationshipRole,
      isPrimaryCompany,
      effectiveFrom,
    }: {
      companyId: string;
      jobTitle: string | null;
      relationshipRole: string | null;
      isPrimaryCompany: boolean;
      effectiveFrom: string;
    }) =>
      associateCompanyContact(companyId, {
        contactId,
        jobTitle,
        relationshipRole,
        isPrimaryCompany,
        effectiveFrom,
      }),
    onSuccess: async (_, input) => {
      setAssociateOpen(false);
      await Promise.all([
        client.invalidateQueries({
          queryKey: ["crm-contact-companies", contactId],
        }),
        client.invalidateQueries({
          queryKey: ["crm-company-contacts", input.companyId],
        }),
        client.invalidateQueries({ queryKey: ["crm-contact", contactId] }),
        client.invalidateQueries({ queryKey: ["crm-contacts"] }),
      ]);
    },
  });
  const updateAssociation = useMutation({
    mutationFn: ({
      association,
      input,
    }: {
      association: CrmCompanyContact;
      input: Parameters<typeof updateCompanyContact>[2];
    }) => updateCompanyContact(association.companyId, association.id, input),
    onSuccess: async (_, variables) => {
      setManagingAssociation(null);
      await Promise.all([
        client.invalidateQueries({
          queryKey: ["crm-contact-companies", contactId],
        }),
        client.invalidateQueries({
          queryKey: ["crm-company-contacts", variables.association.companyId],
        }),
        client.invalidateQueries({ queryKey: ["crm-contact", contactId] }),
        client.invalidateQueries({ queryKey: ["crm-contacts"] }),
      ]);
    },
  });
  const contact = query.data;
  if (!contact)
    return (
      <main className="page-wrap px-4 py-8">
        <p role="status" className="text-sm text-muted-foreground">
          {query.isLoading
            ? "Loading contact…"
            : "The contact could not be loaded."}
        </p>
      </main>
    );
  return (
    <main className="page-wrap space-y-6 px-4 py-8">
      <Button asChild variant="ghost" size="sm">
        <Link to="/crm/contacts">
          <ArrowLeft data-icon="inline-start" />
          Back to contacts
        </Link>
      </Button>
      <section className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div>
          <div className="mb-3 flex gap-2">
            <Badge variant="secondary">CRM contact</Badge>
            <Badge variant={contact.isActive ? "outline" : "destructive"}>
              {contact.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <h1 className="text-3xl font-semibold">{contact.displayName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {primaryPosition(contact)} · owned by {contact.ownerName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil data-icon="inline-start" />
            Edit
          </Button>
          <Button variant="outline" onClick={() => setMergeOpen(true)}>
            <Combine data-icon="inline-start" />
            Merge
          </Button>
          <Button
            variant={contact.isActive ? "destructive" : "outline"}
            disabled={lifecycle.isPending}
            onClick={() => lifecycle.mutate()}
          >
            {contact.isActive ? (
              <PowerOff data-icon="inline-start" />
            ) : (
              <Power data-icon="inline-start" />
            )}
            {contact.isActive ? "Deactivate" : "Reactivate"}
          </Button>
        </div>
      </section>
      {edit.error || lifecycle.error || merge.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {apiErrorMessage(edit.error ?? lifecycle.error ?? merge.error)}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Info label="Email" value={contact.email ?? "Not recorded"} />
              <Info label="Phone" value={contact.phone ?? "Not recorded"} />
              <Info
                label="Communication preference"
                value={spaced(contact.communicationPreference)}
              />
              <Info
                label="Lawful basis"
                value={contact.lawfulContactBasis ?? "Not recorded"}
              />
              <Info
                label="Communication notes"
                value={contact.communicationNotes ?? "No notes"}
                wide
              />
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Company relationships</CardTitle>
            <CardDescription>
              Effective associations are preserved when people move between
              organizations.
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
          <CardContent className="space-y-3">
            {(companies.data ?? []).map((company) => (
              <div
                key={company.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <Link
                  to="/crm/companies/$companyId"
                  params={{ companyId: company.companyId }}
                  className="min-w-0 hover:underline"
                >
                  <span className="block font-medium">{company.companyName}</span>
                  <span className="block text-xs text-muted-foreground">
                    {company.jobTitle ?? "Job title not recorded"} ·{" "}
                    {company.relationshipRole ?? "Role not recorded"}
                  </span>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  {company.isPrimaryCompany ? <Badge>Primary</Badge> : null}
                  {!company.isActive ? (
                    <Badge variant="outline">Ended</Badge>
                  ) : null}
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit ${company.companyName} relationship`}
                    onClick={() => setManagingAssociation(company)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
            {!companies.isLoading && !(companies.data?.length ?? 0) ? (
              <p className="text-sm text-muted-foreground">
                No Company association has been recorded.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <CrmCustomFields recordType="Contact" recordId={contactId} />
      <CrmRecordWork links={{ contactId }} />
      {associateOpen ? (
        <ContactCompanyAssociationDialog
          excludedCompanyIds={(companies.data ?? [])
            .filter((company) => company.isActive)
            .map((company) => company.companyId)}
          pending={associate.isPending}
          error={associate.error}
          onOpenChange={(open) => {
            setAssociateOpen(open);
            if (!open) associate.reset();
          }}
          onSubmit={(input) => associate.mutate(input)}
        />
      ) : null}
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
              association: managingAssociation,
              input: { ...input, version: managingAssociation.version },
            })
          }
        />
      ) : null}
      <CrmContactDialog
        open={editOpen}
        contact={contact}
        pending={edit.isPending}
        error={edit.error ? apiErrorMessage(edit.error) : undefined}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) edit.reset();
        }}
        onSubmit={(input) => edit.mutate(input)}
      />
      <CrmMergeDialog
        open={mergeOpen}
        recordLabel="Contact"
        candidates={(mergeCandidates.data?.items ?? [])
          .filter((value) => value.id !== contactId && value.isActive)
          .map((value) => ({ id: value.id, name: value.displayName }))}
        pending={merge.isPending}
        error={merge.error ? apiErrorMessage(merge.error) : undefined}
        onOpenChange={setMergeOpen}
        onSubmit={(targetId, reason) => merge.mutate({ targetId, reason })}
      />
    </main>
  );
}
function ContactCompanyAssociationDialog({
  excludedCompanyIds,
  pending,
  error,
  onOpenChange,
  onSubmit,
}: {
  excludedCompanyIds: string[];
  pending: boolean;
  error: unknown;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: {
    companyId: string;
    jobTitle: string | null;
    relationshipRole: string | null;
    isPrimaryCompany: boolean;
    effectiveFrom: string;
  }) => void;
}) {
  const [primary, setPrimary] = useState(false);
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            onSubmit({
              companyId: String(data.get("companyId")),
              jobTitle: nullable(data, "jobTitle"),
              relationshipRole: nullable(data, "role"),
              isPrimaryCompany: primary,
              effectiveFrom: String(data.get("effectiveFrom")),
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Associate Company</DialogTitle>
            <DialogDescription>
              Connect this Contact to an existing Company with an
              effective-dated relationship.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{apiErrorMessage(error)}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="contact-company-association-company">
                Company *
              </Label>
              <CrmAssociationRecordCombobox
                id="contact-company-association-company"
                name="companyId"
                kind="company"
                excludedIds={excludedCompanyIds}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="contact-company-association-title">
                Job title
              </Label>
              <Input
                id="contact-company-association-title"
                name="jobTitle"
                maxLength={150}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="contact-company-association-role">
                Relationship role
              </Label>
              <CrmRelationshipRoleSelect id="contact-company-association-role" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="contact-company-association-date">
                Effective from *
              </Label>
              <Input
                id="contact-company-association-date"
                name="effectiveFrom"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="contact-company-association-primary"
                checked={primary}
                onCheckedChange={(checked) => setPrimary(checked === true)}
              />
              <Label
                htmlFor="contact-company-association-primary"
                className="cursor-pointer"
              >
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
            <Button
              type="submit"
              disabled={pending}
            >
              {pending ? "Associating…" : "Associate Company"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function Info({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm font-medium">{value}</dd>
    </div>
  );
}
function spaced(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2");
}
function primaryPosition(contact: CrmContact) {
  if (!contact.primaryCompanyName) return "No primary Company";
  return `${contact.primaryCompanyTitle ?? "Title not recorded"} at ${contact.primaryCompanyName}`;
}
function nullable(data: FormData, key: string) {
  const value = String(data.get(key) ?? "").trim();
  return value || null;
}
