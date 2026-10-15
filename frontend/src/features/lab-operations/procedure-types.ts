import { z } from 'zod'

export const illustrationSchema = z.object({ assetId: z.string().uuid(), altText: z.string().trim().min(1, 'Describe the illustration.').max(500), caption: z.string().max(1000).nullable().optional() })
export const instructionSourceSchema = z.object({ kind: z.string(), recordId: z.string().uuid(), revision: z.string(), stepKey: z.string().nullable().optional() })
export const instructionSchema = z.object({ key: z.string().min(1), name: z.string().trim().min(1, 'Name the instruction.').max(160), instructions: z.string().trim().min(1, 'Enter instructions.').max(4000), illustrations: z.array(illustrationSchema).max(12).nullable().optional(), copiedFrom: instructionSourceSchema.nullable().optional(), sourceLabStepVersionId: z.string().uuid().nullable().optional() })
export type InstructionIllustration = z.infer<typeof illustrationSchema>
export type InstructionSource = z.infer<typeof instructionSourceSchema>
export type ProcedureInstruction = z.infer<typeof instructionSchema>
export type ProcedureContext = 'library' | 'masterMix' | 'reagent' | 'kit'
export const newInstruction = (): ProcedureInstruction => ({ key: crypto.randomUUID(), name: '', instructions: '', illustrations: [] })
