import { createContext, useCallback, useContext, useMemo } from 'react'
import { customerEnglishMessages } from './customer-messages.generated'

export const CustomerLocaleContext = createContext({ customer: false, pseudo: false, locale: 'en-US' })
export type CustomerMessageId = keyof typeof customerEnglishMessages
let matchers: { bySource: Map<string, CustomerMessageId>; templates: { id: CustomerMessageId; pattern: RegExp; names: string[] }[] } | undefined
function sourceMatchers() {
  if (matchers) return matchers
  const bySource = new Map<string, CustomerMessageId>(Object.entries(customerEnglishMessages).map(([key, value]) => [value, key as CustomerMessageId]))
  const templates = Object.entries(customerEnglishMessages).filter(([, value]) => /\{p\d+\}/.test(value)
  && /[a-zA-Z]{3}/.test(value.replace(/\{p\d+\}/g, ''))).map(([key, value]) => {
  const names: string[] = []
  const pattern = value.split(/(\{p\d+\})/g).map(part => {
    if (/^\{p\d+\}$/.test(part)) { names.push(part.slice(1, -1)); return '(.+?)' }
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }).join('')
  return { id: key as CustomerMessageId, pattern: new RegExp(`^${pattern}$`), names }
  })
  return matchers = { bySource, templates }
}
export function pseudolocalize(message: string) {
  const protectedParts = message.split(/(\{[^}]+\}|\b(?:Phaeno|PSeq|Portal|POMS|RNA|DNA|FASTQ|[A-Z]{2,})\b)/g)
  return `[${protectedParts.map((part, index) => index % 2 ? part : part.replace(/[aeiou]/g, letter => ({ a: 'á', e: 'ë', i: 'ï', o: 'ø', u: 'ü' })[letter] ?? letter)).join('')} ———]`
}
export function useCustomerText() {
  const { customer, pseudo } = useContext(CustomerLocaleContext)
  return useCallback((id: CustomerMessageId, values: Record<string, string | number | null | undefined> = {}) => {
    const source = customerEnglishMessages[id]
    const message = customer && pseudo ? pseudolocalize(source) : source
    return message.replace(/\{(p\d+)\}/g, (_, key: string) => String(values[key] ?? ''))
  }, [customer, pseudo])
}
export function useCustomerSourceText() {
  const text = useCustomerText()
  const { customer, pseudo } = useContext(CustomerLocaleContext)
  return useCallback((source: string) => {
    if (!customer || !pseudo) return source
    const { bySource, templates } = sourceMatchers()
    const id = bySource.get(source)
    if (id) return text(id)
    for (const template of templates) {
      const match = template.pattern.exec(source)
      if (match) return text(template.id, Object.fromEntries(template.names.map((name, index) => [name, match[index + 1]])))
    }
    return source
  }, [text, customer, pseudo])
}
export function CustomerText({ message, values }: { message: CustomerMessageId; values?: Record<string, string | number | null | undefined> }) {
  const text = useCustomerText()
  return text(message, values)
}

export function CustomerSourceText({ source }: { source?: string | null }) {
  return useCustomerSourceText()(source ?? '')
}

export function useCustomerDateFormatter(includeTime = false) {
  const { customer, locale } = useContext(CustomerLocaleContext)
  return useMemo(() => new Intl.DateTimeFormat(customer ? locale : undefined,
    { dateStyle: 'medium', ...(includeTime ? { timeStyle: 'short' as const } : {}) }), [customer, locale, includeTime])
}
