import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { RelationshipRequestDialog } from './RelationshipRequestDialog'

describe('direct Portal account requests', () => {
  it('limits accountless requests to reviewed onboarding and evaluation', async () => {
    const onSubmit = vi.fn()

    render(
      <RelationshipRequestDialog
        open
        organization={null}
        isPending={false}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    expect(
      screen.getByRole('dialog', { name: 'New Portal account request' }),
    ).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Onboarding' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Evaluation' })).toBeTruthy()
    expect(screen.queryByRole('option', { name: 'Service change' })).toBeNull()
    expect(screen.queryByRole('checkbox', { name: 'PSeq Lab Service' })).toBeNull()
    expect(screen.queryByLabelText('Internal notes')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Submit for review' }))
    expect(await screen.findByText('Enter an organization name.')).toBeTruthy()

    fireEvent.change(screen.getByLabelText(/Organization name/), {
      target: { value: 'Example Biotech' },
    })
    fireEvent.change(screen.getByLabelText(/Requested relationship/), {
      target: { value: 'Customer' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit for review' }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          candidateOrganizationName: 'Example Biotech',
          requestType: 'Onboarding',
          requestedOrganizationKind: 'Customer',
          pseqLabService: false,
          summary: '',
        }),
        expect.anything(),
      ),
    )
  })
})
