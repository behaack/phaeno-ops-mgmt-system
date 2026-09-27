import { createFileRoute } from '@tanstack/react-router'
import { EquipmentWorkspace } from '#/features/lab-operations/EquipmentWorkspace'

export const Route = createFileRoute('/equipment')({ component: EquipmentWorkspace })
