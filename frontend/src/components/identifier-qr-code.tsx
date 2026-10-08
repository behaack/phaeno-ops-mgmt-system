import { QRCodeSVG } from 'qrcode.react'

// Encode the exact scanner value, never a URL, normalized value or patient data.
export function IdentifierQrCode({ value, label = 'QR code', size = 'standard' }: {
  value: string
  label?: string
  size?: 'standard' | 'receiving' | 'label' | 'compact'
}) {
  if (!value || value.length > 255 || [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) {
    return <p className="text-sm text-destructive">The QR code is unavailable. Contact Phaeno with this identifier: {value}</p>
  }
  const side = size === 'receiving' ? '32mm' : size === 'label' ? '18mm' : size === 'compact' ? '21mm' : '28mm'
  return <figure className={`shipping-barcode identifier-qr-code min-w-0 text-center ${size === 'compact' ? 'space-y-0' : 'space-y-1'}`}>
    <QRCodeSVG value={value} level="M" marginSize={4} size={160}
      bgColor="#ffffff" fgColor="#000000" role="img" aria-label={`${label} ${value}`}
      className="mx-auto block max-w-full" style={{ width: side, height: 'auto', aspectRatio: '1' }} />
    <figcaption className={`wrap-anywhere font-mono text-xs${size === 'compact' ? ' leading-none' : ''}`}>{value}</figcaption>
  </figure>
}
