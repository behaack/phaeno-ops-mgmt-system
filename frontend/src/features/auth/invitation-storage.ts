export const INVITE_TOKEN_STORAGE_KEY = 'phaeno.pendingInviteToken'

export function readStoredInviteToken() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.sessionStorage.getItem(INVITE_TOKEN_STORAGE_KEY)
}

export function storeInviteToken(token: string) {
  window.sessionStorage.setItem(INVITE_TOKEN_STORAGE_KEY, token)
}

export function clearStoredInviteToken() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(INVITE_TOKEN_STORAGE_KEY)
}
