import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, CheckCircle2, Info, LoaderCircle } from 'lucide-react'
import { BackLink } from '#/components/ui/back-link'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Field, FieldDescription, FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { Input } from '#/components/ui/input'
import { NativeSelect } from '#/components/ui/native-select'
import { SearchableSelect } from '#/components/ui/searchable-select'
import { Textarea } from '#/components/ui/textarea'
import { RequiredFieldName, RequiredLegend } from '#/components/ui/required-field'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogReturnFocus, DialogTitle } from '#/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { recordLinkClassName } from '#/components/ui/record-link'
import { HeaderExamples } from './HeaderExamples'
import { ListExamples } from './ListExamples'
import { GuardedFormExample } from './GuardedFormExample'
import { FeedbackExamples } from './FeedbackExamples'
import { ControlExamples } from './ControlExamples'
import { StandardizationExamples } from './StandardizationExamples'

const sections = [
  ['navigation', 'Return navigation'], ['buttons', 'Buttons'], ['fields', 'Fields and validation'],
  ['actions', 'Record actions'], ['tabs', 'Tabs'], ['feedback', 'Feedback'], ['tokens', 'Theme tokens'],
  ['headers', 'Page headers'], ['lists', 'Lists and tables'], ['guarded-forms', 'Guarded forms'],
  ['async-feedback', 'Loading and recovery'], ['controls', 'More controls'], ['app-navigation', 'Application navigation'],
  ['standardization', 'Data, status and form standards'], ['page-previews', 'Complete page examples'],
] as const

function GallerySection({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6 space-y-4 border-t pt-6" data-gallery-section={id}>
    <div><h2 id={`${id}-title`} className="text-xl font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
    {children}
  </section>
}

export function ComponentGallery() {
  const [theme, setTheme] = useState('light')
  const [width, setWidth] = useState('full')
  const [message, setMessage] = useState('All examples use fictional data and stay in this browser.')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
  }, [theme])

  return <div className="min-h-screen bg-background text-foreground [--gallery-reference:1]">
    <a href="#gallery-content" className="sr-only focus:not-sr-only focus:block focus:p-4">Skip to component examples</a>
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-5 p-4 sm:p-6">
        <div className="max-w-xl"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phaeno Portal · design reference</p><h1 className="mt-2 text-3xl font-semibold">Component gallery</h1><p className="mt-2 text-sm text-muted-foreground">The actual shared components, with their standard spacing, states and interactions.</p></div>
        <div className="flex flex-wrap gap-4">
          <Field><Label htmlFor="gallery-theme">Theme</Label><NativeSelect id="gallery-theme" value={theme} onChange={event => setTheme(event.target.value)}><option value="light">Light</option><option value="dark">Dark</option></NativeSelect></Field>
          <Field><Label htmlFor="gallery-width">Content width</Label><NativeSelect id="gallery-width" value={width} onChange={event => setWidth(event.target.value)}><option value="full">Available width</option><option value="390">390 px</option><option value="320">320 px</option></NativeSelect></Field>
        </div>
      </div>
    </header>
    <main id="gallery-content" tabIndex={-1} className="mx-auto max-w-6xl p-4 sm:p-6">
      <nav aria-label="Gallery sections" className="mb-6 flex flex-wrap gap-x-5 gap-y-3">{sections.map(([id, title]) => <a key={id} href={`#${id}`} className={recordLinkClassName}>{title}</a>)}</nav>
      <p className="mb-6 text-sm text-muted-foreground" role="status" aria-live="polite" data-testid="gallery-notice">{message}</p>
      <div data-testid="gallery-preview" className="@container mx-auto w-full space-y-8" style={{ maxWidth: width === 'full' ? undefined : `${width}px` }}>
        <GallerySection id="navigation" title="Return navigation" description="One arrow, one destination, the same typography and focus treatment. Long labels wrap.">
          <div className="grid gap-4 @min-[40rem]:grid-cols-2">
            <Card><CardContent className="space-y-5 pt-5"><BackLink asChild><a href="#navigation?listPage=3">Back to companies</a></BackLink><h3 className="text-lg font-semibold">Company example</h3></CardContent></Card>
            <Card><CardContent className="space-y-5 pt-5"><BackLink asChild><a href="#navigation?assemblyPage=2">Back to sequencing assembly</a></BackLink><h3 className="text-lg font-semibold">Assembly example</h3></CardContent></Card>
          </div>
          <div className="flex flex-wrap gap-2"><BackLink asChild><a href="#navigation">Back to the originating laboratory workflow for specimen EXAMPLE-ABCDEFGHIJKLMNOPQRSTUVWXYZ-0123456789</a></BackLink><BackLink disabled>Back to workflow while saving</BackLink></div>
        </GallerySection>
        <GallerySection id="buttons" title="Buttons" description="Independent examples of emphasis and state. Contextual record commands belong in Actions.">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setMessage('Primary example activated.')}>Primary example</Button>
            <Button variant="outline" onClick={() => setMessage('Secondary example activated.')}>Secondary example</Button>
            <Button variant="ghost" onClick={() => setMessage('Quiet example activated.')}>Quiet example</Button>
            <Button variant="destructive" onClick={() => setMessage('Destructive styling example activated; no record was changed.')}>Destructive example</Button>
            <Button disabled>Unavailable example</Button>
            <Button disabled aria-busy="true"><LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />Saving example…</Button>
          </div>
        </GallerySection>
        <GallerySection id="fields" title="Fields and validation" description="Shared Field spacing, aligned single-line controls, required markers and contextual errors.">
          <ExampleForm onSaved={() => setMessage('Fictional example saved locally. No application record was created.')} />
          <div className="grid gap-4 @min-[40rem]:grid-cols-2">
            <Field><Label htmlFor="gallery-disabled">Unavailable field</Label><FieldDescription id="gallery-disabled-help">Read-only example while a save is in progress.</FieldDescription><Input id="gallery-disabled" value="Example retained value" disabled aria-describedby="gallery-disabled-help" /></Field>
            <SearchExample />
          </div>
        </GallerySection>
        <GallerySection id="actions" title="Record actions and confirmation" description="Several commands share one Actions menu; one ordinary command is direct. Cancellation retains its approved neutral menu.">
          <div className="grid gap-4 @min-[40rem]:grid-cols-2">
            <Card><CardHeader><CardTitle>Example record</CardTitle><CardDescription>Multiple contextual commands</CardDescription><CardAction><ActionMenu><DropdownMenuTrigger asChild><Button variant="outline">Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setMessage('Example edit selected.')}>Edit example</DropdownMenuItem><DropdownMenuItem disabled>Assign example (unavailable)</DropdownMenuItem></DropdownMenuContent></ActionMenu></CardAction></CardHeader></Card>
            <Card><CardHeader><CardTitle>Single available command</CardTitle><CardDescription>Shared menu automatically renders it directly</CardDescription><CardAction><ActionMenu><DropdownMenuTrigger asChild><Button variant="outline">Actions</Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onSelect={() => setMessage('Example details opened.')}>View example</DropdownMenuItem></DropdownMenuContent></ActionMenu></CardAction></CardHeader></Card>
          </div>
          <ConfirmationExample onConfirmed={() => setMessage('Fictional cancellation confirmed locally. No workflow was cancelled.')} />
        </GallerySection>
        <GallerySection id="tabs" title="Record tabs" description="Shared sizing and keyboard behavior; feature pages arrange the tabs without overriding their controls.">
          <Tabs defaultValue="overview"><TabsList aria-label="Example record sections" className="flex w-full flex-wrap justify-start"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="samples">Samples and scientific context</TabsTrigger><TabsTrigger value="history" disabled>History (unavailable)</TabsTrigger></TabsList><TabsContent value="overview"><p className="py-3">The view-first record summary appears here.</p></TabsContent><TabsContent value="samples"><p className="py-3">Related samples appear here.</p></TabsContent></Tabs>
        </GallerySection>
        <GallerySection id="feedback" title="Status and feedback" description="Use text with semantic colors and icons; show unavailable and error states distinctly.">
          <div className="flex flex-wrap gap-2"><Badge>In progress</Badge><Badge variant="secondary">Draft</Badge><Badge variant="outline">Completed</Badge><Badge variant="destructive">Needs correction</Badge></div>
          <Alert><Info aria-hidden="true" /><AlertTitle>Informational example</AlertTitle><AlertDescription>Saved context remains available while related information refreshes.</AlertDescription></Alert>
          <Alert variant="warning"><AlertTriangle aria-hidden="true" /><AlertTitle>Review required</AlertTitle><AlertDescription>Review the recorded scope before continuing.</AlertDescription></Alert>
          <Alert variant="destructive"><AlertTriangle aria-hidden="true" /><AlertTitle>Example could not be saved</AlertTitle><AlertDescription>Your entries are retained. Correct the highlighted field and try again.</AlertDescription></Alert>
          <p className="flex items-center gap-2 text-sm"><CheckCircle2 aria-hidden="true" className="size-4" />Completed successfully</p>
        </GallerySection>
        <GallerySection id="tokens" title="Semantic theme tokens" description="Use the application palette rather than inventing per-page colors.">
          <div className="grid gap-3 @min-[40rem]:grid-cols-2">
            <div className="rounded-lg border bg-background p-4 text-foreground">Background / foreground</div>
            <div className="rounded-lg border bg-card p-4 text-card-foreground">Card / card foreground</div>
            <div className="rounded-lg bg-primary p-4 text-primary-foreground">Primary / primary foreground</div>
            <div className="rounded-lg bg-muted p-4 text-muted-foreground">Muted / muted foreground</div>
            <div className="rounded-lg bg-secondary p-4 text-secondary-foreground">Secondary / secondary foreground</div>
            <div className="rounded-lg bg-accent p-4 text-accent-foreground">Accent / accent foreground</div>
            <div className="rounded-lg border bg-popover p-4 text-popover-foreground">Popover / popover foreground</div>
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">Destructive feedback</div>
          </div>
        </GallerySection>
        <GallerySection id="headers" title="Page headers" description="One shared title hierarchy, wrapping status/context and trailing actions."><HeaderExamples /></GallerySection>
        <GallerySection id="lists" title="Lists and tables" description="Shared record links, flat rows, filters, responsive tables and real pagination."><ListExamples /></GallerySection>
        <GallerySection id="guarded-forms" title="Guarded form dialogs" description="The actual draft guard, discard confirmation, required footer and retained input after a failed save."><GuardedFormExample /></GallerySection>
        <GallerySection id="async-feedback" title="Loading, empty states and recovery" description="Initial loading, retained-data refresh, setup, permissions, errors and progress have distinct presentations."><FeedbackExamples /></GallerySection>
        <GallerySection id="controls" title="Additional shared controls" description="Control sizes, icon names, checkbox wrapping, selection, dates, view toggles and disabled states."><ControlExamples /></GallerySection>
        <GallerySection id="app-navigation" title="Application navigation" description="Inspect the actual main navigation, mobile user tray and responsive workspace sidebar in an isolated full-page example."><a href="/navigation-preview" className={recordLinkClassName}>Open application navigation example</a></GallerySection>
        <GallerySection id="standardization" title="Data, status and form standards" description="Registered native controls, explicit status semantics, truthful units, calendar days, timestamps, missing values and both pagination contracts."><StandardizationExamples /></GallerySection>
        <GallerySection id="page-previews" title="Complete page examples" description="Assembled list, detail and guarded-modal patterns with fictional data, long identifiers and expanded Customer text."><div className="flex flex-wrap gap-4">{['list','detail','modal'].map(view=><a key={view} href={`/workspace-preview?view=${view}`} className={recordLinkClassName}>Open {view} page example</a>)}<a href="/workspace-preview?view=detail&pseudo=true" className={recordLinkClassName}>Open expanded Customer example</a></div></GallerySection>
      </div>
    </main>
    <footer className="mx-auto max-w-6xl p-4 text-sm text-muted-foreground sm:p-6">Local engineering reference · fictional examples · no API connection</footer>
  </div>
}

const schema = z.object({ reference: z.string().trim().min(1, 'Enter an example sample reference.'), workflow: z.string().min(1), notes: z.string() })
function ExampleForm({ onSaved }: { onSaved: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), mode: 'onTouched', defaultValues: { reference: '', workflow: 'RNA', notes: '' } })
  return <form noValidate onSubmit={handleSubmit(onSaved)} className="space-y-4">
    <div className="grid items-start gap-4 @min-[40rem]:grid-cols-2" data-testid="aligned-fields">
      <Field><Label htmlFor="gallery-reference"><RequiredFieldName>Sample reference</RequiredFieldName></Label><FieldDescription id="gallery-reference-help">Use a fictional sample identifier.</FieldDescription><Input id="gallery-reference" required aria-invalid={Boolean(errors.reference)} aria-describedby={`gallery-reference-help${errors.reference ? ' gallery-reference-error' : ''}`} {...register('reference')} />{errors.reference ? <FieldError id="gallery-reference-error">{errors.reference.message}</FieldError> : null}</Field>
      <Field><Label htmlFor="gallery-workflow"><RequiredFieldName>Processing workflow</RequiredFieldName></Label><FieldDescription id="gallery-workflow-help">Choose an example workflow.</FieldDescription><NativeSelect id="gallery-workflow" required aria-describedby="gallery-workflow-help" {...register('workflow')}><option value="RNA">RNA analysis</option><option value="DNA">DNA analysis</option></NativeSelect></Field>
    </div>
    <Field><Label htmlFor="gallery-notes">Optional notes</Label><Textarea id="gallery-notes" {...register('notes')} /></Field>
    <div className="flex flex-wrap items-center justify-between gap-3"><RequiredLegend /><Button type="submit">Create example</Button></div>
  </form>
}

function SearchExample() {
  const [value, setValue] = useState('')
  return <Field><Label htmlFor="gallery-search">Searchable selection</Label><FieldDescription id="gallery-search-help">Search fictional departments.</FieldDescription><SearchableSelect id="gallery-search" aria-describedby="gallery-search-help" value={value} onValueChange={setValue} options={[{ value: 'example-a', label: 'Example research' }, { value: 'example-b', label: 'Example laboratory' }]} placeholder="Find an example department" emptyMessage="No example departments." resultsLabel="Example departments" selectionMessage="Select an example department." noMatchMessage="No matching example departments." /></Field>
}

function ConfirmationExample({ onConfirmed }: { onConfirmed: () => void }) {
  const [open, setOpen] = useState(false)
  const cancel = useRef<HTMLButtonElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  return <div className="space-y-3"><p className="text-sm text-muted-foreground">Cancellation example: one exceptional action stays in its neutral Actions menu.</p>
    <DialogReturnFocus target={trigger.current}>
    <Dialog open={open} onOpenChange={setOpen}>
      <ActionMenu keepSingleActionInMenu><DropdownMenuTrigger asChild><Button ref={trigger} variant="outline" aria-label="Cancellation example actions">Actions</Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem variant="destructive" onSelect={() => setOpen(true)}>Request example cancellation</DropdownMenuItem></DropdownMenuContent></ActionMenu>
      <DialogContent onOpenAutoFocus={event => { event.preventDefault(); cancel.current?.focus() }}>
        <DialogHeader><DialogTitle>Cancel fictional example?</DialogTitle></DialogHeader>
        <div><DialogDescription>This demonstration affects only the fictional example. A real cancellation could stop unfinished work; review its scope before confirming.</DialogDescription></div>
        <DialogFooter><Button ref={cancel} variant="outline" onClick={() => setOpen(false)}>Keep example</Button><Button variant="destructive" onClick={() => { onConfirmed(); setOpen(false) }}>Cancel fictional example</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    </DialogReturnFocus>
  </div>
}
