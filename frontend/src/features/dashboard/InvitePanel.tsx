import { InviteUserForm } from '#/features/invitations/InviteUserForm'
import { Badge } from '#/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  getSelectedMembership,
  usePhaenoSession,
} from '#/features/auth/session-context'

export function InvitePanel() {
  const { session, selectedOrganizationId } = usePhaenoSession()
  const selectedMembership = getSelectedMembership(
    session,
    selectedOrganizationId,
  )

  if (!session?.capabilities.canInviteUsers || !selectedMembership) {
    return null
  }

  return (
    <Card className="surface-motion">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle>Invite a user</CardTitle>
          <Badge variant="outline">{selectedMembership.organizationName}</Badge>
        </div>
        <CardDescription>Send invite-only access to this organization.</CardDescription>
      </CardHeader>
      <CardContent>
        <InviteUserForm organizationId={selectedMembership.organizationId} />
      </CardContent>
    </Card>
  )
}
