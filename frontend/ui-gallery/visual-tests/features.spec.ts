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
  if ('tileHeight' in example && 'tiles' in example) {
    // Retain every pixel of a long page without accumulating platform glyph-edge
    // differences across several viewport heights in a single comparison.
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    const size = info.project.name.startsWith('narrow-') ? 'narrow' : 'desktop'
    const tileHeight = example.tileHeight as number
    const tiles = example.tiles as { desktop: number; narrow: number }
    expect(Math.ceil(height / tileHeight)).toBe(tiles[size])
    const width = page.viewportSize()!.width
    for (let index = 0; index < tiles[size]; index++) {
      await expect(page).toHaveScreenshot(`feature-${scene}${index ? '-'+(index+1) : ''}.png`, {
        fullPage: true, clip: { x: 0, y: index*tileHeight, width, height: Math.min(tileHeight,height-index*tileHeight) },
      })
    }
  } else await expect(page).toHaveScreenshot(`feature-${scene}.png`,{fullPage:!('prepare' in example)})
  expect(errors).toEqual([])
})
