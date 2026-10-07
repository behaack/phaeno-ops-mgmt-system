const text = (value: unknown) => typeof value === 'string' ? value : ''
const time = (value: unknown) => {
  const date = new Date(text(value))
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : 'Not recorded'
}
const outcome = (value: unknown) => value === 'Failure' ? 'Fail' : text(value) || 'Not recorded'

export function VendorResultHistory({ evidence, libraries }: { evidence: Record<string, unknown>; libraries: { id: string; libraryKey: string }[] }) {
  if (!evidence.isCorrection || !evidence.previous || typeof evidence.previous !== 'object' || Array.isArray(evidence.previous)) return null
  const previous = evidence.previous as Record<string, unknown>
  const oldTime = (key: string) => previous.runNotPerformed === true ? 'Not applicable' : time(previous[key])
  const newTime = (key: string) => evidence.runNotPerformed === true ? 'Not applicable' : time(evidence[key])
  const exceptions = (value: unknown) => Array.isArray(value) && value.length ? value.map(entry => {
    if (!entry || typeof entry !== 'object') return ''
    const row = entry as Record<string, unknown>
    const key = libraries.find(library => library.id === row.memberId)?.libraryKey ?? text(row.memberId)
    return `${key} · ${outcome(row.outcome)} · ${text(row.reason)}`
  }).filter(Boolean).join('\n') : 'None'
  const rows = [
    ['Vendor job reference', text(previous.providerReference), text(evidence.vendorJobReference)],
    ['Run not performed', previous.runNotPerformed === true ? 'Yes' : 'No', evidence.runNotPerformed === true ? 'Yes' : 'No'],
    ['Run started', oldTime('sequencingStartedAtUtc'), newTime('runStartedAtUtc')],
    ['Run completed', oldTime('sequencingCompletedAtUtc'), newTime('runCompletedAtUtc')],
    ['Results received', oldTime('resultsReceivedAtUtc'), newTime('resultsReceivedAtUtc')],
    ['Batch outcome', outcome(previous.outcome), outcome(evidence.outcome)],
    ['Library exceptions', exceptions(previous.exceptions), exceptions(evidence.exceptions)],
    ['Notes', text(previous.outcomeNote), text(evidence.notes)],
  ]
  return <details className="mt-2 rounded-md border p-3">
    <summary className="cursor-pointer rounded-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Result changes</summary>
    <dl className="mt-3 space-y-3">{rows.map(([label, before, after]) => <div key={label}>
      <dt className="font-medium">{label}</dt>
      <dd className="mt-1 grid gap-2 sm:grid-cols-2"><p className="whitespace-pre-wrap break-words"><span className="text-muted-foreground">Before: </span>{before || 'None'}</p><p className="whitespace-pre-wrap break-words"><span className="text-muted-foreground">After: </span>{after || 'None'}</p></dd>
    </div>)}</dl>
  </details>
}
