import { z } from 'zod'

const blockSchema = z.object({
  id: z.string().uuid(), kind: z.enum(['text', 'table', 'file']), section: z.enum(['purpose', 'method', 'observations', 'results', 'conclusions', 'custom']),
  label: z.string().trim().min(1, 'Enter a section label.').max(255, 'Use at most 255 characters.'), text: z.string().max(100000).nullable(),
  columns: z.array(z.string().max(255)).min(1).max(30).nullable(), rows: z.array(z.array(z.string().max(4000))).max(1000).nullable(), attachmentId: z.string().uuid().nullable(),
})
export const researchEntrySchema = z.object({ title: z.string().trim().min(1, 'Enter an entry title.').max(255), entryDate: z.iso.date('Choose a valid entry date.'), blocks: z.array(blockSchema).max(200) })
export type ResearchEntryValues = z.infer<typeof researchEntrySchema>
