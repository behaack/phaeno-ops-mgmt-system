import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { GuardedFormDialog } from '#/components/GuardedFormDialog'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Field, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/ui/native-select'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'

export function GuardedFormExample() {
  const [open,setOpen]=useState(false)
  const [saved,setSaved]=useState('EXAMPLE-001')
  const [outcome,setOutcome]=useState('success')
  const [feedback,setFeedback]=useState<'error'|'conflict'|null>(null)
  const [reviewed,setReviewed]=useState(false)
  const [attempts,setAttempts]=useState(0)
  const [notice,setNotice]=useState('No example changes saved.')
  const form=useForm({defaultValues:{reference:saved},mode:'onTouched'})
  const {isDirty,isSubmitting,errors}=form.formState
  async function save(values:{reference:string}) {
    await new Promise(resolve=>setTimeout(resolve,600))
    if(!attempts&&outcome!=='success'){setFeedback(outcome==='error'?'error':'conflict');setAttempts(1);return}
    setSaved(values.reference);form.reset(values);setOpen(false);setNotice('Example changes saved locally.');setFeedback(null)
  }
  return <div className="space-y-4">
    <Field><Label htmlFor="example-save-outcome">Example save outcome</Label><NativeSelect id="example-save-outcome" value={outcome} onChange={e=>setOutcome(e.target.value)}><option value="success">Success</option><option value="error">Save error, then successful retry</option><option value="conflict">Changed record requiring review</option></NativeSelect></Field>
    <Button id="edit-example-record" variant="outline" onClick={()=>{form.reset({reference:saved});setFeedback(null);setReviewed(false);setAttempts(0);setOpen(true)}}>Edit example record</Button>
    <p role="status" className="text-sm text-muted-foreground">{notice}</p>
    <GuardedFormDialog open={open} onOpenChange={setOpen} dirty={isDirty} pending={isSubmitting} returnFocusId="edit-example-record">
      <DialogContent><form noValidate onSubmit={form.handleSubmit(save)}>
        <DialogHeader><DialogTitle>Edit fictional sample</DialogTitle><DialogDescription>Changes affect only this local example.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          {feedback ? <Alert variant={feedback==='error'?'destructive':'warning'}><AlertTitle>{feedback==='error'?'Example could not be saved':'Review the changed example'}</AlertTitle><AlertDescription>{feedback==='error'?'Your entries are retained. Retry saving when ready.':'The latest saved name is EXAMPLE-UPDATED. Your entered reference is retained; review the latest value before saving.'}</AlertDescription></Alert> : null}
          <Field><Label htmlFor="guarded-example-reference"><RequiredFieldName>Example reference</RequiredFieldName></Label><Input id="guarded-example-reference" required disabled={isSubmitting} aria-invalid={Boolean(errors.reference)} aria-describedby={errors.reference?'guarded-example-error':undefined} {...form.register('reference',{required:'Enter an example reference.',validate:value=>Boolean(value.trim())||'Enter an example reference.'})} />{errors.reference?<FieldError id="guarded-example-error">{errors.reference.message}</FieldError>:null}</Field>
          {feedback==='conflict'?<Label><Checkbox checked={reviewed} onCheckedChange={v=>setReviewed(v===true)} disabled={isSubmitting} />I reviewed the latest example and want to save my entered reference</Label>:null}
          {isSubmitting?<p role="status" className="text-sm">Saving example changes…</p>:null}
        </div>
        <RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose><Button type="submit" disabled={!isDirty||isSubmitting||feedback==='conflict'&&!reviewed}>{isSubmitting?'Saving changes…':'Save changes'}</Button></RequiredDialogFooter>
      </form></DialogContent>
    </GuardedFormDialog>
  </div>
}
