import { useRef, useState, type ReactNode } from 'react'
import { createRootRoute, createRoute, createRouter, createMemoryHistory, RouterProvider, Outlet } from '@tanstack/react-router'
import { PortalConfirmation } from '../../src/components/PortalConfirmation'

/** Shared real context for isolated component fixtures; query/session providers stay owned by the fixture. */
export function PortalRouterContext({ children }: { children: ReactNode }) {
  const content = useRef(children)
  content.current = children
  const [router] = useState(() => {
    const root = createRootRoute({ component: Outlet })
    const route = createRoute({ getParentRoute: () => root, path: '/', component: () => <>{content.current}<PortalConfirmation /></> })
    return createRouter({ routeTree: root.addChildren([route]), history: createMemoryHistory({ initialEntries: ['/'] }) })
  })
  return <RouterProvider router={router} />
}
