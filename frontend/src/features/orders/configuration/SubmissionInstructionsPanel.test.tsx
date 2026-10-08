import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OrderConfiguration } from '#/api/order-management'
import { SubmissionInstructionsEditor } from './SubmissionInstructionsPanel'

const api = vi.hoisted(() => ({ save: vi.fn() }))
vi.mock('#/api/order-management', () => ({ getOrderConfiguration: vi.fn(), updateOrderSystemConfiguration: api.save, getOrderErrorMessage: (_error: unknown, fallback: string) => fallback }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: vi.fn(), Link: ({ children }: { children: ReactNode }) => <a href="#instructions">{children}</a> }))

describe('Order submission guidance', () => {
  beforeEach(() => { vi.resetAllMocks(); api.save.mockResolvedValue(undefined) })

  it('saves guidance without converting workflows or changing quote and shipping settings', async () => {
    const system = { id: 'system-id', version: 4, quoteValidityDays: 45, sampleSubmissionInstructions: 'Original guidance.', shippingConfigurationJson: '{"preserved":true}', sampleConfigurationJson: '{"legacy":true}', resultDestinationConfigurationJson: '{"legacyDestination":true}' }
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    render(<QueryClientProvider client={client}><SubmissionInstructionsEditor configuration={{ system } as OrderConfiguration} /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Edit instructions' }))
    expect(screen.getByRole('button', { name: 'Save changes' })).toHaveProperty('disabled', true)
    expect(screen.queryByLabelText(/Default quote validity/)).toBeNull()
    const instructions = screen.getByLabelText(/Order submission guidance/)
    fireEvent.change(instructions, { target: { value: '' } })
    fireEvent.blur(instructions)
    await waitFor(() => expect(instructions.getAttribute('aria-invalid')).toBe('true'))
    fireEvent.change(instructions, { target: { value: 'Use the registered tubes.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(api.save).toHaveBeenCalledWith({ id: system.id, version: 4, quoteValidityDays: 45, shippingConfigurationJson: system.shippingConfigurationJson, sampleSubmissionInstructions: 'Use the registered tubes.' }))
  })
})
