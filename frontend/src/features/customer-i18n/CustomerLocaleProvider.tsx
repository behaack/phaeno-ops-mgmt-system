import type { ReactNode } from 'react'
import { getSelectedMembership, usePhaenoSession } from '#/features/auth/session-context'
import { CustomerLocaleContext } from './customer-text'

export function CustomerLocaleProvider({ children }: { children: ReactNode }) {
  const { session, selectedOrganizationId } = usePhaenoSession()
  const customer = getSelectedMembership(session, selectedOrganizationId)?.organizationKind === 'Customer'
  return <CustomerLocaleContext.Provider value={{ customer, locale: 'en-US', pseudo: customer && import.meta.env.DEV && import.meta.env.VITE_CUSTOMER_PSEUDOLOCALE === 'true' }}>{children}</CustomerLocaleContext.Provider>
}
