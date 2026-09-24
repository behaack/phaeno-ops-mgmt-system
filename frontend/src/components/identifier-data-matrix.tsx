import { datamatrix, drawingSVG } from '@bwip-js/browser'

export function createDataMatrixSource(value: string): string | null {
  try {
    const svg = datamatrix({
      bcid: 'datamatrix',
      text: value,
      scale: 4,
      padding: 4,
      backgroundcolor: 'FFFFFF',
    }, drawingSVG())
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  } catch {
    return null
  }
}

export function IdentifierDataMatrix({ value, label, source }: { value: string; label: string; source: string | null }) {
  if (!source) {
    return <p role="alert">The DataMatrix for {value} could not be prepared. Do not print this label.</p>
  }

  return (
    <figure className="identifier-data-matrix min-w-0 text-center">
      <img alt={`${label} ${value}`} className="mx-auto block max-w-full" src={source} />
      <figcaption className="wrap-anywhere font-mono text-xs">{value}</figcaption>
    </figure>
  )
}
