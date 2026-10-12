// Synthetic scope/draft fixture; never imported by production routes.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PhaenoSessionContext, type PhaenoSessionContextValue } from '../../src/features/auth/session-context'
import { noSessionCapabilities } from '../../src/test-helpers/session'
import { UserMenu } from '../../src/components/UserMenu'
import { Button } from '../../src/components/ui/button'
import { Input } from '../../src/components/ui/input'
import { Field } from '../../src/components/ui/field'
import { Label } from '../../src/components/ui/label'
import { useModalDraftGuard } from '../../src/features/orders/use-modal-draft-guard'
import { PortalRouterContext } from './portal-router-context'
import '../../src/styles.css'

const departments = ['general', 'research'].map(departmentId => ({ departmentId, departmentName: departmentId === 'general' ? 'General' : 'Research', departmentCode: departmentId, isDefault: departmentId === 'general', isDepartmentAdmin: false }))
const memberships = ['phaeno', 'customer'].map(organizationId => ({ membershipId: organizationId, organizationId, organizationName: organizationId === 'phaeno' ? 'Phaeno' : 'My Customer', organizationKind: organizationId === 'phaeno' ? 'Phaeno' as const : 'Customer' as const, isOrganizationAdmin: true, departments }))

function Draft() {
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  useModalDraftGuard(Boolean(note), pending)
  return <div className="space-y-4">
    <Field><Label htmlFor="scope-note">Unsaved note</Label><Input id="scope-note" value={note} onChange={event => setNote(event.target.value)} disabled={pending} /></Field>
    {pending ? <><p role="status">Save in progress</p><Button onClick={() => setPending(false)}>Finish fixture save</Button></> : <Button onClick={() => setPending(true)}>Start fixture save</Button>}
  </div>
}

function Fixture() {
  const [organization, setOrganization] = useState('phaeno')
  const [department, setDepartment] = useState('general')
  const context: PhaenoSessionContextValue = {
    authConfigured: true, authProvider: 'mock', clerkLoaded: true, signedIn: true, isLoading: false, error: null,
    selectedOrganizationId: organization, selectedDepartmentId: department,
    setSelectedOrganizationId: value => { setOrganization(value ?? 'phaeno'); setDepartment('general') },
    setSelectedDepartmentId: value => setDepartment(value ?? 'general'),
    session: { state: 'ready', user: { id: 'user', email: 'scope@example.test', firstName: 'Scope', lastName: 'Reviewer', status: 'Active' }, memberships,
      isPlatformAdmin: false, selectedOrganization: { organizationId: organization, membershipId: organization, isAvailable: true },
      capabilities: noSessionCapabilities },
  }
  return <PhaenoSessionContext.Provider value={context}><main className="page-wrap space-y-4 p-4">
    <UserMenu /><h1 className="text-xl font-semibold">Scope switching fixture</h1>
    <p>Scope: {organization === 'phaeno' ? 'Phaeno' : 'My Customer'} / {department === 'general' ? 'General' : 'Research'}</p>
    <Draft key={`${organization}:${department}`} />
  </main></PhaenoSessionContext.Provider>
}

createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient()}><PortalRouterContext><Fixture /></PortalRouterContext></QueryClientProvider>)
