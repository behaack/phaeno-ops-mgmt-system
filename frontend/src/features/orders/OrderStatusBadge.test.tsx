import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { humanizeStatus, OrderStatusBadge } from './OrderStatusBadge'

describe('OrderStatusBadge', () => {
  it('renders workflow statuses as readable labels', () => {
    render(<OrderStatusBadge status="SubmittedForQuote" />)

    expect(screen.getByText('Submitted For Quote')).toBeTruthy()
  })

  it('humanizes acronym and hyphen boundaries consistently', () => {
    expect(humanizeStatus('NeedsAttention')).toBe('Needs Attention')
    expect(humanizeStatus('release-hold')).toBe('Release Hold')
  })
})
