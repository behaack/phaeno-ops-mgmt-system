import { expect, test } from '@playwright/test'
import cases from '../documentation-cases.json' with { type: 'json' }

for(const {audience,slug,count} of cases)test(`refreshed ${audience}/${slug} guide retains its illustrations and callouts`,async({page},info)=>{
  await page.goto(`/research.html?view=howto&audience=${audience}&slug=${slug}&dark=${info.project.use.colorScheme==='dark'}`)
  const images=page.locator('img[src^="/docs/"]')
  await expect(images).toHaveCount(count)
  for(const img of await images.all()) {
    await img.scrollIntoViewIfNeeded()
    await expect(img).toHaveJSProperty('complete',true)
    expect(await img.evaluate(n=>(n as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    expect((await img.getAttribute('alt'))?.length).toBeGreaterThan(20)
    expect((await img.getAttribute('title'))?.length).toBeGreaterThan(10)
    const markers=img.locator('..').locator('span[aria-hidden=true]')
    expect(await markers.count()).toBeGreaterThan(0)
    const outside=await img.locator('..').evaluate(el=>{
      const bounds=el.getBoundingClientRect()
      return [...el.querySelectorAll('span[aria-hidden=true]')].some(n=>{const box=n.getBoundingClientRect();return box.left<bounds.left||box.right>bounds.right||box.top<bounds.top||box.bottom>bounds.bottom})
    })
    expect(outside).toBe(false)
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
