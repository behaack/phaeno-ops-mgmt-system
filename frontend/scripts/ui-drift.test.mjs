import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectUiSource, compareUiBaseline } from './ui-drift.mjs'

test('custom titled panels and raw loading paragraphs cannot bypass shared presentation', () => {
  const source = `<section className="rounded-lg border p-4"><h2>Results</h2><p role="status">Loading results…</p></section>`
  const rules = inspectUiSource(source, 'src/features/example/Results.tsx').map(d => d.rule)
  assert.ok(rules.includes('shared-section-panel'))
  assert.ok(rules.includes('shared-loading-state'))
  assert.ok(inspectUiSource(`<div className="rounded-md border"><div><h3>Scope</h3><button>Edit</button></div></div>`, 'src/features/example/Scope.tsx').some(d => d.rule === 'shared-section-panel'))
})

test('scientific instruction documents and ordinary headings retain their own hierarchy', () => {
  assert.equal(inspectUiSource(`<article className="procedure-document"><div className="rounded-lg border"><h3>Instruction</h3></div></article>`, 'src/features/example/Procedure.tsx').length, 0)
  assert.equal(inspectUiSource(`<section className="border-t"><h2>Notes</h2></section>`, 'src/features/example/Notes.tsx').length, 0)
  assert.equal(inspectUiSource(`<div role="status" className="rounded-lg border"><h2>No records</h2></div>`, 'src/features/example/Empty.tsx').length, 0)
})

test('shared section heading ownership includes aliases and inline appearance overrides',()=>{
  const imports=`import { SectionPanel as Panel } from '#/components/ui/section-panel';`
  assert.deepEqual(inspectUiSource(`${imports}<Panel heading={<h3 id="scope">Scope</h3>} className="mt-3" />`,'src/features/example/Scope.tsx'),[])
  assert.deepEqual(inspectUiSource(`${imports}<Panel heading={<h3 className="rounded focus-visible:outline-2">Scope</h3>} />`,'src/features/example/Scope.tsx'),[])
  for(const heading of ['<h3 className="bg-muted px-4">Scope</h3>','<h3 style={{fontSize:20}}>Scope</h3>','<h3 className="text-lg">Scope</h3>'])assert.ok(inspectUiSource(`${imports}<Panel heading={${heading}} />`,'src/features/example/Scope.tsx').some(d=>d.rule==='section-panel-appearance'))
})

const router = `import { Link as RouteLink } from '@tanstack/react-router';`
const back = `import { BackLink as ReturnLink } from '#/components/ui/back-link';`
const menus = `import { ActionMenu, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '#/components/ui/dropdown-menu';`
const inspect = (code, messages) => inspectUiSource(code, 'src/features/example.tsx', messages)

test('panel and table shading are owned by shared primitives, including import aliases and class constants',()=>{
  assert.equal(inspect('<thead><tr><th scope="col">Name</th></tr></thead>')[0].rule,'shared-table-header')
  assert.equal(inspect(`import {CardHeader as Heading} from '#/components/ui/card'; const local='bg-white px-7'; <Heading className={local}>Title</Heading>`)[0].rule,'panel-header-appearance')
  assert.equal(inspect(`import {RecordTableHeader as Head} from '#/components/ui/record-list'; <Head className="bg-white"/>`)[0].rule,'table-header-appearance')
  assert.deepEqual(inspect(`import {CardHeader} from '#/components/ui/card'; import {RecordTableHeader} from '#/components/ui/record-list'; <CardHeader><div className="flex gap-3">Title</div></CardHeader>; <RecordTableHeader><tr><th scope="col">Name</th></tr></RecordTableHeader>`),[])
})
test('raw timestamp formatting and raw status badges cannot bypass owned display rules',()=>{
  assert.equal(inspect(`const evidenceDate=value=>new Date(value).toLocaleString()`)[0].rule,'shared-timestamp')
  assert.equal(inspect(`const date=value=>new Intl.DateTimeFormat('en-US').format(new Date(value))`)[0].rule,'shared-timestamp')
  assert.equal(inspect(`import {Badge as Pill} from '#/components/ui/badge'; <Pill>{task.status}</Pill>`)[0].rule,'domain-status')
  assert.equal(inspect(`import {Badge} from '#/components/ui/badge'; <Badge>{accessLabel(person.portalAccessState)}</Badge>`)[0].rule,'domain-status')
  assert.equal(inspect(`import {StatusBadge as Pill} from '#/components/ui/status-badge'; <Pill tone="info" className="bg-white">Active</Pill>`)[0].rule,'status-appearance')
  assert.deepEqual(inspect(`import {Badge} from '#/components/ui/badge'; <Badge>Simulated</Badge>`),[])
})

test('detects an arrowless return even with an aliased router import', () => {
  assert.deepEqual(inspect(`${router} <RouteLink to="/">Back to samples</RouteLink>`).map(d => d.rule), ['shared-back-link'])
})
test('detects localized return text, not just English JSX literals', () => {
  const code = `${router} import { CustomerText as Message } from '#/features/customer-i18n/customer-text'; <RouteLink to="/"><Message message="return" /></RouteLink>`
  assert.equal(inspect(code, { return: 'Back to samples' })[0].rule, 'shared-back-link')
})
test('detects translated-source anchors and native callback buttons', () => {
  assert.equal(inspect(`<button onClick={leave}>Back to batch</button>`)[0].rule, 'shared-back-link')
  assert.equal(inspect(`import { CustomerSourceText as Text } from '#/features/customer-i18n/customer-text'; <a href="/"><Text source="Return to workflow" /></a>`)[0].rule, 'shared-back-link')
})
test('permits a typed link composed with the canonical shared control', () => {
  assert.deepEqual(inspect(`${router}${back} <ReturnLink asChild><RouteLink to="/" search={{ page: 3 }}>Back to samples</RouteLink></ReturnLink>`), [])
})
test('does not trust a local lookalike named BackLink', () => {
  assert.equal(inspect(`${router} <BackLink><RouteLink to="/">Back to samples</RouteLink></BackLink>`)[0].rule, 'shared-back-link')
})
test('rejects visual overrides on either the shared control or its link', () => {
  for (const code of [`<ReturnLink className={custom}>Return</ReturnLink>`, `<ReturnLink asChild><a href="/" style={{ color: 'red' }}>Return</a></ReturnLink>`]) assert.equal(inspect(`${back}${code}`)[0].rule, 'back-link-appearance')
})
test('rejects duplicate arrows including aliased icon imports', () => {
  assert.equal(inspect(`${back} import { ArrowLeft as Icon } from 'lucide-react'; <ReturnLink><Icon />Back to samples</ReturnLink>`)[0].rule, 'back-link-arrow')
  assert.equal(inspect(`${back} <ReturnLink>← Back to samples</ReturnLink>`)[0].rule, 'back-link-arrow')
})
test('does not confuse modal steps, pagination or prose with page returns', () => {
  assert.deepEqual(inspect(`import { DialogContent } from '#/components/ui/dialog'; <DialogContent><button>Back to step</button></DialogContent>; <a href="/">Previous</a>; <a href="/">Read about return to service</a>`), [])
})
test('diagnoses a composed back button only once', () => {
  const code = `${router} import { Button } from '#/components/ui/button'; <Button asChild><RouteLink to="/">Back to samples</RouteLink></Button>`
  assert.equal(inspect(code).length, 1)
})
test('rejects contextual Actions implemented with a plain dropdown', () => {
  assert.equal(inspect(`${menus}<DropdownMenu><DropdownMenuTrigger><button aria-label="Actions for sample">Actions</button></DropdownMenuTrigger></DropdownMenu>`)[0].rule, 'shared-action-menu')
  assert.equal(inspect(`${menus}<DropdownMenu><DropdownMenuTrigger><button aria-label={translate('actions')}><Icon /></button></DropdownMenuTrigger></DropdownMenu>`, { actions: 'Actions for {p0}' })[0].rule, 'shared-action-menu')
})
test('ordinary navigation dropdowns and standard Actions are permitted', () => {
  assert.deepEqual(inspect(`${menus}<DropdownMenu><DropdownMenuTrigger><button>More</button></DropdownMenuTrigger></DropdownMenu>; <ActionMenu><DropdownMenuTrigger><button>Actions</button></DropdownMenuTrigger></ActionMenu>`), [])
})
test('rejects a manually supplied Actions chevron but allows option icons', () => {
  const imports = `${menus} import { ChevronDown as Arrow } from 'lucide-react';`
  assert.equal(inspect(`${imports}<ActionMenu><DropdownMenuTrigger><button>Actions<Arrow /></button></DropdownMenuTrigger></ActionMenu>`)[0].rule, 'action-menu-indicator')
  assert.deepEqual(inspect(`${imports}<ActionMenu><DropdownMenuTrigger><button>Actions</button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem><Arrow />Move down</DropdownMenuItem></DropdownMenuContent></ActionMenu>`), [])
})
test('rejects responsive/conditional tab-size overrides while permitting layout', () => {
  const imports = `import { TabsTrigger as Tab } from '#/components/ui/tabs';`
  for (const classes of [`"sm:h-10"`, `"text-[13px]"`, `dense ? 'py-1' : 'py-2'`, `cn('w-full', 'font-bold')`]) assert.equal(inspect(`${imports}<Tab value="one" className={${classes}}>One</Tab>`)[0].rule, 'shared-tab-sizing')
  assert.deepEqual(inspect(`${imports}<Tab value="one" className="w-full min-w-0">One</Tab>`), [])
})
test('rejects inline tab typography and native browser confirmations', () => {
  assert.equal(inspect(`import { TabsTrigger } from '#/components/ui/tabs'; <TabsTrigger style={{ fontSize: 12 }}>One</TabsTrigger>`)[0].rule, 'shared-tab-sizing')
  for (const call of [`window.confirm('sure?')`, `globalThis['confirm']('sure?')`]) assert.equal(inspect(call)[0].rule, 'portal-confirmation')
  assert.deepEqual(inspect(`function confirm() {}; confirm(); confirmPortal({ title: 'Review' })`), [])
})
test('keeps the gallery out of production imports and routes', () => {
  assert.equal(inspect(`import { ComponentGallery } from '../../ui-gallery/ComponentGallery'`)[0].rule, 'gallery-isolation')
  assert.equal(inspect(`<a href="/ui-gallery/">Gallery</a>`)[0].rule, 'gallery-isolation')
  assert.equal(inspect(`<a href="/navigation-preview">Navigation example</a>`)[0].rule,'gallery-isolation')
})
test('parses generic TypeScript helpers without treating them as JSX', () => {
  const source = `const identity = <T>(value: T) => value; window.confirm('Discard?')`
  assert.equal(inspectUiSource(source, 'src/features/helper.ts')[0].rule, 'portal-confirmation')
})
test('baseline permits only the exact reviewed occurrence count', () => {
  const d = inspect(`<button>Return to active tube</button>`)[0]
  const allowance = { ...d, count: 1, reason: 'A scanner step, not page navigation.' }
  assert.deepEqual(compareUiBaseline([d], [allowance]), [])
  assert.equal(compareUiBaseline([d, d], [allowance]).length, 1)
  assert.equal(compareUiBaseline([], [allowance]).length, 1)
  assert.equal(compareUiBaseline([{ ...d, fingerprint: 'changed' }], [allowance]).length, 2)
})
test('baseline rejects missing explanations and duplicates', () => {
  const d = inspect(`<button>Back to samples</button>`)[0]
  assert.ok(compareUiBaseline([d], [{ ...d, count: 1 }]).some(f => f.startsWith('Invalid')))
  const allowance = { ...d, count: 1, reason: 'Reviewed' }
  assert.ok(compareUiBaseline([d], [allowance, allowance]).some(f => f.startsWith('Invalid')))
})

test('requires shared page headings but leaves article headings and auth presentation scoped', () => {
  assert.equal(inspect('<h1 id="sample" tabIndex={-1}>Samples</h1>')[0].rule,'shared-page-title')
  assert.deepEqual(inspectUiSource('<h1>Guide article</h1>','ui-gallery/example.tsx'),[])
  assert.deepEqual(inspectUiSource('<h1>Sign in</h1>','src/features/auth/example.tsx'),[])
  assert.deepEqual(inspect('<article data-print-document><h1>Printed packet</h1></article>'),[])
})

test('shared heading permits layout/identifier fonts and rejects visual overrides', () => {
  const imports=`import { PageTitle as Title } from '#/components/ui/page-header';`
  assert.deepEqual(inspect(`${imports}<Title id="sample" className="mt-2 font-mono">Sample</Title>`),[])
  assert.equal(inspect(`${imports}<Title className="sm:text-3xl">Sample</Title>`)[0].rule,'page-title-appearance')
  assert.equal(inspect(`${imports}<Title style={{fontSize:12}}>Sample</Title>`)[0].rule,'page-title-appearance')
})

test('detects aliased record-title links without matching ordinary navigation or actions', () => {
  assert.equal(inspect(`${router}<RouteLink to="/samples/$sampleId">{sample.name}</RouteLink>`)[0].rule,'shared-record-link')
  assert.deepEqual(inspect(`${router}<RouteLink to="/samples">Samples</RouteLink>`),[])
  assert.deepEqual(inspect(`${router}import { Button } from '#/components/ui/button';<Button asChild><RouteLink to="/samples/$sampleId">{sample.name}</RouteLink></Button>`),[])
})

test('record link preserves composition and rejects class/style drift including aliases', () => {
  const imports=`${router}import { RecordLink as Identifier } from '#/components/ui/record-link';`
  assert.deepEqual(inspect(`${imports}<Identifier asChild><RouteLink to="/samples/$sampleId" search={previous=>previous}>{sample.name}</RouteLink></Identifier>`),[])
  assert.equal(inspect(`${imports}<Identifier className="underline">Sample</Identifier>`)[0].rule,'record-link-appearance')
  assert.equal(inspect(`${imports}<Identifier asChild><RouteLink to="/samples/$sampleId" style={{color:'red'}}>{sample.name}</RouteLink></Identifier>`)[0].rule,'record-link-appearance')
})

test('recognizes record-route helper aliases and route-owned page headings',()=>{
  const helper=`${router} import { commercialRecordRoute as target } from '#/features/orders/order-navigation';`
  assert.equal(inspect(`${helper}<RouteLink to={target(workflow)}>{item.number}</RouteLink>`)[0].rule,'shared-record-link')
  assert.equal(inspectUiSource('<h1>People</h1>','src/routes/people.tsx')[0].rule,'shared-page-title')
})

test('native form controls use shared presentation without changing native events',()=>{
  assert.equal(inspect('<select name="role" defaultValue="Member"><option>Member</option></select>')[0].rule,'shared-native-select')
  assert.equal(inspect('<input type="checkbox" {...register("confirmed")} />')[0].rule,'shared-native-checkbox')
  assert.deepEqual(inspect(`import { NativeCheckbox as Check } from '#/components/ui/native-checkbox';<Check checked={value} onChange={e=>change(e.target.checked)} />`),[])
  assert.equal(inspect(`import { NativeSelect as Select } from '#/components/ui/native-select';<Select className="md:h-9" />`)[0].rule,'native-control-appearance')
  assert.equal(inspect(`import { NativeSelect } from '#/components/ui/native-select';const control='h-9 px-3';<NativeSelect className={control} />`)[0].rule,'native-control-appearance')
  assert.equal(inspect(`import { Input } from '#/components/ui/input';<Input className="h-9" />`)[0].rule,'single-line-control-size')
  assert.deepEqual(inspect(`import { Input } from '#/components/ui/input';<Input controlSize="touch" />`),[])
})
test('required markers and filter reset controls retain the shared treatment',()=>{
  assert.equal(inspect('<Label>Name *</Label>')[0].rule,'shared-required-marker')
  assert.equal(inspect('<Button onClick={clear}>Clear filters</Button>')[0].rule,'shared-clear-filters')
  assert.deepEqual(inspect(`import { ClearFiltersButton } from '#/components/ui/clear-filters-button';<ClearFiltersButton disabled={!active} onClick={clear} />`),[])
})
test('display helpers and complete-page gallery routes cannot drift into local formatting or production',()=>{
  assert.equal(inspect('function formatBytes(n) { return `${n/1024} KB` }')[0].rule,'shared-display-format')
  assert.deepEqual(inspect('function formatDate(value) { return formatDisplayDate(value) }'),[])
  assert.equal(inspectUiSource('const route="/workspace-preview"','src/routes/example.tsx')[0].rule,'gallery-isolation')
})
