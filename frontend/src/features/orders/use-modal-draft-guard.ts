import { useBlocker } from '@tanstack/react-router'
import { useIsMutating } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { confirmPortal } from '#/components/PortalConfirmation'

/** Explicitly protects bounded forms whose original handlers still own closing. */
export function useModalDraftGuard(dirty: boolean, submitting: boolean, active = true, scopeName?: string) {
  const pending = (useIsMutating() > 0 || submitting) && active
  const approved = useRef(false)
  const state = useRef({ dirty, pending })
  state.current = { dirty: dirty && active, pending }
  useEffect(() => { if (!dirty && !pending) approved.current = false }, [dirty, pending])
  const confirm = async () => {
    if (state.current.pending) return false
    if (!state.current.dirty || approved.current) return true
    const scope = scopeName ?? document.querySelector('[data-slot="dialog-content"][data-state="open"] [data-slot="dialog-title"]')?.textContent ?? 'this form'
    return confirmPortal(`Discard unsaved changes to ${scope}?`)
  }
  useBlocker({ shouldBlockFn: async () => !approved.current && (state.current.pending || state.current.dirty && !await confirm()),
    enableBeforeUnload: () => !approved.current && (state.current.pending || state.current.dirty) })
  return { close: async (action: () => void) => { if (await confirm() && !state.current.pending) action() }, allowNavigation: () => { approved.current = true } }
}
