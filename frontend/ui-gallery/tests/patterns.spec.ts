import AxeBuilder from '@axe-core/playwright'
import { test, expect, type Page } from '@playwright/test'

const diagnostics=new WeakMap<Page,{apiRequests:string[];errors:string[]}>()

test.beforeEach(async ({page},info)=>{
  const observed={apiRequests:[] as string[],errors:[] as string[]};diagnostics.set(page,observed)
  page.on('request',request=>{const url=new URL(request.url());if(['fetch','xhr'].includes(request.resourceType())&&(url.pathname.startsWith('/api/')||url.hostname!=='127.0.0.1'))observed.apiRequests.push(url.origin+url.pathname)})
  page.on('pageerror',error=>observed.errors.push(error.message))
  await page.goto('/')
  await page.getByLabel('Theme',{exact:true}).selectOption(info.project.use.colorScheme==='dark'?'dark':'light')
  await expect(page.getByRole('heading',{name:'Component gallery',exact:true})).toBeVisible()
})

test.afterEach(async({page})=>{
  expect(diagnostics.get(page)?.apiRequests).toEqual([])
  expect(diagnostics.get(page)?.errors).toEqual([])
})

test('record page headers share typography and keep context/actions inside narrow bounds',async({page},info)=>{
  const headings=page.locator('#headers [data-slot="page-title"]')
  await expect(headings).toHaveCount(2)
  for(const title of await headings.all())await expect(title).toHaveCSS('font-size','24px')
  await page.getByLabel('Content width',{exact:true}).selectOption('320')
  for(const header of await page.locator('#headers [data-slot="page-header"]').all())expect(await header.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
  await expect(page.getByRole('button',{name:'Example company actions'})).toBeVisible()
  await expect(page.getByRole('button',{name:'Repeat example assembly'})).toBeVisible()
  await page.locator('#headers').screenshot({path:info.outputPath('record-headers.png')})
})

test('sequencing row titles share appearance, focus and exact destinations',async({page},info)=>{
  const links=page.getByTestId('sequencing-list-comparison').getByRole('link',{name:'EXAMPLE-SAMPLE · Run 1',exact:true})
  const values=await links.evaluateAll(elements=>elements.map(el=>{const s=getComputedStyle(el);return [s.fontSize,s.fontWeight,s.color,s.textDecorationLine,s.lineHeight]}))
  expect(values).toHaveLength(2);expect(values[0]).toEqual(values[1]);expect(values[0][0]).toBe('14px');expect(values[0][3]).toBe('none')
  await links.nth(0).focus();await expect(links.nth(0)).toHaveCSS('text-decoration-line','underline')
  await links.nth(1).focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(/#lists\?assembly=example$/)
  await page.getByLabel('Content width',{exact:true}).focus()
  await page.getByTestId('sequencing-list-comparison').screenshot({path:info.outputPath('sequencing-lists-wide.png')})
  await page.getByLabel('Content width',{exact:true}).selectOption('320')
  await page.getByLabel('Content width',{exact:true}).focus()
  expect(await page.getByTestId('sequencing-list-comparison').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
  await page.getByTestId('sequencing-list-comparison').screenshot({path:info.outputPath('sequencing-lists.png')})
})

test('list filters, sorting, no-results, clear and pagination remain coherent',async({page})=>{
  const area=page.getByTestId('record-list-example')
  await expect(area.getByRole('navigation',{name:'Example sample pages'})).toContainText('Page 1 of 2')
  await area.getByRole('button',{name:'Next',exact:true}).click();await expect(area.getByRole('navigation',{name:'Example sample pages'})).toContainText('Page 2 of 2')
  await page.getByLabel('Find example samples',{exact:true}).fill('absent-record')
  await expect(area.getByText('No matching example samples',{exact:true})).toBeVisible()
  await expect(area.getByRole('navigation',{name:'Example sample pages'})).toContainText('Page 1 of 1')
  await area.getByRole('button',{name:'Clear all',exact:true}).click()
  await page.getByLabel('Example status',{exact:true}).selectOption('Ready')
  await expect(area.getByText('Active filters: Ready',{exact:true})).toBeVisible()
  await expect(area.getByRole('navigation',{name:'Example sample pages'})).toContainText('2 records')
  await page.getByLabel('Sort examples',{exact:true}).selectOption('descending')
  await expect(area.getByRole('link',{name:'Example retained sample',exact:true})).toBeVisible()
})

test('guarded dialog validates, keeps dirty input and restores focus after discard',async({page},info)=>{
  const trigger=page.getByRole('button',{name:'Edit example record',exact:true})
  await trigger.click()
  const dialog=page.getByRole('dialog',{name:'Edit fictional sample',exact:true})
  const save=dialog.getByRole('button',{name:'Save changes',exact:true})
  await expect(save).toBeDisabled()
  const reference=dialog.locator('#guarded-example-reference')
  await reference.fill('');await save.click();await expect(reference).toBeFocused();await expect(reference).toHaveAttribute('aria-invalid','true')
  await reference.fill('EXAMPLE-DRAFT')
  await expect(dialog.locator('[data-slot="dialog-footer"] [data-slot="required-legend"]')).toBeVisible()
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click()
  const confirmation=page.getByRole('dialog',{name:'Discard unsaved changes?',exact:true})
  await expect(confirmation.getByRole('button',{name:'Keep editing',exact:true})).toBeFocused()
  await confirmation.getByRole('button',{name:'Keep editing',exact:true}).click();await expect(reference).toHaveValue('EXAMPLE-DRAFT')
  await dialog.screenshot({path:info.outputPath('guarded-form.png')})
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await confirmation.getByRole('button',{name:'Discard changes',exact:true}).click()
  await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused()
})

test('failed saves retain the draft and pending saves prevent duplicate action/dismissal',async({page},info)=>{
  await page.getByLabel('Example save outcome',{exact:true}).selectOption('error')
  await page.getByRole('button',{name:'Edit example record',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Edit fictional sample',exact:true}),reference=dialog.locator('#guarded-example-reference')
  await reference.fill('EXAMPLE-RETAINED');await dialog.getByRole('button',{name:'Save changes',exact:true}).click()
  await expect(dialog.getByRole('button',{name:'Saving changes…',exact:true})).toBeDisabled()
  await page.keyboard.press('Escape');await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Example could not be saved',{exact:true})).toBeVisible();await expect(reference).toHaveValue('EXAMPLE-RETAINED')
  await dialog.screenshot({path:info.outputPath('failed-save.png')})
  await dialog.getByRole('button',{name:'Save changes',exact:true}).click();await expect(dialog).not.toBeVisible();await expect(page.getByText('Example changes saved locally.',{exact:true})).toBeVisible()
})

test('changed-record example requires explicit review and retains entered values',async({page},info)=>{
  await page.getByLabel('Example save outcome',{exact:true}).selectOption('conflict')
  await page.getByRole('button',{name:'Edit example record',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Edit fictional sample',exact:true}),reference=dialog.locator('#guarded-example-reference')
  await reference.fill('EXAMPLE-MY-DRAFT');await dialog.getByRole('button',{name:'Save changes',exact:true}).click()
  await expect(dialog.getByText('Review the changed example',{exact:true})).toBeVisible();await expect(reference).toHaveValue('EXAMPLE-MY-DRAFT')
  await expect(dialog.getByRole('button',{name:'Save changes',exact:true})).toBeDisabled()
  await dialog.screenshot({path:info.outputPath('changed-record.png')})
  await dialog.getByRole('checkbox',{name:'I reviewed the latest example and want to save my entered reference'}).check()
  await dialog.getByRole('button',{name:'Save changes',exact:true}).click();await expect(dialog).not.toBeVisible()
})

test('additional selection controls support keyboard state, clearing and accessible icon names',async({page})=>{
  const area=page.locator('#controls')
  await area.getByRole('checkbox',{name:/A long example checkbox/}).check()
  const multi=page.getByRole('combobox',{name:'Example departments',exact:true})
  await multi.click();await page.getByRole('searchbox',{name:'Search example departments',exact:true}).fill('research');await page.keyboard.press('Enter');await page.keyboard.press('Escape')
  await expect(multi).toContainText('Example research');await expect(multi).toBeFocused()
  const choice=page.getByLabel('Clearable example selection',{exact:true})
  await choice.fill('laboratory');await page.getByRole('option',{name:'Example laboratory',exact:true}).click()
  await page.getByRole('button',{name:'Clear example selection',exact:true}).click();await expect(choice).toHaveValue('')
  await area.getByRole('radio',{name:'Active examples',exact:true}).focus()
  // Radix completes roving focus while the physical arrow key is held.
  await page.keyboard.down('ArrowRight');await expect(area.getByRole('radio',{name:'Closed examples',exact:true})).toBeChecked();await page.keyboard.up('ArrowRight')
  await expect(area.getByRole('radio',{name:'Unavailable view',exact:true})).toBeDisabled()
  for(const size of ['icon-xs','icon-sm','icon','icon-lg'])await expect(area.getByRole('button',{name:`Copy ${size} example reference`,exact:true})).toBeVisible()
})

test('notification badges stay attached to the bell with a stable touch target for every count',async({page},info)=>{
  const examples=page.getByRole('group',{name:'Notification badge examples',exact:true})
  for(const [description,text] of [['0 actions',null],['1 action','1'],['12 actions','12'],['125 actions','99+'],['Count unavailable','?']] as const){
    const button=examples.getByRole('button',{name:`Example notifications, ${description}`,exact:true})
    await expect(button).toBeVisible()
    const bounds=await button.boundingBox()
    expect(bounds!.width).toBe(44);expect(bounds!.height).toBe(44)
    const badge=button.locator('[data-slot="notification-count"]')
    if(text===null){await expect(badge).toHaveCount(0);continue}
    await expect(badge).toHaveText(text)
    const badgeBounds=(await badge.boundingBox())!,icon=(await button.locator('[data-slot="work-bell-icon"]').boundingBox())!
    // The badge overlaps the bell's upper-right corner and stays inside its touch target.
    expect(badgeBounds.x).toBeLessThan(icon.x+icon.width)
    expect(badgeBounds.x+badgeBounds.width).toBeGreaterThan(icon.x+icon.width)
    expect(badgeBounds.y+badgeBounds.height).toBeGreaterThan(icon.y)
    expect(badgeBounds.y+badgeBounds.height).toBeLessThan(icon.y+icon.height/2)
    expect(badgeBounds.y-bounds!.y).toBeGreaterThanOrEqual(1)
    expect(badgeBounds.y-bounds!.y).toBeLessThanOrEqual(4)
    expect(bounds!.x+bounds!.width-badgeBounds.x-badgeBounds.width).toBeGreaterThanOrEqual(1)
    expect(bounds!.x+bounds!.width-badgeBounds.x-badgeBounds.width).toBeLessThanOrEqual(4)
    await expect(button.locator('[data-slot="work-bell-icon"]')).toHaveAttribute('aria-hidden','true')
  }
  await examples.getByRole('button',{name:'Example notifications, 1 action',exact:true}).focus()
  await page.keyboard.press('Tab')
  await expect(examples.getByRole('button',{name:'Example notifications, 12 actions',exact:true})).toBeFocused()
  await page.keyboard.press('Space')
  await expect(page.locator('#controls [role="status"]')).toContainText('12 actions notification example activated.')
  await examples.screenshot({path:info.outputPath('notification-badges.png')})
})

test('loading/recovery and measured/unmeasured progress retain distinct semantics',async({page})=>{
  const area=page.locator('#async-feedback')
  await expect(area.getByText('Previously loaded example stays visible.',{exact:true})).toBeVisible()
  await expect(area.locator('[data-slot="empty-state"]')).toHaveCount(4)
  await area.getByRole('button',{name:'Retry example records',exact:true}).click();await expect(area.getByText('Example records recovered.',{exact:true})).toBeVisible()
  await expect(area.getByRole('progressbar').nth(0)).toHaveAttribute('value','50')
  await expect(area.getByRole('progressbar').nth(1)).not.toHaveAttribute('value')
  await expect(area.getByRole('progressbar').nth(2)).toHaveAttribute('value','100')
  await expect(area.locator('[aria-current="step"]')).toContainText('Process example')
})

test('actual navigation has one primary set per viewport and supports menu/sidebar focus',async({page},info)=>{
  await page.goto(`/navigation-preview?theme=${info.project.use.colorScheme}`)
  const bell=page.getByRole('button',{name:'Example notifications, 3 actions',exact:true})
  await bell.click()
  const notifications=page.getByRole('dialog',{name:'Example notifications',exact:true})
  await expect(notifications).toBeVisible()
  await expect(notifications.locator('[data-slot="dialog-body"]')).toContainText('Three fictional actions')
  expect((await new AxeBuilder({page}).include('[role="dialog"]').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([])
  await page.keyboard.press('Escape');await expect(bell).toBeFocused()
  const narrow=page.viewportSize()!.width<1024
  if(narrow){
    const menu=page.getByRole('button',{name:'Open user menu',exact:true});await menu.click()
    await expect(page.getByRole('link',{name:'Lab ops',exact:true})).toHaveCount(1)
    await page.getByRole('button',{name:'More',exact:true}).click();await expect(page.getByRole('link',{name:'Finance',exact:true})).toBeVisible()
    const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(a11y.violations).toEqual([])
    await page.keyboard.press('Escape');await expect(menu).toBeFocused()
  }else{
    const more=page.getByRole('button',{name:'More workspaces',exact:true});await more.press('ArrowDown');await expect(page.getByRole('menuitem',{name:'Finance',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(more).toBeFocused()
    await page.getByRole('button',{name:'Unpin sidebar',exact:true}).click()
  }
  const sidebarTrigger=page.getByRole('button',{name:/^Open Example laboratory navigation/});await sidebarTrigger.click()
  await page.getByRole('navigation',{name:'Example laboratory sections',exact:true}).getByRole('button',{name:/^Sequencing assembly/}).click()
  await expect(page.getByRole('heading',{name:'Sequencing assembly',exact:true})).toBeVisible()
  if(narrow){
    const bounds=await page.getByRole('link',{name:'Back to component gallery',exact:true}).boundingBox()
    const tab=await sidebarTrigger.boundingBox()
    expect(bounds).not.toBeNull();expect(tab).not.toBeNull()
    expect(bounds!.x>=tab!.x+tab!.width||bounds!.y>=tab!.y+tab!.height||bounds!.y+bounds!.height<=tab!.y).toBe(true)
    await sidebarTrigger.click();await page.keyboard.press('Escape')
    const closed=await page.getByRole('link',{name:'Back to component gallery',exact:true}).boundingBox()
    expect(closed!.x).toBeCloseTo(bounds!.x,0)
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:info.outputPath('application-navigation.png'),fullPage:true})
})
