import { useBlocker } from '@tanstack/react-router'
import { useRef } from 'react'

export function useOrderDraftGuard(dirty: boolean, busy: boolean) {
  const navigationApproved = useRef(false)
  useBlocker({
    shouldBlockFn: () => !navigationApproved.current && (busy || (dirty && !window.confirm('Discard unsaved changes and leave this draft?'))),
    enableBeforeUnload: () => !navigationApproved.current && (dirty || busy),
  })
  return () => { navigationApproved.current = true }
}
