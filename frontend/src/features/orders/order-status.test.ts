import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'
import { orderStatusTones } from './OrderStatusBadge'

it('maps every current commercial, sample, scan, release and included-kit status explicitly',()=>{
  const sources=['OrderEnums.cs','KitBundleModels.cs'].map(file=>readFileSync(resolve('../backend/app/Features/OrderManagement/Domain',file),'utf8')).join('\n')
  const statuses=[...sources.matchAll(/public enum \w+Status\s*\{([^}]+)\}/g)].flatMap(m=>m[1].split(',').map(s=>s.trim()).filter(Boolean))
  expect(statuses.length).toBeGreaterThan(50)
  expect(statuses.filter(status=>!Object.hasOwn(orderStatusTones,status))).toEqual([])
})
