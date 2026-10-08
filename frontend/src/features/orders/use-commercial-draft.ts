import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { saveCommercialDraft, submitCommercialDraft, type CommercialDraftWrite } from '#/api/commercial-drafts'
import { getPlatformOrder, getCommercialPricingCatalog, getCustomerOrderReadiness, listCustomerOrderDepartments, listCustomerOrderOptions, listLabOrderSampleTypes } from '#/api/order-management'

export function useCommercialDraftData(orderId: string | undefined, organizationId: string, departmentId: string, enabled: boolean) {
  const order = useQuery({ queryKey: ['platform-order', 'lab', orderId], queryFn: () => getPlatformOrder('lab', orderId!), enabled: enabled && Boolean(orderId) })
  const customers = useQuery({ queryKey: ['order-operations', 'customer-options'], queryFn: listCustomerOrderOptions, enabled })
  const departments = useQuery({ queryKey: ['customer-order-departments', organizationId], queryFn: () => listCustomerOrderDepartments(organizationId), enabled: enabled && Boolean(organizationId) })
  const selectedDepartmentId = departmentId || (departments.data?.length === 1 ? departments.data[0].id : '')
  const readiness = useQuery({ queryKey: ['customer-order-readiness', organizationId, selectedDepartmentId], queryFn: () => getCustomerOrderReadiness(organizationId, selectedDepartmentId), enabled: enabled && Boolean(organizationId && selectedDepartmentId) })
  const sampleTypes = useQuery({ queryKey: ['lab-order-sample-types', true], queryFn: () => listLabOrderSampleTypes(true), enabled })
  const pricingCatalog = useQuery({ queryKey: ['commercial-pricing-catalog'], queryFn: getCommercialPricingCatalog, enabled })
  return { order, customers, departments, readiness, sampleTypes, pricingCatalog, selectedDepartmentId }
}
export function useCommercialDraftWrite() {
  const client = useQueryClient()
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null)
  return useMutation({ mutationFn: async ({ orderId, input, submit }: { orderId?: string; input: CommercialDraftWrite; submit: boolean }) => {
    const fingerprint = JSON.stringify({ orderId, input })
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() }
    const saved = await saveCommercialDraft(orderId, input, attempt.current.key)
    client.setQueryData(['platform-order', 'lab', saved.id], saved)
    attempt.current = null
    if (submit) {
      try { return { order: await submitCommercialDraft(saved.id, saved.version, crypto.randomUUID()), submissionError: null } }
      catch (submissionError) {
        try { const latest = await getPlatformOrder('lab', saved.id); if ('commercialDraft' in latest && !latest.commercialDraft && latest.status !== 'DraftRequest') return { order: latest as typeof saved, submissionError: null } } catch { /* Retain the saved Draft when recovery is unavailable. */ }
        return { order: saved, submissionError }
      }
    }
    return { order: saved, submissionError: null }
  }, onSuccess: async ({ order: saved }) => {
    client.setQueryData(['platform-order', 'lab', saved.id], saved)
    await Promise.all([client.invalidateQueries({ queryKey: ['commercial-orders'] }), client.invalidateQueries({ queryKey: ['order-intake-handoffs'] })])
  } })
}
