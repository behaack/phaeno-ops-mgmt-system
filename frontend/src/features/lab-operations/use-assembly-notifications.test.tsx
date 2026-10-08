import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAssemblyNotifications } from './use-assembly-notifications'

const state = vi.hoisted(() => ({ provider: 'clerk', allowed: true, organization: 'phaeno-1', failStart: false }))
type Connection = {
  start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; invoke: ReturnType<typeof vi.fn>
  changed?: (notice: unknown) => void; reconnected?: () => void; closed?: () => void
  options?: { accessTokenFactory: () => Promise<string> }
}
const connections: Connection[] = []
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({
  authProvider: state.provider, selectedOrganizationId: state.organization,
  session: { capabilities: { canManageLabOperations: state.allowed } },
}) }))
vi.mock('#/api/client', () => ({ api: { defaults: { baseURL: '/api' } }, getApiAccessToken: async () => 'fresh-token' }))
vi.mock('@microsoft/signalr', () => ({
  HttpTransportType: { WebSockets: 1 }, LogLevel: { None: 6 },
  HubConnectionBuilder: class {
    options?: Connection['options']
    withUrl(_url: string, options: Connection['options']) { this.options = options; return this }
    configureLogging() { return this }
    withAutomaticReconnect() { return this }
    build() {
      const connection: Connection = { options: this.options, start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined), invoke: vi.fn().mockResolvedValue(undefined) }
      if (state.failStart) connection.start.mockRejectedValueOnce(new Error('offline'))
      connections.push(connection)
      return { ...connection,
        on: (_name: string, callback: Connection['changed']) => { connection.changed = callback },
        onreconnected: (callback: Connection['reconnected']) => { connection.reconnected = callback },
        onclose: (callback: Connection['closed']) => { connection.closed = callback },
      }
    }
  },
}))
beforeEach(() => { connections.length = 0; state.provider = 'clerk'; state.allowed = true; state.organization = 'phaeno-1'; state.failStart = false })
afterEach(() => { cleanup(); vi.useRealTimers() })
function show(ids: string[] = ['job-1']) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const view = renderHook(({ jobs, active }) => useAssemblyNotifications(jobs, active), { wrapper, initialProps: { jobs: ids, active: true } })
  return { ...view, invalidate }
}

it('subscribes with fresh authentication and refreshes only watched HTTP snapshots on notices and reconnect', async () => {
  const view = show(['job-2', 'job-1', 'job-1'])
  await waitFor(() => expect(connections[0]?.invoke).toHaveBeenCalledWith('Watch', ['job-1', 'job-2']))
  expect(await connections[0].options?.accessTokenFactory()).toBe('fresh-token')
  view.invalidate.mockClear()
  act(() => { connections[0].changed?.({ jobId: 'foreign' }); connections[0].changed?.({ jobId: 5 }) })
  expect(view.invalidate).not.toHaveBeenCalled()
  act(() => connections[0].changed?.({ jobId: 'job-1', version: 2 }))
  expect(view.invalidate).toHaveBeenCalledWith({ queryKey: ['assembly-job', 'job-1'] })
  await act(async () => connections[0].reconnected?.())
  expect(connections[0].invoke).toHaveBeenCalledTimes(2)
  expect(view.invalidate).toHaveBeenCalledWith({ queryKey: ['assembly-job', 'job-2'] })
  view.unmount(); expect(connections[0].stop).toHaveBeenCalled()
})

it('stops the old organization subscription and ignores its late notifications', async () => {
  const view = show()
  await waitFor(() => expect(connections[0]?.invoke).toHaveBeenCalled())
  state.organization = 'phaeno-2'; view.rerender({ jobs: ['job-2'], active: true })
  await waitFor(() => expect(connections[1]?.invoke).toHaveBeenCalledWith('Watch', ['job-2']))
  expect(connections[0].stop).toHaveBeenCalled()
  view.invalidate.mockClear(); act(() => connections[0].changed?.({ jobId: 'job-1' }))
  expect(view.invalidate).not.toHaveBeenCalled()
  view.rerender({ jobs: ['job-2'], active: false }); expect(connections[1].stop).toHaveBeenCalled()
})

it('uses HTTP recovery without opening notifications for mock or unauthorized sessions', () => {
  state.provider = 'mock'; const view = show(); expect(connections).toHaveLength(0)
  state.provider = 'clerk'; state.allowed = false; view.rerender({ jobs: ['job-1'], active: true })
  expect(connections).toHaveLength(0)
})

it('retries an initial connection failure and cancels retries after unmount', async () => {
  vi.useFakeTimers(); state.failStart = true; const view = show()
  await act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve() })
  expect(connections[0].start).toHaveBeenCalledTimes(1)
  await act(async () => { await vi.advanceTimersByTimeAsync(10000) })
  expect(connections[0].start).toHaveBeenCalledTimes(2)
  expect(connections[0].invoke).toHaveBeenCalledWith('Watch', ['job-1'])
  act(() => connections[0].closed?.()); view.unmount()
  await act(async () => { await vi.advanceTimersByTimeAsync(20000) })
  expect(connections[0].start).toHaveBeenCalledTimes(2)
})
