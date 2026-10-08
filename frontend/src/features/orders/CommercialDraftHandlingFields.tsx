import type { UseFormReturn } from 'react-hook-form'
import type { LabOrderSampleTypeChoice } from '#/api/order-management'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
import { Field, FieldDescription, FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import type { CommercialDraftForm } from './commercial-draft'

export function CommercialDraftHandlingFields({ form, sampleType }: {
  form: UseFormReturn<CommercialDraftForm>
  sampleType: LabOrderSampleTypeChoice | undefined
}) {
  const storageRequirements = form.watch('storageRequirements')
  const safetyDeclaration = form.watch('safetyDeclaration')
  const overrideStorage = storageRequirements !== null

  return <Card size="sm">
    <CardHeader><CardTitle>Shared handling and notes</CardTitle></CardHeader>
    <CardContent className="grid gap-x-4 gap-y-3 md:grid-cols-2">
      <Field>
        <Label htmlFor="draft-notes">Job notes (optional)</Label>
        <FieldDescription>Do not enter patient names or identifying information.</FieldDescription>
        <Textarea id="draft-notes" rows={2} className="min-h-16 resize-y" {...form.register('notes')} aria-invalid={Boolean(form.formState.errors.notes)} aria-describedby="draft-notes-error" />
        <FieldError id="draft-notes-error">{form.formState.errors.notes?.message}</FieldError>
      </Field>
      <Field>
        <Label htmlFor="draft-safetyDeclaration"><RequiredFieldName>Safety declaration</RequiredFieldName> · required for pricing</Label>
        <FieldDescription id="draft-safetyDeclaration-help" className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-[3px]">
          <span>Identify handling risks, or enter “No known hazards”.</span>
          {!safetyDeclaration.trim() ? <Button type="button" variant="link" size="xs" className="ml-auto h-auto w-fit border-0 px-0 py-0 underline" onClick={() => {
            if (form.getValues('safetyDeclaration').trim()) return
            form.setValue('safetyDeclaration', 'No known hazards', { shouldDirty: true, shouldTouch: true, shouldValidate: true })
            form.setFocus('safetyDeclaration')
          }}>Insert “No known hazards”</Button> : null}
        </FieldDescription>
        <Textarea id="draft-safetyDeclaration" rows={2} className="min-h-16 resize-y" {...form.register('safetyDeclaration')} aria-invalid={Boolean(form.formState.errors.safetyDeclaration)} aria-describedby="draft-safetyDeclaration-help draft-safetyDeclaration-error" />
        <FieldError id="draft-safetyDeclaration-error">{form.formState.errors.safetyDeclaration?.message}</FieldError>
      </Field>
      <div className="space-y-2 md:col-span-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-sm font-medium">Storage requirements{overrideStorage ? null : <span className="ml-2 text-xs font-normal text-muted-foreground">Sample type default</span>}</p>
          <label htmlFor="draft-storage-override" className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox id="draft-storage-override" checked={overrideStorage} aria-describedby={overrideStorage ? undefined : 'draft-storage-default'} onCheckedChange={checked => {
              form.setValue('storageRequirements', checked === true ? sampleType?.storageRequirements ?? '' : null, { shouldDirty: true })
              form.clearErrors('storageRequirements')
            }} />
            <span>Use different storage requirements</span>
          </label>
        </div>
        {overrideStorage ? null : <p id="draft-storage-default" className="whitespace-pre-wrap text-sm text-muted-foreground">
          {sampleType ? sampleType.storageRequirements || 'This Sample type has no storage requirements. Enter different requirements before submitting for pricing.' : 'Select a Sample type to use its storage requirements.'}
        </p>}
        {overrideStorage ? <Field>
          <Label htmlFor="draft-storageRequirements"><RequiredFieldName>Different storage requirements</RequiredFieldName> · required for pricing</Label>
          <Textarea id="draft-storageRequirements" rows={2} className="min-h-16 resize-y" {...form.register('storageRequirements')} aria-invalid={Boolean(form.formState.errors.storageRequirements)} aria-describedby="draft-storageRequirements-error" />
          <FieldError id="draft-storageRequirements-error">{form.formState.errors.storageRequirements?.message}</FieldError>
        </Field> : null}
      </div>
    </CardContent>
  </Card>
}
