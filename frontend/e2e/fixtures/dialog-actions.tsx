// Synthetic interaction fixture. No session, API or business-record writes.
import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../../src/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../src/components/ui/dialog'
import { Input } from '../../src/components/ui/input'
import { Label } from '../../src/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '../../src/components/ui/required-field'
import { applyThemeMode } from '../../src/components/theme-mode'
import '../../src/styles.css'

const schema = z.object({ customer: z.string().min(1, 'Customer is required.'), reference: z.string().min(1, 'Reference is required.') })
function Fixture() {
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const form = useForm({ resolver: zodResolver(schema), mode: 'onBlur', defaultValues: { customer: '', reference: '' } })
  return <main className="page-wrap p-6">
    <h1 className="mb-4 text-2xl font-semibold">Dialog interaction fixture</h1>
    <Button onClick={() => { form.reset(); setSaved(false); setOpen(true) }}>Open example form</Button>
    {saved ? <p role="status">Example saved</p> : null}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent>
      <DialogHeader><DialogTitle>Example form</DialogTitle><DialogDescription>Both fields are required. Nothing is sent to a server.</DialogDescription></DialogHeader>
      <form id="dialog-action-example" noValidate className="space-y-4" onSubmit={form.handleSubmit(() => { setSaved(true); setOpen(false) })}>
        <div className="space-y-2"><Label htmlFor="example-customer"><RequiredFieldName>Customer</RequiredFieldName></Label>
          <select id="example-customer" required aria-invalid={Boolean(form.formState.errors.customer)} aria-describedby={form.formState.errors.customer ? 'example-customer-error' : undefined} className="w-full rounded-md border bg-background p-2" {...form.register('customer')}><option value="">Select Customer</option><option value="example">Example Customer</option></select>
          {form.formState.errors.customer ? <p id="example-customer-error" role="alert" className="min-h-24 text-destructive">{form.formState.errors.customer.message}</p> : null}
        </div>
        <div className="space-y-2"><Label htmlFor="example-reference"><RequiredFieldName>Reference</RequiredFieldName></Label><Input id="example-reference" required aria-invalid={Boolean(form.formState.errors.reference)} aria-describedby={form.formState.errors.reference ? 'example-reference-error' : undefined} {...form.register('reference')} />
          {form.formState.errors.reference ? <p id="example-reference-error" role="alert" className="text-destructive">{form.formState.errors.reference.message}</p> : null}
        </div>
      </form>
      <RequiredDialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="dialog-action-example">Save</Button></RequiredDialogFooter>
    </DialogContent></Dialog>
  </main>
}
applyThemeMode('auto')
createRoot(document.getElementById('root')!).render(<Fixture />)
