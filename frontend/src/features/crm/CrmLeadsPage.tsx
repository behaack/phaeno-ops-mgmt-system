import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import {
  apiErrorMessage,
  createCrmLead,
  listCrmLeads,
  type CrmLeadInput,
  type CrmLeadStatus,
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
import { Label } from "#/components/ui/label";
import { CrmLeadDialog } from "./CrmLeadDialog";
import { CrmSavedViewBar } from "./CrmSavedViewBar";

export function CrmLeadsPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<CrmLeadStatus | "">("");
  const query = useQuery({
    queryKey: ["crm-leads", status],
    queryFn: () => listCrmLeads({ status: status || undefined, pageSize: 100 }),
  });
  const create = useMutation({
    mutationFn: (input: CrmLeadInput) => createCrmLead(input),
    onSuccess: async (lead) => {
      setOpen(false);
      await client.invalidateQueries({ queryKey: ["crm-leads"] });
      await navigate({ to: "/crm/leads/$leadId", params: { leadId: lead.id } });
    },
  });
  return (
    <main className="page-wrap space-y-6 px-4 py-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="secondary" className="mb-3">
            Qualification
          </Badge>
          <h1 className="text-3xl font-semibold">Leads</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Triage commercial signals, record qualification reasoning, and
            convert only when durable records are warranted.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus data-icon="inline-start" />
          New lead
        </Button>
      </section>
      {query.error ? (
        <Alert variant="destructive">
          <AlertDescription>{apiErrorMessage(query.error)}</AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Lead queue</CardTitle>
          <CardDescription>
            Every status change retains the reason and actor in the CRM
            timeline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid max-w-xs gap-1.5">
            <Label htmlFor="lead-status">Status</Label>
            <select
              id="lead-status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as CrmLeadStatus | "")
              }
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All statuses</option>
              {["New", "Working", "Qualified", "Disqualified", "Converted"].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
          </div>
          <CrmSavedViewBar
            recordType="Lead"
            currentFilter={{ status }}
            onApply={(filter) =>
              setStatus(isLeadStatus(filter.status) ? filter.status : "")
            }
          />
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Next action</th>
                  <th className="px-4 py-3">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(query.data?.items ?? []).map((lead) => (
                  <tr key={lead.id}>
                    <td className="px-4 py-3 font-medium">
                      <Link
                        to="/crm/leads/$leadId"
                        params={{ leadId: lead.id }}
                        className="hover:underline"
                      >
                        {lead.displayName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lead.companyName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lead.source ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          lead.status === "Disqualified"
                            ? "outline"
                            : "secondary"
                        }
                      >
                        {lead.status}
                      </Badge>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
                      {lead.nextAction ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lead.ownerName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!query.isLoading && !(query.data?.items.length ?? 0) ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No leads match this view.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <CrmLeadDialog
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

function isLeadStatus(value: unknown): value is CrmLeadStatus {
  return ["New", "Working", "Qualified", "Disqualified", "Converted"].includes(
    String(value),
  );
}
