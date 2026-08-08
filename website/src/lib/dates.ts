export function formatContentDate(
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions = {},
  locale = 'en-US',
) {
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: 'UTC',
  }).format(new Date(value))
}
