// Synthetic browser fixture; never imported by application routes.
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { SpecimenHolds } from '../../src/features/orders/SpecimenHolds'
import { applyThemeMode } from '../../src/components/theme-mode'
import '../../src/styles.css'
const params = new URLSearchParams(location.search)
applyThemeMode(params.get('theme') === 'dark' ? 'dark' : 'light')
const route = createRootRoute({ component: () => <main className="mx-auto max-w-4xl p-4"><h1>Test specimen holds</h1><SpecimenHolds {...(params.has('staff') ? { workOrderId: 'work' } : { orderId: 'order' })} /></main> })
const router = createRouter({ routeTree: route })
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RouterProvider router={router} /></QueryClientProvider>)
