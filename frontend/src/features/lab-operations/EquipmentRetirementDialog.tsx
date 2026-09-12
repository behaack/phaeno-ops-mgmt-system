import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import type { LabEquipment } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'

const retirementSchema = z.object({ reason: z.string().trim().min(1, 'Enter a retirement reason.').max(1000, 'Use 1,000 characters or fewer.') })

export function EquipmentRetirementDialog({ equipment, pending, error, onClose, onRetire }: {
  equipment: LabEquipment
  pending: boolean
  error?: string
  onClose: () => void
  onRetire: (reason: string) => void
}) {
  const form = useForm<z.infer<typeof retirementSchema>>({ resolver: zodResolver(retirementSchema), defaultValues: { reason: '' } })
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose() }}>
    <DialogContent>
      <form noValidate onSubmit={form.handleSubmit(({ reason }) => { if (!pending) onRetire(reason) })}>
        <DialogHeader>
          <DialogTitle>Retire equipment?</DialogTitle>
          <DialogDescription>Retire {equipment.name} ({equipment.assetCode}). It will no longer be available for new use. Its identity, calibration details and recorded usage remain in history. Retirement cannot be undone here.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="equipment-retirement-reason"><RequiredFieldName>Retirement reason</RequiredFieldName></Label>
          <textarea id="equipment-retirement-reason" required maxLength={1000} rows={3} disabled={pending}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby={form.formState.errors.reason ? 'equipment-retirement-reason-error' : undefined}
            {...form.register('reason')} />
          {form.formState.errors.reason ? <p id="equipment-retirement-reason-error" role="alert" className="text-sm text-destructive">{form.formState.errors.reason.message}</p> : null}
        </div>
        {error ? <Alert variant="destructive"><AlertTitle>Equipment was not retired</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        <RequiredDialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={pending}>{pending ? 'Retiring…' : 'Retire equipment'}</Button>
        </RequiredDialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
