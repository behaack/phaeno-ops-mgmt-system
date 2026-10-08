// Explicitly simulated UI acceptance. Companion test intercepts every API request.
import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CompleteLabJob } from '../../src/features/orders/operations/CompleteLabJob'
import { CancellationDecisionPanel } from '../../src/features/orders/operations/CancellationDecisionPanel'
import { type LabServiceOrder, type CancellationRequest } from '../../src/api/order-management'
import { configureApiAuth } from '../../src/api/client'
import { applyThemeMode } from '../../src/components/theme-mode'
import '../../src/styles.css'

applyThemeMode('auto')
configureApiAuth({ getSelectedOrganizationId: () => '11111111-1111-4111-8111-111111111111' })
const order = { id: '22222222-2222-4222-8222-222222222222', orderNumber: 'TEST-REMAINING', customerReference: 'Synthetic final outcomes', version: 9,
  status: 'InProgress', samples: [{ id: 'completed', status: 'Completed' }, { id: 'failed', status: 'Failed' }],
} as LabServiceOrder
function App() {
  const [saved, setSaved] = useState(false)
  return <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
    <h1 className="text-2xl font-semibold">Remaining workflow checks</h1>
    <p>SIMULATED records · No real billing or laboratory writes</p>
    {saved ? <p role="status">Decision saved</p> : null}
    <CompleteLabJob order={order} authorized onSaved={async () => { setSaved(true) }} />
    <CancellationDecisionPanel workflowPath="lab-service-orders" recordId={order.id} version={9}
      requests={[{ id: '33333333-3333-4333-8333-333333333333', createdAt: '2026-09-15T00:00:00Z', status: 'Pending', reason: 'Cancel the unreceived sample.' }] as CancellationRequest[]}
      labSamples={[{ id: '44444444-4444-4444-8444-444444444444', customerSampleId: 'SAMPLE-UNRECEIVED', status: 'Expected' }, { id: '55555555-5555-4555-8555-555555555555', customerSampleId: 'SAMPLE-RECEIVED', status: 'Received' }]}
      onSaved={async () => { setSaved(true) }} />
  </main>
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>)
