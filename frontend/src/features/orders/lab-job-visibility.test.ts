import { describe, expect, it } from 'vitest'
import { bundleLabDraft } from '#/test-helpers/bundled-orders'
import { shippingFixture } from '#/test-helpers/sample-shipping'
import { labJobVisibility } from './lab-job-visibility'

const draft = { ...bundleLabDraft, placedAt: null, samples: [], quotes: [], resultFiles: [], resultReleases: [], canEditSamples: false, sampleRosterFinalizedAt: null }
const confirmed = { ...draft, placedAt: '2026-09-10T12:00:00Z', canEditSamples: true }
const shipment = { ...shippingFixture, organizationId: draft.organizationId, authorizationSourceId: draft.id }

describe('stage-relevant Lab Job work', () => {
  it('keeps quote review open and omits sample work before commitment', () => {
    expect(labJobVisibility(draft, [], false)).toEqual({ confirmed: false, samplesRelevant: false, trackingRelevant: false })
  })
  it('opens sample work after commitment but leaves tracking hidden while preparing and ready to send', () => {
    expect(labJobVisibility(confirmed, [shipment], false)).toEqual({ confirmed: true, samplesRelevant: true, trackingRelevant: false })
    expect(labJobVisibility({ ...confirmed, labMilestone: 'AwaitingSpecimens' }, [{ ...shipment, status: 'ReadyToShip' }], false).trackingRelevant).toBe(false)
  })
  it('shows tracking for a partial dispatch without completing remaining preparation', () => {
    expect(labJobVisibility(confirmed, [shipment, { ...shipment, id: 'second', shippedAt: '2026-09-10T13:00:00Z' }], false).trackingRelevant).toBe(true)
  })
  it('recognizes independent receipt, lab progress and released results without inventing dispatch', () => {
    expect(labJobVisibility(confirmed, [{ ...shipment, receivedTubeCount: 1 }], false).trackingRelevant).toBe(true)
    expect(labJobVisibility({ ...confirmed, labMilestone: 'Processing' }, [], false).trackingRelevant).toBe(true)
    expect(labJobVisibility(confirmed, [], true).trackingRelevant).toBe(true)
  })
  it('does not use unrelated or cancelled shipments, malformed dates or generic statuses as tracking evidence', () => {
    expect(labJobVisibility(confirmed, [{ ...shipment, authorizationSourceId: 'other', shippedAt: '2026-09-10T13:00:00Z' }, { ...shipment, status: 'Cancelled', shippedAt: '2026-09-10T13:00:00Z' }, { ...shipment, shippedAt: 'invalid' }], false).trackingRelevant).toBe(false)
    expect(labJobVisibility({ ...confirmed, labMilestone: 'Cancelled' }, [], false).trackingRelevant).toBe(false)
  })
})
