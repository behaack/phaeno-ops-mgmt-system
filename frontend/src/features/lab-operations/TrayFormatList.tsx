import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPreparationIndex, type TrayFormat } from '#/api/lab-preparation'
import { getLabOperationsError } from '#/api/lab-operations'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { PreparationActions, PreparationPanel, prepRowClass } from './preparation-ui'
import { TrayFormatDialog } from './TrayFormatDialog'

export function TrayFormatList() {
  const query = useQuery({ queryKey: ['lab-preparation'], queryFn: getPreparationIndex })
  const [dialog, setDialog] = useState<'create' | TrayFormat | null>(null)

  if (query.isPending) return <p role="status">Loading tray formats…</p>
  if (query.isError) return <div className="space-y-3"><p role="alert">{getLabOperationsError(query.error, 'Tray formats could not be loaded.')}</p><Button variant="outline" onClick={() => void query.refetch()}>Reload tray formats</Button></div>

  const { formats, canConfigure } = query.data
  return <>
    <PreparationPanel
      title="Tray formats"
      description="Define tray layouts for library preparation, including position labels and unavailable positions. Existing batches retain their original layout."
      actions={canConfigure ? <PreparationActions items={[{ label: 'New tray format', onClick: () => setDialog('create') }]} /> : undefined}
    >
      {formats.length ? <ul aria-label="Tray formats" className="space-y-3">
        {formats.map(format => <li key={format.id} className={`${prepRowClass} flex flex-wrap items-center justify-between gap-3`}>
          <div className="min-w-0 flex-1 basis-48 break-words">
            <p className="font-medium">{format.layout.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{format.layout.rows} rows × {format.layout.columns} columns · {format.layout.rows * format.layout.columns - format.layout.unavailable.length} usable positions · {format.layout.labels === 'grid' ? 'Grid' : 'Numeric'} labels</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{format.isActive ? 'Active' : 'Retired'}</Badge>
            {canConfigure ? <PreparationActions items={[{ label: 'Edit tray format', onClick: () => setDialog(format) }]} /> : null}
          </div>
        </li>)}
      </ul> : <p className="py-4 text-sm text-muted-foreground">{canConfigure ? 'No tray formats yet. Create a format to make it available when assembling a preparation batch.' : 'No tray formats yet. A Supervisor or Protocol Administrator can configure them.'}</p>}
    </PreparationPanel>
    {dialog ? <TrayFormatDialog format={dialog === 'create' ? undefined : dialog} onClose={() => setDialog(null)} /> : null}
  </>
}
