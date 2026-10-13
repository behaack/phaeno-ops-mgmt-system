import { Link } from '@tanstack/react-router'
import { workDestination, type WorkItem } from '#/api/work-attention'
import { Badge } from '#/components/ui/badge'
import { usePhaenoSession } from '#/features/auth/session-context'
import { useWorkMessages, workMessages, type WorkMessageId } from './work-messages'
import { workPriorityLabel } from './work-priority'

export function WorkList({ items, preview = false, onNavigate }: { items: WorkItem[]; preview?: boolean; onNavigate?: () => void }) {
  const { session, selectedOrganizationId } = usePhaenoSession()
  const staff = session?.memberships.find(membership => membership.organizationId === selectedOrganizationId)?.organizationKind === 'Phaeno'
  const messages = useWorkMessages()
  return <ul className="divide-y" aria-label={messages.text('actions')}>{items.map(item => <li key={item.key} className="flex min-w-0 flex-wrap items-start justify-between gap-3 py-3">
    <div className="min-w-0 flex-1"><Link to={workDestination(item)} onClick={onNavigate} className="block rounded-sm font-medium break-words text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {item.messageKey in workMessages ? messages.text(item.messageKey as WorkMessageId) : messages.text('open')}
    </Link><p className="mt-1 break-words text-sm">{item.recordLabel}</p>
      {!preview ? <p className="mt-1 text-xs text-muted-foreground">{item.kind === 'update' ? messages.text('available') : item.kind === 'waiting' ? messages.text('waitingOwner') : !staff ? messages.text('yourAction') : item.ownerUserId === session?.user?.id ? messages.text('assigned') : item.ownerUserId ? `${messages.text('otherOwner')}${item.ownerName ? ` · ${item.ownerName}` : ''}` : messages.text('eligible')}
        {item.dueAtUtc ? ` · ${messages.text('due')}: ${new Intl.DateTimeFormat(messages.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.dueAtUtc))}` : ''}</p> : null}
    </div>{!preview ? <Badge variant={item.priority < 2 ? 'destructive' : 'outline'}>{messages.text(workPriorityLabel(item))}</Badge> : null}
  </li>)}</ul>
}
