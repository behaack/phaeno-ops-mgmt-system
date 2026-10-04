import { usePhaenoSession, getSelectedMembership } from '#/features/auth/session-context'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { ResultReleasePanel } from '#/features/orders/ResultReleasePanel'
import { LabOperationsSidebar } from './LabOperationsSidebar'

export function ResultReleasePage() {
  const { session, authProvider, selectedOrganizationId } = usePhaenoSession()
  const allowed = getSelectedMembership(session, selectedOrganizationId)?.organizationKind === 'Phaeno' && session?.capabilities.canReleasePSeqResults
  if (!allowed) return <main className="page-wrap p-8"><Alert><AlertTitle>Result release unavailable</AlertTitle><AlertDescription>Your current responsibilities do not include result release.</AlertDescription></Alert></main>
  return <main className="py-8"><LabOperationsSidebar section="release"><div className="page-wrap px-4 pt-6 lg:pt-0">
    <header className="mb-6"><h1 className="text-3xl font-semibold">Result release</h1><p className="mt-2 text-sm text-muted-foreground">Review governed PSeq packages and release scientifically approved results.</p></header>
    <ResultReleasePanel apiEnabled={authProvider !== 'mock'} />
  </div></LabOperationsSidebar></main>
}
