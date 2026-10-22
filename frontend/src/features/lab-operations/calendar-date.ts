import { formatDisplayDate } from '#/lib/display-format'

// Preserve a recorded calendar day independently of the viewer's timezone.
export function formatCalendarDate(value: string) { return formatDisplayDate(value) }
