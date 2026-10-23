import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { openTrialReview } from '../test-helpers/workflows'

const workflows = ['finance', 'trial', 'shipping', 'qc']
for (const scene of workflows) for (const state of ['loading', 'error', 'permission', 'empty']) {
  test(`${scene} retains shared ${state} feedback and safe recovery`, async ({ page }, info) => {
    const escaped: string[] = []
    page.on('request', r => { if (['fetch','xhr'].includes(r.resourceType()) && new URL(r.url()).pathname.startsWith('/api/')) escaped.push(r.url()) })
    await page.goto(`/features.html?scene=${scene}&state=${state}&theme=${info.project.use.colorScheme ?? 'light'}`)
    await expect(page.getByRole('heading', {level:1})).toBeVisible()
    if (state === 'loading') await expect(page.locator('[data-slot=loading-state]').first()).toHaveAttribute('aria-live','polite')
    if (state === 'permission') await expect(page.locator('[data-kind=permission]')).toBeVisible()
    if (state === 'empty') await expect(page.locator('[data-slot=empty-state]').first()).toBeVisible()
    if (state === 'error') {
      const failure = page.locator('[data-slot=error-state]')
      await expect(failure).toContainText('demonstration service')
      await failure.getByRole('button').click()
      await expect(failure).not.toBeVisible()
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(escaped).toEqual([])
  })
}

for (const state of ['save-error','conflict','pending']) test(`real Trial review preserves choices during ${state}`, async ({page}) => {
  await page.goto(`/features.html?scene=trial&state=${state}`)
  await expect(page.getByRole('button',{name:'Review and accept scope',exact:true})).toBeVisible()
  const dialog = await openTrialReview(page)
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('* Required',{exact:true})).toBeVisible()
  const choice = dialog.getByRole('checkbox')
  await choice.check()
  await dialog.getByRole('button',{name:'Accept Trial scope',exact:true}).click()
  if (state === 'pending') {
    await expect(dialog.getByRole('button',{name:'Cancel',exact:true})).toBeDisabled()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
  } else {
    await expect(dialog.getByRole('alert')).toContainText(state === 'conflict' ? 'record changed' : 'demonstration service')
    await expect(choice).toBeChecked()
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([])
  }
})

test('real Trial review returns keyboard focus after clean cancellation', async ({page}) => {
  await page.goto('/features.html?scene=trial')
  const opener = page.getByRole('button',{name:'Review and accept scope',exact:true})
  await expect(opener).toBeVisible()
  const dialog = await openTrialReview(page)
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click()
  await expect(opener).toBeFocused()
})

test('actual workflows reflow at 320 pixels, tablet widths and enlarged text', async ({page}) => {
  test.setTimeout(60000)
  for (const scene of workflows) for (const width of [320,768]) {
    await page.setViewportSize({width,height:1000})
    await page.goto(`/features.html?scene=${scene}`)
    await expect(page.getByRole('heading',{level:1})).toBeVisible()
    await expect(page.locator('[data-slot=card-header], [data-slot=section-panel]').first()).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.setViewportSize({width:1280,height:900})
  await page.goto('/features.html?scene=trial')
  await page.addStyleTag({content:'html { font-size: 200% !important; }'})
  await expect(page.getByRole('heading',{level:1})).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
