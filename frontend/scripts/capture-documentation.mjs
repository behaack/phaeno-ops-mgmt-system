/* global document */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { guideScenarios } from './guide-scenarios.mjs'
import { root, manifestPath, hash, dependencies, checkCaptures } from './documentation-captures.mjs'

const capture=process.argv.includes('--capture'),inspect=process.argv.includes('--inspect')
if(process.argv.includes('--record-reviewed')) {
  if(process.env.CI)throw new Error('CI cannot approve guide illustrations.')
  const manifest=checkCaptures({allowUnreviewed:true})
  manifest.reviewedAt=new Date().toISOString()
  fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n')
  console.log('Recorded the deliberate review of all 32 current guide illustrations.');process.exit(0)
}
if(!capture&&!inspect){checkCaptures();console.log('Documentation capture check passed: 32 assets, annotations, references and source freshness.');process.exit(0)}
if(process.env.CI&&capture)throw new Error('CI cannot approve or rewrite documentation illustrations.')
const browser=await chromium.launch({headless:true})
const results={},pending=[],failures=[]
try {
 for(const scenario of guideScenarios.filter(s=>!process.env.GUIDE_SCENE||s.image.includes(process.env.GUIDE_SCENE))) {
  const page=await browser.newPage({viewport:{width:1280,height:scenario.image.includes('08-table-and-save')?2400:1000},locale:'en-US',timezoneId:'UTC',colorScheme:'light',reducedMotion:'reduce'})
  page.setDefaultTimeout(3000)
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.clock.setFixedTime(new Date('2026-10-22T16:00:00Z'))
  await page.route('**/*',route=>{
    if(['xhr','fetch'].includes(route.request().resourceType())&&new URL(route.request().url()).pathname.startsWith('/api/')){errors.push('Unexpected API traffic');return route.abort()}
    return route.continue()
  })
  try {
   await page.goto((process.env.GALLERY_URL??'http://127.0.0.1:4318')+scenario.url)
   await page.evaluate(()=>document.fonts.ready)
   await page.waitForTimeout(650)
   if(scenario.prepare)await scenario.prepare(page)
   await page.waitForTimeout(500)
   const points=[];let lastY=0,firstY=Infinity
   for(const selector of scenario.targets) {
    const target=page.locator(selector).first(),box=await target.boundingBox()
    if(!box)throw new Error(`Annotation target missing or hidden: ${selector}`)
    const identity=await target.evaluate(n=>({id:n.id,tag:n.tagName,slot:n.getAttribute('data-slot')}))
    const label=identity.id&&['INPUT','TEXTAREA','SELECT'].includes(identity.tag)?await page.locator('label').evaluateAll((labels,id)=>{const label=labels.find(n=>n.htmlFor===id);if(!label)return null;const b=label.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height}},identity.id):null
    const point=label?{x:label.x+label.width-12,y:label.y+label.height/2}:identity.tag==='BUTTON'||identity.slot?.includes('badge')?{x:box.x+box.width-12,y:box.y-12}:{x:box.x-16,y:box.y+Math.min(box.height/2,14)}
    points.push({number:points.length+1,...point,box})
    firstY=Math.min(firstY,box.y);lastY=Math.max(lastY,box.y+box.height)
   }
   if(errors.length)throw new Error(errors.join('; '))
   const fullHeight=await page.evaluate(()=>document.documentElement.scrollHeight)
   const dialog=page.getByRole('dialog');const dialogBox=await dialog.isVisible().catch(()=>false)?await dialog.boundingBox():null
   const focusedBox=scenario.frame?await page.locator(scenario.frame).first().boundingBox():scenario.image.includes('05-accept-invitation')?await page.locator('main > section').boundingBox():null
   const bottomBox=scenario.bottom?await page.locator(scenario.bottom).first().boundingBox():null
   const top=scenario.top??Math.max(0,firstY-170)
   const clip=dialogBox??focusedBox??{x:0,y:top,width:1280,height:Math.min(fullHeight,Math.max(lastY+90,bottomBox?bottomBox.y+bottomBox.height+32:0))-top}
   if(points.some(({box})=>box.x+box.width<clip.x||box.x>clip.x+clip.width||box.y+box.height<clip.y||box.y>clip.y+clip.height))throw new Error('Annotation control is outside the captured region')
   const bytes=await page.screenshot({type:'jpeg',quality:88,clip,timeout:10000,animations:'disabled',caret:'hide'})
   const inset=(value,size)=>Number((Math.min(size-16,Math.max(16,value))/size*100).toFixed(2))
   const metadata={width:Math.round(clip.width),height:Math.round(clip.height),viewport:page.viewportSize(),crop:clip,points:points.map(p=>({number:p.number,x:inset(p.x-clip.x,clip.width),y:inset(p.y-clip.y,clip.height)})),scenario:scenario.url,targets:scenario.targets,sha256:hash(bytes)}
   if(metadata.points.some(p=>p.x<0||p.x>100||p.y<0||p.y>100))throw new Error('Annotation target falls outside the captured region')
   results[scenario.image]=metadata;pending.push([path.join(root,'public',scenario.image),bytes])
   console.log(`Captured ${scenario.image} (${metadata.width}×${metadata.height})`)
   if(inspect){const out=path.join(root,'../.artifacts/ui-adoption-20261022/captures');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,path.basename(path.dirname(scenario.image))+'-'+path.basename(scenario.image)),bytes)}
  } catch(error) {
   failures.push(`${scenario.image}: ${error.message}`)
   const details=await page.locator('input,textarea,select,button,nav').evaluateAll(nodes=>nodes.map(n=>({tag:n.tagName,id:n.id,text:(n.innerText??'').slice(0,90),type:n.getAttribute('type'),label:n.getAttribute('aria-label')})))
   console.log('FAILED',scenario.image,error.message,JSON.stringify(details).slice(0,5000))
  } finally {await page.close()}
 }
} finally {await browser.close()}
if(failures.length)throw new Error(failures.join('\n'))
if(capture){
 if(Object.keys(results).length!==32)throw new Error('A reviewed capture must refresh all 32 illustrations together.')
 for(const [file,bytes] of pending)fs.writeFileSync(file,bytes)
 fs.writeFileSync(manifestPath,JSON.stringify({schemaVersion:1,capturedAt:new Date().toISOString(),reviewedAt:null,browser:'Chromium',platform:process.platform,locale:'en-US',timezone:'UTC',theme:'light',fictionalData:true,images:results,sources:dependencies()},null,2)+'\n')
 fs.writeFileSync(path.join(root,'src/features/documentation/documentation-capture-metadata.json'),JSON.stringify(Object.fromEntries(Object.entries(results).map(([url,{width,height,points}])=>[url,{width,height,points}])) ,null,2)+'\n')
 fs.writeFileSync(path.join(root,'src/features/documentation/documentation-screenshots.ts'),"import metadata from './documentation-capture-metadata.json'\n\nexport type DocumentationScreenshotMetadata = { width: number; height: number; points: readonly { number: number; x: number; y: number }[] }\n\n// Actual component captures with fictional records. Portable prose stays in MDX.\nexport const documentationScreenshots: Readonly<Partial<Record<string, DocumentationScreenshotMetadata>>> = metadata\n")
 console.log('Refreshed all 32 guide illustrations and capture metadata. Inspect every image before completing the review.')
}
