import { createFileRoute } from '@tanstack/react-router'

import { LabServiceCreatePage } from '#/features/orders/LabServiceCreatePage'

export const Route = createFileRoute('/lab-services/new')({ component: LabServiceCreatePage })
