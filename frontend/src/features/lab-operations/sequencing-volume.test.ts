import { expect, it } from 'vitest'
import { meetsMinimumSequencingVolume } from './decimal-quantity'

it.each([
  ['5', 'µL', true],
  ['4.9999999999999999999999999999', 'µL', false],
  ['5.0000000000000000000000000001', 'uL', true],
  ['0.005', 'mL', true],
  ['0.0049999999999999999999999999', 'mL', false],
  ['5000', 'nL', true],
  ['5', 'ng', false],
])('verifies %s %s against 5 µL without rounding', (quantity, unit, expected) => {
  expect(meetsMinimumSequencingVolume(quantity as string, unit as string, '5')).toBe(expected)
})
