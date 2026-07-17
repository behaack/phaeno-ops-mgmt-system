import type { LucideIcon } from 'lucide-react'
import { PanelLeftClose, PanelLeftOpen, Pin, PinOff } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

const PINNED_PREFERENCE_KEY = 'phaeno:workspace-sidebar-pinned'
const WIDE_LAYOUT_QUERY = '(min-width: 64rem)'
const SIDEBAR_TOP_PX = 84
const SIDEBAR_WITH_TAB_PX = 292

export type WorkspaceSidebarItem<Value extends string> = {
  value: Value
  label: string
  description: string
  icon: LucideIcon
}

type WorkspaceSidebarProps<Value extends string> = {
  workspaceLabel: string
  items: ReadonlyArray<WorkspaceSidebarItem<Value>>
  value: Value
  onValueChange: (value: Value) => void
  children: ReactNode
}

export function WorkspaceSidebar<Value extends string>({
  workspaceLabel,
  items,
  value,
  onValueChange,
  children,
}: WorkspaceSidebarProps<Value>) {
  const activeItem = items.find((item) => item.value === value) ?? items[0]

  return (
    <ResponsiveSidebar
      workspaceLabel={workspaceLabel}
      activeLabel={activeItem?.label ?? workspaceLabel}
      navigation={(closeSidebar) => (
        <WorkspaceNavigation
          workspaceLabel={workspaceLabel}
          items={items}
          value={value}
          onValueChange={(nextValue) => {
            onValueChange(nextValue)
            closeSidebar()
          }}
        />
      )}
    >
      {children}
    </ResponsiveSidebar>
  )
}

type ResponsiveSidebarProps = {
  workspaceLabel: string
  activeLabel: string
  navigation: (closeSidebar: () => void) => ReactNode
  children: ReactNode
}

export function ResponsiveSidebar({
  workspaceLabel,
  activeLabel,
  navigation,
  children,
}: ResponsiveSidebarProps) {
  const isWideLayout = useMediaQuery(WIDE_LAYOUT_QUERY)
  const [isPinned, setIsPinned] = useState(readPinnedPreference)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const sidebarId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)

  const showPinnedSidebar = isWideLayout && isPinned
  const showSidebar = showPinnedSidebar || isPreviewOpen

  useEffect(() => {
    if (!isPreviewOpen || showPinnedSidebar) return

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setIsPreviewOpen(false)
      requestAnimationFrame(() => triggerRef.current?.focus())
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [isPreviewOpen, showPinnedSidebar])

  useEffect(() => {
    if (!isPreviewOpen || showPinnedSidebar) return

    function closeAfterPointerLeavesRail(event: MouseEvent) {
      const pointerIsWithinRail = event.clientY >= SIDEBAR_TOP_PX
        && event.clientX <= SIDEBAR_WITH_TAB_PX
      if (pointerIsWithinRail || sidebarRef.current?.contains(document.activeElement)) return
      setIsPreviewOpen(false)
    }

    document.addEventListener('mousemove', closeAfterPointerLeavesRail)
    return () => document.removeEventListener('mousemove', closeAfterPointerLeavesRail)
  }, [isPreviewOpen, showPinnedSidebar])

  function openPreview() {
    if (!showPinnedSidebar) setIsPreviewOpen(true)
  }

  function closePreview() {
    setIsPreviewOpen(false)
  }

  function updatePinnedPreference(nextPinned: boolean) {
    setIsPinned(nextPinned)
    try {
      window.localStorage.setItem(PINNED_PREFERENCE_KEY, String(nextPinned))
    } catch {
      // The preference is optional when browser storage is unavailable.
    }
    setIsPreviewOpen(false)
  }

  return (
    <div className={cn(
      'relative min-w-0 transition-[padding] duration-200 motion-reduce:transition-none',
      showPinnedSidebar && 'workspace-sidebar-pinned',
    )}>
      {!showPinnedSidebar ? (
        <>
          <div
            data-sidebar-edge
            aria-hidden="true"
            className="fixed top-[5.25rem] bottom-0 left-0 z-30 w-2"
            onMouseEnter={openPreview}
            onMouseMove={openPreview}
          />
          <Button
            ref={triggerRef}
            type="button"
            variant="outline"
            size="icon-lg"
            aria-controls={sidebarId}
            aria-expanded={isPreviewOpen}
            aria-label={isPreviewOpen
              ? `Close ${workspaceLabel} navigation`
              : `Open ${workspaceLabel} navigation; current selection: ${activeLabel}`}
            className={cn(
              'fixed top-[6.25rem] z-40 rounded-l-none border-l-0 bg-background shadow-md transition-[left] duration-200 motion-reduce:transition-none',
              isPreviewOpen ? 'left-64' : 'left-0',
            )}
            title={isPreviewOpen
              ? `Close ${workspaceLabel} navigation`
              : `Open ${workspaceLabel} navigation: ${activeLabel}`}
            onClick={() => isPreviewOpen ? closePreview() : openPreview()}
            onMouseEnter={openPreview}
          >
            {isPreviewOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
          </Button>
        </>
      ) : null}
      <aside
        ref={sidebarRef}
        id={sidebarId}
        aria-label={`${workspaceLabel} sidebar`}
        aria-hidden={!showSidebar}
        inert={!showSidebar ? true : undefined}
        className={cn(
          'fixed top-[5.25rem] bottom-0 left-0 z-40 flex w-64 flex-col border-r bg-background p-3 text-foreground shadow-sm transition-transform duration-200 motion-reduce:transition-none',
          showSidebar ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <header className="flex items-center justify-between gap-3 border-b pb-3">
          <h2 className="truncate px-1 text-sm font-semibold">{workspaceLabel}</h2>
          {isWideLayout ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={showPinnedSidebar ? 'Unpin sidebar' : 'Pin sidebar'}
              title={showPinnedSidebar ? 'Unpin sidebar' : 'Pin sidebar'}
              onClick={() => updatePinnedPreference(!isPinned)}
            >
              {showPinnedSidebar ? <PinOff /> : <Pin />}
            </Button>
          ) : null}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto pt-3">
          {navigation(showPinnedSidebar ? () => undefined : () => closePreview())}
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function WorkspaceNavigation<Value extends string>({
  workspaceLabel,
  items,
  value,
  onValueChange,
}: Omit<WorkspaceSidebarProps<Value>, 'children'>) {
  return (
    <nav aria-label={`${workspaceLabel} sections`}>
      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = item.value === value

          return (
            <li key={item.value}>
              <button
                type="button"
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  isActive
                    ? 'bg-primary/10 text-foreground ring-1 ring-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
                onClick={() => onValueChange(item.value)}
              >
                <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function useMediaQuery(query: string) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return () => undefined
    }

    const mediaQuery = window.matchMedia(query)
    mediaQuery.addEventListener('change', onStoreChange)
    return () => mediaQuery.removeEventListener('change', onStoreChange)
  }, [query])
  const getSnapshot = useCallback(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false,
    [query],
  )

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

function readPinnedPreference() {
  try {
    return typeof window === 'undefined'
      ? true
      : window.localStorage.getItem(PINNED_PREFERENCE_KEY) !== 'false'
  } catch {
    return true
  }
}
