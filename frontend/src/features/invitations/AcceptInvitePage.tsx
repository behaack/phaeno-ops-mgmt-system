import { SignOutButton, useUser } from '@clerk/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, LockKeyhole, Mail } from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { InvitationAuthentication } from './InvitationAuthentication'
import { apiErrorMessage } from '#/api/api-error'
import { acceptInvitation, declineInvitation, previewInvitation, type InvitationPreview } from '#/api/invitations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredFieldName, RequiredLegend } from '#/components/ui/required-field'
import { clearStoredInviteToken, readStoredInviteToken, storeInviteToken } from '#/features/auth/invitation-storage'
import { usePhaenoSession } from '#/features/auth/session-context'

export function AcceptInvitePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const auth = usePhaenoSession()
  const [token, setToken] = useState<string | null>(null)
  const [tokenReady, setTokenReady] = useState(false)
  const [outcome, setOutcome] = useState<{ status: 'accepted' | 'declined'; organizationName: string | null } | null>(null)
  // Scope private data to this page without putting the secret token in cache keys.
  const previewId = useId()
  const preview = useQuery({
    queryKey: ['invitation-preview', previewId],
    queryFn: () => previewInvitation(token!),
    enabled: tokenReady && Boolean(token) && !outcome,
    retry: false,
    gcTime: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    const url = new URL(window.location.href)
    const incomingToken = url.searchParams.get('token')
    if (incomingToken) {
      storeInviteToken(incomingToken)
      url.searchParams.delete('token')
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
    }
    setToken(incomingToken || readStoredInviteToken())
    setTokenReady(true)
  }, [])

  const accept = useMutation({
    mutationFn: (names: { firstName: string; lastName: string }) => acceptInvitation({ token: token!, ...names }),
    onSuccess: async (invitation) => {
      setOutcome({ status: 'accepted', organizationName: invitation.organizationName })
      clearStoredInviteToken()
      await queryClient.invalidateQueries({ queryKey: ['session'] })
    },
  })
  const decline = useMutation({
    mutationFn: () => declineInvitation(token!),
    onSuccess: () => {
      setOutcome({ status: 'declined', organizationName: null })
      clearStoredInviteToken()
    },
  })

  if (outcome) {
    const accepted = outcome.status === 'accepted'
    return <InvitationFrame title={accepted ? 'Welcome to Portal' : 'Invitation declined'}>
      <div role="status" className="grid gap-4">
        <CheckCircle2 className="size-8 text-primary" aria-hidden="true" />
        <p>{accepted ? `You now have access to ${outcome.organizationName ?? 'your organization'}.` : 'You have declined this invitation. No access has been granted.'}</p>
        <Button onClick={() => void navigate({ to: '/' })}>{accepted ? 'Open Portal' : 'Return to Portal'}<ArrowRight aria-hidden="true" /></Button>
      </div>
    </InvitationFrame>
  }
  if (!tokenReady || (token && preview.isPending)) {
    return <InvitationFrame title="Opening your invitation"><p role="status">Checking your invitation details…</p></InvitationFrame>
  }
  if (!token) {
    return <InvitationFrame title="Open your invitation email"><p>Use the newest invitation link in your email to continue. If the link is missing, ask the sender for a new invitation.</p></InvitationFrame>
  }
  if (preview.isError || !preview.data) {
    return <InvitationFrame title="We couldn’t open this invitation">
      <p role="alert">{apiErrorMessage(preview.error)}</p>
      <p className="mt-2 text-muted-foreground">Try again, or ask the sender for a new invitation if this link has expired or been replaced.</p>
      <Button className="mt-5" variant="outline" onClick={() => void preview.refetch()}>Try again</Button>
    </InvitationFrame>
  }

  const invitation = preview.data
  const title = `${invitation.firstName ? `${invitation.firstName}, you’re` : 'You’re'} invited to ${invitation.organizationName}`
  return <InvitationFrame title={title}>
    <div className="mb-6 flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
      <Mail className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-medium">{[invitation.firstName, invitation.lastName].filter(Boolean).join(' ') || 'Your invitation'}</p>
        <p className="mt-1 break-all text-muted-foreground">{invitation.email}</p>
      </div>
    </div>
    {!auth.clerkLoaded ? <p role="status">Preparing secure sign-in…</p> : !auth.signedIn ? (
      !auth.authConfigured ? <p role="alert">Sign-in is temporarily unavailable. Please try again later or contact the sender.</p> : <InvitationAuthentication invitation={invitation} />
    ) : auth.authProvider === 'clerk' ? (
      <ClerkInvitationReview invitation={invitation} pending={accept.isPending || decline.isPending} onAccept={(names) => accept.mutate(names)} onDecline={() => decline.mutate()} />
    ) : (
      <InvitationReview invitation={invitation} emailMatches={auth.session?.user?.email?.toLowerCase() === invitation.email.toLowerCase()} signedInEmail={auth.session?.user?.email} pending={accept.isPending || decline.isPending} onAccept={(names) => accept.mutate(names)} onDecline={() => decline.mutate()} />
    )}
    {accept.error || decline.error ? <Alert className="mt-4" variant="destructive">
      <AlertTitle>Invitation could not be completed</AlertTitle>
      <AlertDescription>{apiErrorMessage(accept.error ?? decline.error)}</AlertDescription>
    </Alert> : null}
  </InvitationFrame>
}

type ReviewProps = {
  invitation: InvitationPreview
  pending: boolean
  onAccept: (names: { firstName: string; lastName: string }) => void
  onDecline: () => void
}

function ClerkInvitationReview(props: ReviewProps) {
  const { user, isLoaded } = useUser()
  if (!isLoaded) return <p role="status">Checking your signed-in account…</p>
  // Match any verified address, including secondary emails, as the backend does.
  const emailMatches = Boolean(user?.emailAddresses.some(address =>
    address.emailAddress.toLowerCase() === props.invitation.email.toLowerCase() && address.verification.status === 'verified',
  ))
  return <InvitationReview {...props} emailMatches={emailMatches} signedInEmail={user?.primaryEmailAddress?.emailAddress}
    switchAccount={<SignOutButton redirectUrl="/accept-invite"><Button variant="outline" disabled={props.pending}>Switch account</Button></SignOutButton>} />
}

const namesSchema = z.object({ firstName: z.string().trim().min(1, 'Enter your first name.'), lastName: z.string().trim().min(1, 'Enter your last name.') })

function InvitationReview({ invitation, pending, onAccept, onDecline, emailMatches, signedInEmail, switchAccount }: ReviewProps & { emailMatches: boolean; signedInEmail?: string; switchAccount?: ReactNode }) {
  const missingName = !invitation.firstName || !invitation.lastName
  const form = useForm({ resolver: zodResolver(namesSchema), defaultValues: { firstName: invitation.firstName ?? '', lastName: invitation.lastName ?? '' } })
  if (!emailMatches) return <div className="grid gap-4">
    <Alert>
      <AlertTitle>Use your invited account</AlertTitle>
      <AlertDescription>You’re signed in{signedInEmail ? ` as ${signedInEmail}` : ''}. This invitation requires a verified email of {invitation.email}. Switch accounts to continue.</AlertDescription>
    </Alert>
    {switchAccount}
  </div>
  return <form className="grid gap-4" onSubmit={form.handleSubmit(onAccept)}>
    <div><h2 className="text-lg font-semibold">Ready to join</h2><p className="mt-2 leading-6 text-muted-foreground">You’re signed in with your invited email. Accept to join {invitation.organizationName} with the access selected by your administrator.</p></div>
    {missingName ? <div className="grid gap-3 sm:grid-cols-2">
      {(['firstName', 'lastName'] as const).map((field) => <div key={field} className="grid gap-2">
        <Label htmlFor={field}><RequiredFieldName>{field === 'firstName' ? 'First name' : 'Last name'}</RequiredFieldName></Label>
        <Input id={field} {...form.register(field)} autoComplete={field === 'firstName' ? 'given-name' : 'family-name'} required aria-invalid={Boolean(form.formState.errors[field])} aria-describedby={form.formState.errors[field] ? `${field}-error` : undefined} />
        {form.formState.errors[field] ? <p id={`${field}-error`} className="text-sm text-destructive">{form.formState.errors[field]?.message}</p> : null}
      </div>)}
    </div> : null}
    {missingName ? <RequiredLegend /> : null}
    <div className="flex flex-wrap gap-3">
      <Button type="submit" disabled={pending}>{pending ? 'Updating invitation…' : 'Accept invitation'}<ArrowRight aria-hidden="true" /></Button>
      <Button type="button" variant="outline" disabled={pending} onClick={onDecline}>Decline invitation</Button>
    </div>
  </form>
}

function InvitationFrame({ title, children }: { title: string; children: ReactNode }) {
  return <main className="page-wrap flex flex-1 justify-center px-4 py-8 sm:py-14">
    <section className="w-full max-w-lg self-start overflow-hidden rounded-xl border bg-card text-card-foreground shadow-lg" aria-labelledby="invitation-title">
      <header className="border-b px-6 py-7 sm:px-8">
        <div className="flex items-center gap-4"><img src="/phaeno124x40.webp" alt="Phaeno" width={124} height={40} className="h-10 w-[124px] object-contain" /><span className="border-l pl-4 text-sm font-medium text-muted-foreground">Portal</span></div>
        <h1 id="invitation-title" className="mt-7 text-2xl font-semibold leading-tight text-balance">{title}</h1>
      </header>
      <div className="px-6 py-6 text-sm sm:px-8">{children}</div>
      <footer className="flex items-start gap-2 border-t bg-muted/30 px-6 py-4 text-xs leading-5 text-muted-foreground sm:px-8"><LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>Secure, invitation-only access. Your organization access begins only after you accept.</span></footer>
    </section>
  </main>
}
