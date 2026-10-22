import { expect, test } from '@playwright/test'

for(const [slug,count] of [['onboard-customer',15],['record-research',14],['place-customer-order',1],['configure-samples-shipping',1],['lab-protocol',1]] as const)test(`refreshed ${slug} guide retains its illustrations and callouts`,async({page},info)=>{
  await page.goto(`/research.html?view=howto&slug=how-to-${slug}&dark=${info.project.use.colorScheme==='dark'}`)
  const images=page.locator('img[src^="/docs/phaeno/screenshots/"]')
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
