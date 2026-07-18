import type { articletypes, webtypes } from '@/assets/docTypes'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FaMagnifyingGlass, FaX } from 'react-icons/fa6'
import SearchItem from './SearchItem'

export interface ISearchResult {
  id: string
  url: string
  pageTitle: string
  pageDisplayTitle?: string
  anchor: string
  anchorTitle: string
  description: string
  documentType: webtypes | articletypes
  snippet: string
  count: number
  score: number
}

type ApiEnvelope<T> = {
  success: boolean
  data: T
  error: unknown
  meta: unknown
}

export default function Search() {
  const BASE_URL = import.meta.env.PUBLIC_API_BASE_URL
  const isFirstRender = useRef(true)
  const [open, setOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [searchStr, setSearchStr] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchList, setSearchList] = useState<ISearchResult[]>([])
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [ariaMessage, setAriaMessage] = useState<string>('')

  const inputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const resultRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const listRef = useRef<HTMLUListElement>(null)
  const lastActiveElementRef = useRef<HTMLElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const getOptionNodes = () =>
    Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])
  const focusOption = (index: number) => {
    const options = getOptionNodes()
    if (options.length === 0) return
    const clamped = Math.max(0, Math.min(index, options.length - 1))
    setActiveIndex(clamped)
    const target = options[clamped]
    target.focus()
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
  const focusResult = (index: number) => {
    setActiveIndex(index)
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchStr.trim())
    }, 300)
    return () => clearTimeout(handler)
  }, [searchStr])

  const openSearch = () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
    setIsClosing(false)
    setOpen(true)
  }

  const closeSearch = useCallback(() => {
    if (!open || isClosing) return

    setIsClosing(true)
    const closeDelay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false)
      setIsClosing(false)
      closeTimerRef.current = null
    }, closeDelay)
  }, [open, isClosing])

  const toggleSearch = () => {
    if (open) closeSearch()
    else openSearch()
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === modalRef.current) closeSearch()
  }

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
  }, [])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
  }, [open])

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const originalHtmlOverflow = html.style.overflow
    const originalBodyOverflow = body.style.overflow
    const originalBodyPosition = body.style.position
    const originalBodyTop = body.style.top
    const originalBodyWidth = body.style.width
    const originalBodyPaddingRight = body.style.paddingRight
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth

    if (open) {
      const scrollY = window.scrollY
      html.style.overflow = 'hidden'
      body.style.overflow = 'hidden'
      body.style.position = 'fixed'
      body.style.top = `-${scrollY}px`
      body.style.width = '100%'
      if (scrollBarWidth > 0) {
        body.style.paddingRight = `${scrollBarWidth}px`
      }
    } else {
      html.style.overflow = originalHtmlOverflow
      body.style.overflow = originalBodyOverflow
      body.style.position = originalBodyPosition
      body.style.top = originalBodyTop
      body.style.width = originalBodyWidth
      body.style.paddingRight = originalBodyPaddingRight
    }

    return () => {
      html.style.overflow = originalHtmlOverflow
      body.style.overflow = originalBodyOverflow
      body.style.position = originalBodyPosition
      body.style.top = originalBodyTop
      body.style.width = originalBodyWidth
      body.style.paddingRight = originalBodyPaddingRight
      const top = originalBodyTop
      if (open && top && top.startsWith('-')) {
        const y = Math.abs(parseInt(top, 10))
        if (!Number.isNaN(y)) window.scrollTo(0, y)
      }
    }
  }, [open])

  useEffect(() => {
    const focusableSelectors = [
      'a[href]',
      'button',
      'input',
      'textarea',
      'select',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')

    const trapFocus = (e: KeyboardEvent) => {
      if (!modalRef.current || e.key !== 'Tab') return
      const focusables = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(focusableSelectors),
      ).filter((el) => el.tabIndex >= 0)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    const keepFocusInside = (e: FocusEvent) => {
      if (!modalRef.current) return
      const target = e.target as Node | null
      if (target && modalRef.current.contains(target)) return

      const focusables = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(focusableSelectors),
      ).filter((el) => el.tabIndex >= 0)

      if (focusables.length > 0) focusables[0].focus()
      else modalRef.current.focus()
    }

    if (open) {
      document.addEventListener('keydown', trapFocus)
      document.addEventListener('focusin', keepFocusInside)
      lastActiveElementRef.current = document.activeElement as HTMLElement | null
    }

    return () => {
      document.removeEventListener('keydown', trapFocus)
      document.removeEventListener('focusin', keepFocusInside)
    }
  }, [open])

  useEffect(() => {
    const preventScroll = (e: Event) => {
      if (!open) return
      if (!modalRef.current) return
      const target = e.target as Node | null
      if (target && modalRef.current.contains(target)) return
      e.preventDefault()
    }

    if (open) {
      document.addEventListener('wheel', preventScroll, { passive: false })
      document.addEventListener('touchmove', preventScroll, { passive: false })
    }

    return () => {
      document.removeEventListener('wheel', preventScroll)
      document.removeEventListener('touchmove', preventScroll)
    }
  }, [open])

  useEffect(() => {
    setSearchStr('')
    setSearchList([])
    setActiveIndex(-1)
    setAriaMessage('')
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else if (!open && lastActiveElementRef.current) {
      lastActiveElementRef.current.focus()
    }
  }, [open])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSearch()
        return
      }
    }

    if (open) document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, closeSearch])

  useEffect(() => {
    if (activeIndex < 0) return
    const options = getOptionNodes()
    const target = options[activeIndex]
    if (target && document.activeElement !== target) {
      target.focus()
      target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
  }, [activeIndex, searchList.length])

  useEffect(() => {
    setActiveIndex(-1)
  }, [searchList])

  useEffect(() => {
    if (debouncedSearch.length < 3) {
      setSearchList([])
      setAriaMessage('')
      resultRefs.current = []
      return
    }

    const controller = new AbortController()

    const fetchResults = async () => {
      try {
        const res = await fetch(
          `${BASE_URL}web-ops/search-pages?search=${encodeURIComponent(debouncedSearch)}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
          },
        )

        if (!res.ok) {
          let message = `Request failed (${res.status}).`
          try {
            const detail = await res.json()
            if ((detail as any)?.message) message = (detail as any).message
          } catch {}
          if (res.status === 500)
            message = 'Whoops – something went wrong on our side. Please try again.'
          throw new Error(message)
        }

        const json = (await res.json()) as ApiEnvelope<ISearchResult[]>

        // ✅ the important part: the array is json.data
        const list = Array.isArray(json?.data) ? json.data : []

        setSearchList(list)
        setAriaMessage(`${list.length} search result${list.length !== 1 ? 's' : ''} found.`)
        resultRefs.current = new Array(list.length).fill(null)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        console.error(err)
      }
    }

    fetchResults()
    return () => controller.abort()
  }, [debouncedSearch, BASE_URL])

  return (
    <>
      <button
        ref={triggerRef}
        aria-expanded={open}
        aria-controls="search-modal"
        aria-label="Open site search"
        title="Search website"
        onClick={toggleSearch}
        className="web-search-button"
      >
        <FaMagnifyingGlass />
      </button>

      {open && (
        <div
          ref={modalRef}
          id="search-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="search-title"
          tabIndex={-1}
          className={`web-search-modal fixed inset-0 z-9999 h-dvh w-dvw flex justify-center items-start bg-black/20 backdrop-blur-sm${isClosing ? ' is-closing' : ''}`}
          onClick={handleBackdropClick}
        >
          <div className="web-search-panel">
            <h2 id="search-title" className="sr-only">
              Search site
            </h2>

            <div className="flex justify-between items-center px-3 py-2 border-b border-gray-300">
              <div className="flex items-center gap-1 w-full">
                <FaMagnifyingGlass />
                <label htmlFor="site-search" className="sr-only">
                  Search
                </label>
                <input
                  id="site-search"
                  ref={inputRef}
                  type="search"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls="search-results"
                  aria-expanded={open}
                  aria-haspopup="listbox"
                  aria-describedby="search-status"
                  className="web-search-input"
                  placeholder="Start typing to search..."
                  value={searchStr}
                  onChange={(e) => setSearchStr(e.target.value)}
                  onFocus={() => setActiveIndex(-1)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      if (searchList.length > 0) focusOption(0)
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      if (searchList.length > 0) focusOption(searchList.length - 1)
                    }
                  }}
                />
              </div>

              <button
                onClick={toggleSearch}
                className="web-search-close-btn"
                onFocus={() => setActiveIndex(-1)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    if (searchList.length > 0) {
                      focusOption(0)
                    } else {
                      inputRef.current?.focus()
                    }
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    if (searchList.length > 0) {
                      focusOption(searchList.length - 1)
                    } else {
                      inputRef.current?.focus()
                    }
                  }
                }}
              >
                <FaX />
              </button>
            </div>

            <div className="web-search-results-scroll">
              <div id="search-status" className="sr-only" aria-live="polite">
                {ariaMessage}
              </div>
              <div id="search-results-title" className="sr-only">
                Search results
              </div>

              <ul
                ref={listRef}
                id="search-results"
                role="listbox"
                aria-labelledby="search-results-title"
                className="web-search-results-list"
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    const next = activeIndex + 1
                    const idx = next >= searchList.length ? 0 : next
                    focusOption(idx)
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    const next = activeIndex - 1
                    const idx = next < 0 ? searchList.length - 1 : next
                    focusOption(idx)
                  }
                  if (e.key === 'Home') {
                    e.preventDefault()
                    if (searchList.length > 0) focusOption(0)
                  }
                  if (e.key === 'End') {
                    e.preventDefault()
                    if (searchList.length > 0) focusOption(searchList.length - 1)
                  }
                  if ((e.key === 'Enter' || e.key === ' ') && activeIndex >= 0) {
                    e.preventDefault()
                    resultRefs.current[activeIndex]?.click()
                  }
                }}
              >
                {searchList.map((item, index) => (
                  <SearchItem
                    key={item.id}
                    list={searchList}
                    index={index}
                    item={item}
                    searchStr={searchStr}
                    active={activeIndex === index}
                    linkRef={(el) => {
                      resultRefs.current[index] = el
                    }}
                    optionId={`result-${index}`}
                    onSelect={() => setOpen(false)}
                    onFocusOption={(i) => setActiveIndex(i)}
                  />
                ))}
              </ul>

              {!searchList.length && (
                <div className="text-center p-5 text-gray-700">
                  {searchStr.length === 0 && <span>Nothing here yet. Let’s find something!</span>}
                  {searchStr.length > 0 && searchStr.length < 3 && (
                    <span>Keep typing... we’ll match full words after 3 characters.</span>
                  )}
                  {searchStr.length >= 3 && (
                    <span>
                      No exact word matches found. Try typing the full name or word, or try a different term.
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
