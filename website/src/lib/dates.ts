export function formatContentDate(
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions = {},
) {
  return new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone: 'UTC',
  }).format(new Date(value))
}
