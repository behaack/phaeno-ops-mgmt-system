import { InviteUserForm } from '#/features/invitations/InviteUserForm'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

export function InvitePanel() {
  return (
    <Card className="surface-motion">
      <CardHeader>
        <CardTitle>Invite a user</CardTitle>
        <CardDescription>
          Form structure follows Label, Control, Error for required fields.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <InviteUserForm />
      </CardContent>
    </Card>
  )
}
