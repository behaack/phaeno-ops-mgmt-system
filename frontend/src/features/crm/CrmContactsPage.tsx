import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useState } from "react";

import {
  apiErrorMessage,
  createCrmContact,
  listCrmContacts,
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
import { Checkbox } from "#/components/ui/checkbox";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { CrmContactDialog } from "./CrmContactDialog";
import { CrmSavedViewBar } from "./CrmSavedViewBar";

export function CrmContactsPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["crm-contacts", search, includeInactive],
    queryFn: () => listCrmContacts({ search, includeInactive, pageSize: 100 }),
  });
  const create = useMutation({
    mutationFn: (input: CrmContactInput) => createCrmContact(input),
    onSuccess: async (contact) => {
      setOpen(false);
      await client.invalidateQueries({ queryKey: ["crm-contacts"] });
      await navigate({
        to: "/crm/contacts/$contactId",
        params: { contactId: contact.id },
      });
    },
  });
  return (
    <main className="page-wrap space-y-6 px-4 py-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="secondary" className="mb-3">
            Relationships
          </Badge>
          <h1 className="text-3xl font-semibold">Contacts</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            People can be connected to one or more Companies without duplicating
            their identity.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus data-icon="inline-start" />
          New contact
        </Button>
      </section>
      {query.error ? (
        <Alert variant="destructive">
          <AlertDescription>{apiErrorMessage(query.error)}</AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Contact directory</CardTitle>
          <CardDescription>
            Search names, email addresses, and job titles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            role="search"
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(draft.trim());
            }}
          >
            <div className="grid min-w-0 flex-1 gap-1.5">
              <Label htmlFor="contact-search">Search contacts</Label>
              <Input
                id="contact-search"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
            </div>
            <Button className="mt-auto" type="submit" variant="outline">
              <Search data-icon="inline-start" />
              Search
            </Button>
            <div className="mt-auto flex h-9 items-center gap-2 rounded-md border px-3 text-sm">
              <Checkbox
                id="contact-include-inactive"
                checked={includeInactive}
                onCheckedChange={(value) => setIncludeInactive(value === true)}
              />
              <Label
                htmlFor="contact-include-inactive"
                className="cursor-pointer"
              >
                Include inactive
              </Label>
            </div>
          </form>
          <CrmSavedViewBar
            recordType="Contact"
            currentFilter={{ search, includeInactive }}
            onApply={(filter) => {
              const nextSearch =
                typeof filter.search === "string" ? filter.search : "";
              setDraft(nextSearch);
              setSearch(nextSearch);
              setIncludeInactive(filter.includeInactive === true);
            }}
          />
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Preference</th>
                  <th className="px-4 py-3">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(query.data?.items ?? []).map((contact) => (
                  <tr key={contact.id}>
                    <td className="px-4 py-3 font-medium">
                      <Link
                        to="/crm/contacts/$contactId"
                        params={{ contactId: contact.id }}
                        className="hover:underline"
                      >
                        {contact.displayName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {contact.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {contact.jobTitle ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          contact.communicationPreference === "DoNotContact" ||
                          contact.communicationPreference === "OptedOut"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {spaced(contact.communicationPreference)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {contact.ownerName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!query.isLoading && !(query.data?.items.length ?? 0) ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No contacts match this view.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <CrmContactDialog
        open={open}
        pending={create.isPending}
        error={create.error ? apiErrorMessage(create.error) : undefined}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) create.reset();
        }}
        onSubmit={(input) => create.mutate(input)}
      />
    </main>
  );
}
function spaced(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2");
}
