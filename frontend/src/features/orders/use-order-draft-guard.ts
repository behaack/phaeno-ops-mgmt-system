import { confirmPortal } from '#/components/PortalConfirmation'
import { useBlocker } from '@tanstack/react-router'
import { useRef } from 'react'

export function useOrderDraftGuard(dirty: boolean, busy: boolean) {
  const navigationApproved = useRef(false)
  useBlocker({
    shouldBlockFn: async () => !navigationApproved.current && (busy || (dirty && !(await confirmPortal('Discard unsaved changes and leave this draft?')))),
    enableBeforeUnload: () => !navigationApproved.current && (dirty || busy),
  })
  return () => { navigationApproved.current = true }
}
