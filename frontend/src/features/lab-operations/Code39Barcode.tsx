const code39Patterns: Readonly<Record<string, string>> = {
  '0': '101001101101',
  '1': '110100101011',
  '2': '101100101011',
  '3': '110110010101',
  '4': '101001101011',
  '5': '110100110101',
  '6': '101100110101',
  '7': '101001011011',
  '8': '110100101101',
  '9': '101100101101',
  A: '110101001011',
  B: '101101001011',
  C: '110110100101',
  D: '101011001011',
  E: '110101100101',
  F: '101101100101',
  G: '101010011011',
  H: '110101001101',
  I: '101101001101',
  J: '101011001101',
  K: '110101010011',
  L: '101101010011',
  M: '110110101001',
  N: '101011010011',
  O: '110101101001',
  P: '101101101001',
  Q: '101010110011',
  R: '110101011001',
  S: '101101011001',
  T: '101011011001',
  U: '110010101011',
  V: '100110101011',
  W: '110011010101',
  X: '100101101011',
  Y: '110010110101',
  Z: '100110110101',
  '-': '100101011011',
  '.': '110010101101',
  ' ': '100110101101',
  $: '100100100101',
  '/': '100100101001',
  '+': '100101001001',
  '%': '101001001001',
  '*': '100101101101',
}

export function encodeCode39(value: string) {
  const normalized = value.trim().toUpperCase()
  const characters = `*${normalized}*`
  return [...characters]
    .map((character) => {
      const pattern = code39Patterns[character]
      if (!pattern) throw new Error(`Code 39 cannot encode ${character}.`)
      return pattern
    })
    .join('0')
}

export function Code39Barcode({ value }: { value: string }) {
  const quietZone = '0'.repeat(10)
  const modules = `${quietZone}${encodeCode39(value)}${quietZone}`
  return (
    <svg
      aria-label={`Barcode ${value}`}
      className="h-14 w-full"
      preserveAspectRatio="none"
      role="img"
      viewBox={`0 0 ${modules.length} 56`}
    >
      <rect fill="white" height="56" width={modules.length} />
      {[...modules].map((module, index) =>
        module === '1'
          ? <rect fill="black" height="56" key={index} width="1" x={index} />
          : null,
      )}
    </svg>
  )
}
