import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import coverage from '../coverage.json' with { type: 'json' }

export const featurePages = coverage.features.map(example => [example.id, example.url, example.title])

for(const [scene,url,title] of featurePages)test(`actual ${scene} page retains shared presentation and reflow`,async({page},info)=>{
  const errors:string[]=[],requests:string[]=[]
  page.on('pageerror',error=>errors.push(error.message))
  page.on('request',r=>{if(['fetch','xhr'].includes(r.resourceType())&&new URL(r.url()).pathname.startsWith('/api/'))requests.push(r.url())})
  await page.clock.setFixedTime(new Date('2026-10-22T16:00:00Z'))
  await page.goto(`${url}&theme=${info.project.use.colorScheme}&dark=${info.project.use.colorScheme==='dark'}`)
  await expect(page.getByText(title,{exact:true}).first()).toBeVisible()
  if(scene==='source')await expect(page.getByLabel(/Internal label/)).toHaveValue('DEMO — source sample')
  if(scene==='assembly-inputs')await expect(page.getByRole('button',{name:'View assembly'})).toBeVisible()
  if(scene==='assembly-jobs')await expect(page.getByText('Simulation completed')).toBeVisible()
  if(scene==='company') {
    const header=page.locator('[data-slot=card-header]').first()
    const headingBox=await header.boundingBox(),description=await header.locator('[data-slot=card-description]').boundingBox(),actions=await header.locator('[data-slot=card-action]').boundingBox()
    expect(description!.width).toBeGreaterThan(headingBox!.width*0.75)
    expect(description!.y).toBeGreaterThanOrEqual(actions!.y+actions!.height-1)
  }
  await page.evaluate(()=>document.fonts.ready)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  const bands=page.locator('[data-slot=card-header], [data-slot=record-table-header]')
  expect(await bands.count()).toBeGreaterThan(0)
  const colors=await bands.evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).backgroundColor))
  expect(new Set(colors).size).toBe(1)
  expect(colors[0]).not.toBe('rgba(0, 0, 0, 0)')
  const accessibility=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()
  expect(accessibility.violations).toEqual([])
  expect(requests).toEqual([]);expect(errors).toEqual([])
})
