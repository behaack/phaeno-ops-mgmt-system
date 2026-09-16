import { CrmClearFilters, useCrmState, useCrmSearch, CrmListPagination } from "./CrmListNavigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import {
  apiErrorMessage,
  createCrmOpportunity,
  listCrmCompanies,
  listCrmOpportunities,
  getCrmOpportunityStageSummary,
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
import { CrmOpportunityStageSummary, formatOpportunityAmount } from "./CrmOpportunityStageSummary";

export function CrmOpportunitiesPage() {
  const [page, setPage] = useCrmState<number>("page", 1);
  const navigate = useNavigate();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draftSearch, setDraftSearch, search, setSearch] = useCrmSearch();
  const [pipelineId] = useCrmState<string>("pipelineId", "");
  const [stageId, setStageId] = useCrmState<string>("stageId", "");
  const [stale, setStale] = useCrmState<boolean>('stale', false);
  const pipelines = useQuery({
    queryKey: ["crm-pipelines"],
    queryFn: () => listCrmPipelines(),
  });
  const activePipelines = (pipelines.data ?? []).filter(value => value.isActive);
  const showPipelineFilter = activePipelines.length > 1;
  const defaultPipelineId = activePipelines.find(value => value.isDefault)?.id ?? activePipelines[0]?.id ?? "";
  const allPipelines = showPipelineFilter && (pipelineId === "all" || (!pipelineId && stale));
  const selectedPipelineId = allPipelines ? "" : activePipelines.length === 1 ? activePipelines[0].id : pipelineId && pipelineId !== "all" ? pipelineId : defaultPipelineId;
  const selectedStageId = allPipelines || pipelineId === "all" ? "" : stageId;
  const opportunities = useQuery({
    queryKey: ["crm-opportunities", search, selectedPipelineId, selectedStageId, stale, page],
    queryFn: () => listCrmOpportunities({
      search,
      pipelineId: selectedPipelineId || undefined,
      stageId: selectedStageId || undefined,
      staleOnly: stale,
      page, pageSize: 25,
    }),
    enabled: pipelines.isSuccess && (allPipelines || Boolean(selectedPipelineId)),
  });
  const summary = useQuery({
    queryKey: ["crm-opportunities", "stage-summary", search, selectedPipelineId, stale],
    queryFn: () => getCrmOpportunityStageSummary({ search, pipelineId: selectedPipelineId, staleOnly: stale }),
    enabled: pipelines.isSuccess && !allPipelines && Boolean(selectedPipelineId),
  });
  const companies = useQuery({
    queryKey: ["crm-companies", "choices"],
    queryFn: () => listCrmCompanies({ pageSize: 100 }),
  });
  useEffect(() => {
    if (!pipelines.isSuccess || !defaultPipelineId) return;
    const nextPipelineId = allPipelines ? "all" : selectedPipelineId;
    if (pipelineId !== nextPipelineId || (allPipelines && stageId)) {
      void navigate({ to: ".", search: previous => ({
        ...previous, pipelineId: nextPipelineId,
        stageId: allPipelines || (pipelineId && pipelineId !== nextPipelineId) ? "" : stageId,
        page: 1,
      }), replace: true, resetScroll: false });
    }
  }, [allPipelines, defaultPipelineId, navigate, pipelineId, pipelines.isSuccess, selectedPipelineId, stageId]);
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
            Search and filter the opportunity queue by pipeline and stage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            role="search"
            className={showPipelineFilter
              ? "grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,auto)_auto]"
              : "grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3"}
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(draftSearch.trim());
            }}
          >
            <div className={showPipelineFilter ? "col-span-2 grid min-w-0 gap-1.5 sm:col-span-1" : "grid min-w-0 gap-1.5"}>
              <Label htmlFor="opportunity-search">Search opportunities</Label>
              <Input
                id="opportunity-search"
                className="min-w-0"
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
                placeholder="Opportunity number, name, Company, or product"
              />
            </div>
            {showPipelineFilter ? <div className="grid gap-1.5">
              <Label htmlFor="opportunity-pipeline-filter">Pipeline</Label>
              <select
                id="opportunity-pipeline-filter"
                value={allPipelines ? "all" : selectedPipelineId}
                onChange={(event) => {
                  const nextPipelineId = event.target.value;
                  void navigate({ to: ".", search: previous => ({ ...previous, pipelineId: nextPipelineId, stageId: "", page: 1 }), replace: true, resetScroll: false });
                }}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="all">All pipelines</option>
                {activePipelines.map((pipeline) => (
                    <option key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </option>
                  ))}
              </select>
            </div> : null}
            <CrmClearFilters ignoreStageSelection keepVisible label="Clear filter" />
          </form>
          <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={stale} onChange={event => setStale(event.target.checked)} />Open opportunities unchanged for 30 days</label>
          <CrmSavedViewBar
            recordType="Opportunity"
            currentFilter={{ search, pipelineId: selectedPipelineId, stageId: selectedStageId, stale }}
            onApply={(filter) => {
              const nextSearch = typeof filter.search === "string" ? filter.search : "";
              const nextPipelineId = typeof filter.pipelineId === "string" && filter.pipelineId
                ? filter.pipelineId : showPipelineFilter ? "all" : defaultPipelineId;
              setDraftSearch(nextSearch);
              void navigate({ to: ".", search: previous => ({
                ...previous, search: nextSearch, stale: filter.stale === true,
                pipelineId: nextPipelineId,
                stageId: nextPipelineId === "all" ? "" : typeof filter.stageId === "string" ? filter.stageId : "",
                page: 1,
              }), replace: true, resetScroll: false });
            }}
          />
        </CardContent>
      </Card>
      <section aria-label="Pipeline summary" aria-busy={allPipelines ? opportunities.isFetching : summary.isFetching} className="space-y-2">
        <h2 className="text-lg font-semibold">Pipeline summary</h2>
        <p className="text-sm text-muted-foreground">{allPipelines
          ? "All opportunities matching the search and stale-work filters across all pipelines and queue pages."
          : "All opportunities matching the pipeline, search and stale-work filters. Select a stage to focus the queue."}</p>
        {allPipelines ? (
          opportunities.isError ? <Alert variant="destructive"><AlertDescription>Could not load the opportunity total. <Button variant="outline" size="sm" onClick={() => void opportunities.refetch()}>Retry total</Button></AlertDescription></Alert>
            : opportunities.data ? <dl className="rounded-lg border bg-card p-3">
              <dt className="text-sm font-medium">All opportunities</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{opportunities.data.totalCount.toLocaleString()}</dd>
            </dl> : <p role="status">Loading opportunity total…</p>
        ) : summary.isError ? <Alert variant="destructive"><AlertDescription>Could not load pipeline totals. <Button variant="outline" size="sm" onClick={() => void summary.refetch()}>Retry pipeline totals</Button></AlertDescription></Alert>
          : summary.data ? <CrmOpportunityStageSummary stages={summary.data} configuredStages={pipelines.data?.flatMap(pipeline => pipeline.stages)} selectedStageId={selectedStageId} showPipeline={false} onSelect={setStageId} />
          : summary.isLoading || pipelines.isLoading ? <p role="status">Loading pipeline totals…</p>
          : <p className="text-sm text-muted-foreground">Select an active pipeline to view its opportunities.</p>}
      </section>
        <Card>
          <CardHeader>
            <CardTitle>Opportunity queue</CardTitle>
            <CardDescription>
              Open and closed opportunities, with their current stage and next action.
            </CardDescription>
          </CardHeader>
          <CardContent aria-busy={opportunities.isFetching}>
            {opportunities.isLoading ? <p role="status">Loading opportunities…</p>
              : opportunities.isError ? <Alert variant="destructive"><AlertDescription>Could not load opportunities. <Button variant="outline" size="sm" onClick={() => void opportunities.refetch()}>Retry opportunities</Button></AlertDescription></Alert>
              : records.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No opportunities match these filters.</p>
              : <>
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="whitespace-nowrap p-3">Opportunity</th>
                    <th className="whitespace-nowrap p-3">Company</th>
                    <th className="whitespace-nowrap p-3">Stage</th>
                    <th className="whitespace-nowrap p-3">Amount</th>
                    <th className="whitespace-nowrap p-3">Expected close</th>
                    <th className="whitespace-nowrap p-3">Owner</th>
                    <th className="whitespace-nowrap p-3">Next action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {records.map((value) => (
                    <tr key={value.id}>
                      <td className="p-3 font-medium">
                        <Link
                          to="/crm/opportunities/$opportunityId" search={previous => previous}
                          params={{ opportunityId: value.id }}
                          className="hover:underline"
                        >
                          {value.name}
                        </Link>
                        <p className="mt-1 font-mono text-xs font-normal text-muted-foreground">
                          {value.opportunityNumber}
                        </p>
                      </td>
                      <td className="p-3">{value.companyName}</td>
                      <td className="p-3"><Badge variant="outline">{value.stageName}</Badge>{allPipelines ? <p className="mt-1 text-xs text-muted-foreground">{value.pipelineName}</p> : null}</td>
                      <td className="p-3">{formatOpportunityAmount(value)}</td>
                      <td className="p-3">{value.expectedCloseDate ?? "—"}</td>
                      <td className="p-3">{value.ownerName}</td>
                      <td className="max-w-64 whitespace-normal p-3">{value.nextStep ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y md:hidden">
              {records.map(value => <li key={value.id} className="space-y-2 py-4">
                <Link to="/crm/opportunities/$opportunityId" search={previous => previous} params={{ opportunityId: value.id }} className="font-medium hover:underline">{value.name}</Link>
                <p className="font-mono text-xs text-muted-foreground">{value.opportunityNumber}</p>
                <p className="text-sm">{value.companyName}</p>
                <Badge variant="outline">{value.stageName}</Badge>
                {allPipelines ? <p className="text-xs text-muted-foreground">{value.pipelineName}</p> : null}
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Amount</dt><dd>{formatOpportunityAmount(value)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Owner</dt><dd>{value.ownerName}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Expected close</dt><dd>{value.expectedCloseDate ?? "—"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Next action</dt><dd>{value.nextStep ?? "—"}</dd></div>
                </dl>
              </li>)}
            </ul>
            </>}
            {opportunities.data && !opportunities.isError ? <CrmListPagination result={opportunities.data} page={page} onPageChange={setPage} busy={opportunities.isFetching} /> : null}
          </CardContent>
        </Card>
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
