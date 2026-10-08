/** Match the server's case and Code 39 wrapper handling before comparing known tube identities. */
export function normalizeMaterialTubeScan(value: string) {
  const barcode = value.trim().toUpperCase()
  return barcode.length > 2 && barcode.startsWith('*') && barcode.endsWith('*') ? barcode.slice(1, -1) : barcode
}
