import { useSignIn, useSignUp } from '@clerk/react'
import { isClerkAPIResponseError } from '@clerk/react/errors'
import { ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { InvitationPreview } from '#/api/invitations'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredFieldName, RequiredLegend } from '#/components/ui/required-field'

type Step = 'start' | 'email' | 'password' | 'signup-password' | 'totp' | 'backup' | 'mfa-email' | 'mfa-phone' | 'reset-code' | 'reset-password' | 'complete'
type AuthResult = { error: unknown }
const challengeSchema = z.object({ value: z.string().min(1, 'Complete this field to continue.') })
const labels: Record<Step, string> = {
  start: 'Continue securely', email: 'Check your email', password: 'Enter your password',
  'signup-password': 'Create your password', totp: 'Open your authenticator app',
  backup: 'Use a backup code', 'mfa-email': 'Verify this sign-in', 'mfa-phone': 'Check your phone',
  'reset-code': 'Check your email', 'reset-password': 'Choose a new password', complete: 'Returning to your invitation',
}

function checked(result: AuthResult) { if (result.error) throw result.error }
function errorMessage(error: unknown) {
  if (isClerkAPIResponseError(error)) return error.errors[0]?.longMessage ?? error.errors[0]?.message ?? 'Sign-in could not be completed. Try again.'
  return error instanceof Error ? error.message : 'Sign-in could not be completed. Try again.'
}

export function InvitationAuthentication({ invitation }: { invitation: InvitationPreview }) {
  const { signIn } = useSignIn()
  const { signUp } = useSignUp()
  const [step, setStep] = useState<Step>('start')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendReady, setResendReady] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const busy = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const form = useForm({ resolver: zodResolver(challengeSchema), defaultValues: { value: '' } })
  const isPassword = step === 'password' || step === 'signup-password' || step === 'reset-password'
  const fieldLabel = isPassword ? (step === 'reset-password' ? 'New password' : 'Password') : step === 'backup' ? 'Backup code' : 'Verification code'

  useEffect(() => {
    if (step !== 'start') heading.current?.focus()
  }, [step])
  useEffect(() => {
    if (resendReady) return
    const timer = window.setTimeout(() => setResendReady(true), 60_000)
    return () => window.clearTimeout(timer)
  }, [resendReady, step])

  function move(next: Step) {
    setShowPassword(false)
    form.reset({ value: '' })
    setStep(next)
  }
  async function run(action: () => Promise<void>) {
    if (busy.current) return
    busy.current = true
    setShowPassword(false)
    setPending(true)
    setError(null)
    try { await action() } catch (failure) { setError(errorMessage(failure)) }
    finally { busy.current = false; setPending(false) }
  }
  function requireInvitedIdentifier() {
    if (signIn.identifier?.toLowerCase() !== invitation.email.toLowerCase()) {
      move('start')
      throw new Error('The sign-in session changed. Continue again with your invited email.')
    }
  }
  function requireInvitedSignup() {
    if (signUp.emailAddress?.toLowerCase() !== invitation.email.toLowerCase()) {
      move('start')
      throw new Error('The sign-in session changed. Continue again with your invited email.')
    }
  }
  const navigateAfterAuth = ({ session }: { session?: { currentTask?: { key: string } } | null }) => {
    if (session?.currentTask && session.currentTask.key !== 'setup-mfa') {
      throw new Error('Additional account setup is required. Contact Phaeno to complete it.')
    }
    window.location.assign(session?.currentTask ? '/session-tasks/setup-mfa' : '/accept-invite')
  }

  async function advanceSignIn() {
    requireInvitedIdentifier()
    if (signIn.status === 'complete') {
      checked(await signIn.finalize({ navigate: navigateAfterAuth }))
      move('complete')
      return
    }
    if (signIn.status === 'needs_new_password') { move('reset-password'); return }
    if (signIn.status === 'needs_second_factor' || signIn.status === 'needs_client_trust') {
      const factors = signIn.supportedSecondFactors ?? []
      if (factors.some(factor => factor.strategy === 'totp')) { move('totp'); return }
      if (factors.some(factor => factor.strategy === 'email_code')) {
        checked(await signIn.mfa.sendEmailCode()); setResendReady(false); move('mfa-email'); return
      }
      if (factors.some(factor => factor.strategy === 'phone_code')) {
        checked(await signIn.mfa.sendPhoneCode()); setResendReady(false); move('mfa-phone'); return
      }
      if (factors.some(factor => factor.strategy === 'backup_code')) { move('backup'); return }
    }
    throw new Error('Your account requires an additional sign-in method. Contact Phaeno for help; your invitation is still saved.')
  }

  async function advanceSignUp() {
    requireInvitedSignup()
    if (signUp.status === 'complete') {
      checked(await signUp.finalize({ navigate: navigateAfterAuth }))
      move('complete')
    } else if (signUp.missingFields.includes('password')) {
      move('signup-password')
    } else {
      throw new Error('Additional account information is required. Contact Phaeno to complete setup; your invitation is still saved.')
    }
  }

  async function start() {
    // The reviewed invitation is the sole source of the identifier. There is no email input.
    checked(await signIn.create({ identifier: invitation.email, signUpIfMissing: import.meta.env.DEV }))
    requireInvitedIdentifier()
    const factors = signIn.supportedFirstFactors ?? []
    if (factors.some(factor => factor.strategy === 'email_code')) {
      checked(await signIn.emailCode.sendCode())
      setResendReady(false)
      move('email')
    } else if (factors.some(factor => factor.strategy === 'password')) {
      move('password')
    } else {
      await advanceSignIn()
    }
  }

  async function verify(value: string) {
    if (step === 'signup-password') {
      requireInvitedSignup()
      checked(await signUp.password({ password: value }))
      await advanceSignUp()
      return
    }
    requireInvitedIdentifier()
    let result: AuthResult
    switch (step) {
      case 'email': result = await signIn.emailCode.verifyCode({ code: value.trim() }); break
      case 'password': result = await signIn.password({ password: value }); break
      case 'totp': result = await signIn.mfa.verifyTOTP({ code: value.trim() }); break
      case 'backup': result = await signIn.mfa.verifyBackupCode({ code: value.trim() }); break
      case 'mfa-email': result = await signIn.mfa.verifyEmailCode({ code: value.trim() }); break
      case 'mfa-phone': result = await signIn.mfa.verifyPhoneCode({ code: value.trim() }); break
      case 'reset-code': result = await signIn.resetPasswordEmailCode.verifyCode({ code: value.trim() }); break
      case 'reset-password': result = await signIn.resetPasswordEmailCode.submitPassword({ password: value }); break
      default: return
    }
    if (step === 'email' && import.meta.env.DEV && isClerkAPIResponseError(result.error)
      && result.error.errors.some(detail => detail.code === 'sign_up_if_missing_transfer')) {
      // Transfer only after Clerk verifies ownership of the invitation's fixed email.
      checked(await signUp.create({ transfer: true, firstName: invitation.firstName ?? undefined, lastName: invitation.lastName ?? undefined }))
      await advanceSignUp()
      return
    }
    checked(result)
    await advanceSignIn()
  }

  async function resend() {
    requireInvitedIdentifier()
    if (step === 'email') checked(await signIn.emailCode.sendCode())
    else if (step === 'mfa-email') checked(await signIn.mfa.sendEmailCode())
    else if (step === 'mfa-phone') checked(await signIn.mfa.sendPhoneCode())
    else if (step === 'reset-code') checked(await signIn.resetPasswordEmailCode.sendCode())
    setResendReady(false)
  }

  const canResend = ['email', 'mfa-email', 'mfa-phone', 'reset-code'].includes(step)
  return <section aria-labelledby={step === 'start' ? undefined : 'invitation-auth-title'}>
    {step === 'start' ? <div className="grid gap-4">
      <p className="leading-6 text-muted-foreground">Continue to verify your invited email. Your address is fixed to this invitation.</p>
      <Button className="h-auto min-h-11 w-full whitespace-normal py-3" disabled={pending} onClick={() => void run(start)}>
        <span className="min-w-0 break-all">{pending ? 'Preparing verification…' : `Continue with ${invitation.email}`}</span><ArrowRight className="shrink-0" aria-hidden="true" />
      </Button>
    </div> : <>
      <h2 ref={heading} tabIndex={-1} id="invitation-auth-title" className="text-lg font-semibold focus-visible:outline-2 focus-visible:outline-ring">{labels[step]}</h2>
      <p className="mt-2 mb-5 leading-6 text-muted-foreground">
        {step === 'email' || step === 'reset-code' ? `Enter the code sent to ${invitation.email}.`
          : step === 'signup-password' ? 'Your email is verified. Choose a strong password to finish setting up your account.'
          : step === 'totp' ? 'Enter the current code from your authenticator app.'
          : step === 'backup' ? 'Enter one of the backup codes you saved when setting up your account.'
          : step === 'mfa-phone' ? 'Enter the code sent to the phone registered to your account.'
          : step === 'mfa-email' ? 'Enter the additional verification code sent to your account email.'
          : step === 'complete' ? 'Your identity is verified. Your invitation is ready for review.'
          : 'Complete secure sign-in for your invited account.'}
      </p>
      {step !== 'complete' ? <form className="grid gap-4" onSubmit={form.handleSubmit(({ value }) => run(() => verify(value)))}>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="invitation-auth-value"><RequiredFieldName>{fieldLabel}</RequiredFieldName></Label>
            {isPassword ? <Button type="button" variant="ghost" size="sm" disabled={pending}
              aria-controls="invitation-auth-value" onClick={() => setShowPassword(current => !current)}>
              {showPassword ? 'Hide password' : 'Show password'}
            </Button> : null}
          </div>
          <Input key={step} id="invitation-auth-value" {...form.register('value')} type={isPassword && !showPassword ? 'password' : 'text'}
            inputMode={isPassword || step === 'backup' ? 'text' : 'numeric'}
            autoComplete={isPassword ? (step === 'password' ? 'current-password' : 'new-password') : 'one-time-code'}
            required disabled={pending} aria-invalid={Boolean(form.formState.errors.value)} aria-describedby={form.formState.errors.value ? 'invitation-auth-error' : undefined} className="min-h-11" />
          {form.formState.errors.value ? <p id="invitation-auth-error" className="text-sm text-destructive">{form.formState.errors.value.message}</p> : null}
        </div>
        <RequiredLegend />
        <Button type="submit" disabled={pending} className="min-h-11">{pending ? 'Verifying…' : isPassword ? 'Continue' : 'Verify code'}<ArrowRight aria-hidden="true" /></Button>
        {canResend ? <Button type="button" variant="outline" disabled={pending || !resendReady} onClick={() => void run(resend)}>{resendReady ? 'Send a new code' : 'You can request a new code in a minute'}</Button> : null}
        {step === 'totp' && signIn.supportedSecondFactors?.some(factor => factor.strategy === 'backup_code') ? <Button type="button" variant="outline" disabled={pending} onClick={() => move('backup')}>Use a backup code</Button> : null}
        {step === 'backup' && signIn.supportedSecondFactors?.some(factor => factor.strategy === 'totp') ? <Button type="button" variant="outline" disabled={pending} onClick={() => move('totp')}>Use authenticator app</Button> : null}
        {step === 'password' ? <Button type="button" variant="outline" disabled={pending} onClick={() => void run(async () => {
          requireInvitedIdentifier(); checked(await signIn.resetPasswordEmailCode.sendCode()); setResendReady(false); move('reset-code')
        })}>Forgot password?</Button> : null}
      </form> : null}
    </>}
    {error ? <Alert variant="destructive" className="mt-4"><AlertDescription>{error}</AlertDescription></Alert> : null}
    <div id="clerk-captcha" className="mt-4 empty:hidden" />
  </section>
}
