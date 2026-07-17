import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from '@tanstack/react-router'
import { useEffect } from 'react'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { useApplicationBranding } from '#/components/application-branding'
import { MockAdminDataProvider } from '#/features/admin/mock-admin-data'
import { AuthGate, AuthProvider } from '#/features/auth/session-context'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  component: RootLayout,
  shellComponent: RootDocument,
})

function RootLayout() {
  const isInviteRoute = useRouterState({
    select: (state) => state.location.pathname === '/accept-invite',
  })

  return (
    <AuthProvider>
      <MockAdminDataProvider>
        <ContextualDocumentTitle />
        <div className="flex min-h-screen flex-col">
          <Header />
          <div className="flex flex-1 flex-col">
            {isInviteRoute ? (
              <Outlet />
            ) : (
              <AuthGate>
                <Outlet />
              </AuthGate>
            )}
          </div>
          <Footer />
        </div>
      </MockAdminDataProvider>
    </AuthProvider>
  )
}

function ContextualDocumentTitle() {
  const branding = useApplicationBranding()

  useEffect(() => {
    document.title = branding.name
  }, [branding.name])

  return null
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Portal</title>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
