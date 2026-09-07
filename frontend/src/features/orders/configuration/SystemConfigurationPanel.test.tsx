import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OrderConfiguration } from '#/api/order-management'
import { SystemConfigurationPanel } from './SystemConfigurationPanel'

const api = vi.hoisted(() => ({ save: vi.fn() }))
vi.mock('#/api/order-management', () => ({ updateOrderSystemConfiguration: api.save, getOrderErrorMessage: (_error: unknown, fallback: string) => fallback }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: vi.fn(), Link: ({ children }: { children: ReactNode }) => <a href="#shipping">{children}</a> }))

describe('Order defaults editor', () => {
  beforeEach(() => { vi.restoreAllMocks(); vi.resetAllMocks(); api.save.mockResolvedValue(undefined) })

  it('disables a pristine supported configuration and becomes pristine when original values are restored', () => {
    renderDefaults()
    fireEvent.click(screen.getByRole('button', { name: 'Edit defaults' }))
    const save = screen.getByRole('button', { name: 'Save changes' })
    expect(save).toHaveProperty('disabled', true)
    const days = screen.getByLabelText(/Default quote validity/)
    fireEvent.change(days, { target: { value: '45' } })
    expect(save).toHaveProperty('disabled', false)
    fireEvent.change(days, { target: { value: '30' } })
    expect(save).toHaveProperty('disabled', true)
    expect(days).toHaveProperty('required', true)
    expect(screen.getByLabelText(/Sample submission instructions/)).toHaveProperty('required', true)
  })

  it.each([
    '{}',
    '{"mode":"ExactSampleRoster","enabled":false}',
    '{"mode":"other","mode":"ExactSampleRoster"}',
    '[{"mode":"ExactSampleRoster"}]',
  ])('requires review and permits conversion of unchanged unsupported settings: %s', async sampleConfigurationJson => {
    renderDefaults(sampleConfigurationJson)
    expect(screen.getByText('Review the supported workflow')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Edit defaults' }))
    const save = screen.getByRole('button', { name: 'Save changes' })
    expect(save).toHaveProperty('disabled', false)
    fireEvent.click(save)
    await waitFor(() => expect(api.save).toHaveBeenCalledOnce())
    expect(api.save.mock.calls[0][0]).toMatchObject({ version: 4, quoteValidityDays: 30, sampleConfigurationJson: '{"mode":"ExactSampleRoster"}', resultDestinationConfigurationJson: '{"destination":"GovernedPortal"}', shippingConfigurationJson: '{"preserved":true}' })
  })

  it('validates on blur and corrects the existing field error without sending a request', async () => {
    renderDefaults()
    fireEvent.click(screen.getByRole('button', { name: 'Edit defaults' }))
    const days = screen.getByLabelText(/Default quote validity/)
    fireEvent.change(days, { target: { value: '0' } })
    expect(days.getAttribute('aria-invalid')).toBe('false')
    fireEvent.blur(days)
    await waitFor(() => expect(days.getAttribute('aria-invalid')).toBe('true'))
    expect(days.getAttribute('aria-describedby')).toBe('quoteValidityDays-error')
    fireEvent.change(days, { target: { value: '45' } })
    await waitFor(() => expect(days.getAttribute('aria-invalid')).toBe('false'))
    expect(api.save).not.toHaveBeenCalled()
  })

  it('keeps failed values and warns before Escape discards them, then restores the opener', async () => {
    api.save.mockRejectedValue(new Error('Settings changed'))
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    renderDefaults()
    const opener = screen.getByRole('button', { name: 'Edit defaults' })
    opener.focus()
    fireEvent.click(opener)
    const instructions = screen.getByLabelText(/Sample submission instructions/)
    fireEvent.change(instructions, { target: { value: 'Use the registered tubes.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Defaults were not saved')).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(confirm).toHaveBeenCalledWith('Discard unsaved order defaults?')
    expect(instructions).toHaveProperty('value', 'Use the registered tubes.')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })
})

function renderDefaults(sampleConfigurationJson = '{"mode":"ExactSampleRoster"}') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const configuration = { system: { id: 'system-id', version: 4, quoteValidityDays: 30, sampleSubmissionInstructions: 'Follow the sample packet.', shippingConfigurationJson: '{"preserved":true}', sampleConfigurationJson, resultDestinationConfigurationJson: '{"destination":"GovernedPortal"}' } } as OrderConfiguration
  return render(<QueryClientProvider client={client}><SystemConfigurationPanel configuration={configuration} /></QueryClientProvider>)
}
