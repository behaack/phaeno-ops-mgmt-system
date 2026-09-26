import { describe, expect, it } from 'vitest'
import type { SampleShippingProcedure } from '#/api/sample-shipping'
import { currentShippingProcedure } from './current-shipping-procedure'
import { parseShippingSettingsSection } from './shipping-settings-navigation'

describe('shared shipping procedure selection', () => {
  const procedure = (id: string, revision: number, isActive: boolean): SampleShippingProcedure => ({
    id, definitionKey: 'procedure-family', revision, supersedesProcedureId: revision > 1 ? 'first' : null,
    name: 'Shared procedure', description: '', packingInstructions: 'Pack safely', temperatureInstructions: 'Keep frozen',
    carrierInstructions: 'Traceable carrier', dispatchInstructions: 'Dispatch on weekdays',
    requiredDocuments: 'Packet', exceptionInstructions: 'Contact Phaeno', internationalCustomsInstructions: null,
    isActive, version: 1,
  })
  it('uses the newest active revision of the selected procedure family', () => {
    expect(currentShippingProcedure([procedure('first', 1, false), procedure('second', 2, true)], 'first')?.id).toBe('second')
  })
  it('does not substitute an unavailable procedure', () => {
    expect(currentShippingProcedure([procedure('first', 1, false)], 'first')).toBeUndefined()
  })
  it('takes obsolete assignment links to Sample types', () => {
    expect(parseShippingSettingsSection('instructions')).toBe('sample-types')
  })
})
