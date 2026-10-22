import { useEffect, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { BackLink } from '#/components/ui/back-link'
import { PageHeader } from '#/components/ui/page-header'
import { RecordLink } from '#/components/ui/record-link'
import { RecordList, RecordListItem, ListToolbar } from '#/components/ui/record-list'
import { RecordPagination } from '#/components/RecordPagination'
import { DetailField, DetailHeading, DetailSummary } from '#/components/ui/detail-summary'
import { ClearFiltersButton } from '#/components/ui/clear-filters-button'
import { EmptyState } from '#/components/ui/content-state'
import { Field, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/ui/native-select'
import { NativeCheckbox } from '#/components/ui/native-checkbox'
import { Button } from '#/components/ui/button'
import { DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { GuardedFormDialog } from '#/components/GuardedFormDialog'
import { OrderStatusBadge } from '#/features/orders/OrderStatusBadge'
import { CustomerLocaleContext, CustomerSourceText, pseudolocalize } from '#/features/customer-i18n/customer-text'
import { formatByteSize, formatDisplayTimestamp } from '#/lib/display-format'

export function WorkspacePreview() {
  const search=useRouterState({select:s=>s.location.search as Record<string,unknown>})
  const dark=search.theme==='dark',pseudo=search.pseudo===true||search.pseudo==='true'
  useEffect(()=>{document.documentElement.classList.toggle('dark',dark);document.documentElement.style.colorScheme=dark?'dark':'light'},[dark])
  return <CustomerLocaleContext.Provider value={{customer:true,pseudo,locale:'en-US'}}><WorkspaceExample view={String(search.view??'list')} pseudo={pseudo} dark={dark} /></CustomerLocaleContext.Provider>
}

function WorkspaceExample({view,pseudo,dark}:{view:string;pseudo:boolean;dark:boolean}) {
  const [open,setOpen]=useState(view==='modal'),[search,setSearch]=useState(''),[status,setStatus]=useState(''),[notice,setNotice]=useState('')
  const title=pseudo?'EXAMPLE-SAMPLE-ABCDEFGHIJKLMNOPQRSTUVWXYZ-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ-0123456789':'EXAMPLE-SAMPLE-20261022'
  const form=useForm({defaultValues:{reference:title,category:'research',verified:false},mode:'onTouched'})
  const text=(value:string)=>pseudo?pseudolocalize(value):value
  const href=(next:string)=>`/workspace-preview?view=${next}&theme=${dark?'dark':'light'}&pseudo=${pseudo}`
  const visible=(!search||title.toLowerCase().includes(search.toLowerCase()))&&(!status||status==='OutputReview')
  const detail=view!=='list'
  return <div className="min-h-screen bg-background text-foreground">
    <header className="border-b bg-card px-4 py-5"><div className="page-wrap text-sm font-semibold">Phaeno Portal · {text('Fictional record workspace')}</div></header>
    <main data-testid="workspace-preview" className="page-wrap space-y-6 px-4 py-6">
      <BackLink asChild><a href={detail?href('list'):'/'}>{text(detail?'Back to samples':'Back to component gallery')}</a></BackLink>
      <PageHeader title={detail?title:text('Samples')} description={text('Review recorded inputs, processing status, and retained evidence.')} status={detail?<OrderStatusBadge status="OutputReview" />:undefined} actions={detail?<Button variant="outline" onClick={()=>setOpen(true)}>{text('Edit example record')}</Button>:undefined} />
      {notice?<p role="status" className="text-sm">{notice}</p>:null}
      {detail?<section aria-labelledby="example-summary-heading" className="space-y-4 rounded-lg border bg-card p-4">
        <DetailHeading id="example-summary-heading">{text('Record summary')}</DetailHeading>
        <DetailSummary><DetailField label={text('Sample reference')} value={title} mono /><DetailField label={text('File size')} value={formatByteSize(1572864)} /><DetailField label={text('Last updated')} value={formatDisplayTimestamp('2026-10-22T14:05:07Z',{timeZone:'UTC',seconds:true})} /><DetailField label={text('Recorded count')} value={0} /><DetailField label={text('Recall flagged')} value={false} /><DetailField label={text('Notes')} value={null} /></DetailSummary>
        <p className="text-sm text-muted-foreground">{text('Processing completion does not replace scientific review or result release.')}</p>
      </section>:<section aria-label={text('Sample list')} className="rounded-lg border bg-card p-4">
        <ListToolbar><Field><Label htmlFor="workspace-search">{text('Find samples')}</Label><Input id="workspace-search" value={search} onChange={e=>setSearch(e.target.value)} /></Field><Field><Label htmlFor="workspace-status">{text('Status')}</Label><NativeSelect id="workspace-status" value={status} onChange={e=>setStatus(e.target.value)}><option value="">{text('All statuses')}</option><option value="OutputReview">{text('Output review')}</option><option value="Completed">{text('Completed')}</option></NativeSelect></Field><ClearFiltersButton disabled={!search&&!status} onClick={()=>{setSearch('');setStatus('')}} /></ListToolbar>
        {visible?<RecordList aria-label={text('Matching samples')}><RecordListItem title={<RecordLink asChild><a href={href('detail')}>{title}</a></RecordLink>} metadata={<>{text('Verified inputs')} · {formatByteSize(1572864)}</>} status={<OrderStatusBadge status="OutputReview" />} /><RecordListItem title={<RecordLink asChild><a href={href('detail')}>EXAMPLE-SAMPLE-20261021</a></RecordLink>} metadata={<>{text('Retained evidence')} · {formatByteSize(1024)}</>} status={<OrderStatusBadge status="Completed" />} /></RecordList>:<EmptyState title={text('No matching samples')} kind="no-results">{text('Clear all filters to see the recorded samples.')}</EmptyState>}
        <RecordPagination label="Example workspace pages" data={{page:1,pageSize:10,totalCount:visible?2:0}} busy={false} onPage={()=>undefined} />
      </section>}
    </main>
    <GuardedFormDialog open={open} onOpenChange={setOpen} dirty={form.formState.isDirty} pending={form.formState.isSubmitting}>
      <DialogContent><DialogHeader><DialogTitle>{text('Edit example record')}</DialogTitle><DialogDescription>{text('Update this fictional record while preserving its evidence.')}</DialogDescription></DialogHeader>
        <form id="workspace-form" noValidate className="space-y-4" onSubmit={form.handleSubmit(v=>{setNotice(text(`Saved ${v.reference} locally.`));form.reset(v);setOpen(false)})}>
          <Field><Label htmlFor="workspace-reference"><RequiredFieldName>{text('Sample reference')}</RequiredFieldName></Label><Input id="workspace-reference" required {...form.register('reference',{required:text('Enter a sample reference.')})} aria-invalid={Boolean(form.formState.errors.reference)} aria-describedby="workspace-reference-error" /><FieldError id="workspace-reference-error">{form.formState.errors.reference?.message}</FieldError></Field>
          <Field><Label htmlFor="workspace-category">{text('Category')}</Label><NativeSelect id="workspace-category" {...form.register('category')}><option value="research">{text('Research')}</option><option value="laboratory">{text('Laboratory')}</option></NativeSelect></Field>
          <Label><NativeCheckbox {...form.register('verified')} />{text('I reviewed this record and its retained evidence before saving.')}</Label>
        </form>
        <RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline"><CustomerSourceText source="Cancel" /></Button></DialogClose><Button form="workspace-form" type="submit" disabled={!form.formState.isDirty||form.formState.isSubmitting}><CustomerSourceText source="Save changes" /></Button></RequiredDialogFooter>
      </DialogContent>
    </GuardedFormDialog>
  </div>
}
