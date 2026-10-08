import type { CrmOpportunityStageSummary as StageSummary, CrmPipelineStage } from "#/api/crm";
import { cn } from "#/lib/utils";

export function CrmOpportunityStageSummary({ stages, configuredStages = [], selectedStageId, showPipeline, onSelect }: {
  stages: StageSummary[];
  configuredStages?: Pick<CrmPipelineStage, "id" | "probability">[];
  selectedStageId: string;
  showPipeline: boolean;
  onSelect: (stageId: string) => void;
}) {
  const probabilities = new Map(configuredStages.map(stage => [stage.id, stage.probability]));
  const totals = new Map<string, number>();
  for (const stage of stages) {
    for (const value of stage.currencyTotals) {
      totals.set(value.currency, (totals.get(value.currency) ?? 0) + value.amount);
    }
  }
  const all = {
    stageId: "", stageName: "All stages", pipelineName: "", probability: null,
    count: stages.reduce((sum, stage) => sum + stage.count, 0),
    unpricedCount: stages.reduce((sum, stage) => sum + stage.unpricedCount, 0),
    currencyTotals: [...totals].sort(([a], [b]) => a.localeCompare(b)).map(([currency, amount]) => ({ currency, amount })),
  };
  return <div role="group" aria-label="Filter opportunities by stage" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-2">
    {[all, ...stages].map(stage => {
      const probability = stage.stageId ? probabilities.get(stage.stageId) ?? stage.probability : null;
      return <button
      key={stage.stageId}
      type="button"
      aria-pressed={selectedStageId === stage.stageId}
      onClick={() => onSelect(stage.stageId)}
      className={cn("flex min-w-0 cursor-pointer flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none", selectedStageId === stage.stageId && "border-primary bg-primary/5")}
    >
      {showPipeline && stage.stageId ? <span className="text-xs text-muted-foreground">{stage.pipelineName}</span> : null}
      <span className="font-medium">{stage.stageName}{probability != null ? <span className="whitespace-nowrap text-[0.65rem] font-normal text-muted-foreground"> · {probability}%</span> : null}</span>
      <span className="text-lg font-semibold tabular-nums" aria-label={`${stage.count.toLocaleString()} opportunities`}>{stage.count.toLocaleString()}</span>
      {stage.currencyTotals.map(value => <span key={value.currency} className="text-xs tabular-nums">{formatOpportunityAmount(value)}</span>)}
      {stage.unpricedCount > 0 ? <span className="text-xs text-muted-foreground">{stage.unpricedCount.toLocaleString()} unpriced</span> : null}
    </button>;
    })}
  </div>;
}

export function formatOpportunityAmount(value: { amount: number | null; currency: string }) {
  return value.amount == null ? "Unpriced" : new Intl.NumberFormat(undefined, {
    style: "currency", currency: value.currency, currencyDisplay: "code", maximumFractionDigits: 2,
  }).format(value.amount);
}
