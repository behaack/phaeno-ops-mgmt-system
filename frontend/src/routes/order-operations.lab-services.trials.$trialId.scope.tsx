import { createFileRoute } from '@tanstack/react-router'
import { TrialScopePage } from '#/features/trials/TrialScopePage'
export const Route = createFileRoute('/order-operations/lab-services/trials/$trialId/scope')({ component: TrialScopeRoute })
function TrialScopeRoute() { const { trialId } = Route.useParams(); const { fromCompanyId } = Route.useSearch(); return <TrialScopePage trialId={trialId} fromCompanyId={fromCompanyId} /> }
