import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { encodeShippingBarcode, ShippingBarcode } from './ShippingBarcode'

describe('shipping Code 128 barcodes', () => {
  it('encodes the reference AB vector using Code B start, weighted checksum 102 and stop', () => {
    // Code symbols from the Code 128 standard: Start B, A=33, B=34, checksum=102, Stop.
    const referenceWidths = ['211214', '111323', '131123', '411131', '2331112']
    const expected = referenceWidths.map(pattern => [...pattern].map((width, index) => (index % 2 ? '0' : '1').repeat(Number(width))).join('')).join('')
    expect(encodeShippingBarcode('AB')).toBe(expected)
  })
  it('preserves underscore and case in the readable identifier and encoded symbol', () => {
    render(<ShippingBarcode value="Tube_001" label="Permanent tube barcode" />)
    expect(screen.getByRole('img', { name: 'Permanent tube barcode Tube_001' })).toBeTruthy()
    expect(screen.getByText('Tube_001')).toBeTruthy()
    expect(encodeShippingBarcode('Tube_001')).not.toBe(encodeShippingBarcode('TUBE_001'))
  })
  it('reports an unsupported value without substituting another identity', () => {
    expect(encodeShippingBarcode('TUBE\n001')).toBeNull()
    expect(encodeShippingBarcode('')).toBeNull()
  })
})
