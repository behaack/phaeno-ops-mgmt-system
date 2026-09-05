import { createFileRoute } from '@tanstack/react-router'
import { TrialConfigurationPage } from '#/features/trials/TrialConfigurationPage'
export const Route = createFileRoute('/trial-projects/configuration')({ component: TrialConfigurationPage })
