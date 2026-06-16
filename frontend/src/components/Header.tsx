import { Link } from '@tanstack/react-router'

import { MainMenu } from './MainMenu'
import { UserMenu } from './UserMenu'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 px-4 backdrop-blur">
      <nav className="page-wrap flex items-center gap-3 py-3">
        <div className="m-0 flex-shrink-0 text-base font-semibold">
          <Link
            to="/"
            className="inline-flex flex-col items-start gap-0.5 px-3 py-1 no-underline"
            aria-label="Phaeno Portal home"
          >
            <img
              src="/phaeno124x40.webp"
              alt="Phaeno"
              width={124}
              height={40}
              className="h-10 w-[124px] object-contain"
            />
            <span className="text-[0.625rem] font-semibold tracking-[0.32em] text-foreground uppercase">
              Portal
            </span>
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
