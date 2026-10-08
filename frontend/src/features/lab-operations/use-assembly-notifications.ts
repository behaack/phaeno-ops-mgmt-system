import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, getApiAccessToken } from '#/api/client'
import { usePhaenoSession } from '#/features/auth/session-context'

export function useAssemblyNotifications(jobIds: string[], active = true) {
  const client = useQueryClient()
  const { authProvider, session, selectedOrganizationId } = usePhaenoSession()
  const enabled = active && authProvider === 'clerk' && Boolean(session?.capabilities.canManageLabOperations)
  const watched = [...new Set(jobIds)].sort().join(',')
  useEffect(() => {
    if (!enabled || !watched) return
    let disposed = false
    let retry: ReturnType<typeof setTimeout> | undefined
    let stop: (() => Promise<void>) | undefined
    const ids = watched.split(',')
    const refresh = (id?: string) => {
      if (disposed) return
      void client.invalidateQueries({ queryKey: ['assembly-jobs'] })
      if (id) void client.invalidateQueries({ queryKey: ['assembly-job', id] })
      else for (const jobId of ids) void client.invalidateQueries({ queryKey: ['assembly-job', jobId] })
    }
    void import('@microsoft/signalr').then(({ HubConnectionBuilder, HttpTransportType, LogLevel }) => {
      if (disposed) return
      const url = `${String(api.defaults.baseURL ?? '/api').replace(/\/$/, '')}/platform/lab-operations/assembly-notifications`
      const connection = new HubConnectionBuilder().withUrl(url, {
        transport: HttpTransportType.WebSockets, skipNegotiation: true,
        accessTokenFactory: async () => await getApiAccessToken() ?? '',
      }).configureLogging(LogLevel.None).withAutomaticReconnect([0, 2000, 10000, 30000]).build()
      stop = () => connection.stop()
      const schedule = () => { clearTimeout(retry); if (!disposed) retry = setTimeout(() => { void start() }, 10000) }
      const watch = async () => { if (disposed) return; await connection.invoke('Watch', ids); refresh() }
      const start = async () => {
        try { await connection.start(); if (disposed) { await connection.stop(); return } await watch() }
        catch { await connection.stop().catch(() => {}); schedule() }
      }
      connection.on('AssemblyJobChanged', (notice: unknown) => {
        if (typeof notice !== 'object' || notice === null || !('jobId' in notice) || typeof notice.jobId !== 'string' || !ids.includes(notice.jobId)) return
        refresh(notice.jobId)
      })
      connection.onreconnected(() => { void watch().catch(async () => { await connection.stop().catch(() => {}); schedule() }) })
      connection.onclose(schedule)
      void start()
    }).catch(() => { /* Existing authenticated HTTP polling remains available. */ })
    return () => { disposed = true; clearTimeout(retry); if (stop) void stop().catch(() => {}) }
  }, [client, enabled, selectedOrganizationId, watched])
}
