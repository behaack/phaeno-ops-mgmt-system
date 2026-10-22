import { expect, test } from '@playwright/test'

for(const [scene,url,title] of [
  ['company','/features.html?scene=company','DEMO — Example Research'],
  ['source','/features.html?scene=source','DEMO — source sample'],
  ['assembly-inputs','/features.html?scene=assembly-inputs','Processing connected'],
  ['assembly-jobs','/features.html?scene=assembly-jobs','Simulation completed'],
  ['customer','/features.html?scene=customer','Data Library'],
  ['research','/research.html?illustrate=true&prepared=true&path=/research/experiments','DEMO — compare buffer A and B'],
])test(`actual ${scene} workspace`,async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
  await page.clock.setFixedTime(new Date('2026-10-22T16:00:00Z'))
  await page.goto(`${url}&theme=${info.project.use.colorScheme}&dark=${info.project.use.colorScheme==='dark'}`)
  await expect(page.getByText(title,{exact:true}).filter({visible:true}).first()).toBeVisible()
  await page.evaluate(()=>document.fonts.ready)
  if(scene==='source')await expect(page.getByLabel(/Internal label/)).toHaveValue('DEMO — source sample')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await expect(page).toHaveScreenshot(`feature-${scene}.png`,{fullPage:true})
  expect(errors).toEqual([])
})
