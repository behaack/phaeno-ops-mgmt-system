import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectUiSource, compareUiBaseline } from './ui-drift.mjs'

const router = `import { Link as RouteLink } from '@tanstack/react-router';`
const back = `import { BackLink as ReturnLink } from '#/components/ui/back-link';`
const menus = `import { ActionMenu, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '#/components/ui/dropdown-menu';`
const inspect = (code, messages) => inspectUiSource(code, 'src/features/example.tsx', messages)

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
