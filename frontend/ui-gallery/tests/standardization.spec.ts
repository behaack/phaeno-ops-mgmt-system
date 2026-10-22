import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.beforeEach(async({page},info)=>{await page.goto('/');await page.getByLabel('Theme',{exact:true}).selectOption(info.project.use.colorScheme==='dark'?'dark':'light')})

test('native registered forms keep alignment, validation, values and accessible keyboard state',async({page})=>{
  const area=page.getByRole('form',{name:'Native registered form example'}),reference=area.getByLabel('Registered reference',{exact:false}),category=area.getByLabel('Registered category')
  expect((await reference.boundingBox())!.height).toBe((await category.boundingBox())!.height)
  expect((await page.getByLabel('Touch input example').boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await reference.fill('');await area.getByRole('button',{name:'Save registered example'}).click();await expect(reference).toBeFocused();await expect(reference).toHaveAttribute('aria-invalid','true')
  await reference.fill('EXAMPLE-RETAINED');await category.selectOption('laboratory');await area.getByRole('checkbox').focus();await page.keyboard.press('Space');await area.getByRole('button',{name:'Save registered example'}).click();await expect(area.getByRole('status')).toContainText('EXAMPLE-RETAINED · laboratory · verified: true')
})
test('data/status/detail examples stay truthful and readable at 320 px',async({page})=>{
  await page.getByLabel('Content width',{exact:true}).selectOption('320')
  const area=page.locator('#standardization')
  await expect(area.getByText('1.5 KiB',{exact:true})).toBeVisible();await expect(area.getByText('0.000125',{exact:true})).toBeVisible();await expect(area.getByText('Oct 22, 2026',{exact:true})).toBeVisible();await expect(area.getByText('No',{exact:true})).toBeVisible()
  await expect(area.getByText('Cancelled',{exact:true})).toHaveAttribute('data-tone','neutral');await expect(area.getByText('Failed',{exact:true})).toHaveAttribute('data-tone','error')
  expect(await area.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
  expect((await new AxeBuilder({page}).include('#standardization').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([])
})
test('count-free paging does not invent totals and matches counted button sizing',async({page})=>{
  const counted=page.getByRole('navigation',{name:'Counted standardization pages'}),feed=page.getByRole('navigation',{name:'Count-free standardization pages'})
  expect((await counted.getByRole('button',{name:'Next'}).boundingBox())!.height).toBe((await feed.getByRole('button',{name:'Next'}).boundingBox())!.height)
  await feed.getByRole('button',{name:'Next'}).click();await expect(feed).toContainText('Page 2');await expect(feed).not.toContainText('records');await expect(feed).not.toContainText('of')
})
test('conditionally mounted confirmations restore focus after Escape and explicit dismissal',async({page})=>{
  const trigger=page.getByRole('button',{name:'Open conditional confirmation',exact:true})
  await trigger.click();const dialog=page.getByRole('dialog',{name:'Conditional confirmation example',exact:true})
  await expect(dialog.getByRole('button',{name:'Cancel',exact:true})).toBeFocused()
  await page.keyboard.press('Escape');await expect(trigger).toBeFocused()
  await trigger.click();await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await expect(trigger).toBeFocused()
})
test('assembled list/detail/modal preserves navigation, filter clearing and guarded drafts',async({page},info)=>{
  await page.goto(`/workspace-preview?theme=${info.project.use.colorScheme}&view=list`)
  await page.getByLabel('Find samples').fill('absent');await expect(page.getByText('No matching samples',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Clear all',exact:true}).click()
  await page.getByRole('link',{name:'EXAMPLE-SAMPLE-20261022',exact:true}).click();await expect(page.getByRole('heading',{name:'EXAMPLE-SAMPLE-20261022',exact:true})).toBeVisible()
  const edit=page.getByRole('button',{name:'Edit example record',exact:true});await edit.click();const dialog=page.getByRole('dialog',{name:'Edit example record',exact:true})
  await dialog.getByLabel('Sample reference',{exact:false}).fill('EXAMPLE-DIRTY');await dialog.getByRole('button',{name:'Cancel',exact:true}).click();const discard=page.getByRole('dialog',{name:'Discard unsaved changes?',exact:true});await expect(discard).toBeVisible();await discard.getByRole('button',{name:'Keep editing',exact:true}).click();await expect(dialog.getByLabel('Sample reference',{exact:false})).toHaveValue('EXAMPLE-DIRTY')
  await dialog.getByRole('button',{name:'Save changes',exact:true}).click();await expect(dialog).not.toBeVisible();await expect(page.getByRole('status')).toContainText('Saved EXAMPLE-DIRTY locally.')
})
