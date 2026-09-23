import { useQuery, useQueryClient } from '@tanstack/react-query'

export class LabCommandStorageError extends Error {}
const databaseName = 'phaeno-lab-command-recovery'

async function access<T>(key: string, operation: 'read' | 'save' | 'clear', value?: T, requestId?: string): Promise<T | null> {
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open(databaseName, 1)
      open.onupgradeneeded = () => open.result.createObjectStore('commands')
      open.onsuccess = () => resolve(open.result)
      open.onerror = () => reject(open.error)
      open.onblocked = () => reject(new Error('Close another outdated POMS tab and retry.'))
    })
    try {
      return await new Promise<T | null>((resolve, reject) => {
        const transaction = db.transaction('commands', operation === 'read' ? 'readonly' : 'readwrite')
        const store = transaction.objectStore('commands')
        let result: T | null = null
        const read = store.get(key)
        read.onsuccess = () => {
          const saved = read.result as { requestId: string; value: T } | undefined
          result = saved?.value ?? null
          if (operation === 'save') {
            if (saved && saved.requestId !== requestId) {
              transaction.abort()
              reject(new LabCommandStorageError('A previous laboratory action still needs confirmation. Reload this page to recover it.'))
              return
            }
            store.put({ requestId, value }, key)
          } else if (operation === 'clear' && saved?.requestId === requestId) store.delete(key)
        }
        transaction.oncomplete = () => resolve(result)
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(transaction.error ?? new Error('Local recovery storage was interrupted.'))
      })
    } finally { db.close() }
  } catch (error) {
    if (error instanceof LabCommandStorageError) throw error
    throw new LabCommandStorageError('POMS could not access recovery storage. Allow browser storage and retry; no new laboratory action was sent.')
  }
}

/** Store the exact command and optional File before sending; scope recovery to its signed-in recorder. */
export function useLabCommandRecovery<T>(scope: string, actorId: string | undefined) {
  const client = useQueryClient()
  const key = `${actorId}:${scope}`
  const queryKey = ['lab-command-recovery', key]
  const query = useQuery({ queryKey, queryFn: () => access<T>(key, 'read'), enabled: Boolean(actorId), retry: false })
  return {
    ...query,
    retain: async (value: T, requestId: string) => {
      if (!actorId || !query.isFetched || query.isError) throw new LabCommandStorageError('Wait for recovery storage to load, or reload this page before recording work.')
      await access(key, 'save', value, requestId)
    },
    clear: async (requestId: string) => {
      await access(key, 'clear', undefined, requestId)
      client.setQueryData(queryKey, null)
    },
  }
}
