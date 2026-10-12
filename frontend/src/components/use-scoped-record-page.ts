import { useState } from 'react'

/** Child history collections reset immediately when their authorized scope changes. */
export function useScopedRecordPage(scope: string) {
  const [selection, select] = useState({ scope, page: 1 })
  return { page: selection.scope === scope ? selection.page : 1, setPage: (page: number) => select({ scope, page }) }
}
