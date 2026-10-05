// Keep decimal text exact: trim display padding without converting through a float.
export function labAmount(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return 'Unknown'
  const text = String(value)
  return /^-?\d+\.\d+$/.test(text) ? text.replace(/0+$/, '').replace(/\.$/, '') : text
}
export function labStatus(value: string): string {
  const text = value.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ').toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}
export const labCount = (count: number, singular: string, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`
export const operationalInputProps = { autoComplete: 'off', spellCheck: false, 'data-1p-ignore': true, 'data-lpignore': 'true' } as const
