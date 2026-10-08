import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import {
  addCrmOpportunityContact,
  listCrmOpportunityContacts,
  removeCrmOpportunityContact,
  updateCrmOpportunityContact,
  type CrmOpportunityContact,
} from "#/api/crm";
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
import { CrmCollectionFeedback } from "./CrmCollectionFeedback";
import { CrmOpportunityContactDialog } from "./CrmOpportunityContactDialog";

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
  const activeContactIds = records.filter((value) => value.isActive).map((value) => value.contactId);
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Opportunity contacts</CardTitle>
          <CardDescription>
            Buying-team members and their role in this Opportunity.
          </CardDescription>
          <CardAction>
            <Button size="sm" variant="outline" disabled={associations.isPending || associations.isError} onClick={() => setAddOpen(true)}>
              <Plus data-icon="inline-start" />
              Associate
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-2">
          <CrmCollectionFeedback name="Opportunity contacts" query={associations} />
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
                    disabled={associations.isError}
                    onClick={() => setManaging(association)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {associations.isSuccess && records.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No contacts associated with this Opportunity.
            </p>
          ) : null}
        </CardContent>
      </Card>
      {addOpen ? <CrmOpportunityContactDialog
        excludedIds={activeContactIds}
        pending={add.isPending}
        error={add.error}
        onClose={() => { setAddOpen(false); add.reset(); }}
        onSubmit={(input) => add.mutate(input)}
      /> : null}
      {managing ? (
        <CrmOpportunityContactDialog
          association={managing}
          pending={update.isPending || remove.isPending}
          error={update.error ?? remove.error}
          onClose={() => {
            setManaging(null);
            update.reset();
            remove.reset();
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
