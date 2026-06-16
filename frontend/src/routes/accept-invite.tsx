import { SignInButton } from '@clerk/react'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { CheckCircle2, LogIn, ShieldAlert, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  acceptInvitation,
  declineInvitation,
  type Invitation,
} from '#/api/invitations'
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
import { usePhaenoSession } from '#/features/auth/session-context'

export const INVITE_TOKEN_STORAGE_KEY = 'phaeno.pendingInviteToken'

export const Route = createFileRoute('/accept-invite')({
  component: AcceptInvitePage,
})

export function AcceptInvitePage() {
  const navigate = useNavigate()
  const { authConfigured, clerkLoaded, signedIn, session } = usePhaenoSession()
  const [token, setToken] = useState<string | null>(() => readStoredToken())
  const [firstName, setFirstName] = useState(session?.user?.firstName ?? '')
  const [lastName, setLastName] = useState(session?.user?.lastName ?? '')

  useEffect(() => {
    const url = new URL(window.location.href)
    const tokenFromUrl = url.searchParams.get('token')
    if (!tokenFromUrl) {
      return
    }

    storeToken(tokenFromUrl)
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
    onSuccess: () => {
      clearStoredToken()
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
      clearStoredToken()
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
    return (
      <InviteShell
        title="Sign in to continue"
        description="Use the email address that received this invitation."
        icon={<ShieldAlert aria-hidden="true" className="size-5" />}
        footer={
          authConfigured ? (
            <SignInButton mode="modal" withSignUp={false}>
              <Button type="button">
                <LogIn aria-hidden="true" />
                Sign in
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
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (canSubmit) {
                acceptMutation.mutate()
              }
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="first-name">First name</Label>
              <Input
                id="first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="last-name">Last name</Label>
              <Input
                id="last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
              />
            </div>
            {acceptMutation.isError || declineMutation.isError ? (
              <p className="m-0 text-sm text-destructive">
                The invitation could not be completed.
              </p>
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

function readStoredToken() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.sessionStorage.getItem(INVITE_TOKEN_STORAGE_KEY)
}

function storeToken(token: string) {
  window.sessionStorage.setItem(INVITE_TOKEN_STORAGE_KEY, token)
}

function clearStoredToken() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(INVITE_TOKEN_STORAGE_KEY)
}
