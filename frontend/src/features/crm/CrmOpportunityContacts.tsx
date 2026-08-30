import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import {
  addCrmOpportunityContact,
  apiErrorMessage,
  listCrmContacts,
  listCrmOpportunityContacts,
  removeCrmOpportunityContact,
  updateCrmOpportunityContact,
  type CrmOpportunityContact,
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

export function CrmOpportunityContacts({
  opportunityId,
}: {
  opportunityId: string;
}) {
  const client = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [managing, setManaging] = useState<CrmOpportunityContact | null>(null);
  const associations = useQuery({
    queryKey: ["crm-opportunity-contacts", opportunityId],
    queryFn: () => listCrmOpportunityContacts(opportunityId),
  });
  const contacts = useQuery({
    queryKey: ["crm-contacts", "choices"],
    queryFn: () => listCrmContacts({ pageSize: 100 }),
  });
  const refresh = () =>
    client.invalidateQueries({
      queryKey: ["crm-opportunity-contacts", opportunityId],
    });
  const add = useMutation({
    mutationFn: (input: {
      contactId: string;
      role: string | null;
      isPrimary: boolean;
    }) => addCrmOpportunityContact(opportunityId, input),
    onSuccess: async () => {
      setAddOpen(false);
      await refresh();
    },
  });
  const update = useMutation({
    mutationFn: ({
      association,
      role,
      isPrimary,
    }: {
      association: CrmOpportunityContact;
      role: string | null;
      isPrimary: boolean;
    }) =>
      updateCrmOpportunityContact(opportunityId, association.id, {
        role,
        isPrimary,
        version: association.version,
      }),
    onSuccess: async () => {
      setManaging(null);
      await refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (association: CrmOpportunityContact) =>
      removeCrmOpportunityContact(
        opportunityId,
        association.id,
        association.version,
      ),
    onSuccess: async () => {
      setManaging(null);
      await refresh();
    },
  });
  const records = associations.data ?? [];
  const activeContactIds = new Set(
    records.filter((value) => value.isActive).map((value) => value.contactId),
  );
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Opportunity contacts</CardTitle>
          <CardDescription>
            Buying-team members and their role in this Opportunity.
          </CardDescription>
          <CardAction>
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
              <Plus data-icon="inline-start" />
              Associate
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-2">
          {records.map((association) => (
            <div
              key={association.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <Link
                to="/crm/contacts/$contactId"
                params={{ contactId: association.contactId }}
                className="min-w-0 hover:underline"
              >
                <span className="font-medium">{association.contactName}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {association.role ?? "Role not recorded"}
                </span>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                {association.isPrimary ? <Badge>Primary</Badge> : null}
                {!association.isActive ? (
                  <Badge variant="outline">Removed</Badge>
                ) : null}
                {association.isActive ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Manage ${association.contactName} association`}
                    onClick={() => setManaging(association)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {!associations.isLoading && records.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No contacts associated with this Opportunity.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <ContactAssociationDialog
        open={addOpen}
        title="Associate Opportunity contact"
        description="Add a buying-team member without duplicating the Contact record."
        contacts={(contacts.data?.items ?? []).filter(
          (value) => !activeContactIds.has(value.id),
        )}
        pending={add.isPending}
        error={add.error}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) add.reset();
        }}
        onSubmit={(input) => add.mutate(input)}
      />
      {managing ? (
        <ContactAssociationDialog
          open
          title={`Manage ${managing.contactName}`}
          description="Update this person's role or remove them from the Opportunity."
          association={managing}
          pending={update.isPending || remove.isPending}
          error={update.error ?? remove.error}
          onOpenChange={(open) => {
            if (!open) {
              setManaging(null);
              update.reset();
              remove.reset();
            }
          }}
          onSubmit={(input) =>
            update.mutate({ association: managing, ...input })
          }
          onRemove={() => remove.mutate(managing)}
        />
      ) : null}
    </>
  );
}

function ContactAssociationDialog({
  open,
  title,
  description,
  contacts,
  association,
  pending,
  error,
  onOpenChange,
  onSubmit,
  onRemove,
}: {
  open: boolean;
  title: string;
  description: string;
  contacts?: Array<{ id: string; displayName: string; email: string | null }>;
  association?: CrmOpportunityContact;
  pending: boolean;
  error: unknown;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    contactId: string;
    role: string | null;
    isPrimary: boolean;
  }) => void;
  onRemove?: () => void;
}) {
  const [primary, setPrimary] = useState(association?.isPrimary ?? false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            onSubmit({
              contactId:
                association?.contactId ?? String(data.get("contactId")),
              role: nullable(data, "role"),
              isPrimary: primary,
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{apiErrorMessage(error)}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4">
            {!association ? (
              <div className="grid gap-1.5">
                <Label htmlFor="opportunity-contact">Contact *</Label>
                <select
                  id="opportunity-contact"
                  name="contactId"
                  required
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">Select contact</option>
                  {(contacts ?? []).map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.displayName}
                      {contact.email ? ` · ${contact.email}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="grid gap-1.5">
              <Label htmlFor="opportunity-contact-role">Role</Label>
              <Input
                id="opportunity-contact-role"
                name="role"
                defaultValue={association?.role ?? ""}
                placeholder="Decision maker, scientific lead, procurement…"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="opportunity-contact-primary"
                checked={primary}
                onCheckedChange={(checked) => setPrimary(checked === true)}
              />
              <Label
                htmlFor="opportunity-contact-primary"
                className="cursor-pointer"
              >
                Primary contact for this Opportunity
              </Label>
            </div>
          </div>
          <DialogFooter>
            {!association ? (
              <span className="mr-auto text-xs text-muted-foreground">
                * Required
              </span>
            ) : onRemove ? (
              <Button
                type="button"
                variant="destructive"
                className="mr-auto"
                disabled={pending}
                onClick={onRemove}
              >
                Remove association
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Saving…"
                : association
                  ? "Save changes"
                  : "Associate contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function nullable(data: FormData, key: string) {
  const value = String(data.get(key) ?? "").trim();
  return value || null;
}
