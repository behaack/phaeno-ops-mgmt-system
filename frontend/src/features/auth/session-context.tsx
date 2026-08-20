import {
  ClerkProvider,
  SignIn,
  SignOutButton,
  TaskSetupMFA,
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
import { readStoredInviteToken } from '#/features/auth/invitation-storage'

const SELECTED_ORGANIZATION_STORAGE_KEY = 'phaeno.selectedOrganizationId'

export type PhaenoSessionContextValue = {
  authConfigured: boolean
  authProvider: 'clerk' | 'mock' | 'none'
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
  const useMockSession =
    import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_SESSION !== 'false'

  if (useMockSession) {
    return <MockSessionProvider>{children}</MockSessionProvider>
  }

  if (!publishableKey) {
    return <AuthConfigurationMissing>{children}</AuthConfigurationMissing>
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      taskUrls={{ 'setup-mfa': '/session-tasks/setup-mfa' }}
      appearance={{
        variables: {
          colorPrimary: 'var(--primary)',
          colorForeground: 'var(--foreground)',
          colorBackground: 'var(--card)',
          colorMutedForeground: 'var(--muted-foreground)',
          colorInput: 'var(--background)',
          colorInputForeground: 'var(--foreground)',
          borderRadius: 'var(--radius)',
          fontFamily: '"Geist Variable", ui-sans-serif, system-ui, sans-serif',
        },
        elements: {
          footer: { display: 'none' },
          footerAction: { display: 'none' },
          headerTitle: { display: 'none' },
          headerSubtitle: { display: 'none' },
          rootBox: { width: '100%' },
          cardBox: {
            width: '100%',
            border: '0',
            borderRadius: '0',
            background: 'transparent',
            boxShadow: 'none',
          },
          card: {
            paddingTop: '0',
            borderRadius: '0',
            background: 'transparent',
            boxShadow: 'none',
          },
          formFieldInput: {
            borderColor: 'var(--input)',
            background: 'var(--background)',
          },
          formButtonPrimary: {
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
          },
        },
      }}
      localization={{
        signIn: {
          start: {
            title: 'Sign in',
            titleCombined: 'Sign in',
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
  >(null)
  const selectedOrganizationIdRef = useRef(selectedOrganizationId)

  useEffect(() => {
    setSelectedOrganizationIdState(readStoredSelectedOrganizationId())
  }, [])

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
      authProvider: 'clerk',
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

  if (!clerkLoaded) {
    return <AuthBootstrapState />
  }

  if (isLoading) {
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
  const hasPendingInvitation = Boolean(readStoredInviteToken())
  return (
    <AccessState
      title={stateContent.title}
      description={stateContent.description}
      action={
        <div className="flex flex-wrap gap-2">
          {hasPendingInvitation && session?.state !== 'disabled' ? (
            <Button asChild>
              <a href="/accept-invite">Continue invitation</a>
            </Button>
          ) : null}
          <SignOutButton redirectUrl="/">
            <Button type="button" variant="outline">
              <LogOut aria-hidden="true" />
              Sign out
            </Button>
          </SignOutButton>
        </div>
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
      authProvider: 'none',
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
        authProvider: 'none',
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

function AuthBootstrapState() {
  return (
    <main
      className="page-wrap flex flex-1 items-center justify-center px-4 py-8"
      aria-busy="true"
    >
      <span className="sr-only" role="status">
        Checking sign-in status.
      </span>
    </main>
  )
}

function SignInAccessState() {
  return (
    <AuthenticationPanel
      ariaLabel="Phaeno Portal sign in"
      title="Sign in"
      description="Secure, invitation-only access for Phaeno customers, partners, and staff."
    >
      <div className="phaeno-sign-in-form flex w-full justify-center">
        <SignIn routing="hash" fallbackRedirectUrl="/" withSignUp={false} />
      </div>
    </AuthenticationPanel>
  )
}

export function MfaSetupAccessState() {
  return (
    <AuthenticationPanel
      ariaLabel="Phaeno Portal multi-factor authentication setup"
      title="Secure your Portal account"
      description="Connect an authenticator app, then save your one-time backup codes somewhere safe."
    >
      <div className="phaeno-mfa-setup flex w-full justify-center">
        <TaskSetupMFA redirectUrlComplete="/" />
      </div>
    </AuthenticationPanel>
  )
}

function AuthenticationPanel({
  ariaLabel,
  title,
  description,
  children,
}: {
  ariaLabel: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <main className="page-wrap flex flex-1 items-center justify-center px-4 py-8">
      <section
        className="flex w-full max-w-md flex-col items-center"
        aria-label={ariaLabel}
      >
        <div
          className="w-full overflow-hidden rounded-xl border bg-card"
          style={{
            boxShadow:
              '0 18px 50px color-mix(in oklab, var(--foreground) 10%, transparent)',
          }}
        >
          <div className="flex flex-col items-center px-8 pt-8 text-center">
            <img
              src="/phaeno124x40.webp"
              alt="Phaeno"
              width={124}
              height={40}
              className="h-10 w-[124px] object-contain"
            />
            <p className="mt-2 text-xs font-semibold tracking-[0.28em] text-foreground uppercase">
              Portal
            </p>
            <h1 className="mt-6 text-xl font-semibold text-foreground">
              {title}
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}

function getAccessStateContent(state: SessionResponse['state'] | undefined) {
  switch (state) {
    case 'disabled':
      return {
        title: 'Access disabled',
        description: 'Your Portal account is disabled.',
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

const mockSession: SessionResponse = {
  state: 'ready',
  user: {
    id: 'mock-user-bill-haack',
    email: 'bill.haack@phaeno.com',
    firstName: 'Bill',
    lastName: 'Haack',
    status: 'Active',
  },
  memberships: [
    {
      membershipId: 'mock-membership-phaeno',
      organizationId: 'phaeno',
      organizationName: 'Phaeno',
      organizationKind: 'Phaeno',
      isOrganizationAdmin: true,
    },
    {
      membershipId: 'mock-membership-prospect',
      organizationId: '7dbd474b-c73f-4df4-a9c9-9f1a72b5341b',
      organizationName: 'Helix Discovery Group',
      organizationKind: 'Prospect',
      isOrganizationAdmin: true,
    },
    {
      membershipId: 'mock-membership-northline',
      organizationId: 'northline-labs',
      organizationName: 'Northline Labs',
      organizationKind: 'Customer',
      isOrganizationAdmin: true,
    },
    {
      membershipId: 'mock-membership-valley',
      organizationId: 'valley-diagnostics',
      organizationName: 'Valley Diagnostics',
      organizationKind: 'Customer',
      isOrganizationAdmin: false,
    },
    {
      membershipId: 'mock-membership-partner',
      organizationId: 'genome-partner',
      organizationName: 'Genome Partner Network',
      organizationKind: 'Partner',
      isOrganizationAdmin: true,
    },
  ],
  isPlatformAdmin: true,
  selectedOrganization: {
    organizationId: 'phaeno',
    membershipId: 'mock-membership-phaeno',
    isAvailable: true,
  },
  capabilities: {
    canInviteUsers: true,
    canManageMembers: true,
    canChangeMemberRoles: true,
    canLeaveOrganization: false,
    canManageOrganizations: true,
    canManageAllUsers: true,
    canDisableUsers: true,
    canViewDatasetConfiguration: true,
    canManageDatasetDrafts: true,
    canPublishDatasets: true,
    canProvisionOrganizationData: true,
    canViewOrganizationDatasets: false,
    canViewLabServiceOrders: false,
    canCreateLabServiceRequests: false,
    canSubmitLabServiceRequests: false,
    canAcceptLabServiceQuotes: false,
    canRequestLabServiceCancellation: false,
    canViewSampleProgress: false,
    canViewSampleShipping: false,
    canManageSampleShipping: false,
    canDownloadLabResults: false,
    canViewReagentOrders: false,
    canCreateReagentOrders: false,
    canPlaceReagentOrders: false,
    canApproveReagentSubstitutions: false,
    canRequestReagentCancellation: false,
    canViewDataAssemblyRequests: false,
    canCreateDataAssemblyRequests: false,
    canSubmitDataAssemblyRequests: false,
    canAcceptDataAssemblyQuotes: false,
    canRequestDataAssemblyCancellation: false,
    canDownloadDataAssemblyOutputs: false,
    canViewAllOperationalOrders: true,
    canManageOrderConfiguration: true,
    canManageFileManagementConfiguration: true,
    canQuoteLabServiceWork: true,
    canManageLabOperations: true,
    canOperateLabWork: true,
    canSuperviseLabWork: true,
    canManageLabProtocols: true,
    canReviewLabWork: true,
    canManageLabAccess: true,
    canManageReagentFulfillment: true,
    canManageDataAssembly: true,
    canManageOrderIntegrations: true,
    canViewOrderAudit: true,
  },
}

function MockSessionProvider({ children }: { children: ReactNode }) {
  const [selectedOrganizationId, setSelectedOrganizationIdState] = useState<string | null>(
    mockSession.selectedOrganization?.organizationId ?? null,
  )

  useEffect(() => {
    const storedOrganizationId = readStoredSelectedOrganizationId()
    if (storedOrganizationId) {
      setSelectedOrganizationIdState(storedOrganizationId)
    }
  }, [])

  function setSelectedOrganizationId(organizationId: string | null) {
    setSelectedOrganizationIdState(organizationId)
    if (typeof window === 'undefined') return
    if (organizationId) {
      window.localStorage.setItem(SELECTED_ORGANIZATION_STORAGE_KEY, organizationId)
    } else {
      window.localStorage.removeItem(SELECTED_ORGANIZATION_STORAGE_KEY)
    }
  }

  const contextValue = useMemo<PhaenoSessionContextValue>(() => {
    const selectedMembership = mockSession.memberships.find(
      (membership) => membership.organizationId === selectedOrganizationId,
    )
    const selectedIsExternal =
      selectedMembership?.organizationKind === 'Prospect' ||
      selectedMembership?.organizationKind === 'Customer' ||
      selectedMembership?.organizationKind === 'Partner'
    const contextualSession: SessionResponse = {
      ...mockSession,
      selectedOrganization: selectedMembership
        ? {
            organizationId: selectedMembership.organizationId,
            membershipId: selectedMembership.membershipId,
            isAvailable: true,
          }
        : null,
      capabilities: {
        ...mockSession.capabilities,
        canViewOrganizationDatasets: selectedIsExternal,
        canViewLabServiceOrders: selectedMembership?.organizationKind === 'Customer',
        canCreateLabServiceRequests:
          selectedMembership?.organizationKind === 'Customer' && selectedMembership.isOrganizationAdmin,
        canSubmitLabServiceRequests:
          selectedMembership?.organizationKind === 'Customer' && selectedMembership.isOrganizationAdmin,
        canAcceptLabServiceQuotes:
          selectedMembership?.organizationKind === 'Customer' && selectedMembership.isOrganizationAdmin,
        canRequestLabServiceCancellation:
          selectedMembership?.organizationKind === 'Customer' && selectedMembership.isOrganizationAdmin,
        canViewSampleProgress: selectedMembership?.organizationKind === 'Customer',
        canDownloadLabResults: selectedMembership?.organizationKind === 'Customer',
        canViewReagentOrders: selectedMembership?.organizationKind === 'Partner',
        canCreateReagentOrders:
          selectedMembership?.organizationKind === 'Partner' && selectedMembership.isOrganizationAdmin,
        canPlaceReagentOrders:
          selectedMembership?.organizationKind === 'Partner' && selectedMembership.isOrganizationAdmin,
        canApproveReagentSubstitutions:
          selectedMembership?.organizationKind === 'Partner' && selectedMembership.isOrganizationAdmin,
        canRequestReagentCancellation:
          selectedMembership?.organizationKind === 'Partner' && selectedMembership.isOrganizationAdmin,
        canViewDataAssemblyRequests: selectedMembership?.organizationKind === 'Partner',
        canCreateDataAssemblyRequests:
          selectedMembership?.organizationKind === 'Partner' && selectedMembership.isOrganizationAdmin,
        canSubmitDataAssemblyRequests:
          selectedMembership?.organizationKind === 'Partner' && selectedMembership.isOrganizationAdmin,
        canAcceptDataAssemblyQuotes:
          selectedMembership?.organizationKind === 'Partner' && selectedMembership.isOrganizationAdmin,
        canRequestDataAssemblyCancellation:
          selectedMembership?.organizationKind === 'Partner' && selectedMembership.isOrganizationAdmin,
        canDownloadDataAssemblyOutputs: selectedMembership?.organizationKind === 'Partner',
        canViewAllOperationalOrders: selectedMembership?.organizationKind === 'Phaeno',
        canManageOrderConfiguration: selectedMembership?.organizationKind === 'Phaeno',
        canManageFileManagementConfiguration: selectedMembership?.organizationKind === 'Phaeno',
        canQuoteLabServiceWork: selectedMembership?.organizationKind === 'Phaeno',
        canManageLabOperations: selectedMembership?.organizationKind === 'Phaeno',
        canOperateLabWork: selectedMembership?.organizationKind === 'Phaeno',
        canSuperviseLabWork: selectedMembership?.organizationKind === 'Phaeno',
        canManageLabProtocols: selectedMembership?.organizationKind === 'Phaeno',
        canReviewLabWork: selectedMembership?.organizationKind === 'Phaeno',
        canManageLabAccess: selectedMembership?.organizationKind === 'Phaeno',
        canManageReagentFulfillment: selectedMembership?.organizationKind === 'Phaeno',
        canManageDataAssembly: selectedMembership?.organizationKind === 'Phaeno',
        canManageOrderIntegrations: selectedMembership?.organizationKind === 'Phaeno',
        canViewOrderAudit: selectedMembership?.organizationKind === 'Phaeno',
      },
    }

    return {
      authConfigured: true,
      authProvider: 'mock',
      clerkLoaded: true,
      signedIn: true,
      session: contextualSession,
      isLoading: false,
      error: null,
      selectedOrganizationId,
      setSelectedOrganizationId,
    }
  }, [selectedOrganizationId])

  return (
    <PhaenoSessionContext.Provider value={contextValue}>
      {children}
    </PhaenoSessionContext.Provider>
  )
}
