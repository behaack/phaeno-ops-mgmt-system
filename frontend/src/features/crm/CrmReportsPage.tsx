import { useQuery } from "@tanstack/react-query";
import { apiErrorMessage, getCrmReports } from "#/api/crm";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";

export function CrmReportsPage() {
  const query = useQuery({ queryKey: ["crm-reports"], queryFn: getCrmReports });
  const report = query.data;
  return (
    <main className="page-wrap space-y-6 px-4 py-8">
      <section>
        <Badge variant="secondary" className="mb-3">
          Commercial intelligence
        </Badge>
        <h1 className="text-3xl font-semibold">Reports</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          A transparent operational view of pipeline, forecast, source quality,
          workload, and recent activity.
        </p>
      </section>
      {query.error ? (
        <Alert variant="destructive">
          <AlertDescription>{apiErrorMessage(query.error)}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric
          label="Open opportunities"
          value={report?.pipeline.openOpportunities}
        />
        <Metric
          label="Open amount (USD)"
          value={money(report?.pipeline.openAmount)}
        />
        <Metric
          label="Weighted forecast (USD)"
          value={money(report?.pipeline.weightedForecast)}
        />
        <Metric
          label="Win rate"
          value={report ? `${report.pipeline.winRate}%` : undefined}
        />
        <Metric
          label="Activities, 30 days"
          value={report?.activitiesLast30Days}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pipeline by stage</CardTitle>
          <CardDescription>
            USD value and age make stalled commercial work visible. Counts
            include Opportunities in every currency; financial totals include
            USD records only and never imply currency conversion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table
            headers={[
              "Stage",
              "Category",
              "Opportunities",
              "Amount (USD)",
              "Weighted (USD)",
              "Average age",
            ]}
            rows={(report?.pipeline.stages ?? []).map((stage) => [
              stage.stageName,
              stage.category,
              stage.opportunityCount,
              money(stage.amount),
              money(stage.weightedAmount),
              `${stage.averageAgeDays} days`,
            ])}
          />
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Owner workload</CardTitle>
            <CardDescription>
              Forecast is USD only; Opportunity counts include every currency.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table
              headers={[
                "Owner",
                "Tasks",
                "Overdue",
                "Leads",
                "Opportunities",
                "Forecast (USD)",
              ]}
              rows={(report?.ownerWorkload ?? []).map((owner) => [
                owner.ownerName,
                owner.openTasks,
                owner.overdueTasks,
                owner.openLeads,
                owner.openOpportunities,
                money(owner.weightedForecast),
              ])}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lead source performance</CardTitle>
          </CardHeader>
          <CardContent>
            <Table
              headers={[
                "Source",
                "Leads",
                "Qualified",
                "Converted",
                "Conversion",
              ]}
              rows={(report?.sourcePerformance ?? []).map((source) => [
                source.source,
                source.leads,
                source.qualified,
                source.converted,
                `${source.conversionRate}%`,
              ])}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
function Metric({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-2xl font-semibold">{value ?? "—"}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header} className="p-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="p-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">
          No report data is available yet.
        </p>
      ) : null}
    </div>
  );
}
function money(value?: number) {
  return value == null
    ? "—"
    : new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);
}
