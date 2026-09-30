import { createFileRoute } from '@tanstack/react-router'
import { DepartmentAdministrationPage } from '#/features/organizations/DepartmentAdministrationPage'
import { parseCustomerSettingsSearch } from '#/features/organizations/customer-settings-navigation'

export const Route = createFileRoute('/departments')({ validateSearch: parseCustomerSettingsSearch, component: DepartmentAdministrationPage })
