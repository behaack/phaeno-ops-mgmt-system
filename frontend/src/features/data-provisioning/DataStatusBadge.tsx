import type { DatasetGrantStatus, DatasetVersionStatus, GovernanceIncidentStatus, ProvisioningRunStatus, SourceSampleStatus } from '#/api/data-provisioning'
import { StatusBadge, type StatusTone } from '#/components/ui/status-badge'

type ProvisioningStatus = DatasetGrantStatus | DatasetVersionStatus | ProvisioningRunStatus | SourceSampleStatus
const provisioningTones = {
  Draft: 'neutral', Ready: 'info', Archived: 'neutral', Published: 'info', Quarantined: 'warning',
  Withdrawn: 'neutral', Retired: 'neutral', Active: 'info', Revoked: 'neutral', Superseded: 'neutral',
  Pending: 'pending', Succeeded: 'success', Failed: 'error',
} satisfies Record<ProvisioningStatus, StatusTone>
const governanceTones = { Open: 'warning', Cleared: 'success', ConfirmedUnsafe: 'error' } satisfies Record<GovernanceIncidentStatus, StatusTone>

export function ProvisioningStatusBadge({ status }: { status: ProvisioningStatus }) {
  return <StatusBadge tone={provisioningTones[status]}>{status}</StatusBadge>
}
export function GovernanceStatusBadge({ status }: { status: GovernanceIncidentStatus }) {
  return <StatusBadge tone={governanceTones[status]}>{status}</StatusBadge>
}
