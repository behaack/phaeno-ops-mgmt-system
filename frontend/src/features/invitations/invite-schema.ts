import { z } from 'zod'

export const inviteSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  organization: z.string().trim().min(2, 'Organization is required.'),
  role: z.enum(['Organization Admin', 'Member', 'Partner Liaison']),
  requiresTwoFactor: z.boolean(),
})

export type InviteFormValues = z.infer<typeof inviteSchema>

export const inviteDefaults: InviteFormValues = {
  email: '',
  organization: '',
  role: 'Member',
  requiresTwoFactor: true,
}
