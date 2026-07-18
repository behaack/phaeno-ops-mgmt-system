import { z } from 'zod'

export const protocolCaptureTypes = [
  'number',
  'text',
  'date',
  'choice',
  'fileReference',
  'barcode',
] as const

export const protocolRequirementTypes = ['required', 'optional', 'conditional'] as const

export const protocolRoleTypes = [
  '',
  'Operator',
  'Supervisor',
  'ProtocolAdministrator',
  'ScientificReviewer',
  'OperationsAdministrator',
] as const

const captureSchema = z.object({
  label: z.string().trim().min(1, 'Capture label is required.').max(120),
  type: z.enum(protocolCaptureTypes),
  required: z.boolean(),
  unit: z.string().trim().max(50),
  choices: z.string().trim().max(1000),
}).superRefine((capture, context) => {
  if (capture.type === 'choice' && splitList(capture.choices).length === 0) {
    context.addIssue({
      code: 'custom',
      message: 'Enter at least one choice.',
      path: ['choices'],
    })
  }
})

const stepSchema = z.object({
  name: z.string().trim().min(1, 'Step name is required.').max(160),
  instructions: z.string().trim().min(1, 'Instructions are required.').max(4000),
  requirement: z.enum(protocolRequirementTypes),
  condition: z.string().trim().max(1000),
  repeatable: z.boolean(),
  operatorConfirmation: z.boolean(),
  requiredRole: z.enum(protocolRoleTypes),
  inputMaterials: z.string().trim().max(2000),
  preparedOutputs: z.string().trim().max(2000),
  equipmentTypes: z.string().trim().max(2000),
  captures: z.array(captureSchema).max(30, 'A step can contain at most 30 captures.'),
  qcEnabled: z.boolean(),
  qcCriteria: z.string().trim().max(2000),
}).superRefine((step, context) => {
  if (step.requirement === 'conditional' && !step.condition) {
    context.addIssue({
      code: 'custom',
      message: 'Describe when this step applies.',
      path: ['condition'],
    })
  }
  if (step.qcEnabled && !step.qcCriteria) {
    context.addIssue({
      code: 'custom',
      message: 'Enter the QC acceptance criteria.',
      path: ['qcCriteria'],
    })
  }
})

export const protocolDefinitionFormSchema = z.object({
  steps: z.array(stepSchema)
    .min(1, 'Add at least one protocol step.')
    .max(100, 'A protocol can contain at most 100 steps.'),
})

export type ProtocolDefinitionFormValues = z.infer<typeof protocolDefinitionFormSchema>
export type ProtocolStepFormValues = ProtocolDefinitionFormValues['steps'][number]

export type ProtocolDefinition = {
  schemaVersion: 1
  steps: Array<{
    key: string
    name: string
    instructions: string
    required: boolean
    condition?: string
    repeatable: boolean
    operatorConfirmation: boolean
    requiredRole?: Exclude<ProtocolStepFormValues['requiredRole'], ''>
    captures: Array<{
      key: string
      label: string
      type: typeof protocolCaptureTypes[number]
      required: boolean
      unit?: string
      options?: string[]
    }>
    inputMaterials: string[]
    preparedOutputs: string[]
    equipmentTypes: string[]
    qcGate?: {
      criteria: string
      outcomes: ['pass', 'fail', 'hold']
    }
  }>
}

const storedProtocolCaptureSchema = z.object({
  label: z.string().default(''),
  type: z.enum(protocolCaptureTypes).default('text'),
  required: z.boolean().default(true),
  unit: z.string().optional(),
  options: z.array(z.string()).optional(),
}).passthrough()

const storedProtocolStepSchema = z.object({
  name: z.string().default(''),
  instructions: z.string().default(''),
  required: z.boolean().default(true),
  condition: z.string().optional(),
  repeatable: z.boolean().default(false),
  operatorConfirmation: z.boolean().default(false),
  requiredRole: z.enum(protocolRoleTypes).optional(),
  captures: z.array(storedProtocolCaptureSchema).default([]),
  inputMaterials: z.array(z.string()).default([]),
  preparedOutputs: z.array(z.string()).default([]),
  equipmentTypes: z.array(z.string()).default([]),
  qcGate: z.object({
    criteria: z.string().default(''),
  }).passthrough().optional(),
}).passthrough()

const storedProtocolDefinitionSchema = z.object({
  steps: z.array(storedProtocolStepSchema).default([]),
}).passthrough()

export const createEmptyProtocolStep = (): ProtocolStepFormValues => ({
  name: '',
  instructions: '',
  requirement: 'required',
  condition: '',
  repeatable: false,
  operatorConfirmation: false,
  requiredRole: '',
  inputMaterials: '',
  preparedOutputs: '',
  equipmentTypes: '',
  captures: [],
  qcEnabled: false,
  qcCriteria: '',
})

export const createEmptyProtocolCapture = (): ProtocolStepFormValues['captures'][number] => ({
  label: '',
  type: 'text',
  required: true,
  unit: '',
  choices: '',
})

export const createLibraryPreparationExample = (): ProtocolDefinitionFormValues => ({
  steps: [
    {
      ...createEmptyProtocolStep(),
      name: 'Verify sample identity',
      instructions: 'Scan the source container and confirm that it matches the assigned specimen.',
      operatorConfirmation: true,
      requiredRole: 'Operator',
      captures: [
        {
          ...createEmptyProtocolCapture(),
          label: 'Source container barcode',
          type: 'barcode',
        },
      ],
    },
    {
      ...createEmptyProtocolStep(),
      name: 'Prepare sequencing library',
      instructions: 'Prepare the sequencing library according to the approved bench procedure.',
      repeatable: true,
      requiredRole: 'Operator',
      inputMaterials: 'Source specimen, Library preparation reagents',
      preparedOutputs: 'Sequencing library',
      equipmentTypes: 'Pipette, Thermal cycler',
      captures: [
        {
          ...createEmptyProtocolCapture(),
          label: 'Library container barcode',
          type: 'barcode',
        },
      ],
    },
    {
      ...createEmptyProtocolStep(),
      name: 'Review library QC',
      instructions: 'Record the measured concentration and evaluate the library against the approved acceptance criteria.',
      requiredRole: 'Supervisor',
      equipmentTypes: 'Fluorometer',
      captures: [
        {
          ...createEmptyProtocolCapture(),
          label: 'Library concentration',
          type: 'number',
          unit: 'ng/µL',
        },
      ],
      qcEnabled: true,
      qcCriteria: 'Confirm that the measured concentration is within the approved range for sequencing.',
    },
  ],
})

export function deserializeProtocolDefinition(value: string): ProtocolDefinitionFormValues | null {
  try {
    const parsed = storedProtocolDefinitionSchema.safeParse(JSON.parse(value))
    if (!parsed.success) return null
    const steps = parsed.data.steps.map((step) => ({
      name: step.name,
      instructions: step.instructions,
      requirement: step.condition ? 'conditional' as const : step.required ? 'required' as const : 'optional' as const,
      condition: step.condition ?? '',
      repeatable: step.repeatable,
      operatorConfirmation: step.operatorConfirmation,
      requiredRole: step.requiredRole ?? '',
      inputMaterials: step.inputMaterials.join(', '),
      preparedOutputs: step.preparedOutputs.join(', '),
      equipmentTypes: step.equipmentTypes.join(', '),
      captures: step.captures.map((capture) => ({
        label: capture.label,
        type: capture.type,
        required: capture.required,
        unit: capture.unit ?? '',
        choices: capture.options?.join(', ') ?? '',
      })),
      qcEnabled: Boolean(step.qcGate),
      qcCriteria: step.qcGate?.criteria ?? '',
    }))
    return { steps: steps.length > 0 ? steps : [createEmptyProtocolStep()] }
  } catch {
    return null
  }
}

export function serializeProtocolDefinition(values: ProtocolDefinitionFormValues): string {
  const usedStepKeys = new Set<string>()
  const definition: ProtocolDefinition = {
    schemaVersion: 1,
    steps: values.steps.map((step) => {
      const usedCaptureKeys = new Set<string>()
      return {
        key: uniqueKey(step.name, usedStepKeys, 'step'),
        name: step.name.trim(),
        instructions: step.instructions.trim(),
        required: step.requirement === 'required',
        ...(step.requirement === 'conditional' ? { condition: step.condition.trim() } : {}),
        repeatable: step.repeatable,
        operatorConfirmation: step.operatorConfirmation,
        ...(step.requiredRole ? { requiredRole: step.requiredRole } : {}),
        captures: step.captures.map((capture) => ({
          key: uniqueKey(capture.label, usedCaptureKeys, 'capture'),
          label: capture.label.trim(),
          type: capture.type,
          required: capture.required,
          ...(capture.type === 'number' && capture.unit.trim()
            ? { unit: capture.unit.trim() }
            : {}),
          ...(capture.type === 'choice'
            ? { options: splitList(capture.choices) }
            : {}),
        })),
        inputMaterials: splitList(step.inputMaterials),
        preparedOutputs: splitList(step.preparedOutputs),
        equipmentTypes: splitList(step.equipmentTypes),
        ...(step.qcEnabled
          ? {
              qcGate: {
                criteria: step.qcCriteria.trim(),
                outcomes: ['pass', 'fail', 'hold'] as ['pass', 'fail', 'hold'],
              },
            }
          : {}),
      }
    }),
  }

  return JSON.stringify(definition, null, 2)
}

function uniqueKey(value: string, used: Set<string>, fallback: string): string {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback
  let candidate = base
  let suffix = 2
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`
    suffix += 1
  }
  used.add(candidate)
  return candidate
}

function splitList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}
