import { api } from './client'
export type NegotiatedLabPrice = {
  id: string; catalogItemId: string; departmentId: string | null; unitPrice: number
  effectiveFrom: string; effectiveTo: string | null; isActive: boolean; version: number
}
export type NegotiatedLabPriceWrite = Omit<NegotiatedLabPrice, 'id' | 'version'> & { version?: number }
export type CompanyLabPricing = { organizationId: string; prices: NegotiatedLabPrice[]; services: { id: string; name: string; isActive: boolean }[]; departments: { id: string; name: string }[] }
type Envelope<T> = { success: boolean; data: T; error?: { message: string } }
function read<T>(value: Envelope<T>) { if (!value.success) throw new Error(value.error?.message ?? 'Service pricing could not be saved.'); return value.data }
const path = (companyId: string) => `/platform/companies/${companyId}/lab-service-pricing`
export async function getCompanyLabPricing(companyId: string) { return read((await api.get<Envelope<CompanyLabPricing>>(path(companyId))).data) }
export async function saveCompanyLabPrice(companyId: string, id: string | null, input: NegotiatedLabPriceWrite) {
  return read((id ? await api.patch<Envelope<NegotiatedLabPrice>>(`${path(companyId)}/${id}`, input) : await api.post<Envelope<NegotiatedLabPrice>>(path(companyId), input)).data)
}
