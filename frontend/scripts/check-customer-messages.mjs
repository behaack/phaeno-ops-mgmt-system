import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
const root=path.resolve('src')
const catalog=JSON.parse(fs.readFileSync(path.join(root,'features/customer-i18n/customer-messages.generated.ts'),'utf8').match(/=\s*([\s\S]*?)\s+as const/)[1])
const missing=[]
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):[path.join(dir,entry.name)])}
for(const file of files(root).filter(file=>/\.tsx?$/.test(file)&&!/\.test\.|\.generated\./.test(file))){
 const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
 function walk(node){
  if(ts.isJsxAttribute(node)&&node.name.getText(source)==='message'&&node.initializer&&ts.isStringLiteral(node.initializer)&&node.initializer.text.startsWith('m_')&&!Object.hasOwn(catalog,node.initializer.text))missing.push(file+': '+node.initializer.text)
  if(ts.isCallExpression(node)&&node.expression.getText(source)==='__customerText'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])&&!Object.hasOwn(catalog,node.arguments[0].text))missing.push(file+': '+node.arguments[0].text)
  ts.forEachChild(node,walk)
 }
 walk(source)
}
if(missing.length){console.error(missing.join('\n'));process.exitCode=1}else console.log(`Customer message references valid (${Object.keys(catalog).length} English messages). Other audiences remain English.`)
