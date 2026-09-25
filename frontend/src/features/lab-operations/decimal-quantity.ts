const decimalPattern = /^\d+(?:\.\d+)?$/
const maxDecimalCoefficient = 79228162514264337593543950335n
function decimalParts(value: string) {
  if (value.length > 40 || !decimalPattern.test(value)) return null
  const [whole, fraction = ''] = value.split('.')
  if (fraction.length > 28) return null
  const coefficient = BigInt(whole + fraction)
  if (coefficient > maxDecimalCoefficient) return null
  return { coefficient, scale: fraction.length }
}

export function isPositiveDecimalQuantity(value: string) {
  const parts = decimalParts(value)
  return parts !== null && parts.coefficient > 0n
}

export function isMasterMixDecimalQuantity(value: string, allowZero = false) {
  const parts = decimalParts(value)
  return parts !== null && parts.scale <= 12
    && parts.coefficient < 10n ** BigInt(16 + parts.scale)
    && (allowZero || parts.coefficient > 0n)
}

export function exceedsDecimalQuantity(value: string, limit: string) {
  const entered = decimalParts(value)
  const available = decimalParts(limit)
  if (!entered || !available) return Number(value) > Number(limit)
  const scale = Math.max(entered.scale, available.scale)
  return entered.coefficient * 10n ** BigInt(scale - entered.scale)
    > available.coefficient * 10n ** BigInt(scale - available.scale)
}

export function remainingDecimalQuantity(availableText: string, transferText: string) {
  const available = decimalParts(availableText)
  const transfer = decimalParts(transferText)
  if (!available || !transfer) return null
  const scale = Math.max(available.scale, transfer.scale)
  const remaining = available.coefficient * 10n ** BigInt(scale - available.scale)
    - transfer.coefficient * 10n ** BigInt(scale - transfer.scale)
  if (remaining < 0n) return null
  return formatRepresentable(remaining, scale)
}

export function combinedDecimalQuantity(existingText: string, addedText: string) {
  const existing = decimalParts(existingText)
  const added = decimalParts(addedText)
  if (!existing || !added) return null
  const scale = Math.max(existing.scale, added.scale)
  const combined = existing.coefficient * 10n ** BigInt(scale - existing.scale)
    + added.coefficient * 10n ** BigInt(scale - added.scale)
  return formatRepresentable(combined, scale)
}

export function multipliedDecimalQuantity(value: string, count: number) {
  const entered = decimalParts(value)
  if (!entered || !Number.isSafeInteger(count) || count < 0) return null
  return formatRepresentable(entered.coefficient * BigInt(count), entered.scale)
}

function formatRepresentable(coefficient: bigint, scale: number) {
  const digits = coefficient.toString().padStart(scale + 1, '0')
  const text = scale === 0 ? digits
    : `${digits.slice(0, -scale)}.${digits.slice(-scale)}`.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
  return decimalParts(text) ? text : null
}
