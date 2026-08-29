import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createStagedPSeqOrder,
  listStageEligibleCustomers,
} from './pseq-order-to-cash'

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}))

vi.mock('./client', () => ({ api: client }))

describe('PSeq order-to-cash API client', () => {
  beforeEach(() => vi.clearAllMocks())

  it('unwraps successful API envelopes for collection reads', async () => {
    const customers = [
      {
        organizationId: 'customer-id',
        organizationName: 'Atlas Research',
        readiness: 'NeedsSetup',
        canStageOrder: false,
        canIssueQuote: false,
        blockers: [],
      },
    ]
    client.get.mockResolvedValue({
      data: { success: true, data: customers, error: null },
    })

    await expect(listStageEligibleCustomers()).resolves.toEqual(customers)
  })

  it('unwraps successful API envelopes for commands', async () => {
    const order = { id: 'order-id', orderNumber: 'LAB-2026-0001' }
    client.post.mockResolvedValue({
      data: { success: true, data: order, error: null },
    })

    await expect(
      createStagedPSeqOrder({ organizationId: 'customer-id', samples: [] }),
    ).resolves.toEqual(order)
  })

  it('surfaces envelope failures as request errors', async () => {
    client.get.mockResolvedValue({
      data: {
        success: false,
        data: null,
        error: { message: 'Commercial role required.' },
      },
    })

    await expect(listStageEligibleCustomers()).rejects.toThrow(
      'Commercial role required.',
    )
  })
})
