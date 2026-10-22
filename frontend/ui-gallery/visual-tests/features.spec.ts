import { expect, test } from '@playwright/test'
import coverage from '../coverage.json' with { type: 'json' }
import { prepareWorkflow } from '../test-helpers/workflows'

for(const example of [...coverage.features, ...coverage.states])test(`actual ${example.id} workspace`,async({page},info)=>{
  const {id:scene,url,title}=example
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
  await page.clock.setFixedTime(new Date('2026-10-22T16:00:00Z'))
  await page.goto(`${url}&theme=${info.project.use.colorScheme}&dark=${info.project.use.colorScheme==='dark'}`)
  await expect(page.getByText(title,{exact:true}).filter({visible:true}).first()).toBeVisible()
  await page.evaluate(()=>document.fonts.ready)
  if(scene==='source')await expect(page.getByLabel(/Internal label/)).toHaveValue('DEMO — source sample')
  await prepareWorkflow(page, 'prepare' in example && typeof example.prepare === 'string' ? example.prepare : undefined)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await expect(page).toHaveScreenshot(`feature-${scene}.png`,{fullPage:!('prepare' in example)})
  expect(errors).toEqual([])
})
