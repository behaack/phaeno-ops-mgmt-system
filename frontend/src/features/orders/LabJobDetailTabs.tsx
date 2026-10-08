import type { ReactNode } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import type { LabJobWorkspaceSearch } from './lab-job-workspace-search'

export type LabJobDetailTab = NonNullable<LabJobWorkspaceSearch['detailTab']>
export function LabJobDetailTabs({ value, onChange, disabled, phases, results, billing, history }: {
  value: LabJobDetailTab; onChange: (value: LabJobDetailTab) => void; disabled: boolean
  phases: ReactNode; results: ReactNode; billing: ReactNode; history: ReactNode
}) {
  return <Tabs value={value} onValueChange={next => onChange(next as LabJobDetailTab)} className="mt-6 gap-4">
    <TabsList aria-label="Order information" className="grid w-full grid-cols-2 sm:grid-cols-4">
      <TabsTrigger value="phases" disabled={disabled}>Progress</TabsTrigger>
      <TabsTrigger value="results" disabled={disabled}>Files and results</TabsTrigger>
      <TabsTrigger value="billing" disabled={disabled}>Order and billing</TabsTrigger>
      <TabsTrigger value="history" disabled={disabled}>History</TabsTrigger>
    </TabsList>
    <TabsContent value="phases"><div id="job-phase-progress" tabIndex={-1} className="scroll-mt-6 focus-visible:ring-2 focus-visible:ring-ring">{phases}</div></TabsContent>
    <TabsContent value="results"><div id="results" tabIndex={-1} className="scroll-mt-6 focus-visible:ring-2 focus-visible:ring-ring">{results}</div></TabsContent>
    <TabsContent value="billing"><div id="job-commercial" tabIndex={-1} className="space-y-4 scroll-mt-6 focus-visible:ring-2 focus-visible:ring-ring">{billing}</div></TabsContent>
    <TabsContent value="history" className="space-y-4">{history}</TabsContent>
  </Tabs>
}
