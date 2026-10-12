import { useId, useState } from 'react'
import { Bell } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { useWorkAttention } from './use-work-attention'
import { useWorkMessages } from './work-messages'
import { WorkList } from './WorkList'

export function WorkBell() {
  const [open, setOpen] = useState(false)
  const id = useId()
  const query = useWorkAttention({ pageSize: 5 })
  const messages = useWorkMessages()
  const count = query.isError ? undefined : query.data?.actionCount
  return <><Button id={id} size="icon" variant="ghost" className="relative size-11 shrink-0" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}
    aria-label={`${messages.text('notifications')}, ${count === undefined ? messages.text('unknown') : messages.notificationCount(count)}`}>
    <Bell aria-hidden="true" className="size-5" />{count ? <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 rounded-full bg-primary px-1 text-xs text-primary-foreground tabular-nums">{count > 99 ? '99+' : count}</span> : count === undefined ? <span aria-hidden="true" className="absolute top-0 right-0 text-xs">?</span> : null}
  </Button><span className="sr-only" aria-live="polite">{count === undefined ? messages.text("unknown") : messages.notificationCount(count)}</span><Dialog open={open} onOpenChange={setOpen}><DialogContent onCloseAutoFocus={event => { event.preventDefault(); document.getElementById(id)?.focus() }}>
    <DialogHeader><DialogTitle>{messages.text('notifications')}</DialogTitle><DialogDescription>{count === undefined ? messages.text('unknown') : messages.notificationCount(count)}</DialogDescription></DialogHeader>
    <div>{query.disabledByMock ? <p role="status">{messages.text('mockPaused')}</p> : query.isError ? <div role="alert"><p>{messages.text('unavailable')}</p><Button variant="outline" onClick={() => void query.refetch()}>{messages.text('retry')}</Button></div> : query.isPending ? <p role="status">{messages.text('loading')}</p> : query.data ? <div><WorkList items={query.data.items.slice(0, 5)} preview onNavigate={() => setOpen(false)} />{!query.data.items.length ? <p>{messages.text('zero')}</p> : null}{query.data.disabledSources.length ? <p className="mt-3 text-xs text-muted-foreground">{messages.text('disabled')}</p> : null}</div> : null}</div>
    <DialogFooter><Button asChild variant="outline"><Link to="/dashboard/attention" onClick={() => setOpen(false)}>{messages.text('openWork')}</Link></Button></DialogFooter>
  </DialogContent></Dialog></>
}
