import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InvitationAuthentication } from './InvitationAuthentication'

const mocks = vi.hoisted(() => ({ begin: vi.fn(), preview: vi.fn(), continue: vi.fn(), signIn: {} as ReturnType<typeof createSignInMock>, signUp: {} as ReturnType<typeof createSignUpMock> }))
vi.mock('#/api/invitations', () => ({ beginInvitationAuthentication: mocks.begin, previewInvitation: mocks.preview }))
vi.mock('@clerk/react', () => ({ useSignIn: () => ({ signIn: mocks.signIn }), useSignUp: () => ({ signUp: mocks.signUp }) }))
vi.mock('@clerk/react/errors', () => ({ isClerkAPIResponseError: (error: unknown) => Boolean(error && typeof error === 'object' && 'errors' in error) }))
const invitation = { firstName: 'Joe', lastName: 'Blow', email: 'invited@example.com', organizationName: 'Research University', expiresAt: '2026-12-01T00:00:00Z' }
const success = (): Promise<{ error: unknown }> => Promise.resolve({ error: null })
function createSignInMock() {
  const result = {
    identifier: invitation.email, status: 'needs_first_factor', supportedFirstFactors: [{ strategy: 'email_code' }], supportedSecondFactors: [] as Array<{ strategy: string }>,
    create: vi.fn(success), finalize: vi.fn(success), password: vi.fn(success),
    emailCode: { sendCode: vi.fn(success), verifyCode: vi.fn(async (): Promise<{ error: unknown }> => { result.status = 'complete'; return { error: null } }) },
    mfa: { verifyTOTP: vi.fn(success), verifyBackupCode: vi.fn(success), sendEmailCode: vi.fn(success), verifyEmailCode: vi.fn(success) },
  }
  return result
}
function createSignUpMock() {
  const result = { emailAddress: invitation.email, status: 'missing_requirements', missingFields: ['password'], ticket: vi.fn(success), password: vi.fn(async (): Promise<{ error: unknown }> => { result.status = 'complete'; return { error: null } }), finalize: vi.fn(success) }
  return result
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.begin.mockResolvedValue({ registrationUrl: null })
  mocks.preview.mockResolvedValue(invitation)
  mocks.signIn = createSignInMock()
  mocks.signUp = createSignUpMock()
})
afterEach(() => { cleanup(); vi.unstubAllEnvs() })
async function start() {
  render(<InvitationAuthentication invitation={invitation} token="portal-invite" onContinue={mocks.continue} />)
  fireEvent.click(screen.getByRole('button', { name: 'Accept invitation and continue' }))
  await screen.findByRole('heading', { name: 'Check your email' })
}
async function submitCode() {
  fireEvent.change(screen.getByLabelText(/Verification code/), { target: { value: '123456' } })
  fireEvent.click(screen.getByRole('button', { name: 'Verify code' }))
}

describe('fixed-email invitation authentication', () => {
  it('goes directly from Continue to verification and never renders an editable email', async () => {
    await start()
    expect(mocks.continue).toHaveBeenCalledTimes(1)
    expect(mocks.signIn.create).toHaveBeenCalledWith({ identifier: invitation.email, signUpIfMissing: false })
    expect(mocks.signIn.emailCode.sendCode).toHaveBeenCalledTimes(1)
    expect(screen.queryByLabelText(/Email address/)).toBeNull()
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(screen.getByRole('button', { name: /request a new code/ })).toHaveProperty('disabled', true)
    await submitCode()
    await waitFor(() => expect(mocks.signIn.finalize).toHaveBeenCalledTimes(1))
    expect(mocks.continue).toHaveBeenCalledTimes(1)
    expect(mocks.signUp.ticket).not.toHaveBeenCalled()
  })
  it('retains verification requirements and supports authenticator backup codes', async () => {
    mocks.signIn.emailCode.verifyCode.mockImplementation(async () => { mocks.signIn.status = 'needs_second_factor'; return { error: null } })
    mocks.signIn.supportedSecondFactors = [{ strategy: 'totp' }, { strategy: 'backup_code' }]
    await start()
    await submitCode()
    await screen.findByRole('heading', { name: 'Open your authenticator app' })
    expect(mocks.signIn.finalize).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Use a backup code' }))
    fireEvent.change(screen.getByLabelText(/Backup code/), { target: { value: 'backup-test' } })
    mocks.signIn.mfa.verifyBackupCode.mockImplementation(async () => { mocks.signIn.status = 'complete'; return { error: null } })
    fireEvent.click(screen.getByRole('button', { name: 'Verify code' }))
    await waitFor(() => expect(mocks.signIn.finalize).toHaveBeenCalledTimes(1))
    expect(mocks.signIn.mfa.verifyBackupCode).toHaveBeenCalledWith({ code: 'backup-test' })
  })
  it.each([true, false])('completes invitation-ticket setup with DEV=%s and preserves the required password', async (dev) => {
    vi.stubEnv('DEV', dev)
    render(<InvitationAuthentication invitation={invitation} token="portal-invite" onContinue={mocks.continue} registrationTicket="provider-ticket" accessAccepted />)
    expect(screen.queryByRole('button', { name: 'Accept invitation and continue' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Continue account setup' }))
    await screen.findByRole('heading', { name: 'Create your password' })
    expect(mocks.preview).toHaveBeenCalledWith('portal-invite')
    expect(mocks.signIn.create).not.toHaveBeenCalled()
    expect(mocks.begin).not.toHaveBeenCalled()
    expect(mocks.signUp.ticket).toHaveBeenCalledWith({ ticket: 'provider-ticket', firstName: 'Joe', lastName: 'Blow' })
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'test-password-only' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(mocks.signUp.finalize).toHaveBeenCalledTimes(1))
  })
  it('does not consume a provider ticket if the Portal invitation has expired or been revoked', async () => {
    mocks.preview.mockRejectedValue(new Error('This invitation is unavailable.'))
    render(<InvitationAuthentication invitation={invitation} token="portal-invite" onContinue={mocks.continue} registrationTicket="provider-ticket" />)
    fireEvent.click(screen.getByRole('button', { name: 'Accept invitation and continue' }))
    await screen.findByText('This invitation is unavailable.')
    expect(mocks.signUp.ticket).not.toHaveBeenCalled()
  })
  it('keeps the invitation available after the registration service fails', async () => {
    mocks.begin.mockRejectedValue(new Error('Account setup is temporarily unavailable.'))
    render(<InvitationAuthentication invitation={invitation} token="portal-invite" onContinue={mocks.continue} />)
    fireEvent.click(screen.getByRole('button', { name: 'Accept invitation and continue' }))
    await screen.findByText('Account setup is temporarily unavailable.')
    expect(mocks.signIn.create).not.toHaveBeenCalled()
    expect(mocks.signUp.ticket).not.toHaveBeenCalled()
  })
  it('does not finalize or create an account after an invalid code', async () => {
    mocks.signIn.emailCode.verifyCode.mockResolvedValue({ error: { errors: [{ code: 'form_code_incorrect', message: 'Incorrect code. Try again.' }] } })
    await start()
    await submitCode()
    await screen.findByText('Incorrect code. Try again.')
    expect(mocks.signIn.finalize).not.toHaveBeenCalled()
    expect(mocks.signUp.ticket).not.toHaveBeenCalled()
  })
  it('rejects an identity changed by another sign-in flow', async () => {
    await start()
    mocks.signIn.identifier = 'other@example.com'
    await submitCode()
    await screen.findByText('The sign-in session changed. Continue again with your invited email.')
    expect(mocks.signIn.emailCode.verifyCode).not.toHaveBeenCalled()
    expect(mocks.signIn.finalize).not.toHaveBeenCalled()
  })
  it('keeps retry available when preparing verification fails', async () => {
    mocks.signIn.create.mockResolvedValueOnce({ error: new Error('Please try again.') })
    render(<InvitationAuthentication invitation={invitation} token="portal-invite" onContinue={mocks.continue} />)
    fireEvent.click(screen.getByRole('button', { name: 'Accept invitation and continue' }))
    await screen.findByText('Please try again.')
    expect(mocks.signIn.emailCode.sendCode).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Accept invitation and continue' }))
    await screen.findByRole('heading', { name: 'Check your email' })
    expect(mocks.signIn.create).toHaveBeenCalledTimes(2)
  })
})
