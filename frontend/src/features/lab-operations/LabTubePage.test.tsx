import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LabTubePage } from './LabTubePage'

const fixture = vi.hoisted(() => ({
  tube: {
    id: 'tube-1', labSpecimenId: 'specimen-1', parentContainerId: null,
    kind: 'SubmittedSpecimen', barcode: 'PH-S-EXAMPLE', barcodeSource: 'PhaenoGenerated',
    label: 'Submitted tube', labelPrintCount: 0, status: 'LabelPending',
    location: 'Freezer A', intakeDisposition: 'Accepted', version: 1,
  },
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => queryKey[0] === 'lab-work-order'
    ? { data: { containers: [fixture.tube], executions: [], workOrder: { status: 'InProgress' } }, isPending: false }
    : queryKey[0] === 'lab-attempts'
      ? { data: { specimens: [{ id: 'specimen-1', name: 'Specimen', intakeDisposition: 'Accepted', attempts: [] }] } }
      : { data: [] },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: vi.fn(),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>,
  useBlocker: vi.fn(),
}))
vi.mock('#/features/auth/session-context', () => ({
  usePhaenoSession: () => ({
    authProvider: 'clerk',
    session: { capabilities: { canManageLabOperations: true, canSuperviseLabWork: true, canOperateLabWork: true } },
  }),
}))
vi.mock('./preparation-ui', () => ({
  PreparationActions: ({ items }: { items: { label: string }[] }) =>
    <div>{items.map(item => <span key={item.label}>{item.label}</span>)}</div>,
}))
vi.mock('./BiologicalMaterialHistory', () => ({ BiologicalMaterialHistory: () => null }))

describe('LabTubePage', () => {
  it('offers intake correction for an unused submitted tube awaiting label verification', () => {
    render(<LabTubePage workOrderId="work-1" containerId="tube-1" />)

    expect(screen.getByText('Correct intake decision')).toBeTruthy()
    expect(screen.getByText('Print label')).toBeTruthy()
  })
})
