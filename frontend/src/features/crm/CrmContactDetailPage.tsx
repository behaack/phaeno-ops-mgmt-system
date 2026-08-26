import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Combine, Pencil, Power, PowerOff } from "lucide-react";
import { useState } from "react";

import {
  apiErrorMessage,
  getCrmContact,
  listContactCompanies,
  listCrmContacts,
  mergeCrmContact,
  setCrmContactActive,
  updateCrmContact,
  type CrmContactInput,
} from "#/api/crm";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { CrmContactDialog } from "./CrmContactDialog";
import { CrmCustomFields } from "./CrmCustomFields";
import { CrmRecordWork } from "./CrmRecordWork";
import { CrmMergeDialog } from "./CrmMergeDialog";

export function CrmContactDetailPage({ contactId }: { contactId: string }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
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
            {contact.jobTitle ?? "Title not recorded"} · owned by{" "}
            {contact.ownerName}
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
      <div className="grid gap-6 lg:grid-cols-2">
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
          </CardHeader>
          <CardContent className="space-y-3">
            {(companies.data ?? []).map((company) => (
              <Link
                key={company.id}
                to="/crm/companies/$companyId"
                params={{ companyId: company.companyId }}
                className="block rounded-lg border p-3 hover:bg-muted/50"
              >
                <div className="flex justify-between">
                  <span className="font-medium">{company.companyName}</span>
                  {company.isPrimaryCompany ? <Badge>Primary</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {company.relationshipRole ?? "Relationship role not recorded"}{" "}
                  · from {company.effectiveFrom}
                </p>
              </Link>
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
