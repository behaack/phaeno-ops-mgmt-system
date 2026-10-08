import type { AssemblyJob, AssemblyProgress } from '#/api/lab-assembly'

export const assemblyStateLabel = (state: string) => state.replace(/([a-z])([A-Z])/g, '$1 $2')
export function currentAssemblyPercentage(progress: AssemblyProgress | null, isTerminal: boolean, now = Date.now()) {
  if (isTerminal || !progress || !Number.isFinite(progress.percentage) || progress.percentage < 0 || progress.percentage > 100) return null
  const received = new Date(progress.receivedAtUtc).getTime()
  return Number.isFinite(received) && now - received <= 120_000 && received <= now + 5_000 ? progress.percentage : null
}
export function assemblyDuration(seconds: number | null) {
  if (seconds === null) return 'Not available'
  const rounded = Math.max(0, Math.round(seconds))
  return `${Math.floor(rounded / 3600)}h ${Math.floor(rounded % 3600 / 60)}m ${rounded % 60}s`
}
export const assemblyMatches = (job: AssemblyJob, search: string) =>
  `${job.sampleName} ${job.sequencingRunNumber} ${job.state} ${job.providerJobId ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())
