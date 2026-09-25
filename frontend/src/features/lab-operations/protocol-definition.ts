import { z } from 'zod'

export const protocolCaptureTypes = [
  'number',
  'text',
  'date',
  'choice',
  'fileReference',
  'barcode',
  'material',
  'biologicalMaterial',
  'equipment',
  'output',
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

const materialSchema = z.object({ materialDefinitionId: z.string().uuid().optional(), productId: z.string().uuid().optional(), supplierId: z.string().uuid().optional(), masterMixWorkflowId: z.string().uuid().optional(), masterMixWorkflowRevision: z.number().int().positive().optional(), name: z.string().trim().min(1, 'Enter the material name.').max(1000), vendor: z.string().trim().max(255).optional(), productNumber: z.string().trim().max(100).optional() })
export type ConfiguredMaterial = z.infer<typeof materialSchema>

const captureSchema = z.object({
  key: z.string().optional(),
  scope: z.enum(['', 'batch', 'tube', 'shared']).optional(),
  label: z.string().trim().min(1, 'Capture label is required.').max(120),
  type: z.enum(protocolCaptureTypes),
  required: z.boolean(),
  sourceTube: z.boolean().optional(),
  material: materialSchema.optional(),
  includeTracking: z.boolean().optional(),
  quantityBasis: z.enum(['perSample', 'total']).optional(),
  unit: z.string().trim().max(50),
  choices: z.string().trim().max(1000),
}).superRefine((capture, context) => {
  if (capture.type === 'material' && !capture.unit) context.addIssue({ code: 'custom', message: 'Enter the quantity unit.', path: ['unit'] })
  if (capture.type === 'material' && capture.includeTracking && capture.material && !capture.material.productId && !capture.material.materialDefinitionId) context.addIssue({ code: 'custom', message: 'Lot tracking requires a catalog product or prepared reagent.', path: ['material'] })
  if (capture.material && [capture.material.productId, capture.material.materialDefinitionId, capture.material.masterMixWorkflowId].filter(Boolean).length > 1) context.addIssue({ code: 'custom', message: 'Choose one material identity.', path: ['material'] })
  if (capture.material?.masterMixWorkflowId && capture.includeTracking) context.addIssue({ code: 'custom', message: 'Master mix uses a preparation record, not an inventory lot.', path: ['includeTracking'] })
  if (capture.type === 'material' && !capture.material) context.addIssue({ code: 'custom', message: 'Choose a vendor/product or define the material manually.', path: ['material'] })
  if (capture.type === 'choice' && new Set(splitList(capture.choices)).size !== splitList(capture.choices).length) {
    context.addIssue({ code: 'custom', message: 'Choices cannot repeat.', path: ['choices'] })
  }
  if (capture.type === 'choice' && splitList(capture.choices).length === 0) {
    context.addIssue({
      code: 'custom',
      message: 'Enter at least one choice.',
      path: ['choices'],
    })
  }
})

const stepSchema = z.object({
  key: z.string().optional(),
  labStepVersionId: z.string().uuid().optional(),
  attachmentKind: z.enum(['', 'none', 'qc', 'preparation']).optional(),
  attachmentRequired: z.boolean().optional(),
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
  qcScope: z.enum(['', 'batch', 'tube', 'shared']).optional(),
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
  preparationBatchEnabled: z.boolean().optional(),
  steps: z.array(stepSchema)
    .min(1, 'Add at least one protocol step.')
    .max(100, 'A protocol can contain at most 100 steps.'),
}).superRefine((value, context) => {
  value.steps.forEach((step, i) => {
    if (step.attachmentRequired && (!value.preparationBatchEnabled || !['qc', 'preparation'].includes(step.attachmentKind ?? ''))) context.addIssue({ code: 'custom', message: 'Choose a report type and enable preparation batches to require a report.', path: ['steps', i, 'attachmentKind'] })
  })
  if (!value.preparationBatchEnabled) {
    value.steps.forEach((step, i) => { if (step.captures.some(c => ['material', 'biologicalMaterial', 'equipment', 'output'].includes(c.type))) context.addIssue({ code: 'custom', message: 'Linked fields require preparation batches.', path: ['steps', i, 'captures'] }) })
    return
  }
  value.steps.forEach((step, i) => {
    if (step.captures.filter(c => c.type === 'output').length > 1) context.addIssue({ code: 'custom', message: 'Use one output field per step.', path: ['steps', i, 'captures'] })
    if (step.captures.filter(c => c.type === 'biologicalMaterial').length > 1) context.addIssue({ code: 'custom', message: 'Use one biological material field per step.', path: ['steps', i, 'captures'] })
    step.captures.forEach((capture, j) => {
      if (capture.type === 'biologicalMaterial' && capture.scope !== 'tube') context.addIssue({ code: 'custom', message: 'Biological material must be recorded individually for each sample.', path: ['steps', i, 'captures', j, 'scope'] })
      if (['material', 'equipment', 'output'].includes(capture.type) && (!(['batch', 'tube'].includes(capture.scope ?? '') || capture.type === 'material' && capture.scope === 'shared' && capture.quantityBasis !== 'total') || capture.type === 'output' && capture.scope !== 'tube')) context.addIssue({ code: 'custom', message: 'Material exceptions require per-sample amounts; equipment uses batch or sample scope and outputs are individual.', path: ['steps', i, 'captures', j, 'scope'] })
      if (!capture.scope || capture.type === 'barcode' && capture.scope !== 'tube') context.addIssue({ code: 'custom', message: capture.type === 'barcode' ? 'Barcodes require Tube scope.' : 'Choose the evidence scope.', path: ['steps', i, 'captures', j, 'scope'] })
    })
    if (step.qcEnabled && !step.qcScope) context.addIssue({ code: 'custom', message: 'Choose the QC scope.', path: ['steps', i, 'qcScope'] })
  })
})

export type ProtocolDefinitionFormValues = z.infer<typeof protocolDefinitionFormSchema>
export type ProtocolStepFormValues = ProtocolDefinitionFormValues['steps'][number]

export type ProtocolDefinition = {
  schemaVersion: 1
  preparationBatchEnabled?: boolean
  steps: Array<{
    key: string
    labStepVersionId?: string | null
    attachmentKind?: 'none' | 'qc' | 'preparation' | null
    attachmentRequired?: boolean
    name: string
    instructions: string
    required: boolean
    condition?: string | null
    repeatable: boolean
    operatorConfirmation: boolean
    requiredRole?: Exclude<ProtocolStepFormValues['requiredRole'], ''> | null
    captures: Array<{
      key: string
      scope?: 'batch' | 'tube' | 'shared' | null
      label: string
      type: typeof protocolCaptureTypes[number]
      required: boolean
      sourceTube?: boolean
      material?: ConfiguredMaterial
      includeTracking?: boolean
      quantityBasis?: 'perSample' | 'total'
      unit?: string | null
      options?: string[] | null
    }>
    inputMaterials: string[]
    preparedOutputs: string[]
    equipmentTypes: string[]
    qcGate?: {
      scope?: 'batch' | 'tube' | 'shared' | null
      criteria: string
      outcomes: ['pass', 'fail', 'hold']
    } | null
  }>
}

const storedProtocolCaptureSchema = z.object({
  key: z.string().optional(),
  scope: z.enum(['batch', 'tube', 'shared']).nullish(),
  label: z.string().default(''),
  type: z.enum(protocolCaptureTypes).default('text'),
  required: z.boolean().default(true),
  sourceTube: z.boolean().default(false),
  material: materialSchema.optional(),
  includeTracking: z.boolean().optional(),
  quantityBasis: z.enum(['perSample', 'total']).optional(),
  unit: z.string().nullish(),
  options: z.array(z.string()).nullish(),
}).passthrough()

const storedProtocolStepSchema = z.object({
  key: z.string().optional(),
  labStepVersionId: z.string().uuid().nullish(),
  attachmentKind: z.enum(['none', 'qc', 'preparation']).nullish(),
  attachmentRequired: z.boolean().optional(),
  name: z.string().default(''),
  instructions: z.string().default(''),
  required: z.boolean().default(true),
  condition: z.string().nullish(),
  repeatable: z.boolean().default(false),
  operatorConfirmation: z.boolean().default(false),
  requiredRole: z.enum(protocolRoleTypes).nullish(),
  captures: z.array(storedProtocolCaptureSchema).default([]),
  inputMaterials: z.array(z.string()).default([]),
  preparedOutputs: z.array(z.string()).default([]),
  equipmentTypes: z.array(z.string()).default([]),
  qcGate: z.object({
    scope: z.enum(['batch', 'tube', 'shared']).nullish(),
    criteria: z.string().default(''),
  }).passthrough().nullish(),
}).passthrough()

const storedProtocolDefinitionSchema = z.object({
  preparationBatchEnabled: z.boolean().optional(),
  steps: z.array(storedProtocolStepSchema).default([]),
}).passthrough()

export const createEmptyProtocolStep = (): ProtocolStepFormValues => ({
  attachmentKind: 'none',
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
  qcScope: 'batch',
  qcCriteria: '',
})

export const createEmptyProtocolCapture = (): ProtocolStepFormValues['captures'][number] => ({
  label: '',
  type: 'text',
  required: true,
  scope: 'batch',
  unit: '',
  choices: '',
})

export const createLibraryPreparationExample = (): ProtocolDefinitionFormValues => ({
  preparationBatchEnabled: true,
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
          scope: 'tube',
          sourceTube: true,
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
          scope: 'tube',
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
          scope: 'tube',
          unit: 'ng/µL',
        },
      ],
      qcEnabled: true,
      qcScope: 'tube',
      qcCriteria: 'Confirm that the measured concentration is within the approved range for sequencing.',
    },
  ],
})

export function deserializeProtocolDefinition(value: string): ProtocolDefinitionFormValues | null {
  try {
    const parsed = storedProtocolDefinitionSchema.safeParse(JSON.parse(value))
    if (!parsed.success) return null
    const steps = parsed.data.steps.map((step) => ({
      ...(step.key ? { key: step.key } : {}),
      ...(step.labStepVersionId ? { labStepVersionId: step.labStepVersionId } : {}),
      ...(step.attachmentKind ? { attachmentKind: step.attachmentKind } : {}),
      ...(step.attachmentRequired ? { attachmentRequired: true } : {}),
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
        ...(capture.key ? { key: capture.key } : {}),
        label: capture.label,
        type: capture.type,
        required: capture.type === 'equipment' || capture.required,
        ...(capture.sourceTube ? { sourceTube: true } : {}),
        ...(capture.material ? { material: capture.material } : {}),
        ...(capture.includeTracking ? { includeTracking: true } : {}),
        ...(capture.quantityBasis ? { quantityBasis: capture.quantityBasis } : {}),
        ...(capture.scope ? { scope: capture.scope } : {}),
        unit: capture.unit ?? '',
        choices: capture.options?.join(', ') ?? '',
      })),
      qcEnabled: Boolean(step.qcGate),
      ...(step.qcGate?.scope ? { qcScope: step.qcGate.scope } : {}),
      qcCriteria: step.qcGate?.criteria ?? '',
    }))
    return { ...(parsed.data.preparationBatchEnabled ? { preparationBatchEnabled: true } : {}), steps: steps.length > 0 ? steps : [createEmptyProtocolStep()] }
  } catch {
    return null
  }
}

export function serializeProtocolDefinition(values: ProtocolDefinitionFormValues): string {
  const usedStepKeys = new Set<string>()
  const definition: ProtocolDefinition = {
    schemaVersion: 1,
    ...(values.preparationBatchEnabled ? { preparationBatchEnabled: true } : {}),
    steps: values.steps.map((step) => {
      const usedCaptureKeys = new Set<string>()
      return {
        key: uniqueKey(step.key || step.name, usedStepKeys, 'step'),
        ...(step.labStepVersionId ? { labStepVersionId: step.labStepVersionId } : {}),
        ...(step.attachmentKind ? { attachmentKind: step.attachmentKind } : {}),
        ...(step.attachmentRequired ? { attachmentRequired: true } : {}),
        name: step.name.trim(),
        instructions: step.instructions.trim(),
        required: step.requirement === 'required',
        ...(step.requirement === 'conditional' ? { condition: step.condition.trim() } : {}),
        repeatable: step.repeatable,
        operatorConfirmation: step.operatorConfirmation,
        ...(step.requiredRole ? { requiredRole: step.requiredRole } : {}),
        captures: step.captures.map((capture) => ({
          key: uniqueKey(capture.key || capture.label, usedCaptureKeys, 'capture'),
          label: capture.label.trim(),
          type: capture.type,
          required: capture.type === 'equipment' || capture.required,
          ...(values.preparationBatchEnabled && capture.scope ? { scope: capture.scope } : {}),
          ...(capture.type === 'barcode' && capture.sourceTube ? { sourceTube: true } : {}),
          ...(capture.type === 'material' && capture.material ? { material: capture.material } : {}),
          ...(capture.type === 'equipment' || capture.type === 'material' && capture.includeTracking ? { includeTracking: true } : {}),
          ...(capture.type === 'material' ? { quantityBasis: capture.quantityBasis ?? 'perSample' } : {}),
          ...(['number', 'material', 'biologicalMaterial'].includes(capture.type) && capture.unit.trim()
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
                ...(values.preparationBatchEnabled && step.qcScope ? { scope: step.qcScope } : {}),
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
