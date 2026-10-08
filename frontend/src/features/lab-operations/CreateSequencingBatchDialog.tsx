import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createLabBatch, getLabOperationsError, type LabBatch } from '#/api/lab-operations'
import { PreparationFormDialog } from './preparation-ui'

export function CreateSequencingBatchDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (batch: LabBatch) => void }) {
  const client = useQueryClient()
  const create = useMutation({
    mutationFn: (values: Record<string, string>) => createLabBatch({ name: values.name?.trim() || null, notes: values.notes?.trim() || null }),
    onSuccess: async batch => { await client.invalidateQueries({ queryKey: ['lab-operations'] }); onCreated(batch) },
  })
  return <PreparationFormDialog title="Create sequencing batch" description="Create a draft batch, then review and save the library assignment separately."
    fields={[{ key: 'name', label: 'Descriptive name (optional)', maxLength: 255 }, { key: 'notes', label: 'Batch notes (optional)', type: 'textarea', maxLength: 4000 }]}
    submitLabel="Create draft batch" pending={create.isPending} error={create.error ? getLabOperationsError(create.error, 'The batch could not be created. Check sequencing batches before retrying.') : undefined}
    onClose={onClose} onSubmit={values => create.mutate(values)} />
}
