export const INVITE_TOKEN_STORAGE_KEY = 'phaeno.pendingInviteToken'
const REGISTRATION_TICKET_STORAGE_KEY = 'phaeno.invitationRegistration'
const ACCEPTANCE_STORAGE_KEY = 'phaeno.invitationAcceptance'

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
  if (readStoredInviteToken() !== token) {
    clearInviteRegistrationTicket()
    clearInviteAcceptance()
  }
  window.sessionStorage.setItem(INVITE_TOKEN_STORAGE_KEY, token)
}

export function clearStoredInviteToken() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(INVITE_TOKEN_STORAGE_KEY)
  clearInviteRegistrationTicket()
  clearInviteAcceptance()
}

// Consent applies only to the invitation and access version the recipient saw.
// It never substitutes for the server's authenticated acceptance checks.
export function storeInviteAcceptance(version: number | undefined) {
  clearInviteAcceptance()
  const token = readStoredInviteToken()
  if (token && typeof version === 'number' && Number.isSafeInteger(version) && version > 0) {
    window.sessionStorage.setItem(ACCEPTANCE_STORAGE_KEY, JSON.stringify({ token, version }))
  }
}

export function readInviteAcceptanceVersion(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const value = JSON.parse(window.sessionStorage.getItem(ACCEPTANCE_STORAGE_KEY) ?? 'null')
    return value?.token === readStoredInviteToken() && Number.isSafeInteger(value?.version) && value.version > 0
      ? value.version : null
  } catch { return null }
}

export function clearInviteAcceptance() {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(ACCEPTANCE_STORAGE_KEY)
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
