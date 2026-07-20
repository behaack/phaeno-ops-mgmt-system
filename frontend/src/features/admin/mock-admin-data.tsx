import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type CustomerStatus = 'Active' | 'Review' | 'Inactive'
export type CustomerRecord = {
  id: string
  name: string
  status: CustomerStatus
  users: number
  partner: string
  nextStep: string
  contact: string
  securityContact: string
  lastReview: string
}

type CustomerInput = Omit<CustomerRecord, 'id' | 'users' | 'lastReview'> & {
  users?: number
  lastReview?: string
}

type MockAdminDataContextValue = {
  customers: CustomerRecord[]
  addCustomer: (customer: CustomerInput) => string
  updateCustomer: (customerId: string, customer: CustomerInput) => void
  deactivateCustomer: (customerId: string) => void
}

const MockAdminDataContext =
  createContext<MockAdminDataContextValue | null>(null)

const initialCustomers: CustomerRecord[] = [
  {
    id: '7dbd474b-c73f-4df4-a9c9-9f1a72b5341b',
    name: 'Helix Discovery Group',
    status: 'Review',
    users: 4,
    partner: 'Prospect',
    nextStep: 'Review curated sample data',
    contact: 'Alex Morgan',
    securityContact: 'security@helix.example',
    lastReview: 'Jul 14, 2026',
  },
  {
    id: 'northline-labs',
    name: 'Northline Labs',
    status: 'Active',
    users: 86,
    partner: 'Clearpath Imaging',
    nextStep: 'Partner assignment review',
    contact: 'Priya Shah',
    securityContact: 'security@northline.example',
    lastReview: 'Jun 12, 2026',
  },
  {
    id: 'valley-diagnostics',
    name: 'Valley Diagnostics',
    status: 'Review',
    users: 42,
    partner: 'Unassigned',
    nextStep: 'Complete security contact',
    contact: 'Marcus Chen',
    securityContact: 'Not assigned',
    lastReview: 'Jun 9, 2026',
  },
  {
    id: 'summit-pathology',
    name: 'Summit Pathology',
    status: 'Active',
    users: 23,
    partner: 'Clearpath Imaging',
    nextStep: 'Quarterly access audit',
    contact: 'Elena Torres',
    securityContact: 'compliance@summit.example',
    lastReview: 'May 28, 2026',
  },
]

export function MockAdminDataProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<CustomerRecord[]>(initialCustomers)

  const contextValue = useMemo<MockAdminDataContextValue>(
    () => ({
      customers,
      addCustomer(customer) {
        const id = uniqueSlug(customer.name, customers.map((item) => item.id))
        setCustomers((currentCustomers) => [
          ...currentCustomers,
          normalizeCustomerInput(id, customer),
        ])
        return id
      },
      updateCustomer(customerId, customer) {
        setCustomers((currentCustomers) =>
          currentCustomers.map((currentCustomer) =>
            currentCustomer.id === customerId
              ? normalizeCustomerInput(customerId, customer)
              : currentCustomer,
          ),
        )
      },
      deactivateCustomer(customerId) {
        setCustomers((currentCustomers) =>
          currentCustomers.map((customer) =>
            customer.id === customerId
              ? { ...customer, status: 'Inactive', nextStep: 'Customer inactive' }
              : customer,
          ),
        )
      },
    }),
    [customers],
  )

  return (
    <MockAdminDataContext.Provider value={contextValue}>
      {children}
    </MockAdminDataContext.Provider>
  )
}

export function useMockAdminData() {
  const context = useContext(MockAdminDataContext)
  if (!context) {
    throw new Error('useMockAdminData must be used within MockAdminDataProvider.')
  }

  return context
}

function normalizeCustomerInput(
  id: string,
  customer: CustomerInput,
): CustomerRecord {
  return {
    ...customer,
    id,
    users: customer.users ?? 0,
    lastReview: customer.lastReview ?? 'Not reviewed',
  }
}

function uniqueSlug(value: string, existingIds: readonly string[]) {
  const baseSlug =
    value
      .trim()
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'item'
  let slug = baseSlug
  let suffix = 2

  while (existingIds.includes(slug)) {
    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }

  return slug
}
