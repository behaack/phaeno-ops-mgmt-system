import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StandardLabServicePanel } from './StandardLabServicePanel'
import { KitAssemblyCasesPanel } from './KitAssemblyCasesPanel'
import { LabServiceTimingPanel } from './LabServiceTimingPanel'
import { DataAssemblyCreatePage } from './DataAssemblyCreatePage'
import {
  bundleAssembly,
  bundleCase,
  bundleIds,
  bundleKitOrder,
  bundleLabDraft,
  bundleOffering,
  bundlePreview,
  bundleTiming,
} from '#/test-helpers/bundled-orders'

const mocks = vi.hoisted(() => ({
  offerings: vi.fn(),
  preview: vi.fn(),
  place: vi.fn(),
  changeCase: vi.fn(),
  timing: vi.fn(),
  getKit: vi.fn(),
  getAssembly: vi.fn(),
  profiles: vi.fn(),
  prepare: vi.fn(),
  update: vi.fn(),
  upload: vi.fn(),
  submit: vi.fn(),
  navigate: vi.fn(),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    search,
  }: {
    children: ReactNode
    to: string
    search?: unknown
  }) => (
    <a
      href={to}
      data-search={
        typeof search === 'object' ? JSON.stringify(search) : undefined
      }
    >
      {children}
    </a>
  ),
  useBlocker: vi.fn(),
  useNavigate: () => mocks.navigate,
}))
vi.mock('#/features/auth/session-context', () => ({
  usePhaenoSession: () => ({
    authProvider: 'clerk',
    selectedOrganizationId: bundleIds.organization,
    selectedDepartmentId: bundleIds.department,
    session: {
      capabilities: { canCreateDataAssemblyRequests: true },
      selectedDepartment: { purchaseOrderRequired: true },
    },
  }),
}))
vi.mock('#/api/order-bundles', async (original) => ({
  ...(await original<typeof import('#/api/order-bundles')>()),
  listLabServiceOfferings: mocks.offerings,
  previewStandardLabOrder: mocks.preview,
  placeStandardLabOrder: mocks.place,
  changeKitAssemblyCase: mocks.changeCase,
  overrideLabServiceTiming: mocks.timing,
  prepareKitAssemblyRequest: mocks.prepare,
}))
vi.mock('#/api/order-management', async (original) => ({
  ...(await original<typeof import('#/api/order-management')>()),
  getReagentOrder: mocks.getKit,
  getAssemblyRequest: mocks.getAssembly,
  listAssemblyProfiles: mocks.profiles,
  updateAssemblyRequest: mocks.update,
  uploadAssemblyInput: mocks.upload,
  submitAssemblyRequest: mocks.submit,
}))
function show(content: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    client,
    ...render(content, {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    }),
  }
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.offerings.mockResolvedValue([structuredClone(bundleOffering)])
  mocks.preview.mockResolvedValue(structuredClone(bundlePreview))
  mocks.place.mockRejectedValue(new Error('Reviewed scope changed.'))
  mocks.changeCase.mockRejectedValue(new Error('The case changed.'))
  mocks.timing.mockRejectedValue(new Error('The timing changed.'))
  mocks.getKit.mockResolvedValue(structuredClone(bundleKitOrder))
  mocks.getAssembly.mockResolvedValue(structuredClone(bundleAssembly))
  mocks.profiles.mockResolvedValue([])
})
async function reviewStandard() {
  fireEvent.change(await screen.findByRole('combobox', { name: 'Offering' }), {
    target: { value: bundleIds.offering },
  })
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Review standard order' }),
    ).toHaveProperty('disabled', false),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Review standard order' }))
  return within(screen.getByRole('dialog'))
}

describe('configured Lab Service commitment', () => {
  it('requires explicit acceptance and submits the exact final-price review even after refresh', async () => {
    const { client } = show(<StandardLabServicePanel order={bundleLabDraft} />)
    const dialog = await reviewStandard()
    expect(dialog.getByText('Total $220.00')).toBeTruthy()
    fireEvent.click(
      dialog.getByRole('button', { name: 'Place standard order' }),
    )
    expect(await dialog.findByRole('alert')).toHaveProperty(
      'textContent',
      expect.stringContaining('Confirm the scope'),
    )
    expect(mocks.place).not.toHaveBeenCalled()
    mocks.preview.mockResolvedValue({
      ...bundlePreview,
      orderVersion: 12,
      reviewToken: 'new-review',
      tax: 30,
      total: 230,
    })
    await act(async () => {
      await client.refetchQueries({ queryKey: ['standard-lab-preview'] })
    })
    expect(dialog.getByText('Total $220.00')).toBeTruthy()
    fireEvent.change(
      dialog.getByRole('textbox', { name: /Purchase order number/ }),
      { target: { value: 'TRAINING-PO' } },
    )
    fireEvent.click(dialog.getByRole('checkbox'))
    fireEvent.click(
      dialog.getByRole('button', { name: 'Place standard order' }),
    )
    await waitFor(() =>
      expect(mocks.place).toHaveBeenCalledWith(
        bundleIds.order,
        expect.objectContaining({
          version: 3,
          reviewToken: 'synthetic-reviewed-scope',
          commercialProfileVersion: 7,
          departmentVersion: 8,
          organizationVersion: 9,
          offeringRecordVersion: 5,
          catalogItemVersion: 4,
          prohibitedDataConfirmed: true,
          purchaseOrderNumber: 'TRAINING-PO',
        }),
        expect.any(String),
      ),
    )
    expect(
      await dialog.findByText('Standard order was not placed'),
    ).toBeTruthy()
    expect(
      dialog.getByRole('textbox', { name: /Purchase order number/ }),
    ).toHaveProperty('value', 'TRAINING-PO')
  })
  it('shows final-price blockers without allowing commitment', async () => {
    mocks.preview.mockResolvedValue({
      ...bundlePreview,
      total: null,
      tax: null,
      canPlaceStandardOrder: false,
      commercialProfileVersion: null,
      blockers: ['Finance must approve the tax decision.'],
    })
    show(<StandardLabServicePanel order={bundleLabDraft} />)
    fireEvent.change(
      await screen.findByRole('combobox', { name: 'Offering' }),
      { target: { value: bundleIds.offering } },
    )
    expect(
      await screen.findByText('Finance must approve the tax decision.'),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Review standard order' }),
    ).toHaveProperty('disabled', true)
    expect(mocks.place).not.toHaveBeenCalled()
  })
  it('requires a fresh confirmation after refreshing changed terms', async () => {
    show(<StandardLabServicePanel order={bundleLabDraft} />)
    const dialog = await reviewStandard()
    fireEvent.change(
      dialog.getByRole('textbox', { name: /Purchase order number/ }),
      { target: { value: 'TRAINING-PO' } },
    )
    fireEvent.click(dialog.getByRole('checkbox'))
    fireEvent.click(
      dialog.getByRole('button', { name: 'Place standard order' }),
    )
    fireEvent.click(
      await dialog.findByRole('button', {
        name: 'Refresh terms and review again',
      }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Review standard order' }),
      ).toHaveProperty('disabled', false),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Review standard order' }),
    )
    expect(
      within(screen.getByRole('dialog'))
        .getByRole('checkbox')
        .getAttribute('aria-checked'),
    ).toBe('false')
  })
})

describe('included Kit assembly', () => {
  it('links preparation to the exact case and never offers a second purchase', () => {
    show(<KitAssemblyCasesPanel order={bundleKitOrder} />)
    expect(
      screen
        .getByRole('link', { name: 'Prepare inputs' })
        .getAttribute('data-search'),
    ).toBe(
      JSON.stringify({
        kitOrderId: bundleIds.order,
        kitCaseId: bundleIds.case,
      }),
    )
    expect(screen.queryByRole('button', { name: /quote|purchase/i })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Extend deadline' })).toBeNull()
  })
  it('preserves reviewed case version and unsaved extension after a stale write', async () => {
    const view = show(<KitAssemblyCasesPanel order={bundleKitOrder} staff />)
    fireEvent.click(screen.getByRole('button', { name: 'Extend deadline' }))
    const dialog = within(screen.getByRole('dialog'))
    fireEvent.change(dialog.getByLabelText(/New submission deadline/), {
      target: { value: '2027-02-01T10:00' },
    })
    fireEvent.change(dialog.getByRole('textbox', { name: /Reason/ }), {
      target: { value: 'Approved training extension' },
    })
    view.rerender(
      <KitAssemblyCasesPanel
        order={{
          ...bundleKitOrder,
          assemblyCases: [{ ...bundleCase, version: 9 }],
        }}
        staff
      />,
    )
    fireEvent.click(
      dialog.getByRole('button', { name: 'Extend submission deadline' }),
    )
    await waitFor(() =>
      expect(mocks.changeCase).toHaveBeenCalledWith(
        bundleIds.order,
        bundleIds.case,
        'extend',
        expect.objectContaining({
          version: 4,
          reason: 'Approved training extension',
        }),
      ),
    )
    expect(await dialog.findByText('Case was not changed')).toBeTruthy()
    expect(dialog.getByRole('textbox', { name: /Reason/ })).toHaveProperty(
      'value',
      'Approved training extension',
    )
  })
  it('routes a direct new-assembly URL back to purchased Kit cases', () => {
    show(<DataAssemblyCreatePage />)
    expect(screen.getByText('Choose an included assembly case')).toBeTruthy()
    expect(mocks.prepare).not.toHaveBeenCalled()
    expect(mocks.profiles).not.toHaveBeenCalled()
  })
  it('edits an included case from its frozen profile even when the catalog is inactive', async () => {
    mocks.getKit.mockResolvedValue({
      ...bundleKitOrder,
      assemblyCases: [
        {
          ...bundleCase,
          profile: { ...bundleCase.profile, isActive: false },
          assemblyRequestId: bundleIds.request,
        },
      ],
    })
    show(<DataAssemblyCreatePage requestId={bundleIds.request} />)
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /Profile/ })).toHaveProperty(
        'value',
        bundleIds.profile,
      ),
    )
    expect(screen.getByRole('combobox', { name: /Profile/ })).toHaveProperty(
      'disabled',
      true,
    )
    expect(mocks.profiles).not.toHaveBeenCalled()
    expect(
      screen.getByText(/No separate quote or purchase is required/),
    ).toBeTruthy()
  })
})

describe('Lab Service timing', () => {
  it('keeps original target visible and requires a safe explanation for Other delay', async () => {
    show(
      <LabServiceTimingPanel
        orderId={bundleIds.order}
        timing={bundleTiming}
        staff
      />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Change expected completion' }),
    )
    const dialog = within(screen.getByRole('dialog'))
    fireEvent.change(dialog.getByRole('combobox', { name: /Reason shown/ }), {
      target: { value: 'Other operational delay' },
    })
    fireEvent.click(
      dialog.getByRole('button', { name: 'Save expected completion' }),
    )
    expect(
      await dialog.findByText(
        'Explain the delay in a note safe for the ordering organization.',
      ),
    ).toBeTruthy()
    expect(mocks.timing).not.toHaveBeenCalled()
    fireEvent.change(
      dialog.getByRole('textbox', { name: /Organization-visible note/ }),
      { target: { value: 'Additional review time is required.' } },
    )
    fireEvent.click(
      dialog.getByRole('button', { name: 'Save expected completion' }),
    )
    await waitFor(() =>
      expect(mocks.timing).toHaveBeenCalledWith(
        bundleIds.order,
        expect.objectContaining({
          version: 6,
          reason: 'Other operational delay',
          customerSafeNote: 'Additional review time is required.',
        }),
      ),
    )
    expect(await dialog.findByText('Timing was not changed')).toBeTruthy()
  })
  it('does not expose staff timing controls or internal notes to the ordering organization', () => {
    show(
      <LabServiceTimingPanel
        orderId={bundleIds.order}
        timing={{
          ...bundleTiming,
          changes: [
            {
              id: 'change',
              previousExpectedAtUtc: bundleTiming.originalTargetAtUtc!,
              expectedAtUtc: bundleTiming.expectedCompletionAtUtc!,
              reason: 'Laboratory scheduling adjustment',
              customerSafeNote: 'Review in progress',
              internalNote: 'Internal batch details',
              actorUserId: 'operator',
              occurredAtUtc: bundleTiming.acceptedAtUtc!,
              notificationRequired: true,
              notificationStatus: 'Pending',
            },
          ],
        }}
      />,
    )
    expect(
      screen.queryByRole('button', { name: 'Change expected completion' }),
    ).toBeNull()
    expect(screen.queryByText(/Internal batch details/)).toBeNull()
    expect(screen.queryByText(/Organization notification/)).toBeNull()
  })
})
