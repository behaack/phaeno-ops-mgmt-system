import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { createCrmCompanyDepartment, type CrmCompany } from '#/api/crm'
import type { DepartmentInput } from '#/api/organization-management'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { DepartmentSettingsDialog } from '#/features/organizations/DepartmentSettingsDialog'
import { OrganizationDepartmentsPanel } from '#/features/organizations/OrganizationDepartmentsPanel'

export function CrmCompanyDepartments({ company }: { company: CrmCompany }) {
  const client = useQueryClient()
  const [adding, setAdding] = useState(false)
  const create = useMutation({
    mutationFn: (input: DepartmentInput) => createCrmCompanyDepartment(company.id, input),
    onSuccess: async (department) => {
      // Use the returned identity immediately, even if a subsequent refresh fails.
      client.setQueryData<CrmCompany>(['crm-company', company.id], current => current ? {
        ...current, setupOrganizationId: current.accessOrganizationId ? null : department.organizationId,
      } : current)
      setAdding(false)
      await Promise.all([
        client.invalidateQueries({ queryKey: ['crm-company', company.id] }),
        client.invalidateQueries({ queryKey: ['crm-companies'] }),
        client.invalidateQueries({ queryKey: ['organization-departments', department.organizationId] }),
      ])
    },
  })
  const organizationId = company.accessOrganizationId ?? company.setupOrganizationId
  if (organizationId) return <OrganizationDepartmentsPanel
    organizationId={organizationId}
    companyId={company.id}
    manageMembers={Boolean(company.accessOrganizationId)}
    deliveryLocations={company.portalRelationship === 'Customer'}
  />

  return <>
    <Card>
      <CardHeader>
        <CardTitle>Departments</CardTitle>
        <CardDescription>Set up this Company's departments and their settings.</CardDescription>
        <CardAction><Button id="add-department" size="sm" disabled={!company.isActive} onClick={() => { create.reset(); setAdding(true) }}>
          <Plus data-icon="inline-start" />Add department
        </Button></CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{company.isActive ? 'No departments have been added.' : 'Reactivate this Company to add departments.'}</p>
      </CardContent>
    </Card>
    {adding ? <DepartmentSettingsDialog target="new" pending={create.isPending} error={create.error}
      onClose={() => setAdding(false)} onSubmit={input => create.mutate(input)} /> : null}
  </>
}
