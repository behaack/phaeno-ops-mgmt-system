import { useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render as renderComponent, type RenderOptions } from '@testing-library/react'
import { vi } from 'vitest'
import { PortalConfirmation } from '#/components/PortalConfirmation'

// Component tests still exercise real router/query hooks. Individual tests may
// replace navigation commands, but the Portal's shared guards need real context.
const { createMemoryHistory, createRootRoute, createRouter, RouterContextProvider } =
  await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router')

function PortalTestProviders({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: {
    queries: { retry: false }, mutations: { retry: false },
  } }))
  const [router] = useState(() => createRouter({
    routeTree: createRootRoute(), history: createMemoryHistory({ initialEntries: ['/'] }),
  }))
  useEffect(() => () => client.clear(), [client])
  return <QueryClientProvider client={client}><RouterContextProvider router={router}>{children}<PortalConfirmation /></RouterContextProvider></QueryClientProvider>
}

export * from '@testing-library/react'
export function render(ui: ReactNode, options?: RenderOptions) {
  const Wrapper = options?.wrapper
  return renderComponent(ui, { ...options, wrapper: ({ children }) =>
    <PortalTestProviders>{Wrapper ? <Wrapper>{children}</Wrapper> : children}</PortalTestProviders>,
  })
}
