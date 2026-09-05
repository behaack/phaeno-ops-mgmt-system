import { createFileRoute } from '@tanstack/react-router'
import { DepartmentAdministrationPage } from '#/features/organizations/DepartmentAdministrationPage'

export const Route = createFileRoute('/departments')({ component: DepartmentAdministrationPage })
