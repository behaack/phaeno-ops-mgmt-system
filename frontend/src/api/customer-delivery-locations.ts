import { api } from './client'

export type CustomerDeliveryLocation = {
  id: string
  organizationId: string
  departmentId: string
  label: string
  recipient: string
  line1: string
  line2: string | null
  city: string
  region: string
  postalCode: string
  countryCode: string
  phone: string | null
  deliveryInstructions: string | null
  isDefault: boolean
  isActive: boolean
  version: number
}
export type CustomerDeliveryLocationWrite = Omit<CustomerDeliveryLocation, 'id' | 'isActive' | 'version'> & { version?: number }
export type DeliveryLocationScope = { organizationId: string; departmentId: string }
type Envelope<T> = { success: boolean; data: T; error: { message: string } | null }
function read<T>(value: Envelope<T>) {
  if (!value.success) throw new Error(value.error?.message ?? 'The delivery location could not be loaded.')
  return value.data
}
const path = '/customer-delivery-locations'
export async function getCustomerDeliveryLocations(scope: DeliveryLocationScope) { return read((await api.get<Envelope<CustomerDeliveryLocation[]>>(path, { params: scope })).data) }
export async function getCustomerDeliveryLocation(id: string) { return read((await api.get<Envelope<CustomerDeliveryLocation>>(`${path}/${id}`)).data) }
export async function createCustomerDeliveryLocation(input: CustomerDeliveryLocationWrite) { return read((await api.post<Envelope<CustomerDeliveryLocation>>(path, input)).data) }
export async function updateCustomerDeliveryLocation(id: string, input: CustomerDeliveryLocationWrite & { version: number }) { return read((await api.patch<Envelope<CustomerDeliveryLocation>>(`${path}/${id}`, input)).data) }
export async function deactivateCustomerDeliveryLocation(id: string, version: number) { return read((await api.delete<Envelope<CustomerDeliveryLocation>>(`${path}/${id}`, { params: { version } })).data) }
