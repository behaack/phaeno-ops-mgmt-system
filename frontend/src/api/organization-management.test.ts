import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getOperationalReadiness } from './organization-management'

const client = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('./client', () => ({ api: client }))

describe('organization management API client', () => {
  beforeEach(() => vi.clearAllMocks())

  it('unwraps the derived operational-readiness response', async () => {
    const readiness = {
      organizationId: 'customer-id',
      state: 'NeedsSetup',
      canStageOrder: true,
      canIssueQuote: false,
      hasManualBlock: false,
      manualBlockReason: null,
      blockers: [
        {
          code: 'ActiveCustomerAdministratorMissing',
          label: 'Customer administrator',
          nextAction: 'Invite and activate a Customer administrator.',
        },
      ],
    }
    client.get.mockResolvedValue({
      data: { success: true, data: readiness, error: null },
    })

    await expect(getOperationalReadiness('customer-id')).resolves.toEqual(
      readiness,
    )
  })
})
