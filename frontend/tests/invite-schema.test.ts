import { describe, expect, it } from 'vitest'

import { inviteDefaults, inviteSchema } from '#/features/invitations/invite-schema'

describe('inviteSchema', () => {
  it('accepts a valid invite payload', () => {
    const result = inviteSchema.safeParse({
      ...inviteDefaults,
      email: 'admin@example.com',
      organization: 'Example Health',
      role: 'Organization Admin',
    })

    expect(result.success).toBe(true)
  })

  it('rejects invalid email addresses', () => {
    const result = inviteSchema.safeParse({
      ...inviteDefaults,
      email: 'not-an-email',
      organization: 'Example Health',
    })

    expect(result.success).toBe(false)
  })
})
