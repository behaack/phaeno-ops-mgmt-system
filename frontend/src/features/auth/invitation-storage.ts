export const INVITE_TOKEN_STORAGE_KEY = 'phaeno.pendingInviteToken'
const REGISTRATION_TICKET_STORAGE_KEY = 'phaeno.invitationRegistration'

export function readStoredInviteToken() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.sessionStorage.getItem(INVITE_TOKEN_STORAGE_KEY)
}

export function getInvitationReturnPath() {
  return readStoredInviteToken() ? '/accept-invite' : '/'
}

export function storeInviteToken(token: string) {
  if (readStoredInviteToken() !== token) clearInviteRegistrationTicket()
  window.sessionStorage.setItem(INVITE_TOKEN_STORAGE_KEY, token)
}

export function clearStoredInviteToken() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(INVITE_TOKEN_STORAGE_KEY)
  clearInviteRegistrationTicket()
}

// Bind the provider ticket to the Portal invitation that initiated the round trip.
export function storeInviteRegistrationTicket(ticket: string) {
  const token = readStoredInviteToken()
  if (token) window.sessionStorage.setItem(REGISTRATION_TICKET_STORAGE_KEY, JSON.stringify({ token, ticket }))
}

export function readInviteRegistrationTicket(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const value = JSON.parse(window.sessionStorage.getItem(REGISTRATION_TICKET_STORAGE_KEY) ?? 'null')
    return value?.token === readStoredInviteToken() && typeof value?.ticket === 'string' ? value.ticket : null
  } catch { return null }
}

export function clearInviteRegistrationTicket() {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(REGISTRATION_TICKET_STORAGE_KEY)
}
