import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ShippingBarcode } from './ShippingBarcode'

describe('identifier QR codes', () => {
  it('keeps exact case and punctuation in the readable identity with a square graphic', () => {
    render(<ShippingBarcode value="Tube_001" label="Permanent tube barcode" />)
    const graphic = screen.getByRole('img', { name: 'Permanent tube barcode Tube_001' })
    expect(graphic.getAttribute('viewBox')?.split(' ').slice(2)).toEqual(['29', '29'])
    expect(screen.getByText('Tube_001')).toBeTruthy()
    expect(graphic.querySelectorAll('path').length).toBeGreaterThan(0)
  })
  it.each(['', 'TUBE\n001', 'x'.repeat(256)])('withholds unsupported identifiers without encoding a replacement', value => {
    render(<ShippingBarcode value={value} />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText(/The QR code is unavailable/)).toBeTruthy()
  })
})
