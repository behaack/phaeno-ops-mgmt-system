import test from 'node:test'
import assert from 'node:assert/strict'
import { dependencies, sourceFingerprint, validateCaptureSources, validateAnnotation, validateCaptureDimensions, guideScreenshots, root } from './documentation-captures.mjs'
import fs from 'node:fs'
import path from 'node:path'

test('all illustrated audiences participate and cropped images must match annotation geometry',()=>{
  assert.deepEqual([...new Set(guideScreenshots().map(g=>g.audience))].sort(),['customer','partner','phaeno','prospect'])
  const metadata=JSON.parse(fs.readFileSync(path.join(root,'src/features/documentation/documentation-capture-metadata.json'),'utf8'))
  const [url,image]=Object.entries(metadata)[0],bytes=fs.readFileSync(path.join(root,'public',url))
  assert.doesNotThrow(()=>validateCaptureDimensions(bytes,image,url))
  assert.throws(()=>validateCaptureDimensions(bytes,{...image,height:image.height+1},url),/dimensions differ/)
  assert.throws(()=>validateCaptureDimensions(Buffer.from('not an image'),image,url),/Invalid JPEG/)
})

test('capture dependencies include real feature implementations, shared bands, theme styles and renderer lock',()=>{
  const sources=dependencies()
  for(const file of ['src/components/ui/card.tsx','src/components/ui/record-list.tsx','src/styles.css','src/features/lab-operations/AssemblyJobs.tsx','src/features/research/ResearchLists.tsx','src/features/crm/CrmCompanyDetailPage.tsx','scripts/documentation-captures.mjs','pnpm-lock.yaml'])assert.ok(sources[file],file)
  assert.ok(!sources['ui-gallery/documentation-captures.json'])
  assert.equal(sourceFingerprint('line one\r\nline two\r\n'),sourceFingerprint('line one\nline two\n'))
})
test('changed, added and removed UI dependencies require screenshot review',()=>{
  assert.doesNotThrow(()=>validateCaptureSources({card:'one'},{card:'one'}))
  for(const current of [{card:'two'},{card:'one',theme:'new'},{}])assert.throws(()=>validateCaptureSources({card:'one'},current),/review required/)
})
test('background dialog targets and invalid marker values fail even when the renderer would clamp them',()=>{
  const valid={width:640,height:480,scenario:'/features.html?scene=demo',targets:['#name'],points:[{number:1,x:50,y:50}]}
  assert.doesNotThrow(()=>validateAnnotation(valid,'example'))
  for(const point of [{number:1,x:149,y:-65},{number:1,x:NaN,y:20},{number:2,x:30,y:20}])assert.throws(()=>validateAnnotation({...valid,points:[point]},'example'),/Invalid annotation/)
  assert.throws(()=>validateAnnotation({...valid,points:[]},'example'),/Invalid annotation/)
})
