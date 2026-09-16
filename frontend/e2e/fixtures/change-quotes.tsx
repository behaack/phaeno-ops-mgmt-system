// Explicitly simulated UI acceptance; every API write is intercepted by its test.
import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { IssueLabChangeQuote, LabChangeQuotes } from '../../src/features/orders/LabChangeQuotes'
import { type LabServiceOrder, type OrderConfiguration } from '../../src/api/order-management'
import { configureApiAuth } from '../../src/api/client'
import { PhaenoSessionContext, type PhaenoSessionContextValue } from '../../src/features/auth/session-context'
import { noSessionCapabilities } from '../../src/test-helpers/session'
import { applyThemeMode } from '../../src/components/theme-mode'
import '../../src/styles.css'

applyThemeMode('auto')
configureApiAuth({ getSelectedOrganizationId: () => '11111111-1111-4111-8111-111111111111' })
const order = { id: '22222222-2222-4222-8222-222222222222', organizationId: 'org', orderNumber: 'TEST-CHANGE', version: 5, requestedSpecimenCount: 2, status: 'InProgress', quotes: [{ id: '33333333-3333-4333-8333-333333333333', purpose: 'Change', status: 'Issued', revision: 2, total: 100, subtotal: 100, currency: 'USD', expiresAt: '2099-01-01T00:00:00Z', changeScopeSnapshotJson: JSON.stringify({ additionalSources: [{ biologicalSource: 'Mouse liver', specimenCount: 1 }] }) }] } as LabServiceOrder
const context = { authProvider: 'clerk', session: { memberships: [{ organizationId: 'org', isOrganizationAdmin: true }], capabilities: { ...noSessionCapabilities, canAcceptLabServiceQuotes: true }, selectedDepartment: { purchaseOrderRequired: true } } } as PhaenoSessionContextValue
const catalog = [{ id: '44444444-4444-4444-8444-444444444444', isPSeqLabService: true, isActive: true, salesUnit: 'specimen', basePrice: 100 }] as OrderConfiguration['catalogItems']
function App() {
  const [saved, setSaved] = useState(0)
  return <main className="mx-auto max-w-3xl space-y-5 px-4 py-8"><h1 className="text-2xl font-semibold">Change quote acceptance</h1><p>SIMULATED records · No real purchases</p>
    <p role="status">Saved decisions: {saved}</p>
    <IssueLabChangeQuote order={order} catalogItems={catalog} onSaved={async () => setSaved(value => value + 1)} />
    <LabChangeQuotes order={order} onSaved={async () => setSaved(value => value + 1)} />
  </main>
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient()}><PhaenoSessionContext.Provider value={context}><App /></PhaenoSessionContext.Provider></QueryClientProvider>)
