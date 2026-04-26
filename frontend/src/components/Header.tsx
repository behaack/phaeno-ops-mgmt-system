import { Link } from '@tanstack/react-router'
import { LayoutDashboard } from 'lucide-react'

import { MainMenu } from './MainMenu'
import { UserMenu } from './UserMenu'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 px-4 backdrop-blur">
      <nav className="page-wrap flex items-center gap-3 py-3">
        <div className="m-0 flex-shrink-0 text-base font-semibold">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-foreground no-underline"
          >
            <LayoutDashboard className="size-4 text-[var(--brand-blue)]" />
            Phaeno Portal
          </Link>
        </div>

        <MainMenu />

        <div className="ml-auto">
          <UserMenu />
        </div>
      </nav>
    </header>
  )
}
