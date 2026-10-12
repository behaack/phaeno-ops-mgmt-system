import { useContext, useMemo } from 'react'
import { CustomerLocaleContext, useCustomerSourceText } from './customer-text'

type Localized<T> = T extends string ? string : T extends (...args: infer A) => string ? (...args: A) => string
  : T extends object ? { [K in keyof T]: Localized<T[K]> } : T

/** For application-owned message dictionaries, never record payloads or scientific data. */
export function useCustomerMessages<T extends object>(messages: T): Localized<T> {
  const { customer, pseudo } = useContext(CustomerLocaleContext)
  const translate = useCustomerSourceText()
  return useMemo(() => {
    if (!customer || !pseudo) return messages as Localized<T>
    function localize(value: unknown): unknown {
      if (typeof value === 'string') return translate(value)
      if (typeof value === 'function') return (...args: unknown[]) => translate(value(...args))
      if (Array.isArray(value)) return value.map(localize)
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localize(item)]))
      return value
    }
    return localize(messages) as Localized<T>
  }, [messages, customer, pseudo, translate])
}
