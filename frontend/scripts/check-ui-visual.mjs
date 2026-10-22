import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root=fileURLToPath(new URL('../',import.meta.url))
const directory=path.join(root,'ui-gallery/visual-tests/__screenshots__')
const manifestPath=path.join(directory,'reviewed.json')
const projects=['desktop-light','desktop-dark','narrow-light','narrow-dark']
const coverage=JSON.parse(fs.readFileSync(path.join(root,'ui-gallery/coverage.json'),'utf8'))
const scenes=['list','detail','modal','list-expanded','detail-expanded','modal-expanded',...[...coverage.features,...coverage.states].map(scene=>'feature-'+scene.id)]
const expected=projects.flatMap(project=>scenes.map(scene=>`${project}/${scene}.png`)).sort()
const actual=fs.readdirSync(directory,{recursive:true}).map(p=>p.replaceAll('\\','/')).filter(p=>p.endsWith('.png')).sort()
if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`Visual reference must contain all ${expected.length} registered shared-pattern and actual-feature frames, without missing or extra PNGs.`)
const versions={
  playwright:JSON.parse(fs.readFileSync(path.join(root,'node_modules/@playwright/test/package.json'),'utf8')).version,
  font:JSON.parse(fs.readFileSync(path.join(root,'node_modules/@fontsource-variable/geist/package.json'),'utf8')).version,
}
const images=Object.fromEntries(expected.map(name=>{
  const bytes=fs.readFileSync(path.join(directory,name))
  if(bytes.toString('hex',0,8)!=='89504e470d0a1a0a')throw new Error(`Invalid PNG: ${name}`)
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),narrow=name.startsWith('narrow-')
  if(width!==(narrow?390:1280)||height<(narrow?844:900))throw new Error(`Unexpected page geometry: ${name}`)
  if(name.includes('/modal')&&height!==(narrow?844:900))throw new Error(`Modal reference must capture the viewport, not a virtual page extension: ${name}`)
  return [name,{sha256:createHash('sha256').update(bytes).digest('hex'),width,height}]
}))
if(process.argv.includes('--record-reviewed')){
  if(process.env.CI)throw new Error('CI cannot approve or rewrite visual references. Inspect frames locally and record the deliberate review.')
  fs.writeFileSync(manifestPath,JSON.stringify({schemaVersion:1,reviewedAt:new Date().toISOString(),platform:'win32',browser:'chromium',locale:'en-US',timezone:'UTC',versions,images},null,2)+'\n')
}else{
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'))
  if(manifest.schemaVersion!==1||manifest.platform!=='win32'||!manifest.reviewedAt||JSON.stringify(manifest.versions)!==JSON.stringify(versions)||JSON.stringify(manifest.images)!==JSON.stringify(images))throw new Error('Visual references or renderer versions changed without a recorded review. Inspect all frames and run ui:visual:review after an intentional baseline update.')
}
process.stdout.write(`Visual reference check passed: ${expected.length} reviewed Windows Chromium page baselines.\n`)
