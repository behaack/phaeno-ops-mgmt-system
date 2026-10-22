import { expect, test } from '@playwright/test'

for(const expanded of [false,true])for(const view of ['list','detail','modal']){
  test(`${view} page${expanded?' with expanded Customer labels and long identity':''}`,async({page},info)=>{
    const requests:string[]=[],errors:string[]=[]
    page.on('request',r=>{if(['fetch','xhr'].includes(r.resourceType())&&new URL(r.url()).pathname.startsWith('/api/'))requests.push(r.url())})
    page.on('pageerror',e=>errors.push(e.message))
    await page.goto(`/workspace-preview?theme=${info.project.use.colorScheme}&view=${view}&pseudo=${expanded}`)
    await page.evaluate(()=>document.fonts.ready)
    if(expanded){
      await expect(page.locator('header').first()).toContainText('———')
      if(view==='list')await expect(page.getByRole('link',{name:/EXAMPLE-SAMPLE-ABCDEFGHIJKLMNOPQRSTUVWXYZ/})).toBeVisible()
      else if(view==='modal')await expect(page.getByRole('textbox')).toHaveValue(/EXAMPLE-SAMPLE-ABCDEFGHIJKLMNOPQRSTUVWXYZ/)
      else await expect(page.getByRole('heading',{name:/EXAMPLE-SAMPLE-ABCDEFGHIJKLMNOPQRSTUVWXYZ/})).toBeVisible()
    }
    if(view==='modal')await expect(page.getByRole('dialog')).toBeVisible()
    else await expect(page.getByTestId('workspace-preview')).toBeVisible()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    await expect(page).toHaveScreenshot(`${view}${expanded?'-expanded':''}.png`,{fullPage:view!=='modal'})
    expect(requests).toEqual([]);expect(errors).toEqual([])
  })
}
