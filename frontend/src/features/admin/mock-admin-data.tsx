import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type CustomerStatus = 'Active' | 'Review' | 'Inactive'
export type ManagedUserStatus = 'Active' | 'Invited' | 'Inactive'

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

export type ManagedUser = {
  id: string
  customerId?: string
  firstName: string
  lastName: string
  email: string
  roles: string[]
  status: ManagedUserStatus
}

type CustomerInput = Omit<CustomerRecord, 'id' | 'users' | 'lastReview'> & {
  users?: number
  lastReview?: string
}

type UserInput = Omit<ManagedUser, 'id' | 'customerId' | 'status'>

type MockAdminDataContextValue = {
  customers: CustomerRecord[]
  phaenoUsers: ManagedUser[]
  customerUsers: ManagedUser[]
  addCustomer: (customer: CustomerInput) => string
  updateCustomer: (customerId: string, customer: CustomerInput) => void
  deactivateCustomer: (customerId: string) => void
  addPhaenoUser: (user: UserInput) => void
  updatePhaenoUser: (userId: string, user: UserInput) => void
  deactivatePhaenoUser: (userId: string) => void
  addCustomerUser: (customerId: string, user: UserInput) => void
  updateCustomerUser: (userId: string, user: UserInput) => void
  deactivateCustomerUser: (userId: string) => void
}

const MockAdminDataContext =
  createContext<MockAdminDataContextValue | null>(null)

const initialCustomers: CustomerRecord[] = [
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

const initialPhaenoUsers: ManagedUser[] = [
  {
    id: 'phaeno-bill-haack',
    firstName: 'Bill',
    lastName: 'Haack',
    email: 'bill.haack@phaeno.com',
    roles: ['Platform admin'],
    status: 'Active',
  },
  {
    id: 'phaeno-morgan-ellis',
    firstName: 'Morgan',
    lastName: 'Ellis',
    email: 'morgan.ellis@phaeno.com',
    roles: ['Operations admin'],
    status: 'Invited',
  },
  {
    id: 'phaeno-priya-shah',
    firstName: 'Priya',
    lastName: 'Shah',
    email: 'priya.shah@phaeno.com',
    roles: ['Customer manager'],
    status: 'Active',
  },
]

const initialCustomerUsers: ManagedUser[] = [
  {
    id: 'northline-admin',
    customerId: 'northline-labs',
    firstName: 'Northline',
    lastName: 'Admin',
    email: 'admin@northlinelabs.example',
    roles: ['Organization admin'],
    status: 'Active',
  },
  {
    id: 'northline-jordan',
    customerId: 'northline-labs',
    firstName: 'Jordan',
    lastName: 'Lee',
    email: 'jordan.lee@northlinelabs.example',
    roles: ['Member'],
    status: 'Active',
  },
  {
    id: 'northline-sam',
    customerId: 'northline-labs',
    firstName: 'Sam',
    lastName: 'Rivera',
    email: 'sam.rivera@northlinelabs.example',
    roles: ['Member'],
    status: 'Invited',
  },
  {
    id: 'valley-admin',
    customerId: 'valley-diagnostics',
    firstName: 'Valley',
    lastName: 'Admin',
    email: 'admin@valleydiagnostics.example',
    roles: ['Organization admin'],
    status: 'Active',
  },
  {
    id: 'summit-admin',
    customerId: 'summit-pathology',
    firstName: 'Summit',
    lastName: 'Admin',
    email: 'admin@summitpathology.example',
    roles: ['Organization admin'],
    status: 'Active',
  },
]

export function MockAdminDataProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<CustomerRecord[]>(initialCustomers)
  const [phaenoUsers, setPhaenoUsers] =
    useState<ManagedUser[]>(initialPhaenoUsers)
  const [customerUsers, setCustomerUsers] = useState<ManagedUser[]>(
    initialCustomerUsers,
  )

  const contextValue = useMemo<MockAdminDataContextValue>(
    () => ({
      customers,
      phaenoUsers,
      customerUsers,
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
      addPhaenoUser(user) {
        setPhaenoUsers((currentUsers) => [
          ...currentUsers,
          {
            ...user,
            id: uniqueSlug(user.email, currentUsers.map((item) => item.id)),
            status: 'Invited',
          },
        ])
      },
      updatePhaenoUser(userId, user) {
        setPhaenoUsers((currentUsers) =>
          currentUsers.map((currentUser) =>
            currentUser.id === userId ? { ...currentUser, ...user } : currentUser,
          ),
        )
      },
      deactivatePhaenoUser(userId) {
        setPhaenoUsers((currentUsers) =>
          currentUsers.map((user) =>
            user.id === userId ? { ...user, status: 'Inactive' } : user,
          ),
        )
      },
      addCustomerUser(customerId, user) {
        setCustomerUsers((currentUsers) => [
          ...currentUsers,
          {
            ...user,
            customerId,
            id: uniqueSlug(user.email, currentUsers.map((item) => item.id)),
            status: 'Invited',
          },
        ])
      },
      updateCustomerUser(userId, user) {
        setCustomerUsers((currentUsers) =>
          currentUsers.map((currentUser) =>
            currentUser.id === userId ? { ...currentUser, ...user } : currentUser,
          ),
        )
      },
      deactivateCustomerUser(userId) {
        setCustomerUsers((currentUsers) =>
          currentUsers.map((user) =>
            user.id === userId ? { ...user, status: 'Inactive' } : user,
          ),
        )
      },
    }),
    [customerUsers, customers, phaenoUsers],
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
