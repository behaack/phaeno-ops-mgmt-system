import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Code39Barcode, encodeCode39 } from './Code39Barcode'

describe('Code39Barcode', () => {
  it('renders a scanner-readable image with start, stop, and character gaps', () => {
    const barcode = 'PH-S-23456789AB-C'
    const modules = encodeCode39(barcode)

    render(<Code39Barcode value={barcode} />)

    expect(screen.getByRole('img', { name: `Barcode ${barcode}` })).toBeTruthy()
    expect(modules).toHaveLength((barcode.length + 2) * 12 + barcode.length + 1)
    expect(modules.startsWith('1001011011010')).toBe(true)
    expect(modules.endsWith('0100101101101')).toBe(true)
  })

  it('rejects values outside the supported Code 39 alphabet', () => {
    expect(() => encodeCode39('PH_123')).toThrow('Code 39 cannot encode _.')
  })
})
