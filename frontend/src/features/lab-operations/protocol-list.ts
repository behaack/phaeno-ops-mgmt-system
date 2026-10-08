import type { LabProtocol } from '#/api/lab-operations'

/** Keep discarded revisions in history, not as standalone working-list records. */
export function isProtocolVisible(protocol: { retiredAtUtc?: string | null; versions: Pick<LabProtocol['versions'][number], 'status'>[] }, showRetired = false) {
  if (protocol.versions.length > 0 && protocol.versions.every((version) => version.status === 'Discarded')) return false
  if (protocol.retiredAtUtc) return showRetired
  return true
}
