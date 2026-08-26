import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { List, Plus, Rows3 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  apiErrorMessage,
  createCrmOpportunity,
  listCrmCompanies,
  listCrmOpportunities,
  listCrmPipelines,
  type CrmOpportunityInput,
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
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { CrmOpportunityDialog } from "./CrmOpportunityDialog";
import { CrmSavedViewBar } from "./CrmSavedViewBar";

export function CrmOpportunitiesPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [board, setBoard] = useState(true);
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [pipelineId, setPipelineId] = useState("");
  const [stageId, setStageId] = useState("");
  const opportunities = useQuery({
    queryKey: ["crm-opportunities", search, pipelineId, stageId],
    queryFn: () =>
      listCrmOpportunities({
        search,
        pipelineId: pipelineId || undefined,
        stageId: stageId || undefined,
        pageSize: 100,
      }),
    enabled: Boolean(pipelineId),
  });
  const pipelines = useQuery({
    queryKey: ["crm-pipelines"],
    queryFn: () => listCrmPipelines(),
  });
  const companies = useQuery({
    queryKey: ["crm-companies", "choices"],
    queryFn: () => listCrmCompanies({ pageSize: 100 }),
  });
  useEffect(() => {
    if (!pipelineId && pipelines.data?.length) {
      setPipelineId(
        pipelines.data.find((value) => value.isDefault)?.id ??
          pipelines.data[0].id,
      );
    }
  }, [pipelineId, pipelines.data]);
  const create = useMutation({
    mutationFn: (input: CrmOpportunityInput) => createCrmOpportunity(input),
    onSuccess: async (value) => {
      setOpen(false);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["crm-opportunities"] }),
        client.invalidateQueries({ queryKey: ["crm-dashboard"] }),
      ]);
      await navigate({
        to: "/crm/opportunities/$opportunityId",
        params: { opportunityId: value.id },
      });
    },
  });
  const records = opportunities.data?.items ?? [];
  const stages =
    pipelines.data
      ?.filter((pipeline) => !pipelineId || pipeline.id === pipelineId)
      .flatMap((pipeline) =>
        pipeline.stages.filter((stage) => stage.isActive),
      ) ?? [];
  return (
    <main className="page-wrap space-y-6 px-4 py-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="secondary" className="mb-3">
            Sales pipeline
          </Badge>
          <h1 className="text-3xl font-semibold">Opportunities</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Forecast value and make every stage transition durable and
            reviewable.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBoard((value) => !value)}>
            {board ? (
              <List data-icon="inline-start" />
            ) : (
              <Rows3 data-icon="inline-start" />
            )}
            {board ? "Table view" : "Board view"}
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus data-icon="inline-start" />
            New opportunity
          </Button>
        </div>
      </section>
      {opportunities.error || pipelines.error || companies.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {apiErrorMessage(
              opportunities.error ?? pipelines.error ?? companies.error,
            )}
          </AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Opportunity view</CardTitle>
          <CardDescription>
            Search and focus the board or table on one pipeline and stage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            role="search"
            className="grid gap-3 sm:grid-cols-[minmax(12rem,1fr)_minmax(10rem,auto)_minmax(10rem,auto)_auto] sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(draftSearch.trim());
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="opportunity-search">Search opportunities</Label>
              <Input
                id="opportunity-search"
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="opportunity-pipeline-filter">Pipeline</Label>
              <select
                id="opportunity-pipeline-filter"
                value={pipelineId}
                onChange={(event) => {
                  setPipelineId(event.target.value);
                  setStageId("");
                }}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                {(pipelines.data ?? [])
                  .filter((value) => value.isActive)
                  .map((pipeline) => (
                    <option key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="opportunity-stage-filter">Stage</Label>
              <select
                id="opportunity-stage-filter"
                value={stageId}
                onChange={(event) => setStageId(event.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">All stages</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
          <CrmSavedViewBar
            recordType="Opportunity"
            currentFilter={{ search, pipelineId, stageId, board }}
            onApply={(filter) => {
              const nextSearch =
                typeof filter.search === "string" ? filter.search : "";
              setDraftSearch(nextSearch);
              setSearch(nextSearch);
              setPipelineId(
                typeof filter.pipelineId === "string" ? filter.pipelineId : "",
              );
              setStageId(
                typeof filter.stageId === "string" ? filter.stageId : "",
              );
              setBoard(filter.board !== false);
            }}
          />
        </CardContent>
      </Card>
      {board ? (
        <div className="grid auto-cols-[minmax(17rem,1fr)] grid-flow-col gap-4 overflow-x-auto pb-3">
          {stages.map((stage) => (
            <section key={stage.id} className="rounded-lg border bg-muted/20">
              <header className="flex justify-between border-b p-3">
                <h2 className="font-semibold">{stage.name}</h2>
                <Badge variant="outline">
                  {records.filter((value) => value.stageId === stage.id).length}
                </Badge>
              </header>
              <div className="space-y-3 p-3">
                {records
                  .filter((value) => value.stageId === stage.id)
                  .map((value) => (
                    <OpportunityCard key={value.id} value={value} />
                  ))}
                {!records.some((value) => value.stageId === stage.id) ? (
                  <p className="py-5 text-center text-xs text-muted-foreground">
                    No opportunities
                  </p>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Opportunity directory</CardTitle>
            <CardDescription>
              All open and closed commercial work.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="p-3">Opportunity</th>
                    <th className="p-3">Company</th>
                    <th className="p-3">Stage</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Close</th>
                    <th className="p-3">Owner</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {records.map((value) => (
                    <tr key={value.id}>
                      <td className="p-3 font-medium">
                        <Link
                          to="/crm/opportunities/$opportunityId"
                          params={{ opportunityId: value.id }}
                          className="hover:underline"
                        >
                          {value.name}
                        </Link>
                      </td>
                      <td className="p-3">{value.companyName}</td>
                      <td className="p-3">{value.stageName}</td>
                      <td className="p-3">{money(value)}</td>
                      <td className="p-3">{value.expectedCloseDate ?? "—"}</td>
                      <td className="p-3">{value.ownerName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      <CrmOpportunityDialog
        open={open}
        companies={companies.data?.items ?? []}
        pipelines={pipelines.data ?? []}
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
function OpportunityCard({
  value,
}: {
  value: Awaited<ReturnType<typeof listCrmOpportunities>>["items"][number];
}) {
  return (
    <Link
      to="/crm/opportunities/$opportunityId"
      params={{ opportunityId: value.id }}
      className="block rounded-lg border bg-card p-3 shadow-sm hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <p className="font-medium">{value.name}</p>
      <p className="mt-1 text-xs text-muted-foreground">{value.companyName}</p>
      <div className="mt-3 flex justify-between text-xs">
        <span>{money(value)}</span>
        <span>{value.probability}%</span>
      </div>
    </Link>
  );
}
function money(value: { amount: number | null; currency: string }) {
  return value.amount == null
    ? "—"
    : new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: value.currency,
        maximumFractionDigits: 0,
      }).format(value.amount);
}
