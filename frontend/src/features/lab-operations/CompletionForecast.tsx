import type { CompletionForecast as Forecast } from '#/api/lab-forecasts'
import { deadlineDate } from './job-deadlines'

export function ForecastSummary({ forecast }: { forecast: Forecast | null | undefined }) {
  if (!forecast) return <span>Not available</span>
  return <><span>{forecast.expectedAtUtc ? deadlineDate(forecast.expectedAtUtc) : forecast.status === 'Blocked' ? 'Blocked' : forecast.status === 'Delivered' ? 'Delivered' : forecast.status === 'Cancelled' ? 'Cancelled' : 'Insufficient information'}</span>
    <span className="mt-1 block text-xs text-muted-foreground">{forecast.remainingDays !== null ? `${forecast.remainingDays} calendar days remaining` : `${forecast.estimatedSamples} of ${forecast.outstandingSamples} outstanding samples estimated`}</span></>
}

export function CompletionForecastDetails({ forecast }: { forecast: Forecast }) {
  return <section className="space-y-3 border-t pt-3" aria-label="Calculated completion forecast">
    <h3 className="font-medium">Calculated expected completion</h3>
    <p className="text-sm"><ForecastSummary forecast={forecast} /></p>
    <p className="text-sm">{forecast.reason}</p>
    <p className="text-xs text-muted-foreground">Calculated {deadlineDate(forecast.evaluatedAtUtc)}{forecast.policyRevision ? ` · Timing revision ${forecast.policyRevision} · Calendar revision ${forecast.calendarRevision}` : ''}. This internal forecast does not change the delivery commitment or send a customer notice.</p>
    <details><summary className="min-h-9 cursor-pointer rounded-sm py-1.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring">Sample progress and remaining work ({forecast.samples.length})</summary>
      <ul className="mt-2 divide-y">{forecast.samples.map(sample => <li key={sample.sampleId} className="space-y-2 py-3 text-sm">
        <p className="font-medium">{sample.name}{forecast.drivingSampleIds.includes(sample.sampleId) ? ' · Determines job completion' : ''}</p>
        <dl className="grid gap-2 sm:grid-cols-3"><div><dt className="text-muted-foreground">Current stage</dt><dd>{sample.stage}</dd></div><div><dt className="text-muted-foreground">Entered stage</dt><dd>{deadlineDate(sample.enteredAtUtc)}</dd></div><div><dt className="text-muted-foreground">Time in stage</dt><dd>{sample.enteredAtUtc ? `${Math.max(0, (Date.parse(forecast.evaluatedAtUtc) - Date.parse(sample.enteredAtUtc)) / 86400000).toFixed(1)} calendar days` : 'Unknown'}</dd></div><div><dt className="text-muted-foreground">Expected delivery</dt><dd>{deadlineDate(sample.expectedAtUtc)}</dd></div><div><dt className="text-muted-foreground">Remaining</dt><dd>{sample.remainingDays !== null ? `${sample.remainingDays} calendar days` : 'Unknown'}</dd></div></dl>
        <p>{sample.reason}</p>{sample.policyRevision ? <p className="text-xs text-muted-foreground">Timing revision {sample.policyRevision} · Calendar revision {sample.calendarRevision}</p> : null}
        {sample.steps.length ? <ol className="space-y-1 border-l pl-3">{sample.steps.map(step => <li key={step.key}>{step.name}: {step.days} {step.dayBasis === 'Business' ? 'business' : 'calendar'} days configured · expected exit {deadlineDate(step.expectedExitAtUtc)}{step.overrun ? ' · Using one additional stage day' : ''}</li>)}</ol> : null}
      </li>)}</ul>
    </details>
  </section>
}
