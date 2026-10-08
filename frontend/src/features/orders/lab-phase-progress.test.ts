import { describe, expect, it } from 'vitest'
import { phaseSampleProgress } from './lab-phase-progress'

function steps(stageCounts: Record<string, number>, sampleCount = 10, lifecycle = 'InProgress') {
  return phaseSampleProgress({ stageCounts, sampleCount, lifecycle })
}

describe('sample completion at laboratory stages', () => {
  it('keeps seven sequencing samples in progress while three still await preparation', () => {
    const progress = steps({ ReadyForPreparation: 3, Sequencing: 7 })
    expect(progress.map(step => step.finished)).toEqual([10, 7, 0, 0, 0, 0])
    expect(progress.filter(step => step.complete).map(step => step.id)).toEqual(['received'])
    expect(progress.find(step => step.current)?.id).toBe('preparation')
    expect(progress.find(step => step.id === 'sequencing')).toMatchObject({ here: 7, status: 'In progress', complete: false })
  })
  it('does not call quality review complete when every sample is still being reviewed', () => {
    const progress = steps({ QualityReview: 10 })
    expect(progress.map(step => step.finished)).toEqual([10, 10, 10, 10, 0, 0])
    expect(progress.find(step => step.id === 'review')).toMatchObject({ complete: false, status: 'In progress' })
  })
  it('requires Portal delivery for the final check and keeps approved samples separate', () => {
    const progress = steps({ AwaitingDelivery: 8, Delivered: 2 })
    expect(progress.find(step => step.id === 'review')).toMatchObject({ finished: 10, complete: true })
    expect(progress.find(step => step.id === 'results')).toMatchObject({ finished: 2, complete: false })
    expect(steps({ Delivered: 10 }).every(step => step.complete)).toBe(true)
    expect(steps({ Delivered: 10 }).some(step => step.current)).toBe(false)
  })
  it('does not infer completed steps from unknown, cancelled or unreceived samples', () => {
    expect(steps({ Sequencing: 7, Cancelled: 2, Unknown: 1 }).some(step => step.complete)).toBe(false)
    expect(steps({ AwaitingReceipt: 10 }).every(step => step.finished === 0)).toBe(true)
    expect(steps({}, 0).some(step => step.complete)).toBe(false)
    expect(steps({ Cancelled: 10 }, 10, 'Cancelled').some(step => step.current)).toBe(false)
  })
})
