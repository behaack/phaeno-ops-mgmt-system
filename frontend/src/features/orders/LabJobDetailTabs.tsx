import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import type { ReactNode } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import type { LabJobWorkspaceSearch } from './lab-job-workspace-search'

export type LabJobDetailTab = NonNullable<LabJobWorkspaceSearch['detailTab']>
export function LabJobDetailTabs({ value, onChange, disabled, phases, results, billing, history }: {
  value: LabJobDetailTab; onChange: (value: LabJobDetailTab) => void; disabled: boolean
  phases: ReactNode; results: ReactNode; billing: ReactNode; history: ReactNode
}) {
  const __customerText = useCustomerText()

  return <Tabs value={value} onValueChange={next => onChange(next as LabJobDetailTab)} className="mt-6 gap-4">
    <TabsList aria-label={__customerText('m_905666612249')} className="grid w-full grid-cols-2 sm:grid-cols-4">
      <TabsTrigger value="phases" disabled={disabled}><CustomerText message="m_4664827f8e89" /></TabsTrigger>
      <TabsTrigger value="results" disabled={disabled}><CustomerText message="m_145d0e775062" /></TabsTrigger>
      <TabsTrigger value="billing" disabled={disabled}><CustomerText message="m_843b5483adae" /></TabsTrigger>
      <TabsTrigger value="history" disabled={disabled}><CustomerText message="m_0e7696009337" /></TabsTrigger>
    </TabsList>
    <TabsContent value="phases"><div id="job-phase-progress" tabIndex={-1} className="scroll-mt-6 focus-visible:ring-2 focus-visible:ring-ring">{phases}</div></TabsContent>
    <TabsContent value="results"><div id="results" tabIndex={-1} className="scroll-mt-6 focus-visible:ring-2 focus-visible:ring-ring">{results}</div></TabsContent>
    <TabsContent value="billing"><div id="job-commercial" tabIndex={-1} className="space-y-4 scroll-mt-6 focus-visible:ring-2 focus-visible:ring-ring">{billing}</div></TabsContent>
    <TabsContent value="history" className="space-y-4">{history}</TabsContent>
  </Tabs>
}
