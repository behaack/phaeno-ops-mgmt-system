type DisplayOptions = { locale?: string; empty?: string }
type DateOptions = DisplayOptions & { timeZone?: string }

const missing = (options: DisplayOptions) => options.empty ?? 'Not recorded'
function dateValue(value: string | Date | null | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Calendar days have no timezone. Never move a recorded day into the previous day. */
export function formatDisplayDate(value: string | Date | null | undefined, options: DateOptions = {}) {
  const calendar = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  const date = dateValue(calendar ? `${value}T00:00:00Z` : value)
  if (!date || calendar && date.toISOString().slice(0, 10) !== value) return missing(options)
  return new Intl.DateTimeFormat(options.locale ?? 'en-US', { dateStyle: 'medium', timeZone: calendar ? 'UTC' : options.timeZone }).format(date)
}

export function formatDisplayTimestamp(value: string | Date | null | undefined, options: DateOptions & { seconds?: boolean } = {}) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDisplayDate(value, options)
  const date = dateValue(value)
  if (!date) return missing(options)
  return new Intl.DateTimeFormat(options.locale ?? 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    ...(options.seconds ? { second: '2-digit' as const } : {}), timeZoneName: 'short', timeZone: options.timeZone,
  }).format(date)
}

/** Scientific evidence keeps the offset and precision recorded at performance time. */
export function formatRecordedTimestamp(value: string, utcOffsetMinutes: number, precision: 'server' | 'minute' | string) {
  const date = dateValue(value)
  if (!date || !Number.isInteger(utcOffsetMinutes) || Math.abs(utcOffsetMinutes) > 840) return 'Not recorded'
  const local = new Date(date.getTime() + utcOffsetMinutes * 60000)
  const text = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', year: 'numeric', month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit',
    ...(precision === 'server' ? { second: '2-digit' as const } : {}),
  }).format(local)
  const offset = `${utcOffsetMinutes < 0 ? '-' : '+'}${String(Math.floor(Math.abs(utcOffsetMinutes) / 60)).padStart(2, '0')}:${String(Math.abs(utcOffsetMinutes) % 60).padStart(2, '0')}`
  return `${text} (UTC${offset})`
}

export function formatDisplayNumber(value: number | null | undefined, options: DisplayOptions & Intl.NumberFormatOptions = {}) {
  if (value == null || !Number.isFinite(value)) return missing(options)
  return new Intl.NumberFormat(options.locale ?? 'en-US', {
    ...(!options.style || options.style === 'decimal' ? { maximumFractionDigits: 20 } : {}), ...options,
  }).format(value)
}

export function formatDisplayCurrency(value: number | null | undefined, currency: string, options: DisplayOptions & Intl.NumberFormatOptions = {}) {
  return formatDisplayNumber(value, { ...options, style: 'currency', currency })
}

export function formatByteSize(value: number | null | undefined, options: DisplayOptions = {}) {
  if (value == null || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) return missing(options)
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
  const power = value === 0 ? 0 : Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)))
  return `${formatDisplayNumber(value / 1024 ** power, { ...options, minimumFractionDigits: power ? 1 : 0, maximumFractionDigits: power ? 1 : 0 })} ${units[power]}`
}
