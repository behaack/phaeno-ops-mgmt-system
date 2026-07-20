import { z } from 'zod'

export const inviteSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'Enter a first name.')
    .max(100, 'First name cannot exceed 100 characters.'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Enter a last name.')
    .max(100, 'Last name cannot exceed 100 characters.'),
  email: z.string().trim().email('Enter a valid email address.'),
  role: z.enum(['Organization Admin', 'Member']),
})

export type InviteFormValues = z.infer<typeof inviteSchema>

export const inviteDefaults: InviteFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'Member',
}
