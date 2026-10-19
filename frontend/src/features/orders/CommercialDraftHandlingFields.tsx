import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
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
import { OrderNotesEditor } from './OrderNotesEditor'

export function CommercialDraftHandlingFields({ form, sampleType }: {
  form: UseFormReturn<CommercialDraftForm>
  sampleType: LabOrderSampleTypeChoice | undefined
}) {
  const storageRequirements = form.watch('storageRequirements')
  const safetyDeclaration = form.watch('safetyDeclaration')
  const overrideStorage = storageRequirements !== null

  return <Card size="sm">
    <CardHeader><CardTitle><CustomerSourceText source={"Shared handling and notes"} /></CardTitle></CardHeader>
    <CardContent className="grid gap-x-4 gap-y-3 md:grid-cols-2">
      <OrderNotesEditor form={form} name="privateNotes" />
      <OrderNotesEditor form={form} name="publicNotes" />
      <Field>
        <Label htmlFor="draft-safetyDeclaration"><RequiredFieldName><CustomerSourceText source={"Safety declaration"} /></RequiredFieldName> <CustomerSourceText source={"· required for pricing"} /></Label>
        <FieldDescription id="draft-safetyDeclaration-help" className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-[3px]">
          <span><CustomerSourceText source={"Identify handling risks, or enter “No known hazards”."} /></span>
          {!safetyDeclaration.trim() ? <Button type="button" variant="link" size="xs" className="ml-auto h-auto w-fit border-0 px-0 py-0 underline" onClick={() => {
            if (form.getValues('safetyDeclaration').trim()) return
            form.setValue('safetyDeclaration', 'No known hazards', { shouldDirty: true, shouldTouch: true, shouldValidate: true })
            form.setFocus('safetyDeclaration')
          }}><CustomerSourceText source={"Insert “No known hazards”"} /></Button> : null}
        </FieldDescription>
        <Textarea id="draft-safetyDeclaration" rows={2} className="min-h-16 resize-y" {...form.register('safetyDeclaration')} aria-invalid={Boolean(form.formState.errors.safetyDeclaration)} aria-describedby="draft-safetyDeclaration-help draft-safetyDeclaration-error" />
        <FieldError id="draft-safetyDeclaration-error">{form.formState.errors.safetyDeclaration?.message}</FieldError>
      </Field>
      <div className="space-y-2 md:col-span-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-sm font-medium"><CustomerSourceText source={"Storage requirements"} />{overrideStorage ? null : <span className="ml-2 text-xs font-normal text-muted-foreground"><CustomerSourceText source={"Sample type default"} /></span>}</p>
          <label htmlFor="draft-storage-override" className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox id="draft-storage-override" checked={overrideStorage} aria-describedby={overrideStorage ? undefined : 'draft-storage-default'} onCheckedChange={checked => {
              form.setValue('storageRequirements', checked === true ? sampleType?.storageRequirements ?? '' : null, { shouldDirty: true })
              form.clearErrors('storageRequirements')
            }} />
            <span><CustomerSourceText source={"Use different storage requirements"} /></span>
          </label>
        </div>
        {overrideStorage ? null : <p id="draft-storage-default" className="whitespace-pre-wrap text-sm text-muted-foreground">
          {sampleType ? sampleType.storageRequirements || 'This Sample type has no storage requirements. Enter different requirements before submitting for pricing.' : <CustomerSourceText source={"Select a Sample type to use its storage requirements."} />}
        </p>}
        {overrideStorage ? <Field>
          <Label htmlFor="draft-storageRequirements"><RequiredFieldName><CustomerSourceText source={"Different storage requirements"} /></RequiredFieldName> <CustomerSourceText source={"· required for pricing"} /></Label>
          <Textarea id="draft-storageRequirements" rows={2} className="min-h-16 resize-y" {...form.register('storageRequirements')} aria-invalid={Boolean(form.formState.errors.storageRequirements)} aria-describedby="draft-storageRequirements-error" />
          <FieldError id="draft-storageRequirements-error">{form.formState.errors.storageRequirements?.message}</FieldError>
        </Field> : null}
      </div>
    </CardContent>
  </Card>
}
