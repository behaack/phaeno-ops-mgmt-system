import { SignInButton, SignOutButton, useUser } from '@clerk/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { CheckCircle2, LogIn, LogOut, ShieldAlert, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  acceptInvitation,
  declineInvitation,
  type Invitation,
} from '#/api/invitations'
import { apiErrorMessage } from '#/api/api-error'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredFieldName, RequiredLegend } from '#/components/ui/required-field'
import {
  clearStoredInviteToken,
  readStoredInviteToken,
  storeInviteToken,
} from '#/features/auth/invitation-storage'
import { usePhaenoSession } from '#/features/auth/session-context'

export const Route = createFileRoute('/accept-invite')({
  component: AcceptInvitePage,
})

export function AcceptInvitePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { authConfigured, clerkLoaded, signedIn, session } = usePhaenoSession()
  const [token, setToken] = useState<string | null>(() => readStoredInviteToken())
  const [firstName, setFirstName] = useState(session?.user?.firstName ?? '')
  const [lastName, setLastName] = useState(session?.user?.lastName ?? '')

  useEffect(() => {
    const url = new URL(window.location.href)
    const tokenFromUrl = url.searchParams.get('token')
    if (!tokenFromUrl) {
      return
    }

    storeInviteToken(tokenFromUrl)
    setToken(tokenFromUrl)
    url.searchParams.delete('token')
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }, [])

  useEffect(() => {
    if (!session?.user) {
      return
    }

    setFirstName((current) => current || session.user?.firstName || '')
    setLastName((current) => current || session.user?.lastName || '')
  }, [session?.user])

  const acceptMutation = useMutation({
    mutationFn: () => {
      if (!token) {
        throw new Error('Missing invite token.')
      }

      return acceptInvitation({ token, firstName, lastName })
    },
    onSuccess: async () => {
      clearStoredInviteToken()
      await queryClient.invalidateQueries({ queryKey: ['session'] })
    },
  })

  const declineMutation = useMutation({
    mutationFn: () => {
      if (!token) {
        throw new Error('Missing invite token.')
      }

      return declineInvitation(token)
    },
    onSuccess: () => {
      clearStoredInviteToken()
    },
  })

  const canSubmit = useMemo(
    () =>
      Boolean(token) &&
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      !acceptMutation.isPending &&
      !declineMutation.isPending,
    [
      acceptMutation.isPending,
      declineMutation.isPending,
      firstName,
      lastName,
      token,
    ],
  )
  const actionError = acceptMutation.error ?? declineMutation.error

  if (!token) {
    return (
      <InviteShell
        title="Invite link unavailable"
        description="This invitation link is missing or has already been cleared from this browser."
        icon={<ShieldAlert aria-hidden="true" className="size-5" />}
      />
    )
  }

  if (!clerkLoaded) {
    return (
      <InviteShell
        title="Loading invitation"
        description="Preparing secure invitation access."
        icon={<ShieldAlert aria-hidden="true" className="size-5" />}
      />
    )
  }

  if (!signedIn) {
    const canCreateDevelopmentAccount = import.meta.env.DEV

    return (
      <InviteShell
        title="Sign in to continue"
        description={
          canCreateDevelopmentAccount
            ? 'Use the invited email address. For a new development account, choose Sign up in the authentication window.'
            : 'Use the email address that received this invitation.'
        }
        icon={<ShieldAlert aria-hidden="true" className="size-5" />}
        footer={
          authConfigured ? (
            <SignInButton
              mode="modal"
              withSignUp={canCreateDevelopmentAccount}
              forceRedirectUrl="/accept-invite"
              fallbackRedirectUrl="/accept-invite"
              signUpForceRedirectUrl="/accept-invite"
              signUpFallbackRedirectUrl="/accept-invite"
            >
              <Button type="button">
                <LogIn aria-hidden="true" />
                {canCreateDevelopmentAccount ? 'Sign in or create account' : 'Sign in'}
              </Button>
            </SignInButton>
          ) : (
            <Button type="button">
              <LogIn aria-hidden="true" />
              Sign in
            </Button>
          )
        }
      />
    )
  }

  if (acceptMutation.isSuccess) {
    return (
      <InviteShell
        title="Invitation accepted"
        description={formatInvitationResult(acceptMutation.data)}
        icon={<CheckCircle2 aria-hidden="true" className="size-5" />}
        footer={
          <Button type="button" onClick={() => void navigate({ to: '/' })}>
            Continue
          </Button>
        }
      />
    )
  }

  if (declineMutation.isSuccess) {
    return (
      <InviteShell
        title="Invitation declined"
        description={formatInvitationResult(declineMutation.data)}
        icon={<XCircle aria-hidden="true" className="size-5" />}
        footer={
          <Button type="button" variant="outline" onClick={() => void navigate({ to: '/' })}>
            Return
          </Button>
        }
      />
    )
  }

  return (
    <main className="page-wrap px-4 py-10">
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>Review invitation</CardTitle>
          <CardDescription>
            Confirm the invited account details before accepting access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvitationSessionNotice />
          <form
            className="mt-4 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (canSubmit) {
                acceptMutation.mutate()
              }
            }}
          >
            <RequiredLegend />
            <div className="grid gap-2">
              <Label htmlFor="first-name">
                <RequiredFieldName>First name</RequiredFieldName>
              </Label>
              <Input
                id="first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="last-name">
                <RequiredFieldName>Last name</RequiredFieldName>
              </Label>
              <Input
                id="last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                required
              />
            </div>
            {actionError ? (
              <Alert variant="destructive">
                <AlertTitle>Invitation could not be completed</AlertTitle>
                <AlertDescription>{apiErrorMessage(actionError)}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={!canSubmit}>
                Accept
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={acceptMutation.isPending || declineMutation.isPending}
                onClick={() => declineMutation.mutate()}
              >
                Decline
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

function InvitationSessionNotice() {
  const { user } = useUser()
  const email = user?.primaryEmailAddress?.emailAddress

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="m-0 text-sm text-muted-foreground" role="status">
        {email ? <>Currently signed in as <span className="font-medium text-foreground">{email}</span>.</> : 'Currently signed in to Clerk.'}
      </p>
      <SignOutButton redirectUrl="/accept-invite">
        <Button type="button" size="sm" variant="outline">
          <LogOut aria-hidden="true" />
          Sign out and use invited email
        </Button>
      </SignOutButton>
    </div>
  )
}

function InviteShell({
  title,
  description,
  icon,
  footer,
}: {
  title: string
  description: string
  icon: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="page-wrap px-4 py-10">
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {footer ? <CardFooter>{footer}</CardFooter> : null}
      </Card>
    </main>
  )
}

function formatInvitationResult(invitation: Invitation) {
  return invitation.organizationName
    ? `${invitation.organizationName} access was updated.`
    : 'Your invitation status was updated.'
}
