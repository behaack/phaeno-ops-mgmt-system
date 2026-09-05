import { createFileRoute } from '@tanstack/react-router'
import { TrialScopePage } from '#/features/trials/TrialScopePage'
export const Route = createFileRoute('/trial-projects/$trialId/scope')({ component: TrialScopeRoute })
function TrialScopeRoute() { const { trialId } = Route.useParams(); return <TrialScopePage trialId={trialId} /> }
