import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Search } from "lucide-react";
import { useState } from "react";

import {
  apiErrorMessage,
  changeCrmTaskStatus,
  getCrmDashboard,
  searchCrm,
} from "#/api/crm";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";

export function CrmHomePage() {
  const client = useQueryClient();
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const dashboard = useQuery({
    queryKey: ["crm-dashboard"],
    queryFn: getCrmDashboard,
  });
  const results = useQuery({
    queryKey: ["crm-search", search],
    queryFn: () => searchCrm(search),
    enabled: search.length >= 2,
  });
  const complete = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      changeCrmTaskStatus(id, "Completed", null, version),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["crm-dashboard"] }),
        client.invalidateQueries({ queryKey: ["crm-tasks"] }),
      ]);
    },
  });

  const attention = dashboard.data?.attention;
  return (
    <main className="page-wrap space-y-6 px-4 py-8">
      <section>
        <Badge variant="secondary" className="mb-3">
          Phaeno CRM
        </Badge>
        <h1 className="text-3xl font-semibold">Commercial workspace</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
          Work leads, relationships, opportunities, and follow-up from one
          first-party system. Portal access and operational work remain
          separately reviewed.
        </p>
      </section>

      {dashboard.error || complete.error ? (
        <Alert variant="destructive">
          <AlertTitle>CRM could not complete that request</AlertTitle>
          <AlertDescription>
            {apiErrorMessage(dashboard.error ?? complete.error)}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Find anything</CardTitle>
          <CardDescription>
            Search across companies, contacts, leads, opportunities, and tasks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex gap-2"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(draftSearch.trim());
            }}
          >
            <div className="grid min-w-0 flex-1 gap-1.5">
              <Label htmlFor="crm-global-search">Search CRM</Label>
              <Input
                id="crm-global-search"
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
                placeholder="Name, email, company, opportunity, or task"
              />
            </div>
            <Button type="submit" variant="outline" className="mt-auto">
              <Search data-icon="inline-start" />
              Search
            </Button>
          </form>
          {search.length >= 2 ? (
            <div className="grid gap-2" aria-live="polite">
              {(results.data ?? []).map((result) => (
                <SearchResult
                  key={`${result.recordType}-${result.id}`}
                  result={result}
                />
              ))}
              {!results.isLoading && !(results.data?.length ?? 0) ? (
                <p className="text-sm text-muted-foreground">
                  No CRM records match this search.
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section aria-labelledby="crm-attention-title">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="size-5 text-amber-600" aria-hidden="true" />
          <h2 id="crm-attention-title" className="text-xl font-semibold">
            Needs attention
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric
            label="Overdue tasks"
            value={attention?.overdueTasks}
            to="/crm/tasks"
          />
          <Metric
            label="Due in 7 days"
            value={attention?.dueSoonTasks}
            to="/crm/tasks"
          />
          <Metric
            label="Leads needing next action"
            value={attention?.leadsNeedingNextAction}
            to="/crm/leads"
          />
          <Metric
            label="Stale opportunities"
            value={attention?.staleOpportunities}
            to="/crm/opportunities"
          />
          <Metric
            label="Data warnings"
            value={attention?.dataQualityWarnings}
            to="/crm/administration"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My next tasks</CardTitle>
            <CardDescription>
              Open follow-up assigned to you, ordered by due date.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(dashboard.data?.tasks ?? []).map((task) => (
              <div
                key={task.id}
                className="flex items-start justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{task.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {task.dueAt
                      ? `Due ${formatDate(task.dueAt)}`
                      : "No due date"}{" "}
                    · {task.priority}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={complete.isPending}
                  onClick={() =>
                    complete.mutate({ id: task.id, version: task.version })
                  }
                >
                  Complete
                </Button>
              </div>
            ))}
            {!dashboard.isLoading && !(dashboard.data?.tasks.length ?? 0) ? (
              <p className="text-sm text-muted-foreground">
                No open tasks are assigned to you.
              </p>
            ) : null}
            <Button asChild variant="ghost" size="sm">
              <Link to="/crm/tasks">
                All tasks
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recently changed opportunities</CardTitle>
            <CardDescription>
              Latest movement across every active pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(dashboard.data?.recentlyChangedOpportunities ?? []).map(
              (opportunity) => (
                <Link
                  key={opportunity.id}
                  to="/crm/opportunities/$opportunityId"
                  params={{ opportunityId: opportunity.id }}
                  className="block cursor-pointer rounded-lg border p-3 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <div className="flex justify-between gap-3">
                    <span className="font-medium">{opportunity.name}</span>
                    <Badge variant="outline">{opportunity.stageName}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {opportunity.companyName} ·{" "}
                    {formatMoney(opportunity.amount, opportunity.currency)}
                  </p>
                </Link>
              ),
            )}
            <Button asChild variant="ghost" size="sm">
              <Link to="/crm/opportunities">
                Pipeline
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  to,
}: {
  label: string;
  value?: number;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="cursor-pointer rounded-lg border bg-card p-4 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <p className="text-2xl font-semibold">{value ?? "—"}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </Link>
  );
}

function SearchResult({
  result,
}: {
  result: {
    recordType: string;
    id: string;
    title: string;
    subtitle: string | null;
    status: string;
  };
}) {
  const route =
    result.recordType === "Company"
      ? "/crm/companies/$companyId"
      : result.recordType === "Contact"
        ? "/crm/contacts/$contactId"
        : result.recordType === "Lead"
          ? "/crm/leads/$leadId"
          : result.recordType === "Opportunity"
            ? "/crm/opportunities/$opportunityId"
            : "/crm/tasks";
  const params =
    result.recordType === "Company"
      ? { companyId: result.id }
      : result.recordType === "Contact"
        ? { contactId: result.id }
        : result.recordType === "Lead"
          ? { leadId: result.id }
          : result.recordType === "Opportunity"
            ? { opportunityId: result.id }
            : {};
  return (
    <Link
      to={route}
      params={params}
      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50"
    >
      <span>
        <span className="font-medium">{result.title}</span>
        <span className="ml-2 text-xs text-muted-foreground">
          {result.subtitle}
        </span>
      </span>
      <Badge variant="outline">{result.status}</Badge>
    </Link>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}
function formatMoney(value: number | null, currency: string) {
  return value == null
    ? "Amount not recorded"
    : new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value);
}
