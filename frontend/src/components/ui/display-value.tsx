import { useContext } from 'react'
import { CustomerLocaleContext } from '#/features/customer-i18n/customer-text'
import { formatDisplayDate, formatDisplayTimestamp } from '#/lib/display-format'

type Props = { value: string | Date | null | undefined; seconds?: boolean; empty?: string }
export function DisplayTimestamp({ value, seconds, empty }: Props) {
  const { locale } = useContext(CustomerLocaleContext)
  return formatDisplayTimestamp(value, { locale, seconds, empty })
}
export function DisplayDate({ value, empty }: Props) {
  const { locale } = useContext(CustomerLocaleContext)
  return formatDisplayDate(value, { locale, empty })
}
