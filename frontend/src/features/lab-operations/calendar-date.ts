const calendarDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC',
})

// Calendar dates have no timezone; preserve the recorded day for every viewer.
export function formatCalendarDate(value: string) {
  return calendarDateFormatter.format(new Date(`${value}T00:00:00Z`))
}
