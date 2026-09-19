// Simulated unavailable authentication: the real AuthGate must never render protected children.
import { createRoot } from 'react-dom/client'
import { AuthGate, PhaenoSessionContext, type PhaenoSessionContextValue } from '../../src/features/auth/session-context'
import '../../src/styles.css'
const session: PhaenoSessionContextValue = {
  authConfigured: false, authProvider: 'none', clerkLoaded: true, signedIn: false,
  session: null, isLoading: false, error: new Error('Authentication unavailable'),
  selectedOrganizationId: null, setSelectedOrganizationId: () => undefined,
}
createRoot(document.getElementById('root')!).render(<PhaenoSessionContext.Provider value={session}><AuthGate><main><h1>Protected Job</h1><button>Complete Job</button><button>Download</button></main></AuthGate></PhaenoSessionContext.Provider>)
