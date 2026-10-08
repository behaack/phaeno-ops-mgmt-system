import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'

import { getLabOperationsDashboard, getLabOperationsError } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { usePhaenoSession } from '#/features/auth/session-context'
import { EquipmentCreateDialog } from './EquipmentCreateDialog'
import { EquipmentList } from './LabOperationsPage'

export function EquipmentWorkspace() {
  const { session, authProvider } = usePhaenoSession()
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const allowed = Boolean(session?.capabilities.canManageLabOperations)
  const enabled = allowed && authProvider !== 'mock'
  const query = useQuery({ queryKey: ['lab-operations'], queryFn: getLabOperationsDashboard, enabled })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['lab-operations'] })

  return <main className="page-wrap space-y-5 px-4 py-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold">Equipment</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Manage laboratory assets, availability, and calibration records.</p>
      </div>
      <Button type="button" variant="outline" disabled={!enabled || query.isFetching} onClick={() => void refresh()}><RefreshCw data-icon="inline-start" /> Refresh</Button>
    </header>
    {!allowed ? <p>Equipment requires Phaeno laboratory access.</p> : authProvider === 'mock' ? <p>Use a connected Phaeno session to manage equipment.</p> : <>
      {query.isError ? <Alert variant="destructive"><AlertTitle>Equipment could not be loaded</AlertTitle><AlertDescription>{getLabOperationsError(query.error, 'Try refreshing the workspace.')}</AlertDescription></Alert> : null}
      {query.isPending ? <p role="status">Loading equipment…</p> : query.data ? <>
        <EquipmentList items={query.data.equipment} canManage={Boolean(session?.capabilities.canSuperviseLabWork)} onCreate={() => setCreating(true)} />
        <EquipmentCreateDialog open={creating} equipment={query.data.equipment} protocols={query.data.protocols} storageLocations={query.data.storageLocations} onOpenChange={setCreating} onSaved={async () => { setCreating(false); await refresh() }} />
      </> : null}
    </>}
  </main>
}
