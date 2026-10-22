import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { PortalConfirmation } from '#/components/PortalConfirmation'
import { ComponentGallery } from './ComponentGallery'
import { NavigationPreview } from './NavigationPreview'
import { WorkspacePreview } from './WorkspacePreview'
import './styles.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
const root = createRootRoute({ component: () => <><Outlet /><PortalConfirmation /></>, notFoundComponent: ComponentGallery })
const index = createRoute({ getParentRoute: () => root, path: '/', component: ComponentGallery })
const navigation = createRoute({ getParentRoute: () => root, path: '/navigation-preview', component: NavigationPreview })
const workspace = createRoute({ getParentRoute: () => root, path: '/workspace-preview', component: WorkspacePreview })
const previewDestinations = ['/lab-operations', '/crm', '/finance', '/lab-settings', '/docs'].map(path => createRoute({ getParentRoute: () => root, path, component: NavigationPreview }))
const router = createRouter({ routeTree: root.addChildren([index, navigation, workspace, ...previewDestinations]) })

createRoot(document.getElementById('root')!).render(<StrictMode><QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider></StrictMode>)
