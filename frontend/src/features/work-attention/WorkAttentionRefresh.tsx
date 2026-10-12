import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function WorkAttentionRefresh() {
  const client = useQueryClient()
  useEffect(() => client.getMutationCache().subscribe(event => {
    if (event.type === 'updated' && event.action.type === 'success') void client.invalidateQueries({ queryKey: ['work-attention'] })
  }), [client])
  return null
}
