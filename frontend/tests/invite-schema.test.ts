import { describe, expect, it } from 'vitest'

import { inviteDefaults, inviteSchema } from '#/features/invitations/invite-schema'

describe('inviteSchema', () => {
  it('accepts a valid invite payload', () => {
    const result = inviteSchema.safeParse({
      ...inviteDefaults,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'admin@example.com',
      role: 'Organization Admin',
    })

    expect(result.success).toBe(true)
  })

  it('rejects invalid email addresses', () => {
    const result = inviteSchema.safeParse({
      ...inviteDefaults,
      firstName: 'Sample',
      lastName: 'Administrator',
      email: 'not-an-email',
    })

    expect(result.success).toBe(false)
  })
})
