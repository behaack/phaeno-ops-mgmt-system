import { guideScenarios } from './guide-scenarios.mjs'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

export const root=fileURLToPath(new URL('../',import.meta.url))
export const manifestPath=path.join(root,'ui-gallery/documentation-captures.json')
export const hash=value=>createHash('sha256').update(value).digest('hex')
export const sourceFingerprint=source=>hash(source.replaceAll('\r\n','\n'))
export function validateCaptureDimensions(bytes, metadata, url) {
  if(bytes.readUInt16BE(0)!==0xffd8)throw new Error(`Invalid JPEG: ${url}`)
  for(let offset=2;offset+8<bytes.length;) {
    if(bytes[offset++]!==0xff)break
    const marker=bytes[offset++],length=bytes.readUInt16BE(offset)
    if([0xc0,0xc1,0xc2].includes(marker)) {
      if(bytes.readUInt16BE(offset+3)!==metadata.height||bytes.readUInt16BE(offset+5)!==metadata.width)throw new Error(`Capture dimensions differ from the actual image: ${url}`)
      return
    }
    if(length<2)break
    offset+=length
  }
  throw new Error(`JPEG dimensions are unavailable: ${url}`)
}
export function guideScreenshots() {
  const directory=path.join(root,'src/content/docs')
  return fs.readdirSync(directory,{recursive:true}).filter(file=>file.endsWith('.mdx')).flatMap(file=>{
    const parts=file.replaceAll('\\','/').split('/'),audience=parts.length===2?'phaeno':parts[1]
    const source=fs.readFileSync(path.join(directory,file),'utf8')
    const matches=[...source.matchAll(/!\[([^\]]+)\]\((\/docs\/[^\s)]+)(?:\s+"([^"]+)")?\)/g)]
    const images=matches.map((match,index)=>{
      const explanation=source.slice(match.index+match[0].length,matches[index+1]?.index).split(/\n## /)[0]
      const prefix=audience==='phaeno'?'/docs/phaeno/screenshots/':`/docs/${audience}/${parts[0]}/screenshots/`
      if(!match[2].startsWith(prefix))throw new Error(`Guide screenshot has the wrong audience/locale: ${file}`)
      return {alt:match[1],url:match[2],caption:match[3],numbers:[...explanation.matchAll(/^(\d+)\. \*\*/gm)].map(n=>Number(n[1]))}
    })
    return images.length?[{audience,locale:audience==='phaeno'?null:parts[0],slug:path.basename(file,'.mdx'),images}]:[]
  })
}
export function validateAnnotation(image, url) {
  if(!image.scenario||!Number.isInteger(image.width)||image.width<=0||!Number.isInteger(image.height)||image.height<=0||!image.targets.length||image.points.length!==image.targets.length||image.points.some((p,i)=>p.number!==i+1||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>100||p.y<0||p.y>100))throw new Error(`Invalid annotation/provenance: ${url}`)
}
export function validateCaptureSources(recorded, current) {
  const changed=[...new Set([...Object.keys(current),...Object.keys(recorded)])].filter(p=>current[p]!==recorded[p])
  if(changed.length)throw new Error(`Guide image review required after UI/capture changes: ${changed.join(', ')}`)
}
export function dependencies() {
  const found=new Map()
  function visit(file) {
    const relative=path.relative(root,file).replaceAll('\\','/')
    const displayMetadata=relative.startsWith('src/features/documentation/')&&/^(?:documentation-(?:capture-metadata|screenshots|version|registry)|onboarding-screenshots|research-screenshots)\./.test(path.basename(relative))
    if(found.has(relative)||!fs.existsSync(file)||displayMetadata||relative==='ui-gallery/documentation-captures.json')return
    const source=fs.readFileSync(file,'utf8');found.set(relative,sourceFingerprint(source))
    for(const match of source.matchAll(/(?:from\s*|import\s*(?:\(\s*)?|@import\s*)['"]([^'"]+)['"]/g)) {
      const specifier=match[1]
      if(!specifier.startsWith('.')&&!specifier.startsWith('#/'))continue
      const base=specifier.startsWith('#/')?path.join(root,'src',specifier.slice(2)):path.resolve(path.dirname(file),specifier)
      const resolved=['','.ts','.tsx','.css','.json','/index.ts','/index.tsx'].map(ext=>base+ext).find(p=>fs.existsSync(p)&&fs.statSync(p).isFile())
      if(resolved)visit(resolved)
    }
  }
  for(const entry of ['ui-gallery/FeatureScenes.tsx','e2e/fixtures/research.tsx','scripts/guide-scenarios.mjs','scripts/capture-documentation.mjs','scripts/documentation-captures.mjs','package.json','pnpm-lock.yaml'])visit(path.join(root,entry))
  return Object.fromEntries([...found].sort(([a],[b])=>a.localeCompare(b)))
}
export function checkCaptures({ allowUnreviewed = false } = {}) {
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'))
  if(manifest.schemaVersion!==1||Object.keys(manifest.images).sort().join('|')!==guideScenarios.map(s=>s.image).sort().join('|')||!allowUnreviewed&&!manifest.reviewedAt)throw new Error('Expected one deliberately reviewed capture for every registered guide scenario.')
  const sources=dependencies()
  const metadata=JSON.parse(fs.readFileSync(path.join(root,'src/features/documentation/documentation-capture-metadata.json'),'utf8'))
  const expected=Object.fromEntries(Object.entries(manifest.images).map(([url,{width,height,points}])=>[url,{width,height,points}]))
  if(JSON.stringify(metadata)!==JSON.stringify(expected))throw new Error('Rendered guide annotations differ from their reviewed capture metadata.')
  validateCaptureSources(manifest.sources,sources)
  for(const [url,image] of Object.entries(manifest.images)) {
    const file=path.join(root,'public',url)
    if(!fs.existsSync(file)||hash(fs.readFileSync(file))!==image.sha256)throw new Error(`Missing or unreviewed guide image: ${url}`)
    validateCaptureDimensions(fs.readFileSync(file),image,url)
    validateAnnotation(image,url)
  }
  const references=guideScreenshots().flatMap(guide=>guide.images)
  if(new Set(references.map(r=>r.url)).size!==guideScenarios.length||references.some(r=>!manifest.images[r.url]||r.alt.length<20||!r.caption||r.numbers.length!==manifest.images[r.url].points.length||r.numbers.some((number,i)=>number!==i+1)))throw new Error('Every guide screenshot needs a reviewed capture, meaningful alt/caption and matching numbered explanations.')
  return manifest
}
