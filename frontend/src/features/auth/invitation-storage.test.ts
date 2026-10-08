import { beforeEach, expect, it } from 'vitest'
import { clearStoredInviteToken, readInviteAcceptanceVersion, storeInviteAcceptance, storeInviteToken } from './invitation-storage'

beforeEach(() => sessionStorage.clear())

it('keeps consent only for the same private invitation and clears it on completion', () => {
  storeInviteToken('first-token')
  storeInviteAcceptance(4)
  storeInviteToken('first-token')
  expect(readInviteAcceptanceVersion()).toBe(4)
  storeInviteToken('replacement-token')
  expect(readInviteAcceptanceVersion()).toBeNull()
  storeInviteAcceptance(5)
  clearStoredInviteToken()
  expect(readInviteAcceptanceVersion()).toBeNull()
})

it('does not remember acceptance without a valid invitation revision', () => {
  storeInviteAcceptance(4)
  expect(readInviteAcceptanceVersion()).toBeNull()
  storeInviteToken('token')
  for (const version of [undefined, 0, -1, 1.5, NaN, Infinity]) {
    storeInviteAcceptance(version)
    expect(readInviteAcceptanceVersion()).toBeNull()
  }
})
