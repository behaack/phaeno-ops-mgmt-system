import { z } from 'zod'

export const inviteSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  role: z.enum(['Organization Admin', 'Member']),
})

export type InviteFormValues = z.infer<typeof inviteSchema>

export const inviteDefaults: InviteFormValues = {
  email: '',
  role: 'Member',
}
