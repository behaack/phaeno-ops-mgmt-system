import { Navigate, createFileRoute } from '@tanstack/react-router'
import { useSession } from '@clerk/react'

import { MfaSetupAccessState } from '#/features/auth/session-context'

export const Route = createFileRoute('/session-tasks/setup-mfa')({
  component: SetupMfaRoute,
})

function SetupMfaRoute() {
  const { isLoaded, session } = useSession()

  if (!isLoaded) {
    return null
  }

  if (session?.currentTask?.key !== 'setup-mfa') {
    return <Navigate to="/" replace />
  }

  return <MfaSetupAccessState />
}
