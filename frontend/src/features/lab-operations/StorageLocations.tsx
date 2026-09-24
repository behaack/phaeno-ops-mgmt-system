import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'

import {
  createLabStorageLocation,
  getLabOperationsError,
  listLabStorageLocations,
  updateLabStorageLocation,
  type ManagedLabStorageLocation,
} from '#/api/lab-operations'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { CatalogActions } from './CatalogActions'
import { PreparationFormDialog, PreparationPanel, prepRowClass } from './preparation-ui'

const storageLocationsKey = ['lab-storage-locations'] as const

export function StorageLocations({ enabled, canCreate, canEdit }: { enabled: boolean; canCreate: boolean; canEdit: boolean }) {
  const client = useQueryClient()
  const query = useQuery({ queryKey: storageLocationsKey, queryFn: listLabStorageLocations, enabled })
  const [search, setSearch] = useState('')
  const [editor, setEditor] = useState<'create' | ManagedLabStorageLocation | null>(null)
  const [statusLocation, setStatusLocation] = useState<ManagedLabStorageLocation | null>(null)
  const save = useMutation({
    mutationFn: (name: string) => editor === 'create'
      ? createLabStorageLocation(name)
      : updateLabStorageLocation(editor!, name, editor!.isActive),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: storageLocationsKey }),
        client.invalidateQueries({ queryKey: ['lab-operations'] }),
      ])
      setEditor(null)
    },
  })
  const changeStatus = useMutation({
    mutationFn: (location: ManagedLabStorageLocation) => updateLabStorageLocation(location, location.name, !location.isActive),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: storageLocationsKey }),
        client.invalidateQueries({ queryKey: ['lab-operations'] }),
      ])
      setStatusLocation(null)
    },
  })

  if (!enabled) return null
  if (query.isPending) return <p role="status">Loading storage locations…</p>
  if (query.isError) return <div className="space-y-3"><p role="alert">{getLabOperationsError(query.error, 'Storage locations could not be loaded.')}</p><Button type="button" variant="outline" onClick={() => void query.refetch()}>Reload storage locations</Button></div>

  const locations = query.data.filter(location => location.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  return <>
    <PreparationPanel title="Storage locations" description="Maintain the named locations used for material lots. Inactive locations stay in history and cannot be selected for new lots."
      actions={canCreate ? <Button type="button" id="new-storage-location" onClick={() => setEditor('create')}><Plus data-icon="inline-start" /> New storage location</Button> : undefined}>
      <div className="max-w-sm space-y-1.5"><Label htmlFor="storage-location-search">Search locations</Label><Input id="storage-location-search" type="search" value={search} onChange={event => setSearch(event.target.value)} /></div>
      {locations.length ? <ul aria-label="Storage locations" className="space-y-3">{locations.map(location => <li key={location.id} className={`${prepRowClass} flex flex-wrap items-center justify-between gap-3`}>
        <div className="min-w-0 flex-1 basis-48 break-words"><p className="font-medium">{location.name}</p><p className="mt-1 text-sm text-muted-foreground">{location.materialLotCount} material {location.materialLotCount === 1 ? 'lot' : 'lots'}</p></div>
        <div className="flex items-center gap-2"><Badge variant="secondary">{location.isActive ? 'Active' : 'Inactive'}</Badge>
          {canEdit && location.materialLotCount === 0 ? <CatalogActions id={`storage-actions-${location.id}`} name={location.name} isActive={location.isActive} onEdit={() => setEditor(location)} onStatus={() => setStatusLocation(location)} />
            : canEdit ? <Button type="button" id={`storage-actions-${location.id}`} variant="outline" onClick={() => setStatusLocation(location)}>{location.isActive ? 'Deactivate' : 'Activate'}</Button> : null}
        </div>
      </li>)}</ul> : <p className="py-4 text-sm text-muted-foreground">{query.data.length ? 'No locations match the search.' : 'No storage locations yet.'}</p>}
    </PreparationPanel>

    {editor ? <PreparationFormDialog
      title={editor === 'create' ? 'Create storage location' : `Edit ${editor.name}`}
      description="Use a distinct name that staff can recognize when receiving a material lot."
      fields={[{ key: 'name', label: 'Location name', required: true, defaultValue: editor === 'create' ? '' : editor.name }]}
      onClose={() => setEditor(null)} onSubmit={values => save.mutate(values.name)}
      pending={save.isPending} error={save.error ? getLabOperationsError(save.error, 'The storage location could not be saved.') : undefined}
      submitLabel={editor === 'create' ? 'Create location' : 'Save location'}
    /> : null}

    {statusLocation ? <Dialog open onOpenChange={open => { if (!open && !changeStatus.isPending) setStatusLocation(null) }}><DialogContent onCloseAutoFocus={event => { event.preventDefault(); document.getElementById(`storage-actions-${statusLocation.id}`)?.focus() }}>
      <DialogHeader><DialogTitle>{statusLocation.isActive ? 'Deactivate' : 'Activate'} {statusLocation.name}?</DialogTitle><DialogDescription>{statusLocation.isActive ? 'It will remain on existing material lots but will not be available for new lots.' : 'It will be available for new material lots again.'}</DialogDescription></DialogHeader>
      {changeStatus.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(changeStatus.error, 'Refresh and try again.')}</p> : null}
      <DialogFooter><Button type="button" variant="outline" disabled={changeStatus.isPending} onClick={() => setStatusLocation(null)}>Cancel</Button><Button type="button" disabled={changeStatus.isPending} onClick={() => changeStatus.mutate(statusLocation)}>{changeStatus.isPending ? 'Saving…' : statusLocation.isActive ? 'Deactivate' : 'Activate'}</Button></DialogFooter>
    </DialogContent></Dialog> : null}
  </>
}
