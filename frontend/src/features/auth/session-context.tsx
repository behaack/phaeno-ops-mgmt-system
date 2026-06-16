import {
  ClerkProvider,
  SignIn,
  SignOutButton,
  useAuth,
} from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { LogOut, ShieldAlert } from 'lucide-react'

import { configureApiAuth } from '#/api/client'
import {
  getSession,
  type SessionMembership,
  type SessionResponse,
} from '#/api/session'
import { Button } from '#/components/ui/button'

const SELECTED_ORGANIZATION_STORAGE_KEY = 'phaeno.selectedOrganizationId'

export type PhaenoSessionContextValue = {
  authConfigured: boolean
  clerkLoaded: boolean
  signedIn: boolean
  session: SessionResponse | null
  isLoading: boolean
  error: unknown
  selectedOrganizationId: string | null
  setSelectedOrganizationId: (organizationId: string | null) => void
}

export const PhaenoSessionContext =
  createContext<PhaenoSessionContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
    | string
    | undefined

  if (!publishableKey) {
    return <AuthConfigurationMissing>{children}</AuthConfigurationMissing>
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{ elements: { footerAction: 'hidden' } }}
      localization={{
        signIn: {
          start: {
            title: 'Sign in to Phaeno Portal',
            titleCombined: 'Sign in to Phaeno Portal',
          },
        },
      }}
    >
      <PhaenoSessionProvider>{children}</PhaenoSessionProvider>
    </ClerkProvider>
  )
}

export function PhaenoSessionProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const [selectedOrganizationId, setSelectedOrganizationIdState] = useState<
    string | null
  >(() => readStoredSelectedOrganizationId())
  const selectedOrganizationIdRef = useRef(selectedOrganizationId)

  useEffect(() => {
    selectedOrganizationIdRef.current = selectedOrganizationId
  }, [selectedOrganizationId])

  useEffect(() => {
    configureApiAuth({
      getToken: () => getToken(),
      getSelectedOrganizationId: () => selectedOrganizationIdRef.current,
    })

    return () => configureApiAuth({})
  }, [getToken])

  const sessionQuery = useQuery({
    queryKey: ['session', selectedOrganizationId],
    queryFn: getSession,
    enabled: isLoaded && isSignedIn,
  })

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setSelectedOrganizationId(null)
      return
    }

    const memberships = sessionQuery.data?.memberships ?? []
    if (memberships.length === 1 && selectedOrganizationId !== memberships[0].organizationId) {
      setSelectedOrganizationId(memberships[0].organizationId)
      return
    }

    if (
      selectedOrganizationId &&
      memberships.length > 0 &&
      !memberships.some(
        (membership) => membership.organizationId === selectedOrganizationId,
      )
    ) {
      setSelectedOrganizationId(memberships[0].organizationId)
    }
  }, [isLoaded, isSignedIn, selectedOrganizationId, sessionQuery.data])

  const contextValue = useMemo<PhaenoSessionContextValue>(
    () => ({
      authConfigured: true,
      clerkLoaded: isLoaded,
      signedIn: Boolean(isSignedIn),
      session: sessionQuery.data ?? null,
      isLoading: !isLoaded || (Boolean(isSignedIn) && sessionQuery.isLoading),
      error: sessionQuery.error,
      selectedOrganizationId,
      setSelectedOrganizationId,
    }),
    [
      isLoaded,
      isSignedIn,
      selectedOrganizationId,
      sessionQuery.data,
      sessionQuery.error,
      sessionQuery.isLoading,
    ],
  )

  return (
    <PhaenoSessionContext.Provider value={contextValue}>
      {children}
    </PhaenoSessionContext.Provider>
  )

  function setSelectedOrganizationId(organizationId: string | null) {
    setSelectedOrganizationIdState(organizationId)
    if (typeof window === 'undefined') {
      return
    }

    if (organizationId) {
      window.localStorage.setItem(
        SELECTED_ORGANIZATION_STORAGE_KEY,
        organizationId,
      )
    } else {
      window.localStorage.removeItem(SELECTED_ORGANIZATION_STORAGE_KEY)
    }
  }
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { authConfigured, clerkLoaded, signedIn, session, isLoading, error } =
    usePhaenoSession()

  if (!clerkLoaded || isLoading) {
    return <AccessState title="Loading access" description="Checking session." />
  }

  if (error && !signedIn) {
    return (
      <AccessState
        title="Authentication is not configured"
        description="Set VITE_CLERK_PUBLISHABLE_KEY to enable Clerk sign-in."
      />
    )
  }

  if (!signedIn && authConfigured) {
    return <SignInAccessState />
  }

  if (error) {
    return (
      <AccessState
        title="Access check failed"
        description="The portal could not verify local access."
      />
    )
  }

  if (session?.state === 'ready') {
    return children
  }

  const stateContent = getAccessStateContent(session?.state)
  return (
    <AccessState
      title={stateContent.title}
      description={stateContent.description}
      action={
        <SignOutButton redirectUrl="/">
          <Button type="button" variant="outline">
            <LogOut aria-hidden="true" />
            Sign out
          </Button>
        </SignOutButton>
      }
    />
  )
}

export function usePhaenoSession() {
  const context = useContext(PhaenoSessionContext)
  if (!context) {
    return {
      clerkLoaded: false,
      authConfigured: false,
      signedIn: false,
      session: null,
      isLoading: false,
      error: null,
      selectedOrganizationId: null,
      setSelectedOrganizationId: () => undefined,
    } satisfies PhaenoSessionContextValue
  }

  return context
}

export function getSelectedMembership(
  session: SessionResponse | null,
  selectedOrganizationId: string | null,
): SessionMembership | null {
  if (!session) {
    return null
  }

  return (
    session.memberships.find(
      (membership) => membership.organizationId === selectedOrganizationId,
    ) ?? null
  )
}

function AuthConfigurationMissing({ children }: { children: ReactNode }) {
  return (
    <PhaenoSessionContext.Provider
      value={{
        authConfigured: false,
        clerkLoaded: true,
        signedIn: false,
        session: null,
        isLoading: false,
        error: new Error('Missing Clerk publishable key.'),
        selectedOrganizationId: null,
        setSelectedOrganizationId: () => undefined,
      }}
    >
      {children}
    </PhaenoSessionContext.Provider>
  )
}

function AccessState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <main className="page-wrap px-4 py-12">
      <section className="mx-auto flex max-w-xl flex-col items-start gap-4 rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <ShieldAlert aria-hidden="true" className="size-5" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="m-0 text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </section>
    </main>
  )
}

function SignInAccessState() {
  return (
    <main className="page-wrap flex flex-1 items-center justify-center px-4 py-8">
      <section className="flex w-full max-w-xl justify-center">
        <InlineSignIn />
      </section>
    </main>
  )
}

function InlineSignIn() {
  return (
    <div className="phaeno-sign-in-form flex w-full justify-center pt-2">
      <SignIn routing="hash" fallbackRedirectUrl="/" withSignUp={false} />
    </div>
  )
}

function getAccessStateContent(state: SessionResponse['state'] | undefined) {
  switch (state) {
    case 'disabled':
      return {
        title: 'Access disabled',
        description: 'Your Phaeno Portal account is disabled.',
      }
    case 'no_active_memberships':
      return {
        title: 'No active organization access',
        description: 'Your account has no active organization memberships.',
      }
    case 'organization_unavailable':
      return {
        title: 'Organization unavailable',
        description: 'The selected organization is inactive or unavailable.',
      }
    default:
      return {
        title: 'Access unavailable',
        description: 'Your sign-in is valid, but local portal access is missing.',
      }
  }
}

function readStoredSelectedOrganizationId() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(SELECTED_ORGANIZATION_STORAGE_KEY)
}
