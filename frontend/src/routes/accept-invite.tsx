import { createFileRoute } from '@tanstack/react-router'
import { AcceptInvitePage } from '#/features/invitations/AcceptInvitePage'

export const Route = createFileRoute('/accept-invite')({ component: AcceptInvitePage })
